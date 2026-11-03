package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.CarbonReportExport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CarbonReportExportRepository extends JpaRepository<CarbonReportExport, UUID> {
}

