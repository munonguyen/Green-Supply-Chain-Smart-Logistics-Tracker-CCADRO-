package com.ccadro.hubshipper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HubShipperServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(HubShipperServiceApplication.class, args);
    }
}
