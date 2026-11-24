package com.ccadro.asset.fuel;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Component
public class VietnamFuelCatalog {
    public static final String VERSION = "VN-PLX-2026-11-19-EPA2025-v1";
    public static final Instant PRICE_AT = Instant.parse("2026-11-19T08:00:00Z");
    public static final String PRICE_SOURCE = "https://petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-dieu-chinh-gia-xang-dau-tu-15-gio-00-phut-ngay-19-11-2026.html";
    public static final String FACTOR_SOURCE = "https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf";
    public static final String SULFUR_SOURCE = "https://petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-la-tap-doan-nang-luong-dau-tien-phan-phoi-nhien-lieu-diezen-0001s-v-euro5-tai-viet-nam.html";
    public static final String ETHANOL_SOURCE = "https://www.eia.gov/energyexplained/biofuels/ethanol-use.php";
    public static final String MARKET_SOURCE = "https://moit.gov.vn/tin-tuc/tin-hieu-tich-cuc-sau-1-thang-xang-e10-duoc-ban-tren-toan-quoc.html";
    public static final BigDecimal GALLON_LITERS = new BigDecimal("3.785411784");
    public record Fuel(String code, String name, String family, int qualityLevel, Integer ron,
        Integer sulfurPpm, int ethanolPct, BigDecimal priceRegion1, BigDecimal priceRegion2,
        BigDecimal fossilCo2KgPerLiter, BigDecimal biogenicCo2KgPerLiter, BigDecimal energyIndex,
        String availabilityNote) {
        @com.fasterxml.jackson.annotation.JsonProperty
        public BigDecimal physicalCo2KgPerLiter() { return fossilCo2KgPerLiter.add(biogenicCo2KgPerLiter); }
    }
    private static BigDecimal perLiter(String kgPerGallon) {
        return new BigDecimal(kgPerGallon).divide(GALLON_LITERS, 8, RoundingMode.HALF_UP);
    }
    private static Fuel fuel(String code, String name, String family, int quality, Integer ron,
        Integer sulfur, int ethanol, int price1, int price2, String availability) {
        BigDecimal fraction = BigDecimal.valueOf(ethanol).movePointLeft(2);
        BigDecimal fossil = family.equals("DIESEL") ? perLiter("10.21")
            : perLiter("8.78").multiply(BigDecimal.ONE.subtract(fraction));
        BigDecimal bio = perLiter("5.75").multiply(fraction);
        BigDecimal energy = BigDecimal.ONE.subtract(fraction.multiply(new BigDecimal("0.33")));
        return new Fuel(code, name, family, quality, ron, sulfur, ethanol, BigDecimal.valueOf(price1),
            BigDecimal.valueOf(price2), fossil, bio, energy, availability);
    }
    private static final List<Fuel> FUELS = List.of(
        fuel("DIESEL_DO_0001S", "Diesel DO 0,001S-V", "DIESEL", 5, null, 10, 0, 28140, 28700, "Có trong bảng giá Petrolimex; xác nhận cửa hàng trên tuyến."),
        fuel("DIESEL_DO_005S", "Diesel DO 0,05S-II", "DIESEL", 2, null, 500, 0, 26340, 26860, "Có trong bảng giá Petrolimex; không dùng cho động cơ yêu cầu mức IV/V."),
        fuel("E10_RON95_V", "Xăng E10 RON95-V", "GASOLINE", 5, 95, null, 10, 21100, 21520, "Xăng E10; chủng loại mức V cần xác nhận tại cửa hàng."),
        fuel("E10_RON95_III", "Xăng E10 RON95-III", "GASOLINE", 3, 95, null, 10, 19100, 19480, "Xăng E10 trong danh mục bán lẻ Petrolimex."),
        fuel("E5_RON92_II", "Xăng E5 RON92-II", "GASOLINE", 2, 92, null, 5, 18570, 18940, "E5 vẫn có bán; độ phủ cửa hàng hạn chế hơn E10, cần xác nhận.")
    );
    public List<Fuel> all() { return FUELS; }
    public Fuel find(String code) { return FUELS.stream().filter(f -> f.code().equals(code)).findFirst().orElse(null); }
}
