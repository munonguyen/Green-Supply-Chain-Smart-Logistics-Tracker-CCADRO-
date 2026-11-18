package com.ccadro.chat.configuration;

import java.util.concurrent.TimeUnit;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatMongoConfiguration {
    @Bean MongoClientSettingsBuilderCustomizer chatMongoTimeouts() {
        return builder -> builder.applyToClusterSettings(c -> c.serverSelectionTimeout(5, TimeUnit.SECONDS))
                .applyToSocketSettings(s -> s.connectTimeout(3, TimeUnit.SECONDS).readTimeout(5, TimeUnit.SECONDS));
    }
}
