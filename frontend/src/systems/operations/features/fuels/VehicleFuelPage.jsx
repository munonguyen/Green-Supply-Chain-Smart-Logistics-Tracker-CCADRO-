import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ExternalLink,
  Fuel,
  Leaf,
  Receipt,
  RefreshCw,
  Search,
  Truck
} from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import { SlidingPillTabs } from '../../../../shared/effects';
import { familyOf, money, number, unwrap } from './fuelHelpers';
import FuelOverviewPanel from './FuelOverviewPanel';
import FuelStationsPanel from './FuelStationsPanel';
import FuelTransactionsPanel from './FuelTransactionsPanel';
import VehicleFuelWorkspace from './VehicleFuelWorkspace';
import './vehicle-fuels.css';

export default function VehicleFuelPage() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER'].includes(user?.role);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [stations, setStations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [containerUnits, setContainerUnits] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const selectedVehicleId = params.get('vehicle');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const safeOptional = (fn) => (typeof fn === 'function' ? fn().catch(() => null) : Promise.resolve(null));
      const [catalogRes, stationsRes, txRes, unitsRes] = await Promise.all([
        api.getVehicleFuelCatalog(),
        safeOptional(api.getFuelStations),
        safeOptional(api.getFuelTransactions),
        safeOptional(api.getContainerFuelUnits)
      ]);
      setData(unwrap(catalogRes));
      if (stationsRes) setStations(unwrap(stationsRes) || []);
      if (txRes) setTransactions(unwrap(txRes) || []);
      if (unitsRes) setContainerUnits(unwrap(unitsRes) || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Không tải được dữ liệu nhiên liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = data?.vehicles.find((v) => v.id === selectedVehicleId);

  useEffect(() => {
    if (selectedVehicleId) {
      setActiveTab('vehicle');
    } else if (activeTab === 'vehicle') {
      setActiveTab('overview');
    }
  }, [selectedVehicleId, activeTab]);

  const vehicles =
    data?.vehicles.filter(
      (v) =>
        (family === 'ALL' || familyOf(v) === family) &&
        `${v.vehicleCode} ${v.plateNumber}`.toLowerCase().includes(query.trim().toLowerCase())
    ) || [];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'vehicle' && selectedVehicleId) {
      setParams({});
    }
  };

  return (
    <div className="fuel-page">
      <header className="fuel-page-heading">
        <div>
          <p>NHIÊN LIỆU &amp; TỰ ĐỘNG HÓA TRẠM BƠM ĐỘI XE</p>
          <h1>Chọn nhiên liệu, dự toán CO₂</h1>
          <span>So sánh đúng động cơ · Trạm bơm RFID &amp; Petrolimex · Tối ưu lô xe &amp; container lạnh</span>
        </div>
        <div className="fuel-heading-actions">
          {selected && (
            <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
              <ArrowLeft size={16} />
              Tổng quan đội xe
            </button>
          )}
          <button className="btn btn-secondary" disabled={loading} onClick={load}>
            <RefreshCw size={16} />
            Cập nhật hồ sơ
          </button>
        </div>
      </header>

      {error && (
        <p className="fuel-error" role="alert">
          {error}
          <button onClick={load}>Thử lại</button>
        </p>
      )}

      {!data ? (
        <p role="status">Đang tải danh mục và đội xe…</p>
      ) : (
        <>
          <div className="fuel-fleet-metrics">
            <div className="halvi-ink-card">
              <Truck size={21} />
              <span>Xe đã khai báo nhiên liệu</span>
              <strong>
                {data.configuredVehicles}/{data.vehicles.length}
              </strong>
            </div>
            <div>
              <Leaf size={21} />
              <span>Dự toán CO₂ ống xả / năm</span>
              <strong>
                {data.coveredVehicles
                  ? `${number(Number(data.annualPhysicalCo2Kg) / 1000, 2)} tấn`
                  : 'Chưa đủ dữ liệu'}
              </strong>
              <small>
                Chỉ {data.coveredVehicles}/{data.vehicles.length} xe có đủ định mức và km kế hoạch
              </small>
            </div>
            <div>
              <Fuel size={21} />
              <span>CO₂ hóa thạch / sinh học</span>
              <strong>
                {data.coveredVehicles
                  ? `${number(Number(data.annualFossilCo2Kg) / 1000, 2)} / ${number(
                      Number(data.annualBiogenicCo2Kg) / 1000,
                      2
                    )} tấn`
                  : 'Chưa đủ dữ liệu'}
              </strong>
              <small>Không gồm phát thải sản xuất và phân phối nhiên liệu</small>
            </div>
          </div>

          <div className="fuel-price-date">
            <CalendarPrice date={data.priceEffectiveAt} />
            <a href={data.priceSource} target="_blank" rel="noreferrer">
              Bảng giá Petrolimex <ExternalLink size={13} />
            </a>
            <span>Giá tham chiếu đã lưu; nhập báo giá tại trạm nếu có thay đổi.</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SlidingPillTabs
              layoutId="fuel-workspace-tabs"
              ariaLabel="Chế độ vận hành nhiên liệu đội xe"
              activeId={activeTab}
              onChange={handleTabChange}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                padding: 4,
                borderRadius: 12,
                width: 'fit-content',
                maxWidth: '100%'
              }}
              tabs={[
                { id: 'overview', label: 'Tổng quan & Tối ưu lô', icon: BarChart3 },
                { id: 'stations', label: 'Trạm bơm & Khóa an toàn', icon: Fuel, badge: stations.length || null },
                { id: 'transactions', label: 'Nhật ký bơm tự động', icon: Receipt, badge: transactions.length || null },
                ...(selected ? [{ id: 'vehicle', label: `Xe ${selected.plateNumber}`, icon: Truck }] : [])
              ]}
            />
          </div>

          <div className="fuel-page-layout">
            <aside className="fuel-fleet-list" aria-label="Danh sách xe nhiên liệu">
              <h2>
                <Truck size={17} /> Chọn phương tiện <span>{vehicles.length}</span>
              </h2>
              <label className="fuel-search">
                <Search size={16} />
                <input
                  aria-label="Tìm xe nhiên liệu"
                  placeholder="Biển số, mã xe…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Lọc hệ động lực"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="ALL">Tất cả hệ động lực</option>
                <option value="DIESEL">Diesel</option>
                <option value="GASOLINE">Xăng</option>
              </select>
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  className={`fuel-vehicle-row${selected?.id === v.id ? ' is-active' : ''}`}
                  aria-pressed={selected?.id === v.id}
                  onClick={() => {
                    setParams({ vehicle: v.id });
                    setActiveTab('vehicle');
                  }}
                >
                  <div>
                    <Truck size={18} />
                    <strong>{v.plateNumber}</strong>
                    <ArrowRight size={14} />
                  </div>
                  <span>
                    {v.vehicleCode} · {v.fuelType} · {v.euroStandard}
                  </span>
                  <small>
                    {v.profile
                      ? data.fuels.find((f) => f.code === v.profile.selectedFuelCode)?.name
                      : 'Chưa khai báo loại nhiên liệu'}
                  </small>
                  {v.profile && <b>{number(v.profile.consumptionPer100Km, 2)} L/100 km</b>}
                </button>
              ))}
              {!vehicles.length && <p>Không có xe phù hợp.</p>}
            </aside>

            <div className="fuel-main">
              {activeTab === 'vehicle' && selected ? (
                <VehicleFuelWorkspace
                  key={selected.id}
                  vehicle={selected}
                  catalog={data}
                  stations={stations}
                  canEdit={canEdit}
                  onSaved={load}
                />
              ) : activeTab === 'stations' ? (
                <FuelStationsPanel
                  stations={stations}
                  vehicles={data.vehicles}
                  containerUnits={containerUnits}
                  fuels={data.fuels}
                  canEdit={canEdit}
                  onStationsChanged={load}
                />
              ) : activeTab === 'transactions' ? (
                <FuelTransactionsPanel
                  transactions={transactions}
                  stations={stations}
                  vehicles={data.vehicles}
                  containerUnits={containerUnits}
                  canEdit={canEdit}
                  onIngested={load}
                />
              ) : (
                <FuelOverviewPanel
                  data={data}
                  vehicles={vehicles}
                  containerUnits={containerUnits}
                  stations={stations}
                  onSelectVehicle={(id) => {
                    setParams({ vehicle: id });
                    setActiveTab('vehicle');
                  }}
                />
              )}
            </div>
          </div>

          <section className="fuel-section fuel-market-reference">
            <div className="fuel-section-heading">
              <Fuel size={20} />
              <div>
                <h3>Danh mục bán lẻ đã đối chiếu tại Việt Nam</h3>
                <p>
                  Giá theo Petrolimex ngày 19/11/2026. Không coi giá này là báo giá thời gian thực
                  hoặc bảo đảm còn hàng tại mọi trạm.
                </p>
              </div>
            </div>
            <div className="fuel-market-grid">
              {data.fuels.map((f) => (
                <article key={f.code}>
                  <span>{f.family === 'DIESEL' ? 'DIESEL' : `XĂNG · ETHANOL ${f.ethanolPct}%`}</span>
                  <h4>{f.name}</h4>
                  <strong>
                    {money(f.priceRegion1)}
                    <small> / lít · Vùng 1</small>
                  </strong>
                  <p>Vùng 2: tối đa {money(f.priceRegion2)}/L</p>
                  <p>
                    {f.sulfurPpm != null ? `${f.sulfurPpm} ppm lưu huỳnh · ` : ''}mức{' '}
                    {f.qualityLevel}
                    {f.ron ? ` · RON ${f.ron}` : ''}
                  </p>
                  <p>{number(f.physicalCo2KgPerLiter, 3)} kg CO₂/L (tham chiếu TTW)</p>
                </article>
              ))}
            </div>
          </section>

          <details className="fuel-section fuel-methodology">
            <summary>Phương pháp, giới hạn và nguồn dữ liệu</summary>
            <ul>
              {data.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <div>
              {[
                [data.factorSource, 'EPA 2025 · hệ số CO₂ bảng 2'],
                [data.compatibilitySource, 'Petrolimex · chất lượng diesel'],
                [data.marketSource, 'Bộ Công Thương · thị trường E5/E10'],
                [data.energySource, 'EIA · năng lượng ethanol']
              ].map(([url, label]) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {label}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
            <p>Phiên bản: {data.version}</p>
          </details>
        </>
      )}
    </div>
  );
}

function CalendarPrice({ date }) {
  return (
    <strong>
      Giá tham chiếu: {new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
    </strong>
  );
}
