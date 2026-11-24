import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Fuel, Lock, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../../../../services/api';
import { money, number, unwrap } from './fuelHelpers';

export default function FuelStationsPanel({
  stations = [],
  vehicles = [],
  containerUnits = [],
  fuels = [],
  canEdit,
  onStationsChanged
}) {
  const [selectedStationCode, setSelectedStationCode] = useState('');
  const [selectedNozzleCode, setSelectedNozzleCode] = useState('');
  const [assetKind, setAssetKind] = useState('VEHICLE');
  const [assetCode, setAssetCode] = useState('');
  const [requestedLiters, setRequestedLiters] = useState('100');
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newStation, setNewStation] = useState({
    stationCode: '',
    name: '',
    stationType: 'INTERNAL_DEPOT',
    priceRegion: 1,
    corridorTag: 'CAT_LAI_DONG_NAI',
    address: '',
    nozzleCode: 'NZ-01',
    fuelCode: fuels[0]?.code || 'DIESEL_DO_0001S',
    tankCapacityLiters: '30000',
    currentStockLiters: '25000',
    unitPriceVnd: String(fuels[0]?.priceRegion1 || 28140)
  });

  useEffect(() => {
    if (!selectedStationCode && stations.length > 0) {
      setSelectedStationCode(stations[0].stationCode);
      setSelectedNozzleCode(stations[0].nozzles?.[0]?.nozzleCode || '');
    }
  }, [stations, selectedStationCode]);

  useEffect(() => {
    if (assetKind === 'VEHICLE') {
      setAssetCode(vehicles[0]?.vehicleCode || '');
    } else {
      setAssetCode(containerUnits[0]?.containerCode || '');
    }
    setDecision(null);
  }, [assetKind, vehicles, containerUnits]);

  const activeStation = stations.find((s) => s.stationCode === selectedStationCode) || stations[0];
  const nozzles = activeStation?.nozzles || [];

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!activeStation || !selectedNozzleCode || !assetCode || busy) return;
    setBusy(true);
    setError('');
    setDecision(null);
    try {
      const res = unwrap(
        await api.authorizeFuelPump(activeStation.stationCode, {
          nozzleCode: selectedNozzleCode,
          assetKind,
          assetCode,
          requestedLiters: requestedLiters === '' ? null : Number(requestedLiters)
        })
      );
      setDecision(res);
    } catch (err) {
      setError(err?.message || 'Không kiểm tra được ủy quyền trụ bơm.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateStation = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.createFuelStation({
        stationCode: newStation.stationCode,
        name: newStation.name,
        stationType: newStation.stationType,
        priceRegion: Number(newStation.priceRegion),
        corridorTag: newStation.corridorTag,
        address: newStation.address,
        nozzles: [
          {
            nozzleCode: newStation.nozzleCode,
            fuelCode: newStation.fuelCode,
            tankCapacityLiters: Number(newStation.tankCapacityLiters),
            currentStockLiters: Number(newStation.currentStockLiters),
            unitPriceVnd: Number(newStation.unitPriceVnd)
          }
        ]
      });
      setShowCreate(false);
      setNewStation((s) => ({ ...s, stationCode: '', name: '', address: '' }));
      await onStationsChanged?.();
    } catch (err) {
      setError(err?.message || 'Không tạo được trạm bơm.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fuel-overview-card" aria-label="Quản lý trạm bơm và khóa an toàn trụ bơm">
      <div className="fuel-section-heading">
        <span className="fuel-overview-icon">
          <Fuel size={18} />
        </span>
        <div>
          <h3>Hệ thống Trạm Bơm Nội Bộ &amp; Đối Tác Theo Tuyến</h3>
          <p>
            Quản lý tồn bồn (ATG), danh sách vòi bơm theo loại xăng dầu và khóa an toàn Pre-Pump Gate (RFID / QR) chống bơm nhầm loại dầu cho đầu kéo &amp; container lạnh.
          </p>
        </div>
        {canEdit && typeof api.createFuelStation === 'function' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus size={15} /> {showCreate ? 'Đóng form' : 'Thêm trạm bơm'}
          </button>
        )}
      </div>

      {showCreate && (
        <form className="fuel-section" style={{ marginBottom: 18 }} onSubmit={handleCreateStation}>
          <div className="fuel-form-grid">
            <label className="fuel-field">
              <span>Mã trạm bơm *</span>
              <input
                required
                placeholder="VD: DEPOT-BINHDUONG-02"
                value={newStation.stationCode}
                onChange={(e) => setNewStation((s) => ({ ...s, stationCode: e.target.value }))}
              />
            </label>
            <label className="fuel-field">
              <span>Tên trạm bơm *</span>
              <input
                required
                placeholder="Trạm nội bộ Depot Sóng Thần"
                value={newStation.name}
                onChange={(e) => setNewStation((s) => ({ ...s, name: e.target.value }))}
              />
            </label>
            <label className="fuel-field">
              <span>Loại hình trạm</span>
              <select
                value={newStation.stationType}
                onChange={(e) => setNewStation((s) => ({ ...s, stationType: e.target.value }))}
              >
                <option value="INTERNAL_DEPOT">Trạm bồn nội bộ Depot (RFID)</option>
                <option value="PARTNER_PETROLIMEX">Trạm đối tác Petrolimex (Fleet Card)</option>
                <option value="PARTNER_OTHER">Trạm đối tác ngoài tuyến</option>
              </select>
            </label>
            <label className="fuel-field">
              <span>Vòi bơm mặc định · Loại nhiên liệu</span>
              <select
                value={newStation.fuelCode}
                onChange={(e) => {
                  const found = fuels.find((f) => f.code === e.target.value);
                  setNewStation((s) => ({
                    ...s,
                    fuelCode: e.target.value,
                    unitPriceVnd: found ? String(found.priceRegion1) : s.unitPriceVnd
                  }));
                }}
              >
                {fuels.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Tồn bồn hiện tại (L)</span>
              <input
                required
                type="number"
                min="0"
                max="500000"
                value={newStation.currentStockLiters}
                onChange={(e) =>
                  setNewStation((s) => ({ ...s, currentStockLiters: e.target.value }))
                }
              />
            </label>
            <label className="fuel-field">
              <span>Đơn giá tại trạm (đ/L)</span>
              <input
                required
                type="number"
                min="1000"
                max="1000000"
                value={newStation.unitPriceVnd}
                onChange={(e) => setNewStation((s) => ({ ...s, unitPriceVnd: e.target.value }))}
              />
            </label>
          </div>
          <div className="fuel-form-footer">
            <span>Trạm mới tạo sẽ tự động đồng bộ vào bài toán tối ưu toàn đội.</span>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Lưu trạm bơm
            </button>
          </div>
        </form>
      )}

      <div className="fuel-station-grid">
        {stations.map((s) => (
          <article key={s.stationCode} className="fuel-station-card">
            <header className="fuel-station-card-head">
              <div>
                <span className="fuel-tag">
                  {s.stationType === 'INTERNAL_DEPOT' ? 'NỘI BỘ RFID' : 'PETROLIMEX ĐỐI TÁC'} · Vùng {s.priceRegion}
                </span>
                <h4>{s.name}</h4>
                <small>
                  <MapPin size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  {s.stationCode} · {s.address || s.corridorTag || 'Chưa cập nhật địa chỉ'}
                </small>
              </div>
            </header>

            <div className="fuel-nozzle-list">
              {(s.nozzles || []).map((n) => (
                <div key={n.nozzleCode} className="fuel-nozzle-row">
                  <div className="fuel-nozzle-top">
                    <strong>
                      {n.nozzleCode} · {n.fuelName}
                    </strong>
                    <span>{money(n.unitPriceVnd)}/L</span>
                  </div>
                  <div className="fuel-nozzle-bar-wrap">
                    <div className="fuel-share-track" style={{ flex: 1 }}>
                      <div
                        className="fuel-share-fill"
                        style={{
                          width: `${Math.min(100, Number(n.stockPct || 0))}%`,
                          background: Number(n.stockPct) < 20 ? 'var(--accent-red)' : 'var(--accent-green)'
                        }}
                      />
                    </div>
                    <small>
                      {number(n.currentStockLiters, 0)} / {number(n.tankCapacityLiters, 0)} L ({number(n.stockPct, 0)}%)
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {!stations.length && (
          <p className="fuel-method">Chưa có trạm bơm nào được cấu hình.</p>
        )}
      </div>

      {canEdit && typeof api.authorizeFuelPump === 'function' && stations.length > 0 && (
        <form className="fuel-section" onSubmit={handleAuthorize} aria-label="Kiểm tra khóa an toàn trụ bơm">
          <div className="fuel-section-heading">
            <Lock size={19} />
            <div>
              <h3>Khóa An Toàn Trước Khi Mở Vòi Bơm (Pre-Pump RFID / QR Gate)</h3>
              <p>
                Mô phỏng bước quét thẻ xe/container tại cột bơm. Hệ thống tự chặn mở van nếu chọn sai vòi dầu vượt ngưỡng lưu huỳnh hoặc sai động cơ.
              </p>
            </div>
          </div>

          <div className="fuel-form-grid">
            <label className="fuel-field">
              <span>Trạm bơm</span>
              <select
                value={selectedStationCode}
                onChange={(e) => {
                  const st = stations.find((item) => item.stationCode === e.target.value);
                  setSelectedStationCode(e.target.value);
                  setSelectedNozzleCode(st?.nozzles?.[0]?.nozzleCode || '');
                  setDecision(null);
                }}
              >
                {stations.map((s) => (
                  <option key={s.stationCode} value={s.stationCode}>
                    {s.stationCode} — {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Vòi bơm &amp; Loại nhiên liệu</span>
              <select
                value={selectedNozzleCode}
                onChange={(e) => {
                  setSelectedNozzleCode(e.target.value);
                  setDecision(null);
                }}
              >
                {nozzles.map((n) => (
                  <option key={n.nozzleCode} value={n.nozzleCode}>
                    {n.nozzleCode} · {n.fuelName} ({money(n.unitPriceVnd)}/L)
                  </option>
                ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Đối tượng bơm</span>
              <select value={assetKind} onChange={(e) => setAssetKind(e.target.value)}>
                <option value="VEHICLE">Xe tải / Đầu kéo</option>
                <option value="CONTAINER_GENSET">Container Lạnh (Reefer Genset)</option>
              </select>
            </label>
            <label className="fuel-field">
              <span>Mã xe / Mã Container</span>
              <select
                value={assetCode}
                onChange={(e) => {
                  setAssetCode(e.target.value);
                  setDecision(null);
                }}
              >
                {assetKind === 'VEHICLE'
                  ? vehicles.map((v) => (
                      <option key={v.id} value={v.vehicleCode}>
                        {v.plateNumber} ({v.vehicleCode} · {v.euroStandard})
                      </option>
                    ))
                  : containerUnits.map((c) => (
                      <option key={c.containerId} value={c.containerCode}>
                        {c.containerCode} ({c.gensetCode})
                      </option>
                    ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Số lít dự kiến bơm · L</span>
              <input
                type="number"
                min="1"
                max="2000"
                step="1"
                value={requestedLiters}
                onChange={(e) => {
                  setRequestedLiters(e.target.value);
                  setDecision(null);
                }}
              />
            </label>
          </div>

          <div className="fuel-form-footer">
            <span>Quyết định cấp phép mở cò bơm được kiểm tra theo quy tắc động cơ &amp; tồn bồn.</span>
            <button type="submit" className="btn btn-primary" disabled={busy || !assetCode}>
              <ShieldCheck size={16} /> Kiểm tra khóa trụ bơm
            </button>
          </div>

          {error && (
            <p className="fuel-error" role="alert">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          {decision && (
            <div
              className={decision.allowed ? 'fuel-success' : 'fuel-error'}
              role="status"
              style={{ marginTop: 14 }}
            >
              {decision.allowed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <div>
                <strong>
                  {decision.allowed
                    ? `CHO PHÉP MỞ VÒI ${decision.nozzleCode} · Tối đa ${number(decision.maxAuthorizedLiters, 0)} L`
                    : `CHẶN MỞ VÒI ${decision.nozzleCode} — KHÔNG TƯƠNG THÍCH`}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  {decision.allowed
                    ? `${decision.assetLabel} khớp chuẩn ${decision.fuelName} (${money(decision.unitPriceVnd)}/L).`
                    : (decision.reasons || []).join(' ')}
                </p>
              </div>
            </div>
          )}
        </form>
      )}
    </section>
  );
}

