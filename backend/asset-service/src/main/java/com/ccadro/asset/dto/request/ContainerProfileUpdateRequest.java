package com.ccadro.asset.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContainerProfileUpdateRequest {
    @Size(max = 100) String ownerName;
    @Size(max = 10) String isoType;
    @Size(max = 100) String telematicsModel;
    @Size(max = 50) String sealNumber;
    java.util.UUID responsibleCompanyId;
    @NotNull Map<String, String> previousValues;
    @NotBlank @Size(max = 500) String reason;
}
