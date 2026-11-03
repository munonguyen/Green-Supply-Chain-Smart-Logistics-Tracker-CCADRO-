package com.ccadro.carbon.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FuelCostCalculationRequest {

    /**
     * Loại nhiên liệu (vd: DIESEL_DO_005S, DIESEL_DO_0001S, BIO_GASOLINE_E5, GASOLINE_RON95, BIODIESEL_B20, CNG_COMPRESSED, EV_GRID_VN)
     */
    String fuelType;

    /**
     * Hóa đơn tiền xăng/dầu thực tế (VNĐ). Nếu có, hệ thống tính theo TIER_1_PRIMARY.
     */
    BigDecimal actualFuelCostVnd;

    /**
     * Đơn giá bán lẻ có thể ghi đè nếu tài xế đổ giá đặc thù (VNĐ/Lít). Nếu null, lấy từ FuelPriceCatalog.
     */
    BigDecimal unitPriceVnd;

    /**
     * Tải trọng hàng hóa thực chở trên chuyến (tấn).
     */
    @NotNull(message = "cargoWeightTons must not be null")
    @DecimalMin(value = "0.01", message = "cargoWeightTons must be > 0")
    BigDecimal cargoWeightTons;

    /**
     * Quãng đường xe chạy thực tế theo GPS (km).
     */
    @NotNull(message = "distanceKm must not be null")
    @DecimalMin(value = "0.1", message = "distanceKm must be > 0")
    BigDecimal distanceKm;
}

