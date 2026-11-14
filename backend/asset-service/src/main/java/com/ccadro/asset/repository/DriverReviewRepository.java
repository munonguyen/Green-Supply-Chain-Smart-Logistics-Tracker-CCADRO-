package com.ccadro.asset.repository;

import com.ccadro.asset.entity.DriverReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DriverReviewRepository extends JpaRepository<DriverReview, UUID> {
    List<DriverReview> findByDriverIdOrderByCreatedAtDesc(UUID driverId);
}

