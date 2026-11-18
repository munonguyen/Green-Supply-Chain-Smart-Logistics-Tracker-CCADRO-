package com.ccadro.identity.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.entity.*;
import com.ccadro.identity.repository.UserRepository;
import com.ccadro.identity.service.AuthenticationService;
import com.ccadro.identity.exception.AppException;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;

class ChatDirectoryTest {
    @Test void directoryIsAuthenticatedAndProjectsOnlyMinimalActiveAccountFields() {
        var auth=mock(AuthenticationService.class);
        var users=mock(UserRepository.class);
        var controller=new AuthController(auth,users);
        assertThatThrownBy(() -> controller.chatDirectory(null)).isInstanceOf(AppException.class);
        verifyNoInteractions(users);
        when(auth.introspect(any())).thenReturn(IntrospectResponse.builder().valid(false).build());
        assertThatThrownBy(() -> controller.chatDirectory("Bearer invalid")).isInstanceOf(AppException.class);
        verifyNoInteractions(users);
        when(auth.introspect(any())).thenReturn(IntrospectResponse.builder().valid(true).username("alice").build());
        User active=User.builder().username("alice").firstName("Alice").lastName("Nguyen")
                .email("private@example.com").password("private-hash").nationalId("private-id")
                .roles(Set.of(Role.builder().name("DRIVER").build())).build();
        User deleted=User.builder().username("deleted").isDeleted(true).build();
        User disabled=User.builder().username("disabled").status("SUSPENDED").build();
        User locked=User.builder().username("locked").lockedUntil(Instant.now().plusSeconds(60)).build();
        when(users.findAll()).thenReturn(List.of(active,deleted,disabled,locked));
        var result=controller.chatDirectory("Bearer valid").getResult();
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsExactlyInAnyOrderEntriesOf(Map.of("username","alice","fullName","Alice Nguyen","role","DRIVER"));
    }
}
