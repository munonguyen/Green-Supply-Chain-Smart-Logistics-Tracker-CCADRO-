package com.ccadro.incident.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {

    // 1000 - 1099: System & Auth
    SUCCESS(1000, "Thao tác thành công", HttpStatus.OK),
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi hệ thống chưa được phân loại", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Khoá hoặc tham số không hợp lệ", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1002, "Chưa xác thực người dùng", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1003, "Bạn không có quyền thực hiện thao tác này", HttpStatus.FORBIDDEN),
    INVALID_REQUEST_ARGUMENT(1004, "Dữ liệu yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),

    // 1100 - 1999: Asset Module
    VEHICLE_NOT_FOUND(1101, "Không tìm thấy phương tiện vận tải", HttpStatus.NOT_FOUND),
    VEHICLE_ALREADY_EXISTS(1102, "Biển số xe đã tồn tại trong hệ thống", HttpStatus.CONFLICT),
    VEHICLE_MAINTENANCE_REQUIRED(1103, "Phương tiện đang đến hạn bảo dưỡng, không đủ điều kiện xuất bến", HttpStatus.BAD_REQUEST),
    DRIVER_NOT_FOUND(1104, "Không tìm thấy tài xế", HttpStatus.NOT_FOUND),
    DRIVER_LICENSE_INVALID(1105, "Giấy phép lái xe hết hạn hoặc không phù hợp tải trọng", HttpStatus.BAD_REQUEST),
    DRIVER_NOT_AVAILABLE(1106, "Tài xế đang bận chuyến khác hoặc nghỉ phép", HttpStatus.BAD_REQUEST),
    CONTAINER_NOT_FOUND(1107, "Không tìm thấy container", HttpStatus.NOT_FOUND),
    PRE_TRIP_INSPECTION_FAILED(1108, "Kiểm tra an toàn tiền xuất bến (Pre-trip Inspection) không đạt", HttpStatus.UNPROCESSABLE_ENTITY),

    // 2100 - 2999: Shipment Module
    SHIPMENT_NOT_FOUND(2101, "Không tìm thấy đơn vận tải", HttpStatus.NOT_FOUND),
    SHIPMENT_CODE_EXISTS(2102, "Mã đơn hàng vận tải đã tồn tại", HttpStatus.CONFLICT),
    SHIPMENT_ALREADY_DISPATCHED(2103, "Đơn vận tải đã được điều vận xuất bến", HttpStatus.BAD_REQUEST),
    INVALID_CARGO_WEIGHT(2104, "Khối lượng hàng hoá vượt quá tải trọng xe", HttpStatus.BAD_REQUEST),
    DISPATCH_ORDER_NOT_FOUND(2105, "Lệnh điều phối không tồn tại", HttpStatus.NOT_FOUND),

    // 3100 - 3999: Routing Module
    ROUTE_NOT_FOUND(3101, "Không tìm thấy lộ trình tính toán", HttpStatus.NOT_FOUND),
    ROUTING_PROVIDER_FAILED(3102, "Lỗi kết nối nhà cung cấp bản đồ và tính lộ trình (OSRM/GraphHopper)", HttpStatus.SERVICE_UNAVAILABLE),
    REROUTE_BENEFIT_INSUFFICIENT(3103, "Phương án đổi lộ trình không đạt ngưỡng tối thiểu 10% cải thiện", HttpStatus.BAD_REQUEST),
    ROUTE_VERSION_CONFLICT(3104, "Xung đột phiên bản lộ trình đang hoạt động", HttpStatus.CONFLICT),

    // 4100 - 4999: Tracking Module
    TRIP_NOT_FOUND(4101, "Không tìm thấy chuyến xe đang vận hành", HttpStatus.NOT_FOUND),
    TELEMETRY_INGESTION_FAILED(4102, "Dữ liệu toạ độ GPS viễn thông không hợp lệ", HttpStatus.BAD_REQUEST),
    DEVIATION_BUFFER_BREACHED(4103, "Xe bị lệch ngoài hành lang đệm an toàn (Deviation Buffer)", HttpStatus.CONFLICT),
    TRIP_ALREADY_COMPLETED(4104, "Chuyến xe đã kết thúc hành trình", HttpStatus.BAD_REQUEST),

    // 5100 - 5999: Carbon Module
    EMISSION_CALCULATION_FAILED(5101, "Lỗi tính toán phát thải theo chuẩn GLEC v3", HttpStatus.INTERNAL_SERVER_ERROR),
    EMISSION_FACTOR_NOT_FOUND(5102, "Không tìm thấy hệ số phát thải phù hợp loại phương tiện/nhiên liệu", HttpStatus.NOT_FOUND),
    CORRIDOR_BENCHMARK_NOT_FOUND(5103, "Không tìm thấy chuẩn phát thải hành lang vận tải (Freight Corridor Benchmark)", HttpStatus.NOT_FOUND),
    POD_ALREADY_SUBMITTED(5104, "Biên bản giao hàng điện tử (ePOD) đã được xác nhận", HttpStatus.CONFLICT),

    // 6100 - 6999: Incident Module
    FIELD_INCIDENT_NOT_FOUND(6101, "Không tìm thấy biên bản sự cố hiện trường", HttpStatus.NOT_FOUND),
    DEMERIT_RECORD_NOT_FOUND(6102, "Không tìm thấy biên bản trừ điểm tài xế", HttpStatus.NOT_FOUND),
    RESOLUTION_ALREADY_CLOSED(6103, "Khiếu nại/sự cố đã được giải quyết và đóng hồ sơ", HttpStatus.BAD_REQUEST);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
