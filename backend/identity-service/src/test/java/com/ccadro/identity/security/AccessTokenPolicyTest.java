package com.ccadro.identity.security;

import com.ccadro.identity.exception.AppException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jwt.JWTClaimsSet;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AccessTokenPolicyTest {
    private final Instant now = Instant.parse("2026-11-19T00:00:00Z");

    private JWTClaimsSet.Builder validClaims() {
        return new JWTClaimsSet.Builder().issuer("ccadro.com").subject("driver").jwtID("jti")
                .issueTime(Date.from(now.minusSeconds(1))).expirationTime(Date.from(now.plusSeconds(600)));
    }

    @Test void acceptsExpectedIssuerAlgorithmAndRequiredClaims() {
        assertDoesNotThrow(() -> AccessTokenPolicy.validate(JWSAlgorithm.HS512, validClaims().build(), now));
    }

    @Test void rejectsUnexpectedAlgorithmsAndIssuers() {
        assertThrows(AppException.class, () -> AccessTokenPolicy.validate(JWSAlgorithm.HS256, validClaims().build(), now));
        assertThrows(AppException.class, () -> AccessTokenPolicy.validate(JWSAlgorithm.HS512, validClaims().issuer("other-service").build(), now));
    }

    @Test void rejectsMissingIdentityAndInvalidTimingClaims() {
        for (JWTClaimsSet claims : new JWTClaimsSet[] {
                validClaims().subject(null).build(), validClaims().jwtID("").build(),
                validClaims().expirationTime(null).build(), validClaims().issueTime(null).build(),
                validClaims().issueTime(Date.from(now.plusSeconds(120))).build(),
                validClaims().notBeforeTime(Date.from(now.plusSeconds(20))).build(),
                validClaims().expirationTime(Date.from(now.minusSeconds(2))).build()}) {
            assertThrows(AppException.class, () -> AccessTokenPolicy.validate(JWSAlgorithm.HS512, claims, now));
        }
    }
}
