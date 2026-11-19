package com.ccadro.asset.service;

import com.ccadro.asset.configuration.CcadroProperties;
import com.ccadro.asset.dto.request.DriverCreateRequest;
import com.ccadro.asset.dto.request.DriverDispatchMessageRequest;
import com.ccadro.asset.dto.request.DriverReviewRequest;
import com.ccadro.asset.dto.request.DriverUpdateRequest;
import com.ccadro.asset.dto.response.DriverDispatchMessageResponse;
import com.ccadro.asset.dto.response.DriverResponse;
import com.ccadro.asset.dto.response.DriverReviewResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.DriverDispatchMessage;
import com.ccadro.asset.entity.DriverReview;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.DriverMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.DriverDispatchMessageRepository;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.DriverReviewRepository;
import com.ccadro.asset.application.port.DriverCertificationCodec;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản trị hồ sơ chuẩn Grab Driver, giờ lái HOS, đánh giá khách hàng B2B và lệnh điều phối (UC01).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {

    DriverRepository driverRepository;
    DriverReviewRepository driverReviewRepository;
    DriverDispatchMessageRepository driverDispatchMessageRepository;
    ContainerRepository containerRepository;
    DriverMapper driverMapper;
    DriverCertificationCodec certificationCodec;
    CcadroProperties ccadroProperties;

    public List<DriverResponse> getAllDriversResponse(DriverStatus status, String licenseClass) {
        return getAllDriversResponse(status, licenseClass, null, false);
    }

    public List<DriverResponse> getAllDriversResponse(
            DriverStatus status,
            String licenseClass,
            String q,
            boolean includeDeleted) {
        List<Driver> drivers;
        if (status != null && licenseClass != null && !licenseClass.isBlank()) {
            drivers = driverRepository.findByStatusAndLicenseClassIgnoreCase(status, licenseClass.trim());
        } else if (status != null) {
            drivers = driverRepository.findByStatus(status);
        } else if (licenseClass != null && !licenseClass.isBlank()) {
            drivers = driverRepository.findByLicenseClassIgnoreCase(licenseClass.trim());
        } else {
            drivers = driverRepository.findAll();
        }
        List<Driver> active = drivers.stream()
                .filter(d -> includeDeleted || !Boolean.TRUE.equals(d.getIsDeleted()))
                .toList();
        List<Driver> ranked = ElasticSearchSupport.filterAndRank(
                active,
                q,
                d -> List.of(
                        new ElasticSearchSupport.WeightedField(d.getDriverCode(), 5.0),
                        new ElasticSearchSupport.WeightedField(d.getFullName(), 4.5),
                        new ElasticSearchSupport.WeightedField(d.getPhone(), 3.5),
                        new ElasticSearchSupport.WeightedField(d.getEmail(), 3.0),
                        new ElasticSearchSupport.WeightedField(d.getLicenseNumber(), 3.0),
                        new ElasticSearchSupport.WeightedField(d.getLicenseClass(), 2.5),
                        new ElasticSearchSupport.WeightedField(d.getHometown(), 2.0),
                        new ElasticSearchSupport.WeightedField(d.getStatus() != null ? d.getStatus().name() : "", 1.5)
                )
        );
        return ranked.stream().map(this::enrichDriverResponse).toList();
    }

    @Transactional
    public DriverResponse softDeleteDriver(UUID id, String deletedBy) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        driver.setIsDeleted(true);
        driver.setDeletedAt(Instant.now());
        driver.setDeletedBy(deletedBy != null && !deletedBy.isBlank() ? deletedBy : "ADMIN");
        return enrichDriverResponse(driverRepository.save(driver));
    }

    @Transactional
    public DriverResponse restoreDriver(UUID id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        driver.setIsDeleted(false);
        driver.setDeletedAt(null);
        driver.setDeletedBy(null);
        return enrichDriverResponse(driverRepository.save(driver));
    }

    public DriverResponse getDriverResponseById(UUID id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        return enrichDriverResponse(driver);
    }

    public DriverResponse getCurrentDriverProfile(String username) {
        return getCurrentDriverProfile(username, null);
    }

    public DriverResponse getCurrentDriverProfile(String username, String scope) {
        String normalized = username != null ? username.trim() : "";
        boolean hasExplicitScope = scope != null && !scope.isBlank();
        boolean hasDriverRoleInScope = hasExplicitScope
                && java.util.Arrays.asList(scope.trim().split("\\s+")).contains("ROLE_DRIVER");

        if (hasExplicitScope && !hasDriverRoleInScope) {
            throw new AppException(
                    ErrorCode.DRIVER_NOT_FOUND,
                    "Cảnh báo 404 Xác thực Phân hệ: Tài khoản '" + (normalized.isEmpty() ? "current" : normalized)
                            + "' không thuộc vai trò DRIVER nên không thể truy cập API khoang lái tài xế (/api/v1/assets/drivers/me). Vui lòng đăng xuất (Blacklist Token hiện tại) và đăng nhập lại bằng tài khoản DRIVER."
            );
        }

        Optional<Driver> matched = Optional.empty();
        if (!normalized.isBlank()) {
            matched = driverRepository.findByAccountUsernameIgnoreCase(normalized)
                    .or(() -> driverRepository.findByDriverCode(normalized))
                    .or(() -> driverRepository.findByEmailIgnoreCase(normalized))
                    .or(() -> {
                        String emailPrefix = normalized.toLowerCase() + "@";
                        return driverRepository.findAll().stream()
                                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                                .filter(d -> d.getEmail() != null && d.getEmail().toLowerCase().startsWith(emailPrefix))
                                .findFirst();
                    });
        }

        boolean allowDefaultDriverFallback = hasDriverRoleInScope || normalized.equalsIgnoreCase("driver");
        if (matched.isEmpty() && !allowDefaultDriverFallback) {
            throw new AppException(
                    ErrorCode.DRIVER_NOT_FOUND,
                    "Cảnh báo 404 Xác thực Phân hệ: Không tìm thấy hồ sơ Tài xế (DRIVER) gắn với tài khoản '"
                            + (normalized.isEmpty() ? "anonymous" : normalized)
                            + "'. Vui lòng đăng xuất và đăng nhập bằng tài khoản DRIVER."
            );
        }

        Driver driver = matched
                .or(() -> driverRepository.findAll().stream()
                        .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                        .findFirst())
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        return enrichDriverResponse(driver);
    }

    @Transactional
    public DriverResponse createDriver(DriverCreateRequest request) {
        if (driverRepository.findByDriverCode(request.getDriverCode()).isPresent()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Mã tài xế đã tồn tại: " + request.getDriverCode());
        }
        Driver driver = driverMapper.toEntity(request);
        if (driver.getLicenseClass() == null || driver.getLicenseClass().isBlank()) {
            driver.setLicenseClass("FC");
        }
        if (driver.getExperienceYears() == null) {
            driver.setExperienceYears(5);
        }
        if (driver.getEmail() == null || driver.getEmail().isBlank()) {
            driver.setEmail(driver.getDriverCode().toLowerCase() + "@ccadro-fleet.vn");
        }
        if (driver.getPreTripTime() == null || driver.getPreTripTime().isBlank()) {
            driver.setPreTripTime("Đã kiểm định hồ sơ mới (6/6 Đạt)");
        }
        if (request.getSafetyCerts() != null && !request.getSafetyCerts().isEmpty()) {
            driver.setSafetyCertsJson(serializeCerts(request.getSafetyCerts()));
        }
        Driver saved = driverRepository.save(driver);
        return enrichDriverResponse(saved);
    }

    @Transactional
    public DriverResponse updateDriverProfile(UUID id, DriverUpdateRequest request) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));

        if (request.getFullName() != null) driver.setFullName(request.getFullName());
        if (request.getPhone() != null) driver.setPhone(request.getPhone());
        if (request.getEmail() != null) driver.setEmail(request.getEmail());
        if (request.getDateOfBirth() != null) driver.setDateOfBirth(request.getDateOfBirth());
        if (request.getNationalId() != null) driver.setNationalId(request.getNationalId());
        if (request.getHometown() != null) driver.setHometown(request.getHometown());
        if (request.getAvatarUrl() != null) driver.setAvatarUrl(request.getAvatarUrl());
        if (request.getLicenseClass() != null) driver.setLicenseClass(request.getLicenseClass());
        if (request.getLicenseNumber() != null) driver.setLicenseNumber(request.getLicenseNumber());
        if (request.getLicenseExpiryDate() != null) driver.setLicenseExpiryDate(request.getLicenseExpiryDate());
        if (request.getExperienceYears() != null) driver.setExperienceYears(request.getExperienceYears());
        if (request.getHosContinuousMin() != null) driver.setHosContinuousMin(request.getHosContinuousMin());
        if (request.getHosDailyMin() != null) driver.setHosDailyMin(request.getHosDailyMin());
        if (request.getPreTripPassed() != null) driver.setPreTripPassed(request.getPreTripPassed());
        if (request.getPreTripTime() != null) driver.setPreTripTime(request.getPreTripTime());
        if (request.getAssignedVehiclePlate() != null) driver.setAssignedVehiclePlate(request.getAssignedVehiclePlate());
        if (request.getAssignedVehicleType() != null) driver.setAssignedVehicleType(request.getAssignedVehicleType());
        if (request.getSafetyCerts() != null) {
            driver.setSafetyCertsJson(serializeCerts(request.getSafetyCerts()));
        }

        return enrichDriverResponse(driverRepository.save(driver));
    }

    @Transactional
    public DriverResponse updateDriverStatus(UUID id, DriverStatus nextStatus) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));

        int continuousLimit = ccadroProperties.getHos().getContinuousLimitMinutes();
        int dailyLimit = ccadroProperties.getHos().getDailyLimitMinutes();
        if (nextStatus == DriverStatus.ON_TRIP && driver.getHosContinuousMin() >= continuousLimit) {
            throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE,
                    "Tài xế đã chạm ngưỡng giờ lái liên tục (" + continuousLimit + " phút), cần nghỉ ca HOS trước khi nhận chuyến.");
        }
        if (nextStatus == DriverStatus.ON_TRIP && driver.getHosDailyMin() >= dailyLimit) {
            throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE,
                    "Tài xế đã chạm ngưỡng giờ lái trong ngày (" + dailyLimit + " phút), cần nghỉ hết ca trước khi nhận chuyến.");
        }
        if (driver.getStatus() == DriverStatus.INACTIVE && nextStatus == DriverStatus.AVAILABLE) {
            driver.setHosContinuousMin(0);
        }

        driver.setStatus(nextStatus);
        return enrichDriverResponse(driverRepository.save(driver));
    }

    @Transactional
    public DriverReviewResponse addDriverReview(UUID driverId, DriverReviewRequest request) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));

        DriverReview review = DriverReview.builder()
                .driverId(driverId)
                .authorName(request.getAuthorName() != null && !request.getAuthorName().isBlank()
                        ? request.getAuthorName().trim()
                        : "Khách hàng Doanh nghiệp B2B")
                .shipmentCode(request.getShipmentCode())
                .rating(request.getRating())
                .comment(request.getComment())
                .createdAt(Instant.now())
                .build();
        DriverReview savedReview = driverReviewRepository.save(review);

        // Recalculate weighted Grab star rating
        BigDecimal currentRating = driver.getRating() != null ? driver.getRating() : BigDecimal.valueOf(4.95);
        BigDecimal newRating = currentRating.multiply(BigDecimal.TEN)
                .add(BigDecimal.valueOf(request.getRating()))
                .divide(BigDecimal.valueOf(11), 2, RoundingMode.HALF_UP);
        driver.setRating(newRating);
        driverRepository.save(driver);

        return driverMapper.toReviewResponse(savedReview);
    }

    public List<DriverReviewResponse> getDriverReviews(UUID driverId) {
        validateDriverExists(driverId);
        return driverMapper.toReviewResponseList(
                driverReviewRepository.findByDriverIdOrderByCreatedAtDesc(driverId));
    }

    @Transactional
    public DriverDispatchMessageResponse sendDispatchMessage(UUID driverId, DriverDispatchMessageRequest request) {
        validateDriverExists(driverId);
        String senderRole = request.getSenderRole() != null && !request.getSenderRole().isBlank()
                ? request.getSenderRole().trim().toUpperCase()
                : "CUSTOMER";
        String defaultSenderName = "DRIVER".equals(senderRole) ? "Tài xế Cabin" : "Khách hàng B2B";
        String messageType = request.getMessageType() != null && !request.getMessageType().isBlank()
                ? request.getMessageType().trim().toUpperCase()
                : "TEXT";

        DriverDispatchMessage message = DriverDispatchMessage.builder()
                .driverId(driverId)
                .senderName(request.getSenderName() != null && !request.getSenderName().isBlank()
                        ? request.getSenderName().trim()
                        : defaultSenderName)
                .senderRole(senderRole)
                .senderUsername(request.getSenderUsername())
                .containerCode(request.getContainerCode())
                .shipmentCode(request.getShipmentCode())
                .messageText(request.getMessageText().trim())
                .messageType(messageType)
                .channel(request.getChannel() != null && !request.getChannel().isBlank()
                        ? request.getChannel().trim()
                        : "GRAB_CHAT")
                .deliveryStatus("DRIVER".equals(senderRole) ? "DELIVERED_PORTAL" : "DELIVERED_CABIN_OS")
                .read(false)
                .createdAt(Instant.now())
                .build();
        return driverMapper.toMessageResponse(driverDispatchMessageRepository.save(message));
    }

    public List<DriverDispatchMessageResponse> getDriverDispatchMessages(UUID driverId) {
        validateDriverExists(driverId);
        return driverMapper.toMessageResponseList(
                driverDispatchMessageRepository.findByDriverIdOrderByCreatedAtAsc(driverId));
    }

    @Transactional
    public int markMessagesAsRead(UUID driverId, String viewerRole) {
        validateDriverExists(driverId);
        String normalizedViewer = viewerRole == null ? "CUSTOMER" : viewerRole.trim().toUpperCase();
        List<DriverDispatchMessage> messages = driverDispatchMessageRepository.findByDriverIdOrderByCreatedAtAsc(driverId);
        int updated = 0;
        for (DriverDispatchMessage msg : messages) {
            if (!msg.isRead() && !normalizedViewer.equalsIgnoreCase(msg.getSenderRole())) {
                msg.setRead(true);
                msg.setDeliveryStatus("READ");
                updated++;
            }
        }
        if (updated > 0) {
            driverDispatchMessageRepository.saveAll(messages);
        }
        return updated;
    }

    public void validateDriverExists(UUID driverId) {
        if (!driverRepository.existsById(driverId)) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }
    }

    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }

    public Optional<Driver> getDriverByCode(String code) {
        return driverRepository.findByDriverCode(code);
    }

    private DriverResponse enrichDriverResponse(Driver driver) {
        DriverResponse response = driverMapper.toResponse(driver);
        response.setSafetyCerts(parseCerts(driver.getSafetyCertsJson()));
        response.setHosContinuousLimitMin(ccadroProperties.getHos().getContinuousLimitMinutes());
        response.setHosDailyLimitMin(ccadroProperties.getHos().getDailyLimitMinutes());

        List<Container> driverContainers = containerRepository.findByAssignedDriverId(driver.getId());
        Container activeOrLatest = driverContainers.stream()
                .filter(c -> c.getStatus() == ContainerStatus.IN_TRANSIT)
                .findFirst()
                .orElse(driverContainers.isEmpty() ? null : driverContainers.get(0));

        if (activeOrLatest != null) {
            response.setAssignedContainerCode(activeOrLatest.getContainerCode());
            response.setAssignedShipmentCode(activeOrLatest.getAssignedShipmentCode());
            response.setLiveSpeedKmh(activeOrLatest.getSpeedKmh());
            response.setLiveProgressPct(activeOrLatest.getProgressPct());
            response.setLiveEtaMinutes(activeOrLatest.getEtaMinutes());
            response.setESealNumber(activeOrLatest.getESealNumber());
            if (activeOrLatest.getOriginName() != null && activeOrLatest.getDestinationName() != null) {
                response.setCurrentRoute(activeOrLatest.getOriginName() + " -> " + activeOrLatest.getDestinationName());
            }
            if (activeOrLatest.getVehicleLicensePlate() != null) {
                response.setAssignedVehiclePlate(activeOrLatest.getVehicleLicensePlate());
            }
        } else {
            response.setCurrentRoute("Sẵn sàng tại Depot TP.HCM");
        }

        response.setRecentReviews(driverMapper.toReviewResponseList(
                driverReviewRepository.findByDriverIdOrderByCreatedAtDesc(driver.getId())));
        response.setDispatchMessages(driverMapper.toMessageResponseList(
                driverDispatchMessageRepository.findByDriverIdOrderByCreatedAtDesc(driver.getId())));

        return response;
    }

    private List<String> parseCerts(String certsJson) {
        return certificationCodec.decode(certsJson);
    }

    private String serializeCerts(List<String> certs) {
        return certificationCodec.encode(certs);
    }
}
