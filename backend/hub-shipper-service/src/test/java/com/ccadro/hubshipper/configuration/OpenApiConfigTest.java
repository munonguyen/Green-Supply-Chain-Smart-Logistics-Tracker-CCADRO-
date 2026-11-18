package com.ccadro.hubshipper.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void hubShipperOpenApiIncludesGatewayAndBearerScheme() {
        OpenAPI api = new OpenApiConfig().hubShipperOpenAPI();
        assertNotNull(api.getInfo());
        assertEquals(2, api.getServers().size());
        assertTrue(api.getServers().stream().anyMatch(s -> s.getUrl().contains(":8888")));
        assertTrue(api.getServers().stream().anyMatch(s -> s.getUrl().contains(":8089")));
        assertTrue(api.getComponents().getSecuritySchemes().containsKey("bearerAuth"));
    }
}
