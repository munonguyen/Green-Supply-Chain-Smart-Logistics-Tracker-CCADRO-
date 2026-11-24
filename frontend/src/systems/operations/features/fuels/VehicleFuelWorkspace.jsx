import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Fuel,
  Leaf,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Truck
} from 'lucide-react';
import { api } from '../../../../services/api';
import { compatibleFamily, familyOf, money, number, unwrap } from './fuelHelpers';

const initialProfile = (vehicle, fuels) => {
  const p = vehicle.profile;
  const euro = Number(String(vehicle.euroStandard || '').replace(/\D/g, ''));
  return {
    selectedFuelCode: p?.selectedFuelCode || '',
    consumptionPer100Km: p?.consumptionPer100Km ?? '',
    annualKm: p?.annualKm ?? '',
    minRon: p?.minRon ?? '',
    maxEthanolPct: p?.maxEthanolPct ?? '',
    maxSulfurPpm: p?.maxSulfurPpm ?? '',
    minQualityLevel: p?.minQualityLevel ?? Math.min(5, Math.max(2, euro || 2)),
    compatibilityEvidence: p?.compatibilityEvidence || '',
    consumptionEvidence: p?.consumptionEvidence || '',
    expectedRevision: p?.revision ?? -1,
    supported: fuels.some((f) => compatibleFamily(vehicle, f))
  };
};

const initialScenario = {
  distanceKm: '100',
  extraIdleHours: '0',
  idleLitersPerHour: '0',
  priceRegion: 1,
  carbonWeightPct: 50,
  carbonMetric: 'PHYSICAL_CO2',
  availableFuelCodes: [],
  priceOverrides: {},
  consumptionOverrides: {},
  maxPremiumPct: ''
};

export default function VehicleFuelWorkspace({
  vehicle,
  catalog,
  stations = [],
  canEdit,
  onSaved
}) {
  const [draft, setDraft] = useState(() => initialProfile(vehicle, catalog.fuels));
  const [profileDirty, setProfileDirty] = useState(false);
  const [scenario, setScenario] = useState(initialScenario);
  const [assessment, setAssessment] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const family = familyOf(vehicle);
  const fuels = catalog.fuels.filter((f) => compatibleFamily(vehicle, f));
  const selectedFuel = catalog.fuels.find((f) => f.code === draft.selectedFuelCode);

  const profileChange = (key, value) => {
    setDraft((d) => ({
      ...d,
      ...(key === 'selectedFuelCode' && value !== d.selectedFuelCode
        ? { consumptionPer100Km: '', consumptionEvidence: '' }
        : {}),
      [key]: value
    }));
    setProfileDirty(true);
    setAssessment(null);
    setNotice('');
  };

  const scenarioChange = (key, value) => {
    setScenario((s) => ({ ...s, [key]: value }));
    setAssessment(null);
    setError('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const result = unwrap(
        await api.saveVehicleFuelProfile(vehicle.id, {
          selectedFuelCode: draft.selectedFuelCode,
          consumptionPer100Km: Number(draft.consumptionPer100Km),
          annualKm: draft.annualKm === '' ? null : Number(draft.annualKm),
          minRon: family === 'GASOLINE' ? Number(draft.minRon) : null,
          maxEthanolPct: family === 'GASOLINE' ? Number(draft.maxEthanolPct) : null,
          maxSulfurPpm: family === 'DIESEL' ? Number(draft.maxSulfurPpm) : null,
          minQualityLevel: Number(draft.minQualityLevel),
          compatibilityEvidence: draft.compatibilityEvidence.trim(),
          consumptionEvidence: draft.consumptionEvidence.trim(),
          expectedRevision: draft.expectedRevision
        })
      );
      if (!mounted.current) return;
      setDraft((d) => ({ ...d, expectedRevision: result.revision }));
      setProfileDirty(false);
      setAssessment(null);
      setNotice('Đã lưu nhiên liệu và định mức riêng của xe. Có thể lập kịch bản so sánh.');
      await onSaved();
    } catch (e) {
      if (mounted.current) setError(e.message || 'Không lưu được hồ sơ nhiên liệu.');
    } finally {
      if (mounted.current) setBusy('');
    }
  };

  const calculate = async (event) => {
    event.preventDefault();
    if (busy || profileDirty) return;
    setBusy('calculate');
    setError('');
    setAssessment(null);
    try {
      const result = unwrap(
        await api.assessVehicleFuel(vehicle.id, {
          ...scenario,
          distanceKm: Number(scenario.distanceKm),
          extraIdleHours: Number(scenario.extraIdleHours),
          idleLitersPerHour: Number(scenario.idleLitersPerHour),
          priceRegion: Number(scenario.priceRegion),
          carbonWeightPct: Number(scenario.carbonWeightPct),
          priceOverrides: Object.fromEntries(
            Object.entries(scenario.priceOverrides)
              .filter(([, v]) => v !== '')
              .map(([k, v]) => [k, Number(v)])
          ),
          consumptionOverrides: Object.fromEntries(
            Object.entries(scenario.consumptionOverrides)
              .filter(([, v]) => v !== '')
              .map(([k, v]) => [k, Number(v)])
          ),
          maxPremiumPct: scenario.maxPremiumPct === '' ? null : Number(scenario.maxPremiumPct)
        })
      );
      if (mounted.current) setAssessment(result);
    } catch (e) {
      if (mounted.current) setError(e.message || 'Không tính được phương án nhiên liệu.');
    } finally {
      if (mounted.current) setBusy('');
    }
  };

  const recommendation = assessment?.candidates.find(
    (c) => c.fuelCode === assessment.recommendedFuelCode
  );
  const baseline = assessment?.candidates.find(
    (c) => c.fuelCode === assessment.selectedFuelCode
  );
  const allCompatibleSelected =
    fuels.length > 0 && fuels.every((f) => scenario.availableFuelCodes.includes(f.code));

  const toggleAllSupply = () => {
    scenarioChange(
      'availableFuelCodes',
      allCompatibleSelected ? [] : fuels.map((f) => f.code)
    );
  };

  const syncSupplyFromStations = () => {
    const stocked = new Set();
    const quotes = {};
    for (const s of stations) {
      if (!s.active) continue;
      for (const n of s.nozzles || []) {
        if (!n.active || Number(n.currentStockLiters) <= 0) continue;
        if (!fuels.some((f) => f.code === n.fuelCode)) continue;
        stocked.add(n.fuelCode);
        const price = Number(n.unitPriceVnd);
        if (quotes[n.fuelCode] == null || price < Number(quotes[n.fuelCode])) {
          quotes[n.fuelCode] = String(price);
        }
      }
    }
    setScenario((s) => ({
      ...s,
      availableFuelCodes: Array.from(stocked),
      priceOverrides: { ...s.priceOverrides, ...quotes }
    }));
    setAssessment(null);
    setNotice('Đã đồng bộ nguồn cung & đơn giá thực tế từ các trạm bơm đang hoạt động.');
  };

  const applyRecommendationToDraft = () => {
    if (!recommendation || recommendation.fuelCode === draft.selectedFuelCode) return;
    profileChange('selectedFuelCode', recommendation.fuelCode);
    setNotice(
      `Đã điền "${recommendation.name}" vào hồ sơ Bước 01. Hãy nhập định mức đo thực tế (L/100 km) và nguồn đo tương ứng rồi nhấn Lưu hồ sơ xe.`
    );
  };

  return (
    <section className="fuel-workspace" aria-label="Hồ sơ nhiên liệu xe đã chọn">
      <header className="fuel-vehicle-heading">
        <span className="fuel-vehicle-symbol">
          <Truck size={25} />
        </span>
        <div>
          <p>HỒ SƠ NHIÊN LIỆU PHƯƠNG TIỆN</p>
          <h2>{vehicle.plateNumber}</h2>
          <span>
            {vehicle.vehicleCode} · {vehicle.fuelType} · {vehicle.euroStandard}
          </span>
        </div>
        <span className="fuel-scope-badge">CO₂ · TTW</span>
      </header>

      {!family ? (
        <div className="fuel-callout">
          <AlertTriangle size={20} />
          <div>
            <strong>Cần phương án riêng cho hệ động lực {vehicle.fuelType}</strong>
            <p>
              Danh mục này lựa chọn xăng/dầu cho đúng động cơ. Xe điện, CNG hoặc hybrid chưa rõ cấu
              hình cần hồ sơ năng lượng riêng; không đề xuất đổ thay bằng diesel hay xăng.
            </p>
          </div>
        </div>
      ) : (
        <>
          <form className="fuel-section" onSubmit={saveProfile} aria-label="Khai báo nhiên liệu cho xe">
            <div className="fuel-section-heading">
              <span>01</span>
              <div>
                <h3>Nhiên liệu đang dùng &amp; điều kiện động cơ</h3>
                <p>Đối chiếu sổ tay hãng và số liệu tiêu hao của chính xe này.</p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <fieldset disabled={!canEdit || Boolean(busy)} className="fuel-form-grid">
              <label className="fuel-field">
                <span>Loại nhiên liệu đang dùng *</span>
                <select
                  required
                  value={draft.selectedFuelCode}
                  onChange={(e) => profileChange('selectedFuelCode', e.target.value)}
                >
                  <option value="">Chọn nhiên liệu</option>
                  {fuels.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fuel-field">
                <span>Định mức đo trên nhiên liệu đã chọn · L/100 km *</span>
                <input
                  required
                  type="number"
                  min="0.1"
                  max="200"
                  step="0.001"
                  value={draft.consumptionPer100Km}
                  onChange={(e) => profileChange('consumptionPer100Km', e.target.value)}
                  placeholder="Nhập số liệu của xe"
                />
              </label>
              <label className="fuel-field">
                <span>Quãng đường kế hoạch năm · km</span>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={draft.annualKm}
                  onChange={(e) => profileChange('annualKm', e.target.value)}
                  placeholder="Bỏ trống nếu chưa có kế hoạch"
                />
              </label>
              <label className="fuel-field">
                <span>Mức chất lượng nhiên liệu tối thiểu *</span>
                <select
                  required
                  value={draft.minQualityLevel}
                  onChange={(e) => profileChange('minQualityLevel', e.target.value)}
                >
                  {[2, 3, 4, 5].map((q) => (
                    <option key={q} value={q}>
                      Mức {q}
                    </option>
                  ))}
                </select>
              </label>
              {family === 'DIESEL' ? (
                <label className="fuel-field">
                  <span>Lưu huỳnh tối đa theo hãng · ppm *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    value={draft.maxSulfurPpm}
                    onChange={(e) => profileChange('maxSulfurPpm', e.target.value)}
                    placeholder="Ví dụ: 10 ppm nếu hãng yêu cầu"
                  />
                </label>
              ) : (
                <>
                  <label className="fuel-field">
                    <span>RON tối thiểu theo hãng *</span>
                    <input
                      required
                      type="number"
                      min="80"
                      max="110"
                      step="1"
                      value={draft.minRon}
                      onChange={(e) => profileChange('minRon', e.target.value)}
                    />
                  </label>
                  <label className="fuel-field">
                    <span>Ethanol tối đa theo hãng · % *</span>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draft.maxEthanolPct}
                      onChange={(e) => profileChange('maxEthanolPct', e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="fuel-field fuel-wide">
                <span>Nguồn xác nhận tương thích *</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={2}
                  value={draft.compatibilityEvidence}
                  onChange={(e) => profileChange('compatibilityEvidence', e.target.value)}
                  placeholder="Tên xe/động cơ, tài liệu hãng, trang hướng dẫn yêu cầu nhiên liệu…"
                />
              </label>
              <label className="fuel-field fuel-wide">
                <span>Nguồn định mức &amp; điều kiện tải *</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={2}
                  value={draft.consumptionEvidence}
                  onChange={(e) => profileChange('consumptionEvidence', e.target.value)}
                  placeholder="Nhật ký tiếp nhiên liệu, số km, tải trọng, đô thị/cao tốc và thời gian đo…"
                />
              </label>
            </fieldset>
            {selectedFuel && draft.consumptionPer100Km !== '' && (
              <div className="fuel-profile-preview">
                <Leaf size={20} />
                <div>
                  <strong>
                    {number(Number(draft.consumptionPer100Km) * Number(selectedFuel.physicalCo2KgPerLiter))}{' '}
                    kg CO₂ / 100 km
                  </strong>
                  <span>
                    Dự toán ống xả:{' '}
                    {number(Number(draft.consumptionPer100Km) * Number(selectedFuel.fossilCo2KgPerLiter))}{' '}
                    kg hóa thạch +{' '}
                    {number(Number(draft.consumptionPer100Km) * Number(selectedFuel.biogenicCo2KgPerLiter))}{' '}
                    kg sinh học{profileDirty ? ' · Bản đang nhập, chưa lưu' : ''}.
                  </span>
                </div>
              </div>
            )}
            <div className="fuel-form-footer">
              <span>
                {profileDirty
                  ? 'Có thay đổi chưa lưu.'
                  : vehicle.profile
                    ? `Lưu bởi ${vehicle.profile.updatedBy} · ${new Date(
                        vehicle.profile.updatedAt
                      ).toLocaleString('vi-VN')}`
                    : 'Xe chưa có hồ sơ nhiên liệu đã đối chiếu.'}
              </span>
              {canEdit && (
                <button type="submit" className="btn btn-primary" disabled={Boolean(busy)}>
                  <Save size={16} />
                  {busy === 'save' ? 'Đang lưu…' : 'Lưu hồ sơ xe'}
                </button>
              )}
            </div>
          </form>

          <form className="fuel-section" onSubmit={calculate} aria-label="Kịch bản đề xuất nhiên liệu">
            <div className="fuel-section-heading">
              <span>02</span>
              <div>
                <h3>So sánh chi phí &amp; CO₂ trên cùng hành trình</h3>
                <p>Chỉ xếp hạng nhiên liệu tương thích và được xác nhận có bán trên tuyến.</p>
              </div>
              <Calculator size={21} />
            </div>
            <fieldset disabled={Boolean(busy) || draft.expectedRevision < 0 || profileDirty} className="fuel-form-grid">
              <label className="fuel-field">
                <span>Quãng đường · km *</span>
                <input
                  required
                  type="number"
                  min="0.1"
                  max="100000"
                  step="0.1"
                  value={scenario.distanceKm}
                  onChange={(e) => scenarioChange('distanceKm', e.target.value)}
                />
              </label>
              <label className="fuel-field">
                <span>Giá tham chiếu</span>
                <select
                  value={scenario.priceRegion}
                  onChange={(e) => scenarioChange('priceRegion', e.target.value)}
                >
                  <option value={1}>Petrolimex · Vùng 1</option>
                  <option value={2}>Petrolimex · Trần Vùng 2</option>
                </select>
              </label>
              <label className="fuel-field">
                <span>Nổ máy chờ tăng thêm · giờ</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={scenario.extraIdleHours}
                  onChange={(e) => scenarioChange('extraIdleHours', e.target.value)}
                />
              </label>
              <label className="fuel-field">
                <span>Định mức chờ trên nhiên liệu gốc · L/giờ</span>
                <input
                  required
                  type="number"
                  min={Number(scenario.extraIdleHours) > 0 ? '0.01' : '0'}
                  max="50"
                  step="0.01"
                  value={scenario.idleLitersPerHour}
                  onChange={(e) => scenarioChange('idleLitersPerHour', e.target.value)}
                />
              </label>
              <label className="fuel-field">
                <span>Tăng chi phí tối đa so với hiện tại · %</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={scenario.maxPremiumPct}
                  onChange={(e) => scenarioChange('maxPremiumPct', e.target.value)}
                  placeholder="Không giới hạn"
                />
              </label>
              <label className="fuel-field">
                <span>Chỉ tiêu carbon để tối ưu</span>
                <select
                  value={scenario.carbonMetric}
                  onChange={(e) => scenarioChange('carbonMetric', e.target.value)}
                >
                  <option value="PHYSICAL_CO2">Tổng CO₂ tại ống xả</option>
                  <option value="FOSSIL_CO2">CO₂ hóa thạch · báo riêng sinh học</option>
                </select>
              </label>
              <label className="fuel-field fuel-wide fuel-priority">
                <span>
                  Ưu tiên CO₂: {scenario.carbonWeightPct}% · Chi phí: {100 - scenario.carbonWeightPct}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={scenario.carbonWeightPct}
                  onChange={(e) => scenarioChange('carbonWeightPct', e.target.value)}
                />
                <small>
                  Điểm tối ưu = trọng số × CO₂ chuẩn hóa + trọng số × chi phí chuẩn hóa. Điểm thấp hơn tốt hơn.
                </small>
              </label>
              <div className="fuel-supply-grid fuel-wide">
                <div className="fuel-supply-heading">
                  <div className="fuel-supply-heading-top">
                    <h4>Nguồn cung &amp; số liệu theo loại nhiên liệu</h4>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {stations.length > 0 && (
                        <button
                          type="button"
                          className="fuel-link-btn"
                          onClick={syncSupplyFromStations}
                        >
                          <Fuel size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                          Đồng bộ từ trạm bơm
                        </button>
                      )}
                      <button type="button" className="fuel-link-btn" onClick={toggleAllSupply}>
                        {allCompatibleSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả tương thích'}
                      </button>
                    </div>
                  </div>
                  <p>
                    Đánh dấu loại có bán tại điểm tiếp nhiên liệu dự kiến. Có thể nhập báo giá và
                    tiêu hao đo riêng thay cho tham chiếu.
                  </p>
                </div>
                {fuels.map((f) => (
                  <div className="fuel-supply-row" key={f.code}>
                    <label>
                      <input
                        type="checkbox"
                        checked={scenario.availableFuelCodes.includes(f.code)}
                        onChange={(e) =>
                          scenarioChange(
                            'availableFuelCodes',
                            e.target.checked
                              ? [...scenario.availableFuelCodes, f.code]
                              : scenario.availableFuelCodes.filter((c) => c !== f.code)
                          )
                        }
                      />
                      <span>
                        {f.name}
                        <small>{f.availabilityNote}</small>
                      </span>
                    </label>
                    <label className="fuel-field">
                      <span>Báo giá · đ/L</span>
                      <input
                        aria-label={`Báo giá ${f.name}`}
                        type="number"
                        min="1"
                        max="1000000"
                        step="0.01"
                        placeholder={number(
                          Number(scenario.priceRegion) === 2 ? f.priceRegion2 : f.priceRegion1,
                          0
                        )}
                        value={scenario.priceOverrides[f.code] ?? ''}
                        onChange={(e) =>
                          scenarioChange('priceOverrides', {
                            ...scenario.priceOverrides,
                            [f.code]: e.target.value
                          })
                        }
                      />
                    </label>
                    <label className="fuel-field">
                      <span>Đo riêng · L/100 km</span>
                      <input
                        aria-label={`Tiêu hao ${f.name}`}
                        type="number"
                        min="0.1"
                        max="200"
                        step="0.001"
                        placeholder="Theo quy đổi năng lượng"
                        value={scenario.consumptionOverrides[f.code] ?? ''}
                        onChange={(e) =>
                          scenarioChange('consumptionOverrides', {
                            ...scenario.consumptionOverrides,
                            [f.code]: e.target.value
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="fuel-form-footer">
              <span>
                {draft.expectedRevision < 0 || profileDirty
                  ? 'Lưu hồ sơ xe trước khi so sánh.'
                  : !scenario.availableFuelCodes.length
                    ? 'Chưa chọn nhiên liệu được xác nhận có bán trên tuyến.'
                    : 'Kết quả là dự toán cho các điều kiện vừa nhập.'}
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={Boolean(busy) || draft.expectedRevision < 0 || profileDirty}
              >
                <Calculator size={16} />
                {busy === 'calculate' ? 'Đang tính…' : 'Tính & đề xuất'}
              </button>
            </div>
          </form>
        </>
      )}

      {error && (
        <p className="fuel-error" role="alert">
          <AlertTriangle size={17} />
          {error}
        </p>
      )}
      {notice && (
        <p className="fuel-success" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}

      {assessment && (
        <section className="fuel-section fuel-results" aria-label="Kết quả so sánh nhiên liệu">
          <div className={`fuel-recommendation${recommendation ? '' : ' no-result'}`}>
            <span className="fuel-recommendation-icon">
              {recommendation ? <Leaf size={26} /> : <AlertTriangle size={26} />}
            </span>
            <div className="fuel-rec-body">
              <p>ĐỀ XUẤT CHO KỊCH BẢN NÀY</p>
              <h3>{recommendation?.name || 'Chưa có phương án đủ điều kiện'}</h3>
              <span>
                {recommendation
                  ? `Điểm ${number(recommendation.score, 3)} · ${
                      assessment.carbonMetric === 'FOSSIL_CO2' ? 'CO₂ hóa thạch' : 'CO₂ ống xả'
                    } ${assessment.carbonWeightPct}% / chi phí ${100 - assessment.carbonWeightPct}%`
                  : 'Kiểm tra nguồn cung, điều kiện động cơ và giới hạn chi phí.'}
              </span>
            </div>
            {canEdit && recommendation && recommendation.fuelCode !== draft.selectedFuelCode && (
              <button
                type="button"
                className="btn btn-secondary fuel-apply-btn"
                onClick={applyRecommendationToDraft}
              >
                <CheckCircle2 size={15} />
                Áp dụng đề xuất vào hồ sơ
              </button>
            )}
          </div>

          {recommendation && (
            <div className="fuel-result-metrics">
              <div>
                <span>Nhiên liệu dự kiến</span>
                <strong>{number(recommendation.liters, 2)} L</strong>
              </div>
              <div>
                <span>Chi phí</span>
                <strong>{money(recommendation.costVnd)}</strong>
                <small>{money(recommendation.costDeltaVnd)} so với hiện tại</small>
              </div>
              <div>
                <span>CO₂ tại ống xả</span>
                <strong>{number(recommendation.physicalCo2Kg, 2)} kg</strong>
                <small>{number(recommendation.physicalCo2DeltaKg, 2)} kg so với hiện tại</small>
              </div>
              <div>
                <span>Hóa thạch / sinh học</span>
                <strong>
                  {number(recommendation.fossilCo2Kg, 2)} / {number(recommendation.biogenicCo2Kg, 2)}{' '}
                  kg
                </strong>
              </div>
            </div>
          )}

          <section className="fuel-model-card" aria-label="Mô hình bài toán tối ưu chọn nhiên liệu">
            <div className="fuel-model-title">
              <SlidersHorizontal size={16} />
              <strong>Bài toán tối ưu lựa chọn nhiên liệu (Min–Max Pareto)</strong>
            </div>
            <p className="fuel-model-formula">
              Mục tiêu: min Z = {assessment.carbonWeightPct}% · CO₂_chuẩn_hóa +{' '}
              {100 - assessment.carbonWeightPct}% · ChiPhí_chuẩn_hóa (chỉ tiêu:{' '}
              {assessment.carbonMetric === 'FOSSIL_CO2'
                ? 'CO₂ hóa thạch'
                : 'Tổng CO₂ tại ống xả TTW'}
              )
            </p>
            <ul>
              <li>
                <strong>Lọc tương thích động cơ:</strong> Kiểm tra hệ động lực (Diesel/Xăng), mức
                chất lượng tối thiểu, lưu huỳnh tối đa (ppm) hoặc RON tối thiểu &amp; Ethanol tối đa
                (%).
              </li>
              <li>
                <strong>Ràng buộc vận hành:</strong> Chỉ xếp hạng loại có nguồn cung trên tuyến và
                không vượt trần tăng chi phí (
                {scenario.maxPremiumPct !== '' ? `${scenario.maxPremiumPct}%` : 'không giới hạn'}).
              </li>
              <li>
                <strong>Biên Pareto:</strong> Đánh dấu phương án không bị trội (không có loại nào vừa
                ít CO₂ hơn vừa chi phí thấp hơn hoặc bằng).
              </li>
            </ul>
          </section>

          <p className="fuel-method">{assessment.explanation}</p>

          <div className="fuel-table-wrap">
            <table>
              <caption>
                So sánh trên {number(scenario.distanceKm)} km · {number(scenario.extraIdleHours)} giờ
                chờ tăng thêm
              </caption>
              <thead>
                <tr>
                  <th>Nhiên liệu</th>
                  <th>Điều kiện</th>
                  <th>Tiêu hao / L</th>
                  <th>Chi phí</th>
                  <th>CO₂ ống xả</th>
                  <th>Hóa thạch / sinh học</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {assessment.candidates.map((c) => (
                  <tr
                    key={c.fuelCode}
                    className={c.fuelCode === assessment.recommendedFuelCode ? 'is-recommended' : ''}
                  >
                    <td>
                      <strong>{c.name}</strong>
                      {c.fuelCode === assessment.selectedFuelCode && <small>Đang dùng</small>}
                      {c.fuelCode === assessment.recommendedFuelCode && (
                        <span className="fuel-tag">Đề xuất</span>
                      )}
                    </td>
                    <td>
                      {c.eligible ? (
                        <>
                          <span className="fuel-tag">Đủ điều kiện</span>
                          {c.pareto && <small>Phương án Pareto</small>}
                        </>
                      ) : (
                        c.reasons.map((r) => <small key={r}>{r}</small>)
                      )}
                    </td>
                    <td>
                      {c.compatible ? (
                        <>
                          {number(c.consumptionPer100Km, 3)} L/100km
                          <small>
                            {number(c.liters, 3)} L ·{' '}
                            {c.consumptionBasis === 'USER_MEASURED'
                              ? 'Đo riêng'
                              : c.consumptionBasis === 'VEHICLE_PROFILE'
                                ? 'Định mức xe'
                                : 'Quy đổi năng lượng'}
                          </small>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {c.compatible ? (
                        <>
                          {money(c.costVnd)}
                          <small>
                            {money(c.unitPriceVnd)}/L ·{' '}
                            {c.priceBasis === 'USER_QUOTE' ? 'Báo giá nhập' : 'Tham chiếu 19/11/2026'}
                          </small>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{c.compatible ? `${number(c.physicalCo2Kg, 2)} kg` : '—'}</td>
                    <td>
                      {c.compatible
                        ? `${number(c.fossilCo2Kg, 2)} / ${number(c.biogenicCo2Kg, 2)} kg`
                        : '—'}
                    </td>
                    <td>{c.score == null ? '—' : number(c.score, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {baseline && (
            <p className="fuel-method">
              Đối chứng: {baseline.name}. Đổi lựa chọn trong hồ sơ sẽ yêu cầu định mức và nguồn đo
              tương ứng; đề xuất này không tự thay nhiên liệu đang dùng.
            </p>
          )}
        </section>
      )}
    </section>
  );
}

