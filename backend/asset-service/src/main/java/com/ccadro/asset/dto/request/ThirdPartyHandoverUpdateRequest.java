package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ThirdPartyHandoverUpdateRequest {

    @NotBlank(message = "handoverStatus must not be blank")
    String handoverStatus;

    String dockGate;
    String epodSignedBy;
    String epodSignatureHash;
    String externalSystemName;
}

