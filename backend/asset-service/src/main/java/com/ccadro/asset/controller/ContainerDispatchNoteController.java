package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/assets/containers/{code}/dispatch-notes")
@RequiredArgsConstructor
public class ContainerDispatchNoteController {
    private final JdbcTemplate jdbc;
    private final ContainerRepository containers;
    public record NoteRequest(
            @NotBlank @Pattern(regexp = "OPERATIONS|DELAY|DEVICE|CARGO|HANDOVER") String category,
            @NotBlank @Size(max = 2000) String content) {}
    public record Note(UUID id, String category, String content, String createdBy, Instant createdAt) {}

    private void authorize(String scope) {
        var roles = scope == null ? List.of() : Arrays.asList(scope.trim().split("\\s+"));
        if (Collections.disjoint(roles, List.of("ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER"))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    @GetMapping
    public ApiResponse<List<Note>> list(@PathVariable String code,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        authorize(scope);
        if (containers.findByContainerCode(code).filter(c -> !Boolean.TRUE.equals(c.getIsDeleted())).isEmpty()) {
            throw new AppException(ErrorCode.CONTAINER_NOT_FOUND);
        }
        return ApiResponse.success(jdbc.query("""
                SELECT id, category, content, created_by, created_at FROM container_dispatch_note
                 WHERE container_code = ? ORDER BY created_at DESC, id DESC LIMIT 30
                """, (row, index) -> new Note(row.getObject("id", UUID.class), row.getString("category"),
                row.getString("content"), row.getString("created_by"), row.getTimestamp("created_at").toInstant()), code));
    }

    @PostMapping
    @Transactional
    public ApiResponse<Note> create(@PathVariable String code, @Valid @RequestBody NoteRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope,
            @RequestHeader(value = "X-Auth-Username", required = false) String username) {
        authorize(scope);
        if (username == null || username.isBlank()) throw new AppException(ErrorCode.UNAUTHENTICATED);
        var container = containers.findForControlUpdate(code)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        if (Boolean.TRUE.equals(container.getIsDeleted())) throw new AppException(ErrorCode.CONTAINER_NOT_FOUND);
        Note note = new Note(UUID.randomUUID(), request.category(), request.content().trim(), username, Instant.now());
        jdbc.update("""
                INSERT INTO container_dispatch_note(id, container_code, category, content, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, note.id(), code, note.category(), note.content(), note.createdBy(), java.sql.Timestamp.from(note.createdAt()));
        return ApiResponse.success("Đã ghi nhận cập nhật điều hành", note);
    }
}
