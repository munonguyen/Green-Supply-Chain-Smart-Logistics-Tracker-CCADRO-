package com.ccadro.hubshipper.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI hubShipperOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CCADRO Hub & Last-Mile Shipper Service API")
                        .version("1.0.0")
                        .description("Hub-bound Shipper Isolation, Policy Engine, Code-Range Task Assignment, Item Tracking & Photo POD"));
    }
}

