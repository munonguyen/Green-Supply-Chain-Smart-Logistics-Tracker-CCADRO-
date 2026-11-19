package com.ccadro.identity.security;

import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jwt.JWTClaimsSet;
import java.time.Instant;

/** Claim validation is independent of HTTP, persistence and Redis availability. */
public final class AccessTokenPolicy {
    private AccessTokenPolicy() {}

    public static void validate(JWSAlgorithm algorithm, JWTClaimsSet claims, Instant now) {
        if (!JWSAlgorithm.HS512.equals(algorithm)
                || !"ccadro.com".equals(claims.getIssuer())
                || claims.getSubject() == null || claims.getSubject().isBlank()
                || claims.getJWTID() == null || claims.getJWTID().isBlank()
                || claims.getIssueTime() == null || claims.getExpirationTime() == null
                || claims.getIssueTime().toInstant().isAfter(now.plusSeconds(60))
                || !claims.getExpirationTime().after(claims.getIssueTime())
                || (claims.getNotBeforeTime() != null && claims.getNotBeforeTime().toInstant().isAfter(now))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
    }
}
