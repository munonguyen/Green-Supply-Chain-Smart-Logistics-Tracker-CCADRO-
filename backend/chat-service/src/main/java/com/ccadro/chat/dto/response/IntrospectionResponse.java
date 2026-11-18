package com.ccadro.chat.dto.response;

/** Internal Identity response, not exposed by Chat controllers. */
public record IntrospectionResponse(boolean valid, String username, String scope) {}
