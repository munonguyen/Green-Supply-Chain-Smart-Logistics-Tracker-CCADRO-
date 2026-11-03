package com.ccadro.notification.repository;

import com.ccadro.notification.entity.EmergencyNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmergencyNotificationRepository extends JpaRepository<EmergencyNotification, UUID> {

    List<EmergencyNotification> findAllByOrderByCreatedAtDesc();

    List<EmergencyNotification> findByStatusOrderByCreatedAtDesc(String status);

    List<EmergencyNotification> findByTargetRoleOrderByCreatedAtDesc(String targetRole);

    List<EmergencyNotification> findByBroadcastTypeOrderByCreatedAtDesc(String broadcastType);

    List<EmergencyNotification> findByTargetAudienceOrderByCreatedAtDesc(String targetAudience);

    List<EmergencyNotification> findByTripIdOrderByCreatedAtDesc(UUID tripId);

    long countByStatus(String status);

    Optional<EmergencyNotification> findFirstByEventTypeAndTripIdAndSeverityAndCreatedAtAfterOrderByCreatedAtDesc(
            String eventType, UUID tripId, String severity, Instant createdAfter);
}

