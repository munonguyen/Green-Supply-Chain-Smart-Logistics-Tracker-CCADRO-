package com.ccadro.carbon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CarbonServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CarbonServiceApplication.class, args);
    }
}
