package com.ccadro.chat.configuration;

import com.ccadro.chat.security.ChatAuthenticationInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ChatWebConfiguration implements WebMvcConfigurer {
    private final ChatAuthenticationInterceptor authenticationInterceptor;

    public ChatWebConfiguration(ChatAuthenticationInterceptor authenticationInterceptor) {
        this.authenticationInterceptor = authenticationInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authenticationInterceptor).addPathPatterns("/api/v1/chat/**")
                .excludePathPatterns("/api/v1/chat/socket.io/**");
    }
}
