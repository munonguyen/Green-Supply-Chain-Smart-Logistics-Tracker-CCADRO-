package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.AuthenticationRequest;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.request.LogoutRequest;
import com.ccadro.identity.dto.response.AuthenticationResponse;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.entity.InvalidatedToken;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.repository.InvalidatedTokenRepository;
import com.ccadro.identity.repository.UserRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${jwt.signerKey:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration:86400}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration:604800}")
    protected long REFRESHABLE_DURATION;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        log.info("Authenticating user: {}", request.getUsername());
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Mật khẩu không chính xác");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new AppException(ErrorCode.USER_LOCKED);
        }

        Date expiryDate = new Date(Instant.now().plus(VALID_DURATION, ChronoUnit.SECONDS).toEpochMilli());
        String token = generateToken(user, expiryDate);

        return AuthenticationResponse.builder()
                .token(token)
                .expiryToken(expiryDate)
                .build();
    }

    public IntrospectResponse introspect(IntrospectRequest request) {
        String token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token, false);
        } catch (AppException | JOSEException | ParseException e) {
            isValid = false;
        }

        return IntrospectResponse.builder()
                .valid(isValid)
                .build();
    }

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        try {
            SignedJWT signToken = verifyToken(request.getToken(), true);
            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

            InvalidatedToken invalidatedToken = InvalidatedToken.builder()
                    .id(jit)
                    .expiryTime(expiryTime.toInstant())
                    .build();

            invalidatedTokenRepository.save(invalidatedToken);
            log.info("Token successfully invalidated: JTI={}", jit);
        } catch (AppException exception) {
            log.info("Token already expired or invalid on logout");
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        if (token == null || token.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());
        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = (isRefresh)
                ? new Date(signedJWT.getJWTClaimsSet().getIssueTime().toInstant().plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS).toEpochMilli())
                : signedJWT.getJWTClaimsSet().getExpirationTime();

        boolean verified = signedJWT.verify(verifier);
        if (!(verified && expiryTime.after(new Date()))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return signedJWT;
    }

    private String generateToken(User user, Date expiryDate) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(user.getUsername())
                .issuer("ccadro.com")
                .issueTime(new Date())
                .expirationTime(expiryDate)
                .jwtID(UUID.randomUUID().toString())
                .claim("userId", user.getId().toString())
                .claim("scope", buildScope(user))
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi tạo JWT token");
        }
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            user.getRoles().forEach(role -> {
                stringJoiner.add("ROLE_" + role.getName());
                if (role.getPermissions() != null && !role.getPermissions().isEmpty()) {
                    role.getPermissions().forEach(permission -> stringJoiner.add(permission.getName()));
                }
            });
        }
        return stringJoiner.toString();
    }
}
