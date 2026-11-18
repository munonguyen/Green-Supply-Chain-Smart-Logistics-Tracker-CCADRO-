package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.CompanyRequest;
import com.ccadro.identity.dto.response.CompanyResponse;
import com.ccadro.identity.entity.Company;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.repository.CompanyRepository;
import com.ccadro.identity.repository.UserRepository;
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
public class CompanyService {
    private final com.ccadro.identity.mapper.CompanyMapper companyMapper;

    CompanyRepository companyRepository;
    UserRepository userRepository;

    public List<CompanyResponse> getCompanies(String q, boolean includeDeleted) {
        List<Company> filtered = companyRepository.findAll().stream()
                .filter(c -> includeDeleted || !Boolean.TRUE.equals(c.getIsDeleted()))
                .toList();

        List<Company> ranked = ElasticSearchSupport.filterAndRank(filtered, q, c -> List.of(
                new ElasticSearchSupport.WeightedField(c.getCompanyCode(), 5.0),
                new ElasticSearchSupport.WeightedField(c.getCompanyName(), 4.5),
                new ElasticSearchSupport.WeightedField(c.getTaxCode(), 4.0),
                new ElasticSearchSupport.WeightedField(c.getIndustry(), 2.5),
                new ElasticSearchSupport.WeightedField(c.getRepresentativeName(), 3.0),
                new ElasticSearchSupport.WeightedField(c.getCompanyEmail(), 2.5),
                new ElasticSearchSupport.WeightedField(c.getCompanyPhone(), 2.0),
                new ElasticSearchSupport.WeightedField(c.getCompanyType(), 2.0),
                new ElasticSearchSupport.WeightedField(c.getCreditTier(), 1.5),
                new ElasticSearchSupport.WeightedField(c.getKycStatus(), 1.5)
        ));

        Map<UUID, Long> activeUserCountByCompany = new HashMap<>();
        for (User u : userRepository.findAll()) {
            if (!Boolean.TRUE.equals(u.getIsDeleted()) && u.getCompanyId() != null) {
                activeUserCountByCompany.merge(u.getCompanyId(), 1L, Long::sum);
            }
        }

        return ranked.stream()
                .map(c -> toResponse(c, activeUserCountByCompany.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CompanyResponse createCompany(CompanyRequest req) {
        String code = req.getCompanyCode().trim().toUpperCase(Locale.ROOT);
        if (companyRepository.existsByCompanyCodeIgnoreCase(code)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Mã doanh nghiệp đã tồn tại: " + code);
        }
        String tax = req.getTaxCode() != null ? req.getTaxCode().trim() : null;
        if (tax != null && !tax.isBlank() && companyRepository.existsByTaxCode(tax)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Mã số thuế đã được đăng ký cho doanh nghiệp khác: " + tax);
        }

        Instant now = Instant.now();
        Company company = Company.builder()
                .companyCode(code)
                .companyName(req.getCompanyName().trim())
                .taxCode(tax != null && !tax.isBlank() ? tax : null)
                .businessLicenseNumber(trimOrNull(req.getBusinessLicenseNumber()))
                .industry(trimOrNull(req.getIndustry()))
                .companyType(normalizeOrDefault(req.getCompanyType(), "B2B_CUSTOMER"))
                .companyPhone(trimOrNull(req.getCompanyPhone()))
                .companyEmail(trimOrNull(req.getCompanyEmail()))
                .headquartersAddress(trimOrNull(req.getHeadquartersAddress()))
                .representativeName(trimOrNull(req.getRepresentativeName()))
                .representativeTitle(trimOrNull(req.getRepresentativeTitle()))
                .creditTier(normalizeOrDefault(req.getCreditTier(), "STANDARD"))
                .creditLimitVnd(req.getCreditLimitVnd() != null ? Math.max(0L, req.getCreditLimitVnd()) : 0L)
                .kycStatus(normalizeOrDefault(req.getKycStatus(), "PENDING"))
                .isDeleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toResponse(companyRepository.save(company), 0L);
    }

    @Transactional
    public CompanyResponse updateCompany(UUID id, CompanyRequest req) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy hồ sơ công ty: " + id));

        if (req.getCompanyCode() != null && !req.getCompanyCode().isBlank()) {
            String nextCode = req.getCompanyCode().trim().toUpperCase(Locale.ROOT);
            if (!nextCode.equalsIgnoreCase(company.getCompanyCode())
                    && companyRepository.existsByCompanyCodeIgnoreCase(nextCode)) {
                throw new AppException(ErrorCode.USER_EXISTED, "Mã doanh nghiệp đã tồn tại: " + nextCode);
            }
            company.setCompanyCode(nextCode);
        }
        if (req.getCompanyName() != null && !req.getCompanyName().isBlank()) {
            company.setCompanyName(req.getCompanyName().trim());
        }
        if (req.getTaxCode() != null) {
            String tax = req.getTaxCode().trim();
            if (!tax.isBlank() && !tax.equals(company.getTaxCode()) && companyRepository.existsByTaxCode(tax)) {
                throw new AppException(ErrorCode.USER_EXISTED, "Mã số thuế đã được sử dụng: " + tax);
            }
            company.setTaxCode(tax.isBlank() ? null : tax);
        }
        if (req.getBusinessLicenseNumber() != null) company.setBusinessLicenseNumber(trimOrNull(req.getBusinessLicenseNumber()));
        if (req.getIndustry() != null) company.setIndustry(trimOrNull(req.getIndustry()));
        if (req.getCompanyType() != null && !req.getCompanyType().isBlank()) {
            company.setCompanyType(req.getCompanyType().trim().toUpperCase(Locale.ROOT));
        }
        if (req.getCompanyPhone() != null) company.setCompanyPhone(trimOrNull(req.getCompanyPhone()));
        if (req.getCompanyEmail() != null) company.setCompanyEmail(trimOrNull(req.getCompanyEmail()));
        if (req.getHeadquartersAddress() != null) company.setHeadquartersAddress(trimOrNull(req.getHeadquartersAddress()));
        if (req.getRepresentativeName() != null) company.setRepresentativeName(trimOrNull(req.getRepresentativeName()));
        if (req.getRepresentativeTitle() != null) company.setRepresentativeTitle(trimOrNull(req.getRepresentativeTitle()));
        if (req.getCreditTier() != null && !req.getCreditTier().isBlank()) {
            company.setCreditTier(req.getCreditTier().trim().toUpperCase(Locale.ROOT));
        }
        if (req.getCreditLimitVnd() != null) {
            company.setCreditLimitVnd(Math.max(0L, req.getCreditLimitVnd()));
        }
        if (req.getKycStatus() != null && !req.getKycStatus().isBlank()) {
            company.setKycStatus(req.getKycStatus().trim().toUpperCase(Locale.ROOT));
        }
        company.setUpdatedAt(Instant.now());
        Company saved = companyRepository.save(company);

        // Propagate company identity updates to linked users
        long linkedCount = 0L;
        for (User u : userRepository.findAll()) {
            if (saved.getId().equals(u.getCompanyId())) {
                u.setCompanyName(saved.getCompanyName());
                u.setTaxCode(saved.getTaxCode());
                u.setCustomerId(saved.getCompanyCode());
                u.setUpdatedAt(Instant.now());
                userRepository.save(u);
                if (!Boolean.TRUE.equals(u.getIsDeleted())) {
                    linkedCount++;
                }
            }
        }
        return toResponse(saved, linkedCount);
    }

    @Transactional
    public CompanyResponse softDeleteCompany(UUID id, String callerUsername) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy hồ sơ công ty: " + id));
        if ("CCADRO_INT".equalsIgnoreCase(company.getCompanyCode())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể xóa mềm công ty chủ quản CCADRO.");
        }
        Instant now = Instant.now();
        company.setIsDeleted(true);
        company.setDeletedAt(now);
        company.setDeletedBy(callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN");
        company.setUpdatedAt(now);
        return toResponse(companyRepository.save(company), 0L);
    }

    @Transactional
    public CompanyResponse restoreCompany(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy hồ sơ công ty: " + id));
        company.setIsDeleted(false);
        company.setDeletedAt(null);
        company.setDeletedBy(null);
        company.setUpdatedAt(Instant.now());
        return toResponse(companyRepository.save(company), 0L);
    }

    private CompanyResponse toResponse(Company c, long activeUserCount) {
        return companyMapper.toResponse(c, activeUserCount);
    }

    private static String trimOrNull(String val) {
        return val != null && !val.isBlank() ? val.trim() : null;
    }

    private static String normalizeOrDefault(String val, String fallback) {
        return val != null && !val.isBlank() ? val.trim().toUpperCase(Locale.ROOT) : fallback;
    }
}

