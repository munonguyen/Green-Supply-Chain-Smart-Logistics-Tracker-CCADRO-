import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
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

  useEffect(() => {
    api
      .getCarbonBenchmarks()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBenchmarks(data);
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
            <div className="stat-label">Trung Bình Hành Lang TP.HCM – Bình Dương</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              0.0820
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
              0.0620
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
              -24.4%
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Khi áp dụng đồng bộ định tuyến 3D Pareto CCADRO
            </span>
          </div>
          <TrendingDown size={34} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 14 }}>
          Bảng Đối Chuẩn Phát Thải Theo Từng Hành Lang Trọng Điểm (GLEC v3)
        </h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên Hành Lang Vận Tải</th>
                <th>Khu Vực Xuất Phát</th>
                <th>Khu Vực Đích</th>
                <th>Trung Bình Vùng</th>
                <th>Chuẩn Đội Xe Xanh (Best-in-Class)</th>
                <th>Kỳ Báo Cáo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Đang tải dữ liệu đối chuẩn hành lang...
                  </td>
                </tr>
              ) : (
                benchmarks.map((b) => (
                  <tr key={b.id || b.benchmarkName}>
                    <td>
                      <b style={{ color: 'var(--text-primary)' }}>{b.benchmarkName}</b>
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
                      <span className="badge badge-blue">{b.periodMonth}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
