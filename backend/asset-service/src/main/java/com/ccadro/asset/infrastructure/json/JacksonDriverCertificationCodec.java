package com.ccadro.asset.infrastructure.json;

import com.ccadro.asset.application.port.DriverCertificationCodec;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public final class JacksonDriverCertificationCodec implements DriverCertificationCodec {
    private static final List<String> DEFAULT_CERTIFICATIONS = List.of("Eco-Driving GLEC v3", "An Toàn Container");
    private static final TypeReference<List<String>> CERTIFICATIONS_TYPE = new TypeReference<>() {};
    private final ObjectMapper json;

    public JacksonDriverCertificationCodec(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public List<String> decode(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return DEFAULT_CERTIFICATIONS;
        }
        try {
            List<String> certifications = json.readValue(storedValue, CERTIFICATIONS_TYPE);
            return certifications == null ? DEFAULT_CERTIFICATIONS : certifications;
        } catch (JsonProcessingException exception) {
            return DEFAULT_CERTIFICATIONS;
        }
    }

    @Override
    public String encode(List<String> certifications) {
        try {
            return json.writeValueAsString(certifications);
        } catch (JsonProcessingException exception) {
            // Never silently replace a write with unrelated default qualifications.
            throw new IllegalStateException("Cannot encode driver certifications", exception);
        }
    }
}
