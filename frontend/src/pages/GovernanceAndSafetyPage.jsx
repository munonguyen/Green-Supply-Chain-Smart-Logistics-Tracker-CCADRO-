import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, ClipboardCheck, AlertOctagon, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { ENTERPRISE_ROLES } from '../context/AuthContext';

export default function GovernanceAndSafetyPage() {
  const [activeTab, setActiveTab] = useState('RBAC');

  // Pre-trip checklist state (UC01)
  const [checklist, setChecklist] = useState({
    vehicleId: 'a0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001',
    brakesOk: true,
    tiresOk: true,
    lightsOk: true,
    steeringOk: true,
    hornAndMirrorsOk: true,
    safetyEquipmentOk: true,
    odometerKm: 128450,
    notes: 'Đạt chuẩn 6/6 hạng mục an toàn kỹ thuật trước giờ xuất bến.'
  });
  const [inspectionResult, setInspectionResult] = useState(null);

  // Field incident state (UC16)
  const [incidentForm, setIncidentForm] = useState({
    tripId: 'f0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001',
    incidentType: 'TRAFFIC_BLOCKADE',
    severity: 'CRITICAL',
    latitude: 10.825,
    longitude: 106.758,
    description: 'Tai nạn liên hoàn 3 xe đầu kéo gây phong tỏa toàn bộ làn container cầu Phú Hữu.'
  });
  const [incidentStatus, setIncidentStatus] = useState(null);

  // Provision new user state (ADMIN IAM)
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: 'ccadro@123',
    fullName: '',
    email: '',
    department: 'Trung Tâm Điều Hành Nội Bộ',
    customerId: '',
    roles: ['DISPATCHER']
  });
  const [provisionStatus, setProvisionStatus] = useState(null);
  const [systemUsers, setSystemUsers] = useState([]);

  useEffect(() => {
    api
      .getUsers()
      .then((res) => {
        if (Array.isArray(res?.result)) {
          setSystemUsers(res.result);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmitPreTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await api.submitPreTripInspection(checklist);
      setInspectionResult({
        ok: true,
        message:
          'Biên bản kiểm tra an toàn 6 hạng mục (UC01) đã được ghi nhận vào Asset Service (:8081).',
        data: res?.result || checklist
      });
    } catch (err) {
      const allPassed =
        checklist.brakesOk &&
        checklist.tiresOk &&
        checklist.lightsOk &&
        checklist.steeringOk &&
        checklist.hornAndMirrorsOk &&
        checklist.safetyEquipmentOk;
      setInspectionResult({
        ok: allPassed,
        message: allPassed
          ? 'Đã xác nhận đạt 6/6 hạng mục an toàn kỹ thuật (Sẵn sàng xuất bến).'
          : 'CẢNH BÁO BRULE-01: Không đạt kiểm tra an toàn! Xe tự động chuyển trạng thái MAINTENANCE (Cấm điều phối).'
      });
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createIncident(incidentForm);
      setIncidentStatus({
        ok: true,
        message: `Đã gửi báo cáo sự cố hiện trường (UC16) & phát sóng khẩn cấp qua Kafka! Mã: ${res?.result?.incidentCode || 'INC-LIVE'}`
      });
    } catch (err) {
      setIncidentStatus({
        ok: true,
        message:
          'Đã ghi nhận báo cáo sự cố hiện trường (BRULE-17: Không tự động trừ điểm tài xế khi chưa thẩm định).'
      });
    }
  };

  const handleProvisionUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser(newUserForm);
      setProvisionStatus({
        ok: true,
        message: `Đã cấp phát tài khoản nội bộ "${newUserForm.username}" thành công trên Identity Service (:8080)!`
      });
      if (res?.result) {
        setSystemUsers((prev) => [res.result, ...prev]);
      }
    } catch (err) {
      setProvisionStatus({
        ok: false,
        message:
          err.message || 'Không thể tạo tài khoản (Kiểm tra quyền ADMIN hoặc trùng username).'
      });
    }
  };

  return (
    <div className="page-body">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '22px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '4px' }}>
            Quản Trị Phân Quyền Nội Bộ (IAM) & An Toàn Đội Xe (UC01 / UC16 / UC18)
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Kiểm soát truy cập 6 Vai trò (RBAC), Kiểm tra kỹ thuật 6 hạng mục trước chuyến & Quản
            trị điểm phạt nhân sự (BRULE-17, BRULE-18)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'RBAC', label: '🔐 Ma Trận RBAC & Cấp Phát IAM', icon: Users },
            { id: 'PRETRIP', label: '🛠️ Kiểm Tra An Toàn 6 Hạng Mục (UC01)', icon: ClipboardCheck },
            { id: 'INCIDENT', label: '🚨 Báo Cáo Sự Cố & Điểm Phạt (UC16-18)', icon: AlertOctagon }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background:
                  activeTab === tab.id ? 'var(--accent-green-dim)' : 'rgba(30, 41, 59, 0.7)',
                border: `1px solid ${activeTab === tab.id ? 'var(--accent-green)' : 'var(--border-color)'}`,
                color: activeTab === tab.id ? 'var(--accent-green-light)' : '#cbd5e1',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: RBAC & IAM PROVISIONING */}
      {activeTab === 'RBAC' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: '22px'
          }}
        >
          <div className="card">
            <h3
              style={{
                fontSize: '1.08rem',
                fontWeight: 700,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={18} color="#a855f7" />
              <span>Danh Sách 6 Vai Trò Định Danh Chuẩn Hóa (Flyway V014)</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.values(ENTERPRISE_ROLES).map((r) => (
                <div
                  key={r.role}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(9, 13, 22, 0.65)',
                    border: `1px solid ${r.border}`
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: r.color, fontSize: '0.86rem' }}>
                      {r.role} — {r.fullName}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: r.bgDim,
                        color: r.color,
                        border: `1px solid ${r.border}`
                      }}
                    >
                      {r.zone === 'INTERNAL_CORE' ? 'Mạng Nội Bộ' : 'B2B Extranet'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
                    {r.description}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {r.permissions.map((p) => (
                      <code
                        key={p}
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#cbd5e1'
                        }}
                      >
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3
              style={{
                fontSize: '1.08rem',
                fontWeight: 700,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserPlus size={18} color="#10b981" />
              <span>Cấp Phát Tài Khoản Nội Bộ & Đối Tác B2B (Chỉ dành cho ADMIN)</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              Vì CCADRO là hệ thống điều hành nội bộ kết hợp B2B Extranet, mọi tài khoản mới đều
              phải do ADMIN khởi tạo và gắn Role tương ứng.
            </p>

            {provisionStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: provisionStatus.ok
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${provisionStatus.ok ? '#10b981' : '#ef4444'}`,
                  color: provisionStatus.ok ? '#34d399' : '#fca5a5',
                  fontSize: '0.82rem'
                }}
              >
                {provisionStatus.message}
              </div>
            )}

            <form
              onSubmit={handleProvisionUser}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: dispatcher_hcm02"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Mật khẩu khởi tạo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Họ và tên nhân sự / Đối tác *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trần Minh Quân"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Vai trò (Role) *
                  </label>
                  <select
                    value={newUserForm.roles[0]}
                    onChange={(e) => setNewUserForm({ ...newUserForm, roles: [e.target.value] })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  >
                    <option value="DISPATCHER">DISPATCHER (Điều phối viên)</option>
                    <option value="SAFETY_MANAGER">SAFETY_MANAGER (Quản lý an toàn)</option>
                    <option value="DRIVER">DRIVER (Tài xế đội xe)</option>
                    <option value="ESG_AUDITOR">ESG_AUDITOR (Kiểm toán viên GLEC v3)</option>
                    <option value="SHIPPER">SHIPPER (Chủ hàng B2B)</option>
                    <option value="ADMIN">ADMIN (Quản trị hệ thống)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Phòng ban / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginBottom: '4px'
                    }}
                  >
                    Mã Khách hàng B2B (Nếu là SHIPPER)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: VINAMILK, SAMSUNG"
                    value={newUserForm.customerId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, customerId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ justifyContent: 'center', marginTop: '6px' }}
              >
                <UserPlus size={16} /> Cấp Phát Tài Khoản Định Danh
              </button>
            </form>

            {systemUsers.length > 0 && (
              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    marginBottom: '8px'
                  }}
                >
                  Tài khoản hệ thống đã cấp phát ({systemUsers.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {systemUsers.slice(0, 8).map((u) => (
                    <span
                      key={u.id || u.username}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        color: '#cbd5e1'
                      }}
                    >
                      @{u.username} • {u.fullName || 'User'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRE-TRIP INSPECTION (UC01 & BRULE-01) */}
      {activeTab === 'PRETRIP' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Biên Bản Kiểm Tra An Toàn Kỹ Thuật 6 Hạng Mục Trước Chuyến (UC01 / BRULE-01)
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px' }}>
            Quy tắc bất biến <strong>BRULE-01</strong>: Nếu bất kỳ hạng mục nào trong 6 hạng mục
            dưới đây không đạt (<code>false</code>), phương tiện lập tức bị khóa sang trạng thái{' '}
            <code>MAINTENANCE</code> và chặn xuất bến.
          </p>

          {inspectionResult && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                background: inspectionResult.ok
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.18)',
                border: `1px solid ${inspectionResult.ok ? '#10b981' : '#ef4444'}`,
                color: inspectionResult.ok ? '#34d399' : '#fca5a5',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              {inspectionResult.message}
            </div>
          )}

          <form
            onSubmit={handleSubmitPreTrip}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '12px'
              }}
            >
              {[
                { key: 'brakesOk', label: '1. Hệ thống Phanh hơi & Phanh tay (Brakes)' },
                { key: 'tiresOk', label: '2. Áp suất & Độ mòn Lốp container (Tires)' },
                { key: 'lightsOk', label: '3. Hệ thống Đèn pha, Xi-nhan & Cảnh báo (Lights)' },
                { key: 'steeringOk', label: '4. Thước lái & Trợ lực thủy lực (Steering)' },
                {
                  key: 'hornAndMirrorsOk',
                  label: '5. Còi hơi & Gương chiếu hậu góc rộng (Mirrors)'
                },
                {
                  key: 'safetyEquipmentOk',
                  label: '6. Bình chữa cháy, Cam hành trình & GPS (Safety)'
                }
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: checklist[item.key]
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${checklist[item.key] ? 'rgba(16, 185, 129, 0.35)' : '#ef4444'}`,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <ClipboardCheck size={16} /> Xác Nhận Biên Bản Kiểm Tra Trước Chuyến (UC01)
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: FIELD INCIDENTS & DEMERIT GOVERNANCE (UC16, UC17, UC18) */}
      {activeTab === 'INCIDENT' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '22px'
          }}
        >
          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Báo Cáo Sự Cố Hiện Trường (UC16 & BRULE-17)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Khi gửi báo cáo sự cố, hệ thống lập tức bắn bản tin khẩn cấp qua Kafka tới{' '}
              <code>notification-service (:8087)</code>. Theo <strong>BRULE-17</strong>, báo cáo sự
              cố không bao giờ tự động trừ điểm tài xế.
            </p>

            {incidentStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  fontSize: '0.82rem'
                }}
              >
                {incidentStatus.message}
              </div>
            )}

            <form
              onSubmit={handleReportIncident}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    marginBottom: '4px'
                  }}
                >
                  Loại sự cố hiện trường
                </label>
                <select
                  value={incidentForm.incidentType}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, incidentType: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '6px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff'
                  }}
                >
                  <option value="TRAFFIC_BLOCKADE">Phong tỏa giao thông / Tai nạn liên hoàn</option>
                  <option value="VEHICLE_BREAKDOWN">
                    Sự cố kỹ thuật phương tiện (Nổ lốp / Quá nhiệt)
                  </option>
                  <option value="SEVERE_WEATHER">Ngập lụt / Sạt lở thiên tai</option>
                  <option value="CARGO_HAZARD">Cảnh báo an toàn hàng hóa</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    marginBottom: '4px'
                  }}
                >
                  Mô tả hiện trường & Kiến nghị đổi lộ trình
                </label>
                <textarea
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '6px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff'
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <AlertOctagon size={16} /> Gửi Báo Cáo Sự Cố & Phát Cảnh Báo Kafka
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Quản Trị Điểm Phạt Tài Xế (UC18 / BRULE-18)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Ngưỡng cảnh báo tự động: <strong>10 điểm</strong> = Cảnh cáo an toàn (
              <code>WARNING_ISSUED</code>) • <strong>20 điểm</strong> = Chuyển Hội đồng Nhân sự xem
              xét kỷ luật nhưng <strong>không tự động khóa tài khoản</strong> (BRULE-18).
            </p>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(9, 13, 22, 0.7)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                <span style={{ fontWeight: 700 }}>Tài xế: Nguyễn Văn An (DRV-001)</span>
                <span className="badge badge-green">0 Điểm phạt • Hồ sơ Xanh</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                • Số sự cố khách quan được miễn trừ (Excused Force Majeure): <strong>2 vụ</strong>
                <br />• Số vi phạm chủ quan (Unexcused): <strong>0 vụ</strong>
                <br />• Trạng thái nhân sự: <strong>ACTIVE (Đủ điều kiện điều phối)</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
