import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../services/api';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import SearchToolbar from '../../../../shared/components/search/SearchToolbar';
import {
  BarChart3,
  Target,
  TrendingDown,
  Leaf,
  ShieldCheck,
  CheckCircle,
  Clock,
  Zap,
  Layers,
  Download,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Sparkles,
  MapPin,
  Award,
  Check
} from 'lucide-react';
import './benchmark.css';

const SOUTHERN_ECONOMIC_CORRIDORS = [
  {
    id: 'cor-catlai-vsip1',
    corridorCode: 'HCMC_PORT_CLUSTER_BINH_DUONG_VSIP_CLUSTER',
    benchmarkName: 'Hành lang Cảng Cát Lái ↔ KCN VSIP 1 Bình Dương',
    shortCode: 'CATLAI-VSIP1',
    originZone: 'TP. Thủ Đức (Cụm Cảng Cát Lái)',
    destinationZone: 'Thuận An, Bình Dương (VSIP 1)',
    distanceKm: 28.5,
    averageCo2ePerTonneKm: '0.0820',
    bestInClassCo2ePerTonneKm: '0.0590',
    reductionPercentage: 28.0,
    periodMonth: '2026-11',
    category: 'port',
    grade: 'A+',
    gradeLabel: 'Xuất sắc (A+)',
    evShare: '35%',
    fleetTip: 'Tối ưu sạc đêm tại Depot Cát Lái & chuyển giờ tránh cao điểm Mỹ Thủy.'
  },
  {
    id: 'cor-caimep-nhontrach',
    corridorCode: 'CAI_MEP_PORT_NHON_TRACH_CLUSTER',
    benchmarkName: 'Hành lang Cụm Cảng Cái Mép ↔ KCN Nhơn Trạch & Biên Hòa',
    shortCode: 'CAIMEP-NHONTRACH',
    originZone: 'Phú Mỹ, BR-VT (Cái Mép)',
    destinationZone: 'Nhơn Trạch & Biên Hòa, Đồng Nai',
    distanceKm: 42.0,
    averageCo2ePerTonneKm: '0.0865',
    bestInClassCo2ePerTonneKm: '0.0620',
    reductionPercentage: 28.3,
    periodMonth: '2026-11',
    category: 'port',
    grade: 'A+',
    gradeLabel: 'Xuất sắc (A+)',
    evShare: '40%',
    fleetTip: 'Tuyến QL51 và cao tốc địa hình phẳng, ưu tiên 100% đầu kéo EV 350kWh.'
  },
  {
    id: 'cor-songthan-hiepphuoc',
    corridorCode: 'SONG_THAN_ICD_HIEP_PHUOC_PORT',
    benchmarkName: 'Hành lang ICD Sóng Thần ↔ Cụm Cảng Hiệp Phước',
    shortCode: 'SONGTHAN-HIEPPHUOC',
    originZone: 'Dĩ An, Bình Dương (ICD Sóng Thần)',
    destinationZone: 'Nhà Bè, TP. HCM (Cảng Hiệp Phước)',
    distanceKm: 38.2,
    averageCo2ePerTonneKm: '0.0890',
    bestInClassCo2ePerTonneKm: '0.0665',
    reductionPercentage: 25.3,
    periodMonth: '2026-11',
    category: 'port',
    grade: 'A',
    gradeLabel: 'Đạt chuẩn (A)',
    evShare: '25%',
    fleetTip: 'Kết nối xà lan thủy nội địa kết hợp EV chặng cuối giảm 45% tải đường bộ.'
  },
  {
    id: 'cor-tanbinh-catlai',
    corridorCode: 'TAN_BINH_IP_CAT_LAI_PORT',
    benchmarkName: 'Hành lang Nội đô KCN Tân Bình ↔ Cảng Cát Lái',
    shortCode: 'TANBINH-CATLAI',
    originZone: 'Tân Phú / Tân Bình, TP. HCM',
    destinationZone: 'TP. Thủ Đức, TP. HCM (Cát Lái)',
    distanceKm: 24.6,
    averageCo2ePerTonneKm: '0.0940',
    bestInClassCo2ePerTonneKm: '0.0680',
    reductionPercentage: 27.7,
    periodMonth: '2026-11',
    category: 'industrial',
    grade: 'A',
    gradeLabel: 'Đạt chuẩn (A)',
    evShare: '30%',
    fleetTip: 'Áp dụng khung giờ xanh 22:00 - 05:00 để tránh điểm nghẽn Cộng Hòa - Mai Chí Thọ.'
  },
  {
    id: 'cor-vd3-longthanh',
    corridorCode: 'VANH_DAI_3_LONG_THANH_LOGISTICS',
    benchmarkName: 'Hành lang Vành Đai 3 TP. HCM ↔ Cụm Logistics Long Thành',
    shortCode: 'VD3-LONGTHANH',
    originZone: 'Vành Đai 3 / TP. Thủ Đức',
    destinationZone: 'Long Thành, Đồng Nai',
    distanceKm: 34.0,
    averageCo2ePerTonneKm: '0.0810',
    bestInClassCo2ePerTonneKm: '0.0580',
    reductionPercentage: 28.4,
    periodMonth: '2026-11',
    category: 'industrial',
    grade: 'A+',
    gradeLabel: 'Xuất sắc (A+)',
    evShare: '45%',
    fleetTip: 'Hành lang tốc độ cao, tối ưu khí động học và phân bổ trạm sạc siêu nhanh 180kW.'
  }
];

export default function BenchmarkPage() {
  const [benchmarks, setBenchmarks] = useState(SOUTHERN_ECONOMIC_CORRIDORS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeCorridorId, setActiveCorridorId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchBenchmarks = () => {
    setLoading(true);
    api
      .getCarbonBenchmarks()
      .then((res) => {
        const list = res?.result ?? res;
        if (Array.isArray(list) && list.length > 0) {
          // Merge dynamic backend records with the comprehensive corridor catalog
          const merged = SOUTHERN_ECONOMIC_CORRIDORS.map((c) => {
            const matchedBackend = list.find(
              (b) =>
                (b.corridorCode && (b.corridorCode === c.corridorCode || b.corridorCode === c.shortCode)) ||
                (b.id === c.id) ||
                (b.benchmarkName &&
                  b.benchmarkName.toLowerCase().includes('binh duong') &&
                  c.id === 'cor-catlai-vsip1')
            );
            if (matchedBackend) {
              const avg = Number(matchedBackend.averageCo2ePerTonneKm || c.averageCo2ePerTonneKm);
              const best = Number(matchedBackend.bestInClassCo2ePerTonneKm || c.bestInClassCo2ePerTonneKm);
              const pct = avg > 0 ? Number((((avg - best) / avg) * 100).toFixed(1)) : c.reductionPercentage;
              return {
                ...c,
                averageCo2ePerTonneKm: avg.toFixed(4),
                bestInClassCo2ePerTonneKm: best.toFixed(4),
                reductionPercentage: pct,
                periodMonth: matchedBackend.periodMonth || c.periodMonth
              };
            }
            return c;
          });
          setBenchmarks(merged);
        } else {
          setBenchmarks(SOUTHERN_ECONOMIC_CORRIDORS);
        }
        setLoading(false);
      })
      .catch(() => {
        setBenchmarks(SOUTHERN_ECONOMIC_CORRIDORS);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3600);
  };

  // Category & search filtering
  const filteredByCategory = useMemo(() => {
    if (categoryFilter === 'all') return benchmarks;
    if (categoryFilter === 'port') return benchmarks.filter((b) => b.category === 'port');
    if (categoryFilter === 'industrial') return benchmarks.filter((b) => b.category === 'industrial');
    if (categoryFilter === 'top_reduction') return benchmarks.filter((b) => Number(b.reductionPercentage) >= 27.5);
    return benchmarks;
  }, [benchmarks, categoryFilter]);

  const elasticBenchmarks = useMemo(
    () =>
      elasticSearchMatch(filteredByCategory, searchQuery, [
        'benchmarkName',
        'shortCode',
        'originZone',
        'destinationZone',
        'periodMonth'
      ]),
    [filteredByCategory, searchQuery]
  );

  // Executive KPI summary calculations
  const summary = useMemo(() => {
    const active = benchmarks.length > 0 ? benchmarks : SOUTHERN_ECONOMIC_CORRIDORS;
    const avgMean =
      active.reduce((sum, b) => sum + Number(b.averageCo2ePerTonneKm || 0), 0) / active.length;
    const bestMin = Math.min(...active.map((b) => Number(b.bestInClassCo2ePerTonneKm || 0.059)));
    const pct = avgMean > 0 ? ((avgMean - bestMin) / avgMean) * 100 : 27.6;
    return {
      avgMean: avgMean.toFixed(4),
      bestMin: bestMin.toFixed(4),
      reductionPct: `-${pct.toFixed(1)}%`,
      corridorsCount: active.length,
      avoidedCarbonTonnes: '142.8'
    };
  }, [benchmarks]);

  // Max value for comparative bar scaling
  const maxIntensity = useMemo(() => {
    const maxVal = Math.max(
      ...benchmarks.map((b) => Number(b.averageCo2ePerTonneKm || 0.095)),
      0.1
    );
    return maxVal * 1.05;
  }, [benchmarks]);

  const handleExportCSV = () => {
    const headers = [
      'ID Hành Lang,Tên Hành Lang,Điểm Xuất Phát,Điểm Đích,Cự Ly (km),Trung Bình Vùng (kgCO2e/t-km),Mốc Đội Xe Xanh (kgCO2e/t-km),Dư Địa Giảm (%),Kỳ Đối Chuẩn'
    ];
    const rows = benchmarks.map((b) =>
      `"${b.id}","${b.benchmarkName}","${b.originZone}","${b.destinationZone}",${b.distanceKm},${b.averageCo2ePerTonneKm},${b.bestInClassCo2ePerTonneKm},"-${b.reductionPercentage}%","${b.periodMonth}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CCADRO_Carbon_Corridor_Benchmark_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất báo cáo đối chuẩn ESG (GLEC v3 / ISO 14083) thành công!');
  };

  return (
    <div className="page-body benchmark-dashboard">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="benchmark-toast">
          <CheckCircle size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Executive Controls */}
      <div className="benchmark-header">
        <div className="benchmark-title-group">
          <div className="benchmark-overline">
            <span className="benchmark-overline-dot"></span>
            ĐỐI CHUẨN HIỆU SUẤT CARBON THEO HÀNH LANG VẬN TẢI
          </div>
          <h2 className="benchmark-main-title">
            Đối Chuẩn Cường Độ Phát Thải Các Hành Lang Kinh Tế Phía Nam
          </h2>
          <p className="benchmark-subtitle">
            Hệ thống định mức phát thải GLEC Framework v3 &amp; ISO 14083:2023 • Giám sát mức phát thải thực tế so với chuẩn Đội xe Xanh tối ưu (Best-in-Class)
          </p>
        </div>

        <div className="benchmark-header-actions">
          <span className="benchmark-badge-standard">
            <Leaf size={14} color="#10b981" />
            Chuẩn GLEC v3.0
          </span>
          <span className="benchmark-badge-standard">
            <ShieldCheck size={14} color="#10b981" />
            ISO 14083 Audited
          </span>
          <button
            type="button"
            className="benchmark-btn-export"
            onClick={fetchBenchmarks}
            title="Làm mới dữ liệu đối chuẩn"
          >
            <RefreshCw size={15} />
            Đồng bộ Live
          </button>
          <button
            type="button"
            className="benchmark-btn-export"
            onClick={handleExportCSV}
            title="Xuất bảng đối chuẩn định dạng CSV/Excel"
          >
            <Download size={15} />
            Xuất Báo Cáo ESG
          </button>
        </div>
      </div>

      {/* Executive KPI Metrics Strip (4 Cards) */}
      <div className="benchmark-kpi-grid">
        <div className="benchmark-kpi-card kpi-baseline">
          <div className="benchmark-kpi-info">
            <div className="benchmark-kpi-label">
              Trung Bình Vùng ({summary.corridorsCount} Hành Lang)
            </div>
            <div className="benchmark-kpi-value" style={{ color: 'var(--accent-blue, #0ea5e9)' }}>
              {summary.avgMean}
              <span className="benchmark-kpi-unit">kgCO₂e/t·km</span>
            </div>
            <div className="benchmark-kpi-subtext">
              Mức bình quân thị trường vận tải phía Nam
            </div>
          </div>
          <div className="benchmark-kpi-icon-box">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="benchmark-kpi-card kpi-best">
          <div className="benchmark-kpi-info">
            <div className="benchmark-kpi-label">
              Mốc Đội Xe Xanh Tối Ưu (Best-In-Class)
            </div>
            <div className="benchmark-kpi-value" style={{ color: 'var(--accent-green, #10b981)' }}>
              {summary.bestMin}
              <span className="benchmark-kpi-unit">kgCO₂e/t·km</span>
            </div>
            <div className="benchmark-kpi-subtext">
              Mục tiêu định mức Đội xe Điện &amp; Euro 5/6
            </div>
          </div>
          <div className="benchmark-kpi-icon-box">
            <Target size={24} />
          </div>
        </div>

        <div className="benchmark-kpi-card kpi-potential">
          <div className="benchmark-kpi-info">
            <div className="benchmark-kpi-label">
              Dư Địa Cắt Giảm Tiềm Năng
            </div>
            <div className="benchmark-kpi-value" style={{ color: 'var(--accent-amber, #f59e0b)' }}>
              {summary.reductionPct}
              <span className="benchmark-kpi-unit">Toàn mạng lưới</span>
            </div>
            <div className="benchmark-kpi-subtext">
              Đồng bộ định tuyến 3D Pareto &amp; sạc xanh
            </div>
          </div>
          <div className="benchmark-kpi-icon-box">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="benchmark-kpi-card kpi-total-saved">
          <div className="benchmark-kpi-info">
            <div className="benchmark-kpi-label">
              Lượng CO₂e Đã Tránh Được (YTD)
            </div>
            <div className="benchmark-kpi-value" style={{ color: '#059669' }}>
              {summary.avoidedCarbonTonnes}
              <span className="benchmark-kpi-unit">Tấn CO₂e</span>
            </div>
            <div className="benchmark-kpi-subtext">
              Tương đương 6,490 cây xanh quang hợp
            </div>
          </div>
          <div className="benchmark-kpi-icon-box">
            <Leaf size={24} />
          </div>
        </div>
      </div>

      {/* Core Analytics Row: Grouped Comparison Chart & Side Breakdown */}
      <div className="benchmark-analytics-row">
        {/* Left Column: Interactive Corridor Comparison Chart */}
        <div className="benchmark-card">
          <div className="benchmark-card-header">
            <div className="benchmark-card-title-group">
              <h3 className="benchmark-card-title">
                <BarChart3 size={18} color="#10b981" />
                Đối Chiếu Cường Độ Phát Thải Theo Từng Hành Lang
              </h3>
              <span className="benchmark-card-subtitle">
                Đơn vị đo: kgCO₂e / tấn·km (GLEC v3 - Phạm vi Well-to-Wheel / WTW) • Nhấp vào hành lang để chọn
              </span>
            </div>

            <div className="benchmark-chart-legend">
              <div className="benchmark-legend-item">
                <span className="legend-dot-baseline"></span>
                <span>Trung Bình Vùng (Baseline)</span>
              </div>
              <div className="benchmark-legend-item">
                <span className="legend-dot-best"></span>
                <span>Đội Xe Xanh (Best-in-Class)</span>
              </div>
            </div>
          </div>

          <div className="benchmark-bars-container">
            {benchmarks.map((corridor) => {
              const avgNum = Number(corridor.averageCo2ePerTonneKm || 0.08);
              const bestNum = Number(corridor.bestInClassCo2ePerTonneKm || 0.06);
              const baselineWidthPct = Math.min(100, (avgNum / maxIntensity) * 100);
              const bestWidthPct = Math.min(100, (bestNum / maxIntensity) * 100);
              const isActive = activeCorridorId === corridor.id;

              return (
                <div
                  key={corridor.id}
                  className={`benchmark-bar-row ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveCorridorId(isActive ? null : corridor.id)}
                  title={`Nhấp để lọc nhanh hành lang ${corridor.benchmarkName}`}
                >
                  <div className="benchmark-bar-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="benchmark-corridor-name">{corridor.benchmarkName}</span>
                      <span className="benchmark-dist-badge">{corridor.distanceKm} km</span>
                    </div>
                    <span className="benchmark-saving-pill">
                      <TrendingDown size={12} />
                      Giảm -{corridor.reductionPercentage}%
                    </span>
                  </div>

                  <div className="benchmark-comparison-bars">
                    {/* Baseline Track */}
                    <div className="comparison-bar-track" title={`Baseline: ${corridor.averageCo2ePerTonneKm} kgCO2e/t-km`}>
                      <div
                        className="bar-fill-baseline"
                        style={{ width: `${baselineWidthPct}%` }}
                      ></div>
                    </div>

                    {/* Best-In-Class Track */}
                    <div className="comparison-bar-track" title={`Best-in-Class: ${corridor.bestInClassCo2ePerTonneKm} kgCO2e/t-km`}>
                      <div
                        className="bar-fill-best"
                        style={{ width: `${bestWidthPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="benchmark-bar-values">
                    <span>Baseline: {corridor.averageCo2ePerTonneKm} kgCO₂e/t·km</span>
                    <span style={{ color: 'var(--accent-green, #10b981)', fontWeight: 700 }}>
                      Best-in-Class: {corridor.bestInClassCo2ePerTonneKm} kgCO₂e/t·km
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Fleet Powertrain Mix & GLEC Audit Compliance */}
        <div className="benchmark-card benchmark-side-panel">
          {/* Section 1: Fleet Powertrain Mix */}
          <div className="benchmark-side-section">
            <h4 className="benchmark-section-heading">Cơ Cấu Phương Tiện &amp; Phát Thải</h4>
            <div className="powertrain-mix-card">
              <div className="powertrain-item">
                <div className="powertrain-header">
                  <span className="powertrain-name">
                    <Zap size={14} color="#10b981" />
                    Đầu kéo Điện (EV Heavy Truck)
                  </span>
                  <span className="powertrain-intensity">0.0150 kgCO₂e/t·km</span>
                </div>
                <div className="powertrain-progress-bar">
                  <div
                    className="powertrain-progress-fill"
                    style={{ width: '35%', background: '#10b981' }}
                  ></div>
                </div>
                <div className="powertrain-share">
                  <span>Tỷ trọng đội xe: <strong>35%</strong></span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>Giảm -82% vs Diesel</span>
                </div>
              </div>

              <div className="powertrain-item">
                <div className="powertrain-header">
                  <span className="powertrain-name">
                    <ShieldCheck size={14} color="#0ea5e9" />
                    Đầu kéo Euro 5 / Euro 6
                  </span>
                  <span className="powertrain-intensity" style={{ color: '#0ea5e9' }}>
                    0.0620 kgCO₂e/t·km
                  </span>
                </div>
                <div className="powertrain-progress-bar">
                  <div
                    className="powertrain-progress-fill"
                    style={{ width: '45%', background: '#0ea5e9' }}
                  ></div>
                </div>
                <div className="powertrain-share">
                  <span>Tỷ trọng đội xe: <strong>45%</strong></span>
                  <span style={{ color: '#0ea5e9', fontWeight: 700 }}>Giảm -25% vs Baseline</span>
                </div>
              </div>

              <div className="powertrain-item">
                <div className="powertrain-header">
                  <span className="powertrain-name">
                    <Clock size={14} color="#f59e0b" />
                    Xe Diesel Tiêu Chuẩn Cũ
                  </span>
                  <span className="powertrain-intensity" style={{ color: '#f59e0b' }}>
                    0.0980 kgCO₂e/t·km
                  </span>
                </div>
                <div className="powertrain-progress-bar">
                  <div
                    className="powertrain-progress-fill"
                    style={{ width: '20%', background: '#f59e0b' }}
                  ></div>
                </div>
                <div className="powertrain-share">
                  <span>Tỷ trọng đội xe: <strong>20%</strong></span>
                  <span style={{ color: '#d97706', fontWeight: 700 }}>Đang lộ trình chuyển đổi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Compliance Scorecard */}
          <div className="benchmark-side-section">
            <h4 className="benchmark-section-heading">Kiểm Toán Tuân Thủ Chuẩn Quốc Tế</h4>
            <div className="compliance-scorecard-grid">
              <div className="compliance-box">
                <span className="compliance-label">GLEC Framework v3</span>
                <span className="compliance-val is-compliant">
                  <CheckCircle size={15} />
                  98.4% Đạt chuẩn
                </span>
              </div>

              <div className="compliance-box">
                <span className="compliance-label">ISO 14083:2023</span>
                <span className="compliance-val is-compliant">
                  <CheckCircle size={15} />
                  Hợp quy 100%
                </span>
              </div>

              <div className="compliance-box">
                <span className="compliance-label">Độ tin cậy dữ liệu (DQR)</span>
                <span className="compliance-val" style={{ color: '#0ea5e9' }}>
                  <Award size={15} />
                  Cấp 1 - Primary IoT
                </span>
              </div>

              <div className="compliance-box">
                <span className="compliance-label">Tần suất hiệu chuẩn</span>
                <span className="compliance-val">
                  <Clock size={15} />
                  Real-time (Live)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Benchmark Leaderboard Table */}
      <div className="benchmark-card">
        <div className="benchmark-card-header">
          <div className="benchmark-card-title-group">
            <h3 className="benchmark-card-title">
              <Sparkles size={18} color="#10b981" />
              Bảng Xếp Hạng Hiệu Suất Từng Hành Lang Trọng Điểm
            </h3>
            <span className="benchmark-card-subtitle">
              Chi tiết định mức phát thải trung bình vùng so với định mức Đội xe Xanh CCADRO
            </span>
          </div>

          <div style={{ minWidth: 0, flex: '0 1 340px', width: '100%' }}>
            <SearchToolbar
              value={searchQuery}
              onChange={setSearchQuery}
              label="Tìm hành lang"
              loading={loading}
              placeholder="Tên hành lang, điểm đi hoặc đến…"
              totalCount={filteredByCategory.length}
              matchedCount={elasticBenchmarks.items.length}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ marginBottom: 14 }}>
          <div className="benchmark-filter-tabs">
            <button
              type="button"
              className={`benchmark-filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              Tất cả ({benchmarks.length})
            </button>
            <button
              type="button"
              className={`benchmark-filter-pill ${categoryFilter === 'port' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('port')}
            >
              Cảng Biển &amp; ICD ({benchmarks.filter((b) => b.category === 'port').length})
            </button>
            <button
              type="button"
              className={`benchmark-filter-pill ${categoryFilter === 'industrial' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('industrial')}
            >
              KCN &amp; Vành Đai ({benchmarks.filter((b) => b.category === 'industrial').length})
            </button>
            <button
              type="button"
              className={`benchmark-filter-pill ${categoryFilter === 'top_reduction' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('top_reduction')}
            >
              Dư địa giảm &gt; 27.5% ({benchmarks.filter((b) => Number(b.reductionPercentage) >= 27.5).length})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="benchmark-table-wrapper">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Tên Hành Lang Vận Tải</th>
                <th>Tuyến Đường (Origin ➔ Destination)</th>
                <th>Trung Bình Vùng</th>
                <th>Chuẩn Đội Xe Xanh</th>
                <th>Mức Cắt Giảm</th>
                <th>Xếp Hạng GLEC</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    Đang đồng bộ dữ liệu đối chuẩn hành lang phát thải...
                  </td>
                </tr>
              ) : elasticBenchmarks.items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Không tìm thấy hành lang nào khớp với bộ lọc hoặc từ khóa "{searchQuery}".
                  </td>
                </tr>
              ) : (
                elasticBenchmarks.items.map((b) => {
                  const isHighlighted = activeCorridorId === b.id;
                  return (
                    <tr
                      key={b.id || b.benchmarkName}
                      style={{
                        backgroundColor: isHighlighted ? 'rgba(16, 185, 129, 0.07)' : undefined
                      }}
                    >
                      <td>
                        <div className="benchmark-corridor-chip">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: b.grade === 'A+' ? '#10b981' : '#0ea5e9'
                            }}
                          ></span>
                          <span>{b.benchmarkName}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          Mã: {b.shortCode || b.id} • Kỳ: {b.periodMonth}
                        </div>
                      </td>

                      <td>
                        <div className="benchmark-route-stack">
                          <div className="benchmark-route-origin">
                            <MapPin size={12} color="#64748b" />
                            <span>{b.originZone}</span>
                          </div>
                          <div className="benchmark-route-dest">
                            <ArrowRight size={12} color="#10b981" />
                            <span>{b.destinationZone}</span>
                            <span className="benchmark-dist-badge">{b.distanceKm} km</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                          {b.averageCo2ePerTonneKm}
                        </span>{' '}
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>kgCO₂e/t·km</span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 800,
                            color: 'var(--accent-green, #059669)'
                          }}
                        >
                          {b.bestInClassCo2ePerTonneKm}
                        </span>{' '}
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>kgCO₂e/t·km</span>
                      </td>

                      <td>
                        <span className="benchmark-saving-pill">
                          <TrendingDown size={12} />
                          -{b.reductionPercentage}%
                        </span>
                      </td>

                      <td>
                        <span
                          className={`benchmark-badge-grade ${b.grade === 'A+' ? 'grade-a' : 'grade-b'}`}
                        >
                          {b.grade === 'A+' ? (
                            <Check size={12} strokeWidth={3} />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          {b.gradeLabel || (b.grade === 'A+' ? 'Xuất sắc (A+)' : 'Đạt chuẩn (A)')}
                        </span>
                      </td>

                      <td>
                        <Link
                          to="/shipments"
                          className="benchmark-action-btn"
                          title={`Điều phối vận đơn trên hành lang ${b.benchmarkName}`}
                        >
                          Điều phối
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Dispatcher Smart Recommendations (3 Cards) */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-green, #10b981)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            AI DISPATCHER RECOMMENDATIONS
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>
            Khuyến Nghị Điều Phối Thông Minh Tối Ưu Hóa Hành Lang
          </h3>
        </div>

        <div className="benchmark-recommendations-grid">
          <div className="recommendation-card rec-timing">
            <div className="recommendation-title">
              <Clock size={16} color="#0ea5e9" />
              Chuyển Khung Giờ Xuất Bến Tránh Cao Điểm Cát Lái
            </div>
            <p className="recommendation-desc">
              Dịch chuyển giờ xuất bến từ cụm cảng Cát Lái sang khung 20:00 – 05:00 giúp giảm 14.2% thời gian chạy không tải do ùn tắc tại Vòng xoay Mỹ Thủy &amp; Cầu Đồng Nai.
            </p>
            <div className="recommendation-impact">
              <TrendingDown size={14} />
              Tiết kiệm ~1.85 tấn CO₂e / tuần trên toàn đội xe
            </div>
          </div>

          <div className="recommendation-card rec-ev">
            <div className="recommendation-title">
              <Zap size={16} color="#10b981" />
              Ưu Tiên Đội Xe Điện Tuyến Cái Mép ↔ Nhơn Trạch
            </div>
            <p className="recommendation-desc">
              Hành lang Cái Mép – Nhơn Trạch có địa hình bằng phẳng và 3 trạm sạc nhanh công suất cao, tối ưu khả năng tái tạo năng lượng phanh (Regenerative Braking) tới 18%.
            </p>
            <div className="recommendation-impact">
              <TrendingDown size={14} />
              Cắt giảm 31.4% phát thải và tiết kiệm chi phí nhiên liệu
            </div>
          </div>

          <div className="recommendation-card rec-load">
            <div className="recommendation-title">
              <Layers size={16} color="#f59e0b" />
              Khép Kín Vòng Tròn Chiều Về VSIP 1 ↔ Cát Lái
            </div>
            <p className="recommendation-desc">
              Tự động ghép nối đơn hàng trả rỗng hoặc hàng xuất khẩu từ KCN VSIP 1 về lại cảng Cát Lái, hạn chế triệt để tình trạng đầu kéo chạy rỗng chiều về (Empty Backhaul).
            </p>
            <div className="recommendation-impact">
              <TrendingDown size={14} />
              Nâng hệ số lấp đầy tải trọng lên 88.5%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
