import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Briefcase,
  Check,
  Clock,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Sun,
  UserCheck,
  Volume2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import {
  getDefaultLandingOptionsForRole,
  getRoleHeaderMeta,
  loadUserSettings,
  resetUserSettings,
  saveUserSettings
} from '../../utils/userSettings';

function getInitials(user) {
  const source = (user?.fullName || user?.username || 'U').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || 'U').slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

function SettingToggleRow({ icon: Icon, iconColor = '#10b981', title, description, checked, onChange, bgSubtle, borderCol, testId, disabled = false }) {
  return (
    <label
      style={{
        padding: '11px 14px',
        borderRadius: 12,
        background: bgSubtle,
        border: `1px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {Icon && <Icon size={16} color={iconColor} style={{ flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.81rem', fontWeight: 700 }}>{title}</div>
          {description && (
            <div style={{ fontSize: '0.7rem', opacity: 0.72, lineHeight: 1.35 }}>{description}</div>
          )}
        </div>
      </div>
      <input
        type="checkbox"
        data-testid={testId}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 17, height: 17, accentColor: '#10b981', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}
      />
    </label>
  );
}

function SettingSelectRow({
  icon: Icon,
  iconColor = '#8b5cf6',
  title,
  description,
  value,
  options,
  onChange,
  bgSubtle,
  bgSurface,
  borderCol,
  textMain,
  testId,
  disabled = false
}) {
  return (
    <div
      style={{
        padding: '11px 14px',
        borderRadius: 12,
        background: bgSubtle,
        border: `1px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        opacity: disabled ? 0.65 : 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 220px' }}>
        {Icon && <Icon size={16} color={iconColor} style={{ flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.81rem', fontWeight: 700 }}>{title}</div>
          {description && (
            <div style={{ fontSize: '0.7rem', opacity: 0.72, lineHeight: 1.35 }}>{description}</div>
          )}
        </div>
      </div>
      <select
        data-testid={testId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: `1px solid ${borderCol}`,
          background: bgSurface,
          color: textMain,
          fontSize: '0.76rem',
          fontWeight: 700,
          maxWidth: 220
        }}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  initialTab = 'profile',
  onDarkSurface = false
}) {
  const { user, changeOwnPassword, updateOwnProfile, logout, demoIdentity } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const darkChrome = isDark || onDarkSurface;

  const [settingsTab, setSettingsTab] = useState(initialTab);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [prefs, setPrefs] = useState(() => loadUserSettings(user?.username, user));
  const [prefsSavedMsg, setPrefsSavedMsg] = useState('');

  // Editable Profile fields
  const [profileFullName, setProfileFullName] = useState(user?.fullName || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileStatus, setProfileStatus] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const lastInitKeyRef = useRef('');
  useEffect(() => {
    const initKey = isOpen ? `${user?.username || ''}::${initialTab}` : '';
    if (isOpen && user?.username && lastInitKeyRef.current !== initKey) {
      lastInitKeyRef.current = initKey;
      setSettingsTab(initialTab);
      setPrefs(loadUserSettings(user.username, user));
      setProfileFullName(user.fullName || user.username || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfileStatus(null);
      setPrefsSavedMsg('');
      setPwdStatus(null);
    } else if (!isOpen) {
      lastInitKeyRef.current = '';
    }
  }, [isOpen, initialTab, user]);

  useEffect(() => {
    if (!isOpen || settingsTab !== 'security' || typeof api?.getActiveSessions !== 'function') {
      return undefined;
    }
    let mounted = true;
    setLoadingSessions(true);
    api
      .getActiveSessions()
      .then((res) => {
        if (!mounted) return;
        const list = res?.result || (Array.isArray(res) ? res : []);
        setActiveSessions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setActiveSessions([]);
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, settingsTab]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const role = String(user.role || 'ADMIN').toUpperCase();
  const roleMeta = getRoleHeaderMeta(role);
  const landingOptions = getDefaultLandingOptionsForRole(role);
  const isHubReadOnly = role === 'HUB_AUDITOR';

  const flashSaved = (msg = 'Đã lưu tùy chọn cài đặt') => {
    setPrefsSavedMsg(msg);
    window.setTimeout(() => setPrefsSavedMsg(''), 2200);
  };

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveUserSettings(user.username, next);
    flashSaved();
  };

  const updateRoleOp = (key, value) => {
    const next = {
      ...prefs,
      roleOps: {
        ...(prefs.roleOps || {}),
        [key]: value
      }
    };
    setPrefs(next);
    saveUserSettings(user.username, next);
    flashSaved('Đã lưu cấu hình nghiệp vụ');
  };

  const handleResetDefaults = () => {
    const fresh = resetUserSettings(user.username, user);
    setPrefs(fresh);
    flashSaved('Đã khôi phục toàn bộ cài đặt về mặc định');
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileStatus(null);
    if (!updateOwnProfile) return;
    setSavingProfile(true);
    try {
      await updateOwnProfile({
        fullName: profileFullName,
        email: profileEmail,
        phone: profilePhone
      });
      setProfileStatus({ type: 'success', text: 'Đã cập nhật hồ sơ cá nhân thành công.' });
    } catch (err) {
      setProfileStatus({ type: 'error', text: err?.message || 'Không thể cập nhật hồ sơ.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdStatus(null);
    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', text: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' });
      return;
    }
    setSavingPwd(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setPwdStatus({ type: 'success', text: 'Đã cập nhật mật khẩu bảo mật thành công.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdStatus({ type: 'error', text: err?.message || 'Không thể cập nhật mật khẩu.' });
    } finally {
      setSavingPwd(false);
    }
  };

  const bgSurface = darkChrome ? '#0f172a' : '#ffffff';
  const bgSubtle = darkChrome ? 'rgba(30, 41, 59, 0.58)' : '#f8fafc';
  const borderCol = darkChrome ? 'rgba(148, 163, 184, 0.22)' : '#e2e8f0';
  const textMain = darkChrome ? '#f8fafc' : '#0f172a';
  const textMuted = darkChrome ? '#94a3b8' : '#64748b';
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 11px',
    borderRadius: 9,
    border: `1px solid ${borderCol}`,
    background: darkChrome ? '#1e293b' : '#ffffff',
    color: textMain,
    fontSize: '0.81rem'
  };

  const renderRoleOperationsSettings = () => {
    if (!demoIdentity) return <p role="status">Chính sách hệ thống hiện do bộ phận quản trị vận hành cấu hình. Màn hình này chưa hỗ trợ thay đổi chính sách; các tùy chọn hiển thị cá nhân nằm ở mục Hiển thị &amp; Hệ đo.</p>;
    const ops = prefs.roleOps || {};

    if (role === 'ADMIN') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SettingToggleRow
            icon={ShieldCheck}
            iconColor="#10b981"
            title="Phê duyệt 2 lớp khi khóa/xóa tài khoản IAM"
            description="Yêu cầu xác nhận bổ sung trước khi khóa vĩnh viễn tài khoản điều hành hoặc B2B"
            checked={ops.requireDualApprovalForLock}
            onChange={(v) => updateRoleOp('requireDualApprovalForLock', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
          <SettingToggleRow
            icon={Globe}
            iconColor="#0ea5e9"
            title="Cho phép doanh nghiệp B2B đăng ký đối tác mới"
            description="Mở luồng tự đăng ký tài khoản Customer tại trang /register"
            checked={ops.allowPublicB2bRegistration}
            onChange={(v) => updateRoleOp('allowPublicB2bRegistration', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
          <SettingToggleRow
            icon={Shield}
            iconColor="#8b5cf6"
            title="Ghi nhật ký kiểm toán IAM & phiên đăng nhập"
            description="Lưu vết mọi thao tác đổi mật khẩu, phân quyền và đăng nhập theo vai trò"
            checked={ops.autoAuditIamEvents}
            onChange={(v) => updateRoleOp('autoAuditIamEvents', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
          <SettingToggleRow
            icon={Mail}
            iconColor="#f59e0b"
            title="Cảnh báo Email Kafka khi dịch vụ hoặc SLA bất thường"
            description="Tự động đẩy cảnh báo cho Root Admin nếu phát hiện gián đoạn Kafka/Payment"
            checked={ops.kafkaSlaAlertEmail}
            onChange={(v) => updateRoleOp('kafkaSlaAlertEmail', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
        </div>
      );
    }

    if (role === 'DISPATCHER') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SettingSelectRow
            icon={Sliders}
            iconColor="#0ea5e9"
            title="Ưu tiên hoạch định tuyến Pareto (UC05)"
            description="Chiến lược đề xuất mặc định khi xuất bến và tối ưu hóa vận đơn"
            value={ops.paretoPriority}
            options={[
              { value: 'BALANCED', label: 'Cân bằng Thời gian & CO₂e' },
              { value: 'LOW_CARBON', label: 'Tối thiểu Phát thải Carbon' },
              { value: 'FASTEST_SLA', label: 'Nhanh nhất Đạt chuẩn SLA' }
            ]}
            onChange={(v) => updateRoleOp('paretoPriority', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={RefreshCw}
            iconColor="#f59e0b"
            title="Ngưỡng cảnh báo lệch tuyến GPS"
            description="Kích hoạt cảnh báo điều phối khi phương tiện đi chệch hành lang an toàn"
            value={Number(ops.gpsDeviationAlertMeters)}
            options={[
              { value: 200, label: '200 mét (Nghiêm ngặt)' },
              { value: 500, label: '500 mét (Tiêu chuẩn)' },
              { value: 1000, label: '1.000 mét (Nới rộng)' }
            ]}
            onChange={(v) => updateRoleOp('gpsDeviationAlertMeters', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Clock}
            iconColor="#ef4444"
            title="Cảnh báo sớm nguy cơ trễ SLA"
            description="Nhắc nhở điều phối viên trước hạn ETA cam kết với khách hàng B2B"
            value={Number(ops.slaEarlyWarningMinutes)}
            options={[
              { value: 15, label: 'Trước 15 phút' },
              { value: 30, label: 'Trước 30 phút' },
              { value: 60, label: 'Trước 60 phút' }
            ]}
            onChange={(v) => updateRoleOp('slaEarlyWarningMinutes', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingToggleRow
            icon={ShieldCheck}
            iconColor="#10b981"
            title="Ưu tiên điều xe điện EV cho tuyến dưới 150 km"
            description="Tự động gợi ý đội xe đầu kéo điện trong bộ điều phối xuất bến UC07"
            checked={ops.preferEvUnder150Km}
            onChange={(v) => updateRoleOp('preferEvUnder150Km', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
        </div>
      );
    }

    if (role === 'SAFETY_MANAGER') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SettingSelectRow
            icon={Shield}
            iconColor="#ef4444"
            title="Giới hạn tốc độ kích hoạt cảnh báo đỏ"
            description="Tự động gắn cờ vi phạm an toàn nếu đầu kéo vượt ngưỡng này"
            value={Number(ops.speedAlertLimitKmh)}
            options={[
              { value: 80, label: '80 km/h (Cao tốc tải nặng)' },
              { value: 85, label: '85 km/h (Tiêu chuẩn HSE)' },
              { value: 90, label: '90 km/h (Tối đa đường trường)' }
            ]}
            onChange={(v) => updateRoleOp('speedAlertLimitKmh', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Clock}
            iconColor="#f59e0b"
            title="Giờ lái liên tục tối đa (HOS)"
            description="Ngưỡng nhắc nghỉ bắt buộc nhằm phòng chống mệt mỏi tài xế"
            value={Number(ops.maxContinuousDriveHours)}
            options={[
              { value: 3.5, label: '3.5 giờ (Khuyến nghị ban đêm)' },
              { value: 4, label: '4.0 giờ (Luật GTĐB)' }
            ]}
            onChange={(v) => updateRoleOp('maxContinuousDriveHours', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Lock}
            iconColor="#ef4444"
            title="Ngưỡng điểm phạt Demerit tự tạm khóa ca"
            description="Đề xuất đình chỉ hoặc khóa tài xế khi điểm vi phạm vượt mức (/20)"
            value={Number(ops.autoLockDemeritThreshold)}
            options={[
              { value: 12, label: '12 / 20 điểm' },
              { value: 15, label: '15 / 20 điểm' },
              { value: 18, label: '18 / 20 điểm' }
            ]}
            onChange={(v) => updateRoleOp('autoLockDemeritThreshold', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingToggleRow
            icon={ShieldCheck}
            iconColor="#10b981"
            title="Bắt buộc biên bản kiểm định Pre-Trip có bằng chứng"
            description="Không cho xuất bến nếu tài xế chưa hoàn tất checklist an toàn lốp/phanh/pin"
            checked={ops.requirePretripPhotoProof}
            onChange={(v) => updateRoleOp('requirePretripPhotoProof', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
        </div>
      );
    }

    if (role === 'ESG_AUDITOR') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SettingSelectRow
            icon={Globe}
            iconColor="#8b5cf6"
            title="Bộ hệ số chuẩn hóa phát thải Carbon"
            description="Phương pháp tính toán phát thải áp dụng cho kiểm toán hành lang"
            value={ops.emissionStandard}
            options={[
              { value: 'GLEC_V3_1', label: 'GLEC Framework v3.1 (Logistics)' },
              { value: 'ISO_14083', label: 'ISO 14083:2023 (Quốc tế)' }
            ]}
            onChange={(v) => updateRoleOp('emissionStandard', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Sliders}
            iconColor="#10b981"
            title="Phạm vi đo lường năng lượng mặc định"
            description="Bao gồm phát thải chuỗi cung ứng nhiên liệu/điện hay chỉ tại ống xả"
            value={ops.emissionScope}
            options={[
              { value: 'WTW', label: 'Well-to-Wheel (WTW - Toàn vòng đời)' },
              { value: 'TTW', label: 'Tank-to-Wheel (TTW - Vận hành xe)' }
            ]}
            onChange={(v) => updateRoleOp('emissionScope', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Bell}
            iconColor="#f59e0b"
            title="Ngưỡng cảnh báo hành lang vượt định mức"
            description="Đánh dấu bất thường khi phát thải chuyến thực tế vượt Benchmark UC13"
            value={Number(ops.corridorOverBenchmarkPct)}
            options={[
              { value: 10, label: 'Vượt +10%' },
              { value: 15, label: 'Vượt +15%' },
              { value: 20, label: 'Vượt +20%' }
            ]}
            onChange={(v) => updateRoleOp('corridorOverBenchmarkPct', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Save}
            iconColor="#0ea5e9"
            title="Định dạng xuất chứng từ kiểm toán ESG"
            description="Áp dụng khi tải báo cáo phát thải UC12 cho đối tác"
            value={ops.auditExportFormat}
            options={[
              { value: 'PDF_SIGNED', label: 'PDF Ký số & Chứng nhận Xanh' },
              { value: 'CSV_JSON', label: 'CSV / JSON Raw Telemetry' }
            ]}
            onChange={(v) => updateRoleOp('auditExportFormat', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
        </div>
      );
    }

    if (role === 'CUSTOMER') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              background: bgSubtle,
              border: `1px solid ${borderCol}`,
              display: 'grid',
              gap: 6
            }}
          >
            <div style={{ fontSize: '0.81rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Mail size={15} color="#10b981" /> Email nhận Hợp đồng PDF &amp; Biên lai (Kafka)
            </div>
            <div style={{ fontSize: '0.7rem', color: textMuted }}>
              Hệ thống thanh toán sẽ gửi kèm hợp đồng pháp lý SHA-256 PDF về địa chỉ email này sau khi thanh toán thành công.
            </div>
            <input
              type="email"
              value={ops.contractEmailRecipient || ''}
              onChange={(e) => updateRoleOp('contractEmailRecipient', e.target.value)}
              placeholder={user.email || 'ke-toan@doanhnghiep.vn'}
              style={inputStyle}
            />
          </div>

          <SettingToggleRow
            icon={Mail}
            iconColor="#0ea5e9"
            title="Tự động gửi bản sao Hợp đồng PDF sau mỗi thanh toán"
            description="Kích hoạt luồng sự kiện Kafka Payment -> Notification -> Email PDF"
            checked={ops.autoSendContractPdfAfterPay}
            onChange={(v) => updateRoleOp('autoSendContractPdfAfterPay', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
          <SettingSelectRow
            icon={Briefcase}
            iconColor="#10b981"
            title="Phương thức thanh toán ưu tiên"
            description="Tự động chọn trước khi mở hộp thoại thanh toán cước B2B"
            value={ops.preferredPaymentMethod}
            options={[
              { value: 'NET_30', label: 'Hạn mức Công nợ Net-30' },
              { value: 'VIETQR', label: 'Chuyển khoản VietQR / SePay' },
              { value: 'CORPORATE_CARD', label: 'Thẻ tín dụng Doanh nghiệp' }
            ]}
            onChange={(v) => updateRoleOp('preferredPaymentMethod', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Sliders}
            iconColor="#38bdf8"
            title="Ngưỡng nhiệt độ Cold-Chain cảnh báo container"
            description="Gửi cảnh báo ngay nếu cảm biến thùng container vượt dải tiêu chuẩn"
            value={ops.coldChainThresholdPreset}
            options={[
              { value: 'FROZEN_18', label: 'Đông lạnh sâu (-20°C đến -16°C)' },
              { value: 'CHILLED_2_8', label: 'Mát chuẩn (2°C đến 8°C)' },
              { value: 'DRY_AMB', label: 'Hàng khô tiêu chuẩn (< 30°C)' }
            ]}
            onChange={(v) => updateRoleOp('coldChainThresholdPreset', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Bell}
            iconColor="#f59e0b"
            title="Báo trước khi xe sắp đến kho nhận (Geofence)"
            description="Giúp đội kho chuẩn bị cầu dẫn dock-in trước khi container tới"
            value={Number(ops.geofenceApproachKm)}
            options={[
              { value: 5, label: 'Cách 5 km' },
              { value: 10, label: 'Cách 10 km' },
              { value: 20, label: 'Cách 20 km' }
            ]}
            onChange={(v) => updateRoleOp('geofenceApproachKm', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
        </div>
      );
    }

    if (['HUB_MANAGER', 'HUB_SHIPPER', 'SHIPPER', 'HUB_AUDITOR'].includes(role)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isHubReadOnly && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(139, 92, 246, 0.14)',
                color: '#a78bfa',
                fontSize: '0.74rem',
                fontWeight: 700
              }}
            >
              Vai trò HUB_AUDITOR đang ở chế độ Giám sát Đối soát (chính sách điều phối Hub chỉ xem).
            </div>
          )}
          <SettingSelectRow
            icon={Briefcase}
            iconColor="#10b981"
            title="Trụ sở làm việc mặc định"
            description="Tự động mở trụ sở này khi đăng nhập Cổng 3PL Hub"
            value={ops.defaultHubCode}
            disabled={isHubReadOnly}
            options={[
              { value: 'HUB-DINHBANG-BN', label: 'HUB-DINHBANG-BN (Đình Bảng • Bắc Ninh)' },
              { value: 'HUB-AMATA-BH', label: 'HUB-AMATA-BH (Amata • Biên Hòa)' },
              { value: 'HUB-SHTP-Q9', label: 'HUB-SHTP-Q9 (SHTP • Thủ Đức)' },
              { value: 'HUB-VSIP1-BD', label: 'HUB-VSIP1-BD (VSIP 1 • Bình Dương)' }
            ]}
            onChange={(v) => updateRoleOp('defaultHubCode', v)}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingSelectRow
            icon={Globe}
            iconColor="#0ea5e9"
            title="Bán kính Geofence GPS cho phép ký nhận"
            description="Shipper chỉ được xác nhận ePOD khi đứng trong bán kính này so với tọa độ nhận"
            value={Number(ops.hubGeofenceRadiusM)}
            disabled={isHubReadOnly}
            options={[
              { value: 150, label: '150 mét (Nghiêm ngặt)' },
              { value: 300, label: '300 mét (Tiêu chuẩn 3PL)' },
              { value: 500, label: '500 mét (Khu CN lớn)' }
            ]}
            onChange={(v) => updateRoleOp('hubGeofenceRadiusM', Number(v))}
            bgSubtle={bgSubtle}
            bgSurface={bgSurface}
            borderCol={borderCol}
            textMain={textMain}
          />
          <SettingToggleRow
            icon={ShieldCheck}
            iconColor="#10b981"
            title="Bắt buộc chụp ảnh Photo POD có đóng dấu GPS & Thời gian"
            description="Chống giao nhận ảo khi Shipper xác nhận hoàn tất kiện hàng"
            checked={ops.requireWatermarkPhotoPod}
            disabled={isHubReadOnly}
            onChange={(v) => updateRoleOp('requireWatermarkPhotoPod', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
          <SettingToggleRow
            icon={RefreshCw}
            iconColor="#f59e0b"
            title="Tự động đẩy Webhook đồng bộ sang WMS 3PL đối tác"
            description="Đồng bộ tức thời trạng thái container và vận đơn ngay sau khi ký nhận"
            checked={ops.autoPush3plWmsWebhook}
            disabled={isHubReadOnly}
            onChange={(v) => updateRoleOp('autoPush3plWmsWebhook', v)}
            bgSubtle={bgSubtle}
            borderCol={borderCol}
          />
        </div>
      );
    }

    // DRIVER
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SettingToggleRow
          icon={Volume2}
          iconColor="#10b981"
          title="Cảnh báo giọng nói Cabin khi lệch tuyến / quá tốc độ"
          description="Đọc tín hiệu cảnh báo an toàn trực tiếp trên Cabin OS khi đang lái xe"
          checked={ops.voiceNavigationAlerts}
          onChange={(v) => updateRoleOp('voiceNavigationAlerts', v)}
          bgSubtle={bgSubtle}
          borderCol={borderCol}
        />
        <SettingToggleRow
          icon={Moon}
          iconColor="#38bdf8"
          title="Tự động chuyển chế độ Nền Tối ban đêm (18:00 - 06:00)"
          description="Giảm chói mắt tài xế trong khoang lái khi di chuyển ban đêm"
          checked={ops.nightAutoDarkCabin}
          onChange={(v) => updateRoleOp('nightAutoDarkCabin', v)}
          bgSubtle={bgSubtle}
          borderCol={borderCol}
        />
        <SettingSelectRow
          icon={Clock}
          iconColor="#f59e0b"
          title="Nhắc nghỉ giải lao trước ngưỡng HOS 4 giờ"
          description="Cảnh báo tìm trạm dừng nghỉ / trạm sạc EV trước khi vi phạm giờ lái"
          value={Number(ops.hosBreakReminderMinutes)}
          options={[
            { value: 15, label: 'Trước 15 phút' },
            { value: 30, label: 'Trước 30 phút' }
          ]}
          onChange={(v) => updateRoleOp('hosBreakReminderMinutes', Number(v))}
          bgSubtle={bgSubtle}
          bgSurface={bgSurface}
          borderCol={borderCol}
          textMain={textMain}
        />
        <SettingSelectRow
          icon={RefreshCw}
          iconColor="#0ea5e9"
          title="Tần suất truyền tọa độ GPS về NOC"
          description="Điều chỉnh độ mượt theo dõi vệ tinh và mức tiêu thụ 4G trên xe"
          value={Number(ops.gpsPingIntervalSec)}
          options={[
            { value: 3, label: '3 giây (Độ chính xác cao)' },
            { value: 5, label: '5 giây (Tiêu chuẩn Cabin)' },
            { value: 10, label: '10 giây (Tiết kiệm dữ liệu)' }
          ]}
          onChange={(v) => updateRoleOp('gpsPingIntervalSec', Number(v))}
          bgSubtle={bgSubtle}
          bgSurface={bgSurface}
          borderCol={borderCol}
          textMain={textMain}
        />
        <div
          style={{
            padding: '11px 14px',
            borderRadius: 12,
            background: bgSubtle,
            border: `1px solid ${borderCol}`,
            display: 'grid',
            gap: 6
          }}
        >
          <div style={{ fontSize: '0.81rem', fontWeight: 700 }}>
            Đường dây nóng khẩn cấp SOS NOC
          </div>
          <input
            type="text"
            value={ops.sosEmergencyPhone || ''}
            onChange={(e) => updateRoleOp('sosEmergencyPhone', e.target.value)}
            placeholder="1900-636-888"
            style={inputStyle}
          />
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'profile', label: 'Hồ sơ & Quyền', icon: UserCheck, testId: 'settings-tab-profile' },
    { id: 'preferences', label: 'Hiển thị & Hệ đo', icon: Sliders, testId: 'settings-tab-preferences' },
    { id: 'roleOps', label: roleMeta.roleOpsTabLabel, icon: Briefcase, testId: 'settings-tab-role-ops' },
    { id: 'notifications', label: 'Thông báo', icon: Bell, testId: 'settings-tab-notifications' },
    { id: 'security', label: 'Bảo mật & Phiên', icon: KeyRound, testId: 'settings-tab-security' }
  ];

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài Đặt Tài Khoản & Hệ Thống"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3600,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          borderRadius: 20,
          background: bgSurface,
          border: `1px solid ${borderCol}`,
          boxShadow: '0 28px 60px rgba(0, 0, 0, 0.45)',
          color: textMain,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: `1px solid ${borderCol}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #0284c7)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getInitials(user)}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <Settings size={16} color="#10b981" /> Cài Đặt Hệ Thống &amp; Nghiệp Vụ
              </h3>
              <div style={{ fontSize: '0.72rem', color: textMuted }}>
                {user.fullName || user.username} (@{user.username}) •{' '}
                <strong style={{ color: roleMeta.accentColor }}>{roleMeta.shortBadge}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Đóng cài đặt"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: darkChrome ? 'rgba(30,41,59,0.85)' : '#f1f5f9',
              color: textMain,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: '6px 16px 0',
            borderBottom: `1px solid ${borderCol}`,
            overflowX: 'auto'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testId}
                onClick={() => setSettingsTab(tab.id)}
                style={{
                  padding: '9px 11px',
                  border: 'none',
                  borderBottom: active ? '2px solid #10b981' : '2px solid transparent',
                  background: 'transparent',
                  color: active ? '#10b981' : textMuted,
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: 20, maxHeight: '68vh', overflowY: 'auto' }}>
          {settingsTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <form
                onSubmit={handleProfileSave}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: bgSubtle,
                  border: `1px solid ${borderCol}`,
                  display: 'grid',
                  gap: 10
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981' }}>
                  THÔNG TIN CÁ NHÂN &amp; LIÊN HỆ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>
                      Họ và tên hiển thị
                    </label>
                    <input
                      data-testid="settings-profile-fullname"
                      type="text"
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>
                      Email công việc
                    </label>
                    <input
                      data-testid="settings-profile-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="name@ccadro.vn"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>
                      Số điện thoại
                    </label>
                    <input
                      data-testid="settings-profile-phone"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="0901 234 567"
                      style={inputStyle}
                    />
                  </div>
                </div>
                {profileStatus && (
                  <div
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background:
                        profileStatus.type === 'success'
                          ? 'rgba(16,185,129,0.14)'
                          : 'rgba(239,68,68,0.12)',
                      color: profileStatus.type === 'success' ? '#10b981' : '#ef4444'
                    }}
                  >
                    {profileStatus.text}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    data-testid="btn-save-profile"
                    disabled={savingProfile}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 9,
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Save size={13} />
                    <span>{savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ cá nhân'}</span>
                  </button>
                </div>
              </form>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: bgSubtle,
                  border: `1px solid ${borderCol}`,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                  fontSize: '0.78rem'
                }}
              >
                <div>
                  <div style={{ color: textMuted, fontSize: '0.67rem', fontWeight: 700 }}>
                    TÊN ĐĂNG NHẬP
                  </div>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>@{user.username}</div>
                </div>
                <div>
                  <div style={{ color: textMuted, fontSize: '0.67rem', fontWeight: 700 }}>
                    VAI TRÒ RBAC (CỐ ĐỊNH)
                  </div>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>{user.role}</div>
                </div>
                <div>
                  <div style={{ color: textMuted, fontSize: '0.67rem', fontWeight: 700 }}>
                    ĐƠN VỊ / CÔNG TY / TRỤ SỞ
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>
                    {user.assignedHubCode || user.companyName || user.department || 'Toàn hệ thống CCADRO'}
                  </div>
                </div>
                <div>
                  <div style={{ color: textMuted, fontSize: '0.67rem', fontWeight: 700 }}>
                    PHẠM VI ĐỊNH DANH
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>
                    {user.assignedShipperCode || user.customerId || 'Tài khoản Nội bộ'}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.71rem',
                    fontWeight: 800,
                    color: textMuted,
                    marginBottom: 7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <ShieldCheck size={14} color="#10b981" /> QUYỀN HẠN ĐƯỢC CẤP TRONG PHIÊN
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(user.permissions || []).map((perm) => (
                    <span
                      key={perm}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#10b981'
                      }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Theme Switch */}
              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: bgSubtle,
                  border: `1px solid ${borderCol}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isDark ? <Moon size={16} color="#38bdf8" /> : <Sun size={16} color="#f59e0b" />}
                  <div>
                    <div style={{ fontSize: '0.81rem', fontWeight: 700 }}>Chế độ giao diện</div>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>
                      Đang dùng: {isDark ? 'Nền Tối (Dark Mode)' : 'Nền Sáng (Light Mode)'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="settings-toggle-theme"
                  onClick={toggleTheme}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${borderCol}`,
                    background: bgSurface,
                    color: textMain,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Đổi sang {isDark ? 'Sáng' : 'Tối'}
                </button>
              </div>

              <SettingSelectRow
                icon={Sliders}
                iconColor="#10b981"
                title="Màn hình khởi động mặc định sau đăng nhập"
                description={`Tùy chỉnh tab ưu tiên cho vai trò ${user.role}`}
                value={prefs.defaultLandingTab}
                options={landingOptions}
                onChange={(v) => updatePref('defaultLandingTab', v)}
                bgSubtle={bgSubtle}
                bgSurface={bgSurface}
                borderCol={borderCol}
                textMain={textMain}
              />

              <SettingSelectRow
                icon={Sliders}
                iconColor="#0ea5e9"
                title="Mật độ hiển thị bảng & danh sách"
                description="Tối ưu số lượng vận đơn / bản ghi hiển thị trên cùng một màn hình"
                value={prefs.tableDensity}
                options={[
                  { value: 'comfortable', label: 'Thoải mái (Comfortable)' },
                  { value: 'standard', label: 'Tiêu chuẩn (Standard)' },
                  { value: 'compact', label: 'Thu gọn (Compact)' }
                ]}
                onChange={(v) => updatePref('tableDensity', v)}
                bgSubtle={bgSubtle}
                bgSurface={bgSurface}
                borderCol={borderCol}
                textMain={textMain}
                testId="settings-select-density"
              />

              <SettingSelectRow
                icon={Globe}
                iconColor="#8b5cf6"
                title="Đơn vị Quãng đường / Tiền tệ / Carbon"
                description="Chuẩn hiển thị số liệu trên biểu đồ, hợp đồng & telemetry"
                value={`${prefs.distanceUnit}|${prefs.currency}|${prefs.carbonUnit}`}
                options={[
                  { value: 'metric|VND|kg', label: 'km • VND (₫) • kgCO₂e' },
                  { value: 'metric|USD|ton', label: 'km • USD ($) • tCO₂e' },
                  { value: 'imperial|USD|ton', label: 'mile • USD ($) • tCO₂e' }
                ]}
                onChange={(v) => {
                  const [distanceUnit, currency, carbonUnit] = String(v).split('|');
                  const next = { ...prefs, distanceUnit, currency, carbonUnit };
                  setPrefs(next);
                  saveUserSettings(user.username, next);
                  flashSaved('Đã cập nhật đơn vị đo & tiền tệ');
                }}
                bgSubtle={bgSubtle}
                bgSurface={bgSurface}
                borderCol={borderCol}
                textMain={textMain}
              />

              <SettingSelectRow
                icon={Clock}
                iconColor="#0ea5e9"
                title="Múi giờ vận hành hệ thống"
                value={prefs.timezone}
                options={[
                  { value: 'Asia/Ho_Chi_Minh', label: 'UTC+07:00 (Việt Nam)' },
                  { value: 'Asia/Singapore', label: 'UTC+08:00 (Singapore / ASEAN)' },
                  { value: 'UTC', label: 'UTC+00:00 (Giờ quốc tế)' }
                ]}
                onChange={(v) => updatePref('timezone', v)}
                bgSubtle={bgSubtle}
                bgSurface={bgSurface}
                borderCol={borderCol}
                textMain={textMain}
              />

              <SettingSelectRow
                icon={RefreshCw}
                iconColor="#8b5cf6"
                title="Chu kỳ làm mới dữ liệu Telemetry Real-time"
                description="Áp dụng cho bảng điều khiển, GPS & trạng thái vận chuyển"
                value={Number(prefs.realtimeIntervalSec)}
                options={[
                  { value: 5, label: '5 giây (Tức thời cao)' },
                  { value: 10, label: '10 giây' },
                  { value: 15, label: '15 giây (Khuyên dùng)' },
                  { value: 30, label: '30 giây' },
                  { value: 60, label: '60 giây (Tiết kiệm băng thông)' }
                ]}
                onChange={(v) => updatePref('realtimeIntervalSec', Number(v))}
                bgSubtle={bgSubtle}
                bgSurface={bgSurface}
                borderCol={borderCol}
                textMain={textMain}
              />

              <SettingToggleRow
                icon={Sliders}
                iconColor="#64748b"
                title="Giảm hiệu ứng chuyển động biểu đồ (Reduce Motion)"
                description="Tối ưu hiệu năng hiển thị trên thiết bị cấu hình thấp hoặc Cabin xe"
                checked={prefs.reduceMotion}
                onChange={(v) => updatePref('reduceMotion', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
            </div>
          )}

          {settingsTab === 'roleOps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: '10px 13px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.75rem'
                }}
              >
                <div style={{ fontWeight: 800, color: '#10b981' }}>
                  Cấu hình chuyên biệt cho vai trò: {role}
                </div>
                <div style={{ opacity: 0.82, marginTop: 2 }}>{roleMeta.roleOpsDescription}</div>
              </div>
              {renderRoleOperationsSettings()}
            </div>
          )}

          {settingsTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SettingToggleRow
                icon={Volume2}
                iconColor="#10b981"
                title="Âm báo cảnh báo & tin nhắn mới"
                description="Phát tín hiệu nhẹ khi có sự cố khẩn cấp hoặc tin nhắn CCADRO Messenger"
                checked={prefs.soundAlerts}
                onChange={(v) => updatePref('soundAlerts', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Bell}
                iconColor="#0284c7"
                title="Thông báo thời gian thực trên màn hình"
                description="Hiện banner cập nhật vận đơn, ePOD, hợp đồng và điều phối"
                checked={prefs.desktopAlerts}
                onChange={(v) => updatePref('desktopAlerts', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Shield}
                iconColor="#ef4444"
                title="Cảnh báo khẩn cấp, sự cố tuyến & SOS P0"
                description="Luôn ưu tiên hiển thị sự cố nghiêm trọng và lệch tuyến ngoài kiểm soát"
                checked={prefs.notifyIncidentSos}
                onChange={(v) => updatePref('notifyIncidentSos', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Check}
                iconColor="#10b981"
                title="Cập nhật Vận đơn & Ký nhận Photo POD / ePOD"
                description="Thông báo khi container đến kho, bàn giao 3PL hoặc hoàn tất giao hàng"
                checked={prefs.notifyShipmentEpod}
                onChange={(v) => updatePref('notifyShipmentEpod', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Mail}
                iconColor="#0ea5e9"
                title="Thông báo Hợp đồng, Thanh toán & Email PDF (Kafka)"
                description="Cập nhật ký số SHA-256, thanh toán Net-30/VietQR và biên lai PDF qua email"
                checked={prefs.notifyPaymentContract}
                onChange={(v) => updatePref('notifyPaymentContract', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Bell}
                iconColor="#8b5cf6"
                title="Tin nhắn mới từ CCADRO Messenger"
                description="Cập nhật huy hiệu tin nhắn chưa đọc từ điều phối, tài xế và khách hàng"
                checked={prefs.notifyMessenger}
                onChange={(v) => updatePref('notifyMessenger', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
              <SettingToggleRow
                icon={Clock}
                iconColor="#f59e0b"
                title="Chế độ Giờ yên tĩnh (22:00 - 06:00)"
                description="Tạm tắt thông báo thường vào ban đêm (chỉ giữ lại cảnh báo khẩn cấp P0/SOS)"
                checked={prefs.quietHoursEnabled}
                onChange={(v) => updatePref('quietHoursEnabled', v)}
                bgSubtle={bgSubtle}
                borderCol={borderCol}
              />
            </div>
          )}

          {settingsTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SettingToggleRow
                  icon={ShieldCheck}
                  iconColor="#10b981"
                  title="Xác thực 2 lớp (2FA Email OTP)"
                  description="Yêu cầu mã xác thực bổ sung khi đăng nhập từ thiết bị hoặc trình duyệt mới"
                  checked={prefs.twoFactorEnabled}
                  onChange={(v) => updatePref('twoFactorEnabled', v)}
                  bgSubtle={bgSubtle}
                  borderCol={borderCol}
                  testId="settings-toggle-2fa"
                />
                <SettingSelectRow
                  icon={Clock}
                  iconColor="#f59e0b"
                  title="Tự động khóa phiên khi không thao tác"
                  description="Tự bảo vệ màn hình nếu rời vị trí làm việc quá thời gian quy định"
                  value={Number(prefs.autoLockMinutes)}
                  options={[
                    { value: 15, label: 'Sau 15 phút' },
                    { value: 30, label: 'Sau 30 phút' },
                    { value: 60, label: 'Sau 60 phút' },
                    { value: 0, label: 'Không tự khóa' }
                  ]}
                  onChange={(v) => updatePref('autoLockMinutes', Number(v))}
                  bgSubtle={bgSubtle}
                  bgSurface={bgSurface}
                  borderCol={borderCol}
                  textMain={textMain}
                />
                <SettingToggleRow
                  icon={Bell}
                  iconColor="#0ea5e9"
                  title="Cảnh báo khi phát hiện đăng nhập từ địa chỉ IP lạ"
                  description="Gửi thông báo bảo mật về email công việc khi có phiên bất thường"
                  checked={prefs.unusualLoginAlert}
                  onChange={(v) => updatePref('unusualLoginAlert', v)}
                  bgSubtle={bgSubtle}
                  borderCol={borderCol}
                />
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: bgSubtle,
                  border: `1px solid ${borderCol}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ fontSize: '0.76rem', color: textMuted }}>
                  Đổi mật khẩu tài khoản <strong>@{user.username}</strong> (yêu cầu &gt;= 3 ký tự; khuyến nghị &gt;= 8 ký tự gồm chữ và số).
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 4 }}>
                    Mật khẩu hiện tại
                  </label>
                  <input
                    data-testid="settings-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 4 }}>
                    Mật khẩu mới
                  </label>
                  <input
                    data-testid="settings-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 4 }}>
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    data-testid="settings-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                {pwdStatus && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background:
                        pwdStatus.type === 'success'
                          ? 'rgba(16,185,129,0.14)'
                          : 'rgba(239,68,68,0.12)',
                      color: pwdStatus.type === 'success' ? '#10b981' : '#ef4444'
                    }}
                  >
                    {pwdStatus.text}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    data-testid="btn-reset-settings"
                    onClick={handleResetDefaults}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 9,
                      border: `1px solid ${borderCol}`,
                      background: 'transparent',
                      color: textMuted,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <RotateCcw size={13} /> Khôi phục cài đặt mặc định
                  </button>

                  <button
                    type="submit"
                    data-testid="btn-save-new-password"
                    disabled={savingPwd}
                    style={{
                      padding: '9px 15px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7
                    }}
                  >
                    <Lock size={14} />
                    <span>{savingPwd ? 'Đang cập nhật...' : 'Cập nhật mật khẩu bảo mật'}</span>
                  </button>
                </div>
              </form>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: bgSubtle,
                  border: `1px solid ${borderCol}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.81rem', fontWeight: 800 }}>
                      Phiên đăng nhập &amp; Thu hồi Token (Redis + DB)
                    </div>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>
                      Access Token ngắn hạn 15 phút tự xoay vòng bằng Refresh Token • Blacklist tức thời trên Redis
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-logout-all-devices"
                    onClick={async () => {
                      if (onClose) onClose();
                      if (logout) await logout({ allDevices: true });
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#f87171',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <LogOut size={13} /> Đăng xuất khỏi mọi thiết bị
                  </button>
                </div>

                {loadingSessions ? (
                  <div style={{ fontSize: '0.74rem', color: textMuted }}>
                    Đang tải danh sách phiên hoạt động...
                  </div>
                ) : activeSessions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {activeSessions.map((sess) => (
                      <div
                        key={sess.sessionId}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 9,
                          background: bgSurface,
                          border: `1px solid ${borderCol}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.73rem'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sess.deviceInfo || 'Trình duyệt Web'} {sess.current ? '(Phiên hiện tại)' : ''}
                          </div>
                          <div style={{ color: textMuted, fontSize: '0.68rem' }}>
                            IP: {sess.ipAddress || '—'} • Refresh lần cuối:{' '}
                            {sess.lastRefreshedAt ? new Date(sess.lastRefreshedAt).toLocaleString('vi-VN') : '—'}
                          </div>
                        </div>
                        {!sess.current && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.revokeSession(sess.sessionId);
                                setActiveSessions((prev) =>
                                  prev.filter((item) => item.sessionId !== sess.sessionId)
                                );
                              } catch (_) {
                                // ignore
                              }
                            }}
                            style={{
                              padding: '4px 9px',
                              borderRadius: 7,
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            Thu hồi
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: textMuted }}>
                    Phiên hiện tại đang bảo vệ bởi cơ chế thu hồi tức thời khi đăng xuất hoặc đổi mật khẩu.
                  </div>
                )}
              </div>
            </div>
          )}

          {prefsSavedMsg && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.14)',
                color: '#10b981',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Check size={14} /> {prefsSavedMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
