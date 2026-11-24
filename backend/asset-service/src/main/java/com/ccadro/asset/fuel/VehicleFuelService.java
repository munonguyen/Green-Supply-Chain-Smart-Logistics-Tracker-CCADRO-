package com.ccadro.asset.fuel;

import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.VehicleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import static com.ccadro.asset.fuel.VehicleFuelDtos.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class VehicleFuelService {
    private final VehicleRepository vehicles;
    private final VehicleFuelProfileRepository profiles;
    private final VietnamFuelCatalog catalog;
    private final EntityManager em;
    public static final String SCOPE = "ESTIMATED_TTW_CO2_ONLY";
    private static final Instant REVIEWED_AT = Instant.parse("2026-11-21T00:00:00Z");
    private static final List<String> ASSUMPTIONS = List.of(
        "Dự toán CO₂ do đốt nhiên liệu (TTW), không phải CO₂e/GLEC WTW và không thay đổi sổ kiểm toán chuyến đã lưu.",
        "Hệ số tham chiếu EPA 2025 bảng 2: diesel 10,21; xăng 8,78; ethanol 5,75 kg CO₂/US gallon; 1 gallon = 3,785411784 lít. Chưa có chứng thư riêng của lô nhiên liệu Việt Nam.",
        "E5/E10 dùng tỷ lệ thể tích danh nghĩa 5%/10%; CO₂ sinh học được báo cáo riêng, vẫn có khí CO₂ tại ống xả. Chưa đánh giá phát thải thượng nguồn, CH₄, N₂O hay thay đổi sử dụng đất.",
        "Nếu chưa nhập tiêu hao đo riêng, xăng quy đổi theo năng lượng ethanol bằng 67% xăng; diesel cùng mức tiêu hao. Không tự gán lợi ích CO₂ cho mức lưu huỳnh hoặc RON cao hơn.",
        "Định mức xe phải tương ứng tải trọng và điều kiện vận hành đang so sánh. Giờ nổ máy chờ là phần tăng thêm ngoài định mức; chưa dự báo ùn tắc theo thời gian thực.",
        "Giá là ảnh chụp bảng Petrolimex 15:00 ngày 19/11/2026 (giá Vùng 2 là mức trần), không đồng bộ trực tiếp. Có thể nhập báo giá thực tế cho kịch bản.",
        "Chỉ xếp hạng loại tương thích và đã xác nhận có bán trên tuyến. HVO, B20, CNG và điện không được coi là nhiên liệu đổ thay trực tiếp cho xe diesel trong danh mục này."
    );
    public Catalog overview(String scope) {
        requireRead(scope);
        Map<UUID, VehicleFuelProfile> saved = new HashMap<>();
        profiles.findAll().forEach(p -> saved.put(p.getVehicleId(), p));
        var list = vehicles.findAll().stream().filter(v -> !Boolean.TRUE.equals(v.getIsDeleted()))
            .sorted(Comparator.comparing(Vehicle::getVehicleCode)).map(v -> {
                var profile = saved.get(v.getId());
                var fuel = profile == null ? null : catalog.find(profile.getSelectedFuelCode());
                BigDecimal physical = null, fossil = null, bio = null;
                if (fuel != null && profile.getAnnualKm() != null && compatible(v,profile,fuel).isEmpty()) {
                    BigDecimal liters = profile.getAnnualKm().multiply(profile.getConsumptionPer100Km()).movePointLeft(2);
                    physical = round(liters.multiply(fuel.physicalCo2KgPerLiter()));
                    fossil = round(liters.multiply(fuel.fossilCo2KgPerLiter()));
                    bio = round(liters.multiply(fuel.biogenicCo2KgPerLiter()));
                }
                return new VehicleSummary(v.getId(),v.getVehicleCode(),v.getPlateNumber(),v.getFuelType(),v.getEuroStandard(),
                    v.getStatus().name(),profile,physical,fossil,bio);
            }).toList();
        return new Catalog(VietnamFuelCatalog.VERSION,VietnamFuelCatalog.PRICE_AT,REVIEWED_AT,
            VietnamFuelCatalog.PRICE_SOURCE,VietnamFuelCatalog.FACTOR_SOURCE,VietnamFuelCatalog.SULFUR_SOURCE,
            VietnamFuelCatalog.MARKET_SOURCE,VietnamFuelCatalog.ETHANOL_SOURCE,catalog.all(),list,
            (int)list.stream().filter(v -> v.annualPhysicalCo2Kg()!=null).count(),
            (int)list.stream().filter(v -> v.profile()!=null).count(),
            list.stream().map(VehicleSummary::annualPhysicalCo2Kg).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add),
            list.stream().map(VehicleSummary::annualFossilCo2Kg).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add),
            list.stream().map(VehicleSummary::annualBiogenicCo2Kg).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add),SCOPE,ASSUMPTIONS);
    }
    public VehicleFuelProfile profile(UUID id, String scope) {
        requireRead(scope); vehicle(id,false); return profiles.findById(id).orElse(null);
    }
    @Transactional
    public VehicleFuelProfile save(UUID id, SaveProfile request, String actor, String scope) {
        requireWrite(scope);
        if(actor==null||actor.isBlank()) throw invalid("Thiếu danh tính người cập nhật.");
        Vehicle vehicle = vehicle(id,true);
        var fuel = requireFuel(request.selectedFuelCode());
        VehicleFuelProfile current = profiles.findById(id).orElse(null);
        if(request.expectedRevision()==null || (current==null ? request.expectedRevision()!=-1 : request.expectedRevision()!=current.getRevision()))
            throw invalid("Hồ sơ nhiên liệu đã thay đổi. Tải lại trước khi lưu để tránh ghi đè.");
        if(current==null) { current=new VehicleFuelProfile(); current.setVehicleId(id); }
        current.setSelectedFuelCode(fuel.code()); current.setConsumptionPer100Km(request.consumptionPer100Km());
        current.setAnnualKm(request.annualKm()); current.setMinRon(request.minRon()); current.setMaxEthanolPct(request.maxEthanolPct());
        current.setMaxSulfurPpm(request.maxSulfurPpm()); current.setMinQualityLevel(request.minQualityLevel());
        current.setCompatibilityEvidence(request.compatibilityEvidence().trim()); current.setConsumptionEvidence(request.consumptionEvidence().trim());
        if(current.getCompatibilityEvidence().length()<5||current.getConsumptionEvidence().length()<5)
            throw invalid("Cần ghi rõ nguồn đối chiếu tương thích và nguồn định mức tiêu hao.");
        var problems=compatible(vehicle,current,fuel);
        if(!problems.isEmpty())throw invalid(String.join(" ",problems));
        current.setUpdatedBy(actor);current.setUpdatedAt(Instant.now());return profiles.saveAndFlush(current);
    }
    public Assessment assess(UUID id, Scenario scenario, String scope) {
        requireRead(scope); Vehicle vehicle=vehicle(id,false);
        var profile=profiles.findById(id).orElseThrow(()->invalid("Khai báo nhiên liệu và định mức của xe trước khi so sánh."));
        var baseline=requireFuel(profile.getSelectedFuelCode());
        if(!compatible(vehicle,profile,baseline).isEmpty())throw invalid("Hồ sơ động cơ hoặc nhiên liệu hiện tại đã thay đổi; đối chiếu lại trước khi tính.");
        for(String code:scenario.availableFuelCodes())requireFuel(code);
        scenario.priceOverrides().keySet().forEach(this::requireFuel);
        scenario.consumptionOverrides().keySet().forEach(this::requireFuel);
        if(scenario.extraIdleHours().signum()>0 && scenario.idleLitersPerHour().signum()==0)
            throw invalid("Cần định mức lít/giờ khi thêm thời gian nổ máy chờ.");
        List<Work> work=new ArrayList<>();
        for(var fuel:catalog.all()) {
            var reasons=new ArrayList<>(compatible(vehicle,profile,fuel));boolean compatible=reasons.isEmpty();
            boolean available=scenario.availableFuelCodes().contains(fuel.code());
            if(!available)reasons.add("Chưa xác nhận có bán tại điểm tiếp nhiên liệu trên tuyến.");
            BigDecimal ratio=baseline.energyIndex().divide(fuel.energyIndex(),10,RoundingMode.HALF_UP);
            BigDecimal rate=scenario.consumptionOverrides().getOrDefault(fuel.code(),profile.getConsumptionPer100Km().multiply(ratio));
            BigDecimal price=scenario.priceOverrides().getOrDefault(fuel.code(),scenario.priceRegion()==2?fuel.priceRegion2():fuel.priceRegion1());
            BigDecimal liters=scenario.distanceKm().multiply(rate).movePointLeft(2)
                .add(scenario.extraIdleHours().multiply(scenario.idleLitersPerHour()).multiply(ratio));
            BigDecimal cost=liters.multiply(price),physical=liters.multiply(fuel.physicalCo2KgPerLiter());
            BigDecimal fossil=liters.multiply(fuel.fossilCo2KgPerLiter()),bio=liters.multiply(fuel.biogenicCo2KgPerLiter());
            work.add(new Work(fuel,compatible,available,compatible&&available,reasons,rate,price,liters,cost,physical,fossil,bio));
        }
        Work base=work.stream().filter(w->w.fuel.code().equals(baseline.code())).findFirst().orElseThrow();
        for(Work w:work)if(w.eligible && scenario.maxPremiumPct()!=null
            && w.cost.compareTo(base.cost.multiply(BigDecimal.ONE.add(scenario.maxPremiumPct().movePointLeft(2))))>0) {
            w.eligible=false;w.reasons.add("Vượt giới hạn tăng chi phí so với nhiên liệu đang dùng.");
        }
        List<Work> eligible=work.stream().filter(w->w.eligible).toList();
        String recommendation=null;
        if(!eligible.isEmpty()) {
            BigDecimal minCost=eligible.stream().map(w->w.cost).min(BigDecimal::compareTo).orElseThrow();
            BigDecimal maxCost=eligible.stream().map(w->w.cost).max(BigDecimal::compareTo).orElseThrow();
            BigDecimal minCarbon=eligible.stream().map(w->metric(w,scenario)).min(BigDecimal::compareTo).orElseThrow();
            BigDecimal maxCarbon=eligible.stream().map(w->metric(w,scenario)).max(BigDecimal::compareTo).orElseThrow();
            BigDecimal weight=BigDecimal.valueOf(scenario.carbonWeightPct()).movePointLeft(2);
            for(Work w:eligible) {
                w.score=normalize(w.cost,minCost,maxCost).multiply(BigDecimal.ONE.subtract(weight))
                    .add(normalize(metric(w,scenario),minCarbon,maxCarbon).multiply(weight));
                w.pareto=eligible.stream().noneMatch(other->other!=w && other.cost.compareTo(w.cost)<=0
                    && metric(other,scenario).compareTo(metric(w,scenario))<=0
                    && (other.cost.compareTo(w.cost)<0||metric(other,scenario).compareTo(metric(w,scenario))<0));
            }
            recommendation=eligible.stream().min(Comparator.comparing((Work w)->w.score)
                .thenComparing(w->metric(w,scenario)).thenComparing(w->w.cost).thenComparing(w->w.fuel.code())).orElseThrow().fuel.code();
        }
        String explanation=recommendation==null?"Chưa có phương án thỏa điều kiện tương thích, nguồn cung và giới hạn chi phí."
            :"Lọc tương thích và nguồn cung trước; tối thiểu hóa điểm chi phí/CO₂ chuẩn hóa min-max theo trọng số đã chọn (điểm thấp hơn tốt hơn). Khi bằng điểm, ưu tiên CO₂ rồi chi phí thấp hơn. Mức lưu huỳnh thấp không tự nhận giảm CO₂.";
        var candidates=work.stream().map(w->new Candidate(w.fuel.code(),w.fuel.name(),w.compatible,w.available,w.eligible,w.reasons,
            round3(w.rate),scenario.consumptionOverrides().containsKey(w.fuel.code())?"USER_MEASURED":w.fuel.code().equals(baseline.code())?"VEHICLE_PROFILE":"ENERGY_EQUIVALENT_ESTIMATE",
            round3(w.liters),round(w.price),scenario.priceOverrides().containsKey(w.fuel.code())?"USER_QUOTE":"PETROLIMEX_2026_11_19_REGION_"+scenario.priceRegion(),
            round(w.cost),round(w.physical),round(w.fossil),round(w.bio),w.score==null?null:w.score.setScale(6,RoundingMode.HALF_UP),w.pareto,
            round(w.cost.subtract(base.cost)),round(w.physical.subtract(base.physical)))).toList();
        return new Assessment(id,VietnamFuelCatalog.VERSION,Instant.now(),baseline.code(),recommendation,scenario.carbonMetric(),scenario.carbonWeightPct(),explanation,candidates,SCOPE,ASSUMPTIONS);
    }
    private BigDecimal metric(Work w,Scenario s) { return "FOSSIL_CO2".equals(s.carbonMetric())?w.fossil:w.physical; }
    private BigDecimal normalize(BigDecimal n,BigDecimal min,BigDecimal max) { return max.compareTo(min)==0?BigDecimal.ZERO:n.subtract(min).divide(max.subtract(min),12,RoundingMode.HALF_UP); }
    List<String> compatible(Vehicle v,VehicleFuelProfile p,VietnamFuelCatalog.Fuel f) {
        List<String> issues=new ArrayList<>();String family=family(v.getFuelType());
        if(family==null) { issues.add("Chưa hỗ trợ so sánh xăng/dầu cho hệ động lực này; không tự chuyển đổi động cơ.");return issues; }
        if(!family.equals(f.family())) { issues.add("Khác hệ nhiên liệu của động cơ: "+v.getFuelType()+".");return issues; }
        int euro=0;
        try { euro=Integer.parseInt(v.getEuroStandard().replaceAll("[^0-9]","")); } catch(Exception ignored) {}
        int required=Math.max(p.getMinQualityLevel(),Math.min(5,euro));
        if(f.qualityLevel()<required)issues.add("Chất lượng nhiên liệu mức "+f.qualityLevel()+" thấp hơn yêu cầu mức "+required+".");
        if(family.equals("DIESEL")) {
            if(p.getMaxSulfurPpm()==null)issues.add("Chưa khai báo ngưỡng lưu huỳnh theo hồ sơ động cơ.");
            else if(f.sulfurPpm()>p.getMaxSulfurPpm())issues.add("Vượt ngưỡng lưu huỳnh "+p.getMaxSulfurPpm()+" ppm của xe.");
        } else {
            if(p.getMinRon()==null||p.getMaxEthanolPct()==null)issues.add("Chưa khai báo RON tối thiểu và tỷ lệ ethanol tối đa theo hãng.");
            else { if(f.ron()<p.getMinRon())issues.add("RON thấp hơn yêu cầu "+p.getMinRon()+".");
                if(f.ethanolPct()>p.getMaxEthanolPct())issues.add("Tỷ lệ ethanol vượt giới hạn hãng cho phép."); }
        }
        return issues;
    }
    public static String family(String fuelType) {
        if(fuelType==null)return null;
        return switch(fuelType.trim().toUpperCase(Locale.ROOT)) {
            case "DIESEL" -> "DIESEL"; case "GASOLINE", "PETROL" -> "GASOLINE"; default -> null;
        };
    }
    private Vehicle vehicle(UUID id,boolean lock) {
        Vehicle v=lock?em.find(Vehicle.class,id,LockModeType.PESSIMISTIC_WRITE):vehicles.findById(id).orElse(null);
        if(v==null||Boolean.TRUE.equals(v.getIsDeleted()))throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);return v;
    }
    private VietnamFuelCatalog.Fuel requireFuel(String code) { var fuel=catalog.find(code);if(fuel==null)throw invalid("Nhiên liệu không nằm trong danh mục thị trường đã xác minh: "+code);return fuel; }
    private void requireRead(String scope) { requireRole(scope,Set.of("ADMIN","DISPATCHER","SAFETY_MANAGER","ESG_AUDITOR")); }
    private void requireWrite(String scope) { requireRole(scope,Set.of("ADMIN","DISPATCHER","SAFETY_MANAGER")); }
    private void requireRole(String scope,Set<String> roles) { var granted=scope==null?List.<String>of():Arrays.asList(scope.trim().split("\\s+"));if(roles.stream().noneMatch(r->granted.contains("ROLE_"+r)))throw new AppException(ErrorCode.UNAUTHORIZED); }
    private AppException invalid(String s) { return new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,s); }
    private static BigDecimal round(BigDecimal n) {return n.setScale(2,RoundingMode.HALF_UP);}
    private static BigDecimal round3(BigDecimal n) {return n.setScale(3,RoundingMode.HALF_UP);}
    private static class Work {
        final VietnamFuelCatalog.Fuel fuel;final boolean compatible,available;boolean eligible,pareto;
        final List<String> reasons;final BigDecimal rate,price,liters,cost,physical,fossil,bio;BigDecimal score;
        Work(VietnamFuelCatalog.Fuel f,boolean c,boolean a,boolean e,List<String> r,BigDecimal rate,BigDecimal price,BigDecimal liters,BigDecimal cost,BigDecimal physical,BigDecimal fossil,BigDecimal bio) {
            fuel=f;compatible=c;available=a;eligible=e;reasons=r;this.rate=rate;this.price=price;this.liters=liters;this.cost=cost;this.physical=physical;this.fossil=fossil;this.bio=bio;
        }
    }
}
