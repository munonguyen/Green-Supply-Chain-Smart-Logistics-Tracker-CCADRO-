package com.ccadro.tracking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeviationAlertResolveRequest {
    @NotBlank(message = "resolutionNotes must not be blank")
    String resolutionNotes;
    String resolvedBy;
}

