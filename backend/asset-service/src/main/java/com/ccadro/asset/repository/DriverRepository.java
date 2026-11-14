package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverRepository extends JpaRepository<Driver, UUID> {
    Optional<Driver> findByDriverCode(String driverCode);
    Optional<Driver> findByPhone(String phone);
    Optional<Driver> findByFullNameIgnoreCase(String fullName);
    List<Driver> findByStatus(DriverStatus status);
    List<Driver> findByLicenseClassIgnoreCase(String licenseClass);
    List<Driver> findByStatusAndLicenseClassIgnoreCase(DriverStatus status, String licenseClass);
}
