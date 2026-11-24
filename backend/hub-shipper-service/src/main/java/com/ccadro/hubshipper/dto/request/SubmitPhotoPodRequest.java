package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubmitPhotoPodRequest {
    @NotBlank(message = "Trạng thái giao nhận không được để trống")
    String dispatchStatus;

    String proofImageUrl;

    String proofImageCaption;

    String recipientPodName;

    String handoverMethod;

    Double measuredTempC;

    /**
     * COLLECTED_CASH or COLLECTED_QR (when codAmountVnd > 0)
     */
    String codCollectionMethod;

    String recipientOtpInput;

    String podSignatureNote;
}

