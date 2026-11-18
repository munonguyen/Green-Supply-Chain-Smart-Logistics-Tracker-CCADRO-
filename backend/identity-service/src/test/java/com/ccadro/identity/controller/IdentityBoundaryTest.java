package com.ccadro.identity.controller;
import com.ccadro.identity.security.IdentityAuthenticationFilter;
import com.ccadro.identity.service.AuthenticationService;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.*;

class IdentityBoundaryTest {
 @Test void forgedAdminHeaderWithoutTokenIsRejected() throws Exception {
  var auth=mock(AuthenticationService.class);var chain=new MockFilterChain();
  var request=new MockHttpServletRequest("GET","/api/v1/users");request.addHeader("X-Auth-Scope","ROLE_ADMIN");
  var response=new MockHttpServletResponse();
  new IdentityAuthenticationFilter(auth,new ObjectMapper().findAndRegisterModules()).doFilter(request,response,chain);
  assertThat(response.getStatus()).isEqualTo(401);assertThat(chain.getRequest()).isNull();verifyNoInteractions(auth);
 }
 @Test void customerCannotMutateRoleCatalogEvenWithSpoofedHeaders() throws Exception {
  var auth=mock(AuthenticationService.class);
  when(auth.introspect(any())).thenReturn(IntrospectResponse.builder().valid(true).username("customer").scope("ROLE_CUSTOMER").build());
  var request=new MockHttpServletRequest("POST","/api/v1/roles");request.addHeader("Authorization","Bearer valid");request.addHeader("X-Auth-Scope","ROLE_ADMIN");
  var response=new MockHttpServletResponse();var chain=new MockFilterChain();
  new IdentityAuthenticationFilter(auth,new ObjectMapper().findAndRegisterModules()).doFilter(request,response,chain);
  assertThat(response.getStatus()).isEqualTo(403);assertThat(chain.getRequest()).isNull();
 }
 @Test void verifiedIdentityReplacesForgedForwardedHeaders() throws Exception {
  var auth=mock(AuthenticationService.class);
  when(auth.introspect(any())).thenReturn(IntrospectResponse.builder().valid(true).username("customer").scope("ROLE_CUSTOMER").build());
  var request=new MockHttpServletRequest("GET","/api/v1/users/me");request.addHeader("Authorization","Bearer valid");request.addHeader("X-Auth-Username","admin");
  var response=new MockHttpServletResponse();var chain=new MockFilterChain();
  new IdentityAuthenticationFilter(auth,new ObjectMapper().findAndRegisterModules()).doFilter(request,response,chain);
  assertThat(((jakarta.servlet.http.HttpServletRequest)chain.getRequest()).getHeader("X-Auth-Username")).isEqualTo("customer");
 }
}
