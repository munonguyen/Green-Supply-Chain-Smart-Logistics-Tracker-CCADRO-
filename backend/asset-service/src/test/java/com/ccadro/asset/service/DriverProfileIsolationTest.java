package com.ccadro.asset.service;

import com.ccadro.asset.configuration.CcadroProperties;
import com.ccadro.asset.dto.response.DriverResponse;
import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.DriverMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.DriverDispatchMessageRepository;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.DriverReviewRepository;
import com.ccadro.asset.application.port.DriverCertificationCodec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DriverProfileIsolationTest {

    @Mock
    DriverRepository driverRepository;
    @Mock
    DriverReviewRepository driverReviewRepository;
    @Mock
    DriverDispatchMessageRepository driverDispatchMessageRepository;
    @Mock
    ContainerRepository containerRepository;
    @Mock
    DriverMapper driverMapper;

    DriverService driverService;

    @BeforeEach
    void setUp() {
        driverService = new DriverService(
                driverRepository,
                driverReviewRepository,
                driverDispatchMessageRepository,
                containerRepository,
                driverMapper,
                mock(DriverCertificationCodec.class),
                new CcadroProperties()
        );
    }

    @Test
    void getCurrentDriverProfile_shouldRejectAdminWith404AndAllowDriver() {
        AppException adminDenied = assertThrows(
                AppException.class,
                () -> driverService.getCurrentDriverProfile("admin", "ROLE_ADMIN USER_MANAGE")
        );
        assertEquals(ErrorCode.DRIVER_NOT_FOUND, adminDenied.getErrorCode());

        UUID drvId = UUID.fromString("11111111-1111-4111-8111-111111110001");
        Driver driverEntity = Driver.builder()
                .id(drvId)
                .driverCode("DRV-FC-001")
                .accountUsername("driver")
                .fullName("Nguyễn Văn Tài")
                .status(DriverStatus.ON_TRIP)
                .build();
        driverEntity.setIsDeleted(false);
        DriverResponse mapped = DriverResponse.builder()
                .id(drvId)
                .driverCode("DRV-FC-001")
                .accountUsername("driver")
                .fullName("Nguyễn Văn Tài")
                .build();

        when(driverRepository.findByAccountUsernameIgnoreCaseAndIsDeletedFalse("driver")).thenReturn(Optional.of(driverEntity));
        when(driverMapper.toResponse(driverEntity)).thenReturn(mapped);

        DriverResponse result = driverService.getCurrentDriverProfile("driver", "ROLE_DRIVER POD_SUBMIT");
        assertEquals("DRV-FC-001", result.getDriverCode());
        assertEquals("driver", result.getAccountUsername());
    }
}
