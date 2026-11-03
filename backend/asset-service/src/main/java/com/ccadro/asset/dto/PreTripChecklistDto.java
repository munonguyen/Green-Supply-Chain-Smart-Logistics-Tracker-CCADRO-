package com.ccadro.asset.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PreTripChecklistDto {

    @JsonProperty("tires")
    String tires = "OK";

    @JsonProperty("brakes")
    String brakes = "OK";

    @JsonProperty("lights")
    String lights = "OK";

    @JsonProperty("fluids")
    String fluids = "OK";

    @JsonProperty("fire_extinguisher")
    String fireExtinguisher = "OK";

    @JsonProperty("cargo_securing")
    String cargoSecuring = "OK";

    public int countFailures() {
        int failures = 0;
        if (!"OK".equalsIgnoreCase(tires)) failures++;
        if (!"OK".equalsIgnoreCase(brakes)) failures++;
        if (!"OK".equalsIgnoreCase(lights)) failures++;
        if (!"OK".equalsIgnoreCase(fluids)) failures++;
        if (!"OK".equalsIgnoreCase(fireExtinguisher)) failures++;
        if (!"OK".equalsIgnoreCase(cargoSecuring)) failures++;
        return failures;
    }
}
