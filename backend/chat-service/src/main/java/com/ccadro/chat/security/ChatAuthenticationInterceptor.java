package com.ccadro.chat.security;

import com.ccadro.chat.service.ChatAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ChatAuthenticationInterceptor implements HandlerInterceptor {
    public static final String ACTOR_ATTRIBUTE = "chatActor";
    private final ChatAuthenticationService authenticationService;

    public ChatAuthenticationInterceptor(ChatAuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(ACTOR_ATTRIBUTE, authenticationService.authenticate(request.getHeader("Authorization")));
        return true;
    }
}
