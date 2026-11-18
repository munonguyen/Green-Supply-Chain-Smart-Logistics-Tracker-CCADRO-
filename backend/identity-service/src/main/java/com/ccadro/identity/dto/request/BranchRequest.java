package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchRequest {
    @NotBlank(message = "Mã chi nhánh không được để trống")
    String branchCode;

    @NotBlank(message = "Tên chi nhánh không được để trống")
    String branchName;

    String region;
    String branchType;

    @NotBlank(message = "Thành phố / tỉnh không được để trống")
    String city;

    String address;
    String phone;
    String email;
    String managerUsername;
    String managerName;

    @Min(value = 0, message = "Sức chứa đội xe không được âm")
    Integer vehicleCapacity;

    @Min(value = 0, message = "Chỉ tiêu doanh thu tháng không được âm")
    Long monthlyRevenueTargetVnd;

    String status;
}
