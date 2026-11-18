package com.ccadro.identity.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Lớp Redis Hot-Blacklist phục vụ kiểm tra thu hồi JWT tức thời (O(1)):
 * - ccadro:auth:bl:jti:{jti}          -> Vô hiệu hóa 1 JWT cụ thể sau logout (TTL = exp - now)
 * - ccadro:auth:session:revoked:{sid}  -> Vô hiệu hóa cả phiên thiết bị khi logout / reuse attack
 * - ccadro:auth:revoked_before:{user}  -> Mốc epochMs; token phát trước mốc này bị từ chối khi đổi pass/logout-all/khóa user
 *
 * Khi Redis không sẵn sàng (offline / unit test), trả về null / skip an toàn để fallback PostgreSQL.
 */
@Service
@Slf4j
public class TokenBlacklistRedisService {

    public static final String JTI_BLACKLIST_PREFIX = "ccadro:auth:bl:jti:";
    public static final String SESSION_REVOKED_PREFIX = "ccadro:auth:session:revoked:";
    public static final String USER_REVOKED_BEFORE_PREFIX = "ccadro:auth:revoked_before:";

    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.valid-duration:900}")
    long accessTokenDurationSeconds = 900;

    public TokenBlacklistRedisService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklistJti(String jti, Instant expiryTime, String reason) {
        if (redisTemplate == null || jti == null || jti.isBlank() || expiryTime == null) {
            return;
        }
        long ttlSeconds = expiryTime.getEpochSecond() - Instant.now().getEpochSecond();
        if (ttlSeconds <= 0) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(
                    JTI_BLACKLIST_PREFIX + jti,
                    reason != null ? reason : "LOGOUT",
                    Duration.ofSeconds(ttlSeconds)
            );
        } catch (Exception ex) {
            log.warn("Redis unavailable while blacklisting JTI={}: {}", jti, ex.getMessage());
        }
    }

    /**
     * Trả về Boolean.TRUE nếu JTI có trên Redis, Boolean.FALSE nếu Redis xác nhận chưa có,
     * hoặc null nếu Redis không kết nối được (để fallback sang PostgreSQL).
     */
    public Boolean isJtiBlacklisted(String jti) {
        if (redisTemplate == null || jti == null || jti.isBlank()) {
            return null;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(JTI_BLACKLIST_PREFIX + jti));
        } catch (Exception ex) {
            log.warn("Redis unavailable during blacklist check JTI={}: {}", jti, ex.getMessage());
            return null;
        }
    }

    public void revokeSessionId(UUID sessionId, String reason) {
        if (redisTemplate == null || sessionId == null) {
            return;
        }
        try {
            long ttl = Math.max(60L, accessTokenDurationSeconds + 60L);
            redisTemplate.opsForValue().set(
                    SESSION_REVOKED_PREFIX + sessionId,
                    reason != null ? reason : "REVOKED",
                    Duration.ofSeconds(ttl)
            );
        } catch (Exception ex) {
            log.warn("Redis unavailable while revoking sessionId={}: {}", sessionId, ex.getMessage());
        }
    }

    public Boolean isSessionRevoked(String sessionId) {
        if (redisTemplate == null || sessionId == null || sessionId.isBlank()) {
            return null;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(SESSION_REVOKED_PREFIX + sessionId));
        } catch (Exception ex) {
            log.warn("Redis unavailable during session check sid={}: {}", sessionId, ex.getMessage());
            return null;
        }
    }

    public void markUserRevokedBefore(String username, Instant cutoff) {
        if (redisTemplate == null || username == null || username.isBlank() || cutoff == null) {
            return;
        }
        try {
            long ttl = Math.max(60L, accessTokenDurationSeconds + 60L);
            redisTemplate.opsForValue().set(
                    USER_REVOKED_BEFORE_PREFIX + username.toLowerCase(Locale.ROOT).trim(),
                    String.valueOf(cutoff.getEpochSecond()),
                    Duration.ofSeconds(ttl)
            );
        } catch (Exception ex) {
            log.warn("Redis unavailable while marking revoked_before for {}: {}", username, ex.getMessage());
        }
    }

    public Boolean isIssuedBeforeUserRevocation(String username, Instant issuedAt) {
        if (redisTemplate == null || username == null || username.isBlank() || issuedAt == null) {
            return null;
        }
        try {
            String raw = redisTemplate.opsForValue().get(
                    USER_REVOKED_BEFORE_PREFIX + username.toLowerCase(Locale.ROOT).trim()
            );
            if (raw == null || raw.isBlank()) {
                return Boolean.FALSE;
            }
            long revokedEpochSec = Long.parseLong(raw.trim());
            return issuedAt.getEpochSecond() < revokedEpochSec;
        } catch (Exception ex) {
            log.warn("Redis unavailable during revoked_before check for {}: {}", username, ex.getMessage());
            return null;
        }
    }
}

