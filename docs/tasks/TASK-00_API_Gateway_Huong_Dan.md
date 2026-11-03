# Cổng API Gateway: Cầu Nối Từ Môi Trường Bên Ngoài Vào Hệ Thống (Port 8888)
> **Vị trí thư mục:** `backend/api-gateway` (Nằm trực tiếp trong phân hệ Backend - Chuẩn BookShop)  
> **Port:** `8888`  
> **Trách nhiệm:** Điểm tiếp nhận duy nhất (Single Point of Entry) kết nối Frontend Web, Mobile App và Thiết bị GPS vào hệ thống nội bộ.

---

## 🌐 1. Kiến Trúc Cổng Điều Hướng API Gateway (Chuẩn BookShop)

```mermaid
flowchart TD
    subgraph Clients["Khách Hàng & Thiết Bị Ngoại Vi"]
        Web["Web Portal React (Port 5173)"]
        Mobile["Mobile App Tài Xế"]
        IoT["GPS Simulator / IoT Box"]
    end

    subgraph Edge["backend/api-gateway (Port 8888)"]
        Gateway["Spring Cloud Gateway
        ├── WebClientConfiguration (CorsWebFilter + IdentityClient)
        ├── AuthenticationFilter (GlobalFilter, Ordered)
        ├── IdentityService (Gọi /auth/introspect)
        └── IdentityClient (@PostExchange)"]
    end

    subgraph Microservices["Microservices Độc Lập"]
        Auth["identity-service (Port 8080): /api/v1/auth/**, /health"]
        Asset["asset-service (Port 8081): /api/v1/assets/**"]
        Shipment["shipment-service (Port 8082): /api/v1/shipments/**"]
        Routing["routing-service (Port 8083): /api/v1/routing/**"]
        Tracking["tracking-service (Port 8084): /api/v1/tracking/**"]
        Carbon["carbon-service (Port 8085): /api/v1/carbon/**"]
        Incident["incident-service (Port 8086): /api/v1/incidents/**"]
    end

    Web -->|HTTP Port 8888| Gateway
    Mobile -->|HTTP Port 8888| Gateway
    IoT -->|HTTP Port 8888| Gateway

    Gateway -.->|1. Xác thực Token| Auth
    Gateway -->|2. Proxy: 8081| Asset
    Gateway -->|2. Proxy: 8082| Shipment
    Gateway -->|2. Proxy: 8083| Routing
    Gateway -->|2. Proxy: 8084| Tracking
    Gateway -->|2. Proxy: 8085| Carbon
    Gateway -->|2. Proxy: 8086| Incident
```

---

## 📂 2. Cấu Trúc Thư Mục Của `backend/api-gateway/`

Được thiết kế đồng nhất 100% theo mẫu **BookShop**:
```text
backend/api-gateway/
├── pom.xml                                     # Spring Cloud Gateway (2023.0.3)
└── src/
    └── main/
        ├── resources/
        │   └── application.yaml                # Định tuyến Routes & app.api-prefix
        └── java/com/ccadro/gateway/
            ├── ApiGatewayApplication.java      # Main entry point (Port 8888)
            ├── configuration/
            │   ├── WebClientConfiguration.java # CorsWebFilter & IdentityClient Proxy
            │   └── AuthenticationFilter.java   # GlobalFilter kiểm tra JWT qua IdentityService
            ├── repository/
            │   └── IdentityClient.java         # @PostExchange gọi /auth/introspect
            ├── service/
            │   └── IdentityService.java        # Xử lý introspect token không đồng bộ
            └── dto/
                ├── ApiResponse.java            # Chuẩn vỏ bọc ApiResponse<T>
                ├── request/
                │   └── IntrospectRequest.java  # Token introspect payload
                └── response/
                    └── IntrospectResponse.java # boolean valid
```

---

## ⚙️ 3. Bảng Cấu Hình Routes Điều Hướng (Trong `application.yaml`)

Mọi yêu cầu gửi tới `http://localhost:8888` sẽ được Gateway chuyển tiếp tự động vào các dịch vụ bên dưới:

| Đường dẫn từ bên ngoài (Client Path) | Dịch vụ nội bộ xử lý | Mục đích nghiệp vụ |
| :--- | :--- | :--- |
| `http://localhost:8888/api/v1/auth/**` | `http://localhost:8080` | Đăng nhập, xác thực, introspect token |
| `http://localhost:8888/api/v1/assets/**` | `http://localhost:8080` | Quản lý đội xe, tài xế, kiểm tra Pre-trip |
| `http://localhost:8888/api/v1/shipments/**`| `http://localhost:8080` | Quản lý vận đơn, lệnh điều phối xuất bến |
| `http://localhost:8888/api/v1/routes/**` | `http://localhost:8080` | Lập lộ trình đa tiêu chí xanh (UC05) |
| `http://localhost:8888/api/v1/tracking/**` | `http://localhost:8080` | Luồng GPS, phát hiện lệch hành lang (UC09, UC10) |
| `http://localhost:8888/api/v1/carbon/**` | `http://localhost:8080` | Giao hàng ePOD, tính phát thải GLEC v3 (UC12, UC13)|
| `http://localhost:8888/api/v1/incidents/**`| `http://localhost:8080` | Biên bản sự cố, trừ điểm tài xế |
| `http://localhost:8888/api/v1/health` | `http://localhost:8080` | Kiểm tra trạng thái hệ thống (Public endpoint) |

---

## 🚀 4. Hướng Dẫn Khởi Động & Kiểm Thử

### Bước 1: Khởi động API Gateway (Từ thư mục `backend/api-gateway`)
```bash
cd backend/api-gateway
mvn spring-boot:run
```
*(Gateway sẽ lắng nghe tại cổng `8888`)*.

### Bước 2: Kiểm thử gọi qua Gateway
Thay vì gọi cổng `8080` trực tiếp, bạn gọi qua cổng `8888`:
```bash
# 1. Kiểm tra sức khỏe hệ thống (Public endpoint qua Gateway)
curl -i http://localhost:8888/api/v1/health

# 2. Thử gọi API cần xác thực khi chưa truyền Token -> Kỳ vọng: HTTP 401 Unauthenticated
curl -i http://localhost:8888/api/v1/assets/vehicles

# 3. Gọi kèm Bearer Token hợp lệ -> Gateway gọi introspect và cho phép đi tiếp
curl -i http://localhost:8888/api/v1/assets/vehicles \
  -H "Authorization: Bearer valid_jwt_token_sample"
```
