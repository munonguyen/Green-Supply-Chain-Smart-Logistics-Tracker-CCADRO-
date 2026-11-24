package com.ccadro.asset.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContainerControlRoundRequest {
    @NotNull @Min(0)
    private Integer expectedRoundNumber;
}
