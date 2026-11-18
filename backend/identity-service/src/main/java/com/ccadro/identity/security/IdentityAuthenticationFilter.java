package com.ccadro.identity.security;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.service.AuthenticationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Service-boundary authentication: forwarded identity headers are never a credential. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class IdentityAuthenticationFilter extends OncePerRequestFilter {
    private final AuthenticationService authentication;
    private final ObjectMapper json;
    private static final Set<String> PUBLIC_AUTH = Set.of("token", "refresh", "introspect", "logout", "register");

    public IdentityAuthenticationFilter(AuthenticationService authentication, ObjectMapper json) {
        this.authentication = authentication;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        Map<String, String> trusted = new HashMap<>();
        boolean protectedApi = path.startsWith("/api/v1/")
                && !path.equals("/api/v1/health")
                && !path.startsWith("/api/v1/careers/")
                && !path.equals("/api/v1/careers")
                && !(path.startsWith("/api/v1/auth/") && PUBLIC_AUTH.contains(path.substring("/api/v1/auth/".length())))
                && !"OPTIONS".equals(request.getMethod());
        if (protectedApi) {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) { reject(response, 401); return; }
            IntrospectResponse actor;
            try { actor = authentication.introspect(IntrospectRequest.builder().token(header.substring(7).trim()).build()); }
            catch (RuntimeException ex) { reject(response, 401); return; }
            if (actor == null || !actor.isValid() || actor.getUsername() == null) { reject(response, 401); return; }
            Set<String> scope = new HashSet<>(Arrays.asList(Objects.toString(actor.getScope(), "").split("\\s+")));
            boolean admin = scope.contains("ROLE_ADMIN");
            boolean catalog = path.equals("/api/v1/roles") || path.startsWith("/api/v1/roles/")
                    || path.equals("/api/v1/permissions") || path.startsWith("/api/v1/permissions/");
            boolean userMutation = path.startsWith("/api/v1/users") && !path.equals("/api/v1/users/me") && !"GET".equals(request.getMethod());
            boolean company = path.equals("/api/v1/companies") || path.startsWith("/api/v1/companies/");
            boolean directory = path.equals("/api/v1/users") || company;
            boolean staff = admin || scope.contains("ROLE_DISPATCHER") || scope.contains("ROLE_SAFETY_MANAGER");
            if ((catalog && !admin) || (userMutation && !admin) || (company && !"GET".equals(request.getMethod()) && !admin)
                    || (directory && !staff)) { reject(response, 403); return; }
            trusted.put("x-auth-username", actor.getUsername());
            trusted.put("x-auth-scope", Objects.toString(actor.getScope(), ""));
            trusted.put("x-auth-email", Objects.toString(actor.getEmail(), ""));
            trusted.put("x-auth-hub-code", Objects.toString(actor.getAssignedHubCode(), ""));
            trusted.put("x-auth-shipper-code", Objects.toString(actor.getAssignedShipperCode(), ""));
            trusted.put("x-auth-session-id", Objects.toString(actor.getSessionId(), ""));
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public String getHeader(String name) {
                if (name.toLowerCase(Locale.ROOT).startsWith("x-auth-")) return trusted.get(name.toLowerCase(Locale.ROOT));
                return super.getHeader(name);
            }
            @Override public Enumeration<String> getHeaders(String name) {
                if (name.toLowerCase(Locale.ROOT).startsWith("x-auth-")) {
                    String value = getHeader(name);
                    return Collections.enumeration(value == null ? List.of() : List.of(value));
                }
                return super.getHeaders(name);
            }
            @Override public Enumeration<String> getHeaderNames() {
                Set<String> names = new LinkedHashSet<>(trusted.keySet());
                Collections.list(super.getHeaderNames()).stream().filter(n -> !n.toLowerCase(Locale.ROOT).startsWith("x-auth-")).forEach(names::add);
                return Collections.enumeration(names);
            }
        }, response);
    }

    private void reject(HttpServletResponse response, int status) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getWriter(), ApiResponse.error(status == 401 ? 1002 : 1003,
                status == 401 ? "Vui lòng đăng nhập bằng tài khoản máy chủ." : "Bạn không có quyền thực hiện thao tác này."));
    }
}
