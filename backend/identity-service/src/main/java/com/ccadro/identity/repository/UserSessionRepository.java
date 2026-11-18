package com.ccadro.identity.repository;

import com.ccadro.identity.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    Optional<UserSession> findByPreviousRefreshTokenHash(String previousRefreshTokenHash);

    List<UserSession> findByUsernameIgnoreCaseAndRevokedFalseOrderByLastRefreshedAtDesc(String username);

    List<UserSession> findByFamilyIdAndRevokedFalse(UUID familyId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :cutoff OR (s.revoked = true AND s.revokedAt < :cutoff)")
    int deleteExpiredOrOldRevokedBefore(Instant cutoff);
}

