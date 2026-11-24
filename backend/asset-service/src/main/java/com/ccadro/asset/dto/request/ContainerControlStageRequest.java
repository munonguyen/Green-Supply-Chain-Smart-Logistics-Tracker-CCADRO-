package com.ccadro.asset.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContainerControlStageRequest {
    @NotNull @Min(1)
    private Integer roundNumber;
    @NotEmpty @Size(max = 20)
    private List<@NotBlank String> checkedKeys;
    @Size(max = 2000)
    private String notes;
}
