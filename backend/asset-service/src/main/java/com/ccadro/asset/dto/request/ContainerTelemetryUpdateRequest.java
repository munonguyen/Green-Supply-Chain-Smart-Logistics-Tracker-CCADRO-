package com.ccadro.asset.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerTelemetryUpdateRequest {
    BigDecimal lastLatitude;
    BigDecimal lastLongitude;
    String lastLocationName;
    BigDecimal progressPct;
    BigDecimal speedKmh;
    Integer etaMinutes;
    BigDecimal supplyAirTempC;
    BigDecimal returnAirTempC;
    BigDecimal humidityPct;
    BigDecimal shockG;
    BigDecimal solarPowerWatts;
    Integer batteryPct;
    String eSealStatus;
    Integer eSealIntegrityPct;
}

