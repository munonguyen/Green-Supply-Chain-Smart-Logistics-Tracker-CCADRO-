package com.ccadro.chat.configuration;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class IdentityClientConfiguration {
    @Bean
    public RestClient identityRestClient(@Value("${ccadro.identity-url}") String identityUrl) {
        var settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofSeconds(3)).withReadTimeout(Duration.ofSeconds(5));
        return RestClient.builder().baseUrl(identityUrl)
                .requestFactory(ClientHttpRequestFactories.get(settings)).build();
    }
}
