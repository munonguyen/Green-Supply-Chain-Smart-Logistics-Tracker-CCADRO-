# Chat Service MongoDB

Cấu trúc package và hướng dẫn đặt breakpoint: [Chat Service README](../backend/chat-service/README.md). Controller, service, repository, entity, DTO, mapper, client, security và configuration được tách theo trách nhiệm; API và collection Mongo giữ nguyên sau refactor.

Chat nghiệp vụ mới đi qua `React → API Gateway :8888 → Chat Service :8090 → MongoDB ccadro_chat`.
Identity và các service nghiệp vụ khác tiếp tục dùng PostgreSQL; GPS/Tracking giữ PostGIS. Không triển khai DynamoDB.

## Chức năng đã triển khai

- Hội thoại trực tiếp (DM, hai tài khoản) và nhóm tối đa 50 thành viên, chủ nhóm mời thành viên.
- Danh bạ lấy từ Identity: chỉ username, tên hiển thị, role của tài khoản ACTIVE, chưa xóa và không đang khóa.
- Chat Service introspect Bearer token trực tiếp với Identity, kể cả khi gọi thẳng port 8090. Không lấy người gửi/quyền từ body hoặc `X-Auth-*` do client cung cấp.
- Chỉ thành viên mới được đọc/gửi/read/reaction. Admin không được tự đọc một hội thoại mà họ không tham gia.
- Mỗi tin nhắn là một Mongo document; không nhúng lịch sử không giới hạn vào conversation. Hỗ trợ TEXT, LOCATION và CARD; ảnh/file upload chưa thuộc lần triển khai này.
- Tin nhắn có clientMessageId; ID lưu được suy ra từ conversation + sender + clientMessageId. Retry cùng nội dung trả cùng document; dùng lại key cho nội dung khác trả 409. Trạng thái gửi thành công chỉ hiện sau khi MongoDB xác nhận ghi.
- Read receipt là `readBy` theo username, không phải một cờ read chung. Reaction dùng update nguyên tử; pin/mute nằm trong preference riêng từng tài khoản.
- Lịch sử có cursor theo `(createdAt, _id)`, tối đa 100 tin/trang. Giao diện có nút tải tin cũ. REST ghi tin/read/reaction; Socket.IO phát event `message` cho thành viên đang kết nối để UI tải lại dữ liệu có quyền qua REST. Đã bỏ polling định kỳ. Reconnect tự xin vé mới và tải bù các trang tin nhắn đến khi gặp lịch sử đã cache.
- Cache live chỉ ở memory, tách theo token; không tự ghép seed/localStorage hoặc coi local-only message là đã gửi. Chế độ demo là opt-in riêng `VITE_CHAT_DEMO_MODE=true`.

Danh bạ hiện phục vụ liên lạc giữa các vai trò của toàn ứng dụng, không chứa email, số điện thoại, giấy tờ hay hash mật khẩu. Container/shipment code trong hội thoại chỉ là metadata; nó không cấp quyền truy cập đơn hàng. Nếu triển khai SaaS nhiều tenant, cần bổ sung chính sách directory/invite theo tenant trước khi cung cấp chức năng liên lạc đó.

## Collections và chỉ mục

| Collection | Nội dung | Index |
|---|---|---|
| `conversations` | type, title, owner, members, metadata đơn/cont, createdAt, version | `_id`, `members` |
| `messages` | conversationId, sender đã xác thực, text/type, createdAt, readBy, reactions | `_id`, compound `(conversationId ASC, createdAt DESC, _id DESC)` |
| `preferences` | username, conversationId, pinned, muted | `_id` suy ra từ username + conversation |

ID DM dựa trên hai username đã sắp xếp để cả hai người mở cùng một DM. ID chống gửi lặp dựa trên SHA-256 với key có giới hạn độ dài. Hash ở đây là định danh kỹ thuật, không phải mã hóa nội dung. Membership có optimistic version để tránh ghi đè do mời đồng thời.

## Chạy local

```bash
# Từ root project
# .env hiện có được giữ nguyên; thêm biến cần thiết theo .env.example nếu tùy chỉnh.
./scripts/dev-start.sh
```

Script thêm chat-service vào danh sách khởi động, chờ MongoDB sẵn sàng và dùng cổng hiện có của container `ccadro-mongodb`. Khi chưa cấu hình MONGODB_PORT mà 27017 đã bị Mongo khác chiếm, script chọn 27018; không dừng MongoDB khác. Có thể đặt rõ:

```bash
export MONGODB_PORT=27018
export CHAT_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat
./scripts/dev-start.sh
```

Nếu muốn tự chạy riêng, khởi động Identity/Gateway như bình thường rồi:

```bash
MONGODB_PORT=27018 docker compose up -d mongodb
mvn -f backend/chat-service/pom.xml package -DskipTests
CHAT_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat \
  java -jar backend/chat-service/target/chat-service-0.1.0-SNAPSHOT.jar
```

Gateway có route `/api/v1/chat/**` và Swagger `/services/chat/v3/api-docs`. Cần rebuild/restart Identity và Gateway để lấy route/danh bạ mới; script dev-start không tự rebuild một jar đã có. Khi cập nhật source:

```bash
mvn -f backend/identity-service/pom.xml package -DskipTests
mvn -f backend/api-gateway/pom.xml package -DskipTests
mvn -f backend/chat-service/pom.xml package -DskipTests
```

MongoDB container local chỉ publish trên loopback, có named volume `ccadro-mongodb-chat-data`. Chat Service cũng mặc định bind loopback. Production dùng URI có authentication/TLS và quyền giới hạn database, backup được thử restore; không đưa container Mongo local không auth ra public network. Đặt `CHAT_BIND_ADDRESS=0.0.0.0` chỉ khi chạy service trong mạng container/private phù hợp.

Các biến: `CHAT_MONGODB_URI`, `MONGODB_PORT`, `CHAT_PORT`, `CHAT_BIND_ADDRESS`, `CHAT_SERVICE_URL`, `CHAT_SOCKET_PORT` (Socket.IO server mặc định `8091`), `CHAT_SOCKET_URL` (Gateway → Chat WebSocket transport), `CHAT_SOCKET_HTTP_URL` (Gateway → Chat polling transport), `CHAT_SOCKET_BIND_ADDRESS`, `CCADRO_CHAT_SOCKET_ORIGINS` (origin UI được phép, phân tách bằng dấu phẩy), `IDENTITY_SERVICE_URL`. Frontend dùng `VITE_API_URL` làm địa chỉ Gateway chung cho REST, SSE và Socket.IO. Với UI demo, export `VITE_CHAT_DEMO_MODE=true` trước khi chạy Vite hoặc đặt trong `frontend/.env.local`; build lại nếu là bundle production. Chế độ live là mặc định.

## API

Các endpoint REST cần `Authorization: Bearer <JWT thật từ Identity>`; Socket.IO dùng vé một lần từ endpoint đã xác thực; envelope thành công `{code:1000,result:...}`.

| Method | Path dưới `/api/v1/chat` | Body/query |
|---|---|---|
| POST | `/socket-ticket` | Vé một lần, TTL 30 giây, cần Bearer |
| GET | `/contacts` | Danh bạ tối thiểu |
| GET | `/conversations` | Các hội thoại của người gọi, có lastMessage/unreadCount |
| POST | `/conversations` | `{type:"DM" hoặc "GROUP", title, members:[username], containerCode?, shipmentCode?}` |
| POST | `/conversations/{id}/members` | `{members:[username]}`; chỉ owner của GROUP |
| GET | `/conversations/{id}/messages` | `limit=1..100`, `cursor?` |
| POST | `/conversations/{id}/messages` | `{clientMessageId, messageText, messageType}` |
| PUT | `/conversations/{id}/read` | `{throughMessageId}`; chỉ đánh dấu tới tin đã xem |
| PUT | `/conversations/{id}/messages/{messageId}/reaction` | `{emoji, active}` |
| GET | `/preferences` | Preferences của người gọi |
| PUT | `/conversations/{id}/preferences` | `{pinned?, muted?}` |

UI hiện giới hạn danh sách 200 hội thoại/preferences cho một tài khoản. Đây là giới hạn MVP; cần pagination danh sách trước khi tăng quy mô. Không có xóa/thu hồi tin nhắn, rời nhóm hoặc đổi owner trong lần triển khai này. Sau khi được mời, thành viên có quyền xem toàn lịch sử nhóm; cần mô hình joinedAt nếu product yêu cầu chỉ xem từ lúc vào nhóm.

## Socket.IO realtime

Client gọi `POST /api/v1/chat/socket-ticket` với Bearer, sau đó kết nối Socket.IO tại `/api/v1/chat/socket.io/` qua Gateway. Vé ngẫu nhiên có thể dùng một lần trong 30 giây; JWT dài hạn không nằm trong URL. Origin được đối chiếu allow-list ở handshake, Identity được introspect lại khi kết nối và mỗi 25 giây. Query ticket cần được che nếu bật access log tại proxy.

REST vẫn là nguồn dữ liệu có thẩm quyền: `POST /conversations/{id}/messages` lưu Mongo và phát `ChatChangedEvent`; Socket.IO truy vấn session Mongo theo username thành viên rồi gửi event `message` chứa `conversationId` đến các client đang kết nối. Frontend tải nội dung/lịch sử qua REST với kiểm tra membership. Các thao tác read/reaction cũng ghi qua REST rồi phát event tương tự. Event chỉ là tín hiệu đồng bộ, không chứa nội dung tin nhắn và không phải ACK ghi dữ liệu.

Server lưu phiên đang kết nối vào `chat_socket_sessions`, xóa khi disconnect và kiểm tra lại phiên khi heartbeat/push. Reconnect dùng backoff 0,5–10 giây và xin vé mới cho mỗi lần. Gateway có route riêng cho polling HTTP và WebSocket upgrade đứng trước route REST chat.

**Phạm vi triển khai hiện tại: một instance Chat Service.** Session Socket.IO được lưu MongoDB nhưng kết nối transport và fan-out nằm trên instance đang giữ socket. Khi chạy nhiều replica cần sticky routing cùng pub/sub adapter (hoặc broker tương đương) để các instance phát chéo; chưa cấu hình nhiều replica. UI chỉ mở socket khi workspace chat mở, chưa triển khai presence/typing hoặc thông báo nền toàn ứng dụng.

Production dùng HTTPS/WSS, đặt `CCADRO_CHAT_SOCKET_ORIGINS` thành đúng domain UI và cấu hình proxy hỗ trợ cả polling HTTP lẫn WebSocket Upgrade. Cần bảo vệ query ticket trong access log/proxy log.

## Khôi phục phiên đăng nhập bị từ chối

Nếu chat báo cần xác thực lại nhưng Gateway/Chat vẫn khỏe, kiểm tra loại phiên đăng nhập. Luồng IAM dự phòng cũ có thể tạo token `iam-jwt-...` chỉ dùng cục bộ; Identity không chấp nhận token đó. HTTP 401 cũng có thể là JWT hết hạn hoặc bị thu hồi; không kết luận máy chủ ngừng hoạt động từ status này. HTTP 403 được hiển thị riêng là lỗi quyền.

Chat nhận biết phiên cục bộ, không xin vé bằng token đó, hiển thị nút **Đăng nhập lại** dẫn đến `/login?backend=required`. Luồng này chỉ hoàn tất khi Identity cấp token thật; lỗi mạng không tự tạo một phiên cục bộ mới. Sau khi đăng nhập, mở lại chat để kết nối Socket.IO. Không cần xóa database hay chuyển sang chat cục bộ để khôi phục chat trực tuyến.

## Chat cũ và dữ liệu lịch sử

Bảng PostgreSQL `driver_dispatch_message`, endpoint Asset cũ và localStorage cũ được giữ để tránh mất dữ liệu; frontend live mới không ghi/đọc chúng làm nguồn chat. Endpoint Asset là legacy, không đồng bộ tự động với MongoDB; client cũ cần nâng cấp sang `/api/v1/chat` để tránh hai kho hội thoại khác nhau.

Không tự nhập dữ liệu browser hoặc gán tài khoản theo role/driverCode: dữ liệu cũ có người gửi do client cung cấp, và thread theo driver không xác định chắc những username nào được đọc. Muốn nhập lịch sử an toàn:

1. Sao lưu SQL/localStorage; dừng client ghi endpoint cũ trong thời gian chốt cutover.
2. Lập mapping từng thread/driver → danh sách username thực, owner và cách xác minh sender. Không suy luận rằng mọi tài khoản CUSTOMER được đọc cùng thread.
3. Import có ID legacy cố định trong migration quản trị riêng, giữ createdAt và provenance. Read receipt cũ theo role không được đổi thành mọi người đã đọc.
4. Đối chiếu số lượng/nội dung và membership, sau đó cho người dùng đọc lịch sử đã nhập. Không xóa nguồn SQL/browser trước khi xác nhận.

Việc nhập lịch sử cần mapping quyền đọc thực tế, không là tiền điều kiện để dùng chat mới. Hiện chưa chạy import hay thay đổi dữ liệu SQL cũ.

## Kiểm tra

```bash
# Real Mongo integration: DB test tên ngẫu nhiên, không dùng DB ccadro_chat nghiệp vụ
CHAT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat_test \
  mvn -f backend/chat-service/pom.xml test
mvn -f backend/identity-service/pom.xml -Dtest=ChatDirectoryTest test
mvn -f backend/api-gateway/pom.xml test
cd frontend
npm test -- --run src/test/ChatSocket.test.js src/test/RemoteChat.test.js src/test/MessengerWorkspace.test.jsx
npm run build
```

CI provision MongoDB rồi đặt `CHAT_TEST_MONGODB_URI` để chạy integration. Khi biến không có, integration test được skip có chủ đích; không coi việc đó là đã kiểm tra Mongo. Test gồm quyền thành viên, giả header/sender, token không hợp lệ, idempotency, pagination, read receipt, reaction, preferences riêng tư, quyền mời và payload giới hạn; frontend kiểm tra không có seed trong live, send lỗi, cách ly cache khi đổi account và response cũ về muộn.
