package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.CompanyRequest;
import com.ccadro.identity.dto.request.UserUpdateRequest;
import com.ccadro.identity.dto.response.CompanyResponse;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.entity.Company;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.mapper.UserMapper;
import com.ccadro.identity.repository.CompanyRepository;
import com.ccadro.identity.repository.HubIamAccountRepository;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserAndCompanyManagementTest {

    @Mock
    UserRepository userRepository;
    @Mock
    HubIamAccountRepository hubIamAccountRepository;
    @Mock
    RoleRepository roleRepository;
    @Mock
    CompanyRepository companyRepository;
    @Mock
    UserMapper userMapper;

    PasswordEncoder passwordEncoder;
    UserService userService;
    CompanyService companyService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        userService = new UserService(userRepository, hubIamAccountRepository, roleRepository, companyRepository, userMapper, passwordEncoder);
        companyService = new CompanyService(org.mapstruct.factory.Mappers.getMapper(com.ccadro.identity.mapper.CompanyMapper.class), companyRepository, userRepository);
    }

    @Test
    void companyService_shouldUpdateCompanyPropagateToUsersAndSoftDeleteSafely() {
        UUID compId = UUID.randomUUID();
        Company existing = Company.builder()
                .id(compId)
                .companyCode("VINAMILK")
                .companyName("Vinamilk Old")
                .taxCode("0300588569")
                .creditTier("STANDARD")
                .creditLimitVnd(100_000_000L)
                .kycStatus("PENDING")
                .isDeleted(false)
                .build();

        User linkedUser = User.builder()
                .id(UUID.randomUUID())
                .username("customer")
                .companyId(compId)
                .companyName("Vinamilk Old")
                .isDeleted(false)
                .build();

        when(companyRepository.findById(compId)).thenReturn(Optional.of(existing));
        when(companyRepository.existsByTaxCode("0300588569-NEW")).thenReturn(false);
        when(companyRepository.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findAll()).thenReturn(List.of(linkedUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        CompanyResponse updated = companyService.updateCompany(compId, CompanyRequest.builder()
                .companyCode("VINAMILK")
                .companyName("CTCP Sữa Việt Nam - Vinamilk")
                .taxCode("0300588569-NEW")
                .creditTier("ENTERPRISE_MSA")
                .creditLimitVnd(500_000_000L)
                .kycStatus("VERIFIED")
                .build());

        assertEquals("CTCP Sữa Việt Nam - Vinamilk", updated.getCompanyName());
        assertEquals("VERIFIED", updated.getKycStatus());
        assertEquals(1L, updated.getActiveUserCount());
        assertEquals("CTCP Sữa Việt Nam - Vinamilk", linkedUser.getCompanyName());
        assertEquals("0300588569-NEW", linkedUser.getTaxCode());

        // Elastic Search & Soft Delete
        when(companyRepository.findAll()).thenReturn(List.of(existing));
        assertEquals(1, companyService.getCompanies("sua viet nam", false).size());

        companyService.softDeleteCompany(compId, "admin");
        assertTrue(existing.getIsDeleted());
        assertEquals(0, companyService.getCompanies(null, false).size());
        assertEquals(1, companyService.getCompanies(null, true).size());

        companyService.restoreCompany(compId);
        assertFalse(existing.getIsDeleted());
    }

    @Test
    void userService_shouldUpdateDetailsBindCompanyUnlockResetPasswordAndProtectRootAdmin() {
        UUID compId = UUID.randomUUID();
        Company company = Company.builder()
                .id(compId)
                .companyCode("SAMSUNG_VN")
                .companyName("Samsung Electronics Vietnam")
                .taxCode("2300325764")
                .build();

        UUID userId = UUID.randomUUID();
        User customer = User.builder()
                .id(userId)
                .username("user_samsung")
                .email("old@samsung.com")
                .password(passwordEncoder.encode("123"))
                .status("LOCKED")
                .failedLoginAttempts(5)
                .lockedUntil(Instant.now().plusSeconds(600))
                .roles(new HashSet<>(Set.of(Role.builder().name("CUSTOMER").build())))
                .isDeleted(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(customer));
        when(userRepository.existsByEmail("lead@samsung.com")).thenReturn(false);
        when(companyRepository.findById(compId)).thenReturn(Optional.of(company));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return UserResponse.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .email(u.getEmail())
                    .phoneNumber(u.getPhoneNumber())
                    .jobTitle(u.getJobTitle())
                    .companyId(u.getCompanyId())
                    .companyName(u.getCompanyName())
                    .customerId(u.getCustomerId())
                    .taxCode(u.getTaxCode())
                    .status(u.getStatus())
                    .failedLoginAttempts(u.getFailedLoginAttempts())
                    .build();
        });

        UserResponse updated = userService.updateUser(userId, UserUpdateRequest.builder()
                .email("lead@samsung.com")
                .phoneNumber("02223696666")
                .jobTitle("Trưởng phòng XNK")
                .nationalId("001095001234")
                .workAddress("KCN Yên Phong I, Bắc Ninh")
                .companyId(compId)
                .build(), "admin");

        assertEquals("lead@samsung.com", updated.getEmail());
        assertEquals("Samsung Electronics Vietnam", updated.getCompanyName());
        assertEquals("SAMSUNG_VN", updated.getCustomerId());
        assertEquals("2300325764", updated.getTaxCode());

        UserResponse unlocked = userService.unlockUser(userId, "admin");
        assertEquals("ACTIVE", unlocked.getStatus());
        assertEquals(0, unlocked.getFailedLoginAttempts());

        userService.resetUserPassword(userId, "NewSecure123", "admin");
        assertTrue(passwordEncoder.matches("NewSecure123", customer.getPassword()));

        // Root admin cannot be locked
        UUID adminId = UUID.randomUUID();
        User rootAdmin = User.builder().id(adminId).username("admin").status("ACTIVE").build();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(rootAdmin));
        assertThrows(AppException.class, () ->
                userService.updateUser(adminId, UserUpdateRequest.builder().status("LOCKED").build(), "admin"));
    }
}

