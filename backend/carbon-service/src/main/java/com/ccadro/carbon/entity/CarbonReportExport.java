package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carbon_report_export")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CarbonReportExport {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "report_name", nullable = false, length = 200)
    String reportName;

    @Column(name = "export_format", nullable = false, length = 20)
    String exportFormat = "CSV";

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "filter_params_json", columnDefinition = "jsonb")
    String filterParamsJson;

    @Column(name = "total_shipments_count", nullable = false)
    Integer totalShipmentsCount = 0;

    @Column(name = "total_co2e_kg", nullable = false, precision = 14, scale = 4)
    BigDecimal totalCo2eKg = BigDecimal.ZERO;

    @Column(name = "file_hash", length = 128)
    String fileHash;

    @Column(name = "exported_by", nullable = false, length = 100)
    String exportedBy = "SYSTEM";

    @Column(name = "exported_at", nullable = false)
    Instant exportedAt = Instant.now();
}
