package com.ccadro.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ccadroOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CCADRO API - Green Logistics Tracker")
                        .description("REST API for Smart Green Logistics Tracker (Modular Monolith) with Routing, Tracking, and Carbon Accounting.")
                        .version("v0.1.0")
                        .contact(new Contact().name("CCADRO Engineering Team"))
                        .license(new License().name("Apache 2.0")));
    }
}
