package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "container")
public class Container extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "container_code", nullable = false, unique = true, length = 50)
    String containerCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "container_type", nullable = false, length = 30)
    ContainerType containerType;

    @Column(name = "tare_weight_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal tareWeightTons;

    @Column(name = "max_payload_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal maxPayloadTons;

    @Column(name = "is_reefer", nullable = false)
    @Builder.Default
    Boolean isReefer = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    ContainerStatus status = ContainerStatus.AVAILABLE;
}
