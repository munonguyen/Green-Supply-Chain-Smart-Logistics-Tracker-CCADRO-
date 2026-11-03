package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.ShiftStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "driver_shift")
public class DriverShift {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "vehicle_id", nullable = false)
    UUID vehicleId;

    @Column(name = "shift_start", nullable = false)
    Instant shiftStart;

    @Column(name = "shift_end", nullable = false)
    Instant shiftEnd;

    @Column(name = "actual_start")
    Instant actualStart;

    @Column(name = "actual_end")
    Instant actualEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    ShiftStatus status = ShiftStatus.SCHEDULED;

    @Column(name = "handover_notes", columnDefinition = "text")
    String handoverNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();
}
