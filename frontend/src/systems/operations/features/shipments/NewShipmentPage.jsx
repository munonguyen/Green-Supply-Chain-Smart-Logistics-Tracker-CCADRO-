import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { HUB_CORRIDOR_DIRECTORY } from '../../../../services/logisticsReferenceData';
import { Save, ArrowLeft, MapPin, Package } from 'lucide-react';

export default function NewShipmentPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    shipmentCode: `SH-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: '00000000-0000-0000-0000-000000000001',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    originAddress: 'Nguyễn Thị Định, Cát Lái, TP. Thủ Đức, TP.HCM',
    originLongitude: 106.795677,
    originLatitude: 10.762622,
    destinationName: 'KCN VSIP 1, Thuận An, Bình Dương',
    destinationAddress: 'Đại lộ Hữu Nghị, Thuận An, Bình Dương',
    destinationLongitude: 106.697426,
    destinationLatitude: 10.931215,
    cargoWeightTons: 16.5,
    cargoVolumeM3: 35.0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    fontSize: '0.88rem'
  };

  const handleSelectPreset = (kind, hubId) => {
    const hub = HUB_CORRIDOR_DIRECTORY.find((h) => h.id === hubId);
    if (!hub) return;
    if (kind === 'origin') {
      setFormData((prev) => ({
        ...prev,
        originName: hub.label,
        originAddress: hub.area,
        originLatitude: hub.coords[0],
        originLongitude: hub.coords[1]
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        destinationName: hub.label,
        destinationAddress: hub.area,
        destinationLatitude: hub.coords[0],
        destinationLongitude: hub.coords[1]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createShipment(formData);
      const created = res?.result || res;
      const targetId = created?.id || formData.shipmentCode;
      navigate(`/planning/${targetId}`);
    } catch (err) {
      setError(err?.message || 'Không thể kết nối máy chủ để lưu vận đơn.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/shipments')}
          className="btn btn-secondary"
          style={{ marginBottom: '20px' }}
        >
          <ArrowLeft size={16} /> Quay Lại Danh Sách Vận Đơn
        </button>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Package size={22} color="var(--accent-green)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                Đăng Ký Vận Đơn Hàng Hóa Mới
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Khởi tạo thông số kiện hàng và tọa độ hành lang trước khi tính toán lộ trình Pareto 3D
              </p>
            </div>
          </div>

          {error && (
            <div
              className="badge badge-red"
              style={{ marginBottom: '16px', padding: '10px 14px', width: '100%' }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Mã Vận Đơn (Shipment Code) *
                </label>
                <input
                  type="text"
                  value={formData.shipmentCode}
                  onChange={(e) => setFormData({ ...formData, shipmentCode: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Mã Khách Hàng Doanh Nghiệp (Customer UUID) *
                </label>
                <input
                  type="text"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Điểm Xuất Phát &amp; Tọa Độ (Origin)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => handleSelectPreset('origin', e.target.value)}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '4px 10px',
                    fontSize: '0.78rem'
                  }}
                >
                  <option value="" disabled>
                    Chọn nhanh cảng / ICD xuất phát...
                  </option>
                  {HUB_CORRIDOR_DIRECTORY.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label} ({h.area})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={formData.originName}
                onChange={(e) => setFormData({ ...formData, originName: e.target.value })}
                style={{ ...inputStyle, marginBottom: '8px' }}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="number"
                  step="any"
                  placeholder="Kinh độ xuất phát (Longitude)"
                  value={formData.originLongitude}
                  onChange={(e) =>
                    setFormData({ ...formData, originLongitude: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Vĩ độ xuất phát (Latitude)"
                  value={formData.originLatitude}
                  onChange={(e) =>
                    setFormData({ ...formData, originLatitude: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Điểm Đích Giao Hàng &amp; Tọa Độ (Destination)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => handleSelectPreset('dest', e.target.value)}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '4px 10px',
                    fontSize: '0.78rem'
                  }}
                >
                  <option value="" disabled>
                    Chọn nhanh KCN / Hub đích...
                  </option>
                  {HUB_CORRIDOR_DIRECTORY.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label} ({h.area})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={formData.destinationName}
                onChange={(e) => setFormData({ ...formData, destinationName: e.target.value })}
                style={{ ...inputStyle, marginBottom: '8px' }}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="number"
                  step="any"
                  placeholder="Kinh độ đích (Longitude)"
                  value={formData.destinationLongitude}
                  onChange={(e) =>
                    setFormData({ ...formData, destinationLongitude: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Vĩ độ đích (Latitude)"
                  value={formData.destinationLatitude}
                  onChange={(e) =>
                    setFormData({ ...formData, destinationLatitude: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Tải Trọng Hàng Hóa (Tấn) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cargoWeightTons}
                  onChange={(e) =>
                    setFormData({ ...formData, cargoWeightTons: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Thể Tích Hàng Hóa (m³)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cargoVolumeM3}
                  onChange={(e) =>
                    setFormData({ ...formData, cargoVolumeM3: parseFloat(e.target.value) })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ marginTop: '10px', justifyContent: 'center', padding: '12px 18px' }}
            >
              <Save size={16} />
              <span>
                {submitting
                  ? 'Đang Lưu Vận Đơn Vào Hệ Thống...'
                  : 'Lưu Vận Đơn & Chuyển Sang Hoạch Định Lộ Trình 3D'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
