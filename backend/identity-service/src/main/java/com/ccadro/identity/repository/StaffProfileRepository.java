package com.ccadro.identity.repository;

import com.ccadro.identity.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, UUID> {
    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    Optional<StaffProfile> findByEmployeeCodeIgnoreCase(String employeeCode);

    List<StaffProfile> findByBranchId(UUID branchId);

    List<StaffProfile> findByRoleCodeIgnoreCase(String roleCode);
}
