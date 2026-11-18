package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.BranchRequest;
import com.ccadro.identity.dto.response.BranchResponse;
import com.ccadro.identity.entity.Branch;
import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.BranchMapper;
import com.ccadro.identity.mapper.MapperTextUtils;
import com.ccadro.identity.repository.BranchRepository;
import com.ccadro.identity.repository.StaffProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BranchService {

    BranchMapper branchMapper;
    BranchRepository branchRepository;
    StaffProfileRepository staffProfileRepository;

    public List<BranchResponse> getBranches(String q, String region, boolean includeDeleted) {
        String normalizedRegion = MapperTextUtils.normalizeFilter(region);

        List<Branch> filtered = branchRepository.findAll().stream()
                .filter(b -> includeDeleted || !Boolean.TRUE.equals(b.getIsDeleted()))
                .filter(b -> normalizedRegion == null || normalizedRegion.equalsIgnoreCase(b.getRegion()))
                .toList();

        List<Branch> ranked = ElasticSearchSupport.filterAndRank(filtered, q, b -> List.of(
                new ElasticSearchSupport.WeightedField(b.getBranchCode(), 5.0),
                new ElasticSearchSupport.WeightedField(b.getBranchName(), 4.5),
                new ElasticSearchSupport.WeightedField(b.getCity(), 4.0),
                new ElasticSearchSupport.WeightedField(b.getRegion(), 3.0),
                new ElasticSearchSupport.WeightedField(b.getManagerName(), 3.0),
                new ElasticSearchSupport.WeightedField(b.getAddress(), 2.0),
                new ElasticSearchSupport.WeightedField(b.getBranchType(), 2.0)
        ));

        Map<UUID, Long> staffCounts = countActiveStaffByBranch();
        return ranked.stream()
                .map(b -> branchMapper.toResponse(b, staffCounts.getOrDefault(b.getId(), 0L)))
                .toList();
    }

    public BranchResponse getBranchById(UUID id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy chi nhánh: " + id));
        long staffCount = staffProfileRepository.findByBranchId(branch.getId()).stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .count();
        return branchMapper.toResponse(branch, staffCount);
    }

    @Transactional
    public BranchResponse createBranch(BranchRequest req) {
        String code = req.getBranchCode().trim().toUpperCase(Locale.ROOT);
        if (branchRepository.existsByBranchCodeIgnoreCase(code)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Mã chi nhánh đã tồn tại: " + code);
        }

        Branch entity = branchMapper.toEntity(req);
        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        Branch saved = branchRepository.save(entity);
        return branchMapper.toResponse(saved, 0L);
    }

    @Transactional
    public BranchResponse updateBranch(UUID id, BranchRequest req) {
        Branch existing = branchRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy chi nhánh: " + id));

        if (req.getBranchCode() != null && !req.getBranchCode().isBlank()) {
            String nextCode = req.getBranchCode().trim().toUpperCase(Locale.ROOT);
            if (!nextCode.equalsIgnoreCase(existing.getBranchCode())
                    && branchRepository.existsByBranchCodeIgnoreCase(nextCode)) {
                throw new AppException(ErrorCode.USER_EXISTED, "Mã chi nhánh đã tồn tại: " + nextCode);
            }
            existing.setBranchCode(nextCode);
        }

        branchMapper.updateEntity(existing, req);
        existing.setUpdatedAt(Instant.now());
        Branch saved = branchRepository.save(existing);

        List<StaffProfile> linkedStaff = staffProfileRepository.findByBranchId(saved.getId());
        long activeCount = 0L;
        for (StaffProfile s : linkedStaff) {
            if (!Objects.equals(s.getBranchCode(), saved.getBranchCode())) {
                s.setBranchCode(saved.getBranchCode());
                s.setUpdatedAt(Instant.now());
                staffProfileRepository.save(s);
            }
            if (!Boolean.TRUE.equals(s.getIsDeleted())) {
                activeCount++;
            }
        }
        return branchMapper.toResponse(saved, activeCount);
    }

    @Transactional
    public BranchResponse softDeleteBranch(UUID id, String callerUsername) {
        Branch existing = branchRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy chi nhánh: " + id));
        if ("BR-HCM-HQ".equalsIgnoreCase(existing.getBranchCode())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể xóa mềm Trụ sở chính mặc định (BR-HCM-HQ).");
        }

        Instant now = Instant.now();
        existing.setIsDeleted(true);
        existing.setDeletedAt(now);
        existing.setDeletedBy(callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN");
        existing.setStatus("INACTIVE");
        existing.setUpdatedAt(now);

        Branch saved = branchRepository.save(existing);
        long activeCount = staffProfileRepository.findByBranchId(saved.getId()).stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .count();
        return branchMapper.toResponse(saved, activeCount);
    }

    @Transactional
    public BranchResponse restoreBranch(UUID id) {
        Branch existing = branchRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy chi nhánh: " + id));

        existing.setIsDeleted(false);
        existing.setDeletedAt(null);
        existing.setDeletedBy(null);
        existing.setStatus("ACTIVE");
        existing.setUpdatedAt(Instant.now());

        Branch saved = branchRepository.save(existing);
        long activeCount = staffProfileRepository.findByBranchId(saved.getId()).stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .count();
        return branchMapper.toResponse(saved, activeCount);
    }

    private Map<UUID, Long> countActiveStaffByBranch() {
        Map<UUID, Long> counts = new HashMap<>();
        for (StaffProfile s : staffProfileRepository.findAll()) {
            if (!Boolean.TRUE.equals(s.getIsDeleted()) && s.getBranchId() != null) {
                counts.merge(s.getBranchId(), 1L, Long::sum);
            }
        }
        return counts;
    }
}
