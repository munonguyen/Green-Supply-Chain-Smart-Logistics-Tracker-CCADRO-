# CCADRO — đề xuất lưu trữ theo backend service

[Sơ đồ PNG 6400 × 4560](assets/architecture-generated/ccadro-storage-per-service.png) · [SVG chỉnh sửa được](assets/architecture-generated/ccadro-storage-per-service.svg)

Đây là **thiết kế đề xuất**, dựa trên entity, repository, Flyway và cấu hình hiện có. Không thay đổi code nghiệp vụ, schema đang chạy hoặc hạ tầng. Sơ đồ dùng phong cách ảnh mẫu: nền trắng, service có viền màu, kho chính ở trong từng service và các kho bổ trợ nằm thành tầng phía dưới. Tái tạo SVG bằng `python3 scripts/generate-storage-architecture.py`.

## Lựa chọn chốt cho project

Giữ PostgreSQL làm engine nghiệp vụ chính cho cả mười service. Bật PostGIS cho Shipment, Routing, Tracking và Incident vì source đã có geometry/truy vấn không gian; đề xuất thêm PostGIS cho Hub Shipper. Redis chỉ giữ dữ liệu tạm hoặc bản sao có thể khôi phục; S3 giữ file; Kafka giữ event phục vụ giao tiếp/replay trong thời hạn retention.

Project đang dùng JPA/JDBC và PostgreSQL/PostGIS. Dữ liệu chủ yếu có quan hệ, trạng thái và ràng buộc giao dịch; chưa thấy yêu cầu khiến việc chuyển một domain sang MongoDB, Neo4j hoặc MySQL đem lại lợi ích đủ bù chi phí migration/vận hành. Đây là lựa chọn kiến trúc dựa trên source và nhu cầu hiện có, không phải kết quả benchmark hiệu năng.

| Service | Kho chính đề xuất | Dữ liệu sở hữu | Kho bổ trợ | Lý do |
|---|---|---|---|---|
| Identity `8080` | PostgreSQL | User, role, permission, company, Hub IAM, token thu hồi và auth audit | Redis cache trạng thái thu hồi nếu có tải; tùy chọn | Quan hệ RBAC, unique user/email, giao dịch và audit; IAM không chỉ tồn tại trong cache |
| Asset `8081` | PostgreSQL | Vehicle, driver, container gốc, inspection, maintenance, shift, reservation | S3 cho ảnh/hồ sơ khi bổ sung upload; Redis cache danh mục nếu cần | Tránh cấp trùng tài nguyên; cập nhật trạng thái và giữ tài nguyên cần transaction/locking |
| Shipment `8082` | PostgreSQL + PostGIS | Shipment, origin/destination Point, dispatch order, Saga state, outbox | Kafka cho dispatch event | ACID cho đơn/Saga; lưu điểm không gian và query GIS khi cần |
| Routing `8083` | PostgreSQL + PostGIS | Candidate, decision, route version, LineString, score | Redis route-result cache theo input/version nếu cần | Query geometry và phiên bản tuyến; cache không thay thế RouteVersion gốc |
| Tracking `8084` | PostgreSQL + PostGIS | Trip, telemetry, deviation, reroute, route snapshot/read model | Redis latest position/TTL/cooldown; S3 archive khi tải tăng | Dữ liệu vừa là chuỗi thời gian vừa là không gian; lịch sử bền vững tách khỏi trạng thái realtime |
| Carbon `8085` | PostgreSQL | Hệ số có phiên bản, tính phát thải, nhiên liệu/chi phí, benchmark, ePOD metadata | S3 cho báo cáo và ảnh/chữ ký ePOD thuộc Carbon | NUMERIC và phiên bản giúp tái lập phép tính; file không làm phình OLTP |
| Incident `8086` | PostgreSQL + PostGIS | Incident Point, resolution, demerit, audit, outbox | S3 cho ảnh/video; Kafka cho emergency event | Incident gắn địa điểm; giải trình và điểm trừ cần lịch sử/giao dịch |
| Notification `8087` | PostgreSQL | Thông báo, read/ACK, consumer inbox/dedup, email job/attempt | Kafka nhận event; Redis Pub/Sub cho SSE nhiều replica nếu cần | Job/ACK/chống lặp phải tồn tại qua restart; Pub/Sub chỉ hỗ trợ chuyển tiếp realtime |
| Payment `8088` | PostgreSQL | Transaction, contract, SLA, webhook inbox, evidence, outbox, audit | S3 cho file chứng từ; snapshot nhỏ có thể tiếp tục ở PostgreSQL | Tiền dùng NUMERIC; unique event ID và transaction giúp chống xử lý thanh toán lặp |
| Hub Shipper `8089` | PostgreSQL + PostGIS **bổ sung** | Hub, shipper, manifest, task/range assignment, delivery Point, vùng phục vụ | S3 Photo POD; Redis vị trí tạm nếu cần | Gần điểm giao/vùng phục vụ phù hợp GIS; cần migration từ tọa độ số đang có |

**API Gateway `8888`:** không cần database nghiệp vụ. Redis chỉ được kết nối nếu triển khai rate limiter; token bucket không phải kho user hoặc ledger.

## Chi tiết thiết kế mỗi service

### Identity

- Giữ `users`, `roles`, `permissions`, `companies` và các bảng `hub_iam` trong ownership Identity; FK nội bộ domain được giữ.
- B-tree/unique index trên username, email, mã công ty và tài khoản Hub theo quy tắc thực. Audit append-only ở mức quyền ghi ứng dụng; không tự coi một bảng SQL là kho WORM.
- Nếu dùng Redis cho thu hồi token, TTL không dài hơn thời hạn token còn lại. Bản ghi thu hồi gốc nằm PostgreSQL; cache miss hoặc cache lỗi phải kiểm tra kho chính theo chính sách fail-closed. Cần invalidation khi thu hồi, tránh cache quyết định “token hợp lệ” quá lâu.

### Asset

- Giữ vehicle/driver/container, kiểm tra an toàn và bảo dưỡng; reservation cần idempotency key và cập nhật nguyên tử trong một local transaction.
- Dùng locking hoặc optimistic version/conditional update thích hợp để hai lệnh dispatch không cùng giữ một tài nguyên. Cache không được quyết định cuối cùng về khả năng xuất bến.
- Sau khi tách ownership, Asset chỉ giữ container gốc và tham chiếu manifest qua ID/API/event; chuyển quyền ghi manifest/last-mile về Hub Shipper.

### Shipment

- Giữ các điểm origin/destination, dispatch, Saga log và outbox trong store Shipment. Ghi event outbox cùng transaction với thay đổi nghiệp vụ cần phát.
- Index mã vận đơn, customer/status theo truy vấn thực; GiST cho trường hoặc biểu thức geometry/geography tương ứng truy vấn.
- Saga orchestrator gọi API service khác; không FK hoặc SQL JOIN sang bảng Asset/Tracking/Routing khi đã tách store.

### Routing

- Lưu LineString, metadata của candidate, quyết định và version trong PostGIS. Ràng buộc unique `(shipment_id, version_number)` và kiểm soát route active theo nhu cầu.
- Khi dùng route cache, key phải chứa các input có ảnh hưởng: origin, destination, vehicle/constraint, mục tiêu tối ưu và phiên bản provider/model. TTL và invalidation phải rõ.
- Tracking nhận snapshot hình học có version qua API/event; không đọc trực tiếp bảng `route_version` của Routing.

### Tracking

- Bắt đầu với PostGIS và index `(trip_id, timestamp)` cho lịch sử chuyến. Chỉ partition theo thời gian khi kích thước và truy vấn đo được hưởng lợi; PostgreSQL có range partition để giới hạn vùng đọc và quản lý retention bằng partition. [Tài liệu PostgreSQL](https://www.postgresql.org/docs/current/ddl-partitioning.html).
- Spatial index nên khớp kiểu truy vấn: GiST cho geometry/geography và phép toán phù hợp. Index không tự tối ưu mọi phép tính khoảng cách; kiểm tra `EXPLAIN ANALYZE` và cast/expression thực tế. [Tài liệu PostGIS](https://postgis.net/workshops/postgis-intro/indexing.html).
- Redis giữ latest position theo trip/device, thời điểm sample, quality và TTL; không cho GPS cũ ghi đè GPS mới. Cooldown/dedup không phải hồ sơ cảnh báo gốc.
- Nếu partition telemetry theo thời gian, PK/UNIQUE của bảng partitioned phải tính đến partition key. Thiết kế lại idempotency/khóa ngoại và migration, không chỉ thêm `PARTITION BY` vào bảng hiện có.
- TimescaleDB là lựa chọn sau benchmark và kiểm tra tương thích với PostgreSQL/PostGIS được pin; không bắt buộc cho MVP. Nếu archive Parquet lên S3, ghi manifest/checksum và xác minh đọc lại trước khi loại partition nóng; dùng retention do product chốt, không tự đặt thời hạn.

### Carbon

- Dùng NUMERIC cho hệ số/phát thải/chi phí; lưu version hệ số, thuật toán, nguồn dữ liệu và input snapshot để tái lập bản tính.
- Sửa kết quả qua version mới/superseded thay vì xóa dấu vết. DB giữ ePOD nghiệp vụ và metadata; file báo cáo PDF/CSV, ảnh/chữ ký chuyển sang object store.
- Không cần Snowflake/ClickHouse ở giai đoạn này. Chỉ tạo OLAP store khi reporting đã được đo là ảnh hưởng OLTP và có yêu cầu thực; OLAP là read model, không là nguồn quyết toán gốc.

### Incident

- `FieldIncident` hiện có `geometry(Point,4326)`, nên giữ PostGIS; index theo trip/status/thời điểm và GiST theo truy vấn vùng.
- Resolution, demerit và audit thuộc Incident. Snapshot vị trí lấy từ Tracking không biến Incident thành owner của GPS thô.
- Ảnh/video lưu S3; DB lưu object key, version và metadata. Event cảnh báo cần outbox bền vững và consumer xử lý chống lặp.

### Notification

- Giữ notification/read/ACK và email inbox/attempt trong PostgreSQL. Dùng unique event ID hoặc khóa nghiệp vụ phù hợp cho idempotency, index job pending theo `next_attempt_at`.
- Redis Pub/Sub chỉ fan-out SSE giữa replica. Pub/Sub có semantics at-most-once, có thể mất bản tin khi subscriber ngắt; reconnect phải lấy snapshot hoặc đọc lại từ kho bền vững, không dùng Pub/Sub cho queue email. [Tài liệu Redis](https://redis.io/docs/latest/develop/interact/pubsub/).
- Notification lưu job và tham chiếu file thuộc owner gốc; có thể giữ snapshot email nhỏ như hiện nay. Không cần tạo owner nghiệp vụ thứ hai cho hồ sơ thanh toán.

### Payment

- Giữ ledger/status/contract/SLA và webhook inbox trong local transaction khi phù hợp; unique provider event ID giúp xử lý callback lặp an toàn. Dùng NUMERIC thay vì floating point cho tiền.
- Source hiện đã có `payment_evidence` chứa snapshot JSON dạng TEXT, HTML và SHA-256; giữ payload nhỏ ở DB là hợp lý. Nếu cần hash trên payload gốc, giữ bytes/canonical representation rõ ràng, không hash một bản rồi đọc lại JSONB với serialization khác để so trực tiếp.
- File lớn, PDF/hợp đồng/archive sang S3. DB giữ object key/version/checksum và trạng thái upload. Upload S3 không nguyên tử với transaction PostgreSQL: cần trạng thái pending/ready, retry/reconcile và cleanup object mồ côi.
- Redis chỉ là cache, không giữ duy nhất transaction, số tiền hay trạng thái đối soát.

### Hub Shipper

- Ownership đề xuất: hub, local shipper, manifest item, task/range assignment, policy và lịch sử giao kiện thuộc Hub Shipper. Identity giữ tài khoản/RBAC; Asset giữ phương tiện/container gốc. Bỏ entity/ghi bảng trùng hoặc thay bằng read model có owner rõ.
- Source hiện có delivery latitude/longitude dạng số và tính khoảng cách ở Java. Migration đề xuất thêm Point/SRID 4326 và polygon vùng phục vụ nếu có nghiệp vụ; dùng query như ST_DWithin/GiST phù hợp cho tìm gần.
- Photo POD gắn assignment/shipper/Hub; S3 giữ ảnh, DB giữ object key và trạng thái. Kiểm tra quyền ở backend trước khi cấp signed URL. Lưu object key ổn định thay vì URL ký có thời hạn vào hồ sơ lâu dài.

## Triển khai vật lý và dữ liệu dùng chung

1. **MVP:** một PostgreSQL instance, schema và DB role riêng theo service. Giới hạn grants/search_path, mỗi service có migration riêng. Đây là cô lập logic/quyền; vẫn chia sẻ CPU, I/O, backup và điểm lỗi của instance.
2. **Bỏ coupling trước khi tách instance:** thay JOIN xuyên domain ở `TripRepository` bằng read model/snapshot; xác định owner hub/manifest; chuyển FK xuyên domain thành ID và kiểm tra qua API/event. UUID chung không đồng nghĩa service được đọc DB của nhau.
3. **Cache/object store dùng chung hạ tầng được:** Redis có ACL/key prefix theo owner (logical DB không phải security boundary); S3 có IAM/bucket/prefix và quyền owner. Không dùng chung credentials toàn quyền giữa mọi service.
4. **Khi có tải:** ưu tiên tách Tracking theo tải ghi và Payment theo yêu cầu vận hành; quyết định qua số liệu p95 query, I/O, queue lag, dung lượng và mục tiêu recovery, không tự gán ngưỡng chưa đo.
5. **Tìm kiếm:** tên `ElasticSearchSupport` hiện là helper Java filter/rank, chưa chứng minh có Elasticsearch server. Bắt đầu với index/search PostgreSQL; chỉ thêm search engine như read model khi query cần, phải có cơ chế rebuild từ dữ liệu gốc.

## File và độ bền dữ liệu

- Chọn **Amazon S3** cho object storage production trong bản thiết kế. Nếu triển khai ngoài AWS, chọn S3-compatible sau khi kiểm tra hỗ trợ SDK, signed URL, versioning, lifecycle, retention và chi phí; tương thích API không bảo đảm mọi tính năng giống nhau.
- File có object key theo owner, content type, size, version, checksum và trạng thái. Signed URL ngắn hạn được cấp sau kiểm tra quyền; không public bucket POD.
- Object versioning và retention tùy yêu cầu. Khi cần WORM, S3 Object Lock cung cấp retention/legal hold cho object version; đây là tính năng cần cấu hình phù hợp, không phải hệ quả của việc lưu SHA-256. [Tài liệu Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).
- PostgreSQL có backup, WAL/PITR theo RPO/RTO được chốt và kiểm tra restore định kỳ. Versioning của file, replication DB và retention Kafka không thay thế một chiến lược backup được thử khôi phục.
- Kafka là event log: key/order/retention phải được thiết kế; business outbox không áp dụng mặc định cho mọi điểm GPS thô. Consumer commit sau khi xử lý xong và có inbox/idempotency; lỗi có retry/DLQ/replay theo chính sách.

## Căn cứ source

- `backend/pom.xml`, `backend/*/src/main/resources/application.yaml`: mười service và một Gateway; cấu hình PostgreSQL.
- `backend/{shipment,routing,tracking,incident}-service/.../entity`: Point/LineString hiện có.
- `backend/tracking-service/.../repository/TripRepository.java`: JOIN xuyên domain và truy vấn không gian cần thay khi tách owner.
- `backend/hub-shipper-service/.../entity/ContainerCargoManifestItem.java`: delivery_lat/lng, Photo POD URL và manifest.
- `backend/asset-service/.../entity`: entity hub/manifest trùng, container và tài nguyên xuất bến.
- `backend/db/migration/V027__durable_payment_evidence_and_email_outbox.sql`: evidence TEXT/HTML/hash, durable email inbox và attempt.
- `backend/carbon-service/.../entity`: emission factor/calculation, benchmark, ePOD và export metadata.
- `backend/*/service/ElasticSearchSupport.java`: filter/rank trong ứng dụng, không phải Elasticsearch client.

Các lựa chọn trong tài liệu là suy luận thiết kế từ source và đặc điểm lưu trữ trong tài liệu chính thức đã dẫn; chúng chưa được triển khai hay benchmark trên tải production của project.
