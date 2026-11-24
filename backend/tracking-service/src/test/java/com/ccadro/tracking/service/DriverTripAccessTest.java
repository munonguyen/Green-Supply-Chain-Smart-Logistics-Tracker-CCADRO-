package com.ccadro.tracking.service;

import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DriverTripAccessTest {
    @Test
    void dispatcherCannotStartDriverTrip() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TrackingService tracking = mock(TrackingService.class);
        AppException exception = assertThrows(AppException.class,
                () -> new DriverTripAccess(jdbc, tracking).start(UUID.randomUUID(), "dispatcher", "ROLE_DISPATCHER"));
        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
        verifyNoInteractions(jdbc, tracking);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void missingTripInspectionBlocksStartAndDoesNotChangeAssets() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TrackingService tracking = mock(TrackingService.class);
        UUID driver = UUID.randomUUID(), tripId = UUID.randomUUID();
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(call ->
                call.getArgument(0, String.class).contains("FROM driver WHERE") ? List.of(driver) : List.of("SCHEDULED"));
        Trip trip = new Trip();
        trip.setId(tripId);
        trip.setShipmentId(UUID.randomUUID());
        trip.setVehicleId(UUID.randomUUID());
        trip.setDriverId(driver);
        when(tracking.getTripById(tripId)).thenReturn(trip);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), any(Object[].class))).thenAnswer(call ->
                !call.getArgument(0, String.class).contains("pre_trip_inspection"));
        AppException exception = assertThrows(AppException.class,
                () -> new DriverTripAccess(jdbc, tracking).start(tripId, "driver", "ROLE_DRIVER"));
        assertEquals(ErrorCode.PRE_TRIP_INSPECTION_FAILED, exception.getErrorCode());
        verify(tracking, never()).startTrip(any());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void failedContainerReinspectionBlocksStartEvenAfterDispatcherApprovedDeparture() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TrackingService tracking = mock(TrackingService.class);
        UUID driver = UUID.randomUUID(), tripId = UUID.randomUUID();
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(call -> {
            String sql = call.getArgument(0, String.class);
            if (sql.contains("FROM driver WHERE")) return List.of(driver);
            if (sql.contains("SELECT status FROM trip")) return List.of("SCHEDULED");
            return List.of();
        });
        Trip trip = new Trip(); trip.setId(tripId); trip.setShipmentId(UUID.randomUUID());
        trip.setVehicleId(UUID.randomUUID()); trip.setDriverId(driver);
        when(tracking.getTripById(tripId)).thenReturn(trip);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), any(Object[].class))).thenAnswer(call -> {
            String sql = call.getArgument(0, String.class);
            return !sql.contains("s.stage = 'DEPARTURE'");
        });
        AppException error = assertThrows(AppException.class,
            () -> new DriverTripAccess(jdbc, tracking).start(tripId, "driver", "ROLE_DRIVER"));
        assertEquals(ErrorCode.PRE_TRIP_INSPECTION_FAILED, error.getErrorCode());
        verify(tracking, never()).startTrip(any());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void authenticatedDriverCannotReadAnotherDriversTrip() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of(UUID.randomUUID()));
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), any(Object[].class))).thenReturn(false);
        AppException exception = assertThrows(AppException.class,
                () -> new DriverTripAccess(jdbc, mock(TrackingService.class)).requireOwner(UUID.randomUUID(), "driver"));
        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
    }
}
