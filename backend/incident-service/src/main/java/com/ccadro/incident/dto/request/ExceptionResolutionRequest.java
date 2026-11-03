package com.ccadro.incident.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExceptionResolutionRequest {

    @NotBlank(message = "reviewedBy must not be blank")
    String reviewedBy;

    /**
     * Decisions per UC17:
     * - APPROVED_TRIGGER_REROUTE: Sự cố khách quan (kẹt xe, cấm đường, ngập nước) -> kích hoạt UC10 đổi tuyến
     * - APPROVED_EXCUSED: Sự cố bất khả kháng được miễn trừ trách nhiệm
     * - REJECTED: Bác bỏ báo cáo không hợp lệ
     * - ESCALATE_TO_DEMERIT: Lỗi chủ quan của tài xế -> chuyển sang ghi nhận điểm phạt UC18 (BRULE-17)
     */
    @NotBlank(message = "decision must not be blank")
    String decision;

    String reviewNotes;

    @Min(value = 1, message = "demeritPoints must be between 1 and 10")
    @Max(value = 10, message = "demeritPoints must be between 1 and 10")
    Integer demeritPoints;

    String violationCategory;
}

