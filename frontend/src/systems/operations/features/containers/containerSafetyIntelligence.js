/**
 * Quantitative Container & Tractor-Trailer Safety Scoring Engine
 * Grounded in QCVN 34:2011/BGTVT (Tires), IICL-6 / TB-021 (Structure),
 * CSC 1972 (Periodic Examination <= 30 mo), and Reefer PTI Tolerances.
 *
 * Outputs exact: damagePct (0-100), safetyPct (0-100), repairablePct (0-100),
 * postRepairSafetyPct (0-100), concrete repair action, and telemetry auto-baseline.
 */

import { evaluateMetricBound, resolveInspectionItemSpec } from './containerInspectionCriteria';

const WEIGHTS = {
  tires_brakes_axle: 22,
  frame_corner_castings: 18,
  doors_locking: 12,
  floor_deck: 12,
  walls_roof: 12,
  csc_plate: 10,
  reefer_unit_mount: 14,
  reefer_power_control: 12,
  reefer_setpoint_test: 14,
  reefer_alarm_airflow: 10,
  reefer_insulation_drain: 10
};

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(v)));

function evaluateTireAxle(measurements, criteriaResults) {
  const tread = measurements.tread_depth_mm !== undefined ? Number(measurements.tread_depth_mm) : null;
  const psi = measurements.tire_pressure_psi !== undefined ? Number(measurements.tire_pressure_psi) : null;
  const brake = measurements.brake_lining_mm !== undefined ? Number(measurements.brake_lining_mm) : null;

  let safety = 100;
  let damage = 0;
  let repairable = 0;
  let action = 'Duy trì tuần hoàn lốp mỗi 10.000 km & kiểm áp suất chuẩn 110 PSI.';

  if (tread != null && Number.isFinite(tread)) {
    // New heavy truck/trailer radial tire = 14.0mm, legal TWI = 1.6mm, safety advisory = 3.2mm
    const wearRatio = Math.max(0, Math.min(1, (14 - tread) / (14 - 1.6)));
    damage = clamp(wearRatio * 100);
    if (tread < 1.6) {
      safety = 0;
      repairable = 0;
      action = 'Lốp dưới chuẩn QCVN (< 1,6 mm TWI): KHÔNG ĐƯỢC SỬA/ĐẮP, bắt buộc thay lốp mới.';
    } else if (tread < 3.2) {
      safety = clamp(35 + ((tread - 1.6) / 1.6) * 29);
      repairable = 82;
      action = 'Gai lốp 1,6–3,2 mm (cảnh báo trượt nước): Có thể đắp gai/retread khung bố thép để khôi phục ~82% tuổi thọ an toàn.';
    } else {
      safety = clamp(65 + ((tread - 3.2) / (14 - 3.2)) * 35);
      repairable = damage > 10 ? 90 : 0;
      action = damage > 40 ? 'Đảo vị trí lốp giữa các trục & cân bằng động giúp khôi phục tối ưu độ mòn.' : action;
    }
  }

  if (psi != null && Number.isFinite(psi) && (psi < 95 || psi > 125)) {
    const psiPenalty = clamp(Math.abs(psi - 110) * 1.1, 10, 45);
    safety = Math.min(safety, 100 - psiPenalty);
    damage = Math.max(damage, psiPenalty);
    if (tread == null || tread >= 1.6) {
      repairable = Math.max(repairable, 95);
      action = `Áp suất đo ${psi} PSI lệch chuẩn (100–120 PSI): Bơm bù / kiểm tra van ty khôi phục ~95% an toàn tức thì.`;
    }
  }

  if (brake != null && Number.isFinite(brake) && brake < 4) {
    safety = Math.min(safety, clamp((brake / 4) * 35));
    damage = Math.max(damage, clamp(100 - (brake / 18) * 100));
    repairable = 100;
    action = `Má phanh khí nén còn ${brake} mm (< 4 mm): Tán/thay bố phanh trục moóc để khôi phục 100% hiệu quả phanh.`;
  }

  if (tread == null && psi == null && brake == null && Object.keys(criteriaResults).length === 0) {
    return null;
  }
  return { damage, safety, repairable, action };
}

function defaultRepairAction(key, damage) {
  if (damage <= 10) return 'Đạt tiêu chuẩn vận hành, tiếp tục theo dõi theo lịch định kỳ.';
  switch (key) {
    case 'frame_corner_castings':
      return damage >= 75
        ? 'Nứt/biến dạng nặng vượt IICL: Cắt thay cụm góc đúc hoặc ghép thanh theo IICL TB-021 (khôi phục ~95%).'
        : 'Nắn ép thủy lực & gia cường mối hàn đạt chuẩn IICL-6 (khôi phục ~92%).';
    case 'floor_deck':
    case 'dry_floor_support':
      return damage >= 65
        ? 'Thay tấm ván sàn gỗ phenolic 28mm & xà ngang hư hại (khôi phục ~98%).'
        : 'Bào phẳng bậc ván > 5 mm, xiết vít chìm & gia cố điểm tỳ/khuyên lashing (khôi phục ~95%).';
    case 'walls_roof':
      return 'Nắn phẳng tấm tôn, hàn vá mảng corten & bắn keo chống thấm WWT đường viền nóc (khôi phục ~92%).';
    case 'doors_locking':
      return 'Thay gioăng EPDM 4 cạnh cửa, nắn thanh cam khóa & siết bản lề (khôi phục ~98%).';
    case 'cleanliness_cargo':
      return 'Rửa áp lực cao 150 bar, sấy khô & khử mùi sinh học (khôi phục 100%).';
    case 'csc_plate':
      return 'Đăng kiểm lại chu kỳ CSC ≤ 30 tháng hoặc cập nhật số ACEP hợp lệ (khôi phục 100%).';
    case 'reefer_unit_mount':
      return damage >= 75
        ? 'Thay phớt cơ khí, siết bu-lông mô-men chuẩn & nạp bù môi chất R452A (khôi phục ~90%).'
        : 'Siết chặt giá đỡ cụm lạnh & kiểm tra dò rỉ đầu nối bằng nitơ (khôi phục ~96%).';
    case 'reefer_power_control':
      return 'Thay phích CEE 32A / sấy cuộn dây cách điện ≥ 2 MΩ (khôi phục ~96%).';
    case 'reefer_setpoint_test':
      return 'Hiệu chuẩn lại 2 đầu dò Supply/Return về sai số ±0,3 °C & chạy PTI Pull-down (khôi phục ~95%).';
    case 'reefer_alarm_airflow':
      return 'Xử lý mã cảnh báo ECU, vệ sinh thông rãnh sàn chữ T (khôi phục ~98%).';
    case 'reefer_insulation_drain':
      return 'Thông tắc phễu xả đá Kazoo & thay gioăng cách nhiệt cửa lạnh (khôi phục ~96%).';
    default:
      return 'Khắc phục kỹ thuật theo tiêu chuẩn bảo dưỡng CCADRO (khôi phục ~90%).';
  }
}

export const AHI_BANDS = [
  { id: 'A', pct: 95, minPct: 85, label: 'Hạng A · Nguyên trạng (IICL)', shortLabel: '95% · Hạng A', pass: true, summary: 'Đạt chuẩn kỹ thuật IICL-6 / ISO 55000 (Hạng A — Sẵn sàng chạy tuyến dài).' },
  { id: 'B', pct: 78, minPct: 70, label: 'Hạng B · Hao mòn nhẹ (Đạt)', shortLabel: '78% · Hạng B', pass: true, summary: 'Đạt ngưỡng vận hành (Hạng B — Hao mòn nhẹ trong dung sai cho phép).' },
  { id: 'C', pct: 58, minPct: 50, label: 'Hạng C · Hư hại TB (Cần sửa)', shortLabel: '58% · Hạng C', pass: false, summary: 'Không đạt (Hạng C — Vượt dung sai, cần khắc phục kỹ thuật trước xuất bến).' },
  { id: 'D', pct: 25, minPct: 0, label: 'Hạng D · Nghiêm trọng (Thay/Dừng)', shortLabel: '25% · Hạng D', pass: false, summary: 'Không đạt nghiêm trọng (Hạng D — Hư hại nặng hoặc tỷ lệ sửa > 45% RAV, dừng khai thác).' }
];

export function resolveAhiBand(pct) {
  if (pct == null) return null;
  if (pct >= 85) return AHI_BANDS[0];
  if (pct >= 70) return AHI_BANDS[1];
  if (pct >= 50) return AHI_BANDS[2];
  return AHI_BANDS[3];
}

/**
 * Evaluates a single component checkpoint quantitatively using ISO 55000 AHI % + physical tolerances.
 */
export function computePartSafetyAssessment(item, checkResult = {}) {
  const spec = resolveInspectionItemSpec(item);
  const criteria = spec.criteria || [];
  const measurements = checkResult.measurements || {};
  const criteriaResults = checkResult.criteriaResults || {};
  const status = checkResult.status || '';
  const explicitCondition = measurements._conditionPct !== undefined && measurements._conditionPct !== ''
    ? Number(measurements._conditionPct)
    : null;

  // Dedicated high-precision model for Tires & Brakes
  if (item.key === 'tires_brakes_axle') {
    const tireStats = evaluateTireAxle(measurements, criteriaResults);
    if (tireStats) {
      const postRepair =
        tireStats.repairable === 0
          ? tireStats.safety
          : clamp(tireStats.safety + ((100 - tireStats.safety) * tireStats.repairable) / 100);
      const repairCostRatioPct = clamp(tireStats.damage * 0.65);
      return {
        evaluated: true,
        damagePct: tireStats.damage,
        safetyPct: tireStats.safety,
        repairablePct: tireStats.repairable,
        postRepairSafetyPct: postRepair,
        repairCostRatioPct,
        band: resolveAhiBand(tireStats.safety),
        recommendedAction: tireStats.action,
        source: Object.keys(measurements).length > 0 ? 'MEASURED' : 'CRITERIA'
      };
    }
  }

  // Generic quantitative scoring from metric tolerances (mm / °C / PSI / V / MΩ / months)
  const measuredEntries = criteria.filter(
    (c) => measurements[c.code] !== undefined && measurements[c.code] !== ''
  );
  const scoredCriteria = criteria.filter((c) => criteriaResults[c.code]);

  if (explicitCondition != null && Number.isFinite(explicitCondition) && measuredEntries.length === 0) {
    const safetyPct = clamp(explicitCondition);
    const damagePct = clamp(100 - safetyPct);
    const repairCostRatioPct = clamp(damagePct * 0.62);
    const repairablePct = damagePct === 0 ? 0 : repairCostRatioPct > 45 ? 0 : 92;
    const postRepairSafetyPct = clamp(safetyPct + ((100 - safetyPct) * repairablePct) / 100);
    return {
      evaluated: true,
      damagePct,
      safetyPct,
      repairablePct,
      postRepairSafetyPct,
      repairCostRatioPct,
      band: resolveAhiBand(safetyPct),
      recommendedAction:
        repairCostRatioPct > 45
          ? `Tỷ lệ chi phí sửa ~${repairCostRatioPct}% (> 45% giá trị bộ phận theo IICL): Khuyến nghị thay mới thay vì sửa chữa chắp vá.`
          : defaultRepairAction(item.key, damagePct),
      source: 'PERCENTAGE'
    };
  }

  if (measuredEntries.length > 0 || scoredCriteria.length > 0) {
    let totalDamage = 0;
    let count = 0;

    for (const c of criteria) {
      const raw = measurements[c.code];
      const critState = criteriaResults[c.code];
      if (raw !== undefined && raw !== '') {
        const val = Number(raw);
        count++;
        if (Number.isFinite(val)) {
          const bound = evaluateMetricBound(c, val);
          if (bound === 'OUT_OF_RANGE') {
            totalDamage += 85;
          } else if (c.maxValue != null && c.minValue != null && c.maxValue > c.minValue && c.minValue === 0) {
            totalDamage += clamp((val / c.maxValue) * 45);
          } else if (critState === 'FAIL') {
            totalDamage += 80;
          }
        }
      } else if (critState) {
        count++;
        totalDamage += critState === 'FAIL' ? 85 : 0;
      }
    }

    const damagePct = count > 0 ? clamp(totalDamage / count) : status === 'FAIL' ? 75 : 0;
    const safetyPct = clamp(100 - damagePct);
    const repairCostRatioPct = clamp(damagePct * 0.62);
    const repairablePct =
      damagePct === 0 ? 0 : item.key === 'frame_corner_castings' && damagePct >= 90 ? 0 : 92;
    const postRepairSafetyPct = clamp(safetyPct + ((100 - safetyPct) * repairablePct) / 100);

    return {
      evaluated: true,
      damagePct,
      safetyPct,
      repairablePct,
      postRepairSafetyPct,
      repairCostRatioPct,
      band: resolveAhiBand(safetyPct),
      recommendedAction: defaultRepairAction(item.key, damagePct),
      source: measuredEntries.length > 0 ? 'MEASURED' : 'CRITERIA'
    };
  }

  if (status === 'PASS') {
    return {
      evaluated: true,
      damagePct: 0,
      safetyPct: 100,
      repairablePct: 0,
      postRepairSafetyPct: 100,
      repairCostRatioPct: 0,
      band: AHI_BANDS[0],
      recommendedAction: 'Đạt chuẩn vận hành.',
      source: 'MANUAL'
    };
  }

  if (status === 'FAIL') {
    return {
      evaluated: true,
      damagePct: 80,
      safetyPct: 20,
      repairablePct: 88,
      postRepairSafetyPct: clamp(20 + 80 * 0.88),
      repairCostRatioPct: 50,
      band: AHI_BANDS[3],
      recommendedAction: defaultRepairAction(item.key, 80),
      source: 'MANUAL'
    };
  }

  return {
    evaluated: false,
    damagePct: null,
    safetyPct: null,
    repairablePct: null,
    postRepairSafetyPct: null,
    repairCostRatioPct: null,
    band: null,
    recommendedAction: 'Kéo thanh % tình trạng hoặc đo thông số thực tế trực tiếp trên điểm.',
    source: 'PENDING'
  };
}

/**
 * Computes weighted overall safety index, damage average, and repair potential across the vehicle+container.
 */
export function computeCompositeFleetSafety(template = [], checks = {}) {
  let weightedSafetySum = 0;
  let totalWeight = 0;
  let damageSum = 0;
  let evaluatedCount = 0;
  let postRepairSum = 0;
  let blockerCount = 0;
  let lowestPart = null;

  for (const item of template) {
    const assessment = computePartSafetyAssessment(item, checks[item.key]);
    const weight = WEIGHTS[item.key] || 10;
    if (assessment.evaluated) {
      evaluatedCount++;
      weightedSafetySum += assessment.safetyPct * weight;
      totalWeight += weight;
      damageSum += assessment.damagePct;
      postRepairSum += assessment.postRepairSafetyPct * weight;

      if (assessment.safetyPct < 50 || checks[item.key]?.status === 'FAIL') {
        blockerCount++;
      }
      if (!lowestPart || assessment.safetyPct < lowestPart.assessment.safetyPct) {
        lowestPart = { item, assessment };
      }
    }
  }

  const coveragePct = template.length ? clamp((evaluatedCount / template.length) * 100) : 0;
  let overallSafetyPct = totalWeight > 0 ? clamp(weightedSafetySum / totalWeight) : null;
  if (overallSafetyPct != null && blockerCount > 0) {
    // Critical safety blocker prevents high composite score masking a dangerous defect
    overallSafetyPct = Math.min(overallSafetyPct, 45);
  }
  const overallDamagePct = evaluatedCount > 0 ? clamp(damageSum / evaluatedCount) : null;
  const maxRecoverableSafetyPct =
    totalWeight > 0 ? clamp(postRepairSum / totalWeight) : null;

  return {
    coveragePct,
    evaluatedCount,
    totalCount: template.length,
    overallSafetyPct,
    overallDamagePct,
    maxRecoverableSafetyPct,
    blockerCount,
    lowestPart,
    grade:
      overallSafetyPct == null
        ? 'PENDING'
        : overallSafetyPct >= 85 && blockerCount === 0
          ? 'SAFE'
          : overallSafetyPct >= 60 && blockerCount === 0
            ? 'ADVISORY'
            : 'BLOCKED'
  };
}

/**
 * Auto-populates measurable baseline checks from live Container dossier & IoT telemetry
 * so operators verify/adjust anomalies rather than filling every field by hand.
 */
export function buildTelemetryAutoChecks(template = [], container = {}, existingChecks = {}, now = Date.now()) {
  const next = { ...existingChecks };
  let appliedCount = 0;

  const tempVal =
    container.supplyAirTempC != null
      ? Number(container.supplyAirTempC)
      : container.temperature != null
        ? Number(container.temperature)
        : null;
  const targetTemp =
    container.reeferSetPointTempC != null
      ? Number(container.reeferSetPointTempC)
      : container.targetTemp != null
        ? Number(container.targetTemp)
        : tempVal;

  for (const item of template) {
    const prev = next[item.key];
    // Preserve any user-edited measurements or failures
    if (prev?.status && prev?.measurements && Object.keys(prev.measurements).length > 0) continue;

    if (item.key === 'csc_plate' && container.cscNextExaminationDate) {
      const nextExamMs = new Date(container.cscNextExaminationDate).getTime();
      const monthsLeft = Math.round((nextExamMs - now) / (30 * 24 * 3600 * 1000));
      const monthsElapsed = Math.max(0, 30 - monthsLeft);
      const expired = monthsLeft < 0 && container.cscInspectionScheme !== 'ACEP';
      next[item.key] = {
        key: item.key,
        status: expired ? 'FAIL' : 'PASS',
        notes: expired
          ? `[Đánh giá ${expired ? 25 : 95}%] Tự động từ hồ sơ CSC: Quá hạn kiểm định (${Math.abs(monthsLeft)} tháng trước).`
          : `[Đánh giá 95% · Hạng A] Tự động từ hồ sơ CSC (${container.cscInspectionScheme || 'PES'}): Còn hiệu lực.`,
        measurements: {
          _conditionPct: expired ? '25' : '95',
          csc_interval: String(expired ? 36 : Math.min(30, monthsElapsed)),
          plate_legibility: '100'
        },
        criteriaResults: { csc_interval: expired ? 'FAIL' : 'PASS', plate_legibility: 'PASS' }
      };
      appliedCount++;
    } else if (item.key === 'reefer_setpoint_test' && tempVal != null && Number.isFinite(tempVal)) {
      const tempDrift = Math.abs(tempVal - (targetTemp ?? tempVal));
      const ok = tempDrift <= 1.0;
      const pct = tempDrift <= 0.5 ? 95 : ok ? 78 : 35;
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Tự động từ cảm biến lạnh IoT: cấp ${tempVal} °C (lệch ${tempDrift.toFixed(2)} °C).`,
        measurements: { _conditionPct: String(pct), sensor_deviation: String(Number(tempDrift.toFixed(2))) },
        criteriaResults: { sensor_deviation: tempDrift <= 0.5 ? 'PASS' : 'FAIL', pull_down_temp: ok ? 'PASS' : 'FAIL' }
      };
      appliedCount++;
    } else if (item.key === 'reefer_alarm_airflow' && container.reeferTemperatureAlarmStatus) {
      const alarmRaw = String(container.reeferTemperatureAlarmStatus).toUpperCase();
      const ok = ['OK', 'NORMAL', 'NONE', 'CLEAR'].includes(alarmRaw);
      const pct = ok ? 95 : 35;
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Tự động từ ECU lạnh: trạng thái cảnh báo "${container.reeferTemperatureAlarmStatus}".`,
        measurements: { _conditionPct: String(pct) },
        criteriaResults: { active_alarms: ok ? 'PASS' : 'FAIL' }
      };
      appliedCount++;
    } else if (item.key === 'reefer_power_control' && container.batteryPct != null) {
      const bat = Number(container.batteryPct);
      const ok = bat >= 50;
      const pct = bat >= 80 ? 95 : ok ? 78 : 45;
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Tự động từ IoT nguồn/pin dự phòng: ${bat}%.`,
        measurements: { _conditionPct: String(pct) },
        criteriaResults: { power_battery: ok ? 'PASS' : 'FAIL' }
      };
      appliedCount++;
    } else if (item.key === 'doors_locking' && (container.eSealNumber || container.eSealStatus)) {
      const sealStatus = String(container.eSealStatus || 'SEALED').toUpperCase();
      const integrity = container.eSealIntegrityPct != null ? Number(container.eSealIntegrityPct) : 100;
      const ok = !['BROKEN', 'TAMPER', 'OPEN', 'ALERT'].includes(sealStatus) && integrity >= 80;
      const pct = ok ? Math.min(95, integrity) : Math.min(40, integrity);
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Tự động đối soát E-Seal ${container.eSealNumber || ''} (${sealStatus}, nguyên vẹn ${integrity}%).`,
        measurements: { _conditionPct: String(pct), cam_keeper_fit: String(integrity), door_gasket_seal: '0', hinge_latch: '0' },
        criteriaResults: { cam_keeper_fit: ok ? 'PASS' : 'FAIL', door_gasket_seal: 'PASS', hinge_latch: 'PASS' }
      };
      appliedCount++;
    } else if (item.key === 'frame_corner_castings' && container.shockG != null) {
      const g = Number(container.shockG);
      const ok = g <= 2.5;
      const pct = ok ? 95 : 40;
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Cảm biến va đập ghi nhận cực đại ${g} G (${ok ? 'trong ngưỡng an toàn ≤ 2.5G' : 'cảnh báo va chạm mạnh'}).`,
        measurements: { _conditionPct: String(pct) },
        criteriaResults: { shock_threshold: ok ? 'PASS' : 'FAIL' }
      };
      appliedCount++;
    } else if ((item.key === 'walls_roof' || item.key === 'cleanliness_cargo') && container.humidityPct != null) {
      const hum = Number(container.humidityPct);
      const ok = hum <= 75;
      const pct = hum <= 65 ? 95 : ok ? 80 : 50;
      next[item.key] = {
        key: item.key,
        status: ok ? 'PASS' : 'FAIL',
        notes: `[Đánh giá ${pct}%] Cảm biến độ ẩm khoang: ${hum}% (${ok ? 'khô ráo đạt chuẩn' : 'độ ẩm cao, kiểm tra dột/ngưng tụ'}).`,
        measurements: { _conditionPct: String(pct) },
        criteriaResults: { moisture_check: ok ? 'PASS' : 'FAIL' }
      };
      appliedCount++;
    }
  }
  return { checks: next, appliedCount };
}

