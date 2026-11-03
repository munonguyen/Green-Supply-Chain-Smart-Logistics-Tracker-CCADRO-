import React, { useState } from 'react';
import { Megaphone, Send, X } from 'lucide-react';
import { api } from '../../services/api';

export default function BroadcastEmergencyModal({ isOpen, onClose, onBroadcastSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    severity: 'CRITICAL',
    targetAudience: 'ALL_DRIVERS',
    targetRole: 'DRIVER',
    targetCorridor: 'Hành lang Vận tải Xanh Cát Lái - VSIP 1',
    actionDirective:
      'Giảm tốc độ dưới 30 km/h, bật đèn cảnh báo hoặc tấp vào trạm dịch vụ gần nhất.',
    latitude: 10.845,
    longitude: 106.772,
    radiusMeters: 5000,
    senderRole: 'SAFETY_MANAGER',
    senderUsername: 'safety'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Vui lòng điền đầy đủ Tiêu đề và Nội dung cảnh báo khẩn cấp.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.broadcastEmergencyNotification({
        ...formData,
        radiusMeters: Number(formData.radiusMeters) || 5000,
        latitude: Number(formData.latitude) || null,
        longitude: Number(formData.longitude) || null
      });

      if (onBroadcastSuccess && res?.result) {
        onBroadcastSuccess(res.result);
      }
      onClose();
    } catch (err) {
      alert('Không thể phát cảnh báo: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #dc2626',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: '#f8fafc',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex'
              }}
            >
              <Megaphone size={22} color="#f87171" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Phát Lệnh Cảnh Báo Khẩn Cấp
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Kênh điều hành trực tiếp từ Safety Manager / Dispatcher tới Đội xe
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {/* Mức độ khẩn cấp */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#cbd5e1'
              }}
            >
              Mức độ rủi ro (Severity)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['CRITICAL', 'HIGH', 'WARNING', 'INFO'].map((sev) => {
                const isSelected = formData.severity === sev;
                const colors = {
                  CRITICAL: { bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444', text: '#fca5a5' },
                  HIGH: { bg: 'rgba(249, 115, 22, 0.25)', border: '#f97316', text: '#fdba74' },
                  WARNING: { bg: 'rgba(234, 179, 8, 0.25)', border: '#eab308', text: '#fde047' },
                  INFO: { bg: 'rgba(59, 130, 246, 0.25)', border: '#3b82f6', text: '#93c5fd' }
                }[sev];
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: sev })}
                    style={{
                      background: isSelected ? colors.bg : 'rgba(30, 41, 59, 0.6)',
                      border: `1px solid ${isSelected ? colors.border : '#334155'}`,
                      color: isSelected ? colors.text : '#94a3b8',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {sev === 'CRITICAL' ? '● BÁO ĐỘNG ĐỎ' : sev}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Đối tượng nhận */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#cbd5e1'
              }}
            >
              Nhóm đối tượng nhận cảnh báo (Target Audience)
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#fff',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.84rem'
              }}
            >
              <option value="ALL_DRIVERS">🚗 Toàn bộ Tài xế Đội xe (All Fleet Drivers)</option>
              <option value="CORRIDOR_DRIVERS">
                🛣️ Tài xế đang lưu thông trong Hành lang Cụ thể
              </option>
              <option value="SPECIFIC_TRIP">🎯 Chỉ định 1 Chuyến xe cụ thể</option>
              <option value="SHIPPERS">📦 Khách hàng / Chủ hàng (Shippers)</option>
              <option value="ALL_ROLES">📢 Toàn hệ thống (Toàn bộ các Role)</option>
            </select>
          </div>

          {/* Tiêu đề */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#cbd5e1'
              }}
            >
              Tiêu đề thông báo khẩn cấp *
            </label>
            <input
              type="text"
              required
              placeholder="VD: [CHỈ ĐẠO AN TOÀN] Bão lớn gây đổ cây và phong tỏa QL13"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#fff',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.84rem'
              }}
            />
          </div>

          {/* Nội dung chi tiết */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#cbd5e1'
              }}
            >
              Nội dung mô tả sự cố *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Mô tả nguyên nhân, tình trạng ngập nước, ùn tắc hoặc rủi ro..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#fff',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Chỉ đạo hành động tức thời */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#fbbf24'
              }}
            >
              ⚡ Chỉ thị hành động trực tiếp (Action Directive)
            </label>
            <input
              type="text"
              placeholder="VD: Tấp vào lề, dừng xe kiểm tra phanh, giảm tốc dưới 30km/h..."
              value={formData.actionDirective}
              onChange={(e) => setFormData({ ...formData, actionDirective: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid #eab308',
                color: '#fef08a',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.84rem'
              }}
            />
          </div>

          {/* Hành lang & Bán kính Geofence */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#94a3b8'
                }}
              >
                Hành lang chịu ảnh hưởng
              </label>
              <input
                type="text"
                placeholder="VD: QL1A, Vành Đai 2, Cát Lái - VSIP 1"
                value={formData.targetCorridor}
                onChange={(e) => setFormData({ ...formData, targetCorridor: e.target.value })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  color: '#fff',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem'
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#94a3b8'
                }}
              >
                Bán kính (Mét)
              </label>
              <input
                type="number"
                placeholder="5000"
                value={formData.radiusMeters}
                onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  color: '#fff',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#334155',
                border: 'none',
                color: '#cbd5e1',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
              }}
            >
              <Send size={15} />
              {loading ? 'Đang phát sóng...' : 'Phát Cảnh Báo Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
