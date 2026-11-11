import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Gauge,
  Leaf,
  LogOut,
  Moon,
  Navigation,
  Package,
  PlusCircle,
  Radar,
  Search,
  ShieldCheck,
  Sun,
  Thermometer,
  Truck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import CcadroLogo from '../components/ui/CcadroLogo';
import { CountingNumber } from '../components/ui/CountingNumber';
import { MAP_NODES, POWERTRAINS } from '../components/landing/landingContent';
import '../styles/landing.css';

export const USER_SHIPMENTS_STORAGE_KEY = 'ccadro_user_shipments';

const INITIAL_CUSTOMER_SHIPMENTS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    shipmentCode: 'SH-2026-081',
    customerId: 'VINAMILK',
    customerName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'KCN VSIP 1, Bình Dương',
    cargoType: 'Chuỗi lạnh tiêu chuẩn (-18°C)',
    cargoWeightTons: 14.5,
    distanceKm: 27.3,
    vehicleType: 'Xe đầu kéo điện (EV)',
    licensePlate: '51C-888.99',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang di chuyển trên hành lang xanh',
    currentLocation: 'Cầu Phú Hữu, Vành Đai 2',
    speedKmh: 54,
    etaMinutes: 24,
    temperatureC: -18.2,
    baselineCo2Kg: 72.8,
    actualCo2Kg: 52.1,
    co2SavedKg: 20.7,
    co2ReductionPct: 28.4,
    progress: 68,
    corridorState: 'ON_CORRIDOR (Sai số 8.4m)',
    certificateHash: '0x94f8a2c1e7b0492d8f31c5a20194e8b7d6c5a4f3',
    createdAt: '2026-11-11 08:15'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    shipmentCode: 'SH-2026-082',
    customerId: 'VINAMILK',
    customerName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    originName: 'ICD Sóng Thần, Bình Dương',
    destinationName: 'Cảng Hiệp Phước, TP. HCM',
    cargoType: 'Hàng tiêu dùng nhanh (FMCG)',
    cargoWeightTons: 18.0,
    distanceKm: 38.6,
    vehicleType: 'Xe tải chuẩn Euro 5',
    licensePlate: '51D-662.18',
    status: 'COMPLETED',
    statusLabel: 'Đã bàn giao & cấp chứng nhận ePOD',
    currentLocation: 'Kho Bến Cảng Hiệp Phước',
    speedKmh: 0,
    etaMinutes: 0,
    temperatureC: 4.0,
    baselineCo2Kg: 94.5,
    actualCo2Kg: 71.2,
    co2SavedKg: 23.3,
    co2ReductionPct: 24.6,
    progress: 100,
    corridorState: 'HOÀN TẤT AN TOÀN 100%',
    certificateHash: '0x3b71d9e4a102f8c654d3e9a812b4c7f091e2d3c4',
    createdAt: '2026-11-10 14:20'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    shipmentCode: 'SH-2026-083',
    customerId: 'SAMSUNG_VN',
    customerName: 'Samsung Electronics HCMC CE Complex',
    originName: 'Cảng Cái Mép, Bà Rịa – Vũng Tàu',
    destinationName: 'KCN Nhơn Trạch, Đồng Nai',
    cargoType: 'Linh kiện điện tử giá trị cao',
    cargoWeightTons: 21.0,
    distanceKm: 46.8,
    vehicleType: 'Xe đầu kéo điện (EV)',
    licensePlate: '60C-912.45',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang di chuyển trên hành lang xanh',
    currentLocation: 'Cao tốc Biên Hòa – Vũng Tàu',
    speedKmh: 61,
    etaMinutes: 35,
    temperatureC: 20.5,
    baselineCo2Kg: 118.4,
    actualCo2Kg: 82.9,
    co2SavedKg: 35.5,
    co2ReductionPct: 30.0,
    progress: 54,
    corridorState: 'ON_CORRIDOR (Sai số 6.1m)',
    certificateHash: '0x7c12e5f9b408a6d321f7c8e904a5b6d7e8f9a0b1',
    createdAt: '2026-11-11 07:45'
  }
];

export function loadStoredUserShipments() {
  try {
    const raw = window.localStorage.getItem(USER_SHIPMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {
    // ignore
  }
  return INITIAL_CUSTOMER_SHIPMENTS;
}

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'booking' | 'carbon' | 'profile'
  const [allShipments, setAllShipments] = useState(() => loadStoredUserShipments());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState('SH-2026-081');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    originId: 'catlai',
    destinationId: 'vsip',
    cargoType: 'Chuỗi lạnh tiêu chuẩn (-18°C)',
    cargoWeightTons: 16,
    powertrainId: 'ev',
    pickupDate: '2026-11-12',
    pickupTime: '08:30',
    notes: 'Ưu tiên lộ trình xanh tránh ùn tắc cầu Phú Mỹ, yêu cầu duy trì nhiệt độ thùng lạnh.'
  });

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    deviationAlert: true,
    etaArrivalAlert: true,
    autoEpodEmail: true,
    monthlyEsgDigest: true
  });

  // Filter shipments belonging to the logged-in customer (or show all if none match yet so new user sees their own + demo reference)
  const customerShipments = useMemo(() => {
    const custId = (user?.customerId || 'VINAMILK').toUpperCase();
    const own = allShipments.filter(
      (s) => s.customerId?.toUpperCase() === custId || s.createdByUsername === user?.username
    );
    const baseList = own.length > 0 ? own : allShipments;
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(
      (s) =>
        s.shipmentCode.toLowerCase().includes(q) ||
        s.originName.toLowerCase().includes(q) ||
        s.destinationName.toLowerCase().includes(q) ||
        s.statusLabel.toLowerCase().includes(q)
    );
  }, [allShipments, user, searchQuery]);

  const activeShipment =
    customerShipments.find((s) => s.shipmentCode === selectedCode) ||
    customerShipments[0] ||
    INITIAL_CUSTOMER_SHIPMENTS[0];

  // Live quote calculation for Booking tab
  const bookingQuote = useMemo(() => {
    const originNode = MAP_NODES.find((n) => n.id === bookingForm.originId) || MAP_NODES[3];
    const destNode = MAP_NODES.find((n) => n.id === bookingForm.destinationId) || MAP_NODES[0];
    const powertrain = POWERTRAINS.find((p) => p.id === bookingForm.powertrainId) || POWERTRAINS[0];

    const dx = destNode.x - originNode.x;
    const dy = destNode.y - originNode.y;
    const rawDist = Math.hypot(dx, dy) * 0.22;
    const distanceKm = Math.max(14.5, Math.round(rawDist * 10) / 10);
    const weight = Number(bookingForm.cargoWeightTons) || 12;

    const baselineCo2Kg = Math.round(distanceKm * weight * 0.108 * 10) / 10;
    const reductionRatio = 0.08 + powertrain.reduction;
    const actualCo2Kg = Math.round(baselineCo2Kg * (1 - reductionRatio) * 10) / 10;
    const savedCo2Kg = Math.round((baselineCo2Kg - actualCo2Kg) * 10) / 10;
    const reductionPct = Math.round(reductionRatio * 1000) / 10;
    const etaMinutes = Math.max(20, Math.round((distanceKm / 52) * 60));

    return {
      originNode,
      destNode,
      powertrain,
      distanceKm,
      baselineCo2Kg,
      actualCo2Kg,
      savedCo2Kg,
      reductionPct,
      etaMinutes
    };
  }, [bookingForm]);

  const totalSavedCo2 = useMemo(
    () =>
      Math.round(customerShipments.reduce((acc, s) => acc + (Number(s.co2SavedKg) || 0), 0) * 10) /
      10,
    [customerShipments]
  );

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    const newCode = `SH-2026-${Math.floor(100 + Math.random() * 890)}`;
    const originLabel = `${bookingQuote.originNode.label}, ${bookingQuote.originNode.area}`;
    const destLabel = `${bookingQuote.destNode.label}, ${bookingQuote.destNode.area}`;

    const newOrder = {
      id: `cust-ship-${Date.now()}`,
      shipmentCode: newCode,
      customerId: user?.customerId || 'VINAMILK',
      customerName: user?.companyName || user?.fullName || 'Doanh Nghiệp Đối Tác B2B',
      createdByUsername: user?.username || 'shipper',
      originName: originLabel,
      destinationName: destLabel,
      cargoType: bookingForm.cargoType,
      cargoWeightTons: Number(bookingForm.cargoWeightTons),
      distanceKm: bookingQuote.distanceKm,
      vehicleType: bookingQuote.powertrain.name,
      licensePlate: bookingForm.powertrainId === 'ev' ? '51C-998.68' : '51D-745.22',
      status: 'IN_TRANSIT',
      statusLabel: 'Đã điều xe xanh • Đang trên hành lang vận tải',
      currentLocation: `Trạm kiểm soát ${bookingQuote.originNode.label}`,
      speedKmh: 48,
      etaMinutes: bookingQuote.etaMinutes,
      temperatureC: bookingForm.cargoType.includes('-18°C') ? -18.0 : 18.5,
      baselineCo2Kg: bookingQuote.baselineCo2Kg,
      actualCo2Kg: bookingQuote.actualCo2Kg,
      co2SavedKg: bookingQuote.savedCo2Kg,
      co2ReductionPct: bookingQuote.reductionPct,
      progress: 28,
      corridorState: 'ON_CORRIDOR (Khởi hành chuẩn lộ trình Pareto)',
      certificateHash: `0x${Math.random().toString(16).slice(2, 18)}${Math.random()
        .toString(16)
        .slice(2, 18)}`,
      createdAt: `${bookingForm.pickupDate} ${bookingForm.pickupTime}`
    };

    try {
      await api.createShipment({
        shipmentCode: newCode,
        originAddress: originLabel,
        destinationAddress: destLabel,
        originLat: 10.762,
        originLon: 106.782,
        destinationLat: 10.924,
        destinationLon: 106.714,
        weightTons: Number(bookingForm.cargoWeightTons)
      });
    } catch (_) {
      // Vẫn lưu vào bộ nhớ cục bộ để đồng bộ giữa Cổng Khách hàng và Cổng Giám sát Nội bộ
    }

    const updated = [newOrder, ...allShipments];
    setAllShipments(updated);
    try {
      window.localStorage.setItem(USER_SHIPMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {
      // ignore
    }

    setSelectedCode(newCode);
    setBookingSuccess(
      `Đã khởi tạo vận đơn xanh ${newCode} thành công! Lộ trình cắt giảm ${bookingQuote.savedCo2Kg} kg CO2e (-${bookingQuote.reductionPct}%).`
    );
    setTimeout(() => {
      setActiveTab('tracking');
    }, 900);
  };

  const handleDownloadCertificate = (shipment) => {
    const payload = {
      standard: 'ISO 14083:2023 & GLEC Framework v3.0',
      issuer: 'CCADRO Green Supply Chain Carbon Ledger',
      shipmentCode: shipment.shipmentCode,
      customer: shipment.customerName,
      customerId: shipment.customerId,
      route: `${shipment.originName} -> ${shipment.destinationName}`,
      distanceKm: shipment.distanceKm,
      cargoWeightTons: shipment.cargoWeightTons,
      vehicleType: shipment.vehicleType,
      baselineEmissionsKgCo2e: shipment.baselineCo2Kg,
      actualEmissionsKgCo2e: shipment.actualCo2Kg,
      avoidedEmissionsKgCo2e: shipment.co2SavedKg,
      reductionPercentage: `${shipment.co2ReductionPct}%`,
      verificationSha256: shipment.certificateHash,
      issuedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCADRO-ISO14083-${shipment.shipmentCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className="lp-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#05130f' : '#f4faf7',
        color: isDark ? '#f1f5f9' : '#0f172a'
      }}
    >
      {/* ── Dedicated Customer Portal Header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: isDark ? 'rgba(6, 22, 17, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          borderBottom: isDark
            ? '1px solid rgba(110, 231, 183, 0.16)'
            : '1px solid rgba(16, 185, 129, 0.18)'
        }}
      >
        <div
          className="lp-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <CcadroLogo
                size={40}
                showText
                title="CCADRO B2B"
                subtitle="CỔNG KHÁCH HÀNG & CHỦ HÀNG"
              />
            </button>

            <span
              style={{
                padding: '4px 11px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}
            >
              ● MÃ ĐỐI TÁC: {user?.customerId || 'VINAMILK'}
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap'
            }}
          >
            {[
              { id: 'tracking', label: 'Theo Dõi Vận Đơn', icon: Navigation },
              { id: 'booking', label: 'Đặt Lịch Vận Chuyển Xanh', icon: PlusCircle },
              { id: 'carbon', label: 'Chứng Nhận CO2e & ePOD', icon: FileCheck2 },
              { id: 'profile', label: 'Hồ Sơ Doanh Nghiệp', icon: Building2 }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 15px',
                    borderRadius: 999,
                    border: active ? '1px solid #10b981' : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'transparent',
                    color: active ? '#042f2e' : 'inherit',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right User Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Đổi giao diện sáng/tối"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(148, 163, 184, 0.28)',
                background: 'transparent',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/portal')}
              title="Chuyển sang Hệ thống Giám sát Nội bộ"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Radar size={14} /> Cổng Giám Sát Nội Bộ
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 999,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LogOut size={14} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* ── Customer Executive Summary Banner ── */}
      <section
        style={{
          padding: '28px 0 18px',
          borderBottom: isDark
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid rgba(15,23,42,0.08)'
        }}
      >
        <div className="lp-container">
          <div
            style={{
              padding: '22px 26px',
              borderRadius: 20,
              background: isDark
                ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.42) 0%, rgba(15, 23, 42, 0.85) 100%)'
                : 'linear-gradient(135deg, rgba(209, 250, 229, 0.85) 0%, rgba(255, 255, 255, 0.96) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 20
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#10b981',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6
                }}
              >
                <ShieldCheck size={15} /> HỆ THỐNG DÀNH RIÊNG CHO KHÁCH HÀNG &amp; ĐỐI TÁC CHỦ HÀNG
                (BRULE-16)
              </div>
              <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 6px' }}>
                Xin chào, {user?.fullName || 'Đại Diện Chủ Hàng'} •{' '}
                <span style={{ color: '#10b981' }}>
                  {user?.companyName || 'Vinamilk Logistics'}
                </span>
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  opacity: 0.82,
                  margin: 0,
                  maxWidth: 760
                }}
              >
                Không gian quản lý vận đơn độc lập của doanh nghiệp bạn: theo dõi tọa độ GPS trực
                tuyến, đặt lịch vận chuyển xanh đa tiêu chí và tải chứng nhận giảm phát thải chuẩn
                quốc tế ISO 14083.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('booking')}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <PlusCircle size={16} /> Đặt Lịch Vận Chuyển Xanh
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('carbon')}
                className="lp-btn lp-btn--ghost lp-btn--sm"
                style={{
                  color: isDark ? '#fff' : '#064e3b',
                  borderColor: 'rgba(16, 185, 129, 0.4)'
                }}
              >
                <FileCheck2 size={16} /> Sổ Cái CO2e &amp; Chứng Nhận
              </button>
            </div>
          </div>

          {/* 4 KPI Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginTop: 18
            }}
          >
            {[
              {
                label: 'Tổng Vận Đơn Doanh Nghiệp',
                value: customerShipments.length,
                unit: 'đơn hàng',
                sub: 'Cô lập dữ liệu theo mã đối tác',
                icon: Package,
                color: '#10b981'
              },
              {
                label: 'Đang Lưu Thông Trên Tuyến',
                value: customerShipments.filter((s) => s.status === 'IN_TRANSIT').length,
                unit: 'chuyến',
                sub: 'Giám sát hành lang GPS 24/7',
                icon: Truck,
                color: '#38bdf8'
              },
              {
                label: 'Tổng CO2e Đã Tiết Kiệm',
                value: totalSavedCo2,
                decimals: 1,
                unit: 'kg CO2e',
                sub: 'Hạch toán chuẩn GLEC v3 WTW',
                icon: Leaf,
                color: '#34d399'
              },
              {
                label: 'Chứng Nhận Số ISO 14083',
                value: customerShipments.length,
                unit: 'chứng chỉ',
                sub: 'Sẵn sàng cho kiểm toán Scope 3',
                icon: FileCheck2,
                color: '#f59e0b'
              }
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 16,
                    background: isDark ? 'rgba(15, 29, 24, 0.85)' : '#ffffff',
                    border: isDark
                      ? '1px solid rgba(110, 231, 183, 0.14)'
                      : '1px solid rgba(15, 23, 42, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.76rem', opacity: 0.72, fontWeight: 600 }}>
                      {kpi.label}
                    </div>
                    <div
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: kpi.color,
                        margin: '4px 0'
                      }}
                    >
                      <CountingNumber value={kpi.value} decimals={kpi.decimals || 0} />{' '}
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{kpi.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', opacity: 0.68 }}>{kpi.sub}</div>
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: kpi.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Main Interactive Workspace ── */}
      <main className="lp-container" style={{ padding: '24px 20px 60px', flex: 1 }}>
        {bookingSuccess && (
          <div
            style={{
              padding: '13px 18px',
              borderRadius: 14,
              background: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid #10b981',
              color: isDark ? '#a7f3d0' : '#065f46',
              fontSize: '0.86rem',
              fontWeight: 700,
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>✓ {bookingSuccess}</span>
            <button
              type="button"
              onClick={() => setBookingSuccess(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: MY SHIPMENTS & LIVE TRACKING */}
        {activeTab === 'tracking' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 24,
              alignItems: 'start'
            }}
          >
            {/* Left: Customer Shipments List */}
            <div
              style={{
                padding: 22,
                borderRadius: 20,
                background: isDark ? 'rgba(12, 26, 21, 0.9)' : '#ffffff',
                border: isDark
                  ? '1px solid rgba(110, 231, 183, 0.16)'
                  : '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0 }}>
                  Danh Sách Vận Đơn Của Doanh Nghiệp
                </h2>
                <div style={{ position: 'relative', minWidth: 210 }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.55
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã đơn, cảng, KCN..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: 999,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {customerShipments.map((s) => {
                  const isSelected = activeShipment?.shipmentCode === s.shipmentCode;
                  return (
                    <div
                      key={s.shipmentCode}
                      onClick={() => setSelectedCode(s.shipmentCode)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 15,
                        cursor: 'pointer',
                        background: isSelected
                          ? 'rgba(16, 185, 129, 0.14)'
                          : isDark
                            ? 'rgba(15, 23, 42, 0.55)'
                            : '#f8fafc',
                        border: isSelected
                          ? '1.5px solid #10b981'
                          : '1px solid rgba(148, 163, 184, 0.18)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code
                            style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: '#10b981'
                            }}
                          >
                            {s.shipmentCode}
                          </code>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background:
                                s.status === 'IN_TRANSIT'
                                  ? 'rgba(16, 185, 129, 0.18)'
                                  : 'rgba(56, 189, 248, 0.18)',
                              color: s.status === 'IN_TRANSIT' ? '#34d399' : '#38bdf8',
                              fontWeight: 700
                            }}
                          >
                            {s.status === 'IN_TRANSIT' ? '● Đang vận chuyển' : '✓ Hoàn tất'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#10b981' }}>
                          -{s.co2SavedKg} kg CO2e ({s.co2ReductionPct}%)
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          marginBottom: 4
                        }}
                      >
                        {s.originName} → {s.destinationName}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.76rem',
                          opacity: 0.75,
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <span>
                          {s.vehicleType} • Biển số: <strong>{s.licensePlate}</strong>
                        </span>
                        <span>
                          Tải trọng: <strong>{s.cargoWeightTons} tấn</strong> • {s.distanceKm} km
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Shipment Telemetry & Corridor Map Inspector */}
            {activeShipment && (
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: isDark ? 'rgba(12, 26, 21, 0.94)' : '#ffffff',
                  border: '1px solid rgba(16, 185, 129, 0.28)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 10
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#10b981',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      GIÁM SÁT HÀNH TRÌNH TRỰC TUYẾN • {activeShipment.shipmentCode}
                    </span>
                    <h3 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '4px 0' }}>
                      {activeShipment.originName} → {activeShipment.destinationName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: 0 }}>
                      {activeShipment.statusLabel} • Vị trí hiện tại:{' '}
                      <strong>{activeShipment.currentLocation}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadCertificate(activeShipment)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: '#10b981',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} /> Chứng nhận ISO 14083
                  </button>
                </div>

                {/* Stylized Live Corridor Map SVG */}
                <div
                  style={{
                    borderRadius: 16,
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    color: '#f8fafc',
                    marginBottom: 18
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                      color: '#a7f3d0',
                      marginBottom: 10
                    }}
                  >
                    <span>HÀNH LANG AN TOÀN POSTGIS: {activeShipment.corridorState}</span>
                    <span>TIẾN ĐỘ: {activeShipment.progress}%</span>
                  </div>

                  <svg
                    viewBox="0 0 500 110"
                    style={{ width: '100%', height: 96, display: 'block' }}
                  >
                    {/* Safe buffer corridor */}
                    <path
                      d="M 40 75 Q 180 20, 260 55 T 460 35"
                      fill="none"
                      stroke="rgba(16, 185, 129, 0.18)"
                      strokeWidth="22"
                      strokeLinecap="round"
                    />
                    {/* Planned green route */}
                    <path
                      d="M 40 75 Q 180 20, 260 55 T 460 35"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                    />
                    {/* Origin Node */}
                    <circle cx="40" cy="75" r="7" fill="#38bdf8" />
                    <text x="28" y="98" fill="#cbd5e1" fontSize="11" fontWeight="700">
                      Điểm đi
                    </text>

                    {/* Active Vehicle Node */}
                    <circle
                      cx={40 + (420 * activeShipment.progress) / 100}
                      cy={activeShipment.progress > 50 ? 44 : 52}
                      r="9"
                      fill="#34d399"
                      stroke="#042f2e"
                      strokeWidth="2.5"
                    />
                    <text
                      x={Math.min(390, Math.max(40, 20 + (420 * activeShipment.progress) / 100))}
                      y="24"
                      fill="#fef08a"
                      fontSize="11"
                      fontWeight="800"
                    >
                      {activeShipment.licensePlate} ({activeShipment.speedKmh} km/h)
                    </text>

                    {/* Destination Node */}
                    <circle cx="460" cy="35" r="7" fill="#fef08a" />
                    <text x="425" y="60" fill="#cbd5e1" fontSize="11" fontWeight="700">
                      Điểm đến
                    </text>
                  </svg>
                </div>

                {/* 4 Live Telemetry Gauges */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 12,
                    marginBottom: 18
                  }}
                >
                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.16)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Gauge size={13} color="#38bdf8" /> Vận tốc GPS
                    </div>
                    <strong style={{ fontSize: '1.15rem' }}>
                      <CountingNumber
                        value={activeShipment.speedKmh}
                        startOnView={false}
                        liveStep={activeShipment.speedKmh > 0 ? 0.2 : 0}
                        decimals={1}
                        liveIntervalMs={3000}
                      />{' '}
                      km/h
                    </strong>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.16)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Clock size={13} color="#f59e0b" /> Dự kiến đến (ETA)
                    </div>
                    <strong style={{ fontSize: '1.15rem' }}>
                      {activeShipment.etaMinutes > 0 ? (
                        <>
                          <CountingNumber value={activeShipment.etaMinutes} startOnView={false} />{' '}
                          phút
                        </>
                      ) : (
                        'Đã đến nơi'
                      )}
                    </strong>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.16)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Thermometer size={13} color="#34d399" /> Nhiệt độ thùng
                    </div>
                    <strong style={{ fontSize: '1.15rem' }}>
                      <CountingNumber
                        value={activeShipment.temperatureC}
                        decimals={1}
                        startOnView={false}
                      />
                      °C
                    </strong>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Leaf size={13} /> CO2e Tiết kiệm
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>
                      -
                      <CountingNumber
                        value={activeShipment.co2SavedKg}
                        decimals={1}
                        startOnView={false}
                      />{' '}
                      kg
                    </strong>
                  </motion.div>
                </div>

                {/* Carbon Comparison Bar */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.22)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      fontWeight: 700
                    }}
                  >
                    <span>Đối chứng phát thải GLEC v3 (Well-to-Wheel)</span>
                    <span style={{ color: '#10b981' }}>
                      Giảm {activeShipment.co2ReductionPct}% phát thải
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      opacity: 0.85
                    }}
                  >
                    <span>Mốc Diesel thông thường: {activeShipment.baselineCo2Kg} kg CO2e</span>
                    <span>
                      Thực tế lộ trình xanh: <strong>{activeShipment.actualCo2Kg} kg CO2e</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOK GREEN SHIPMENT */}
        {activeTab === 'booking' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 24,
              alignItems: 'start'
            }}
          >
            <div
              style={{
                padding: 26,
                borderRadius: 20,
                background: isDark ? 'rgba(12, 26, 21, 0.92)' : '#ffffff',
                border: isDark
                  ? '1px solid rgba(110, 231, 183, 0.2)'
                  : '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
                Đặt Lịch Vận Chuyển Xanh &amp; Yêu Cầu Điều Xe
              </h2>
              <p style={{ fontSize: '0.84rem', opacity: 0.76, marginBottom: 20 }}>
                Hệ thống tự động tính toán lộ trình tối ưu đa tiêu chí Pareto (UC05) và cấp chứng
                nhận dự toán CO2e theo chuẩn ISO 14083 ngay khi tạo đơn.
              </p>

              <form onSubmit={handleCreateShipment}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                    marginBottom: 14
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Điểm lấy hàng (Cảng / ICD / KCN) *
                    </label>
                    <select
                      value={bookingForm.originId}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, originId: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        color: 'inherit',
                        fontSize: '0.86rem'
                      }}
                    >
                      {MAP_NODES.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label} ({n.area})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Điểm giao hàng (KCN / Kho đích) *
                    </label>
                    <select
                      value={bookingForm.destinationId}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, destinationId: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        color: 'inherit',
                        fontSize: '0.86rem'
                      }}
                    >
                      {MAP_NODES.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label} ({n.area})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                    marginBottom: 14
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Nhóm hàng hóa vận chuyển
                    </label>
                    <select
                      value={bookingForm.cargoType}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, cargoType: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        color: 'inherit',
                        fontSize: '0.86rem'
                      }}
                    >
                      <option>Chuỗi lạnh tiêu chuẩn (-18°C)</option>
                      <option>Linh kiện điện tử giá trị cao</option>
                      <option>Hàng tiêu dùng nhanh (FMCG)</option>
                      <option>Container xuất nhập khẩu tiêu chuẩn</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Khối lượng hàng ({bookingForm.cargoWeightTons} tấn)
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="36"
                      step="0.5"
                      value={bookingForm.cargoWeightTons}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, cargoWeightTons: e.target.value }))
                      }
                      style={{ width: '100%', accentColor: '#10b981', marginTop: 8 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      marginBottom: 6
                    }}
                  >
                    Cấu hình Đội xe Xanh ưu tiên
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {POWERTRAINS.slice(0, 2).map((pt) => {
                      const active = bookingForm.powertrainId === pt.id;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() =>
                            setBookingForm((prev) => ({ ...prev, powertrainId: pt.id }))
                          }
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: active
                              ? '1.5px solid #10b981'
                              : '1px solid rgba(148, 163, 184, 0.25)',
                            background: active ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                            color: 'inherit',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#10b981' }}>
                            {pt.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', opacity: 0.78, marginTop: 2 }}>
                            {pt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                    marginBottom: 18
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Ngày lấy hàng dự kiến
                    </label>
                    <input
                      type="date"
                      value={bookingForm.pickupDate}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, pickupDate: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        color: 'inherit',
                        fontSize: '0.86rem'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Giờ xuất bến
                    </label>
                    <input
                      type="time"
                      value={bookingForm.pickupTime}
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, pickupTime: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        color: 'inherit',
                        fontSize: '0.86rem'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lp-btn lp-btn--primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={17} /> Xác Nhận Đặt Lịch Vận Chuyển Xanh{' '}
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>

            {/* Right: Instant Green Routing & Carbon Quote Preview */}
            <div
              style={{
                padding: 26,
                borderRadius: 20,
                background: 'linear-gradient(145deg, #042f2e 0%, #091e1a 100%)',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                color: '#f8fafc'
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#6ee7b7',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                DỰ TOÁN LỘ TRÌNH XANH &amp; CARBON (UC05 • GLEC V3)
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 16px' }}>
                {bookingQuote.originNode.label} → {bookingQuote.destNode.label}
              </h3>

              <div
                style={{
                  padding: 18,
                  borderRadius: 16,
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(110, 231, 183, 0.3)',
                  marginBottom: 18
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
                  Lượng phát thải CO2e cắt giảm dự kiến
                </div>
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: '#6ee7b7',
                    lineHeight: 1.15,
                    margin: '4px 0'
                  }}
                >
                  -
                  <CountingNumber
                    value={bookingQuote.savedCo2Kg}
                    decimals={1}
                    startOnView={false}
                  />{' '}
                  kg CO2e{' '}
                  <span style={{ fontSize: '1rem', color: '#fef08a' }}>
                    (-
                    <CountingNumber
                      value={bookingQuote.reductionPct}
                      decimals={1}
                      startOnView={false}
                    />
                    %)
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                  So với xe Diesel tiêu chuẩn (
                  <CountingNumber
                    value={bookingQuote.baselineCo2Kg}
                    decimals={1}
                    startOnView={false}
                  />{' '}
                  kg CO2e xuống còn{' '}
                  <CountingNumber
                    value={bookingQuote.actualCo2Kg}
                    decimals={1}
                    startOnView={false}
                  />{' '}
                  kg CO2e)
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, fontSize: '0.85rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Cự ly hành lang tối ưu Pareto</span>
                  <strong>
                    <CountingNumber
                      value={bookingQuote.distanceKm}
                      decimals={1}
                      startOnView={false}
                    />{' '}
                    km
                  </strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Thời gian hành trình dự kiến</span>
                  <strong>
                    <CountingNumber value={bookingQuote.etaMinutes} startOnView={false} /> phút
                  </strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Phương tiện đề xuất</span>
                  <strong style={{ color: '#6ee7b7' }}>{bookingQuote.powertrain.name}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Chuẩn chứng nhận sau chuyến</span>
                  <strong>ISO 14083 • ePOD SHA-256</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CARBON LEDGER & CERTIFICATES */}
        {activeTab === 'carbon' && (
          <div
            style={{
              padding: 24,
              borderRadius: 20,
              background: isDark ? 'rgba(12, 26, 21, 0.92)' : '#ffffff',
              border: isDark
                ? '1px solid rgba(110, 231, 183, 0.18)'
                : '1px solid rgba(15, 23, 42, 0.08)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Sổ Cái Kiểm Toán Phát Thải Scope 3 &amp; Chứng Nhận Số ePOD (ISO 14083)
                </h2>
                <p style={{ fontSize: '0.82rem', opacity: 0.75, margin: 0 }}>
                  Mỗi chuyến hàng hoàn tất hoặc đang vận hành đều được băm xác thực SHA-256 phục vụ
                  báo cáo phát triển bền vững ESG và xuất khẩu EU CBAM.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)'
                    }}
                  >
                    <th style={{ padding: '12px 10px' }}>Mã Vận Đơn</th>
                    <th style={{ padding: '12px 10px' }}>Hành Lang Vận Tải</th>
                    <th style={{ padding: '12px 10px' }}>Phương Tiện Xanh</th>
                    <th style={{ padding: '12px 10px' }}>Mốc Diesel</th>
                    <th style={{ padding: '12px 10px' }}>Thực Tế WTW</th>
                    <th style={{ padding: '12px 10px' }}>CO2e Đã Tránh</th>
                    <th style={{ padding: '12px 10px' }}>Chứng Nhận ISO 14083</th>
                  </tr>
                </thead>
                <tbody>
                  {customerShipments.map((s) => (
                    <tr
                      key={s.shipmentCode}
                      style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#10b981' }}>
                        {s.shipmentCode}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {s.originName} → {s.destinationName}
                      </td>
                      <td style={{ padding: '12px 10px' }}>{s.vehicleType}</td>
                      <td style={{ padding: '12px 10px' }}>{s.baselineCo2Kg} kg</td>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>{s.actualCo2Kg} kg</td>
                      <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: 800 }}>
                        -{s.co2SavedKg} kg (-{s.co2ReductionPct}%)
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCertificate(s)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Xem Chứng Chỉ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCertificate(s)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Download size={12} /> Tải JSON
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCertificate && (
              <div
                style={{
                  marginTop: 22,
                  padding: 22,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)',
                  border: '1.5px solid #10b981',
                  color: '#f8fafc'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}
                >
                  <span style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '0.78rem' }}>
                    CHỨNG NHẬN KIỂM KÊ KHÍ NHÀ KÍNH ISO 14083:2023 &amp; GLEC V3
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCertificate(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 800
                    }}
                  >
                    Đóng ✕
                  </button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                    fontSize: '0.83rem'
                  }}
                >
                  <div>
                    <div style={{ color: '#94a3b8' }}>Chủ hàng thụ hưởng:</div>
                    <strong>{selectedCertificate.customerName}</strong>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Mã vận đơn &amp; Tuyến:</div>
                    <strong>
                      {selectedCertificate.shipmentCode} ({selectedCertificate.distanceKm} km)
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Lượng CO2e cắt giảm được chứng nhận:</div>
                    <strong style={{ color: '#34d399' }}>
                      -{selectedCertificate.co2SavedKg} kg CO2e (-
                      {selectedCertificate.co2ReductionPct}%)
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Mã băm xác thực bất biến (SHA-256):</div>
                    <code style={{ color: '#38bdf8', fontSize: '0.75rem' }}>
                      {selectedCertificate.certificateHash}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COMPANY PROFILE & ALERT SETTINGS */}
        {activeTab === 'profile' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 24
            }}
          >
            <div
              style={{
                padding: 24,
                borderRadius: 20,
                background: isDark ? 'rgba(12, 26, 21, 0.92)' : '#ffffff',
                border: isDark
                  ? '1px solid rgba(110, 231, 183, 0.18)'
                  : '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <h2
                style={{
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <UserCheck size={19} color="#10b981" /> Hồ Sơ Tài Khoản Doanh Nghiệp B2B
              </h2>

              <div style={{ display: 'grid', gap: 12, fontSize: '0.86rem' }}>
                {[
                  { label: 'Người đại diện', value: user?.fullName || 'Đại Diện Chủ Hàng' },
                  {
                    label: 'Tên doanh nghiệp',
                    value: user?.companyName || 'Công ty CP Sữa Việt Nam (Vinamilk)'
                  },
                  {
                    label: 'Mã định danh Đối tác (BRULE-16)',
                    value: user?.customerId || 'VINAMILK'
                  },
                  { label: 'Tài khoản đăng nhập', value: `@${user?.username || 'shipper'}` },
                  {
                    label: 'Email nhận chứng từ ESG',
                    value: user?.email || 'logistics@vinamilk.com.vn'
                  },
                  { label: 'Số điện thoại điều phối', value: user?.phone || '028 5415 5555' },
                  { label: 'Phân vùng bảo mật', value: 'Cổng Khách Hàng Độc Lập (Customer Portal)' }
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: 10,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.14)'
                    }}
                  >
                    <span style={{ opacity: 0.72 }}>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: 24,
                borderRadius: 20,
                background: isDark ? 'rgba(12, 26, 21, 0.92)' : '#ffffff',
                border: isDark
                  ? '1px solid rgba(110, 231, 183, 0.18)'
                  : '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <h2
                style={{
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Bell size={19} color="#38bdf8" /> Cấu Hình Nhận Cảnh Báo &amp; Chứng Từ Tự Động
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  {
                    key: 'deviationAlert',
                    title: 'Cảnh báo khi phương tiện lệch hành lang an toàn (> 200m)',
                    desc: 'Nhận thông báo tức thì khi xe chở hàng của doanh nghiệp có dấu hiệu lệch lộ trình hoặc gặp ùn tắc nghiêm trọng.'
                  },
                  {
                    key: 'etaArrivalAlert',
                    title: 'Thông báo trước 15 phút khi xe sắp cập cảng / kho đích',
                    desc: 'Giúp bộ phận kho bãi chủ động bố trí cầu nâng và nhân sự bốc dỡ.'
                  },
                  {
                    key: 'autoEpodEmail',
                    title: 'Tự động gửi biên bản ePOD & chứng nhận CO2e ISO 14083 qua Email',
                    desc: 'Gửi ngay sau khi tài xế hoàn tất bàn giao lô hàng.'
                  },
                  {
                    key: 'monthlyEsgDigest',
                    title: 'Báo cáo tổng hợp phát thải Scope 3 định kỳ hàng tháng',
                    desc: 'Tổng hợp dữ liệu phục vụ kiểm toán ESG và khai báo hải quan xanh CBAM.'
                  }
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(15, 23, 42, 0.55)' : '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifPrefs[item.key]}
                      onChange={(e) =>
                        setNotifPrefs((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      style={{ marginTop: 4, accentColor: '#10b981' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.86rem', marginBottom: 2 }}>
                        {item.title}
                      </strong>
                      <span style={{ fontSize: '0.76rem', opacity: 0.75 }}>{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
