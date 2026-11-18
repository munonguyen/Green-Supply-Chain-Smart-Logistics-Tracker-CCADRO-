# Chat Service

Spring Boot REST + Socket.IO service `8090` (Socket.IO listener mặc định `8091`), lưu hội thoại, tin nhắn và phiên socket trong MongoDB. API được Gateway định tuyến qua `/api/v1/chat/**`; danh tính được xác minh lại với Identity Service. GPS và các domain khác tiếp tục dùng kho riêng của chúng.

## Cấu trúc source

```text
src/main/java/com/ccadro/chat/
├── ChatServiceApplication.java
├── client/
│   └── IdentityClient.java                 # HTTP introspection và danh bạ Identity
├── configuration/
│   ├── ChatMongoConfiguration.java         # Mongo connection timeouts
│   ├── ChatSocketIoConfiguration.java      # Socket.IO endpoint và origin
│   ├── ChatWebConfiguration.java           # Đăng ký interceptor
│   └── IdentityClientConfiguration.java    # RestClient URL và HTTP timeouts
├── controller/
│   └── ChatController.java                 # Mapping endpoint, validation, ApiResponse
├── dto/
│   ├── ApiResponse.java                    # Giữ contract code/result
│   ├── ChatActor.java                      # Danh tính request đã được xác thực
│   ├── request/                            # Mỗi request là một file riêng
│   └── response/                           # Response API tách khỏi entity Mongo
├── entity/
│   ├── Conversation.java
│   ├── Message.java
│   ├── Preference.java
│   └── ChatSocketSession.java              # Phiên Socket.IO đang hoạt động
├── event/ChatChangedEvent.java             # Invalidation sau khi ghi Mongo thành công
├── exception/
│   ├── AppException.java
│   ├── ErrorCode.java
│   └── GlobalExceptionHandler.java
├── mapper/
│   └── ChatMapper.java                     # MapStruct: entity → response DTO
├── repository/
│   ├── ConversationRepository.java
│   ├── MessageRepository.java
│   ├── PreferenceRepository.java
│   └── ChatSocketSessionRepository.java
├── security/
│   └── ChatAuthenticationInterceptor.java
├── service/
│   ├── ChatAuthenticationService.java
│   ├── ChatTicketService.java              # Vé 30 giây, consume nguyên tử
│   ├── ChatDirectoryService.java
│   ├── ConversationService.java
│   ├── MessageService.java
│   └── PreferenceService.java
├── websocket/
│   └── ChatSocketSessions.java              # Consume ticket, session, fan-out thành viên, heartbeat
└── util/
    ├── ChatIdentifiers.java                # Hash định danh/idempotency
    └── MessageCursor.java                  # Encode/decode cursor lịch sử

src/test/java/com/ccadro/chat/
├── integration/ChatIntegrationTest.java    # HTTP + MongoDB thật + Identity HTTP stub
└── service/
    ├── ChatAuthenticationServiceTest.java
    ├── ChatTicketServiceTest.java
    └── MessageServiceTest.java
```

## Ranh giới trách nhiệm

- Controller chỉ nhận request và trả response có kiểu cụ thể. Không có entity lồng/DTO lồng hoặc truy vấn DB trong controller.
- Service xử lý quy tắc domain và quyền truy cập. `ConversationService.requireMember` là điểm kiểm tra thành viên dùng chung cho tin nhắn, read, reaction và preferences.
- Repository tập trung MongoTemplate/query/update/index access. Repository không gọi Identity hoặc phụ thuộc controller/service/HTTP DTO.
- Client chỉ giao tiếp HTTP với Identity. Service xác thực quyết định có chấp nhận token hay không; interceptor gắn `chatActor` lên request. Token không lấy từ `X-Auth-*` do client gửi.
- Mapper là interface MapStruct; Maven sinh `ChatMapperImpl`, Spring inject vào service. Mapper giữ API tách khỏi model lưu trữ. Entity có thể đổi cách triển khai mà không tự làm thay đổi JSON response.
- Exception handler giữ nguyên HTTP status/message đang dùng; lỗi Mongo và xung đột membership có log không chứa nội dung chat hay token. `ChatActor.toString()` che authorization để tránh vô tình lộ Bearer khi debug/log object.

## Đặt breakpoint khi debug

| Tình huống | Điểm bắt đầu | Theo tiếp |
|---|---|---|
| 401 / không đăng nhập được chat | `ChatAuthenticationInterceptor.preHandle` | `ChatAuthenticationService.authenticate` → `IdentityClient.introspect` |
| Danh bạ trống / 503 Identity | `ChatDirectoryService.contacts` | `IdentityClient.directory`, URL/timeout trong configuration |
| Người ngoài đọc được hoặc member bị 404 | `ConversationService.requireMember` | `ConversationRepository.findByIdAndMember` |
| Gửi tin lỗi / retry trùng | `MessageService.send` | `ChatIdentifiers.hash` → `MessageRepository.insert/findById` |
| Lịch sử thiếu / sai thứ tự | `MessageService.list` | `MessageCursor.decode` → `MessageRepository.findPage` |
| Đọc/reaction không lưu | `MessageService.markRead/react` | `MessageRepository.markReadThrough/updateReaction` |
| Mời thành viên ghi đè | `ConversationService.addMembers` | `ConversationRepository.save` và entity `@Version` |
| Pin/mute không đúng tài khoản | `PreferenceService.update` | `PreferenceRepository.upsert` |
| Không kết nối / socket 401 | `ChatSocketIoConfiguration` / `ChatSocketSessions.connected` | `ChatTicketService.consume` → `ChatAuthenticationService.authenticate`, origin allow-list |
| Tin realtime không tới | `MessageService` | Mongo write → `ChatChangedEvent` → `ChatSocketSessions.changed` → session Mongo/member fan-out |
| Response sai trường | `ChatMapper` | DTO tương ứng trong `dto/response` |

Trong IDE, debug `ChatServiceApplication` với `CHAT_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat` nếu Mongo local dùng cổng 27018; Identity cần đang chạy trên URL `IDENTITY_SERVICE_URL`. Không bật log request body để tìm lỗi token.

## Tương thích dữ liệu/API khi refactor

Collection `conversations`, `messages`, `preferences`, các field, index, ID và contract API được giữ nguyên. `@TypeAlias` dùng chuỗi `_class` của các entity lồng cũ (`ChatDocuments$...`) để đọc/ghi document cũ mà không cần migration. Không tạo collection mới và không chuyển dữ liệu vào PostgreSQL.

Kiểm thử tích hợp đưa raw document với `_class` cũ vào Mongo, đọc qua API, cập nhật membership có version rồi ghi tin mới và kiểm tra discriminator/index. Vì alias trông giống tên class cũ nên không xóa hoặc đổi nó chỉ để đồng bộ tên package mới.

## Kiểm thử và build

```bash
# Từ root repository: unit tests luôn chạy; integration cần biến này.
CHAT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat_refactor \
  mvn -f backend/chat-service/pom.xml clean verify
```

Integration dùng database tên ngẫu nhiên, không sửa database chat nghiệp vụ. Không có `CHAT_TEST_MONGODB_URI` thì integration bị skip, các unit tests vẫn chạy.

[Hướng dẫn chạy, API và cutover dữ liệu cũ](../../docs/CHAT_SERVICE_MONGODB.md).
