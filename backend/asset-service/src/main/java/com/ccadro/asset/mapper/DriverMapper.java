package com.ccadro.asset.mapper;

import com.ccadro.asset.dto.request.DriverCreateRequest;
import com.ccadro.asset.dto.response.DriverDispatchMessageResponse;
import com.ccadro.asset.dto.response.DriverResponse;
import com.ccadro.asset.dto.response.DriverReviewResponse;
import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.DriverDispatchMessage;
import com.ccadro.asset.entity.DriverReview;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DriverMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "totalTrips", ignore = true)
    @Mapping(target = "onTimeRate", ignore = true)
    @Mapping(target = "ecoScore", ignore = true)
    @Mapping(target = "greenKmTotal", ignore = true)
    @Mapping(target = "violationsCount", ignore = true)
    @Mapping(target = "hosContinuousMin", ignore = true)
    @Mapping(target = "hosDailyMin", ignore = true)
    @Mapping(target = "preTripPassed", ignore = true)
    @Mapping(target = "preTripTime", ignore = true)
    @Mapping(target = "safetyCertsJson", ignore = true)
    Driver toEntity(DriverCreateRequest request);

    @Mapping(target = "safetyCerts", ignore = true)
    @Mapping(target = "hosContinuousLimitMin", ignore = true)
    @Mapping(target = "hosDailyLimitMin", ignore = true)
    @Mapping(target = "assignedContainerCode", ignore = true)
    @Mapping(target = "assignedShipmentCode", ignore = true)
    @Mapping(target = "currentRoute", ignore = true)
    @Mapping(target = "liveSpeedKmh", ignore = true)
    @Mapping(target = "liveProgressPct", ignore = true)
    @Mapping(target = "liveEtaMinutes", ignore = true)
    @Mapping(target = "eSealNumber", ignore = true)
    @Mapping(target = "recentReviews", ignore = true)
    @Mapping(target = "dispatchMessages", ignore = true)
    DriverResponse toResponse(Driver entity);

    List<DriverResponse> toResponseList(List<Driver> entities);

    DriverReviewResponse toReviewResponse(DriverReview review);

    List<DriverReviewResponse> toReviewResponseList(List<DriverReview> reviews);

    DriverDispatchMessageResponse toMessageResponse(DriverDispatchMessage message);

    List<DriverDispatchMessageResponse> toMessageResponseList(List<DriverDispatchMessage> messages);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "totalTrips", ignore = true)
    @Mapping(target = "onTimeRate", ignore = true)
    @Mapping(target = "ecoScore", ignore = true)
    @Mapping(target = "greenKmTotal", ignore = true)
    @Mapping(target = "violationsCount", ignore = true)
    @Mapping(target = "hosContinuousMin", ignore = true)
    @Mapping(target = "hosDailyMin", ignore = true)
    @Mapping(target = "preTripPassed", ignore = true)
    @Mapping(target = "preTripTime", ignore = true)
    @Mapping(target = "safetyCertsJson", ignore = true)
    void updateEntityFromRequest(DriverCreateRequest request, @MappingTarget Driver entity);
}
