package com.ccadro.identity.service;

import com.ccadro.identity.repository.InvalidatedTokenRepository;
import com.ccadro.identity.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class TokenMaintenanceScheduler {

    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final UserSessionRepository userSessionRepository;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeExpiredTokensAndSessions() {
        Instant now = Instant.now();
        int deletedTokens = invalidatedTokenRepository.deleteExpiredBefore(now);
        int deletedSessions = userSessionRepository.deleteExpiredOrOldRevokedBefore(now.minus(30, ChronoUnit.DAYS));
        if (deletedTokens > 0 || deletedSessions > 0) {
            log.info("TokenMaintenance cleaned up {} expired invalidated_tokens and {} old user_sessions",
                    deletedTokens, deletedSessions);
        }
    }
}

