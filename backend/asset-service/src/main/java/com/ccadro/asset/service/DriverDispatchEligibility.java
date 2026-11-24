package com.ccadro.asset.service;

import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverDispatchEligibility {
    private final JdbcTemplate jdbc;

    public record Assessment(UUID id, String driverCode, String fullName, String status, String employeeCode,
                             String verificationStatus, String licenseClass, String maskedLicense,
                             LocalDate licenseIssueDate, LocalDate licenseExpiryDate, boolean healthCheckPassed,
                             boolean safetyTrainingCertified, Integer hosContinuousMin, Integer hosDailyMin,
                             boolean eligible, String qualificationIssue, List<String> reasons) {}

    public List<Assessment> list() {
        return load(null);
    }

    public Assessment get(UUID driverId) {
        return load(driverId).stream().findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
    }

    public Assessment requireAvailable(UUID driverId) {
        Assessment assessment = get(driverId);
        if (!assessment.eligible()) {
            throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE, String.join(" · ", assessment.reasons()));
        }
        return assessment;
    }

    private List<Assessment> load(UUID driverId) {
        String sql = "SELECT * FROM driver_dispatch_qualification";
        return jdbc.query(sql + (driverId == null ? " ORDER BY driver_code" : " WHERE driver_id = ?"),
                (row, index) -> {
                    List<String> reasons = new ArrayList<>();
                    String status = row.getString("driver_status");
                    if (!"AVAILABLE".equals(status)) reasons.add("Tài xế đang bận hoặc chưa sẵn sàng");
                    String issue = row.getString("qualification_issue");
                    if (issue != null) reasons.add(issue);
                    return new Assessment(row.getObject("driver_id", UUID.class), row.getString("driver_code"),
                            row.getString("full_name"), status, row.getString("employee_code"),
                            row.getString("verification_status"), row.getString("license_class"),
                            row.getString("masked_license"), row.getObject("license_issue_date", LocalDate.class),
                            row.getObject("license_expiry_date", LocalDate.class), row.getBoolean("health_check_passed"),
                            row.getBoolean("safety_training_certified"), row.getObject("hos_continuous_min", Integer.class),
                            row.getObject("hos_daily_min", Integer.class), reasons.isEmpty(), issue, List.copyOf(reasons));
                }, driverId == null ? new Object[0] : new Object[]{driverId});
    }
}
