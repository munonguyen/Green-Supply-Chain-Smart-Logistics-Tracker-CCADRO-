package com.ccadro.carbon.service;

import com.ccadro.carbon.entity.CarbonReportExport;
import com.ccadro.carbon.entity.EmissionCalculation;
import com.ccadro.carbon.repository.CarbonReportExportRepository;
import com.ccadro.carbon.repository.EmissionCalculationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Kết xuất báo cáo kiểm toán phát thải ESG kèm mã băm SHA-256 chống chỉnh sửa (UC14).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CarbonReportService {

    CarbonReportExportRepository carbonReportExportRepository;
    EmissionCalculationRepository emissionCalculationRepository;

    @Transactional
    public CarbonReportExport exportAuditReport(String reportName, String exportFormat, String exportedBy) {
        List<EmissionCalculation> activeCalcs = emissionCalculationRepository.findAll().stream()
                .filter(c -> "CALCULATED".equalsIgnoreCase(c.getCalculationStatus()))
                .toList();

        BigDecimal totalCo2 = activeCalcs.stream()
                .map(EmissionCalculation::getTotalCo2eKg)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String payloadToHash = reportName + "|" + activeCalcs.size() + "|" + totalCo2 + "|" + Instant.now();

        CarbonReportExport export = new CarbonReportExport();
        export.setReportName(reportName != null && !reportName.isBlank()
                ? reportName
                : "CCADRO-ESG-GLEC-V3-AUDIT-REPORT");
        export.setExportFormat(exportFormat != null && !exportFormat.isBlank() ? exportFormat.toUpperCase() : "CSV");
        export.setFilterParamsJson("{\"status\":\"CALCULATED\",\"standard\":\"GLEC_V3_ISO_14083\"}");
        export.setTotalShipmentsCount(activeCalcs.size());
        export.setTotalCo2eKg(totalCo2);
        export.setFileHash(sha256Hex(payloadToHash));
        export.setExportedBy(exportedBy != null && !exportedBy.isBlank() ? exportedBy : "SUSTAINABILITY_MANAGER");
        export.setExportedAt(Instant.now());

        return carbonReportExportRepository.save(export);
    }

    public List<CarbonReportExport> getAllReportExports() {
        return carbonReportExportRepository.findAll();
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encoded.length);
            for (byte b : encoded) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}

