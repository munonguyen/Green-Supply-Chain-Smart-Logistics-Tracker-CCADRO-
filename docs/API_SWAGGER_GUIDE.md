# CCADRO OpenAPI / Swagger API Design Guide

Tài liệu hướng dẫn truy cập **Swagger UI tập trung qua API Gateway** và từng **Microservice riêng lẻ** để kiểm tra thiết kế API (Request/Response schema, Validation, Security JWT Bearer, Error codes).

---

## 1. Swagger Hub Tập Trung (Khuyên Dùng)

- **URL Swagger UI (API Gateway Edge `:8888`)**:
  - `http://localhost:8888/swagger-ui.html`
- Tính năng đã cấu hình trên `api-gateway`:
  - **Select a definition** dropdown chuyển nhanh qua **tất cả 11 microservice nghiệp vụ**.
  - `persistAuthorization: true`: giữ nguyên Bearer JWT token khi chuyển giữa các service để test `Try it out` liên hoàn.
  - `displayRequestDuration: true` & sắp xếp endpoint theo method/tag.

---

## 2. Danh Sách Spec (`/v3/api-docs`) & Port Từng Service

| STT | Service | Port | Gateway Spec URL (`:8888`) | Direct Swagger UI |
| :--- | :--- | :---: | :--- | :--- |
| 1 | `identity-service` | `8080` | `/services/identity/v3/api-docs` | `http://localhost:8080/swagger-ui.html` |
| 2 | `asset-service` | `8081` | `/services/assets/v3/api-docs` | `http://localhost:8081/swagger-ui.html` |
| 3 | `shipment-service` | `8082` | `/services/shipments/v3/api-docs` | `http://localhost:8082/swagger-ui.html` |
| 4 | `routing-service` | `8083` | `/services/routing/v3/api-docs` | `http://localhost:8083/swagger-ui.html` |
| 5 | `tracking-service` | `8084` | `/services/tracking/v3/api-docs` | `http://localhost:8084/swagger-ui.html` |
| 6 | `carbon-service` | `8085` | `/services/carbon/v3/api-docs` | `http://localhost:8085/swagger-ui.html` |
| 7 | `incident-service` | `8086` | `/services/incidents/v3/api-docs` | `http://localhost:8086/swagger-ui.html` |
| 8 | `notification-service` | `8087` | `/services/notifications/v3/api-docs` | `http://localhost:8087/swagger-ui.html` |
| 9 | `payment-service` | `8088` | `/services/payments/v3/api-docs` | `http://localhost:8088/swagger-ui.html` |
| 10 | `hub-shipper-service` | `8089` | `/services/hub-shipper/v3/api-docs` | `http://localhost:8089/swagger-ui.html` |
| 11 | `chat-service` | `8090` | `/services/chat/v3/api-docs` | `http://localhost:8090/swagger-ui.html` |

---

## 3. Cách Kiểm Tra & Test API Bằng Swagger UI

1. Khởi chạy hệ thống bằng `./scripts/dev-start.sh` (hoặc từng service Maven).
2. Mở `http://localhost:8888/swagger-ui.html`.
3. Kiểm tra các API công khai (không cần token):
   - Chọn **1. Identity Service** -> `Public Careers & Recruitment Portal`: `GET /api/v1/careers/openings`, `POST /api/v1/careers/apply`, `GET /api/v1/careers/status`.
   - `Authentication Management`: `POST /api/v1/auth/token` để lấy JWT (`result.token`).
4. Nhấn nút **Authorize** trên thanh công cụ Swagger -> dán JWT token vừa nhận -> **Authorize**.
5. Chuyển chọn bất kỳ service nào trong 11 service (ví dụ `Identity`, `Payment`, `Hub & Last-Mile`, `Chat`) với server mặc định `http://localhost:8888` và nhấn **Try it out**.

