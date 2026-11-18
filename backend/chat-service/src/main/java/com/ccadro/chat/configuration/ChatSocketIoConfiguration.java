package com.ccadro.chat.configuration;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.AuthorizationResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@org.springframework.context.annotation.Configuration
@EnableScheduling
public class ChatSocketIoConfiguration {
    @org.springframework.context.annotation.Bean
    public SocketIOServer socketIOServer(
            @Value("${ccadro.socket.host:127.0.0.1}") String host,
            @Value("${ccadro.socket.port:8091}") int port,
            @Value("${ccadro.socket.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        var configuration = new com.corundumstudio.socketio.Configuration();
        configuration.setHostname(host);
        configuration.setPort(port);
        configuration.setOrigin("*");
        configuration.setContext("/api/v1/chat/socket.io");
        Set<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).collect(Collectors.toUnmodifiableSet());
        configuration.setAuthorizationListener(handshake -> {
            String origin = handshake.getHttpHeaders().get("Origin");
            String ticket = handshake.getSingleUrlParam("ticket");
            return origins.contains(origin) && ticket != null && ticket.length() == 43
                    ? AuthorizationResult.SUCCESSFUL_AUTHORIZATION : AuthorizationResult.FAILED_AUTHORIZATION;
        });
        return new SocketIOServer(configuration);
    }
}
