package com.ccadro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CcadroApplication {

    public static void main(String[] args) {
        SpringApplication.run(CcadroApplication.class, args);
    }
}
