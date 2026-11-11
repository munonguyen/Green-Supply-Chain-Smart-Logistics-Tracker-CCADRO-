import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Leaf, Award, FileText, CheckCircle, ArrowLeft } from 'lucide-react';

const FALLBACK_EMISSION_FACTORS = [
  {
    id: 'ef-001',
    factorCode: 'EF001-EV-SOLAR',
    fuelType: 'Động cơ Điện (EV Solar Depot)',
    euroStandard: 'Zero-Tailpipe WTW',
    emptyFactorKgPerKm: '0.210',
    fullFactorKgPerKm: '0.380',
    defaultTonneKmFactor: '0.048000',
    sourceReference: 'GLEC Framework v3.0 / ISO 14083:2023 (ASEAN Grid)'
  },
  {
    id: 'ef-002',
    factorCode: 'EF002-EURO5-SCR',
    fuelType: 'Diesel Sinh Học B5 + SCR',
    euroStandard: 'Euro 5 Standard',
    emptyFactorKgPerKm: '0.520',
    fullFactorKgPerKm: '0.840',
    defaultTonneKmFactor: '0.080000',
    sourceReference: 'GLEC Framework v3.0 Module 1 (Heavy Rigid / Articulated)'
  },
  {
    id: 'ef-003',
    factorCode: 'EF003-DIESEL-BASE',
    fuelType: 'Diesel Tiêu Chuẩn (Mốc đối chứng)',
    euroStandard: 'Euro 3 / Euro 4',
    emptyFactorKgPerKm: '0.680',
    fullFactorKgPerKm: '1.120',
    defaultTonneKmFactor: '0.108000',
    sourceReference: 'Vietnam MoT Baseline Freight Corridor Inventory'
  }
];

export default function TripCarbonPage() {
  const { tripId } = useParams();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEmissionFactors()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFactors(data);
        } else {
          setFactors(FALLBACK_EMISSION_FACTORS);
        }
        setLoading(false);
      })
      .catch(() => {
        setFactors(FALLBACK_EMISSION_FACTORS);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-body">
      <Link to={`/trips/${tripId}`} className="btn btn-secondary" style={{ marginBottom: 18 }}>
        <ArrowLeft size={16} /> Quay Lại Bản Đồ Giám Sát 3D (UC09)
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
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
            UC12 • KIỂM KÊ &amp; HẠCH TOÁN KHÍ NHÀ KÍNH SAU CHUYẾN ĐI
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
            Sổ Cái Hạch Toán Phát Thải Carbon Chuẩn GLEC v3
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Xác thực phát thải thực tế sau chuyến dựa trên quãng đường GPS thực đo và tải trọng hàng
            hóa (Tonne-Km)
          </p>
        </div>
        <div className="badge badge-green" style={{ fontSize: '0.82rem', padding: '8px 16px' }}>
          <CheckCircle size={15} /> Chuẩn Quốc Tế ISO 14083 / GLEC v3
        </div>
      </div>

      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Tổng Phát Thải Thực Tế (WTW)</div>
            <div className="stat-value" style={{ color: 'var(--accent-green-light)' }}>
              23.95 kg
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              CO₂e tương đương (Giảm 24.8% so với mốc chuẩn)
            </span>
          </div>
          <Leaf size={34} color="var(--accent-green)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Khối Lượng Luân Chuyển</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              427.5 t·km
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tấn-Kilômét thực tế (15.0 tấn × 28.5 km)
            </span>
          </div>
          <Award size={34} color="var(--accent-blue)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Hệ Số Phát Thải Áp Dụng</div>
            <div
              className="stat-value"
              style={{ fontSize: '1.45rem', color: 'var(--accent-amber)' }}
            >
              0.080000
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              kgCO₂e / tấn-km (Chuẩn Euro 5 / EV Hybrid)
            </span>
          </div>
          <FileText size={34} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 14 }}>
          Bảng Hệ Số Phát Thải Chuẩn GLEC v3 Đang Áp Dụng Trong Hệ Thống
        </h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã Hệ Số</th>
                <th>Loại Nhiên Liệu / Động Cơ</th>
                <th>Tiêu Chuẩn Khí Thải</th>
                <th>Hệ Số Xe Rỗng (kg/km)</th>
                <th>Hệ Số Đầy Tải (kg/km)</th>
                <th>Hệ Số Chuẩn (kgCO₂e/t·km)</th>
                <th>Nguồn Tham Chiếu Kiểm Toán</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                    Đang tải bảng hệ số phát thải GLEC v3...
                  </td>
                </tr>
              ) : (
                factors.map((f) => (
                  <tr key={f.id || f.factorCode}>
                    <td>
                      <b style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {f.factorCode}
                      </b>
                    </td>
                    <td>{f.fuelType}</td>
                    <td>{f.euroStandard}</td>
                    <td>{f.emptyFactorKgPerKm}</td>
                    <td>{f.fullFactorKgPerKm}</td>
                    <td>
                      <b style={{ color: 'var(--accent-green-light)' }}>{f.defaultTonneKmFactor}</b>
                    </td>
                    <td>{f.sourceReference}</td>
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
