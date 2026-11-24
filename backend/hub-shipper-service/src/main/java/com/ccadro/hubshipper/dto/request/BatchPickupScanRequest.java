package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BatchPickupScanRequest {
    @NotEmpty(message = "Danh sách mã kiện quét nhận xuất trạm không được để trống")
    List<String> itemCodes;

    String packageCondition;
}

