package com.ccadro.asset.infrastructure.json;

import com.ccadro.asset.application.port.InspectionChecklistEncoder;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public final class JacksonInspectionChecklistEncoder implements InspectionChecklistEncoder {
    private final ObjectMapper json;

    public JacksonInspectionChecklistEncoder(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public String encode(Map<String, String> checklist) {
        try {
            return json.writeValueAsString(checklist);
        } catch (JsonProcessingException exception) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, exception);
        }
    }
}
