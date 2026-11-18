package com.ccadro.identity.repository;

import com.ccadro.identity.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {
    Optional<JobApplication> findByApplicationCodeIgnoreCase(String applicationCode);

    List<JobApplication> findByEmailIgnoreCase(String email);

    List<JobApplication> findByNationalId(String nationalId);

    boolean existsByApplicationCodeIgnoreCase(String applicationCode);
}

