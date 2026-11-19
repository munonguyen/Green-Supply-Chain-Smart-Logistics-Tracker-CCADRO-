package com.ccadro.identity.service;

import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class HubIamScopePolicyTest {
    @Test void roleNameSubstringCannotGrantGlobalAdminAccess() {
        HubIamAccountRepository accounts = mock(HubIamAccountRepository.class);
        HubIamAccountService service = new HubIamAccountService(accounts, mock(HubAuthAuditLogRepository.class),
                mock(UserRepository.class), mock(RoleRepository.class), mock(PasswordEncoder.class));
        assertThrows(AppException.class, () -> service.getAccountsByHubScope(null, "ROLE_ADMINISTRATOR", null));
        verifyNoInteractions(accounts);
    }
}
