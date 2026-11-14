import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Database,
  FileCheck,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Moon,
  Navigation,
  Package,
  Pause,
  PenTool,
  Play,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Thermometer,
  Unlock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import CcadroLogo from '../components/ui/CcadroLogo';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import VehicleMarker from '../components/map/VehicleMarker';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import DeviationMarker from '../components/map/DeviationMarker';
import {
  HUB_NODES,
  calculateTelemetry,
  getRealRoadRoute,
  interpolateRoadPosition
} from '../services/roadRoutingService';

const DRIVER_SEED_CONTAINERS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    containerCode: 'TCKU-781920-4',
    containerType: 'REEFER_40FT',
    isoType: '45R1',
    ownerName: 'Tân Cảng Sài Gòn (SNP Logistics)',
    tareWeightTons: 4.48,
    maxPayloadTons: 29.52,
    cubicCapacityM3: 67.9,
    isReefer: true,
    status: 'IN_TRANSIT',
    eSealNumber: 'VN-CUST-819204',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    telematicsModel: 'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3',
    supplyAirTempC: -18.4,
    returnAirTempC: -17.9,
    humidityPct: 88.0,
    shockG: 0.24,
    solarPowerWatts: 42.0,
    batteryPct: 98,
    lastLatitude: 10.8492,
    lastLongitude: 106.7725,
    lastLocationName: 'Đoạn ngã 4 Thủ Đức • Xa lộ Hà Nội',
    progressPct: 54.0,
    speedKmh: 52.0,
    etaMinutes: 12,
    assignedShipmentCode: 'SHP-2026-8192',
    driverName: 'Nguyễn Văn Tài',
    driverPhone: '0903 812 456',
    driverLicense: 'GPLX Hạng FC • 9 năm kinh nghiệm',
    driverSafetyScore: 4.95,
    vehicleLicensePlate: '51C-888.99',
    vehicleTypeLabel: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'ICD Sóng Thần, Dĩ An, Bình Dương',
    originKey: 'catlai',
    destKey: 'songthan'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    containerCode: 'MSKU-492018-7',
    containerType: 'DRY_40FT',
    isoType: '45G1',
    ownerName: 'Maersk Line A/S',
    tareWeightTons: 3.9,
    maxPayloadTons: 28.6,
    cubicCapacityM3: 76.4,
    isReefer: false,
    status: 'IN_TRANSIT',
    eSealNumber: 'VN-CUST-901423',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    telematicsModel: 'Orbcomm CT 3500 Solar Asset Tracker',
    supplyAirTempC: 26.2,
    returnAirTempC: 26.8,
    humidityPct: 52.0,
    shockG: 0.21,
    solarPowerWatts: 45.0,
    batteryPct: 99,
    lastLatitude: 10.7124,
    lastLongitude: 106.9452,
    lastLocationName: 'Đoạn nút giao Vành đai 3 • Cao tốc Long Thành',
    progressPct: 68.0,
    speedKmh: 60.0,
    etaMinutes: 26,
    assignedShipmentCode: 'SHP-2026-4920',
    driverName: 'Lê Minh Khôi',
    driverPhone: '0908 551 209',
    driverLicense: 'GPLX Hạng FC • 7 năm kinh nghiệm',
    driverSafetyScore: 4.9,
    vehicleLicensePlate: '51C-704.33',
    vehicleTypeLabel: 'Xe đầu kéo điện (EV) • 40T BEV',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'Cụm Cảng Cái Mép – Thị Vải, BR-VT',
    originKey: 'catlai',
    destKey: 'caimep'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    containerCode: 'CMAU-821903-2',
    containerType: 'DRY_40FT',
    isoType: '45G1',
    ownerName: 'CMA CGM Group',
    tareWeightTons: 3.9,
    maxPayloadTons: 28.6,
    cubicCapacityM3: 76.4,
    isReefer: false,
    status: 'IN_TRANSIT',
    eSealNumber: 'VN-CUST-774102',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    telematicsModel: 'Orbcomm CT 3500 Solar Asset Tracker',
    supplyAirTempC: 28.0,
    returnAirTempC: 28.5,
    humidityPct: 60.0,
    shockG: 0.28,
    solarPowerWatts: 38.0,
    batteryPct: 95,
    lastLatitude: 10.8652,
    lastLongitude: 106.6712,
    lastLocationName: 'Đoạn ngã 4 Bình Phước • Quốc lộ 13',
    progressPct: 30.0,
    speedKmh: 46.0,
    etaMinutes: 24,
    assignedShipmentCode: 'SHP-2026-8219',
    driverName: 'Trần Hoàng Nam',
    driverPhone: '0914 720 881',
    driverLicense: 'GPLX Hạng FC • 11 năm kinh nghiệm',
    driverSafetyScore: 4.98,
    vehicleLicensePlate: '51D-662.18',
    vehicleTypeLabel: 'Xe tải chuẩn Euro 5 SCR',
    originName: 'KCN Tân Bình, Q. Tân Phú',
    destinationName: 'KCN VSIP 1, Thuận An, Bình Dương',
    originKey: 'tanbinh',
    destKey: 'vsip'
  }
];

const PRE_TRIP_ITEMS = [
  {
    key: 'tirePressurePassed',
    title: '1. Lốp xe & Áp suất lốp tiêu chuẩn (>= 8.5 bar)',
    spec: 'Kiểm tra 18 bánh đầu kéo & rơ-moóc không nứt phồng, độ sâu gai >= 3.0mm'
  },
  {
    key: 'brakeSystemPassed',
    title: '2. Hệ thống phanh khí nén & ABS/EBS (>= 6.5 bar)',
    spec: 'Độ kín ống hơi, phanh đỗ rơ-moóc và phanh tái sinh BEV hoạt động bình thường'
  },
  {
    key: 'lightingSystemPassed',
    title: '3. Đèn chiếu sáng, xi-nhan & còi cảnh báo',
    spec: 'Đèn pha/cos, đèn hậu rơ-moóc, đèn sương mù và dải phản quang thùng container'
  },
  {
    key: 'fluidLevelPassed',
    title: '4. Năng lượng Pin BEV SoC (>= 80%) / Dung dịch làm mát',
    spec: 'Hệ thống làm mát bộ pin HV / dầu trợ lực lái và nước rửa kính đạt mức an toàn'
  },
  {
    key: 'cargoSecuringPassed',
    title: '5. Chốt gù Container (Twistlocks) & Mâm xoay Fifth Wheel',
    spec: 'Khóa đủ 4 góc chốt gù ISO, chốt hãm mâm kéo khớp hoàn toàn không rơ lắc'
  },
  {
    key: 'emergencyKitPassed',
    title: '6. Khóa Seal Hải quan & Thiết bị IoT Smart Container',
    spec: 'Seal GPS ISO 17712 sáng đèn xanh, cảm biến nhiệt lạnh / chống sốc 3 trục online'
  }
];

function resolveCorridorKeys(originName = '', destName = '') {
  const o = originName.toLowerCase();
  const d = destName.toLowerCase();
  const pick = (str, fallback) => {
    if (str.includes('cát lái') || str.includes('cat lai')) return 'catlai';
    if (str.includes('sóng thần') || str.includes('song than')) return 'songthan';
    if (str.includes('vsip 2')) return 'vsip2';
    if (str.includes('vsip')) return 'vsip';
    if (str.includes('tân bình') || str.includes('tan binh')) return 'tanbinh';
    if (str.includes('nhơn trạch') || str.includes('nhon trach')) return 'nhontrach';
    if (str.includes('hiệp phước') || str.includes('hiep phuoc')) return 'hiepphuoc';
    if (str.includes('cái mép') || str.includes('cai mep')) return 'caimep';
    return fallback;
  };
  return {
    originKey: pick(o, 'catlai'),
    destKey: pick(d, 'songthan')
  };
}

export default function DriverTerminalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Active workspace tab
  const [activeTab, setActiveTab] = useState('mission'); // 'mission' | 'inspection' | 'navigation' | 'epod'

  // Container fleet & DB synchronization state
  const [containers, setContainers] = useState(DRIVER_SEED_CONTAINERS);
  const [selectedCode, setSelectedCode] = useState('TCKU-781920-4');
  const [dbStatus, setDbStatus] = useState('CONNECTING'); // 'LIVE_DB' | 'LOCAL_FALLBACK' | 'CONNECTING'
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString('vi-VN'));
  const [syncingTelemetry, setSyncingTelemetry] = useState(false);

  // Driver shift & live telemetry stream
  const [shiftStatus, setShiftStatus] = useState('IN_SHIFT'); // 'IN_SHIFT' | 'REST'
  const [autoStream, setAutoStream] = useState(false);
  const [rerouteOfferActive, setRerouteOfferActive] = useState(true);
  const [rerouteAccepted, setRerouteAccepted] = useState(false);
  const [deviationSim, setDeviationSim] = useState(false);

  // Toast / Feedback Banner
  const [banner, setBanner] = useState(null);

  // Pre-trip 6-point checklist state
  const [checklist, setChecklist] = useState({
    tirePressurePassed: true,
    brakeSystemPassed: true,
    lightingSystemPassed: true,
    fluidLevelPassed: true,
    cargoSecuringPassed: true,
    emergencyKitPassed: true
  });
  const [inspectionRemarks, setInspectionRemarks] = useState(
    'Xe đầu kéo BEV 51C-888.99 và Container TCKU-781920-4 đạt chuẩn xuất bến.'
  );
  const [inspectionCert, setInspectionCert] = useState(null);
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // ePOD Digital Signature Canvas state
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [epodRecipient, setEpodRecipient] = useState('Nguyễn Minh Hùng - Thủ Kho ICD Sóng Thần');
  const [epodNotes, setEpodNotes] = useState(
    'Container nguyên vẹn, khóa Seal VN-CUST-819204 khớp mã, nhiệt độ lạnh đạt -18.2°C.'
  );
  const [submittingEpod, setSubmittingEpod] = useState(false);

  // Incident Report state
  const [incidentType, setIncidentType] = useState('TRAFFIC_CONGESTION');
  const [incidentSeverity, setIncidentSeverity] = useState('HIGH');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Reference vehicle/driver UUIDs for backend persistence
  const [backendIds, setBackendIds] = useState({
    vehicleId: 'a0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001'
  });

  const showToast = useCallback((type, text) => {
    setBanner({ type, text, at: new Date().toLocaleTimeString('vi-VN') });
  }, []);

  // Load real containers and assets from PostgreSQL backend via Gateway
  const loadFromBackend = useCallback(async () => {
    try {
      const [contRes, vehRes, drvRes] = await Promise.allSettled([
        api.getContainers(),
        api.getVehicles(),
        api.getDrivers()
      ]);

      if (contRes.status === 'fulfilled') {
        const list = contRes.value?.result || contRes.value?.data || contRes.value;
        if (Array.isArray(list) && list.length > 0) {
          setContainers(list);
          setDbStatus('LIVE_DB');
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        } else {
          setDbStatus('LOCAL_FALLBACK');
        }
      } else {
        setDbStatus('LOCAL_FALLBACK');
      }

      const vehList =
        vehRes.status === 'fulfilled'
          ? vehRes.value?.result || vehRes.value?.data || vehRes.value
          : [];
      const drvList =
        drvRes.status === 'fulfilled'
          ? drvRes.value?.result || drvRes.value?.data || drvRes.value
          : [];

      if (Array.isArray(vehList) && vehList.length > 0 && Array.isArray(drvList) && drvList.length > 0) {
        setBackendIds({
          vehicleId: vehList[0].id,
          driverId: drvList[0].id
        });
      }
    } catch (_) {
      setDbStatus('LOCAL_FALLBACK');
    }
  }, []);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  const activeContainer = useMemo(() => {
    return containers.find((c) => c.containerCode === selectedCode) || containers[0];
  }, [containers, selectedCode]);

  // Resolve real road route for active container
  const routeData = useMemo(() => {
    const keys = resolveCorridorKeys(activeContainer?.originName, activeContainer?.destinationName);
    return {
      ...keys,
      ...getRealRoadRoute(keys.originKey, keys.destKey)
    };
  }, [activeContainer?.originName, activeContainer?.destinationName]);

  const currentCoords = useMemo(() => {
    if (deviationSim) {
      return [10.8585, 106.7625];
    }
    if (activeContainer?.lastLatitude && activeContainer?.lastLongitude && !autoStream) {
      return [Number(activeContainer.lastLatitude), Number(activeContainer.lastLongitude)];
    }
    return interpolateRoadPosition(routeData.points, activeContainer?.progressPct || 0);
  }, [activeContainer, routeData.points, autoStream, deviationSim]);

  // Persist telemetry to PostgreSQL DB (`PUT /api/v1/assets/containers/{code}/telemetry`)
  const pushTelemetryToDb = useCallback(
    async (overrideProgress = null) => {
      if (!activeContainer) return;
      setSyncingTelemetry(true);

      const nextProgress =
        overrideProgress !== null
          ? overrideProgress
          : Math.min(99, Number(((Number(activeContainer.progressPct) || 0) + 4.5).toFixed(1)));

      const pos = interpolateRoadPosition(routeData.points, nextProgress);
      const nextSpeed = deviationSim ? 38.0 : Number((50 + Math.random() * 12).toFixed(1));
      const metrics = calculateTelemetry(routeData.distanceKm || 28.9, nextProgress, nextSpeed);
      const nextTempSupply = activeContainer.isReefer
        ? Number((-18.5 + Math.random() * 0.4).toFixed(1))
        : Number((26.0 + Math.random() * 1.5).toFixed(1));
      const nextTempReturn = Number((nextTempSupply + 0.5).toFixed(1));
      const nextShock = deviationSim ? 0.68 : Number((0.18 + Math.random() * 0.12).toFixed(2));
      const nextLocation = deviationSim
        ? 'CẢNH BÁO: Lệch khỏi hành lang 260m • Cầu vượt Thủ Đức'
        : `Tuyến xanh KM ${metrics.traveledKm}/${routeData.distanceKm} • Tốc độ ${nextSpeed} km/h`;

      const telemetryPayload = {
        lastLatitude: pos[0],
        lastLongitude: pos[1],
        lastLocationName: nextLocation,
        progressPct: nextProgress,
        speedKmh: nextSpeed,
        etaMinutes: metrics.remainingMinutes,
        supplyAirTempC: nextTempSupply,
        returnAirTempC: nextTempReturn,
        humidityPct: activeContainer.humidityPct || 88.0,
        shockG: nextShock,
        solarPowerWatts: Number((40 + Math.random() * 8).toFixed(1)),
        batteryPct: Math.max(85, (activeContainer.batteryPct || 98) - (Math.random() > 0.7 ? 1 : 0)),
        eSealStatus: activeContainer.eSealStatus || 'LOCKED_SECURE',
        eSealIntegrityPct: 100
      };

      // Optimistic local state update
      setContainers((prev) =>
        prev.map((c) =>
          c.containerCode === activeContainer.containerCode ? { ...c, ...telemetryPayload } : c
        )
      );

      try {
        const res = await api.updateContainerTelemetry(activeContainer.containerCode, telemetryPayload);
        const saved = res?.result || res?.data;
        if (saved && saved.containerCode) {
          setContainers((prev) =>
            prev.map((c) => (c.containerCode === saved.containerCode ? saved : c))
          );
          setDbStatus('LIVE_DB');
        }
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        showToast(
          'success',
          `Đã lưu Telemetry Container ${activeContainer.containerCode} (${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}) xuống Database!`
        );
      } catch (_) {
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        showToast(
          'info',
          `Đã cập nhật Telemetry Real-time (${nextProgress}%) vào bộ nhớ đệm cục bộ (DB đang chờ kết nối).`
        );
      } finally {
        setSyncingTelemetry(false);
      }
    },
    [activeContainer, routeData, deviationSim, showToast]
  );

  // Automatic telemetry stream interval
  useEffect(() => {
    if (!autoStream) return;
    const timer = setInterval(() => {
      pushTelemetryToDb();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoStream, pushTelemetryToDb]);

  // Submit Pre-Trip 6-point safety inspection (UC03)
  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInspection(true);
    const allPassed = Object.values(checklist).every(Boolean);

    const payload = {
      vehicleId: activeContainer?.assignedVehicleId || backendIds.vehicleId,
      driverId: activeContainer?.assignedDriverId || backendIds.driverId,
      ...checklist,
      remarks: inspectionRemarks
    };

    try {
      const res = await api.submitPreTripInspection(payload);
      const data = res?.result || res?.data || {};
      setInspectionCert({
        passed: allPassed,
        code: data.inspectionCode || `PTI-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        remarks: inspectionRemarks
      });
      setDbStatus('LIVE_DB');
      showToast('success', 'Đã lưu Biên bản kiểm tra an toàn 6 điểm (Pre-Trip UC03) xuống PostgreSQL!');
    } catch (_) {
      setInspectionCert({
        passed: allPassed,
        code: `PTI-LOC-${Date.now().toString().slice(-5)}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        remarks: inspectionRemarks
      });
      showToast(
        allPassed ? 'success' : 'warning',
        allPassed
          ? 'Đã cấp Chứng nhận An toàn Xuất bến (Pre-Trip Pass - Lưu Local Cache).'
          : 'Cảnh báo: Có hạng mục không đạt! Không đủ điều kiện xuất bến theo BRULE-01.'
      );
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Digital Signature Canvas Drawing Handlers
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isDark ? '#34d399' : '#0f172a';
    isDrawingRef.current = true;
    setHasSignature(true);
  };

  const drawMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit ePOD & Mark Container Delivered in Database
  const handleEpodSubmit = async (e) => {
    e.preventDefault();
    if (!activeContainer) return;
    if (!epodRecipient.trim()) {
      showToast('warning', 'Vui lòng nhập họ tên người ký nhận tại kho đích.');
      return;
    }

    setSubmittingEpod(true);
    const sigToken = hasSignature
      ? `SIG-SHA256-${Date.now().toString(36).toUpperCase()}`
      : `EPOD-PIN-${activeContainer.eSealNumber || 'VERIFIED'}`;

    const epodPayload = {
      recipientName: epodRecipient.trim(),
      signature: sigToken,
      notes: epodNotes.trim()
    };

    try {
      const res = await api.submitContainerEpod(activeContainer.containerCode, epodPayload);
      const saved = res?.result || res?.data;
      if (saved && saved.containerCode) {
        setContainers((prev) =>
          prev.map((c) => (c.containerCode === saved.containerCode ? saved : c))
        );
        setDbStatus('LIVE_DB');
      } else {
        setContainers((prev) =>
          prev.map((c) =>
            c.containerCode === activeContainer.containerCode
              ? {
                  ...c,
                  status: 'DELIVERED',
                  progressPct: 100,
                  speedKmh: 0,
                  etaMinutes: 0,
                  eSealStatus: 'UNLOCKED_AUTHORIZED',
                  epodRecipient: epodRecipient.trim(),
                  epodSignature: sigToken,
                  completedAt: new Date().toISOString()
                }
              : c
          )
        );
      }
      setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      showToast(
        'success',
        `Hoàn tất bàn giao ePOD Container ${activeContainer.containerCode}! Khóa Seal đã mở hợp lệ & chốt GLEC v3 trong Database.`
      );
    } catch (_) {
      setContainers((prev) =>
        prev.map((c) =>
          c.containerCode === activeContainer.containerCode
            ? {
                ...c,
                status: 'DELIVERED',
                progressPct: 100,
                speedKmh: 0,
                etaMinutes: 0,
                eSealStatus: 'UNLOCKED_AUTHORIZED',
                epodRecipient: epodRecipient.trim(),
                epodSignature: sigToken,
                completedAt: new Date().toISOString()
              }
            : c
        )
      );
      showToast(
        'success',
        `Đã ký nhận ePOD Container ${activeContainer.containerCode} & cập nhật trạng thái ĐÃ GIAO HÀNG (Offline Cache).`
      );
    } finally {
      setSubmittingEpod(false);
    }
  };

  // Report Field Incident (UC16)
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingIncident(true);
    const payload = {
      tripId: activeContainer?.assignedShipmentId || 'd0000000-0000-0000-0000-000000000001',
      driverId: activeContainer?.assignedDriverId || backendIds.driverId,
      incidentType,
      severity: incidentSeverity,
      description:
        incidentDesc.trim() ||
        `Báo cáo hiện trường từ xe ${activeContainer?.vehicleLicensePlate} chở container ${activeContainer?.containerCode}.`,
      latitude: currentCoords[0],
      longitude: currentCoords[1]
    };

    try {
      await api.createIncident(payload);
      setDbStatus('LIVE_DB');
      showToast('success', 'Đã gửi Biên bản sự cố hiện trường (UC16) về Trung tâm NOC & Database!');
      setIncidentDesc('');
    } catch (_) {
      showToast('warning', 'Đã ghi nhận sự cố hiện trường khẩn cấp (Đang đồng bộ về NOC).');
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Emergency SOS Broadcast
  const handleSosTrigger = async () => {
    try {
      await api.broadcastEmergencyNotification({
        title: `[KHẨN CẤP TÀI XẾ SOS] ${activeContainer?.vehicleLicensePlate || '51C-888.99'}`,
        message: `Tài xế ${user?.fullName || activeContainer?.driverName} phát tín hiệu SOS từ Container ${activeContainer?.containerCode} tại tọa độ (${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}).`,
        severity: 'CRITICAL',
        eventType: 'DRIVER_SOS',
        sourceService: 'driver-terminal'
      });
    } catch (_) {
      // ignore if offline
    }
    showToast(
      'warning',
      `TÍN HIỆU SOS ĐÃ PHÁT TỚI TRUNG TÂM NOC & BAN AN TOÀN! Tọa độ (${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}) đang được ưu tiên hỗ trợ.`
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Surface styling variables
  const bgPage = isDark
    ? 'radial-gradient(circle at top right, #06281e 0%, #030e0b 52%, #020617 100%)'
    : '#f1f5f9';
  const cardBg = isDark ? 'rgba(9, 25, 20, 0.88)' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(16, 185, 129, 0.22)' : '1px solid rgba(15, 23, 42, 0.08)';
  const subtleBg = isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  const originHub = HUB_NODES[routeData.originKey] || HUB_NODES.catlai;
  const destHub = HUB_NODES[routeData.destKey] || HUB_NODES.songthan;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgPage,
        color: textMain,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          1. PROFESSIONAL CABIN COMMAND HEADER (DRIVER TERMINAL OS v3.2)
      ════════════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: isDark ? 'rgba(4, 15, 12, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(18px)',
          borderBottom: isDark
            ? '1px solid rgba(16, 185, 129, 0.25)'
            : '1px solid rgba(15, 23, 42, 0.1)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 4px 20px rgba(15,23,42,0.06)'
        }}
      >
        {/* Left: Cabin OS Branding & Role Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CcadroLogo size={36} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '1.02rem', letterSpacing: '-0.02em' }}>
                  CCADRO CABIN OS
                </span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.4)'
                  }}
                >
                  DRIVER TERMINAL
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted }}>
                Khoang Lái Nội Bộ • Kết Nối Container & Hành Lang Xanh
              </div>
            </div>
          </div>

          {user?.role !== 'DRIVER' && (
            <button
              type="button"
              onClick={() => navigate('/portal')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 11px',
                borderRadius: 8,
                border: cardBorder,
                background: subtleBg,
                color: textMain,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <LayoutDashboard size={14} color="#38bdf8" />
              <span>Về NOC Console</span>
            </button>
          )}
        </div>

        {/* Center: Live Telemetry, DB Sync & Hours-of-Service Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          {/* DB Real-Time Sync Indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              borderRadius: 999,
              background:
                dbStatus === 'LIVE_DB'
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(245, 158, 11, 0.14)',
              border:
                dbStatus === 'LIVE_DB'
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(245, 158, 11, 0.4)',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: dbStatus === 'LIVE_DB' ? '#10b981' : '#f59e0b'
            }}
          >
            <Database size={13} />
            <span>
              {dbStatus === 'LIVE_DB' ? 'PostgreSQL DB: SYNCED' : 'Local Cache Mode'} •{' '}
              {lastSyncTime}
            </span>
            <button
              type="button"
              onClick={loadFromBackend}
              title="Đồng bộ lại từ PostgreSQL"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: 2
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Shift / Driving Timer Pill */}
          <button
            type="button"
            onClick={() => setShiftStatus((s) => (s === 'IN_SHIFT' ? 'REST' : 'IN_SHIFT'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 13px',
              borderRadius: 999,
              border:
                shiftStatus === 'IN_SHIFT'
                  ? '1px solid rgba(56, 189, 248, 0.45)'
                  : '1px solid rgba(148, 163, 184, 0.3)',
              background:
                shiftStatus === 'IN_SHIFT'
                  ? 'rgba(56, 189, 248, 0.14)'
                  : 'rgba(148, 163, 184, 0.12)',
              color: shiftStatus === 'IN_SHIFT' ? '#38bdf8' : textMuted,
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <span
              className="radar-dot"
              style={{
                width: 7,
                height: 7,
                backgroundColor: shiftStatus === 'IN_SHIFT' ? '#38bdf8' : '#94a3b8'
              }}
            />
            <span>
              {shiftStatus === 'IN_SHIFT' ? 'ĐANG TRONG CA LÁI (02h14m / 4h)' : 'ĐANG NGHỈ GIẢI LAO'}
            </span>
          </button>
        </div>

        {/* Right: SOS Alert Trigger, Theme Toggle & Driver Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSosTrigger}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #ef4444',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
            }}
          >
            <AlertOctagon size={15} />
            <span>SOS KHẨN CẤP</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Đổi giao diện"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: cardBorder,
              background: subtleBg,
              color: textMain,
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
              gap: 9,
              padding: '5px 12px',
              borderRadius: 999,
              background: subtleBg,
              border: cardBorder
            }}
          >
            <UserCheck size={15} color="#10b981" />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                {user?.fullName || activeContainer?.driverName || 'Nguyễn Văn Tài'}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#10b981', fontWeight: 700 }}>
                GPLX Hạng FC • {activeContainer?.driverSafetyScore || 4.95}★ • 0/20 Demerit
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất ca trực"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════════
          2. SUB-HEADER: WORKFLOW TABS & ACTIVE CONTAINER SELECTOR
      ════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: cardBorder,
          background: isDark ? 'rgba(6, 20, 16, 0.6)' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        {/* 4 Functional Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'mission', label: '1. Nhiệm Vụ & Smart Container', icon: Package },
            { id: 'inspection', label: '2. Kiểm Tra 6 Điểm (UC03)', icon: ShieldCheck },
            { id: 'navigation', label: '3. Dẫn Đường 3D & Eco-HUD', icon: Navigation },
            { id: 'epod', label: '4. Ký Nhận ePOD & Sự Cố', icon: FileCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 15px',
                  borderRadius: 10,
                  border: active ? '1px solid #10b981' : cardBorder,
                  background: active
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.14))'
                    : subtleBg,
                  color: active ? '#10b981' : textMain,
                  fontSize: '0.82rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Container Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.76rem', color: textMuted, fontWeight: 700 }}>
            Container đang kéo:
          </span>
          <select
            value={activeContainer?.containerCode || ''}
            onChange={(e) => setSelectedCode(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(16, 185, 129, 0.45)',
              background: isDark ? '#071a14' : '#ffffff',
              color: textMain,
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {containers.map((c) => (
              <option key={c.containerCode} value={c.containerCode}>
                {c.containerCode} • {c.vehicleLicensePlate || '51C-888.99'} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3. WORKSPACE BODY
      ════════════════════════════════════════════════════════════════════════ */}
      <main style={{ padding: '20px 24px 60px', maxWidth: 1480, width: '100%', margin: '0 auto' }}>
        {banner && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              marginBottom: 18,
              background:
                banner.type === 'warning'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : banner.type === 'info'
                    ? 'rgba(56, 189, 248, 0.15)'
                    : 'rgba(16, 185, 129, 0.16)',
              border:
                banner.type === 'warning'
                  ? '1px solid #ef4444'
                  : banner.type === 'info'
                    ? '1px solid #38bdf8'
                    : '1px solid #10b981',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <span>
              [{banner.at}] {banner.text}
            </span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 900
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 1: MISSION & SMART CONTAINER TELEMETRY COCKPIT
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'mission' && activeContainer && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Top Summary Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14
              }}
            >
              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700 }}>
                  MÃ CONTAINER ISO 6346
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>
                  {activeContainer.containerCode}
                </div>
                <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: 4 }}>
                  Loại {activeContainer.isoType} • {activeContainer.ownerName}
                </div>
              </div>

              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700 }}>
                  KHÓA SEAL HẢI QUAN (ISO 17712)
                </div>
                <div
                  style={{
                    fontSize: '1.18rem',
                    fontWeight: 900,
                    color:
                      activeContainer.eSealStatus === 'LOCKED_SECURE' ? '#10b981' : '#f59e0b',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {activeContainer.eSealStatus === 'LOCKED_SECURE' ? (
                    <Lock size={18} />
                  ) : (
                    <Unlock size={18} />
                  )}
                  <span>{activeContainer.eSealNumber || 'VN-CUST-819204'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: 4 }}>
                  Trạng thái: {activeContainer.eSealStatus} ({activeContainer.eSealIntegrityPct || 100}%)
                </div>
              </div>

              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700 }}>
                  CHUỖI LẠNH & CẢM BIẾN SỐC
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: activeContainer.isReefer ? '#38bdf8' : '#a855f7',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Thermometer size={18} />
                  <span>{activeContainer.supplyAirTempC}°C</span>
                  <span style={{ fontSize: '0.82rem', color: textMuted }}>
                    / {activeContainer.shockG} G
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: 4 }}>
                  Độ ẩm {activeContainer.humidityPct}% • Pin IoT {activeContainer.batteryPct}%
                </div>
              </div>

              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700 }}>
                  TIẾN ĐỘ & VẬN ĐƠN GẮN KÈM
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', marginTop: 4 }}>
                  {Math.round(Number(activeContainer.progressPct) || 0)}% •{' '}
                  <span style={{ fontSize: '0.95rem' }}>{activeContainer.etaMinutes || 0} phút</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: 4 }}>
                  Vận đơn {activeContainer.assignedShipmentCode} • {activeContainer.status}
                </div>
              </div>
            </div>

            {/* Detailed 2-Column Cockpit */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: 20
              }}
            >
              {/* Left: Route & Vehicle Assignment */}
              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 16,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
                    Lệnh Điều Xe & Tuyến Hành Lang Xanh
                  </h2>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background:
                        activeContainer.status === 'DELIVERED'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(56, 189, 248, 0.18)',
                      color: activeContainer.status === 'DELIVERED' ? '#10b981' : '#38bdf8'
                    }}
                  >
                    {activeContainer.status}
                  </span>
                </div>

                {/* Origin -> Destination Box */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: subtleBg,
                    border: cardBorder,
                    display: 'grid',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MapPin size={18} color="#10b981" style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                        ĐIỂM LẤY CONTAINER (ORIGIN)
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                        {activeContainer.originName}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Compass size={18} color="#f59e0b" style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                        ĐIỂM HẠ BÃI / TRẢ HÀNG (DESTINATION)
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                        {activeContainer.destinationName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      marginBottom: 6
                    }}
                  >
                    <span style={{ color: textMuted }}>Vị trí cập nhật GPS mới nhất</span>
                    <strong style={{ color: '#10b981' }}>
                      {Number(activeContainer.progressPct || 0).toFixed(1)}%
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: isDark ? '#0f172a' : '#e2e8f0',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Number(activeContainer.progressPct) || 0)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981, #38bdf8)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: 6 }}>
                    📍 {activeContainer.lastLocationName || 'Đang chờ tín hiệu GPS...'}
                  </div>
                </div>

                {/* Prime Mover Details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>ĐẦU KÉO PHỤ TRÁCH</div>
                    <strong style={{ fontSize: '0.95rem' }}>
                      {activeContainer.vehicleLicensePlate || '51C-888.99'}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 2 }}>
                      {activeContainer.vehicleTypeLabel || 'BEV Heavy-Duty 40T'}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>TẢI TRỌNG CONTAINER</div>
                    <strong style={{ fontSize: '0.95rem' }}>
                      {activeContainer.tareWeightTons}T / Max {activeContainer.maxPayloadTons}T
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 2 }}>
                      Thể tích {activeContainer.cubicCapacityM3} m³
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Telemetry Stream Controls to PostgreSQL */}
              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 16,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0 0 6px' }}>
                    Thiết Bị Viễn Thông IoT & Đồng Bộ DB Thời Gian Thực
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                    Thiết bị: <strong>{activeContainer.telematicsModel}</strong>. Mọi gói tin
                    Telemetry phát ra từ khoang lái đều được lưu xuống bảng <code>container</code>{' '}
                    trong PostgreSQL để Khách hàng (/customer) và Điều phối viên theo dõi trực tiếp.
                  </p>
                </div>

                {/* Live Sensor Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10
                  }}
                >
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>NHIỆT ĐỘ CẤP / HỒI</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                      {activeContainer.supplyAirTempC}°C / {activeContainer.returnAirTempC}°C
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>GIA TỐC RUNG LẮC</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
                      {activeContainer.shockG} G
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>PIN MẶT TRỜI IOT</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#eab308' }}>
                      {activeContainer.solarPowerWatts}W ({activeContainer.batteryPct}%)
                    </div>
                  </div>
                </div>

                {/* Telemetry Sync Controls */}
                <div style={{ display: 'grid', gap: 10 }}>
                  <button
                    type="button"
                    disabled={syncingTelemetry || activeContainer.status === 'DELIVERED'}
                    onClick={() => pushTelemetryToDb()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: 'none',
                      background:
                        activeContainer.status === 'DELIVERED'
                          ? '#475569'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                      color: activeContainer.status === 'DELIVERED' ? '#cbd5e1' : '#042f2e',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: activeContainer.status === 'DELIVERED' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Radio size={16} />
                    <span>
                      {syncingTelemetry
                        ? 'Đang ghi Telemetry vào DB...'
                        : 'Cập Nhật & Lưu Telemetry Bước Tiếp Theo Xuống DB'}
                    </span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      disabled={activeContainer.status === 'DELIVERED'}
                      onClick={() => setAutoStream((v) => !v)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: autoStream
                          ? '1px solid #38bdf8'
                          : cardBorder,
                        background: autoStream ? 'rgba(56, 189, 248, 0.16)' : subtleBg,
                        color: autoStream ? '#38bdf8' : textMain,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {autoStream ? <Pause size={15} /> : <Play size={15} />}
                      <span>{autoStream ? 'Tạm dừng Auto Stream (5s)' : 'Bật Live Stream DB (5s)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('navigation')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: cardBorder,
                        background: subtleBg,
                        color: textMain,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Navigation size={15} color="#10b981" />
                      <span>Mở Bản Đồ Dẫn Đường 3D</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 2: PRE-TRIP 6-POINT SAFETY INSPECTION (UC03 / BRULE-01)
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'inspection' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: 16,
                padding: 24
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 18
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    Biên Bản Kiểm Tra An Toàn 6 Hạng Mục Trước Chuyến (UC03 • BRULE-01)
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: textMuted, margin: '4px 0 0' }}>
                    Quy tắc bắt buộc: Tài xế phải xác nhận 6/6 điểm an toàn cho đầu kéo{' '}
                    <strong>{activeContainer?.vehicleLicensePlate || '51C-888.99'}</strong> và
                    container <strong>{activeContainer?.containerCode}</strong> trước khi xuất bến.
                  </p>
                </div>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    fontSize: '0.76rem',
                    fontWeight: 800
                  }}
                >
                  Đạt {Object.values(checklist).filter(Boolean).length} / 6 hạng mục
                </span>
              </div>

              <form onSubmit={handleInspectionSubmit} style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 12
                  }}
                >
                  {PRE_TRIP_ITEMS.map((item) => {
                    const passed = checklist[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() =>
                          setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                        }
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          border: passed
                            ? '1px solid rgba(16, 185, 129, 0.5)'
                            : '1px solid rgba(239, 68, 68, 0.55)',
                          background: passed
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'rgba(239, 68, 68, 0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>{item.title}</div>
                          <div style={{ fontSize: '0.74rem', color: textMuted, marginTop: 3 }}>
                            {item.spec}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: passed ? '#10b981' : '#ef4444',
                            color: passed ? '#042f2e' : '#ffffff',
                            flexShrink: 0
                          }}
                        >
                          {passed ? '✓ ĐẠT' : '✕ LỖI'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: textMuted,
                      marginBottom: 6
                    }}
                  >
                    Ghi chú kỹ thuật của Tài xế trước khi rời bãi
                  </label>
                  <input
                    type="text"
                    value={inspectionRemarks}
                    onChange={(e) => setInspectionRemarks(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: cardBorder,
                      background: subtleBg,
                      color: textMain,
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={submittingInspection}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#042f2e',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <ShieldCheck size={18} />
                    <span>
                      {submittingInspection
                        ? 'Đang nộp hồ sơ về PostgreSQL...'
                        : 'Ký Nộp Biên Bản An Toàn & Xuất Bến'}
                    </span>
                  </button>

                  {inspectionCert && (
                    <div
                      style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        background: inspectionCert.passed
                          ? 'rgba(16, 185, 129, 0.16)'
                          : 'rgba(239, 68, 68, 0.16)',
                        border: inspectionCert.passed
                          ? '1px solid #10b981'
                          : '1px solid #ef4444',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      {inspectionCert.passed ? '✓ ĐƯỢC PHÉP XUẤT BẾN' : '✕ TỪ CHỐI XUẤT BẾN'} • Mã:{' '}
                      <code>{inspectionCert.code}</code> ({inspectionCert.timestamp})
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 3: 3D CABIN NAVIGATION & ECO-DRIVING HUD (UC09 / UC10)
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'navigation' && activeContainer && (
          <div style={{ display: 'grid', gap: 18 }}>
            {/* Top Cabin Speed & Eco-Driving Telemetry Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}
            >
              <div style={{ background: cardBg, border: cardBorder, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                  TỐC ĐỘ HIỆN TẠI (OBD-II)
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: 2 }}>
                  {Math.round(Number(activeContainer.speedKmh) || 52)} <span style={{ fontSize: '0.8rem' }}>km/h</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Khuyến nghị Eco-Speed: 55 km/h
                </div>
              </div>

              <div style={{ background: cardBg, border: cardBorder, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                  PHANH TÁI SINH NĂNG LƯỢNG
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: 2 }}>
                  +14.2 <span style={{ fontSize: '0.8rem' }}>kW</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Tiết kiệm 0.14 kg CO2e/km
                </div>
              </div>

              <div style={{ background: cardBg, border: cardBorder, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                  HÀNH LANG ĐỆM (BUFFER UC09)
                </div>
                <div
                  style={{
                    fontSize: '1.18rem',
                    fontWeight: 900,
                    color: deviationSim ? '#ef4444' : '#10b981',
                    marginTop: 4
                  }}
                >
                  {deviationSim ? 'LỆCH TUYẾN 260m (ĐỎ)' : 'AN TOÀN TRONG VÙNG ĐỆM'}
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Ngưỡng: 50m Vàng • 200m Đỏ
                </div>
              </div>

              <div
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <button
                  type="button"
                  onClick={() => pushTelemetryToDb()}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10b981',
                    color: '#042f2e',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cập nhật vị trí & Lưu DB
                </button>
                <button
                  type="button"
                  onClick={() => setDeviationSim((d) => !d)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    background: deviationSim ? '#ef4444' : 'rgba(239, 68, 68, 0.12)',
                    color: deviationSim ? '#ffffff' : '#f87171',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {deviationSim ? 'Khôi phục về tuyến chuẩn' : 'Mô phỏng lệch tuyến 260m'}
                </button>
              </div>
            </div>

            {/* Dynamic Reroute Proposal Banner (UC10 Human-in-the-loop) */}
            {rerouteOfferActive && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: rerouteAccepted
                    ? 'rgba(16, 185, 129, 0.14)'
                    : 'rgba(245, 158, 11, 0.14)',
                  border: rerouteAccepted
                    ? '1px solid #10b981'
                    : '1px solid #f59e0b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertTriangle size={22} color={rerouteAccepted ? '#10b981' : '#f59e0b'} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                      {rerouteAccepted
                        ? 'ĐÃ KÍCH HOẠT LỘ TRÌNH XANH THAY THẾ (UC10 VERSION #2)'
                        : '[ĐỀ XUẤT ĐỔI TUYẾN ĐỘNG UC10] Phát hiện ùn tắc tại Ngã 4 Bình Thái'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: textMuted }}>
                      {rerouteAccepted
                        ? 'Điều phối viên NOC đã xác nhận lộ trình tránh kẹt xe. Tiết kiệm 14.2% CO2e.'
                        : 'Chuyển hướng qua Đường Vành Đai 2 → Rút ngắn 9 phút & Giảm 4.6 kg CO2e (Đạt chuẩn >= 10% lợi ích).'}
                    </div>
                  </div>
                </div>

                {!rerouteAccepted ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRerouteAccepted(true);
                        showToast('success', 'Đã chấp nhận lộ trình đổi tuyến UC10 & đồng bộ NOC!');
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#10b981',
                        color: '#042f2e',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Chấp Nhận Đổi Tuyến
                    </button>
                    <button
                      type="button"
                      onClick={() => setRerouteOfferActive(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: cardBorder,
                        background: subtleBg,
                        color: textMain,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Giữ Tuyến Cũ
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.8rem' }}>
                    ✓ Đang dẫn đường tuyến #2
                  </span>
                )}
              </div>
            )}

            {/* Real 3D MapView */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: cardBorder }}>
              <MapView
                center={currentCoords}
                zoom={12}
                focusPosition={currentCoords}
                focusZoom={14}
                defaultLayer="google_hybrid"
                default3D={true}
                height={520}
                hudTitle={`CABIN 3D HUD • ${activeContainer.containerCode} (${activeContainer.vehicleLicensePlate || '51C-888.99'})`}
                hudSubtitle={`${activeContainer.originName} → ${activeContainer.destinationName} • ${Math.round(Number(activeContainer.progressPct) || 0)}% hoàn thành`}
              >
                <OriginMarker
                  position={routeData.points[0] || originHub.coords}
                  title={originHub.label}
                  label={originHub.label}
                />
                <DestinationMarker
                  position={routeData.points[routeData.points.length - 1] || destHub.coords}
                  title={destHub.label}
                  label={destHub.label}
                />
                <RoutePolyline
                  positions={routeData.points}
                  color={rerouteAccepted ? '#0ea5e9' : '#10b981'}
                  weight={6}
                  showCorridorBuffer={true}
                />
                <VehicleMarker
                  position={currentCoords}
                  title={activeContainer.vehicleLicensePlate || '51C-888.99'}
                  heading={330}
                  speedKmh={Math.round(Number(activeContainer.speedKmh) || 52)}
                  status={deviationSim ? 'DEVIATION' : 'ON_ROUTE'}
                  tempC={activeContainer.supplyAirTempC}
                />
                {deviationSim && (
                  <DeviationMarker position={currentCoords} distanceMeters={260} severity="RED" />
                )}
              </MapView>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 4: ELECTRONIC PROOF OF DELIVERY (ePOD) & INCIDENT REPORTING
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'epod' && activeContainer && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 20
            }}
          >
            {/* Left Card: ePOD Signature Pad (UC11) */}
            <div
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: 16,
                padding: 24
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <PenTool size={20} color="#10b981" />
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Ký Nhận Giao Hàng Điện Tử (ePOD - UC11)
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: textMuted, margin: '2px 0 0' }}>
                    Xác nhận bàn giao container <strong>{activeContainer.containerCode}</strong> tại{' '}
                    {activeContainer.destinationName}
                  </p>
                </div>
              </div>

              {activeContainer.status === 'DELIVERED' ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid #10b981',
                    display: 'grid',
                    gap: 8
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10b981' }}>
                    ✓ ĐÃ HOÀN TẤT BÀN GIAO HÀNG HÓA (DELIVERED)
                  </div>
                  <div style={{ fontSize: '0.84rem' }}>
                    Người ký nhận: <strong>{activeContainer.epodRecipient || epodRecipient}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: textMuted }}>
                    Mã xác thực chữ ký số: <code>{activeContainer.epodSignature || 'VERIFIED'}</code>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                    Khóa Seal Hải quan {activeContainer.eSealNumber}:{' '}
                    <strong>{activeContainer.eSealStatus}</strong>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEpodSubmit} style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: textMuted,
                        marginBottom: 6
                      }}
                    >
                      Họ tên Thủ kho / Người nhận hàng tại đích
                    </label>
                    <input
                      type="text"
                      required
                      value={epodRecipient}
                      onChange={(e) => setEpodRecipient(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: cardBorder,
                        background: subtleBg,
                        color: textMain,
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
                        color: textMuted,
                        marginBottom: 6
                      }}
                    >
                      Ghi chú tình trạng Seal & Nhiệt độ khi hạ bãi
                    </label>
                    <input
                      type="text"
                      value={epodNotes}
                      onChange={(e) => setEpodNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: cardBorder,
                        background: subtleBg,
                        color: textMain,
                        fontSize: '0.86rem'
                      }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6
                      }}
                    >
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: textMuted }}>
                        Bảng ký tay điện tử (Ký bằng chuột hoặc cảm ứng)
                      </label>
                      <button
                        type="button"
                        onClick={clearSignature}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Xóa ký lại
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={460}
                      height={150}
                      onMouseDown={startDrawing}
                      onMouseMove={drawMove}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={drawMove}
                      onTouchEnd={stopDrawing}
                      style={{
                        width: '100%',
                        height: 150,
                        borderRadius: 12,
                        border: '1px dashed rgba(16, 185, 129, 0.5)',
                        background: isDark ? '#04120e' : '#f8fafc',
                        cursor: 'crosshair',
                        touchAction: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingEpod}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#042f2e',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      {submittingEpod
                        ? 'Đang lưu ePOD vào PostgreSQL...'
                        : 'Xác Nhận Giao Hàng & Mở Khóa Seal (Lưu DB)'}
                    </span>
                  </button>
                </form>
              )}
            </div>

            {/* Right Card: Emergency Field Incident Reporting (UC16) */}
            <div
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: 16,
                padding: 24
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <ShieldAlert size={20} color="#ef4444" />
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Báo Cáo Sự Cố Hiện Trường (UC16)
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: textMuted, margin: '2px 0 0' }}>
                    Gửi báo cáo trực tiếp về Phòng Điều Hành NOC & Trưởng Ban An Toàn
                  </p>
                </div>
              </div>

              <form onSubmit={handleIncidentSubmit} style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: textMuted,
                      marginBottom: 6
                    }}
                  >
                    Loại sự cố hiện trường
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: cardBorder,
                      background: subtleBg,
                      color: textMain,
                      fontSize: '0.86rem'
                    }}
                  >
                    <option value="TRAFFIC_CONGESTION">Ùn tắc giao thông nghiêm trọng / Phong tỏa làn</option>
                    <option value="REEFER_MALFUNCTION">Cảnh báo máy lạnh container tăng nhiệt</option>
                    <option value="ESEAL_TAMPER">Cảnh báo cạy mở / Lỗi khóa Seal Hải quan</option>
                    <option value="VEHICLE_BREAKDOWN">Sự cố kỹ thuật xe đầu kéo / Lốp xe</option>
                    <option value="ACCIDENT">Va chạm giao thông hiện trường</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: textMuted,
                      marginBottom: 6
                    }}
                  >
                    Mức độ khẩn cấp
                  </label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: cardBorder,
                      background: subtleBg,
                      color: textMain,
                      fontSize: '0.86rem'
                    }}
                  >
                    <option value="CRITICAL">CRITICAL • Khẩn cấp tuyệt đối (Yêu cầu ứng cứu ngay)</option>
                    <option value="HIGH">HIGH • Nghiêm trọng (Cần đổi tuyến động UC10)</option>
                    <option value="MEDIUM">MEDIUM • Cảnh báo theo dõi</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: textMuted,
                      marginBottom: 6
                    }}
                  >
                    Mô tả hiện trường (Tự động đính kèm GPS {currentCoords[0].toFixed(4)},{' '}
                    {currentCoords[1].toFixed(4)})
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Nhập mô tả chi tiết tình trạng giao thông, container hoặc yêu cầu cứu hộ..."
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: cardBorder,
                      background: subtleBg,
                      color: textMain,
                      fontSize: '0.86rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingIncident}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>
                    {submittingIncident
                      ? 'Đang gửi báo cáo...'
                      : 'Gửi Báo Cáo Sự Cố Về Trung Tâm NOC'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
