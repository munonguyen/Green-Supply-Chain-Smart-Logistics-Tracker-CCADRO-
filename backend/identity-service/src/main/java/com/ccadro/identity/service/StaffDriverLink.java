package com.ccadro.identity.service;

import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Links an approved driver dossier to a real Identity account and its Asset profile. */
@Component
@RequiredArgsConstructor
public class StaffDriverLink {
    private final JdbcTemplate jdbc;

    public void link(StaffProfile staff) {
        String account = staff.getUsername();
        if (account == null || account.isBlank()) throw invalid("Cần nhập tên đăng nhập của tài xế");
        var accounts = jdbc.query("""
                SELECT u.username FROM users u JOIN user_roles ur ON ur.user_id = u.id
                 WHERE lower(u.username) = lower(?) AND NOT u.is_deleted AND u.status = 'ACTIVE'
                   AND ur.role_name = 'DRIVER' FOR UPDATE OF u
                """, (row, index) -> row.getString(1), account);
        if (accounts.size() != 1) throw invalid("Cần tài khoản DRIVER đang hoạt động");
        String username = accounts.get(0);
        if (Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM staff_profiles
                   WHERE id <> ? AND lower(username) = lower(?) AND NOT is_deleted
                     AND status = 'ACTIVE' AND role_code = 'DRIVER')
                """, Boolean.class, staff.getId(), username))) {
            throw invalid("Tài khoản đang gắn với hồ sơ nhân sự tài xế khác");
        }
        var linked = jdbc.query("""
                SELECT driver_code FROM driver WHERE lower(account_username) = lower(?) AND NOT is_deleted
                """, (row, index) -> row.getString(1), username);
        if (linked.size() > 1) throw invalid("Tài khoản đang gắn với nhiều hồ sơ đội xe");
        if (!linked.isEmpty()) {
            synchronize(staff, username);
            return;
        }
        int result = jdbc.update("""
                INSERT INTO driver (driver_code, full_name, account_username, status)
                VALUES (?, ?, ?, 'AVAILABLE')
                ON CONFLICT (driver_code) DO UPDATE SET account_username = EXCLUDED.account_username
                   WHERE driver.account_username IS NULL AND NOT driver.is_deleted
                """, staff.getEmployeeCode(), staff.getFullName(), username);
        if (result != 1) throw invalid("Mã tài xế đang thuộc hồ sơ khác hoặc đã bị khóa");
        synchronize(staff, username);
    }

    private void synchronize(StaffProfile staff, String username) {
        jdbc.update("""
                UPDATE driver SET full_name = ?, license_class = ?, license_number = ?,
                    license_issue_date = ?, license_expiry_date = ?, date_of_birth = ?,
                    verified = true, updated_at = now()
                WHERE lower(account_username) = lower(?) AND NOT is_deleted
                """, staff.getFullName(), staff.getLicenseClass(), staff.getLicenseNumber(),
                staff.getLicenseIssueDate().toString(), staff.getLicenseExpiryDate().toString(),
                staff.getDateOfBirth().toString(), username);
    }

    private AppException invalid(String message) {
        return new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, message);
    }
}
