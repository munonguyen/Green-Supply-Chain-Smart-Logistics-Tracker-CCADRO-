package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.UserCreationRequest;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.UserMapper;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED, "Tên đăng nhập đã tồn tại trong hệ thống");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED, "Địa chỉ email đã được sử dụng");
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        HashSet<Role> roles = new HashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<String> normalizedRoles = request.getRoles().stream()
                    .map(r -> r == null ? "" : r.trim().toUpperCase(Locale.ROOT))
                    .collect(java.util.stream.Collectors.toSet());
            for (String roleName : normalizedRoles) {
                if (!RoleService.SYSTEM_FIXED_ROLES.contains(roleName)) {
                    throw new AppException(
                            ErrorCode.ROLE_NOT_FOUND,
                            "Vai trò không nằm trong 7 vai trò chuẩn hệ thống: " + roleName
                    );
                }
            }
            roleRepository.findAllById(normalizedRoles).forEach(roles::add);
        } else {
            roleRepository.findById("CUSTOMER").ifPresent(roles::add);
        }
        user.setRoles(roles);

        user = userRepository.save(user);
        return userMapper.toResponse(user);
    }

    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .toList();
    }

    public UserResponse getUser(UUID id) {
        return userMapper.toResponse(
                userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED))
        );
    }

    public UserResponse getUserByUsername(String username) {
        return userMapper.toResponse(
                userRepository.findByUsername(username).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED))
        );
    }
}

