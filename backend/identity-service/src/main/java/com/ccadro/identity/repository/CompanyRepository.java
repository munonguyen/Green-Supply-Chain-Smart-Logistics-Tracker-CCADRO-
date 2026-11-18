package com.ccadro.identity.repository;

import com.ccadro.identity.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {
    Optional<Company> findByCompanyCodeIgnoreCase(String companyCode);
    Optional<Company> findByTaxCode(String taxCode);
    boolean existsByCompanyCodeIgnoreCase(String companyCode);
    boolean existsByTaxCode(String taxCode);
}

