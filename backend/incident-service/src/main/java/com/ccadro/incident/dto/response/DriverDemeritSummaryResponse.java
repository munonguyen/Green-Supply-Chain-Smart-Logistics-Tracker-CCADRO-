package com.ccadro.incident.dto.response;

import com.ccadro.incident.entity.DemeritRecord;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverDemeritSummaryResponse {
    UUID driverId;
    int totalActivePoints;
    int warningThreshold;
    int reviewRequiredThreshold;
    String governanceStatus; // GOOD_STANDING, WARNING, REVIEW_REQUIRED, BLACKLISTED, SUSPENDED
    List<DemeritRecord> records;
}

