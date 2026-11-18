package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManifestItemStatusUpdateRequest {
    @NotBlank(message = "Trạng thái điều phối không được để trống")
    String dispatchStatus;

    String recipientPodName;
}

