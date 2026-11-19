package com.ccadro.asset.application.port;

import java.util.Map;

/** Encodes the inspection record for persistence without exposing a JSON library to the use case. */
public interface InspectionChecklistEncoder {
    String encode(Map<String, String> checklist);
}
