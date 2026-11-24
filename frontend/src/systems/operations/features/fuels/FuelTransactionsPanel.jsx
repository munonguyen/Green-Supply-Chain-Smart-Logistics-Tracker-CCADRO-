import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Receipt, UploadCloud } from 'lucide-react';
import { api } from '../../../../services/api';
import { formatDateTimeVi } from '../../../../utils/formatters';
import { money, number } from './fuelHelpers';

export default function FuelTransactionsPanel({
  transactions = [],
  stations = [],
  vehicles = [],
  containerUnits = [],
  canEdit,
  onIngested
}) {
  const [stationCode, setStationCode] = useState('');
  const [nozzleCode, setNozzleCode] = useState('');
  const [assetKind, setAssetKind] = useState('VEHICLE');
  const [assetCode, setAssetCode] = useState('');
  const [liters, setLiters] = useState('120');
  const [odometerKm, setOdometerKm] = useState('');
  const [tankBeforePct, setTankBeforePct] = useState('');
  const [tankAfterPct, setTankAfterPct] = useState('');
  const [sourceType, setSourceType] = useState('DEPOT_RFID');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [csvBatchText, setCsvBatchText] = useState('');
  const [showBatchCsv, setShowBatchCsv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!stationCode && stations.length > 0) {
      setStationCode(stations[0].stationCode);
      setNozzleCode(stations[0].nozzles?.[0]?.nozzleCode || '');
    }
  }, [stations, stationCode]);

  useEffect(() => {
    if (assetKind === 'VEHICLE') {
      setAssetCode(vehicles[0]?.vehicleCode || '');
    } else {
      setAssetCode(containerUnits[0]?.containerCode || '');
    }
  }, [assetKind, vehicles, containerUnits]);

  const activeStation = stations.find((s) => s.stationCode === stationCode) || stations[0];
  const nozzles = useMemo(() => activeStation?.nozzles || [], [activeStation]);

  const lastOdometer = useMemo(() => {
    if (!assetCode) return null;
    const prev = transactions.find(
      (t) => t.assetCode === assetCode && t.validationStatus === 'AUTHORIZED' && t.odometerKm != null
    );
    return prev ? Number(prev.odometerKm) : null;
  }, [transactions, assetCode]);

  // Auto-match compatible nozzle and pre-fill realistic liters / odometer to minimize manual typing
  useEffect(() => {
    if (!assetCode || !nozzles.length) return;
    if (assetKind === 'VEHICLE') {
      const v = vehicles.find((item) => item.vehicleCode === assetCode);
      const preferred = v?.profile?.selectedFuelCode;
      if (preferred) {
        const match = nozzles.find((n) => n.active && n.fuelCode === preferred);
        if (match) setNozzleCode(match.nozzleCode);
      }
      if (lastOdometer != null) {
        setOdometerKm((prev) => (prev === '' ? String(lastOdometer) : prev));
      }
    } else {
      const u = containerUnits.find((item) => item.containerCode === assetCode);
      if (u) {
        const match = nozzles.find((n) => n.active && n.fuelCode === u.preferredFuelCode);
        if (match) setNozzleCode(match.nozzleCode);
        if (u.currentFuelPct != null && u.tankCapacityLiters != null) {
          const fillLiters = Math.max(
            10,
            Math.round(((100 - Number(u.currentFuelPct)) / 100) * Number(u.tankCapacityLiters))
          );
          setLiters(String(fillLiters));
        }
      }
    }
  }, [assetKind, assetCode, vehicles, containerUnits, nozzles, lastOdometer]);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!stationCode || !nozzleCode || !assetCode || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.ingestFuelTransactions(stationCode, [
        {
          nozzleCode,
          assetKind,
          assetCode,
          liters: Number(liters),
          odometerKm: odometerKm === '' ? null : Number(odometerKm),
          tankLevelBeforePct: tankBeforePct === '' ? null : Number(tankBeforePct),
          tankLevelAfterPct: tankAfterPct === '' ? null : Number(tankAfterPct),
          sourceType,
          invoiceRef: invoiceRef || null
        }
      ]);
      setNotice('Đã ghi nhận giao dịch bơm & tự động đối soát tồn bồn, bình dầu, CO₂ TTW.');
      setInvoiceRef('');
      setTankBeforePct('');
      setTankAfterPct('');
      await onIngested?.();
    } catch (err) {
      setError(err?.message || 'Không đồng bộ được giao dịch trụ bơm.');
    } finally {
      setBusy(false);
    }
  };

  const handleCsvBatchImport = async () => {
    if (!stationCode || !csvBatchText.trim() || busy) return;
    const lines = csvBatchText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    const batch = [];
    for (const line of lines) {
      const [nCode, kind, code, qty, odo, inv] = line.split(/[,\t;]/).map((s) => s.trim());
      if (!nCode || !code || !Number(qty)) continue;
      batch.push({
        nozzleCode: nCode,
        assetKind: kind === 'CONTAINER_GENSET' ? 'CONTAINER_GENSET' : 'VEHICLE',
        assetCode: code,
        liters: Number(qty),
        odometerKm: odo && Number.isFinite(Number(odo)) ? Number(odo) : null,
        sourceType: 'MANUAL_IMPORT',
        invoiceRef: inv || null
      });
    }
    if (!batch.length) {
      setError('Không đọc được dòng hợp lệ (định dạng: Vòi,Loại(VEHICLE|CONTAINER_GENSET),Mã,Lít,Odo,SốHĐ).');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.ingestFuelTransactions(stationCode, batch);
      setNotice(`Đã đồng bộ hàng loạt ${batch.length} giao dịch nhiên liệu vào hệ thống.`);
      setCsvBatchText('');
      setShowBatchCsv(false);
      await onIngested?.();
    } catch (err) {
      setError(err?.message || 'Không đồng bộ được lô CSV.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fuel-overview-card" aria-label="Nhật ký giao dịch trạm bơm tự động">
      <div className="fuel-section-heading">
        <span className="fuel-overview-icon">
          <Receipt size={18} />
        </span>
        <div>
          <h3>Nhật Ký Bơm Tự Động &amp; Hóa Đơn Điện Tử (RFID / Fleet Card)</h3>
          <p>
            Mọi phiên bơm từ cột bơm depot hoặc Petrolimex Fleet Card tự động khấu trừ tồn bồn, hạch toán CO₂ và phát hiện bất thường rút dầu / vượt định mức.
          </p>
        </div>
      </div>

      {canEdit && typeof api.ingestFuelTransactions === 'function' && stations.length > 0 && (
        <form className="fuel-section" style={{ marginBottom: 18 }} onSubmit={handleIngest}>
          <div className="fuel-section-heading">
            <UploadCloud size={18} />
            <div>
              <h3>Đồng bộ phiên bơm / Nhập hóa đơn từ trụ bơm</h3>
              <p>Ghi nhận tức thời một phiên bơm thực tế (hoặc tích hợp Webhook EGAS/Petrolimex).</p>
            </div>
          </div>

          <div className="fuel-form-grid">
            <label className="fuel-field">
              <span>Trạm bơm</span>
              <select
                value={stationCode}
                onChange={(e) => {
                  const st = stations.find((s) => s.stationCode === e.target.value);
                  setStationCode(e.target.value);
                  setNozzleCode(st?.nozzles?.[0]?.nozzleCode || '');
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
              <span>Vòi bơm</span>
              <select value={nozzleCode} onChange={(e) => setNozzleCode(e.target.value)}>
                {nozzles.map((n) => (
                  <option key={n.nozzleCode} value={n.nozzleCode}>
                    {n.nozzleCode} · {n.fuelName}
                  </option>
                ))}
              </select>
            </label>
            <label className="fuel-field">
              <span>Đối tượng bơm</span>
              <select value={assetKind} onChange={(e) => setAssetKind(e.target.value)}>
                <option value="VEHICLE">Xe đầu kéo / Xe tải</option>
                <option value="CONTAINER_GENSET">Container Lạnh (Genset)</option>
              </select>
            </label>
            <label className="fuel-field">
              <span>Mã xe / Mã Container</span>
              <select value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
                {assetKind === 'VEHICLE'
                  ? vehicles.map((v) => (
                      <option key={v.id} value={v.vehicleCode}>
                        {v.plateNumber} ({v.vehicleCode})
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
              <span>Số lít thực bơm · L *</span>
              <input
                required
                type="number"
                min="0.1"
                max="5000"
                step="0.1"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
              />
            </label>
            <label className="fuel-field">
              <span>Nguồn đồng bộ &amp; Odometer (km)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  <option value="DEPOT_RFID">RFID Depot</option>
                  <option value="FLEET_CARD">Fleet Card Petrolimex</option>
                  <option value="E_INVOICE_SYNC">HĐĐT Tổng cục Thuế</option>
                  <option value="MANUAL_IMPORT">Nhập lô CSV/POS</option>
                </select>
                <input
                  type="number"
                  min="0"
                  placeholder={lastOdometer != null ? `Lần trước: ${lastOdometer}` : 'Odo km'}
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                />
              </div>
            </label>
            <label className="fuel-field">
              <span>Đối soát cảm biến bình dầu (% trước → sau · tùy chọn)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="% trước"
                  value={tankBeforePct}
                  onChange={(e) => setTankBeforePct(e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="% sau"
                  value={tankAfterPct}
                  onChange={(e) => setTankAfterPct(e.target.value)}
                />
              </div>
            </label>
          </div>

          <div className="fuel-form-footer">
            <span>Tự động chọn vòi khớp nhiên liệu xe, phát hiện tua Odo &amp; lệch bình dầu.</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setShowBatchCsv((v) => !v)}
              >
                <FileSpreadsheet size={15} /> {showBatchCsv ? 'Đóng nhập lô CSV' : 'Nhập nhanh lô CSV'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !assetCode}>
                Ghi nhận phiên bơm
              </button>
            </div>
          </div>

          {showBatchCsv && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <textarea
                rows={3}
                aria-label="Dữ liệu lô giao dịch CSV"
                placeholder="Mỗi dòng 1 phiên: NZ-DO5-01,VEHICLE,VEH-01,120,52400,HD-901"
                value={csvBatchText}
                onChange={(e) => setCsvBatchText(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" disabled={busy || !csvBatchText.trim()} onClick={handleCsvBatchImport}>
                  Đồng bộ cả lô
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="fuel-error" role="alert">
              <AlertTriangle size={15} /> {error}
            </p>
          )}
          {notice && (
            <p className="fuel-success" role="status">
              <CheckCircle2 size={15} /> {notice}
            </p>
          )}
        </form>
      )}

      <div className="fuel-table-wrap">
        <table>
          <caption>Lịch sử đồng bộ giao dịch trạm bơm gần nhất ({transactions.length} giao dịch)</caption>
          <thead>
            <tr>
              <th>Thời gian / Nguồn</th>
              <th>Trạm &amp; Vòi</th>
              <th>Phương tiện / Container</th>
              <th>Nhiên liệu</th>
              <th>Số lượng &amp; Thành tiền</th>
              <th>CO₂ TTW</th>
              <th>Kiểm soát tự động</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id || t.transactionRef}>
                <td>
                  <strong>{formatDateTimeVi(t.pumpedAt)}</strong>
                  <small>
                    {t.sourceType} {t.invoiceRef ? `· ${t.invoiceRef}` : ''}
                  </small>
                </td>
                <td>
                  <strong>{t.stationCode}</strong>
                  <small>Vòi {t.nozzleCode}</small>
                </td>
                <td>
                  <strong>{t.assetCode}</strong>
                  <small>{t.assetKind === 'CONTAINER_GENSET' ? 'Container Genset' : 'Xe vận tải'}</small>
                </td>
                <td>{t.fuelName}</td>
                <td>
                  <strong>{number(t.liters, 2)} L</strong>
                  <small>{money(t.totalCostVnd)}</small>
                </td>
                <td>{number(t.physicalCo2Kg, 2)} kg</td>
                <td>
                  <span
                    className={
                      t.validationStatus === 'AUTHORIZED' ? 'fuel-tag' : 'fuel-alert-tag'
                    }
                  >
                    {t.validationStatus}
                  </span>
                  {t.validationReason && <small>{t.validationReason}</small>}
                </td>
              </tr>
            ))}
            {!transactions.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>
                  Chưa có giao dịch nào từ trụ bơm hoặc Fleet Card.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

