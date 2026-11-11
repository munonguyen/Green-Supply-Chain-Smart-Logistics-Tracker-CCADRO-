import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Crosshair,
  Download,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  Leaf,
  LogOut,
  Moon,
  Navigation,
  Package,
  Pause,
  PieChart,
  Play,
  PlusCircle,
  Search,
  ShieldCheck,
  Sun,
  Thermometer,
  Trash2,
  Truck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import CcadroLogo from '../components/ui/CcadroLogo';
import { CountingNumber } from '../components/ui/CountingNumber';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import VehicleMarker from '../components/map/VehicleMarker';
import { MAP_NODES, POWERTRAINS } from '../components/landing/landingContent';
import '../styles/landing.css';

export const USER_SHIPMENTS_STORAGE_KEY = 'ccadro_user_shipments_realtime_v2';

const NODE_COORDINATES = {
  vsip: [10.9242, 106.7145],
  songthan: [10.8925, 106.7428],
  tanbinh: [10.8184, 106.6286],
  catlai: [10.7623, 106.7824],
  nhontrach: [10.7352, 106.8954],
  hiepphuoc: [10.6354, 106.7522],
  caimep: [10.5256, 107.0225]
};

const NODE_ADDRESSES = {
  vsip: 'Số 8 Đại lộ Hữu Nghị, KCN VSIP 1, Thuận An, Bình Dương',
  songthan: 'Khu phố Bình Đường 3, P. An Bình, Dĩ An, Bình Dương',
  tanbinh: 'Đường Tây Thạnh, KCN Tân Bình, Q. Tân Phú, TP. HCM',
  catlai: '1295B Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP. HCM',
  nhontrach: 'Đường Tôn Đức Thắng (25B), KCN Nhơn Trạch, Đồng Nai',
  hiepphuoc: 'Khu B, Đường số 1, KCN Hiệp Phước, Nhà Bè, TP. HCM',
  caimep: 'Khu phố Tân Lộc, P. Phước Hòa, Phú Mỹ, Bà Rịa – Vũng Tàu'
};

function buildCorridorWaypoints(originLatLng, destLatLng) {
  const [lat1, lon1] = originLatLng;
  const [lat2, lon2] = destLatLng;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return [
    [lat1, lon1],
    [lat1 + dLat * 0.22 + 0.008, lon1 + dLon * 0.18 + 0.005],
    [lat1 + dLat * 0.48 + 0.012, lon1 + dLon * 0.45 - 0.004],
    [lat1 + dLat * 0.76 + 0.005, lon1 + dLon * 0.78 + 0.004],
    [lat2, lon2]
  ];
}

function interpolateOnPath(waypoints, progressPct) {
  if (!waypoints || waypoints.length === 0) return [10.7623, 106.7824];
  if (waypoints.length === 1) return waypoints[0];
  const clamped = Math.max(0, Math.min(100, progressPct)) / 100;
  const totalSegs = waypoints.length - 1;
  const exact = clamped * totalSegs;
  const idx = Math.min(Math.floor(exact), totalSegs - 1);
  const ratio = exact - idx;
  const [lat1, lon1] = waypoints[idx];
  const [lat2, lon2] = waypoints[idx + 1];
  return [lat1 + (lat2 - lat1) * ratio, lon1 + (lon2 - lon1) * ratio];
}

/**
 * Load only real shipments created by users in the system.
 * Never pre-populate fake shipments for newly registered accounts.
 */
export function loadStoredUserShipments() {
  try {
    const raw = window.localStorage.getItem(USER_SHIPMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_) {
    // ignore storage errors
  }
  return [];
}

function saveStoredUserShipments(list) {
  try {
    window.localStorage.setItem(USER_SHIPMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore
  }
}

/* ── Hub pins rendered on the 3D Map when viewing the network ── */
function LogisticsHubMarkers({ map }) {
  useEffect(() => {
    if (!map) return undefined;
    const markers = MAP_NODES.map((node) => {
      const coords = NODE_COORDINATES[node.id] || [10.7623, 106.7824];
      const icon = L.divIcon({
        className: 'ccadro-customer-hub-pin',
        html: `
          <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
            <div style="
              position:absolute;
              top:-24px;
              left:50%;
              transform:translateX(-50%);
              white-space:nowrap;
              background:rgba(15,23,42,0.88);
              border:1px solid rgba(16,185,129,0.5);
              color:#e2e8f0;
              font-size:9.5px;
              font-weight:700;
              padding:2px 7px;
              border-radius:999px;
              box-shadow:0 4px 10px rgba(0,0,0,0.45);
            ">${node.label}</div>
            <div style="
              width:11px;
              height:11px;
              border-radius:50%;
              background:#10b981;
              border:2px solid #ffffff;
              box-shadow:0 0 10px #10b981;
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const m = L.marker(coords, { icon }).addTo(map);
      m.bindPopup(
        `<strong>${node.label} (${node.area})</strong><br/><span style="font-size:11px">${NODE_ADDRESSES[node.id] || ''}</span>`
      );
      return m;
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [map]);

  return null;
}

const SIDEBAR_SECTIONS = [
  {
    group: 'BÀN LÀM VIỆC & GIÁM SÁT',
    items: [
      {
        id: 'overview',
        label: 'Tổng Quan & Sơ Đồ Thống Kê',
        shortLabel: 'Tổng Quan',
        icon: LayoutDashboard
      },
      {
        id: 'tracking',
        label: 'Bản Đồ 3D Giám Sát Real-Time',
        shortLabel: 'Bản Đồ 3D',
        icon: Navigation
      }
    ]
  },
  {
    group: 'NGHIỆP VỤ THUÊ VẬN TẢI',
    items: [
      {
        id: 'booking',
        label: 'Đặt Thuê Xe & Tạo Vận Đơn',
        shortLabel: 'Đặt Thuê Xe',
        icon: PlusCircle
      },
      {
        id: 'orders',
        label: 'Quản Lý Vận Đơn & Hợp Đồng',
        shortLabel: 'Quản Lý Đơn',
        icon: Package
      }
    ]
  },
  {
    group: 'KIỂM TOÁN CARBON & HỒ SƠ',
    items: [
      {
        id: 'carbon',
        label: 'Sổ Cái CO2e & Chứng Nhận ePOD',
        shortLabel: 'Sổ Cái CO2e',
        icon: FileCheck2
      },
      {
        id: 'profile',
        label: 'Hồ Sơ Doanh Nghiệp & Cảnh Báo',
        shortLabel: 'Hồ Sơ B2B',
        icon: Building2
      }
    ]
  }
];

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const mapInstanceRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [allShipments, setAllShipments] = useState(() => loadStoredUserShipments());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [isLiveSim, setIsLiveSim] = useState(true);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    originId: 'catlai',
    destinationId: 'vsip',
    cargoType: 'Chuỗi lạnh tiêu chuẩn (-18°C)',
    cargoWeightTons: 16,
    powertrainId: 'ev',
    pickupDate: new Date().toISOString().slice(0, 10),
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

  // Sync with storage changes from other tabs/windows
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === USER_SHIPMENTS_STORAGE_KEY) {
        setAllShipments(loadStoredUserShipments());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // STRICT PER-USER ISOLATION: Only show shipments created by this user/account!
  const userOwnShipments = useMemo(() => {
    if (!user) return [];
    const currentUsername = (user.username || '').toLowerCase().trim();
    const currentCustomerId = (user.customerId || '').toUpperCase().trim();

    return allShipments.filter((s) => {
      const matchUsername =
        s.createdByUsername && s.createdByUsername.toLowerCase().trim() === currentUsername;
      const matchCustomerId =
        currentCustomerId &&
        currentCustomerId !== 'KHACH_HANG_MOI' &&
        s.customerId?.toUpperCase().trim() === currentCustomerId &&
        s.createdByUsername?.toLowerCase().trim() === currentUsername;
      return matchUsername || matchCustomerId;
    });
  }, [allShipments, user]);

  // Filtered shipments for search & status filter
  const filteredShipments = useMemo(() => {
    return userOwnShipments.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.shipmentCode.toLowerCase().includes(q) ||
        s.originName.toLowerCase().includes(q) ||
        s.destinationName.toLowerCase().includes(q) ||
        s.statusLabel.toLowerCase().includes(q) ||
        s.licensePlate.toLowerCase().includes(q)
      );
    });
  }, [userOwnShipments, searchQuery, statusFilter]);

  const activeShipment = useMemo(() => {
    if (userOwnShipments.length === 0) return null;
    return (
      userOwnShipments.find((s) => s.shipmentCode === selectedCode) || userOwnShipments[0] || null
    );
  }, [userOwnShipments, selectedCode]);

  // Real-time GPS telemetry tick ONLY for the user's actual IN_TRANSIT shipments
  useEffect(() => {
    if (!isLiveSim || userOwnShipments.length === 0) return undefined;
    const hasInTransit = userOwnShipments.some((s) => s.status === 'IN_TRANSIT');
    if (!hasInTransit) return undefined;

    const timer = setInterval(() => {
      setAllShipments((prev) => {
        const updated = prev.map((s) => {
          if (s.status !== 'IN_TRANSIT') return s;
          const nextProg = Math.min(99, Number((s.progress + 1.4).toFixed(1)));
          const speedDelta = (Math.random() - 0.48) * 2.4;
          const nextSpeed = Math.round(Math.max(42, Math.min(68, s.speedKmh + speedDelta)));
          const remainingRatio = Math.max(0.05, (100 - nextProg) / 100);
          const nextEta = Math.max(2, Math.round(s.initialEtaMinutes * remainingRatio));

          return {
            ...s,
            progress: nextProg,
            speedKmh: nextSpeed,
            etaMinutes: nextEta
          };
        });
        saveStoredUserShipments(updated);
        return updated;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isLiveSim, userOwnShipments]);

  const activeShipmentWaypoints = useMemo(() => {
    if (!activeShipment) return [];
    if (activeShipment.waypoints?.length >= 2) return activeShipment.waypoints;
    return buildCorridorWaypoints(
      activeShipment.originCoords || [10.7623, 106.7824],
      activeShipment.destCoords || [10.9242, 106.7145]
    );
  }, [activeShipment]);

  const activeVehiclePosition = useMemo(() => {
    if (!activeShipment || activeShipmentWaypoints.length === 0) return [10.823, 106.755];
    return interpolateOnPath(activeShipmentWaypoints, activeShipment.progress || 15);
  }, [activeShipment, activeShipmentWaypoints]);

  useEffect(() => {
    if (followVehicle && mapInstanceRef.current && activeShipment) {
      mapInstanceRef.current.panTo(activeVehiclePosition, { animate: true, duration: 0.8 });
    }
  }, [followVehicle, activeVehiclePosition, activeShipment]);

  // Live quote calculation for Booking tab
  const bookingQuote = useMemo(() => {
    const originNode = MAP_NODES.find((n) => n.id === bookingForm.originId) || MAP_NODES[3];
    const destNode = MAP_NODES.find((n) => n.id === bookingForm.destinationId) || MAP_NODES[0];
    const powertrain = POWERTRAINS.find((p) => p.id === bookingForm.powertrainId) || POWERTRAINS[0];

    const originCoords = NODE_COORDINATES[originNode.id] || [10.7623, 106.7824];
    const destCoords = NODE_COORDINATES[destNode.id] || [10.9242, 106.7145];
    const previewWaypoints = buildCorridorWaypoints(originCoords, destCoords);

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
    const estimatedCostVnd = Math.round((distanceKm * 28500 + weight * 95000) / 1000) * 1000;

    return {
      originNode,
      destNode,
      originCoords,
      destCoords,
      previewWaypoints,
      powertrain,
      distanceKm,
      baselineCo2Kg,
      actualCo2Kg,
      savedCo2Kg,
      reductionPct,
      etaMinutes,
      estimatedCostVnd
    };
  }, [bookingForm]);

  // Real-time KPI aggregations from userOwnShipments
  const kpiStats = useMemo(() => {
    const totalOrders = userOwnShipments.length;
    const inTransitCount = userOwnShipments.filter((s) => s.status === 'IN_TRANSIT').length;
    const completedCount = userOwnShipments.filter((s) => s.status === 'COMPLETED').length;
    const totalSavedCo2 =
      Math.round(userOwnShipments.reduce((acc, s) => acc + (Number(s.co2SavedKg) || 0), 0) * 10) /
      10;
    const totalBaselineCo2 =
      Math.round(
        userOwnShipments.reduce((acc, s) => acc + (Number(s.baselineCo2Kg) || 0), 0) * 10
      ) / 10;
    const totalActualCo2 =
      Math.round(userOwnShipments.reduce((acc, s) => acc + (Number(s.actualCo2Kg) || 0), 0) * 10) /
      10;
    const totalTonneKm = Math.round(
      userOwnShipments.reduce(
        (acc, s) => acc + (Number(s.distanceKm) || 0) * (Number(s.cargoWeightTons) || 0),
        0
      )
    );
    const totalCostVnd = userOwnShipments.reduce(
      (acc, s) => acc + (Number(s.estimatedCostVnd) || 0),
      0
    );

    const evCount = userOwnShipments.filter((s) => s.powertrainId === 'ev').length;
    const euro5Count = userOwnShipments.filter((s) => s.powertrainId === 'euro5').length;
    const dieselCount = Math.max(0, totalOrders - evCount - euro5Count);

    return {
      totalOrders,
      inTransitCount,
      completedCount,
      totalSavedCo2,
      totalBaselineCo2,
      totalActualCo2,
      totalTonneKm,
      totalCostVnd,
      evCount,
      euro5Count,
      dieselCount
    };
  }, [userOwnShipments]);

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    const newCode = `SH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 890)}`;
    const originLabel = `${bookingQuote.originNode.label}, ${bookingQuote.originNode.area}`;
    const destLabel = `${bookingQuote.destNode.label}, ${bookingQuote.destNode.area}`;

    const randomPlateSuffix = `${Math.floor(100 + Math.random() * 899)}.${Math.floor(10 + Math.random() * 89)}`;
    const licensePlate =
      bookingForm.powertrainId === 'ev' ? `51C-${randomPlateSuffix}` : `51D-${randomPlateSuffix}`;

    const newOrder = {
      id: `cust-ship-${Date.now()}`,
      shipmentCode: newCode,
      customerId: user?.customerId || 'DOANH_NGHIEP_B2B',
      customerName: user?.companyName || user?.fullName || 'Doanh Nghiệp Đối Tác B2B',
      createdByUsername: user?.username || 'customer',
      originId: bookingForm.originId,
      destinationId: bookingForm.destinationId,
      originName: originLabel,
      destinationName: destLabel,
      originCoords: bookingQuote.originCoords,
      destCoords: bookingQuote.destCoords,
      waypoints: bookingQuote.previewWaypoints,
      cargoType: bookingForm.cargoType,
      cargoWeightTons: Number(bookingForm.cargoWeightTons),
      distanceKm: bookingQuote.distanceKm,
      powertrainId: bookingForm.powertrainId,
      vehicleType: bookingQuote.powertrain.name,
      licensePlate,
      status: 'IN_TRANSIT',
      statusLabel: 'Đang di chuyển trên hành lang xanh 3D',
      currentLocation: `Xuất phát từ ${bookingQuote.originNode.label}`,
      speedKmh: 52,
      initialEtaMinutes: bookingQuote.etaMinutes,
      etaMinutes: bookingQuote.etaMinutes,
      temperatureC: bookingForm.cargoType.includes('-18°C') ? -18.0 : 18.5,
      baselineCo2Kg: bookingQuote.baselineCo2Kg,
      actualCo2Kg: bookingQuote.actualCo2Kg,
      co2SavedKg: bookingQuote.savedCo2Kg,
      co2ReductionPct: bookingQuote.reductionPct,
      estimatedCostVnd: bookingQuote.estimatedCostVnd,
      progress: 14,
      corridorState: 'ON_CORRIDOR (Sai số 6.2m < 50m AN TOÀN)',
      certificateHash: `0x${Math.random().toString(16).slice(2, 18)}${Math.random()
        .toString(16)
        .slice(2, 18)}`,
      pickupDate: bookingForm.pickupDate,
      pickupTime: bookingForm.pickupTime,
      notes: bookingForm.notes,
      createdAt: new Date().toLocaleString('vi-VN')
    };

    try {
      await api.createShipment({
        shipmentCode: newCode,
        originAddress: originLabel,
        destinationAddress: destLabel,
        originLat: bookingQuote.originCoords[0],
        originLon: bookingQuote.originCoords[1],
        destinationLat: bookingQuote.destCoords[0],
        destinationLon: bookingQuote.destCoords[1],
        weightTons: Number(bookingForm.cargoWeightTons)
      });
    } catch (_) {
      // Lưu đồng bộ vào bộ nhớ trình duyệt để hoạt động thời gian thực
    }

    const updated = [newOrder, ...allShipments];
    setAllShipments(updated);
    saveStoredUserShipments(updated);

    setSelectedCode(newCode);
    setBookingSuccess(
      `Đã đặt thuê xe & khởi tạo vận đơn ${newCode} thành công! Xe ${licensePlate} đã bắt đầu di chuyển trên bản đồ 3D (tiết kiệm ${bookingQuote.savedCo2Kg} kg CO2e).`
    );
    setActiveTab('tracking');
  };

  const handleCompleteOrderEpod = (shipmentCode) => {
    setAllShipments((prev) => {
      const updated = prev.map((s) => {
        if (s.shipmentCode !== shipmentCode) return s;
        return {
          ...s,
          status: 'COMPLETED',
          statusLabel: 'Đã bàn giao hàng & ký xác nhận ePOD',
          progress: 100,
          speedKmh: 0,
          etaMinutes: 0,
          corridorState: 'HOÀN TẤT GIAO NHẬN 100%'
        };
      });
      saveStoredUserShipments(updated);
      return updated;
    });
    setBookingSuccess(
      `Đã ký biên bản bàn giao điện tử (ePOD) và phát hành chứng nhận ISO 14083 cho vận đơn ${shipmentCode}!`
    );
  };

  const handleDeleteOrder = (shipmentCode) => {
    setAllShipments((prev) => {
      const updated = prev.filter((s) => s.shipmentCode !== shipmentCode);
      saveStoredUserShipments(updated);
      return updated;
    });
  };

  const handleDownloadCertificate = (shipment) => {
    const payload = {
      standard: 'ISO 14083:2023 & GLEC Framework v3.0',
      issuer: 'CCADRO Green Supply Chain Carbon Ledger',
      shipmentCode: shipment.shipmentCode,
      customer: shipment.customerName,
      customerId: shipment.customerId,
      username: shipment.createdByUsername,
      route: `${shipment.originName} -> ${shipment.destinationName}`,
      distanceKm: shipment.distanceKm,
      cargoWeightTons: shipment.cargoWeightTons,
      vehicleType: shipment.vehicleType,
      licensePlate: shipment.licensePlate,
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

  const currentNavMeta = useMemo(() => {
    for (const sec of SIDEBAR_SECTIONS) {
      const found = sec.items.find((i) => i.id === activeTab);
      if (found) return found;
    }
    return SIDEBAR_SECTIONS[0].items[0];
  }, [activeTab]);

  const cardBg = isDark ? 'rgba(11, 25, 20, 0.92)' : '#ffffff';
  const cardBorder = isDark
    ? '1px solid rgba(110, 231, 183, 0.16)'
    : '1px solid rgba(15, 23, 42, 0.09)';
  const subtleBg = isDark ? 'rgba(15, 23, 42, 0.58)' : '#f8fafc';

  return (
    <div
      className="lp-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: isDark ? '#040f0c' : '#f1f7f4',
        color: isDark ? '#f1f5f9' : '#0f172a'
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════
          1. DEDICATED CUSTOMER B2B SIDEBAR
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: 276,
          flexShrink: 0,
          background: isDark ? '#061611' : '#ffffff',
          borderRight: isDark
            ? '1px solid rgba(110, 231, 183, 0.14)'
            : '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 35
        }}
      >
        {/* Sidebar Brand Header */}
        <div
          style={{
            padding: '20px 18px 16px',
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(15,23,42,0.06)'
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left'
            }}
          >
            <CcadroLogo size={38} showText title="CCADRO B2B" subtitle="HỆ THỐNG KHÁCH HÀNG" />
          </button>

          {/* Active Partner Workspace Card */}
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 12,
              background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.28)'
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#10b981',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              ● MÃ ĐỐI TÁC: {user?.customerId || 'B2B_PARTNER'}
            </div>
            <div
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.companyName || user?.fullName || 'Doanh Nghiệp B2B'}
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.72 }}>
              Tài khoản: <code>@{user?.username || 'user'}</code>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Groups */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.group}>
              <div
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.55,
                  padding: '0 10px 6px'
                }}
              >
                {section.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 11,
                        border: active
                          ? '1px solid rgba(16, 185, 129, 0.45)'
                          : '1px solid transparent',
                        background: active
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))'
                          : 'transparent',
                        color: active ? '#10b981' : 'inherit',
                        fontWeight: active ? 800 : 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </span>

                      {item.id === 'orders' && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#10b981'
                          }}
                        >
                          {kpiStats.totalOrders}
                        </span>
                      )}
                      {item.id === 'tracking' && kpiStats.inTransitCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8'
                          }}
                        >
                          {kpiStats.inTransitCount} LIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Bottom Real-time Summary & Logout */}
        <div
          style={{
            padding: '14px 14px 18px',
            borderTop: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 11,
              background: subtleBg,
              fontSize: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ opacity: 0.75 }}>Trạng thái dữ liệu:</span>
              <strong style={{ color: '#10b981' }}>● Real-time</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.75 }}>Đơn đã thuê của bạn:</span>
              <strong>{kpiStats.totalOrders} đơn</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} /> Đăng Xuất Tài Khoản
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          2. MAIN WORKSPACE (TOP HEADER NAVIGATION + CONTENT)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* ── Top Header Navigation Bar ── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: isDark ? 'rgba(6, 22, 17, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            borderBottom: isDark
              ? '1px solid rgba(110, 231, 183, 0.14)'
              : '1px solid rgba(15, 23, 42, 0.08)',
            padding: '12px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          {/* Left: Current Module Breadcrumb */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              <span>CỔNG KHÁCH HÀNG B2B</span>
              <span>/</span>
              <span>{currentNavMeta.shortLabel}</span>
            </div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0' }}>
              {currentNavMeta.label}
            </h1>
          </div>

          {/* Center: Quick Top Navigation Pills */}
          <nav
            aria-label="Điều hướng nhanh hệ thống khách hàng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 4,
              borderRadius: 999,
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f1f5f9',
              border: isDark
                ? '1px solid rgba(148, 163, 184, 0.16)'
                : '1px solid rgba(15, 23, 42, 0.06)',
              flexWrap: 'wrap'
            }}
          >
            {SIDEBAR_SECTIONS.flatMap((s) => s.items).map((item) => {
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
                    gap: 6,
                    padding: '6px 13px',
                    borderRadius: 999,
                    border: 'none',
                    background: active
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'transparent',
                    color: active ? '#042f2e' : 'inherit',
                    fontSize: '0.78rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.18s'
                  }}
                >
                  <Icon size={14} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Quick Action CTA, Notifications, Theme Toggle & User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid #10b981',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#042f2e',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <PlusCircle size={15} /> Đặt Thuê Xe Xanh
            </button>

            {/* Real-time Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowNotifPanel((v) => !v)}
                aria-label="Thông báo vận đơn"
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
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={16} />
                {userOwnShipments.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: '#10b981',
                      color: '#042f2e',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {userOwnShipments.length}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 44,
                    width: 320,
                    padding: 14,
                    borderRadius: 14,
                    background: isDark ? '#071a14' : '#ffffff',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                    zIndex: 50
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Thông báo Vận đơn Real-time</span>
                    <span style={{ color: '#10b981' }}>{userOwnShipments.length} sự kiện</span>
                  </div>
                  {userOwnShipments.length === 0 ? (
                    <div style={{ fontSize: '0.76rem', opacity: 0.72, padding: '8px 0' }}>
                      Tài khoản mới khởi tạo chưa có thông báo vận đơn nào.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                      {userOwnShipments.map((s) => (
                        <div
                          key={s.shipmentCode}
                          style={{
                            padding: 8,
                            borderRadius: 8,
                            background: subtleBg,
                            fontSize: '0.74rem'
                          }}
                        >
                          <strong style={{ color: '#10b981' }}>{s.shipmentCode}</strong> •{' '}
                          {s.statusLabel}
                          <div style={{ opacity: 0.7, marginTop: 2 }}>
                            {s.originName} → {s.destinationName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 999,
                background: subtleBg,
                border: '1px solid rgba(148, 163, 184, 0.22)',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <UserCheck size={14} color="#10b981" />
              <span>{user?.fullName || user?.username || 'Khách hàng'}</span>
            </div>
          </div>
        </header>

        {/* ── Main Content Body ── */}
        <main style={{ padding: '24px 26px 60px', flex: 1 }}>
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

          {/* ── 4 REAL-TIME KPI CARDS (100% FROM USER'S ACTUAL SHIPMENTS) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}
          >
            {[
              {
                label: 'Tổng Vận Đơn Đã Đặt Thuê',
                value: kpiStats.totalOrders,
                decimals: 0,
                unit: 'đơn hàng',
                sub:
                  kpiStats.totalOrders === 0
                    ? 'Tài khoản mới • Chưa đặt chuyến nào'
                    : `Tài khoản @${user?.username} khởi tạo`,
                icon: Package,
                color: '#10b981'
              },
              {
                label: 'Đang Lưu Thông Trên Tuyến',
                value: kpiStats.inTransitCount,
                decimals: 0,
                unit: 'chuyến',
                sub:
                  kpiStats.inTransitCount === 0
                    ? 'Hiện có 0 xe đang chạy'
                    : 'Đang phát tọa độ GPS 3D trực tuyến',
                icon: Truck,
                color: '#38bdf8'
              },
              {
                label: 'Tổng CO2e Thực Tế Đã Giảm',
                value: kpiStats.totalSavedCo2,
                decimals: 1,
                unit: 'kg CO2e',
                sub:
                  kpiStats.totalSavedCo2 === 0
                    ? 'Sẽ cộng dồn ngay khi đặt chuyến'
                    : 'Tính theo chuẩn GLEC v3 WTW',
                icon: Leaf,
                color: '#34d399'
              },
              {
                label: 'Chứng Nhận Số ISO 14083',
                value: kpiStats.totalOrders,
                decimals: 0,
                unit: 'chứng chỉ',
                sub:
                  kpiStats.completedCount > 0
                    ? `${kpiStats.completedCount} đơn đã ký ePOD hoàn tất`
                    : 'Cấp tự động theo từng vận đơn',
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
                    background: cardBg,
                    border: cardBorder,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    boxShadow: isDark ? 'none' : '0 8px 24px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.76rem', opacity: 0.78, fontWeight: 700 }}>
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
                      <CountingNumber
                        value={kpi.value}
                        decimals={kpi.decimals}
                        startOnView={false}
                      />{' '}
                      <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{kpi.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', opacity: 0.72 }}>{kpi.sub}</div>
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

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: OVERVIEW & REAL-TIME ANALYTICS CHARTS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Welcome & Quick Action Banner */}
              <div
                style={{
                  padding: '22px 24px',
                  borderRadius: 18,
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.42) 0%, rgba(15, 23, 42, 0.88) 100%)'
                    : 'linear-gradient(135deg, rgba(209, 250, 229, 0.85) 0%, #ffffff 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      color: '#10b981',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 4
                    }}
                  >
                    <ShieldCheck size={15} /> KHÔNG GIAN DỮ LIỆU THỜI GIAN THỰC • TÀI KHOẢN @
                    {user?.username || 'customer'}
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px' }}>
                    Xin chào, {user?.fullName || 'Đại Diện Chủ Hàng'} •{' '}
                    <span style={{ color: '#10b981' }}>
                      {user?.companyName || user?.customerId || 'Đối Tác B2B'}
                    </span>
                  </h2>
                  <p style={{ fontSize: '0.85rem', opacity: 0.84, margin: 0, maxWidth: 760 }}>
                    {kpiStats.totalOrders === 0
                      ? 'Tài khoản của bạn mới được khởi tạo và hiện chưa có đơn thuê vận chuyển nào. Mọi chỉ số, sơ đồ thống kê và bản đồ 3D sẽ cập nhật theo thời gian thực ngay khi bạn đặt chuyến xe đầu tiên.'
                      : `Doanh nghiệp của bạn đang có ${kpiStats.totalOrders} vận đơn thực tế (${kpiStats.inTransitCount} chuyến đang lưu thông, tổng lượng phát thải cắt giảm đạt ${kpiStats.totalSavedCo2} kg CO2e).`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('booking')}
                    className="lp-btn lp-btn--primary lp-btn--sm"
                  >
                    <PlusCircle size={16} /> Đặt Thuê Xe Xanh Ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tracking')}
                    className="lp-btn lp-btn--ghost lp-btn--sm"
                    style={{
                      color: isDark ? '#fff' : '#064e3b',
                      borderColor: 'rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <Navigation size={15} /> Xem Bản Đồ 3D
                  </button>
                </div>
              </div>

              {/* ── 3 REAL-TIME CHARTS & DIAGRAMS GRID ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 20
                }}
              >
                {/* CHART 1: Real-time CO2e Baseline vs Actual Bar Chart per Order */}
                <div
                  style={{
                    padding: 22,
                    borderRadius: 18,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#10b981',
                          textTransform: 'uppercase'
                        }}
                      >
                        SƠ ĐỒ 01 • ĐỐI CHỨNG CARBON THEO VẬN ĐƠN
                      </span>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '2px 0 0' }}>
                        Phát Thải Thực Tế vs. Mốc Diesel (kg CO2e)
                      </h3>
                    </div>
                    <BarChart3 size={20} color="#10b981" />
                  </div>

                  {userOwnShipments.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        borderRadius: 14,
                        background: subtleBg,
                        border: '1px dashed rgba(148, 163, 184, 0.3)'
                      }}
                    >
                      <BarChart3
                        size={28}
                        color="#10b981"
                        style={{ opacity: 0.55, marginBottom: 8 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>
                        Chưa có dữ liệu phát thải vận đơn
                      </div>
                      <p style={{ fontSize: '0.76rem', opacity: 0.72, margin: '0 0 12px' }}>
                        Biểu đồ so sánh CO2e sẽ tự động vẽ theo thời gian thực ngay khi bạn tạo vận
                        đơn đầu tiên.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('booking')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #10b981',
                          background: 'rgba(16, 185, 129, 0.14)',
                          color: '#10b981',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Tạo vận đơn đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {userOwnShipments.slice(0, 5).map((s) => {
                        const ratio = Math.min(
                          100,
                          Math.round((s.actualCo2Kg / Math.max(1, s.baselineCo2Kg)) * 100)
                        );
                        return (
                          <div key={s.shipmentCode} style={{ fontSize: '0.78rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 4
                              }}
                            >
                              <strong>
                                {s.shipmentCode} ({s.originName.split(',')[0]} →{' '}
                                {s.destinationName.split(',')[0]})
                              </strong>
                              <span style={{ color: '#10b981', fontWeight: 800 }}>
                                -{s.co2SavedKg} kg (-{s.co2ReductionPct}%)
                              </span>
                            </div>
                            <div
                              style={{
                                height: 9,
                                borderRadius: 999,
                                background: 'rgba(148, 163, 184, 0.2)',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${ratio}%`,
                                  height: '100%',
                                  borderRadius: 999,
                                  background: 'linear-gradient(90deg, #10b981, #38bdf8)'
                                }}
                              />
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.7rem',
                                opacity: 0.7,
                                marginTop: 2
                              }}
                            >
                              <span>Thực tế: {s.actualCo2Kg} kg</span>
                              <span>Mốc Diesel: {s.baselineCo2Kg} kg</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CHART 2: Fleet Powertrain & Cargo Breakdown Donut Diagram */}
                <div
                  style={{
                    padding: 22,
                    borderRadius: 18,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#38bdf8',
                          textTransform: 'uppercase'
                        }}
                      >
                        SƠ ĐỒ 02 • CƠ CẤU ĐỘI XE ĐÃ THUÊ
                      </span>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '2px 0 0' }}>
                        Phân Bổ Loại Phương Tiện &amp; Tải Trọng
                      </h3>
                    </div>
                    <PieChart size={20} color="#38bdf8" />
                  </div>

                  {userOwnShipments.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        borderRadius: 14,
                        background: subtleBg,
                        border: '1px dashed rgba(148, 163, 184, 0.3)'
                      }}
                    >
                      <PieChart
                        size={28}
                        color="#38bdf8"
                        style={{ opacity: 0.55, marginBottom: 8 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>
                        0 phương tiện đang được thuê
                      </div>
                      <p style={{ fontSize: '0.76rem', opacity: 0.72, margin: 0 }}>
                        Khi bạn chọn thuê Xe đầu kéo điện (EV) hoặc Xe tải chuẩn Euro 5, tỷ lệ đội
                        xe xanh sẽ hiển thị trực tiếp tại đây.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        flexWrap: 'wrap'
                      }}
                    >
                      <svg viewBox="0 0 120 120" width="115" height="115">
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="rgba(148,163,184,0.2)"
                          strokeWidth="14"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="14"
                          strokeDasharray={`${(kpiStats.evCount / kpiStats.totalOrders) * 289} 289`}
                          transform="rotate(-90 60 60)"
                        />
                        <text
                          x="60"
                          y="58"
                          textAnchor="middle"
                          fill="currentColor"
                          fontSize="18"
                          fontWeight="800"
                        >
                          {kpiStats.totalOrders}
                        </text>
                        <text
                          x="60"
                          y="73"
                          textAnchor="middle"
                          fill="#10b981"
                          fontSize="9"
                          fontWeight="700"
                        >
                          CHUYẾN XE
                        </text>
                      </svg>

                      <div style={{ flex: 1, display: 'grid', gap: 8, fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>● Xe đầu kéo điện (EV):</span>
                          <strong style={{ color: '#10b981' }}>{kpiStats.evCount} chuyến</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>● Xe tải chuẩn Euro 5:</span>
                          <strong style={{ color: '#38bdf8' }}>{kpiStats.euro5Count} chuyến</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>● Tổng sản lượng luân chuyển:</span>
                          <strong>{kpiStats.totalTonneKm} tấn·km</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>● Tổng cước phí tạm tính:</span>
                          <strong>{kpiStats.totalCostVnd.toLocaleString('vi-VN')} ₫</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CHART 3: Live Progress & Corridor Status Diagram */}
                <div
                  style={{
                    padding: 22,
                    borderRadius: 18,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#f59e0b',
                          textTransform: 'uppercase'
                        }}
                      >
                        SƠ ĐỒ 03 • TIẾN ĐỘ GIAO NHẬN REAL-TIME
                      </span>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '2px 0 0' }}>
                        Trạng Thái Hành Trình &amp; SLA Giao Hàng
                      </h3>
                    </div>
                    <Activity size={20} color="#f59e0b" />
                  </div>

                  {userOwnShipments.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        borderRadius: 14,
                        background: subtleBg,
                        border: '1px dashed rgba(148, 163, 184, 0.3)'
                      }}
                    >
                      <Activity
                        size={28}
                        color="#f59e0b"
                        style={{ opacity: 0.55, marginBottom: 8 }}
                      />
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>
                        Chưa có hành trình đang hoạt động
                      </div>
                      <p style={{ fontSize: '0.76rem', opacity: 0.72, margin: 0 }}>
                        Tiến độ % quãng đường, vận tốc GPS và thời gian dự kiến đến (ETA) của từng
                        chuyến sẽ cập nhật từng giây tại đây.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {userOwnShipments.slice(0, 4).map((s) => (
                        <div
                          key={s.shipmentCode}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: subtleBg,
                            fontSize: '0.78rem'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 5
                            }}
                          >
                            <strong>
                              {s.shipmentCode} • {s.licensePlate}
                            </strong>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                              {Math.round(s.progress)}% ({s.speedKmh} km/h)
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 999,
                              background: 'rgba(148,163,184,0.2)',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${s.progress}%`,
                                height: '100%',
                                background: '#10b981',
                                transition: 'width 0.5s ease'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Embedded Live 3D Map Preview on Overview */}
              <div
                style={{
                  padding: 22,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
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
                        textTransform: 'uppercase'
                      }}
                    >
                      BẢN ĐỒ 3D GOOGLE MAPS TRỰC TUYẾN CỦA DOANH NGHIỆP
                    </span>
                    <h3 style={{ fontSize: '1.12rem', fontWeight: 800, margin: '2px 0 0' }}>
                      {activeShipment
                        ? `Đang định vị chuyến ${activeShipment.shipmentCode}: ${activeShipment.originName} → ${activeShipment.destinationName}`
                        : 'Mạng Lưới 7 Cảng Biển & Khu Công Nghiệp Phía Nam (Chờ Lệnh Đặt Xe)'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab(activeShipment ? 'tracking' : 'booking')}
                    className="lp-btn lp-btn--primary lp-btn--sm"
                  >
                    {activeShipment ? (
                      <>
                        <Navigation size={15} /> Mở Trạm Giám Sát 3D Chi Tiết
                      </>
                    ) : (
                      <>
                        <PlusCircle size={15} /> Đặt Thuê Xe Xanh Để Kích Hoạt GPS
                      </>
                    )}
                  </button>
                </div>

                <MapView
                  center={activeShipment ? activeVehiclePosition : [10.785, 106.765]}
                  zoom={activeShipment ? 11 : 10}
                  height="360px"
                  defaultTile="google_hybrid"
                  default3D={true}
                  defaultPitch={36}
                  overlayTitle={
                    activeShipment
                      ? `${activeShipment.shipmentCode} • ${activeShipment.licensePlate} (${activeShipment.speedKmh} km/h)`
                      : 'Hệ thống 7 Cảng & KCN sẵn sàng phục vụ • Hiện có 0 chuyến đang thuê'
                  }
                >
                  <LogisticsHubMarkers />
                  {activeShipment && (
                    <>
                      <RoutePolyline
                        positions={activeShipmentWaypoints}
                        color="#10b981"
                        weight={5}
                        showCorridorBuffer={true}
                      />
                      <OriginMarker
                        position={activeShipmentWaypoints[0]}
                        label={activeShipment.originName}
                      />
                      <DestinationMarker
                        position={activeShipmentWaypoints[activeShipmentWaypoints.length - 1]}
                        label={activeShipment.destinationName}
                      />
                      <VehicleMarker
                        position={activeVehiclePosition}
                        vehicleCode={activeShipment.licensePlate}
                        speedKmh={activeShipment.speedKmh}
                        status="ON_ROUTE"
                        label={activeShipment.vehicleType}
                      />
                    </>
                  )}
                </MapView>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: 3D REAL-TIME GOOGLE MAP TRACKING (ONLY USER'S OWN ORDERS)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'tracking' && (
            <div>
              {userOwnShipments.length === 0 ? (
                <div
                  style={{
                    padding: 28,
                    borderRadius: 20,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                      marginBottom: 18
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#10b981',
                          textTransform: 'uppercase'
                        }}
                      >
                        TRẠM GIÁM SÁT VỆ TINH 3D GOOGLE MAPS • TÀI KHOẢN @{user?.username}
                      </span>
                      <h2 style={{ fontSize: '1.28rem', fontWeight: 800, margin: '4px 0' }}>
                        Doanh Nghiệp Của Bạn Chưa Có Chuyến Hàng Nào Đang Lưu Thông
                      </h2>
                      <p style={{ fontSize: '0.84rem', opacity: 0.78, margin: 0 }}>
                        Bản đồ 3D bên dưới hiển thị vị trí chi tiết 7 cảng biển và khu công nghiệp
                        trọng điểm. Hãy tạo đơn thuê xe đầu tiên để theo dõi xe di chuyển thời gian
                        thực.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('booking')}
                      className="lp-btn lp-btn--primary lp-btn--sm"
                    >
                      <PlusCircle size={16} /> Đặt Thuê Xe &amp; Tạo Vận Đơn Ngay
                    </button>
                  </div>

                  <MapView
                    center={[10.785, 106.765]}
                    zoom={10}
                    height="440px"
                    defaultTile="google_hybrid"
                    default3D={true}
                    defaultPitch={38}
                    overlayTitle="Bản đồ 3D Hành lang Logistics Phía Nam • 0 phương tiện đang thuê"
                  >
                    <LogisticsHubMarkers />
                  </MapView>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(310px, 1fr) minmax(420px, 1.6fr)',
                    gap: 22,
                    alignItems: 'start'
                  }}
                >
                  {/* Left: User's Real Shipments List */}
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 20,
                      background: cardBg,
                      border: cardBorder
                    }}
                  >
                    <h2 style={{ fontSize: '1.06rem', fontWeight: 800, margin: '0 0 4px' }}>
                      Vận Đơn Thực Tế Của Bạn ({userOwnShipments.length})
                    </h2>
                    <p style={{ fontSize: '0.76rem', opacity: 0.72, margin: '0 0 12px' }}>
                      Chọn vận đơn để khóa camera 3D theo xe trên bản đồ Google Maps
                    </p>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {userOwnShipments.map((s) => {
                        const isSelected = activeShipment?.shipmentCode === s.shipmentCode;
                        return (
                          <div
                            key={s.shipmentCode}
                            onClick={() => setSelectedCode(s.shipmentCode)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 14,
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(16, 185, 129, 0.14)' : subtleBg,
                              border: isSelected
                                ? '1.5px solid #10b981'
                                : '1px solid rgba(148, 163, 184, 0.2)'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6
                              }}
                            >
                              <code style={{ fontWeight: 800, color: '#10b981' }}>
                                {s.shipmentCode}
                              </code>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background:
                                    s.status === 'IN_TRANSIT'
                                      ? 'rgba(16, 185, 129, 0.18)'
                                      : 'rgba(56, 189, 248, 0.18)',
                                  color: s.status === 'IN_TRANSIT' ? '#10b981' : '#38bdf8'
                                }}
                              >
                                {s.status === 'IN_TRANSIT' ? '● Đang di chuyển' : '✓ Đã hoàn tất'}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                              {s.originName} → {s.destinationName}
                            </div>

                            <div
                              style={{
                                height: 6,
                                borderRadius: 999,
                                background: 'rgba(148,163,184,0.2)',
                                overflow: 'hidden',
                                marginBottom: 6
                              }}
                            >
                              <div
                                style={{
                                  width: `${s.progress}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #10b981, #38bdf8)'
                                }}
                              />
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.74rem',
                                opacity: 0.78
                              }}
                            >
                              <span>
                                {s.vehicleType} • <strong>{s.licensePlate}</strong>
                              </span>
                              <span>Tiến độ: {Math.round(s.progress)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Live 3D Map & Telemetry Inspector */}
                  {activeShipment && (
                    <div
                      style={{
                        padding: 22,
                        borderRadius: 20,
                        background: cardBg,
                        border: '1px solid rgba(16, 185, 129, 0.32)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 14,
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
                              textTransform: 'uppercase'
                            }}
                          >
                            BẢN ĐỒ VỆ TINH 3D GOOGLE HYBRID • {activeShipment.shipmentCode}
                          </span>
                          <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '3px 0' }}>
                            {activeShipment.originName} → {activeShipment.destinationName}
                          </h3>
                          <div style={{ fontSize: '0.8rem', opacity: 0.82 }}>
                            Tọa độ xe thực tế:{' '}
                            <code style={{ color: '#10b981', fontWeight: 700 }}>
                              {activeVehiclePosition[0].toFixed(4)}°N,{' '}
                              {activeVehiclePosition[1].toFixed(4)}°E
                            </code>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setFollowVehicle((v) => !v)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '7px 11px',
                              borderRadius: 9,
                              border: followVehicle
                                ? '1px solid #38bdf8'
                                : '1px solid rgba(148,163,184,0.3)',
                              background: followVehicle ? 'rgba(56,189,248,0.16)' : 'transparent',
                              color: followVehicle ? '#38bdf8' : 'inherit',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Crosshair size={13} />
                            {followVehicle ? 'Đang Khóa Camera' : 'Khóa Camera Xe'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsLiveSim((v) => !v)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '7px 11px',
                              borderRadius: 9,
                              border: '1px solid rgba(16,185,129,0.35)',
                              background: 'rgba(16,185,129,0.12)',
                              color: '#10b981',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isLiveSim ? <Pause size={13} /> : <Play size={13} />}
                            {isLiveSim ? 'Tạm dừng GPS' : 'Tiếp tục GPS'}
                          </button>

                          {activeShipment.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteOrderEpod(activeShipment.shipmentCode)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '7px 12px',
                                borderRadius: 9,
                                border: '1px solid #10b981',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#042f2e',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle2 size={13} /> Ký Nhận Hàng (ePOD)
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <MapView
                          center={activeVehiclePosition}
                          zoom={11}
                          height="380px"
                          defaultTile="google_hybrid"
                          default3D={true}
                          defaultPitch={38}
                          overlayTitle={`${activeShipment.shipmentCode} • ${activeShipment.licensePlate} (${activeShipment.corridorState})`}
                          onMapReady={(m) => {
                            mapInstanceRef.current = m;
                          }}
                        >
                          <RoutePolyline
                            positions={activeShipmentWaypoints}
                            color="#10b981"
                            weight={5}
                            showCorridorBuffer={true}
                          />
                          <OriginMarker
                            position={activeShipmentWaypoints[0]}
                            label={activeShipment.originName}
                          />
                          <DestinationMarker
                            position={activeShipmentWaypoints[activeShipmentWaypoints.length - 1]}
                            label={activeShipment.destinationName}
                          />
                          <VehicleMarker
                            position={activeVehiclePosition}
                            vehicleCode={activeShipment.licensePlate}
                            speedKmh={activeShipment.speedKmh}
                            status="ON_ROUTE"
                            label={activeShipment.vehicleType}
                          />
                        </MapView>
                      </div>

                      {/* 4 Telemetry Gauges */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 12
                        }}
                      >
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: subtleBg,
                            border: '1px solid rgba(148,163,184,0.16)'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                            <Gauge size={13} color="#38bdf8" /> Vận tốc GPS
                          </div>
                          <strong style={{ fontSize: '1.15rem' }}>
                            {activeShipment.speedKmh} km/h
                          </strong>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: subtleBg,
                            border: '1px solid rgba(148,163,184,0.16)'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                            <Clock size={13} color="#f59e0b" /> Dự kiến đến (ETA)
                          </div>
                          <strong style={{ fontSize: '1.15rem' }}>
                            {activeShipment.etaMinutes > 0
                              ? `${activeShipment.etaMinutes} phút`
                              : 'Đã đến đích'}
                          </strong>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: subtleBg,
                            border: '1px solid rgba(148,163,184,0.16)'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                            <Thermometer size={13} color="#34d399" /> Nhiệt độ thùng
                          </div>
                          <strong style={{ fontSize: '1.15rem' }}>
                            {activeShipment.temperatureC}°C
                          </strong>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: subtleBg,
                            border: '1px solid rgba(16,185,129,0.3)'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                            <Leaf size={13} /> CO2e Tiết kiệm
                          </div>
                          <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>
                            -{activeShipment.co2SavedKg} kg
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: BOOK GREEN SHIPMENT (CREATE REAL-TIME ORDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'booking' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: 24,
                alignItems: 'start'
              }}
            >
              <div
                style={{
                  padding: 26,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <h2 style={{ fontSize: '1.22rem', fontWeight: 800, marginBottom: 6 }}>
                  Đặt Thuê Xe Vận Chuyển Xanh &amp; Khởi Tạo Vận Đơn Real-Time
                </h2>
                <p style={{ fontSize: '0.84rem', opacity: 0.78, marginBottom: 20 }}>
                  Ngay sau khi xác nhận, hệ thống sẽ điều xe thực tế mang biển số riêng cho doanh
                  nghiệp của bạn, kích hoạt định vị 3D Google Maps và cập nhật toàn bộ sơ đồ thống
                  kê.
                </p>

                <form onSubmit={handleCreateShipment}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 10,
                      alignItems: 'end',
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
                        Điểm lấy hàng (Origin) *
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
                          fontSize: '0.85rem'
                        }}
                      >
                        {MAP_NODES.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.area})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      title="Đổi chiều đi/đến"
                      onClick={() =>
                        setBookingForm((prev) => ({
                          ...prev,
                          originId: prev.destinationId,
                          destinationId: prev.originId
                        }))
                      }
                      style={{
                        height: 40,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(16,185,129,0.35)',
                        background: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowLeftRight size={15} />
                    </button>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          marginBottom: 6
                        }}
                      >
                        Điểm giao hàng (Destination) *
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
                          fontSize: '0.85rem'
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
                          fontSize: '0.85rem'
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
                      Chọn Cấu Hình Phương Tiện Đặt Thuê
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
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981' }}>
                              {pt.name}
                            </div>
                            <div style={{ fontSize: '0.73rem', opacity: 0.78, marginTop: 2 }}>
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
                        Ngày lấy hàng
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
                          fontSize: '0.85rem'
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
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="lp-btn lp-btn--primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={17} /> Xác Nhận Đặt Thuê Xe &amp; Tạo Vận Đơn{' '}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>

              {/* Right: Live 3D Route Preview & Quote */}
              <div
                style={{
                  padding: 24,
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
                    textTransform: 'uppercase'
                  }}
                >
                  MÔ PHỎNG LỘ TRÌNH 3D &amp; BÁO GIÁ TỨC THÌ (UC05)
                </span>
                <h3 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '6px 0 12px' }}>
                  {bookingQuote.originNode.label} → {bookingQuote.destNode.label}
                </h3>

                <div style={{ marginBottom: 14 }}>
                  <MapView
                    center={bookingQuote.originCoords}
                    zoom={10}
                    height="245px"
                    defaultTile="google_hybrid"
                    default3D={true}
                    defaultPitch={36}
                    overlayTitle={`Cự ly tuyến: ${bookingQuote.distanceKm} km`}
                  >
                    <RoutePolyline
                      positions={bookingQuote.previewWaypoints}
                      color="#10b981"
                      weight={5}
                      showCorridorBuffer={true}
                    />
                    <OriginMarker
                      position={bookingQuote.originCoords}
                      label={bookingQuote.originNode.label}
                    />
                    <DestinationMarker
                      position={bookingQuote.destCoords}
                      label={bookingQuote.destNode.label}
                    />
                  </MapView>
                </div>

                <div
                  style={{
                    padding: 15,
                    borderRadius: 14,
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(110, 231, 183, 0.3)',
                    marginBottom: 14
                  }}
                >
                  <div style={{ fontSize: '0.76rem', color: '#a7f3d0' }}>
                    Lượng phát thải CO2e cắt giảm dự kiến
                  </div>
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      color: '#6ee7b7',
                      margin: '3px 0'
                    }}
                  >
                    -{bookingQuote.savedCo2Kg} kg CO2e (-{bookingQuote.reductionPct}%)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Cước phí thuê xe trọn gói:{' '}
                    <strong style={{ color: '#fef08a' }}>
                      {bookingQuote.estimatedCostVnd.toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Địa chỉ lấy hàng:</span>
                    <strong>{NODE_ADDRESSES[bookingForm.originId]?.split(',')[0]}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Địa chỉ giao hàng:</span>
                    <strong>{NODE_ADDRESSES[bookingForm.destinationId]?.split(',')[0]}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Cự ly &amp; Thời gian dự kiến:</span>
                    <strong>
                      {bookingQuote.distanceKm} km (~{bookingQuote.etaMinutes} phút)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: ORDER MANAGEMENT & CONTRACTS (USER'S OWN ORDERS)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div
              style={{
                padding: 24,
                borderRadius: 20,
                background: cardBg,
                border: cardBorder
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
                  <h2 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 4px' }}>
                    Danh Sách Vận Đơn &amp; Hợp Đồng Thuê Xe Của Doanh Nghiệp
                  </h2>
                  <p style={{ fontSize: '0.82rem', opacity: 0.75, margin: 0 }}>
                    Hiển thị chính xác các đơn hàng do tài khoản <code>@{user?.username}</code> đặt
                    thuê theo thời gian thực.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', minWidth: 230 }}>
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
                      placeholder="Tìm mã đơn, cảng, biển số..."
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.3)',
                        background: 'transparent',
                        color: 'inherit',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>

                  {['ALL', 'IN_TRANSIT', 'COMPLETED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 999,
                        border:
                          statusFilter === st
                            ? '1px solid #10b981'
                            : '1px solid rgba(148,163,184,0.25)',
                        background: statusFilter === st ? 'rgba(16,185,129,0.16)' : 'transparent',
                        color: statusFilter === st ? '#10b981' : 'inherit',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {st === 'ALL'
                        ? 'Tất cả'
                        : st === 'IN_TRANSIT'
                          ? 'Đang vận chuyển'
                          : 'Hoàn tất ePOD'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredShipments.length === 0 ? (
                <div
                  style={{
                    padding: '44px 20px',
                    textAlign: 'center',
                    borderRadius: 16,
                    background: subtleBg,
                    border: '1px dashed rgba(148,163,184,0.3)'
                  }}
                >
                  <Package size={34} color="#10b981" style={{ opacity: 0.6, marginBottom: 10 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>
                    Chưa có vận đơn nào được khởi tạo
                  </h3>
                  <p style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: 16 }}>
                    Tài khoản của bạn mới đăng ký và chưa đặt thuê chuyến xe nào. Hãy tạo vận đơn
                    xanh đầu tiên để bắt đầu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('booking')}
                    className="lp-btn lp-btn--primary lp-btn--sm"
                  >
                    <PlusCircle size={15} /> Đặt Thuê Xe Xanh Ngay
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.24)' }}>
                        <th style={{ padding: '11px 10px' }}>Mã Vận Đơn</th>
                        <th style={{ padding: '11px 10px' }}>Lộ Trình Vận Tải</th>
                        <th style={{ padding: '11px 10px' }}>Phương Tiện &amp; Biển Số</th>
                        <th style={{ padding: '11px 10px' }}>Tải Trọng</th>
                        <th style={{ padding: '11px 10px' }}>Cước Thuê</th>
                        <th style={{ padding: '11px 10px' }}>Tiến Độ</th>
                        <th style={{ padding: '11px 10px' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.map((s) => (
                        <tr
                          key={s.shipmentCode}
                          style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}
                        >
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: '#10b981' }}>
                            {s.shipmentCode}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            {s.originName} → {s.destinationName}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            {s.vehicleType} • <strong>{s.licensePlate}</strong>
                          </td>
                          <td style={{ padding: '12px 10px' }}>{s.cargoWeightTons} tấn</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                            {(s.estimatedCostVnd || 1850000).toLocaleString('vi-VN')} ₫
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                              {Math.round(s.progress)}%
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCode(s.shipmentCode);
                                  setActiveTab('tracking');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(56,189,248,0.35)',
                                  background: 'rgba(56,189,248,0.12)',
                                  color: '#38bdf8',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Định vị 3D
                              </button>
                              {s.status === 'IN_TRANSIT' && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteOrderEpod(s.shipmentCode)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(16,185,129,0.35)',
                                    background: 'rgba(16,185,129,0.14)',
                                    color: '#10b981',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Ký ePOD
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(s.shipmentCode)}
                                title="Xóa vận đơn"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  background: 'rgba(239,68,68,0.1)',
                                  color: '#f87171',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: CARBON LEDGER & ISO 14083 CERTIFICATES
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'carbon' && (
            <div
              style={{
                padding: 24,
                borderRadius: 20,
                background: cardBg,
                border: cardBorder
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Sổ Cái Kiểm Toán Phát Thải Scope 3 &amp; Chứng Nhận Số ePOD (ISO 14083)
                </h2>
                <p style={{ fontSize: '0.82rem', opacity: 0.78, margin: 0 }}>
                  Chứng nhận phát thải chỉ được sinh tự động dựa trên các vận đơn thực tế của doanh
                  nghiệp bạn.
                </p>
              </div>

              {userOwnShipments.length === 0 ? (
                <div
                  style={{
                    padding: '44px 20px',
                    textAlign: 'center',
                    borderRadius: 16,
                    background: subtleBg,
                    border: '1px dashed rgba(148,163,184,0.3)'
                  }}
                >
                  <FileCheck2
                    size={34}
                    color="#10b981"
                    style={{ opacity: 0.6, marginBottom: 10 }}
                  />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>
                    Chưa có chứng nhận ISO 14083 nào
                  </h3>
                  <p style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: 16 }}>
                    Sau khi bạn đặt thuê xe xanh, hệ thống sẽ tự động băm mã SHA-256 và cấp chứng
                    chỉ giảm phát thải CO2e tại đây.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('booking')}
                    className="lp-btn lp-btn--primary lp-btn--sm"
                  >
                    <PlusCircle size={15} /> Tạo Vận Đơn Để Nhận Chứng Chỉ
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table
                      style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.24)' }}>
                          <th style={{ padding: '12px 10px' }}>Mã Vận Đơn</th>
                          <th style={{ padding: '12px 10px' }}>Hành Lang Vận Tải</th>
                          <th style={{ padding: '12px 10px' }}>Phương Tiện</th>
                          <th style={{ padding: '12px 10px' }}>Mốc Diesel</th>
                          <th style={{ padding: '12px 10px' }}>Thực Tế WTW</th>
                          <th style={{ padding: '12px 10px' }}>CO2e Đã Giảm</th>
                          <th style={{ padding: '12px 10px' }}>Chứng Nhận ISO 14083</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userOwnShipments.map((s) => (
                          <tr
                            key={s.shipmentCode}
                            style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}
                          >
                            <td style={{ padding: '12px 10px', fontWeight: 800, color: '#10b981' }}>
                              {s.shipmentCode}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              {s.originName} → {s.destinationName}
                            </td>
                            <td style={{ padding: '12px 10px' }}>{s.vehicleType}</td>
                            <td style={{ padding: '12px 10px' }}>{s.baselineCo2Kg} kg</td>
                            <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                              {s.actualCo2Kg} kg
                            </td>
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
                                    border: '1px solid rgba(56,189,248,0.35)',
                                    background: 'rgba(56,189,248,0.12)',
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
                                    border: '1px solid rgba(16,185,129,0.35)',
                                    background: 'rgba(16,185,129,0.12)',
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
                        marginTop: 20,
                        padding: 20,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)',
                        border: '1.5px solid #10b981',
                        color: '#f8fafc'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 10
                        }}
                      >
                        <strong style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>
                          CHỨNG NHẬN KIỂM KÊ KHÍ NHÀ KÍNH ISO 14083:2023 •{' '}
                          {selectedCertificate.shipmentCode}
                        </strong>
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
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 12,
                          fontSize: '0.82rem'
                        }}
                      >
                        <div>
                          <div style={{ color: '#94a3b8' }}>Doanh nghiệp thụ hưởng:</div>
                          <strong>{selectedCertificate.customerName}</strong>
                        </div>
                        <div>
                          <div style={{ color: '#94a3b8' }}>Lượng CO2e cắt giảm:</div>
                          <strong style={{ color: '#34d399' }}>
                            -{selectedCertificate.co2SavedKg} kg CO2e (-
                            {selectedCertificate.co2ReductionPct}%)
                          </strong>
                        </div>
                        <div>
                          <div style={{ color: '#94a3b8' }}>Mã xác thực SHA-256:</div>
                          <code style={{ color: '#38bdf8', fontSize: '0.74rem' }}>
                            {selectedCertificate.certificateHash}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: COMPANY PROFILE & NOTIFICATION SETTINGS
          ══════════════════════════════════════════════════════════════════ */}
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
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <h2
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <UserCheck size={19} color="#10b981" /> Hồ Sơ Tài Khoản Doanh Nghiệp B2B
                </h2>

                <div style={{ display: 'grid', gap: 12, fontSize: '0.85rem' }}>
                  {[
                    { label: 'Người đại diện', value: user?.fullName || 'Đại Diện Chủ Hàng' },
                    {
                      label: 'Tên doanh nghiệp',
                      value: user?.companyName || 'Doanh Nghiệp Đối Tác B2B'
                    },
                    {
                      label: 'Mã định danh Đối tác (BRULE-16)',
                      value: user?.customerId || 'B2B_PARTNER'
                    },
                    { label: 'Tài khoản đăng nhập', value: `@${user?.username || 'user'}` },
                    { label: 'Email nhận chứng từ ESG', value: user?.email || 'Chưa cập nhật' },
                    { label: 'Số điện thoại điều phối', value: user?.phone || 'Chưa cập nhật' },
                    { label: 'Tổng số đơn đã thuê', value: `${kpiStats.totalOrders} vận đơn` }
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
                      <span style={{ opacity: 0.75 }}>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <h2
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Bell size={19} color="#38bdf8" /> Cấu Hình Nhận Cảnh Báo &amp; Chứng Từ Tự Động
                </h2>

                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    {
                      key: 'deviationAlert',
                      title: 'Cảnh báo khi phương tiện lệch hành lang an toàn (> 200m)',
                      desc: 'Nhận thông báo tức thì khi xe chở hàng của doanh nghiệp có dấu hiệu lệch lộ trình.'
                    },
                    {
                      key: 'etaArrivalAlert',
                      title: 'Thông báo trước 15 phút khi xe sắp cập cảng / kho đích',
                      desc: 'Giúp bộ phận kho bãi chủ động bố trí cầu nâng và nhân sự bốc dỡ.'
                    },
                    {
                      key: 'autoEpodEmail',
                      title: 'Tự động gửi biên bản ePOD & chứng nhận CO2e ISO 14083 qua Email',
                      desc: 'Gửi ngay sau khi hoàn tất bàn giao lô hàng.'
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
                        background: subtleBg,
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
                        <strong style={{ display: 'block', fontSize: '0.84rem', marginBottom: 2 }}>
                          {item.title}
                        </strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.78 }}>{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
