package com.ccadro.chat.controller;

import com.ccadro.chat.configuration.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RequestAttribute;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

class ChatOpenApiContractTest {

    @Test
    void openApiConfigRegistersGatewayServerAndBearerAuth() {
        OpenAPI api = new OpenApiConfig().chatOpenAPI();
        assertNotNull(api.getInfo());
        assertEquals("CCADRO Real-Time Chat & Support Service", api.getInfo().getTitle());
        assertEquals(2, api.getServers().size());
        assertTrue(api.getServers().stream().anyMatch(s -> s.getUrl().contains(":8888")));
        assertTrue(api.getServers().stream().anyMatch(s -> s.getUrl().contains(":8090")));
        assertTrue(api.getComponents().getSecuritySchemes().containsKey("bearerAuth"));
    }

    @Test
    void chatControllerEndpointsHaveSwaggerOperationsAndHiddenInternalActor() {
        assertNotNull(ChatController.class.getAnnotation(Tag.class));
        for (Method m : ChatController.class.getDeclaredMethods()) {
            if (!java.lang.reflect.Modifier.isPublic(m.getModifiers())) continue;
            assertNotNull(m.getAnnotation(Operation.class), "Missing @Operation on " + m.getName());
            for (java.lang.reflect.Parameter p : m.getParameters()) {
                if (p.isAnnotationPresent(RequestAttribute.class)) {
                    Parameter swaggerParam = p.getAnnotation(Parameter.class);
                    assertNotNull(swaggerParam, "Missing @Parameter(hidden=true) on " + m.getName());
                    assertTrue(swaggerParam.hidden(), "Internal @RequestAttribute must be hidden in Swagger: " + m.getName());
                }
            }
        }
        long annotatedMethods = Arrays.stream(ChatController.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(Operation.class))
                .count();
        assertEquals(11, annotatedMethods);
    }
}
