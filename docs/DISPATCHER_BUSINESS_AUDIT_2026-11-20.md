# Kiểm tra nghiệp vụ Dispatcher — 20/11/2026

## 1. Kết luận và phạm vi

**Dispatcher đã có nhiều màn hình và API nghiệp vụ, nhưng các luồng chưa khép kín để có thể kết luận đáp ứng vận hành thực tế.** Điểm thiếu lớn nhất là tính nhất quán giữa vận đơn, container, xe, tài xế, tuyến, chuyến Tracking và giao nhận. Có các lỗi hợp đồng frontend–backend đã xác nhận bằng thực thi với HTTP giả lập; các rủi ro cạnh tranh và sai lệch liên dịch vụ được xác định từ mã nguồn, chưa tái hiện trên hệ thống đang chạy.

Phạm vi kiểm tra:

- Các tuyến và menu của role `DISPATCHER`; quản lý vận đơn, container/manifest, lập tuyến, phân công, xuất bến, giám sát, đổi tuyến, cảnh báo, ePOD và carbon.
- Các controller/service/validator/repository/migration liên quan trong Asset, Shipment, Routing, Tracking, Notification và Carbon; kiểm tra ranh giới quyền với Identity, Incident và Hub.
- Đọc mã nguồn hiện tại trong working tree, bao gồm phần chưa commit. Kết quả có thể khác bản đang được chạy/deploy.
- Chạy bộ test Shipment trên bản sao độc lập; kiểm tra request frontend bằng `fetch` giả lập; thử kết nối Gateway local để đăng nhập tài khoản `dispatcher`.

**Giới hạn:** Gateway `http://localhost:8888` không kết nối được trong lần kiểm tra. Vì vậy chưa đăng nhập thành công và chưa xác nhận end-to-end bằng tài khoản thật. Không suy diễn lỗi kết nối thành lỗi mật khẩu hoặc lỗi phân quyền. Không thay đổi dữ liệu vận hành, phát lệnh xe, gửi thông báo, sửa ứng dụng hay push trong đợt audit này. Đây là đánh giá nghiệp vụ và tích hợp, không phải chứng nhận an ninh hoặc tuân thủ pháp lý.

Quy ước ưu tiên: **P0** cần xử lý trước khi dùng luồng liên quan cho vận hành thật; **P1** cần hoàn thiện để quy trình tin cậy, có phục hồi và truy vết; **P2** bổ sung chiều sâu sau khi thống nhất phạm vi vận hành. Không dùng số màn hình hoặc số unit test để tính tỷ lệ hoàn thành nghiệp vụ.

## 2. Đính chính những nhận xét cũ

Tài liệu `DISPATCHER_BUSINESS_REVIEW.md` phản ánh một phiên bản trước. Không tiếp tục coi ba điểm dưới đây là lỗi hiện tại:

1. `DispatchPage` hiện lấy `tripId` do Saga trả về và gọi `startTrip`; **không còn tự gọi `createTrip` lần hai**. Rủi ro tạo trùng do cạnh tranh ở backend vẫn cần xử lý riêng.
2. `DispatchEligibilityValidator` **đã kiểm tra pre-trip tại backend**, yêu cầu bản ghi đạt và đúng tài xế của xe đang được kiểm tra. Phần còn thiếu là độ mới của biên bản và các điều kiện eligibility bổ sung.
3. Cờ `assetReservationStarted` hiện được đặt **trước** các lệnh đổi trạng thái tài sản. Lỗi bỏ bù trừ chỉ vì cập nhật tài sản thứ hai thất bại đã được giảm thiểu. Tuy nhiên bù trừ vẫn chưa có bảo đảm hoàn tất và chưa có quyền sở hữu reservation.

Bằng chứng: `frontend/src/systems/operations/features/dispatch/DispatchPage.jsx:113`; `backend/shipment-service/src/main/java/com/ccadro/shipment/validator/DispatchEligibilityValidator.java:48`; `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/TripDispatchSagaOrchestrator.java:101`.

## 3. Danh mục nghiệp vụ hiện có

| Nhóm | Đã có trong mã nguồn | Đánh giá và phần còn thiếu |
|---|---|---|
| Điều hướng theo vai trò | Console, sidebar, trang chọn vận đơn/chuyến; chặn route theo role | Có cấu trúc. Trang chọn hiện chỉ loại bản ghi đã xóa, chưa lọc theo trạng thái đủ điều kiện cho từng hành động. |
| Quản lý vận đơn | Tạo, danh sách, tìm kiếm, xóa mềm, khôi phục | Một phần. Còn fallback demo, nhận định danh khách hàng bằng trường nhập và xóa mềm chưa chặn đơn đang chạy. |
| Hồ sơ container | Mã, loại/ISO type, chủ sở hữu, công ty phụ trách, tải trọng/thể tích, xe/tài xế, hành trình, e-seal/telematics | Đủ nhiều trường hiển thị. Liên kết công ty–vận đơn–cơ sở nhận chưa được xác thực nhất quán phía server. |
| Manifest | Mã dòng/kiện hàng, vận đơn, hub, loại/tên hàng, cân nặng, số kiện, người nhận, địa chỉ/tọa độ, yêu cầu lạnh và SLA | Một phần. `itemCode` duy nhất toàn hệ thống chưa thay thế danh mục SKU/sản phẩm và lô hàng. Chưa có ràng buộc đóng băng mọi thao tác sau xuất bến. |
| Checklist container | Mở đợt; Chuẩn bị → Xuất bến → Trong hành trình → Bàn giao; người xác nhận, giờ, ghi chú, ePOD | Đã có kiểm soát tuần tự, chống ghi đè và số đợt. Một số mục vẫn là xác nhận thủ công chưa nối với dữ liệu kiểm tra an toàn/tuyến. |
| Phân công xe/tài xế | Luồng Container và luồng DispatchOrder/Saga | **P0:** hai luồng chưa thống nhất, có thể chặn nhau hoặc để container chạy mà chưa có Tracking Trip. |
| Kiểm tra trước điều phối | Xe/tài xế AVAILABLE, tải trọng xe nếu có dữ liệu, pre-trip đạt/đúng tài xế; tuyến active trong strict mode | Có enforcement. Còn thiếu freshness, thiếu dữ liệu tải phải chặn, bằng lái và điều kiện tương thích theo chính sách vận hành. |
| Lập/chốt tuyến | Tính ứng viên, lựa chọn theo khoảng cách/thời gian/carbon, lưu RouteVersion | **P0:** UI gửi sai request rồi vẫn chuyển bước. Backend thiếu kiểm tra candidate thuộc đúng vận đơn. |
| Phát hành lệnh/chuyến | Saga tạo DispatchOrder, gán tài sản, kiểm tra tuyến, tạo Trip, cập nhật Shipment, log/outbox | Một phần. Thiếu reserve nguyên tử/idempotency xuyên dịch vụ và xử lý kết quả không rõ khi timeout. |
| Xuất bến/khởi hành | Container DEPARTURE và Tracking `startTrip` | **P0:** hai hành động chưa cùng một cổng kiểm soát. Chưa bảo đảm bắt đầu chuyến đồng nghĩa container đã qua kiểm soát xuất bến. |
| Theo dõi GPS/tiến độ | Bản đồ, API telemetry/live fleet, cập nhật thời gian thực; timestamp nhận tín hiệu/vị trí riêng ở container | Có nền tảng. Cần thống nhất nguồn dữ liệu và không lấy GPS máy điều phối làm vị trí xe. Chưa kiểm chứng runtime. |
| Đổi tuyến | Tạo đề xuất, kiểm tra điều kiện/cooldown, Dispatcher duyệt/từ chối, gọi Routing tạo version | Một phần. Có thể ghi ACCEPTED trong khi chưa kích hoạt tuyến mới; actor/ghi chú từ UI bị bỏ qua. |
| Cảnh báo/sự cố | Danh sách, SSE, ACK, broadcast; Incident Service tiếp nhận hiện trường và Safety xử lý | Có phân chia vai trò. UI ACK có thể báo đã tiếp nhận khi API lỗi; chưa thấy một quy trình tiếp nhận–phân công xử lý–đóng sự cố liên kết hoàn chỉnh cho Dispatcher. |
| Giao nhận/hoàn chuyến | ePOD container, ePOD Carbon, `completeTrip`; trả container về sẵn sàng sau bàn giao | **P1:** ba đường hoàn tất chưa đồng bộ Shipment/Trip/Container/tài sản. |
| Hủy/đổi tài nguyên/điều độ lại | Có giá trị trạng thái CANCELLED và kiểm tra một số trạng thái | Chưa thấy use case/API hoàn chỉnh để hủy lệnh, đổi xe/tài xế, đổi lịch có giải phóng reservation, xử lý container/tuyến và lưu lịch sử. Xóa mềm không thay thế hủy nghiệp vụ. |
| Carbon/benchmark | Tính toán, lưu phiên bản, benchmark và xuất báo cáo tại backend; UI cho Dispatcher | **P1:** request tính và endpoint benchmark từ UI không khớp backend. Có số mô phỏng; không thể coi là số đã ghi sổ. |
| Tích hợp phụ trợ | Messenger, danh mục công ty/cơ sở nhận; backend có Payment/Contract riêng | Audit này kiểm tra điểm tích hợp/quyền, không xác nhận toàn bộ chat, thanh toán hoặc ký hợp đồng. Không mặc định mở rộng Dispatcher thành Admin/HUB Manager. |

Nguồn điều hướng: `frontend/src/app/App.jsx:86`, `frontend/src/shared/layout/Sidebar.jsx:133`, `frontend/src/systems/operations/shared/OperationSelectionPage.jsx:11`.

## 4. Phát hiện chi tiết

### F01 — P0 — Chốt tuyến gửi sai request và vẫn chuyển bước khi thất bại

- `PlanningPage.handleConfirmPlan` gọi `api.selectRoute(activeCandidate.id)`; API serialize nguyên tham số thành JSON string.
- Backend yêu cầu object có **`shipmentId` và `selectedCandidateId`** trong `RouteDecisionRequest`.
- UI dùng `.catch(() => {})`, lưu kế hoạch vào sessionStorage và điều hướng tới Dispatch trong `finally`. Khi đang dùng candidate demo không có ID, UI bỏ qua request nhưng vẫn chuyển bước.
- **Hậu quả:** người điều phối có thể tưởng đã chốt tuyến trong khi chưa có RouteVersion active; strict Saga sẽ từ chối điều phối. Kế hoạch trong sessionStorage cũng không được đối chiếu `shipmentId` khi Dispatch đọc lại, có thể hiển thị tuyến của lần chọn trước.
- **Cần sửa:** gửi đúng DTO; chỉ đi tiếp sau phản hồi thành công; lấy lại version đã lưu; dữ liệu demo chỉ được dùng trong chế độ mô phỏng tách biệt.

Nguồn: `frontend/src/systems/operations/features/planning/PlanningPage.jsx:142`; `frontend/src/services/api.js:595`; `backend/routing-service/src/main/java/com/ccadro/routing/dto/request/RouteDecisionRequest.java:17`; `frontend/src/systems/operations/features/dispatch/DispatchPage.jsx:66`.

### F02 — P0 — Hai luồng phân công không cùng một nguồn quyết định

- Form Container gọi riêng `assignContainerTrip`. Với container có đợt kiểm soát, Asset chuyển xe sang `ASSIGNED`, tài xế sang `ON_TRIP`, container sang `ASSIGNED`.
- Hàm này lưu `assignedShipmentId/code` và hành trình từ request, không tạo DispatchOrder/Tracking Trip và không xác minh thực thể Shipment/customer từ dịch vụ có thẩm quyền.
- Saga Shipment lại yêu cầu xe và tài xế đều `AVAILABLE`. Nếu phân công ở Container trước rồi điều phối cùng bộ tài nguyên, Saga sẽ từ chối. Nếu chạy Saga trước, bộ tài nguyên đó cũng không còn AVAILABLE để phân công qua Container.
- **Hậu quả:** mỗi màn có thể hoạt động riêng nhưng ghép thành hành trình thực thì không nhất quán; trạng thái container không chứng minh đã có lệnh và chuyến theo dõi.
- **Cần sửa:** một use case phân công sở hữu liên kết Shipment–Container–Vehicle–Driver–RouteVersion–Trip. Container giữ màn hình quản lý riêng nhưng gọi cùng điều phối nghiệp vụ. Tách giữ chỗ tài nguyên khỏi thời điểm xe thực sự khởi hành; thống kê số chuyến không tăng chỉ vì phân công.

Nguồn: `frontend/src/systems/operations/features/containers/ContainerControlPanel.jsx:64`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerService.java:187`; `backend/shipment-service/src/main/java/com/ccadro/shipment/validator/DispatchEligibilityValidator.java:96`.

### F03 — P0 — Checklist xuất bến chưa là cổng kiểm soát chung

- `ContainerControlService.complete` kiểm tra thứ tự, đủ keys/ghi chú, đã phân công, manifest của vận đơn hiện tại, tải container và yêu cầu hàng lạnh. Đây là kiểm soát thực đã có.
- Nhưng bước DEPARTURE chỉ chuyển container sang `IN_TRANSIT` sau các kiểm tra trên; không truy vấn pre-trip mới nhất, tuyến active, sự tương thích xe/container, trạng thái niêm phong thực tế hoặc DispatchOrder/Trip hợp lệ.
- Ngược lại, `TripService.startTrip` chỉ từ chối Trip COMPLETED; không kiểm tra checklist container. Container chưa có lịch sử control round vẫn đi qua nhánh legacy với quy tắc nới lỏng hơn.
- **Hậu quả:** xác nhận checkbox “pre-trip/niêm phong/lộ trình” chưa tương đương backend đã chứng minh các điều kiện đó đúng; có hai cửa xuất bến không cùng chính sách.
- **Cần sửa:** dùng một DeparturePolicy được server thực thi; các mục đối chiếu thủ công lưu người/giờ/bằng chứng, các điều kiện tự động lấy từ dịch vụ nguồn. Có kế hoạch chuyển đổi container legacy, không để legacy thành đường bỏ qua kiểm soát vô thời hạn.

Nguồn: `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerControlService.java:64`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerService.java:191`; `backend/tracking-service/src/main/java/com/ccadro/tracking/service/TripService.java:129`.

### F04 — P0, rủi ro từ code — Chưa giữ chỗ xe/tài xế nguyên tử khi nhiều người điều phối

- Shipment được đọc thường rồi kiểm tra DispatchOrder tồn tại; trạng thái xe/tài xế được GET rồi PUT riêng lẻ. API status của Vehicle không có expected status/reservation owner.
- Nhánh Container khóa container, nhưng không khóa cùng các bản ghi xe/tài xế khi nhiều container khác nhau cùng được phân công.
- Tracking `createOrGetTrip` dùng find-then-insert theo shipment; entity/migration được kiểm tra không có unique `shipment_id`. Unique `trip_code` không bảo đảm một chuyến cho một lệnh. Nếu vận hành hỗ trợ nhiều chặng, khóa đúng phải là dispatch/leg, không ép một trip cho mọi shipment một cách máy móc.
- `createOrGetTrip` có trả chuyến đã tồn tại, nhưng không kiểm tra lại xe/tài xế có khớp request mới. Đây chưa phải idempotency đủ chặt.
- **Hậu quả dự kiến:** hai lệnh đồng thời có thể cùng vượt qua trạng thái AVAILABLE, hoặc bù trừ của lệnh này giải phóng tài nguyên đã thuộc lệnh khác. Chưa chạy tải để chứng minh tình huống đã xảy ra ở database thật.
- **Cần sửa:** Asset cung cấp Reserve/Confirm/Release nguyên tử với reservationId, owner, thời hạn; khóa/CAS có điều kiện; ràng buộc duy nhất theo cardinality nghiệp vụ; idempotency key bền vững và xử lý conflict rõ ràng.

Nguồn: `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/TripDispatchSagaOrchestrator.java:66`; `backend/shipment-service/src/main/java/com/ccadro/shipment/validator/DispatchEligibilityValidator.java:156`; `backend/asset-service/src/main/java/com/ccadro/asset/service/VehicleService.java:92`; `backend/tracking-service/src/main/java/com/ccadro/tracking/service/TripService.java:102`; `backend/db/migration/V005__create_trip_tracking.sql:6`.

### F05 — P1 — Saga có thể ghi đã bù trừ dù giải phóng tài nguyên thất bại

- `compensateAssetReservation` bắt lỗi và chỉ log. Phía gọi sau đó vẫn ghi `COMPENSATED`/`ROLLED_BACK`.
- Nếu trả xe thất bại, lệnh trả tài xế trong cùng khối try không tiếp tục. Chưa thấy trạng thái đối soát bền vững hoặc retry từng tài nguyên có xác nhận owner.
- Tracking có thể đã tạo trip nhưng phản hồi bị mất; phần bù trừ hiện không đối soát/hủy chuyến đó.
- **Cần sửa:** các trạng thái `COMPENSATION_PENDING/FAILED` hoặc tương đương; tác vụ đối soát có retry giới hạn; không tuyên bố đã rollback toàn bộ trước khi từng bước có kết quả. Ghi nhận kết quả chưa rõ để phục hồi an toàn.

Nguồn: `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/TripDispatchSagaOrchestrator.java:152`, `:246`.

### F06 — P1 — Máy trạng thái và hoàn chuyến chưa đồng bộ

- Saga chỉ chặn Shipment đã xóa, `DISPATCHED` hoặc có lệnh đang hiệu lực; chưa có whitelist trạng thái nguồn được điều phối. Một Shipment DELIVERED/CANCELLED không có lệnh hiệu lực vẫn chưa bị loại bằng chính trạng thái đó.
- `TripService.completeTrip` chuyển thẳng `COMPLETED/DELIVERED`, không yêu cầu trạng thái đang chạy hoặc ePOD hợp lệ và không cập nhật Shipment/Container/tài sản.
- ePOD Container có kiểm soát theo các stage nhưng trả tài nguyên về AVAILABLE chỉ dựa vào container khác đang `IN_TRANSIT`; không xét reservation `ASSIGNED` hoặc Tracking Trip đang hoạt động. Nó cũng không đồng bộ hoàn tất Shipment/Trip.
- ePOD Carbon gọi hoàn tất Tracking theo best-effort, bắt lỗi và tiếp tục; không bảo đảm đồng bộ container.
- **Cần sửa:** state transition rõ cho từng aggregate; điều kiện đến nơi/giao thiếu/giao từ chối/ePOD; quy trình hoàn tất có sự kiện và đối soát; chỉ giải phóng đúng reservation sau khi hoàn thành hoặc hủy hợp lệ. Không đồng nhất giao hàng với container đã quay về bãi và sẵn sàng chuyến mới.

Nguồn: `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/TripDispatchSagaOrchestrator.java:74`; `backend/tracking-service/src/main/java/com/ccadro/tracking/service/TripService.java:145`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerService.java:255`; `backend/carbon-service/src/main/java/com/ccadro/carbon/service/PodService.java:165`.

### F07 — P1 — Điều kiện xe/tài xế thiếu các kiểm soát dữ liệu quan trọng

- Validator đã yêu cầu pre-trip đạt/đúng tài xế nhưng không đọc `inspectedAt` để kiểm tra thời hạn; chưa ràng buộc biên bản với ca/chuyến hoặc phiên bản kiểm tra phù hợp.
- Driver chỉ được kiểm tra AVAILABLE; không đối chiếu hạn/hạng bằng lái, xác minh hồ sơ hay ca làm/nghỉ trong use case này.
- Nếu `maxPayloadTons` hoặc cân nặng Shipment thiếu, nhánh chống quá tải bị bỏ qua. Checklist container chỉ so cân manifest với payload của container, chưa đối chiếu đồng thời tải của đầu kéo/tổ hợp xe hoặc tổng khối lượng khai báo trong vận đơn.
- **Đã tái hiện trên bản sao backend bằng 3 characterization test:** pre-trip `2020-01-01`, driver có `licenseExpiryDate=2020-01-01` (đúng tên trường của DriverResponse), và xe không có `maxPayloadTons` đều vẫn qua validator khi các điều kiện còn lại hợp lệ. Test đạt ở đây xác nhận thiếu kiểm soát hiện tại, không có nghĩa các dữ liệu đó hợp lệ để vận hành.
- **Cần sửa:** thiếu dữ liệu an toàn phải báo không đủ điều kiện; kiểm tra tải xe và container theo cùng quy tắc; chính sách thời hạn pre-trip, hồ sơ và ca làm có cấu hình. Không tự đặt giới hạn giờ lái hoặc thời hạn pháp lý chưa được xác nhận cho phạm vi vận hành cụ thể.

Nguồn: `backend/shipment-service/src/main/java/com/ccadro/shipment/validator/DispatchEligibilityValidator.java:54`, `:102`, `:125`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerControlService.java:80`.

### F08 — P1 — Dữ liệu demo và trạng thái cục bộ có thể gây hiểu nhầm thao tác thành công

- Dispatch khởi tạo xe/tài xế mẫu; chỉ thay bằng dữ liệu thật khi API trả danh sách không rỗng. API lỗi hoặc danh sách thật rỗng vẫn để tài nguyên mẫu trong form.
- UI Dispatch đọc `licensePlate`/`payloadCapacityTons`, trong khi VehicleResponse trả `plateNumber`/`maxPayloadTons`; màn hình có thể hiển thị biển số hoặc tải trọng mặc định sai.
- Danh sách Shipment cũng thay API rỗng/lỗi bằng danh sách demo. Xóa/khôi phục gọi API rồi bỏ qua lỗi và cập nhật localStorage/UI ngay.
- Backend xóa mềm Shipment chưa chặn trạng thái đang điều phối/vận chuyển và không thực hiện hủy nghiệp vụ.
- **Cần sửa:** loading/empty/error riêng; không cho thao tác dữ liệu demo trong mode thật; dùng DTO chuẩn; chỉ xác nhận thay đổi sau khi server thành công hoặc phải rollback optimistic UI. Chặn xóa bản ghi đang có hoạt động nghiệp vụ.

Nguồn: `frontend/src/systems/operations/features/dispatch/DispatchPage.jsx:59`, `:215`, `:244`; `backend/asset-service/src/main/java/com/ccadro/asset/dto/response/VehicleResponse.java:20`; `frontend/src/systems/operations/features/shipments/ShipmentsPage.jsx:94`, `:161`; `backend/shipment-service/src/main/java/com/ccadro/shipment/service/ShipmentService.java:125`.

### F09 — P1 — Retry sau khi đã tạo lệnh nhưng chưa khởi hành chưa được xử lý đúng

- Dispatch gọi tạo lệnh rồi `startTrip`. Nếu tạo lệnh thành công nhưng start thất bại, UI chỉ hiển thị lỗi.
- Nhấn lại tạo một mã lệnh mới theo thời gian; Saga sẽ chặn Shipment đã DISPATCHED. Người dùng chưa có hành động tiếp tục cùng lệnh/chuyến hoặc khôi phục trạng thái không rõ.
- **Cần sửa:** dùng idempotency key xuyên lần thử; đọc lại lệnh đã có khi timeout; cho retry bước khởi hành trên cùng trip sau khi kiểm tra điều kiện, không tạo lại toàn bộ điều phối.

Nguồn: `frontend/src/systems/operations/features/dispatch/DispatchPage.jsx:113`; `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/TripDispatchSagaOrchestrator.java:74`.

### F10 — P1 — Liên kết công ty, cơ sở và sản phẩm chưa đủ chặt

- Container có các trường `responsibleCompanyId/code/name`, nhưng tạo mới chỉ kiểm tra trùng mã; chưa xác minh bộ ba cùng thuộc một công ty hợp lệ.
- Assignment nhận Shipment ID/code và tên điểm đi/đến từ client, chưa xác minh cùng Shipment, cùng công ty hoặc cơ sở đích hợp lệ.
- Manifest có `itemCode` unique, `cargoName/category`, `shipmentCode`, `hubCode` và địa chỉ giao. Hiện chưa có mô hình riêng cho SKU/product, số lượng theo đơn vị, batch/lot/serial, công ty sở hữu hàng và facility ID có quan hệ xác thực.
- Thêm manifest được chặn sau PREPARATION, nhưng xóa mềm/khôi phục manifest đi thẳng qua `ThirdPartyHandoverService`, không áp dụng cùng khóa trạng thái. Sau khi xuất bến có nguy cơ manifest hiển thị khác bộ hàng đã được xác nhận. Cần xét cả API hub liên quan chứ không chỉ form tạo.
- **Cần sửa:** giữ mã container vật lý và mã vận hành theo công ty là hai thuộc tính riêng; liên kết bằng ID có kiểm chứng; tách SKU khỏi mã kiện/dòng manifest; snapshot manifest/version tại xuất bến; thay đổi sau khóa đi qua quy trình điều chỉnh có lý do và audit. Nếu hỗ trợ hàng ghép nhiều công ty hoặc nhiều điểm dừng, cần mô hình consignment/leg và quyền theo từng lô, không ghi đè một trường công ty duy nhất.

Nguồn: `backend/asset-service/src/main/java/com/ccadro/asset/dto/request/ContainerCreateRequest.java:18`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ContainerService.java:114`, `:126`, `:187`; `backend/asset-service/src/main/java/com/ccadro/asset/entity/ContainerCargoManifestItem.java:28`; `backend/asset-service/src/main/java/com/ccadro/asset/service/ThirdPartyHandoverService.java:133`, `:162`; `backend/asset-service/src/main/java/com/ccadro/asset/service/AssetService.java:281`.

### F11 — P1 — Carbon/benchmark có lỗi hợp đồng API

- UI gọi `calculateTripCarbon(tripId, {...})`, nhưng helper chỉ nhận một payload. Body thực tế là JSON string của tripId, bỏ qua toàn bộ thông số.
- Helper gọi `/api/v1/carbon/emissions/calculate`; controller hiện khai báo `/api/v1/carbon/calculate`.
- DTO backend yêu cầu `tripId`, `calculationType`, `cargoPayloadTons`, `totalDistanceKm`; UI dùng `actualDistanceKm`/`payloadTons` và thiếu một số trường.
- Endpoint đánh giá benchmark từ helper cũng khác controller: `/trips/{id}/benchmark/evaluate` so với `/benchmarks/evaluate/{id}`.
- Khi lỗi, UI có ghi rõ “mô phỏng”; đây không phải dữ liệu kiểm toán đã lưu. Chưa có cơ sở từ đợt audit để xác nhận engine đáp ứng đầy đủ một tiêu chuẩn phát thải chỉ vì tên màn hình là GLEC v3.
- **Cần sửa:** đồng bộ endpoint/DTO, contract test xuyên FE–BE; tách planning estimate khỏi POST_TRIP đã ghi sổ; lấy khối lượng/quãng đường thực và nguồn hệ số có lineage.

Nguồn: `frontend/src/systems/operations/features/carbon/TripCarbonPage.jsx:97`; `frontend/src/services/api.js:653`; `backend/carbon-service/src/main/java/com/ccadro/carbon/controller/CarbonController.java:51`, `:73`; `backend/carbon-service/src/main/java/com/ccadro/carbon/dto/request/EmissionCalculationRequest.java:19`.

### F12 — P1 — Duyệt đổi tuyến chưa bảo đảm tuyến được áp dụng và đủ audit

- UI truyền actor/ghi chú ở tham số thứ ba nhưng helper chỉ nhận hai tham số, nên request chỉ có `{decision}`. Không nên sửa bằng cách tin tên người dùng do client truyền; backend cần lấy actor đã xác thực.
- Backend lưu ACCEPTED trước, gọi Routing, rồi bắt và log lỗi đồng bộ. Có thể trả ACCEPTED trong khi Trip còn RouteVersion cũ.
- Đề xuất tính lợi ích quãng đường bằng tỷ lệ ước tính; chưa thể coi đó là bằng chứng một tuyến thay thế khả thi và tối ưu đã được tạo.
- **Cần sửa:** phân biệt APPROVED và APPLIED hoặc trạng thái tương đương, có retry/đối soát; chỉ báo đã áp dụng sau xác nhận; lưu actor, lý do, version trước/sau và hiệu lực; xác thực tuyến khả thi trước khi giao tài xế.

Nguồn: `frontend/src/systems/operations/features/tracking/TripTrackingPage.jsx:399`; `frontend/src/services/api.js:633`; `backend/tracking-service/src/main/java/com/ccadro/tracking/service/RerouteProposalService.java:108`, `:169`, `:217`.

### F13 — P1 — Cảnh báo ACK trên UI có thể khác trạng thái server

- Header mặc định dùng thông báo demo và giữ chúng cả khi API trả danh sách rỗng hoặc lỗi.
- ACK cập nhật UI thành ACKNOWLEDGED với tên cố định `DISPATCHER_ADMIN` trước, rồi gọi API và bỏ qua lỗi.
- Backend có lưu thông báo, deduplication và SSE; modal broadcast có xử lý lỗi. Không nên quy kết tất cả kênh cảnh báo đều là mock.
- **Cần sửa:** chỉ xác nhận ACK sau khi lưu thành công hoặc rollback khi lỗi; actor từ token; tách cảnh báo demo; liên kết người phụ trách, trạng thái xử lý và SLA phản hồi với hồ sơ sự cố. ACK nghĩa là đã tiếp nhận, không tự coi là đã xử lý xong.

Nguồn: `frontend/src/shared/layout/Header.jsx:78`, `:160`; `frontend/src/services/api.js:701`; `backend/notification-service/src/main/java/com/ccadro/notification/service/EmergencyNotificationService.java:81`, `:198`.

### F14 — P1 — Quyền thao tác, nguồn GPS và quyền sở hữu đối tượng cần thống nhất

- Gateway chỉ cho DRIVER ghi Tracking telemetry, nhưng màn Dispatcher có nút lấy Geolocation của trình duyệt rồi POST telemetry. Theo chính sách hiện tại thao tác này bị chặn; nếu mở quyền đơn giản sẽ có nguy cơ dùng vị trí máy NOC làm vị trí xe.
- Gateway cho Dispatcher đọc danh mục hub/manifest cần cho Container nhưng không mở toàn bộ nghiệp vụ Hub. Đây là phân tách phù hợp cần giữ.
- Dispatcher không vào màn Governance và không được GET inspections qua Gateway hiện tại, dù cần biết lý do đủ/không đủ điều kiện trước khi xuất bến. Nên cung cấp eligibility summary hoặc quyền đọc giới hạn, không cấp quyền sửa an toàn/Admin.
- `RouteDecisionService` tải candidate theo ID và tạo RouteVersion theo Shipment ID request, chưa đối chiếu candidate thuộc Shipment đó. Cần chặn cả request tự gọi trực tiếp, không chỉ lọc dropdown.
- `startTrip`/`completeTrip` tại service không nhận actor/assignment để kiểm tra quyền theo chuyến; Gateway có cho DRIVER truy cập các hành động này theo role. Chưa kiểm chứng khai thác runtime, nhưng cần test quyền sở hữu đối tượng và ranh giới công ty tại server.
- **Cần sửa:** actor từ danh tính đã xác thực; quyền theo hành động + đối tượng + công ty/cơ sở; GPS ghi từ driver/device đã gán, mô phỏng tách môi trường; bảo vệ đường nội bộ và kiểm tra không thể giả header danh tính khi đi vòng Gateway.

Nguồn: `frontend/src/systems/operations/features/tracking/TripTrackingPage.jsx:344`; `backend/api-gateway/src/main/java/com/ccadro/gateway/configuration/AuthenticationFilter.java:233`, `:301`; `backend/routing-service/src/main/java/com/ccadro/routing/service/RouteDecisionService.java:75`; `backend/routing-service/src/main/java/com/ccadro/routing/validate/RouteDecisionValidator.java:25`; `backend/tracking-service/src/main/java/com/ccadro/tracking/service/TripService.java:129`.

## 5. Đối chiếu với yêu cầu logistics đã nêu

| Yêu cầu | Kết quả hiện tại | Cần bổ sung |
|---|---|---|
| Có phần quản lý Container riêng | Có trang riêng, form tạo và vùng chi tiết | Giữ riêng UI, thống nhất use case điều phối phía sau. |
| Xác định số xe/xe nào đang chở | Có vehicle ID, biển số và tài xế | Sửa mapping biển số trên Dispatch; binding theo thời gian/chặng, không chỉ các trường ghi đè trên container. |
| Biết container đang chở hàng gì | Có danh sách manifest và đặc tính bảo quản | SKU/product riêng, số lượng/đơn vị, lô nếu cần; snapshot/version tại xuất bến. |
| Biết vận chuyển cho công ty nào | Có công ty phụ trách trên container và customer trên shipment | Phân biệt chủ container, đơn vị vận tải, chủ hàng/khách thuê, người nhận; xác thực quan hệ phía server. |
| Biết giao tới cơ sở nào | Có destinationName/hubCode và địa chỉ/tọa độ hàng | Liên kết facility ID, công ty quản lý, giờ tiếp nhận và điểm dừng; tránh chỉ nhập chuỗi tên. |
| Trạng thái đúng quy trình | Có 5 trạng thái container và 4 giai đoạn kiểm soát | Phân biệt trạng thái tài sản với chuyến/kiểm soát. Cần xem nghiệp vụ chờ nhận, đến nơi, giao thất bại, trả rỗng, hỏng/bảo trì, hủy/đổi xe có thuộc phạm vi hay không; không nhồi mọi trạng thái vào một enum. |
| Mã container theo công ty | Có mã container và trường công ty tách riêng | Đúng hướng để giữ định danh vật lý. Mã vận hành theo công ty nên là mã tham chiếu riêng và không thay mã vật lý khi thay khách hàng. |

Đối chiếu nguồn chính thức ngày 20/11/2026, qua TinyFish:

- BIC mô tả định danh container gồm owner code, equipment category, serial number và check digit. **Khuyến nghị thiết kế từ đó:** giữ định danh thiết bị ổn định; mã lô/chuyến theo công ty là dữ liệu vận hành riêng. [BIC — Container Identification Number](https://www.bic-code.org/identification-number/).
- IMO mô tả CTU Code là hướng dẫn toàn cầu không bắt buộc về xử lý/đóng hàng, bao gồm chất xếp và chằng buộc, trên chuỗi vận tải liên phương thức. **Khuyến nghị thiết kế từ đó:** checklist cần bằng chứng và vai trò chịu trách nhiệm tương ứng, không dùng việc tích checkbox để tuyên bố đã tuân thủ. Đây không phải kết luận CTU Code là nghĩa vụ pháp lý cho mọi chuyến trong hệ thống. [IMO — CTU Code](https://www.imo.org/en/OurWork/Safety/Pages/CTU-Code.aspx).

## 6. Hướng hoàn thiện theo Clean Architecture

Mã hiện tại có controller/service/repository và tách một số validator, mapper, DTO. Tuy nhiên Saga vẫn tự dựng `RestClient`, xử lý response `Map<String,Object>`, chuỗi trạng thái và điều phối nhiều chính sách trong cùng lớp; luồng Container lặp lại quyết định phân công. Vì vậy chưa nên coi việc chia package/lớp hiện tại là đã đạt đầy đủ mục tiêu Clean Architecture của dự án.

Hướng thay đổi theo từng phần, không viết lại toàn hệ thống:

1. **Domain:** `DispatchPolicy`, `DeparturePolicy`, chính sách chuyển trạng thái, tải và sự tương thích; định danh và trạng thái dùng kiểu rõ ràng. Domain không phụ thuộc Spring HTTP/JPA/DTO web.
2. **Application:** các use case `AssignDispatch`, `ConfirmDeparture`, `ChangeAssignment`, `CancelDispatch`, `CompleteDelivery`; chỉ một nơi sở hữu quyết định điều phối. Port cho reservation, eligibility, route, trip, identity/audit và event.
3. **Infrastructure:** adapter HTTP có DTO định kiểu, timeout/idempotency/error mapping; transaction repository; outbox/inbox; worker đối soát và compensation. Khóa tài nguyên trong đúng dịch vụ sở hữu dữ liệu, không kỳ vọng `@Transactional` của Shipment bao trùm các HTTP call.
4. **Presentation:** controller kiểm tra đầu vào và ánh xạ kết quả; actor lấy từ cơ chế xác thực tin cậy. Frontend gọi use case, hiển thị trạng thái backend, không quyết định thành công bằng localStorage/fallback.
5. **Contracts:** kiểm tra schema/endpoint FE–BE, không chỉ test Jackson serialize DTO riêng lẻ. Một command có idempotency key giữ nguyên qua retry, trả lệnh/chuyến đã có hoặc conflict rõ ràng.

Nguồn đánh giá kiến trúc: `TripDispatchSagaOrchestrator`, `DispatchEligibilityValidator`, `ContainerService`, `ContainerControlService`, `RouteDecisionService` và `RerouteProposalService` trong các phát hiện trên.

## 7. Thứ tự thực hiện đề xuất

| Đợt | Việc phải hoàn thành | Điều kiện kết thúc |
|---|---|---|
| 1 — Gỡ điểm nghẽn P0 | F01, F02, F03, F04; bỏ dữ liệu demo khỏi hành động thật | Chạy được một chuyến từ vận đơn đến xuất bến, có đúng liên kết container/xe/tài xế/tuyến/trip; hai Dispatcher không giữ cùng tài nguyên. |
| 2 — Vòng đời và phục hồi | F05–F10; hủy/đổi phân công; hoàn chuyến và ePOD thống nhất | Retry/timeout không sinh lệnh sai; lỗi bù trừ không bị che; hoàn/hủy giải phóng đúng reservation và giữ lịch sử. |
| 3 — Giám sát, audit và báo cáo | F11–F14; nguồn GPS; quyền theo đối tượng; carbon/benchmark | ACK/reroute phân biệt lưu và áp dụng; số mô phỏng tách số đã ghi; quyền âm được test; bằng chứng truy vết đầy đủ. |

Không cần đợi các tính năng nâng cao như xếp hàng ghép/multi-stop nếu chưa nằm trong phạm vi. Nhưng cần chốt phạm vi đó để mô hình dữ liệu và ràng buộc không tự mâu thuẫn.

## 8. Kiểm thử và bằng chứng

### Đã thực hiện

- **Bộ test Shipment hiện có: 7/7 đạt**, gồm 3 test trong `DispatchEligibilityAndSagaTest` và 4 test JSON/Geometry contract. Test eligibility có kiểm tra xe bảo trì, quá tải và một trường hợp hợp lệ có pre-trip. Test retry hiện chỉ chứng minh không bị chặn ở điều kiện Shipment đã dispatch khi lệnh cũ FAILED/CANCELLED; chưa chạy hết Saga thành công sau retry.
- **3 probe backend bổ sung đều tái hiện được lỗ hổng eligibility F07**: pre-trip cũ, bằng lái hết hạn và thiếu tải trọng tối đa vẫn được validator chấp nhận. Tổng lượt chạy sau khi thêm probe: **10 tests, 0 failure/error**; gồm 7 test hiện có và 3 test mô tả hành vi thiếu kiểm soát. Không tính 3 probe này là 3 nghiệp vụ đã đáp ứng.
- Chạy trên bản sao module tại thư mục tạm, không dùng target của working tree đang có nhiều thay đổi. Không đưa các test đang assert hành vi sai này vào bộ regression chính thức. Log và mã tái hiện lưu cục bộ trong `logs/dispatcher-audit/shipment-suite-with-probes.log` và `logs/dispatcher-audit/DispatchAuditEligibilityProbeTest.java`.
- **3 request frontend được bắt bằng fetch giả lập**, dùng chính helper `frontend/src/services/api.js` và cách gọi ở UI. Xác nhận F01/F11/F12: request chốt tuyến là chuỗi UUID; request carbon là chuỗi UUID tới endpoint không khớp; request reroute chỉ có decision. Đây là thực thi helper/serialization, không phải xác nhận server đã chấp nhận request.
- Thử đăng nhập và đọc Gateway local: không kết nối được; chưa chạy E2E/UI với tài khoản `dispatcher`. Kết quả đọc mạng: `logs/dispatcher-audit/api-readonly.json`; kết quả helper: `logs/dispatcher-audit/frontend-wire-contracts.json`. Các log này bị gitignore và chỉ có trong môi trường kiểm tra.

### Các ca nghiệm thu bắt buộc còn phải chạy

| Ca | Kết quả cần đạt |
|---|---|
| T01 — Happy path thực | Vận đơn hợp lệ → manifest → phân công → pre-trip → chốt tuyến → xuất bến → GPS → ePOD → hoàn tất; mọi ID và trạng thái khớp giữa các dịch vụ. |
| T02 — API tuyến lỗi | Hiển thị lỗi; không đổi trang, không báo chốt thành công, không dùng tuyến demo để phát lệnh. |
| T03 — Candidate sai Shipment | Server từ chối trước khi ghi RouteVersion/audit thành công. |
| T04 — Hai Dispatcher cùng chọn tài nguyên | Chỉ một reservation thành công; lệnh còn lại conflict; không ghi đè owner. |
| T05 — Double-click/mất phản hồi | Cùng idempotency key trả cùng kết quả; không tạo thêm trip/lệnh hoặc tăng số chuyến hai lần. |
| T06 — Pre-trip sai/quá hạn | Không có, FAIL, sai tài xế, quá hạn hoặc thiếu dữ liệu an toàn đều bị chặn theo policy đã chốt. |
| T07 — Tải/loại xe/hàng lạnh | Đối chiếu đồng thời tải xe, container và manifest; thiếu tải tối đa, sai loại bảo quản hoặc nhiệt độ yêu cầu không đủ thì bị chặn. |
| T08 — Một bước reserve/compensate lỗi | Không ghi ROLLED_BACK hoàn toàn nếu chưa trả được tài nguyên; tác vụ phục hồi có audit và retry. |
| T09 — Tạo lệnh xong/start lỗi | Tiếp tục được cùng Trip; không tạo mã lệnh mới để né trạng thái đã dispatch. |
| T10 — Thay manifest sau khóa | Từ chối thêm/xóa/khôi phục trực tiếp; điều chỉnh hợp lệ tạo phiên bản và lưu lý do. |
| T11 — Hủy/đổi xe/tài xế | Đúng trạng thái nguồn, kiểm tra lại eligibility, thu hồi/gán reservation và đồng bộ Trip/Container/Shipment. |
| T12 — Hoàn chuyến/ePOD lặp | Chặn trạng thái chưa hợp lệ; ePOD retry không hoàn hai lần; chỉ giải phóng đúng tài nguyên, không bỏ reservation khác. |
| T13 — Routing lỗi khi duyệt đổi tuyến | Không báo APPLIED; giữ trạng thái chờ áp dụng/lỗi rõ ràng và có phục hồi; tài xế nhận đúng version. |
| T14 — ACK khi mất mạng | UI không giữ ACK thành công giả; retry lưu đúng người xử lý và giờ; ACK không tự đóng sự cố. |
| T15 — Phân quyền âm | Dispatcher không có quyền Admin/Hub/Safety ngoài phạm vi; Driver không thao tác Trip/container người khác; candidate/facility/company không bị tráo bằng ID. |
| T16 — Carbon thật | Request đúng schema/endpoint; ghi và đọc lại cùng phiên bản, đầu vào, đơn vị, nguồn hệ số; mô phỏng không xuất như số đã kiểm toán. |
| T17 — Tín hiệu GPS cũ/mất | Vị trí và thời gian nguồn rõ ràng, không tự thay bằng tọa độ NOC hoặc demo; cảnh báo mất tín hiệu được phân biệt với mất mạng UI. |
| T18 — Legacy/soft-delete | Bản ghi cũ không bỏ qua cổng xuất bến mới; không xóa mềm đơn/container đang vận hành để thay cho quy trình hủy. |

Các ca trên là điều kiện nghiệm thu đề xuất, **không phải danh sách đã pass**. Bộ unit test hiện có không bao phủ concurrency, failure recovery và vòng đời đa dịch vụ này.
