# Rà soát nghiệp vụ và tổ chức giao diện ADMIN — CCADRO

Ngày đánh giá: 17/11/2026. Đối tượng: console nội bộ, tài khoản ADMIN, các chức năng quản trị liên quan và ranh giới với vai trò nghiệp vụ khác.

## 1. Kết luận

**Chưa đủ cơ sở nghiệm thu chức năng ADMIN cho vận hành thực tế.** Hệ thống đã có nhiều màn hình và API, nhưng tính nhất quán dữ liệu, hiệu lực phân quyền và một số luồng an toàn chưa hoàn chỉnh. Màn hình hiện có nhiều chức năng hơn số nghiệp vụ thực sự chạy xuyên suốt từ UI đến database.

Về bố cục, màu sắc và thành phần đã tương đối nhất quán ở desktop. Tuy nhiên, cấu trúc thông tin chưa đúng ranh giới công việc: quản trị tài khoản bị gộp với checklist an toàn và báo cáo sự cố; ba URL mở lại cùng khu vực IAM; chức năng quản lý tài sản và bảo trì thiếu lối vào riêng; menu điều phối/GPS trỏ dữ liệu mẫu; giao diện mobile không dùng được ở trạng thái mặc định.

Không đưa ra tỷ lệ hoàn thành phần trăm: chưa có bộ nghiệm thu được thống nhất cho các mở rộng IAM, B2B và Hub; một phần UC15–18 là Should/Phase 2 trong BRD. Phân biệt **có code/API**, **có màn hình** và **đạt luồng nghiệp vụ** là cần thiết.

## 2. Cách kiểm tra và giới hạn

- Đối chiếu [BRD v4.0](../CCADRO_BRD_NghiepVu_HoanChinh_v4.0.docx), nhất là UC01–03, UC14–18 và BRULE-01/16/17/18. Tài liệu `SYSTEM_OVERVIEW.md` còn mô tả kiến trúc monolith và migration V009 nên không dùng làm bằng chứng cho trạng thái triển khai hiện tại.
- Đọc router, sidebar, AuthContext, Dashboard, trang Governance, cài đặt tài khoản và controller/service backend tương ứng.
- Đăng nhập thật qua API; kiểm tra endpoint với ADMIN, CUSTOMER và request trực tiếp tới Identity. Chỉ đọc dữ liệu; probe POST role dùng tên ngoài danh sách cố định, bị domain validation từ chối và không tạo bản ghi.
- Trình duyệt Chrome: `/portal`, `/admin/users`, `/admin/companies`, `/governance`, `/shipments`, menu điều phối/GPS; viewport 1440×1000 và 390×844.
- Ba ca lỗi ghi dữ liệu được chặn ngay tại trình duyệt và trả HTTP 503 giả lập: pre-trip, incident, tạo user. Không ghi các thao tác thử này vào backend. LocalStorage thử nghiệm nằm trong browser context riêng và đã đóng.
- **Trình duyệt thông thường bị lỗi CORS khi đăng nhập.** Sau khi lưu bằng chứng, phần đánh giá các trang bên trong sử dụng browser chẩn đoán với `--disable-web-security`. Đây không phải cấu hình sử dụng hay giải pháp triển khai; không coi lượt chẩn đoán là bằng chứng đăng nhập bình thường đã hoạt động.
- Không thực hiện chuyển tiền, xóa/khóa tài khoản thật, phân quyền thật, xuất bến thật hoặc ra quyết định kỷ luật. Những phần chưa chạy end-to-end được ghi rõ là nhận xét từ source.

Bằng chứng: [đăng nhập thông thường](ui-review/admin/login-baseline-observations.json), [CORS đang chạy](ui-review/admin/cors-observations.json), [API](ui-review/admin/api-observations.json), [các trang và thử lỗi](ui-review/admin/observations.json), [thử tài khoản/permission](ui-review/admin/supplemental-observations.json).

## 3. Ma trận đáp ứng nghiệp vụ

| Nhóm nghiệp vụ | Hiện có | Đánh giá |
|---|---|---|
| Đăng nhập ADMIN | Identity cấp JWT; frontend có luồng đăng nhập | API thành công; browser bình thường bị CORS ở bản Gateway đang chạy |
| Danh sách và hồ sơ tài khoản | UI danh sách, bộ lọc, hồ sơ, API danh sách/chi tiết | Chưa thống nhất nguồn: UI 13 tài khoản, backend 14; tài khoản chỉ có ở backend bị frontend từ chối trước khi gọi Identity |
| Tạo, khóa, xóa mềm, khôi phục tài khoản | UI và endpoint tương ứng; backend bảo vệ root admin | Có xử lý local trước hoặc nuốt lỗi API; chưa bảo đảm thao tác thật sự được lưu |
| Vai trò và phân quyền | Backend 10 role/56 permission; UI 7 lựa chọn tạo role/48 permission | Chưa đầy đủ: thay đổi permission trên UI không gửi permission về backend; đổi role trong `adminUpdateAccount` cũng không gửi `roles` |
| Hồ sơ doanh nghiệp B2B | CRUD, MST, địa chỉ, đại diện, KYC, hạn mức | Có nền tảng; vẫn fallback local, KYC mặc định VERIFIED, chưa thấy quy trình duyệt/chứng từ đầy đủ |
| Quản lý tài sản UC01 | API xe, tài xế, container; bảng tổng quan | Chưa có khu quản lý master data riêng với hành động đầy đủ trong console ADMIN |
| Bảo trì UC02 | Backend có tạo/hoàn tất phiếu bảo trì | Chưa có luồng quản trị UI riêng; cần rà thêm điều kiện mở lại xe sau bảo trì |
| Kiểm tra trước chuyến UC03 | Form 6 checkbox, API inspection | Chưa đạt: nhận sai ngữ nghĩa trường, mặc định tất cả đạt, ID cố định và báo đạt cả khi API lỗi |
| Điều phối/giám sát UC04–10 | Có màn hình vận đơn, planning, dispatch, GPS | Có nền tảng; sidebar thiếu bước chọn đối tượng và dùng ID mẫu; không kết luận toàn bộ UC đạt qua lượt kiểm tra này |
| Báo cáo carbon UC14 | Có endpoint và bản ghi export | Chưa đầy đủ: thiếu luồng xuất file/phạm vi trên UI; service hiện tạo metadata/hash thay vì file nội dung có thể tải |
| Quản lý ca UC15 | Có entity `DriverShift` | Chưa thấy repository/service/controller và màn hình phân ca tương ứng; chưa phải một luồng hoàn chỉnh |
| Sự cố, thẩm định, điểm phạt UC16–18 | Có API create/resolve/review/summary; UI có form báo cáo | UI thiếu hàng đợi thẩm định và phê duyệt; điểm phạt “0 điểm/2 vụ miễn trừ” là nội dung cố định. UC17–18 cần kế hoạch theo phạm vi Phase 2 |
| Cấu hình quản trị, nhật ký | UI toggle nghiệp vụ, log Hub và một số log domain | Toggle quản trị đang là local preference; chưa thấy audit UI tập trung cho thay đổi quản trị |
| Dashboard | Tổng hợp vận đơn, đội xe, IAM, tài chính, ESG | Chưa đủ tin cậy cho quyết định quản trị: số mặc định, công thức nội bộ chưa phân biệt dữ liệu thiếu, SSE dùng sai khóa token |
| Responsive | Có thu gọn sidebar bằng tay | 390px vẫn mở sidebar 264px, nội dung co thành cột rất hẹp; cần sửa trước khi tuyên bố hỗ trợ mobile |

## 4. Phát hiện ưu tiên

P0: cần xử lý trước khi giao cho người dùng vận hành. P1: cần hoàn thiện trong đợt nghiệp vụ kế tiếp. P2: cải thiện cách trình bày và khả năng hiểu. Đây là mức ưu tiên của đợt rà soát, không phải thang điểm bảo mật chuẩn hóa.

### A01 — P0: xác nhận an toàn và ghi nhận sự cố thành công khi máy chủ từ chối lưu

Đã tái hiện HTTP 503 tại `/assets/inspections/pre-trip`, UI vẫn hiện “Đã xác nhận đạt 6/6 … Sẵn sàng xuất bến”. HTTP 503 tại `/incidents` vẫn hiện “Đã ghi nhận báo cáo sự cố…”. Người điều hành có thể tin rằng biên bản hoặc sự cố đã được lưu trong khi chưa có bản ghi.

Nguồn: [GovernanceAndSafetyPage.jsx](../frontend/src/pages/GovernanceAndSafetyPage.jsx#L285). Ảnh: [pre-trip lỗi API](ui-review/admin/08-pretrip-api-failure.png), [incident lỗi API](ui-review/admin/09-incident-api-failure.png).

**Khắc phục:** chỉ xác nhận sau response thành công có ID; API lỗi phải giữ form, báo chưa lưu và cho retry. Nếu hỗ trợ offline, trạng thái phải là “bản nháp/chờ gửi”, không phải “đạt/đã ghi nhận”. Giữ kiểm tra điều kiện xuất bến tại backend.

### A02 — P0: tài khoản quản trị có hai nguồn dữ liệu không nhất quán

UI `/admin/users` hiển thị 13 user, backend trả 14. `dispatcher_hcm` có trong backend nhưng ở browser mới, frontend báo “chưa tồn tại” và không gửi bất kỳ request đăng nhập nào tới Identity. Khi chặn POST tạo user bằng 503, UI vẫn thêm user vào danh sách và báo có thể đăng nhập ngay. Ngay cả trường hợp API tạo thành công, code không dùng ID trả về mà tạo `iam-...`, làm các lần cập nhật sau có thể bỏ qua API.

Nguồn: [AuthContext.jsx](../frontend/src/context/AuthContext.jsx#L1052), [tạo tài khoản](../frontend/src/context/AuthContext.jsx#L1373). Bằng chứng: [user backend bị chặn](ui-review/admin/12-backend-user-blocked.png), [thông báo thành công sau 503](ui-review/admin/10-user-api-failure.png).

**Khắc phục:** Identity là nguồn có thẩm quyền cho danh sách, đăng nhập và CRUD; lưu response thật vào cache; xóa điều kiện phải tồn tại trong seed/localStorage trước khi đăng nhập. Chế độ demo phải bật riêng và được ghi nhãn. Sau tạo/sửa phải kiểm tra lại bằng browser khác và đăng nhập thật.

### A03 — P0: ranh giới quyền quản trị chưa thống nhất ở backend

CUSTOMER gọi danh sách `/users` nhận 403 nhưng gọi `/users/username/admin` nhận 200. DTO chi tiết chứa nhiều trường hồ sơ như email, phone, nationalId, company và notes; chưa có kiểm tra owner/admin ở endpoint này. Gọi trực tiếp Identity `/users` không JWT, chỉ thêm `X-Auth-Scope: ROLE_ADMIN`, cũng nhận danh sách 14 tài khoản trong môi trường local. Gateway có xóa header giả nhưng điều này không bảo vệ khi caller đi thẳng vào service.

`RoleController` và `PermissionController` không có guard admin trong source; role service có `save` role cố định. Probe CUSTOMER gửi tên role không hợp lệ đi tới domain validation 400 thay vì bị chặn tại quyền quản trị. **Chưa thử sửa role/permission hợp lệ**, vì sẽ ảnh hưởng dữ liệu thật.

Nguồn: [UserController.java](../backend/identity-service/src/main/java/com/ccadro/identity/controller/UserController.java#L62), [RoleController.java](../backend/identity-service/src/main/java/com/ccadro/identity/controller/RoleController.java#L27), [API evidence](ui-review/admin/api-observations.json).

**Khắc phục:** kiểm quyền tại service/controller theo principal đã xác minh, kiểm owner khi đọc hồ sơ, áp dụng scope/tenant/hub theo đối tượng. Xác minh JWT tại service hoặc chỉ chấp nhận identity nội bộ đã được bảo vệ bằng cơ chế tin cậy; khóa truy cập trực tiếp từ mạng người dùng. Thêm test CUSTOMER/DRIVER không thể đọc hồ sơ ngoài phạm vi hay thay đổi chính sách ADMIN.

### A04 — P0: source Gateway và bản đang chạy khác nhau, gây lỗi đăng nhập trình duyệt

Frontend gửi credentials cho endpoint auth. Preflight đang chạy trả `Access-Control-Allow-Origin: *`, thiếu `Access-Control-Allow-Credentials`; browser báo `Failed to fetch`. Source [WebClientConfiguration.java](../backend/api-gateway/src/main/java/com/ccadro/gateway/configuration/WebClientConfiguration.java#L28) đã có origin pattern và `allowCredentials(true)`. Vì vậy đây là lỗi **phiên bản/cấu hình đang chạy**, không kết luận source hiện tại còn thiếu sửa CORS.

**Khắc phục:** build/restart Gateway đúng source, kiểm tra header thật và đăng nhập bằng browser thông thường. Gắn build version/commit cho lần chạy để nhận biết JAR cũ. Không dùng tắt bảo mật browser làm giải pháp sử dụng.

### A05 — P1: giao diện phân quyền chưa làm thay đổi quyền phía server

Khi đổi checkbox trong ma trận của `dispatcher`, browser gửi PUT `/users/{id}` chỉ có `firstName`, `lastName`, không có `roles` hoặc `permissions`. Permission được cập nhật local; API lỗi cũng bị bỏ qua. Trong source, `hasPermission` hiện được định nghĩa/xuất từ context nhưng chưa thấy màn hình sử dụng; router chủ yếu kiểm role. UI 48 quyền cũng lệch danh mục 56 quyền thật và form chỉ cho 7 role trong khi backend có 10.

Nguồn: [adminUpdateAccount](../frontend/src/context/AuthContext.jsx#L1498), [supplemental evidence](ui-review/admin/supplemental-observations.json).

**Khắc phục:** quyết định rõ phân quyền theo role hay có override từng user. Nếu theo role, UI chỉnh role và hiển thị quyền kế thừa; nếu override, thêm model/API và kiểm tra hiệu lực backend. Đọc danh mục từ backend, gửi `roles` đúng contract và chỉ báo thành công sau xác nhận. Không giữ checkbox có vẻ có tác dụng nhưng server không nhận.

### A06 — P1: cài đặt quản trị hiển thị như chính sách hệ thống nhưng chỉ lưu localStorage

ADMIN có các công tắc “phê duyệt 2 lớp khi khóa/xóa”, “cho phép B2B đăng ký”, “ghi nhật ký IAM”, “email Kafka khi bất thường”. `updateRoleOp` chỉ gọi `saveUserSettings`; tìm kiếm source không thấy các giá trị này được dùng để thi hành ở luồng đăng ký/khóa/xóa hay backend. UI hiện thông báo “Đã lưu cấu hình nghiệp vụ”.

Nguồn: [AccountSettingsModal.jsx](../frontend/src/components/ui/AccountSettingsModal.jsx#L246), [các công tắc ADMIN](../frontend/src/components/ui/AccountSettingsModal.jsx#L330).

**Khắc phục:** tách “Tùy chọn cá nhân” khỏi “Chính sách hệ thống”. Chính sách cần API lưu, version, phạm vi áp dụng, người sửa, audit và điểm thực thi. Các tính năng chưa triển khai nên thể hiện là chưa khả dụng. Nhãn Demerit “tự tạm khóa” ở cài đặt Safety cũng cần sửa để không mâu thuẫn human review BRULE-18.

### A07 — P1: điều hướng thiếu ngữ cảnh và lặp khu vực quản trị

`/admin/users`, `/admin/companies` và `/governance` dùng chung component; với ADMIN, `/governance` mặc định mở IAM, trùng `/admin/users`. Sidebar có “Quản lý User & Công ty” và “Quản trị IAM & An toàn”, khiến mục đích hai entry khó phân biệt. Điều phối, GPS, planning, carbon lại lấy ID shipment/trip cố định trong Sidebar; người dùng không được chọn đối tượng phù hợp trước khi thao tác.

Nguồn: [Sidebar.jsx](../frontend/src/components/layout/Sidebar.jsx#L29), [App.jsx](../frontend/src/app/App.jsx). Ảnh: [Users](ui-review/admin/02-users.png), [Governance](ui-review/admin/04-governance.png).

**Khắc phục:** tách route theo đối tượng nghiệp vụ; entry “Điều phối/GPS” mở hàng đợi hoặc danh sách chuyến. Chi tiết chỉ mở từ bản ghi được chọn. Chỉ giữ một vị trí quản trị IAM, thêm breadcrumb và trạng thái đang xử lý.

### A08 — P1: UC01/UC02 chưa có trải nghiệm quản trị tài sản đầy đủ

Đã có API danh sách/tạo xe, driver, container và bảo trì; console chủ yếu có bảng tổng quan, checklist và liên kết. Chưa thấy trang master data riêng cho thêm/sửa, lịch sử, giấy tờ, availability và lịch bảo trì. Có backend không đồng nghĩa Fleet Admin thực hiện được main flow BRD. `DriverShift` mới thấy entity, chưa có luồng hoàn chỉnh cho UC15.

Source `VehicleService.softDeleteVehicle` và `updateVehicleStatus` chưa kiểm chặn xe đang có chuyến theo yêu cầu UC01; `completeMaintenance` gán AVAILABLE trực tiếp. Đây là nhận xét source, chưa thử thay đổi xe thật.

**Khắc phục:** xây khu Hạm đội với Xe/Tài xế/Container/Bảo trì; trạng thái do quy tắc availability chung quyết định. Không cho deactivate/xóa xe đang active trip; hoàn tất một phiếu không được mở xe nếu còn phiếu/điều kiện chặn khác.

### A09 — P1: thiếu workspace thẩm định UC17 và quyết định UC18

Tab mang tên “UC16–18” chỉ có form gửi incident và khung số liệu cố định “0 điểm”, “2 vụ miễn trừ”, “ACTIVE”. Backend có API resolve, resolutions, demerits, review và summary, nhưng frontend API wrapper/màn hình chưa nối đủ. Người quản trị không có hàng đợi hồ sơ, evidence, reviewer, lý do quyết định hay lịch sử phê duyệt.

**Khắc phục:** workspace Sự cố → Thẩm định → Điểm vi phạm/chờ duyệt, có điều kiện chuyển trạng thái và audit. Không lấy form tài xế báo sự cố làm màn hình quản trị chính. Xếp UC17–18 vào Phase 2 nếu theo BRD; không tuyên bố đã hoàn tất chỉ từ nhãn tab.

### A10 — P1: checklist đang ghi nhận sai ngữ nghĩa và thiếu chọn xe/chuyến

Form mặc định tất cả checkbox true, vehicleId/driverId cố định. Nhãn “Thước lái & Trợ lực” được map sang `fluidLevelPassed`, “Còi & Gương” sang `cargoSecuringPassed`, “Camera/GPS” sang `emergencyKitPassed`; người tick và trường database không diễn đạt cùng việc kiểm tra. UI không cho chọn xe/tài xế/chuyến dù payload âm thầm sử dụng các ID mẫu.

**Khắc phục:** thống nhất từng tiêu chí với DTO, không mặc định đạt khi chưa kiểm; chọn đối tượng hoặc nhận từ lệnh phân công, hiển thị rõ biển số/tài xế/chuyến; chỉ hiện trạng thái PASSED/FAILED đã được backend lưu. Gọi đúng tên UC03.

### A11 — P1: dashboard chưa phân biệt dữ liệu thật, thiếu dữ liệu và điểm quy ước

`paidRatio` mặc định 0.78 khi không có payment; `esgScore` có nền 52 điểm và tỷ lệ EV mặc định; governanceScore coi tỷ lệ tài khoản không khóa là điểm tốt, dù khóa đúng có thể là quyết định quản trị cần thiết. Đây là công thức nội bộ, chưa phải bằng chứng hoàn thành GLEC/SLA. Ngoài ra, một số danh sách chỉ cập nhật khi `length > 0`, nên response rỗng có thể để lại dữ liệu cũ; `lastSyncAt` vẫn đổi khi các nguồn tải lỗi.

Dashboard đọc SSE token từ `ccadro_access_token_v1` trong khi luồng đăng nhập dùng `ccadro_token`; đã ghi nhận 401 `/tracking/stream` và UI chuyển về cập nhật định kỳ. Backend `UserResponse.status`/`lockedUntil` cũng chưa được normalize thống nhất với dashboard kiểm `a.locked`.

Nguồn: [công thức score](../frontend/src/components/dashboard/SystemEvaluationDashboard.jsx#L281), [snapshot](../frontend/src/pages/DashboardPage.jsx#L167), [SSE](../frontend/src/pages/DashboardPage.jsx#L252).

**Khắc phục:** tách KPI có định nghĩa nghiệp vụ khỏi score thử nghiệm; thiếu dữ liệu hiển thị “Chưa đủ dữ liệu”, không tự điền tỷ lệ. Lưu trạng thái tải/thời điểm thành công cho từng nguồn; chấp nhận danh sách rỗng, loại dữ liệu local khỏi dashboard live; chuẩn hóa enum/DTO và token realtime.

### A12 — P1: UC14 hiện là metadata báo cáo, chưa phải luồng xuất báo cáo hoàn chỉnh

`CarbonReportService.exportAuditReport` lọc CALCULATED rồi lưu metadata; chưa sinh nội dung CSV/Excel hoặc đường dẫn tải file. SHA-256 được tính từ tên/số lượng/tổng/timestamp, không từ bytes của báo cáo. Chưa nhận scope customer/period/shipment; chưa tách calculationType ở bước aggregate, có thể gộp các record kế hoạch và thực tế cùng CALCULATED. Không khẳng định đếm cả bản SUPERSEDED vì service tính toán có đánh dấu trạng thái này.

Nguồn: [CarbonReportService.java](../backend/carbon-service/src/main/java/com/ccadro/carbon/service/CarbonReportService.java#L34).

**Khắc phục:** chọn phạm vi và loại dữ liệu, kiểm trường bắt buộc, xuất file thật, tính hash trên file đó, lưu actor từ principal và lịch sử xuất. Đây là UC Must theo BRD; bản ghi export không đủ để coi UC14 hoàn thành.

### A13 — P1: KYC và hạn mức chưa có đủ quy trình phê duyệt

UI/CompanyService mặc định KYC VERIFIED; UI thêm doanh nghiệp mặc định hạn mức 100 triệu. Chưa thấy tài liệu xác minh, queue duyệt, reviewer/lý do hoặc version hạn mức trong luồng quản trị đã đọc. Đây là khoảng trống cho phần mở rộng B2B, không coi là yêu cầu độc lập đã có sẵn trong BRD gốc.

**Khắc phục:** doanh nghiệp mới ở DRAFT/PENDING, hạn mức theo chính sách phê duyệt; ghi bằng chứng, người duyệt và thời điểm. Phân biệt cập nhật hồ sơ với quyết định cấp tín dụng; chỉ cho dùng hạn mức đã duyệt trong luồng hợp đồng/thanh toán.

### A14 — P1/P2 theo phạm vi thiết bị: mobile bị sidebar chiếm hết vùng làm việc

Ở 390×844, sidebar vẫn rộng 264px; tiêu đề và các tab bị dồn thành cột hẹp, header bị cắt. Không phát hiện overflow toàn document không có nghĩa bố cục dùng được. Ảnh: [mobile Users](ui-review/admin/11-mobile-users.png). Source: [index.css](../frontend/src/index.css#L192).

**Khắc phục:** breakpoint chuyển sidebar thành drawer, mặc định đóng; nội dung full width, header rút gọn action, bảng scroll trong vùng riêng hoặc dạng card. Nếu sản phẩm chỉ hỗ trợ admin desktop, công bố rõ phạm vi và vẫn tránh bố cục vỡ trên thiết bị nhỏ.

### A15 — P2: nhãn chức năng chưa đúng đối tượng và thuật ngữ nghiệp vụ

Checklist gắn UC01 thay vì UC03; dispatch gắn UC07 trong khi phân công điều vận thuộc UC06 và bắt đầu chuyến thuộc UC07. “Cổng xác thực IAM” vẫn hiện trong menu người đã đăng nhập. “Elastic search”, UC/BRULE, route path và nhiều tên kỹ thuật được đưa vào nội dung người dùng; tìm kiếm hiện là thuật toán fuzzy local/Java, không phải bằng chứng tích hợp Elasticsearch.

**Khắc phục:** dùng nhãn ngắn “Tài khoản”, “Doanh nghiệp”, “Kiểm tra trước chuyến”, “Thẩm định sự cố”, “Báo cáo phát thải”. Chuyển mã UC/rule sang trợ giúp nội bộ khi cần; nút Cổng xác thực đổi thành Bảo mật/Phiên hoặc chỉ giữ Đăng xuất.

## 5. Cấu trúc thông tin đề xuất

Không buộc ADMIN trực tiếp làm mọi vai trò. ADMIN quản trị quyền/chính sách và xem toàn cục; Dispatcher xử lý điều phối, Safety xử lý thẩm định, ESG xử lý phát thải. Có thể cho ADMIN can thiệp theo quyền, nhưng giao diện phải giữ ranh giới và lưu actor/lý do.

| Nhóm menu | Màn hình chính | Nội dung và cách vào |
|---|---|---|
| Tổng quan | Dashboard quản trị | KPI có nguồn, công việc cần duyệt, cảnh báo dữ liệu; click KPI vào danh sách đã lọc |
| Tài khoản & bảo mật | Người dùng; Vai trò & quyền; Phiên; Nhật ký | Tìm user → chi tiết → thay đổi → xác nhận → lịch sử; tạo user bằng drawer/modal riêng |
| Doanh nghiệp & đối tác | Hồ sơ; KYC; Hạn mức; Phân công Hub | Hồ sơ công ty tách khỏi dữ liệu quyền cá nhân; duyệt là action riêng |
| Hạm đội | Xe; Tài xế; Container; Bảo trì; Ca trực | Master data và readiness; checklist đi từ xe/chuyến được phân công |
| Vận hành | Vận đơn; Hàng đợi điều phối; Chuyến đang chạy | Danh sách → bản ghi → lập tuyến/điều phối; không dùng ID demo trong sidebar |
| An toàn & ngoại lệ | Incident; Chờ thẩm định; Điểm vi phạm/chờ duyệt | Phân quyền reviewer, evidence, lịch sử; không tự động kỷ luật |
| Carbon & báo cáo | Tính toán; Đối chuẩn; Xuất báo cáo | Tách estimate/actual, lineage và bộ lọc kỳ/customer; tải file thật |
| Cấu hình | Chính sách hệ thống | Version, audit, phạm vi, người phê duyệt; tách hoàn toàn khỏi theme/tùy chọn cá nhân |

Eureka và giám sát hạ tầng tiếp tục ở công cụ vận hành riêng, phù hợp yêu cầu trước đó; không đưa danh sách microservice/port/code vào dashboard nghiệp vụ.

Trang User nên ưu tiên danh sách toàn chiều rộng, có search/filter/pagination; tạo mới mở drawer. Hồ sơ cá nhân, vai trò, doanh nghiệp và lịch sử thành tab trong chi tiết. Nút khóa/xóa/reset cần lý do/xác nhận theo chính sách; xóa mềm và khôi phục nên có trạng thái tải, kết quả thật, không mất ngữ cảnh tìm kiếm.

## 6. Thứ tự khắc phục và điều kiện nghiệm thu

| Đợt | Việc thực hiện | Điều kiện hoàn thành |
|---|---|---|
| 1 — Khôi phục độ tin cậy | A01–A05: lỗi giả thành công, hai nguồn IAM, backend authorization, đúng bản Gateway, quyền có hiệu lực | Browser thường đăng nhập được; HTTP 4xx/5xx không tạo trạng thái thành công; user tạo tại browser A đăng nhập tại B; CUSTOMER bị chặn đúng cả danh sách/chi tiết/mutation; quyền đổi có hiệu lực server |
| 2 — Hoàn thiện luồng Must | UC01–03, điều hướng contextual, UC14, dashboard có nguồn | Quản trị được asset/bảo trì; checklist đúng trường và đúng chuyến; xe chưa đủ điều kiện bị server chặn; menu không trỏ ID cố định; tải file carbon thật và kiểm hash |
| 3 — Chuẩn hóa quản trị mở rộng | Incident review/UC18 theo Phase 2, UC15, KYC/hạn mức, audit và cấu hình thật | Có queue duyệt, actor/reason/history; policy thay đổi có version và hiệu lực; không tự blacklist; trạng thái của các client thống nhất |
| 4 — Tối ưu trình bày | Sidebar, layout danh sách/chi tiết, mobile, nhãn | User tìm đúng chức năng không vòng về trang trùng; desktop 1280/1440 và mobile 390 không mất nội dung; có empty/loading/error/permission state riêng |

Các ca cần có trước khi xác nhận đủ: tạo/sửa/khóa/xóa/restore và lỗi mạng; quyền role/override; user không có seed vẫn đăng nhập; response rỗng xóa dữ liệu cũ; hành vi sau refresh và ở browser khác; audit ghi actor đúng; báo cáo đúng scope và không gộp estimate/actual; tài sản đang chạy không bị vô hiệu hóa; biểu mẫu mobile thao tác được.

## 7. Nguồn tham khảo ngoài project

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): xác thực không đồng nghĩa được phép làm mọi việc; nên mặc định từ chối và kiểm quyền trên từng request. Hỗ trợ đề xuất A03/A05.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): cần xác định sự kiện và dữ liệu audit phù hợp cho hoạt động bảo mật/quản trị. Hỗ trợ đề xuất nhật ký ở A06/A09; không coi browser localStorage là audit tập trung.
- [W3C — Consistent Navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html): điều hướng lặp lại cần giữ thứ tự tương đối nhất quán. Việc đề xuất nhóm menu theo nhiệm vụ là phân tích UX từ project, không phải kết luận đã kiểm toàn bộ WCAG.

Đây là báo cáo đánh giá, chưa chỉnh sửa mã nguồn sản phẩm hoặc triển khai các giải pháp đề xuất.
