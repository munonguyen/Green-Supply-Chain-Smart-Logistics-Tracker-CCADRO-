import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Fuel,
  Snowflake,
  Sparkles,
  Zap
} from 'lucide-react';
import { api } from '../../../../services/api';
import { computeVehicleAnnualStats, money, number, unwrap } from './fuelHelpers';

export default function FuelOverviewPanel({
  data,
  vehicles,
  containerUnits = [],
  stations = [],
  onSelectVehicle
}) {
  const [batchParams, setBatchParams] = useState({
    distanceKm: '250',
    reeferHours: '12',
    carbonWeightPct: 60,
    carbonMetric: 'PHYSICAL_CO2',
    corridorTag: ''
  });
  const [batchResult, setBatchResult] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState('');

  const rows = useMemo(
    () => vehicles.map((v) => ({ vehicle: v, ...computeVehicleAnnualStats(v, data.fuels) })),
    [vehicles, data.fuels]
  );

  const totals = useMemo(() => {
    let liters = 0;
    let costVnd = 0;
    let physicalCo2Kg = 0;
    for (const r of rows) {
      if (r.covered) {
        liters += r.annualLiters;
        costVnd += r.annualCostVnd;
        physicalCo2Kg += r.annualPhysicalCo2Kg;
      }
    }
    return { liters, costVnd, physicalCo2Kg };
  }, [rows]);

  const byFuel = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r.fuel) continue;
      const entry = map.get(r.fuel.code) || {
        code: r.fuel.code,
        name: r.fuel.name,
        count: 0,
        co2Kg: 0
      };
      entry.count += 1;
      if (r.covered) entry.co2Kg += r.annualPhysicalCo2Kg;
      map.set(r.fuel.code, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.co2Kg - a.co2Kg || b.count - a.count);
  }, [rows]);

  const lowFuelReefers = containerUnits.filter((u) => u.lowFuelAlert);
  const corridors = Array.from(
    new Set(stations.map((s) => s.corridorTag).filter(Boolean))
  );

  const runBatchOptimize = async (e) => {
    e.preventDefault();
    if (batchBusy || typeof api.batchOptimizeVehicleFuels !== 'function') return;
    setBatchBusy(true);
    setBatchError('');
    try {
      const res = unwrap(
        await api.batchOptimizeVehicleFuels({
          distanceKm: Number(batchParams.distanceKm),
          reeferHours: Number(batchParams.reeferHours),
          carbonWeightPct: Number(batchParams.carbonWeightPct),
          carbonMetric: batchParams.carbonMetric,
          corridorTag: batchParams.corridorTag || null,
          maxPremiumPct: null
        })
      );
      setBatchResult(res);
    } catch (err) {
      setBatchError(err?.message || 'Không chạy được tối ưu hàng loạt theo trạm bơm.');
    } finally {
      setBatchBusy(false);
    }
  };

  return (
    <section className="fuel-overview-card" aria-label="Tổng quan CO₂ và nhiên liệu toàn đội xe">
      <div className="fuel-section-heading">
        <span className="fuel-overview-icon">
          <BarChart3 size={18} />
        </span>
        <div>
          <h3>Tổng quan tiêu thụ nhiên liệu &amp; phát thải CO₂ theo từng xe</h3>
          <p>
            Tổng hợp cơ cấu xăng/dầu thực tế của đội đầu kéo và container lạnh (Reefer Genset),
            tự động tối ưu chọn trạm &amp; loại nhiên liệu hàng loạt theo hành lang thay cho nhập tay từng chiếc.
          </p>
        </div>
      </div>

      <div className="fuel-overview-kpis">
        <div>
          <span>Tổng lượng nhiên liệu kế hoạch / năm</span>
          <strong>{totals.liters > 0 ? `${number(totals.liters, 0)} lít` : 'Chưa đủ dữ liệu'}</strong>
          <small>Cộng dồn từ các xe đã khai báo hoặc đồng bộ từ trụ bơm</small>
        </div>
        <div>
          <span>Chi phí nhiên liệu ước tính / năm (Vùng 1)</span>
          <strong>{totals.costVnd > 0 ? money(totals.costVnd) : 'Chưa đủ dữ liệu'}</strong>
          <small>Theo giá Petrolimex tham chiếu ngày 19/11/2026</small>
        </div>
        <div>
          <span>Cơ cấu nhiên liệu &amp; Container lạnh</span>
          <strong>
            {byFuel.length ? `${byFuel.length} loại đang dùng` : 'Chưa gán nhiên liệu'}
            {containerUnits.length > 0 ? ` · ${containerUnits.length} genset` : ''}
          </strong>
          <small>
            {lowFuelReefers.length > 0
              ? `Cảnh báo ${lowFuelReefers.length} container lạnh bình dầu < 25%`
              : byFuel
                  .slice(0, 2)
                  .map((item) => `${item.name} (${item.count} xe)`)
                  .join(' · ') || 'Chọn xe hoặc chạy Tối ưu lô bên dưới'}
          </small>
        </div>
      </div>

      {typeof api.batchOptimizeVehicleFuels === 'function' && (
        <form className="fuel-batch-box" onSubmit={runBatchOptimize} aria-label="Tối ưu hàng loạt theo trạm bơm">
          <div className="fuel-batch-head">
            <div>
              <strong>
                <Sparkles size={15} /> Tự động tối ưu hàng loạt theo Trạm bơm ({stations.length} trạm sẵn sàng)
              </strong>
              <p>
                Hệ thống đối chiếu tồn bồn &amp; giá bán tại các trạm trên hành lang để gợi ý loại dầu + điểm bơm tối ưu cho cả xe đầu kéo và máy phát container lạnh.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={batchBusy || stations.length === 0}>
              <Zap size={15} />
              {batchBusy ? 'Đang tối ưu…' : 'Tối ưu toàn đội ngay'}
            </button>
          </div>

          <div className="fuel-batch-controls">
            <label className="fuel-field">
              <span>Cự ly tuyến · km</span>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={batchParams.distanceKm}
                onChange={(e) => setBatchParams((p) => ({ ...p, distanceKm: e.target.value }))}
              />
            </label>
            <label className="fuel-field">
              <span>Giờ chạy máy phát lạnh · giờ</span>
              <input
                type="number"
                min="0"
                max="200"
                step="1"
                value={batchParams.reeferHours}
                onChange={(e) => setBatchParams((p) => ({ ...p, reeferHours: e.target.value }))}
              />
            </label>
            <label className="fuel-field">
              <span>Hành lang trạm bơm</span>
              <select
                value={batchParams.corridorTag}
                onChange={(e) => setBatchParams((p) => ({ ...p, corridorTag: e.target.value }))}
              >
                <option value="">Tất cả trạm đang hoạt động</option>
                {corridors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Trọng số CO₂: {batchParams.carbonWeightPct}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={batchParams.carbonWeightPct}
                onChange={(e) =>
                  setBatchParams((p) => ({ ...p, carbonWeightPct: Number(e.target.value) }))
                }
              />
            </label>
          </div>

          {batchError && (
            <p className="fuel-error" role="alert">
              <AlertTriangle size={15} /> {batchError}
            </p>
          )}

          {batchResult && (
            <div className="fuel-batch-results">
              <div className="fuel-batch-summary">
                <span>
                  Đã đánh giá: <strong>{batchResult.optimizedAssetsCount}/{batchResult.totalAssetsEvaluated}</strong> thiết bị
                </span>
                <span>
                  Đề xuất đổi loại/trạm: <strong>{batchResult.switchSuggestedCount}</strong>
                </span>
                <span>
                  Chênh lệch chi phí dự kiến: <strong>{money(batchResult.projectedCostDeltaVnd)}</strong>
                </span>
                <span>
                  Chênh lệch CO₂ dự kiến: <strong>{number(batchResult.projectedCo2DeltaKg, 2)} kg</strong>
                </span>
              </div>
              <div className="fuel-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Mã / Tên</th>
                      <th>Đang dùng</th>
                      <th>Đề xuất tối ưu</th>
                      <th>Trạm bơm khuyên dùng</th>
                      <th>Chi phí dự kiến</th>
                      <th>CO₂ dự kiến</th>
                      <th>Ghi chú tự động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.rows.map((r) => (
                      <tr key={`${r.assetKind}-${r.assetCode}`}>
                        <td>
                          <span className="fuel-tag">
                            {r.assetKind === 'CONTAINER_GENSET' ? (
                              <>
                                <Snowflake size={11} style={{ marginRight: 3 }} /> Container lạnh
                              </>
                            ) : (
                              'Xe tải/Đầu kéo'
                            )}
                          </span>
                        </td>
                        <td>
                          <strong>{r.assetLabel}</strong>
                          <small>
                            {r.assetCode} · {r.powertrainSpec}
                          </small>
                        </td>
                        <td>{r.currentFuelCode || '—'}</td>
                        <td>
                          <strong>{r.recommendedFuelName || '—'}</strong>
                        </td>
                        <td>
                          {r.recommendedStationCode ? (
                            <>
                              <strong>{r.recommendedStationName}</strong>
                              <small>{r.recommendedStationCode}</small>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {r.expectedCostVnd != null ? money(r.expectedCostVnd) : '—'}
                          {r.costDeltaVnd != null && (
                            <small>Δ {money(r.costDeltaVnd)}</small>
                          )}
                        </td>
                        <td>
                          {r.expectedCo2Kg != null ? `${number(r.expectedCo2Kg, 2)} kg` : '—'}
                          {r.co2DeltaKg != null && (
                            <small>Δ {number(r.co2DeltaKg, 2)} kg</small>
                          )}
                        </td>
                        <td>{r.statusNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      )}

      <div className="fuel-table-wrap">
        <table>
          <caption>Phân bổ phát thải CO₂ &amp; chi phí nhiên liệu đội xe ({rows.length} phương tiện)</caption>
          <thead>
            <tr>
              <th>Phương tiện</th>
              <th>Nhiên liệu đang dùng</th>
              <th>Định mức</th>
              <th>Km kế hoạch / năm</th>
              <th>CO₂ ống xả / năm</th>
              <th>Chi phí tham chiếu / năm</th>
              <th>Tỷ trọng CO₂</th>
              <th>Tối ưu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vehicle, fuel, covered, annualKm, annualPhysicalCo2Kg, annualCostVnd }) => {
              const sharePct =
                covered && totals.physicalCo2Kg > 0
                  ? (annualPhysicalCo2Kg / totals.physicalCo2Kg) * 100
                  : 0;
              return (
                <tr key={vehicle.id}>
                  <td>
                    <strong>{vehicle.plateNumber}</strong>
                    <small>
                      {vehicle.vehicleCode} · {vehicle.fuelType} · {vehicle.euroStandard}
                    </small>
                  </td>
                  <td>
                    {fuel ? (
                      <strong>{fuel.name}</strong>
                    ) : (
                      <span className="fuel-muted-tag">Chưa khai báo</span>
                    )}
                  </td>
                  <td>
                    {vehicle.profile ? `${number(vehicle.profile.consumptionPer100Km, 2)} L/100km` : '—'}
                  </td>
                  <td>{annualKm != null ? `${number(annualKm, 0)} km` : 'Chưa nhập'}</td>
                  <td>{covered ? <strong>{number(annualPhysicalCo2Kg, 1)} kg</strong> : 'Chưa đủ dữ liệu'}</td>
                  <td>{covered ? money(annualCostVnd) : '—'}</td>
                  <td>
                    {covered ? (
                      <div className="fuel-share-cell">
                        <span>{number(sharePct, 1)}%</span>
                        <div className="fuel-share-track">
                          <div
                            className="fuel-share-fill"
                            style={{ width: `${Math.min(100, sharePct)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary fuel-row-btn"
                      onClick={() => onSelectVehicle(vehicle.id)}
                    >
                      Đánh giá <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {containerUnits.length > 0 && (
        <div className="fuel-table-wrap" style={{ marginTop: 16 }}>
          <table>
            <caption>
              <Fuel size={14} style={{ marginRight: 5, verticalAlign: '-2px' }} />
              Đội Container Lạnh (Reefer Genset) theo dõi tự động ({containerUnits.length} container)
            </caption>
            <thead>
              <tr>
                <th>Mã Container</th>
                <th>Mã Genset / RFID</th>
                <th>Nhiên liệu chuẩn</th>
                <th>Mức bình dầu</th>
                <th>Định mức chạy lạnh</th>
                <th>Giới hạn lưu huỳnh</th>
              </tr>
            </thead>
            <tbody>
              {containerUnits.map((u) => (
                <tr key={u.containerId}>
                  <td>
                    <strong>{u.containerCode}</strong>
                    <small>{u.containerType}</small>
                  </td>
                  <td>
                    <strong>{u.gensetCode}</strong>
                    <small>{u.rfidTag || 'Quét QR/Mã cont'}</small>
                  </td>
                  <td>{u.preferredFuelName}</td>
                  <td>
                    <strong>{number(u.currentFuelPct, 0)}%</strong> · {number(u.tankCapacityLiters, 0)}L
                    {u.lowFuelAlert && <span className="fuel-alert-tag">Cần tiếp dầu</span>}
                  </td>
                  <td>{number(u.ratedLitersPerHour, 2)} L/giờ</td>
                  <td>≤ {u.maxSulfurPpm} ppm (Mức {u.minQualityLevel})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

