import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../services/api';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import ElasticSearchBar from '../../../../shared/components/ElasticSearchBar';
import { BarChart3, TrendingDown, Target } from 'lucide-react';

const FALLBACK_BENCHMARKS = [
  {
    id: 'bm-001',
    benchmarkName: 'Hành lang Cảng Cát Lái ↔ KCN VSIP 1 Bình Dương',
    originZone: 'TP. Thủ Đức (Cụm Cảng Cát Lái)',
    destinationZone: 'Thuận An, Bình Dương (VSIP 1)',
    averageCo2ePerTonneKm: '0.0820',
    bestInClassCo2ePerTonneKm: '0.0590',
    periodMonth: '2026-11'
  },
  {
    id: 'bm-002',
    benchmarkName: 'Hành lang Cảng Cái Mép ↔ KCN Nhơn Trạch & Biên Hòa',
    originZone: 'Phú Mỹ, Bà Rịa – Vũng Tàu',
    destinationZone: 'Nhơn Trạch, Đồng Nai',
    averageCo2ePerTonneKm: '0.0865',
    bestInClassCo2ePerTonneKm: '0.0620',
    periodMonth: '2026-11'
  },
  {
    id: 'bm-003',
    benchmarkName: 'Hành lang ICD Sóng Thần ↔ Cảng Hiệp Phước',
    originZone: 'Dĩ An, Bình Dương (ICD Sóng Thần)',
    destinationZone: 'Nhà Bè, TP. HCM (Hiệp Phước)',
    averageCo2ePerTonneKm: '0.0890',
    bestInClassCo2ePerTonneKm: '0.0665',
    periodMonth: '2026-11'
  },
  {
    id: 'bm-004',
    benchmarkName: 'Hành lang Nội đô KCN Tân Bình ↔ Cảng Cát Lái',
    originZone: 'Tân Phú / Tân Bình, TP. HCM',
    destinationZone: 'TP. Thủ Đức, TP. HCM',
    averageCo2ePerTonneKm: '0.0940',
    bestInClassCo2ePerTonneKm: '0.0680',
    periodMonth: '2026-11'
  }
];

export default function BenchmarkPage() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api
      .getCarbonBenchmarks()
      .then((res) => {
        const list = res?.result ?? res;
        if (Array.isArray(list) && list.length > 0) {
          setBenchmarks(list);
        } else {
          setBenchmarks(FALLBACK_BENCHMARKS);
        }
        setLoading(false);
      })
      .catch(() => {
        setBenchmarks(FALLBACK_BENCHMARKS);
        setLoading(false);
      });
  }, []);

  const elasticBenchmarks = useMemo(
    () =>
      elasticSearchMatch(benchmarks, searchQuery, [
        'benchmarkName',
        'originZone',
        'destinationZone',
        'periodMonth'
      ]),
    [benchmarks, searchQuery]
  );

  const summary = useMemo(() => {
    const active = benchmarks.length > 0 ? benchmarks : FALLBACK_BENCHMARKS;
    const avgMean =
      active.reduce((sum, b) => sum + Number(b.averageCo2ePerTonneKm || 0), 0) / active.length;
    const bestMin = Math.min(...active.map((b) => Number(b.bestInClassCo2ePerTonneKm || 0.06)));
    const pct = avgMean > 0 ? ((avgMean - bestMin) / avgMean) * 100 : 24.4;
    return {
      avgMean: avgMean.toFixed(4),
      bestMin: bestMin.toFixed(4),
      reductionPct: `-${pct.toFixed(1)}%`
    };
  }, [benchmarks]);

  return (
    <div className="page-body">
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#10b981',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 4
          }}
        >
          UC13 • ĐỐI CHUẨN HIỆU SUẤT CARBON THEO HÀNH LANG VẬN TẢI
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
          Đối Chuẩn Cường Độ Phát Thải Các Hành Lang Kinh Tế Phía Nam
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
          Phân tích so sánh cường độ phát thải trung bình vùng với chuẩn Đội xe Xanh tối ưu nhất
          (Best-in-Class)
        </p>
      </div>

      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Trung Bình Toàn Vùng ({benchmarks.length} Hành lang)</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              {summary.avgMean}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              kgCO₂e / tấn-km (Mức trung bình toàn thị trường)
            </span>
          </div>
          <BarChart3 size={34} color="var(--accent-blue)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Mốc Đội Xe Xanh Tối Ưu (Best-In-Class)</div>
            <div className="stat-value" style={{ color: 'var(--accent-green-light)' }}>
              {summary.bestMin}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              kgCO₂e / tấn-km (Mục tiêu đội xe điện &amp; Euro 5)
            </span>
          </div>
          <Target size={34} color="var(--accent-green)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Dư Địa Cắt Giảm Phát Thải</div>
            <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              {summary.reductionPct}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Khi áp dụng đồng bộ định tuyến 3D Pareto CCADRO
            </span>
          </div>
          <TrendingDown size={34} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
            Bảng Đối Chuẩn Phát Thải Theo Từng Hành Lang Trọng Điểm (GLEC v3)
          </h3>
          <div style={{ minWidth: 260, flex: '0 1 340px' }}>
            <ElasticSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm hành lang, Cát Lái, VSIP, Cái Mép..."
              totalCount={benchmarks.length}
              matchedCount={elasticBenchmarks.items.length}
              tookMs={elasticBenchmarks.tookMs}
            />
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên Hành Lang Vận Tải</th>
                <th>Khu Vực Xuất Phát</th>
                <th>Khu Vực Đích</th>
                <th>Trung Bình Vùng</th>
                <th>Chuẩn Đội Xe Xanh (Best-in-Class)</th>
                <th>Mức Cắt Giảm</th>
                <th>Kỳ Báo Cáo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                    Đang tải dữ liệu đối chuẩn hành lang...
                  </td>
                </tr>
              ) : elasticBenchmarks.items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Không tìm thấy hành lang nào khớp với từ khóa "{searchQuery}".
                  </td>
                </tr>
              ) : (
                elasticBenchmarks.items.map((b) => {
                  const avg = Number(b.averageCo2ePerTonneKm || 0);
                  const best = Number(b.bestInClassCo2ePerTonneKm || 0);
                  const diffPct = avg > 0 ? (((avg - best) / avg) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={b.id || b.benchmarkName}>
                      <td>
                        <b style={{ color: 'var(--text-main)' }}>{b.benchmarkName}</b>
                      </td>
                      <td>{b.originZone}</td>
                      <td>{b.destinationZone}</td>
                      <td>{b.averageCo2ePerTonneKm} kgCO₂e/t·km</td>
                      <td>
                        <b style={{ color: 'var(--accent-green-light)' }}>
                          {b.bestInClassCo2ePerTonneKm} kgCO₂e/t·km
                        </b>
                      </td>
                      <td>
                        <span className="badge badge-green">-{diffPct}%</span>
                      </td>
                      <td>
                        <span className="badge badge-blue">{b.periodMonth}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
