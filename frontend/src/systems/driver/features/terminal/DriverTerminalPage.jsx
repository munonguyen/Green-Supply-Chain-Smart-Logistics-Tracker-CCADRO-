import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  FileCheck,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Moon,
  Navigation,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  PenTool,
  Play,
  Radio,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Sun,
  Thermometer,
  Truck,
  Unlock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { api } from '../../../../services/api';
import CcadroLogo from '../../../../shared/components/ui/CcadroLogo';
import CountingNumber from '../../../../shared/effects/CountingNumber';
import SidebarAccountCard from '../../../../shared/components/account/SidebarAccountCard';
import UserAccountMenu from '../../../../shared/components/account/UserAccountMenu';
import AccountSettingsModal from '../../../../shared/components/account/AccountSettingsModal';
import MessengerWorkspaceModal from '../../../../shared/chat/MessengerWorkspaceModal';
import RoleNotificationBell from '../../../../shared/notifications/RoleNotificationBell';
import { publishCrossRoleNotification } from '../../../../utils/roleNotificationSync';
import {
  getUnreadCountForViewer,
  loadChatThreadsMap,
  subscribeDriverChat
} from '../../../../utils/driverChatSync';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import VehicleMarker from '../../../../shared/map/VehicleMarker';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import DeviationMarker from '../../../../shared/map/DeviationMarker';
import RouteEvidence from '../../../../shared/map/RouteEvidence';
import {
  HUB_NODES,
  calculateTelemetry,
  computeBearingDegrees,
  evaluateDestinationArrival,
  extractGeoJsonLineStringPoints,
  fetchLiveOsrmRoute,
  getRealRoadRoute,
  interpolateRoadPosition,
  measurePolylineDistanceKm
} from '../../../../services/roadRoutingService';



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

const DRIVER_SIDEBAR_SECTIONS = [
  {
    group: 'Tổng Quan & Khoang Lái',
    items: [
      { id: 'overview', label: 'Tổng Quan Khoang Lái', short: 'Tổng Quan', icon: LayoutDashboard },
      { id: 'mission', label: 'Nhiệm Vụ & Container', short: 'Nhiệm Vụ', icon: Package },
      { id: 'inspection', label: 'Kiểm Tra 6 Điểm', short: 'Khám xe Pre-Trip', icon: ShieldCheck }
    ]
  },
  {
    group: 'Định Tuyến & Hiện Trường',
    items: [
      { id: 'navigation', label: 'Dẫn Đường 3D & Điểm Đích', short: 'Bản Đồ 3D', icon: Navigation },
      { id: 'epod', label: 'Ký Nhận ePOD & Báo Cáo Sự Cố', short: 'ePOD & Sự Cố', icon: FileCheck }
    ]
  },
  {
    group: 'Hồ Sơ & Giao Tiếp',
    items: [
      { id: 'dossier', label: 'Hồ Sơ GPLX, HOS & Đánh Giá', short: 'Hồ Sơ HOS', icon: Award },
      { id: 'chat', label: 'Tin Nhắn Điều Phối & Chủ Hàng', short: 'Tin Nhắn', icon: MessageSquare }
    ]
  }
];

export default function DriverTerminalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Unified Admin-style collapsible sidebar + mobile drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  // Active workspace tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'mission' | 'inspection' | 'navigation' | 'epod' | 'dossier' | 'chat'
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const selectDriverTab = useCallback((tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Two-way Grab / Xanh SM Customer Chat state
  const [chatThreads, setChatThreads] = useState(() => loadChatThreadsMap());
  const [driverProfilesList, setDriverProfilesList] = useState([]);
  const [activeChatDriverCode, setActiveChatDriverCode] = useState('');

  // Container fleet & DB synchronization state
  const [containers, setContainers] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [dbStatus, setDbStatus] = useState('CONNECTING'); // 'LIVE_DB' | 'LOCAL_FALLBACK' | 'CONNECTING'
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString('vi-VN'));
  const [syncingTelemetry, setSyncingTelemetry] = useState(false);

  // Driver profile isolation & real Trip / Route synchronization
  const [myDriverProfile, setMyDriverProfile] = useState(null);
  const [assignedVehicles, setAssignedVehicles] = useState([]);
  const [driverReviews, setDriverReviews] = useState([]);
  const [liveFleetSnapshots, setLiveFleetSnapshots] = useState([]);
  const [backendTrips, setBackendTrips] = useState([]);
  const [backendRoutePoints, setBackendRoutePoints] = useState([]);
  const [backendRouteMetadataJson, setBackendRouteMetadataJson] = useState(null);
  const [routeSourceLabel, setRouteSourceLabel] = useState('OSRM_CORRIDOR_CACHE');
  const [recordedTrail, setRecordedTrail] = useState([]);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [hardwareGpsActive, setHardwareGpsActive] = useState(false);

  // Driver shift & live telemetry stream
  const [shiftStatus, setShiftStatus] = useState('IN_SHIFT'); // 'IN_SHIFT' | 'REST'
  const [autoStream, setAutoStream] = useState(false);
  const [rerouteOfferActive, setRerouteOfferActive] = useState(false);
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
  const [startingTrip, setStartingTrip] = useState(false);
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
  const showToast = useCallback((type, text) => {
    setBanner({ type, text, at: new Date().toLocaleTimeString('vi-VN') });
  }, []);

  const loadFromBackend = useCallback(async () => {
    const rowsOf = (result) => {
      const payload = result?.value?.result ?? result?.value?.data ?? result?.value;
      return Array.isArray(payload) ? payload : [];
    };
    try {
      const profile = await api.getMyDriverProfile();
      const driver = profile?.result ?? profile?.data;
      if (!driver?.id) throw new Error('Tài khoản chưa liên kết hồ sơ tài xế');
      setMyDriverProfile(driver);
      setDriverProfilesList([{ driverCode: driver.driverCode, fullName: driver.fullName, backendId: driver.id }]);
      setShiftStatus(driver.status === 'INACTIVE' ? 'REST' : 'IN_SHIFT');
      const [containerResult, vehicleResult, liveResult, tripResult, reviewResult] = await Promise.allSettled([
        api.getContainers({ driverId: driver.id }),
        api.getVehicles(),
        api.getLiveFleetTelemetry({ driverId: driver.id }),
        api.getTrips({ driverId: driver.id }),
        api.getDriverReviews(driver.id)
      ]);
      const trips = rowsOf(tripResult).filter((trip) => trip.driverId === driver.id);
      const scopedContainers = rowsOf(containerResult).filter((container) => container.assignedDriverId === driver.id);
      setContainers(scopedContainers);
      setSelectedCode((value) => scopedContainers.some((container) => container.containerCode === value)
        ? value : scopedContainers[0]?.containerCode || '');
      setBackendTrips(trips);
      setAssignedVehicles(rowsOf(vehicleResult));
      setLiveFleetSnapshots(rowsOf(liveResult).filter((snapshot) => snapshot.driverId === driver.id));
      setDriverReviews(rowsOf(reviewResult));
      setDbStatus(tripResult.status === 'fulfilled' ? 'LIVE_DB' : 'UNAVAILABLE');
      setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      setMyDriverProfile(null);
      setDriverProfilesList([]);
      setContainers([]);
      setBackendTrips([]);
      setLiveFleetSnapshots([]);
      setDbStatus('UNAVAILABLE');
    }
  }, []);

  useEffect(() => {
    loadFromBackend();
    const unsubChat = subscribeDriverChat(() => {
      setChatThreads(loadChatThreadsMap());
    });
    return () => unsubChat();
  }, [loadFromBackend]);

  const activeContainer = useMemo(() => {
    return containers.find((c) => c.containerCode === selectedCode) || containers[0];
  }, [containers, selectedCode]);

  const activeLiveSnapshot = useMemo(() => {
    if (!activeContainer || !Array.isArray(liveFleetSnapshots)) return null;
    return (
      liveFleetSnapshots.find(
        (s) =>
          (s.containerCode && s.containerCode === activeContainer.containerCode) ||
          (activeContainer.assignedShipmentId &&
            s.shipmentId === activeContainer.assignedShipmentId) ||
          (activeContainer.assignedShipmentCode &&
            s.shipmentCode === activeContainer.assignedShipmentCode)
      ) ||
      (myDriverProfile?.id
        ? liveFleetSnapshots.find((s) => s.driverId === myDriverProfile.id)
        : null) ||
      null
    );
  }, [activeContainer, liveFleetSnapshots, myDriverProfile?.id]);

  const activeTrip = useMemo(() => {
    if (!Array.isArray(backendTrips)) return null;
    if (activeLiveSnapshot?.tripId && activeLiveSnapshot?.dataSource !== 'CONTAINER_IOT_DB') {
      const bySnap = backendTrips.find((t) => t.id === activeLiveSnapshot.tripId);
      if (bySnap) return bySnap;
    }
    if (activeContainer?.assignedShipmentId) {
      const byShipment = backendTrips.find(
        (t) => t.shipmentId === activeContainer.assignedShipmentId
      );
      if (byShipment) return byShipment;
    }
    if (myDriverProfile?.id) {
      return backendTrips.find(
        (t) => t.driverId === myDriverProfile.id && t.status !== 'COMPLETED'
      ) || null;
    }
    return null;
  }, [backendTrips, activeLiveSnapshot, activeContainer?.assignedShipmentId, myDriverProfile?.id]);

  const activeTripId =
    activeTrip?.id ||
    (activeLiveSnapshot?.dataSource !== 'CONTAINER_IOT_DB' ? activeLiveSnapshot?.tripId : null) ||
    null;
  const activeShipmentId =
    activeContainer?.assignedShipmentId ||
    activeLiveSnapshot?.shipmentId ||
    activeTrip?.shipmentId ||
    null;
  const activeVehicleId =
    activeLiveSnapshot?.vehicleId ||
    activeTrip?.vehicleId ||
    activeContainer?.assignedVehicleId ||
    null;
  const activeDriverId =
    myDriverProfile?.id ||
    activeTrip?.driverId ||
    activeContainer?.assignedDriverId ||
    null;

  // Subscribe to real-time SSE tracking stream + fetch recorded GPS telemetry trail for activeTripId
  useEffect(() => {
    if (!activeTripId) {
      setRecordedTrail([]);
      return undefined;
    }
    api
      .getTripTelemetry(activeTripId)
      .then((res) => {
        const list = res?.result || res?.data || res;
        if (Array.isArray(list)) {
          setRecordedTrail(
            list
              .filter((t) => t.latitude != null && t.longitude != null)
              .map((t) => [Number(t.latitude), Number(t.longitude)])
          );
        }
      })
      .catch(() => {});

    const timer = window.setInterval(() => {
      api.getLiveTripTelemetry(activeTripId).then((response) => {
        const snapshot = response?.result ?? response?.data;
        if (snapshot?.tripId === activeTripId) {
          setLiveFleetSnapshots((previous) => [snapshot, ...previous.filter((item) => item.tripId !== activeTripId)]);
        }
      }).catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeTripId]);

  // Synchronize active chat thread with logged-in driver or container driver
  useEffect(() => {
    if (myDriverProfile?.driverCode) {
      setActiveChatDriverCode(myDriverProfile.driverCode);
      return;
    }
    if (!activeContainer?.driverName) return;
    const match = driverProfilesList.find(
      (d) => d.fullName.toLowerCase().trim() === activeContainer.driverName.toLowerCase().trim()
    );
    if (match) {
      setActiveChatDriverCode(match.driverCode);
    }
  }, [myDriverProfile?.driverCode, activeContainer?.driverName, driverProfilesList]);

  const unreadCustomerMessagesTotal = useMemo(
    () => getUnreadCountForViewer(chatThreads, 'DRIVER'),
    [chatThreads]
  );

  // Fallback road route from pre-baked corridor cache
  const fallbackRouteData = useMemo(() => {
    const keys = resolveCorridorKeys(
      activeContainer?.originName || activeLiveSnapshot?.originName,
      activeContainer?.destinationName || activeLiveSnapshot?.destinationName
    );
    return {
      ...keys,
      ...getRealRoadRoute(keys.originKey, keys.destKey)
    };
  }, [
    activeContainer?.originName,
    activeContainer?.destinationName,
    activeLiveSnapshot?.originName,
    activeLiveSnapshot?.destinationName
  ]);

  // Active trips use the approved route; OSRM previews are limited to unassigned screens.
  useEffect(() => {
    let cancelled = false;
    setBackendRoutePoints([]);
    setBackendRouteMetadataJson(null);
    setRouteSourceLabel('Chưa có tuyến chính thức');
    const snapPoints = extractGeoJsonLineStringPoints(activeLiveSnapshot?.routeWaypoints);
    if (snapPoints.length >= 2) {
      setBackendRoutePoints(snapPoints);
      setBackendRouteMetadataJson(activeLiveSnapshot?.routingMetadataJson || null);
      setRouteSourceLabel('POSTGIS_ROUTE_VERSION');
      return () => {
        cancelled = true;
      };
    }

    const resolveRoute = async () => {
      if (activeShipmentId) {
        try {
          const rvRes = await api.getActiveRouteVersion(activeShipmentId);
          const rv = rvRes?.result || rvRes?.data || rvRes;
          const pts = extractGeoJsonLineStringPoints(rv?.routeGeoJson || rv?.routeGeometry);
          if (!cancelled && pts.length >= 2) {
            setBackendRoutePoints(pts);
            setBackendRouteMetadataJson(rv?.routingMetadataJson || null);
            setRouteSourceLabel('POSTGIS_ROUTE_VERSION');
            return;
          }
        } catch {
          // An active trip must wait for its approved route.
        }
      }

      if (activeTripId) return;
      const oCoords =
        activeLiveSnapshot?.originLat != null && activeLiveSnapshot?.originLon != null
          ? [Number(activeLiveSnapshot.originLat), Number(activeLiveSnapshot.originLon)]
          : fallbackRouteData.points[0];
      const dCoords =
        activeLiveSnapshot?.destinationLat != null && activeLiveSnapshot?.destinationLon != null
          ? [Number(activeLiveSnapshot.destinationLat), Number(activeLiveSnapshot.destinationLon)]
          : fallbackRouteData.points[fallbackRouteData.points.length - 1];

      const osrmRes = await fetchLiveOsrmRoute(oCoords, dCoords);
      if (!cancelled && osrmRes?.points?.length >= 2) {
        setBackendRoutePoints(osrmRes.points);
        setBackendRouteMetadataJson(
          osrmRes.guidance?.length
            ? JSON.stringify({
                trafficSource: osrmRes.trafficSource || 'NOT_AVAILABLE',
                routeType: 'OSRM_PREVIEW',
                guidance: {
                  instructions: osrmRes.guidance.map((step) => ({
                    message: [step.maneuver?.type, step.maneuver?.modifier, step.name]
                      .filter(Boolean)
                      .join(' · '),
                    routeOffsetInMeters: step.distance ?? null
                  }))
                }
              })
            : null
        );
        setRouteSourceLabel('OSRM_LIVE');
      } else if (!cancelled) {
        setBackendRoutePoints([]);
        setBackendRouteMetadataJson(null);
        setRouteSourceLabel('OSRM_CORRIDOR_CACHE');
      }
    };

    resolveRoute();
    return () => {
      cancelled = true;
    };
  }, [
    activeShipmentId,
    activeTripId,
    activeLiveSnapshot?.routeWaypoints,
    activeLiveSnapshot?.routingMetadataJson,
    activeLiveSnapshot?.originLat,
    activeLiveSnapshot?.originLon,
    activeLiveSnapshot?.destinationLat,
    activeLiveSnapshot?.destinationLon,
    fallbackRouteData.points
  ]);

  const routeData = useMemo(() => {
    if (backendRoutePoints.length >= 2) {
      const distanceKm =
        activeLiveSnapshot?.totalDistanceKm ?? measurePolylineDistanceKm(backendRoutePoints);
      return {
        ...fallbackRouteData,
        points: backendRoutePoints,
        distanceKm: distanceKm || fallbackRouteData.distanceKm,
        source: routeSourceLabel,
        routingMetadataJson: backendRouteMetadataJson
      };
    }
    return {
      ...fallbackRouteData,
      points: activeTripId ? [] : fallbackRouteData.points,
      source: activeTripId ? 'Chưa có tuyến chính thức' : 'Hành lang tham khảo',
      routingMetadataJson: null
    };
  }, [
    backendRoutePoints,
    backendRouteMetadataJson,
    activeTripId,
    activeLiveSnapshot?.totalDistanceKm,
    fallbackRouteData,
    routeSourceLabel
  ]);

  const currentCoords = useMemo(() => {
    if (activeTripId && !deviationSim) {
      if (activeLiveSnapshot?.latitude != null && activeLiveSnapshot?.longitude != null)
        return [Number(activeLiveSnapshot.latitude), Number(activeLiveSnapshot.longitude)];
      if (activeContainer?.lastLatitude != null && activeContainer?.lastLongitude != null)
        return [Number(activeContainer.lastLatitude), Number(activeContainer.lastLongitude)];
      return null;
    }
    if (deviationSim) {
      return [10.8585, 106.7625];
    }
    if (activeContainer?.lastLatitude && activeContainer?.lastLongitude && !autoStream) {
      return [Number(activeContainer.lastLatitude), Number(activeContainer.lastLongitude)];
    }
    return interpolateRoadPosition(routeData.points, activeContainer?.progressPct || 0);
  }, [activeContainer, activeTripId, activeLiveSnapshot?.latitude, activeLiveSnapshot?.longitude, routeData.points, autoStream, deviationSim]);

  const destinationCoords = useMemo(() => {
    if (
      activeLiveSnapshot?.destinationLat != null &&
      activeLiveSnapshot?.destinationLon != null
    ) {
      return [
        Number(activeLiveSnapshot.destinationLat),
        Number(activeLiveSnapshot.destinationLon)
      ];
    }
    if (routeData.points && routeData.points.length > 0) {
      return routeData.points[routeData.points.length - 1];
    }
    if (activeTripId) return null;
    const hub = HUB_NODES[fallbackRouteData.destKey];
    return hub?.coords || [10.9242, 106.7145];
  }, [
    activeLiveSnapshot?.destinationLat,
    activeLiveSnapshot?.destinationLon,
    routeData.points,
    fallbackRouteData.destKey,
    activeTripId
  ]);

  const arrivalStatusInfo = useMemo(() => {
    const computed = evaluateDestinationArrival(currentCoords, destinationCoords, {
      arrivalRadiusMeters: activeLiveSnapshot?.arrivalRadiusMeters ?? 250,
      isDelivered:
        activeContainer?.status === 'DELIVERED' ||
        activeTrip?.status === 'COMPLETED' ||
        activeLiveSnapshot?.arrivalStatus === 'DELIVERED',
      progressPct: activeContainer?.progressPct
    });
    const serverDist = activeLiveSnapshot?.distanceToDestinationMeters;
    const distMeters = serverDist != null && !autoStream ? serverDist : computed.distanceMeters;
    const arrived =
      activeContainer?.status === 'DELIVERED' ||
      activeTrip?.status === 'COMPLETED' ||
      (autoStream ? computed.arrived : activeLiveSnapshot?.arrivedAtDestination ?? computed.arrived);
    const status =
      activeContainer?.status === 'DELIVERED' || activeTrip?.status === 'COMPLETED'
        ? 'DELIVERED'
        : autoStream
          ? computed.status
          : activeLiveSnapshot?.arrivalStatus || computed.status;
    return {
      ...computed,
      distanceMeters: distMeters,
      distanceKm: distMeters != null ? Number((distMeters / 1000).toFixed(2)) : computed.distanceKm,
      arrived,
      status,
      arrivedAt: activeLiveSnapshot?.arrivedAt || activeTrip?.arrivedAt || null
    };
  }, [
    currentCoords,
    destinationCoords,
    activeLiveSnapshot,
    activeContainer?.status,
    activeContainer?.progressPct,
    activeTrip?.status,
    activeTrip?.arrivedAt,
    autoStream
  ]);

  // Persist telemetry to PostgreSQL DB (`PUT /api/v1/assets/containers/{code}/telemetry` + `POST /api/v1/tracking/telemetry`)
  const pushTelemetryToDb = useCallback(
    async (overrideProgress = null, customGps = null) => {
      if (!activeContainer) return;
      if (activeTripId && !customGps) {
        showToast('warning', 'Chuyến thực cần tọa độ GPS thiết bị; không gửi điểm mô phỏng theo tiến độ vào dữ liệu vận hành.');
        return;
      }
      setSyncingTelemetry(true);

      const prevProgress = Number(activeContainer.progressPct) || 0;
      const nextProgress = customGps
        ? Math.min(100, Math.max(prevProgress, Number(activeContainer.progressPct) || 0))
        : overrideProgress !== null
          ? overrideProgress
          : Math.min(100, Number((prevProgress + 5.0).toFixed(1)));

      const pos = customGps
        ? [Number(customGps.latitude), Number(customGps.longitude)]
        : interpolateRoadPosition(routeData.points, nextProgress);

      const prevCoords =
        activeContainer.lastLatitude != null && activeContainer.lastLongitude != null
          ? [Number(activeContainer.lastLatitude), Number(activeContainer.lastLongitude)]
          : routeData.points[0] || pos;
      const computedHeading =
        customGps?.heading != null && Number.isFinite(Number(customGps.heading))
          ? Math.round(Number(customGps.heading))
          : computeBearingDegrees(prevCoords[0], prevCoords[1], pos[0], pos[1]);
      setCurrentHeading(computedHeading);

      const nextSpeed = customGps
        ? customGps.speedKmh != null ? Number(customGps.speedKmh) : null
        : deviationSim
          ? 38.0
          : nextProgress >= 100
            ? 0.0
            : Number(activeContainer.speedKmh || 52.0);
      const metrics = calculateTelemetry(routeData.distanceKm || 28.9, nextProgress, nextSpeed);
      const arrivalCheck = evaluateDestinationArrival(pos, destinationCoords, {
        arrivalRadiusMeters: 250,
        progressPct: nextProgress
      });
      const finalProgress = customGps
        ? arrivalCheck.arrived
          ? 100
          : nextProgress
        : nextProgress;

      const nextTempSupply = activeContainer.isReefer
        ? Number(activeContainer.supplyAirTempC ?? -18.4)
        : Number(activeContainer.supplyAirTempC ?? 26.5);
      const nextTempReturn = Number((nextTempSupply + 0.5).toFixed(1));
      const nextShock = deviationSim ? 0.68 : Number(activeContainer.shockG ?? 0.22);
      const nextLocation = deviationSim
        ? 'CẢNH BÁO: Lệch khỏi hành lang 260m • Cầu vượt Thủ Đức'
        : arrivalCheck.arrived
          ? `ĐÃ TỚI ĐIỂM GIAO (${activeContainer.destinationName}) • Cách đích ${arrivalCheck.distanceMeters ?? 0}m`
          : `Tuyến xanh KM ${metrics.traveledKm}/${routeData.distanceKm} • Tốc độ ${nextSpeed} km/h`;

      const telemetryPayload = customGps ? {
        lastLatitude: pos[0],
        lastLongitude: pos[1],
        lastLocationName: 'Vị trí ghi nhận từ GPS thiết bị',
        ...(nextSpeed != null ? { speedKmh: nextSpeed } : {})
      } : {
        lastLatitude: pos[0],
        lastLongitude: pos[1],
        lastLocationName: nextLocation,
        progressPct: finalProgress,
        speedKmh: nextSpeed,
        etaMinutes: arrivalCheck.arrived ? 0 : metrics.remainingMinutes,
        supplyAirTempC: nextTempSupply,
        returnAirTempC: nextTempReturn,
        humidityPct: activeContainer.humidityPct || 88.0,
        shockG: nextShock,
        solarPowerWatts: Number(activeContainer.solarPowerWatts ?? 42.0),
        batteryPct: Number(activeContainer.batteryPct ?? 96),
        eSealStatus: activeContainer.eSealStatus || 'LOCKED_SECURE',
        eSealIntegrityPct: 100
      };

      setContainers((prev) =>
        prev.map((c) =>
          c.containerCode === activeContainer.containerCode ? { ...c, ...telemetryPayload } : c
        )
      );
      setRecordedTrail((prev) => [...prev.slice(-199), pos]);

      try {
        const requests = [
          api.updateContainerTelemetry(activeContainer.containerCode, telemetryPayload)
        ];
        if (activeTripId) {
          requests.push(
            api
              .ingestTelemetry({
                tripId: activeTripId,
                vehicleId: activeVehicleId,
                timestamp: new Date().toISOString(),
                latitude: pos[0],
                longitude: pos[1],
                speedKmh: nextSpeed,
                headingDegrees: computedHeading,
                rawPayload: JSON.stringify({
                  source: customGps ? 'HARDWARE_GPS' : 'CABIN_OS_SIMULATOR',
                  deviation_simulated: deviationSim || undefined
                })
              })
              .catch(() => null)
          );
        }

        const [containerRes, trackingRes] = await Promise.all(requests);
        const saved = containerRes?.result || containerRes?.data;
        if (saved && saved.containerCode) {
          setContainers((prev) =>
            prev.map((c) => (c.containerCode === saved.containerCode ? saved : c))
          );
          setDbStatus('LIVE_DB');
        }

        const trackData = trackingRes?.result || trackingRes?.data;
        if (trackData?.arrivedAtDestination) {
          setLiveFleetSnapshots((prev) =>
            prev.map((item) =>
              item.tripId === activeTripId
                ? {
                    ...item,
                    arrivedAtDestination: true,
                    arrivalStatus: trackData.arrivalStatus || 'ARRIVED_AT_DESTINATION',
                    distanceToDestinationMeters: trackData.distanceToDestinationMeters,
                    remainingDistanceKm: 0,
                    etaMinutes: 0,
                    progressPercent: 100
                  }
                : item
            )
          );
          showToast(
            'success',
            `ĐÃ TỚI ĐỊA ĐIỂM GIAO HÀNG! Khoảng cách tới đích: ${Math.round(
              trackData.distanceToDestinationMeters ?? 0
            )}m — Sẵn sàng ký nhận chứng từ điện tử ePOD.`
          );
        } else if (arrivalCheck.arrived) {
          showToast(
            'success',
            `Xe đã vào vùng Geofence đích (cách ${arrivalCheck.distanceMeters ?? 0}m <= 250m) — Sẵn sàng bàn giao ePOD!`
          );
        } else {
          showToast(
            'success',
            `Đã lưu Telemetry ${activeContainer.containerCode} (${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}) • Cách đích ${
              arrivalCheck.distanceMeters != null
                ? arrivalCheck.distanceMeters >= 1000
                  ? `${arrivalCheck.distanceKm} km`
                  : `${arrivalCheck.distanceMeters} m`
                : '--'
            }.`
          );
        }
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (_) {
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        showToast(
          'info',
          `Đã cập nhật Telemetry Real-time (${finalProgress}%) vào bộ nhớ đệm cục bộ (DB đang chờ kết nối).`
        );
      } finally {
        setSyncingTelemetry(false);
      }
    },
    [
      activeContainer,
      activeTripId,
      activeVehicleId,
      routeData,
      destinationCoords,
      deviationSim,
      showToast
    ]
  );

  // Real Hardware Browser Geolocation watcher when enabled
  useEffect(() => {
    if (!hardwareGpsActive || typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const speedKmh =
          position.coords.speed != null && position.coords.speed >= 0
            ? Number((position.coords.speed * 3.6).toFixed(1))
            : 0;
        pushTelemetryToDb(null, {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          speedKmh,
          heading: position.coords.heading
        });
      },
      (geoErr) => {
        setHardwareGpsActive(false);
        showToast(
          'warning',
          `Không thể đọc GPS thiết bị (${geoErr?.message || 'Permission denied'}). Hãy cấp quyền định vị cho trình duyệt.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hardwareGpsActive, pushTelemetryToDb, showToast]);

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
    if (!myDriverProfile?.id || !activeVehicleId || !activeShipmentId) {
      showToast('warning', 'Cần chuyến đã phân công để gửi biên bản Pre-trip.');
      return;
    }
    setSubmittingInspection(true);
    setInspectionCert(null);
    try {
      const response = await api.submitPreTripInspection({
        vehicleId: activeVehicleId,
        driverId: myDriverProfile.id,
        shipmentId: activeShipmentId,
        ...checklist,
        remarks: inspectionRemarks
      });
      const data = response?.result ?? response?.data;
      if (!data?.id || !data.isPassed) throw new Error('Biên bản chưa được xác nhận đạt.');
      setInspectionCert({ passed: true, code: data.id, timestamp: data.inspectedAt, remarks: inspectionRemarks });
      publishCrossRoleNotification({
        eventType: 'PRE_TRIP_PASSED',
        severity: 'INFO',
        senderRole: 'DRIVER',
        senderUsername: user?.username,
        senderName: myDriverProfile?.fullName || user?.fullName || 'Tài xế Đội xe',
        targetRoles: ['OPERATOR', 'ADMIN'],
        title: `Đạt kiểm tra an toàn 6 điểm — Xe ${activeContainer?.vehicleLicensePlate || 'Đội xe'}`,
        message: `Tài xế đã hoàn tất khám xe trước chuyến cho container ${activeContainer?.containerCode || ''} và sẵn sàng xuất bến.`
      });
      showToast('success', 'Đã lưu biên bản Pre-trip của chuyến.');
    } catch (error) {
      showToast('warning', error.message || 'Chưa xác minh được kết quả Pre-trip.');
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
      ? `SIG-CANVAS-${Date.now().toString(36).toUpperCase()}`
      : `EPOD-PIN-${activeContainer.eSealNumber || 'VERIFIED'}`;
    let canvasDataUrl = null;
    if (hasSignature && canvasRef.current) {
      try {
        canvasDataUrl = canvasRef.current.toDataURL('image/png');
      } catch {
        canvasDataUrl = null;
      }
    }

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
                  epodNotes: epodNotes.trim(),
                  completedAt: new Date().toISOString()
                }
              : c
          )
        );
      }

      let carbonSaved = false;
      if (activeTripId && activeShipmentId) {
        const traveledKm =
          activeLiveSnapshot?.traveledDistanceKm ||
          Number((((Number(activeContainer.progressPct) || 100) / 100) * (routeData.distanceKm || 27.3)).toFixed(2)) ||
          1.0;
        try {
          await api.submitCarbonPod({
            tripId: activeTripId,
            shipmentId: activeShipmentId,
            recipientName: epodRecipient.trim(),
            signatureUrl: canvasDataUrl || sigToken,
            actualDistanceKm: traveledKm > 0 ? traveledKm : 1.0,
            cargoPayloadTons: activeContainer.maxPayloadTons || 14.0,
            fuelType: activeLiveSnapshot?.fuelType || 'ELECTRIC',
            euroStandard: activeLiveSnapshot?.euroStandard || 'EURO_6'
          });
          carbonSaved = true;
        } catch {
          await api.completeTrip(activeTripId).catch(() => null);
        }
      }

      setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      publishCrossRoleNotification({
        eventType: 'CONTAINER_EPOD_COMPLETED',
        severity: 'INFO',
        senderRole: 'DRIVER',
        senderUsername: user?.username,
        senderName: myDriverProfile?.fullName || user?.fullName || 'Tài xế Đội xe',
        targetRoles: ['CUSTOMER', 'OPERATOR', 'ADMIN'],
        tripId: activeTripId || null,
        title: `Đã bàn giao ePOD Container ${activeContainer.containerCode}`,
        message: `Người nhận ${epodRecipient.trim()} tại ${activeContainer.destinationName} đã ký nhận hoàn tất chứng từ điện tử.`
      });
      showToast(
        'success',
        carbonSaved
          ? `Hoàn tất bàn giao ePOD Container ${activeContainer.containerCode} & đã xác nhận hạch toán phát thải Carbon chuẩn GLEC v3!`
          : `Hoàn tất bàn giao ePOD Container ${activeContainer.containerCode} & mở khóa niêm phong Seal điện tử!`
      );
    } catch (err) {
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
                epodNotes: epodNotes.trim(),
                completedAt: new Date().toISOString()
              }
            : c
        )
      );
      showToast(
        'warning',
        `Lỗi kết nối khi nộp chứng từ ePOD (${err?.message || 'Ngoại tuyến'}) — đã lưu trạng thái tạm trên thiết bị.`
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
      incidentCode: `INC-${Date.now().toString().slice(-6)}`,
      tripId: activeTripId || null,
      driverId: activeDriverId,
      incidentType,
      severity: incidentSeverity,
      description:
        incidentDesc.trim() ||
        `Báo cáo hiện trường từ xe ${activeContainer?.vehicleLicensePlate} chở container ${activeContainer?.containerCode}.`,
      latitude: currentCoords?.[0] ?? null,
      longitude: currentCoords?.[1] ?? null
    };

    try {
      await api.createIncident(payload);
      setDbStatus('LIVE_DB');
      publishCrossRoleNotification({
        eventType: 'FIELD_INCIDENT',
        severity: incidentSeverity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        senderRole: 'DRIVER',
        senderUsername: user?.username,
        senderName: myDriverProfile?.fullName || user?.fullName || 'Tài xế Đội xe',
        targetRoles: ['OPERATOR', 'ADMIN', 'CUSTOMER'],
        tripId: activeTripId || null,
        latitude: currentCoords?.[0] ?? null,
        longitude: currentCoords?.[1] ?? null,
        title: `[Sự cố hiện trường] Xe ${activeContainer?.vehicleLicensePlate || ''} • Cont ${activeContainer?.containerCode || ''}`,
        message: payload.description
      });
      showToast('success', 'Đã gửi Biên bản sự cố hiện trường về Trung tâm Điều hành Vận tải!');
      setIncidentDesc('');
    } catch (err) {
      showToast(
        'warning',
        `Không thể gửi báo cáo sự cố về Trung tâm (${err?.message || 'Vui lòng kiểm tra đường truyền mạng'}).`
      );
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Emergency SOS Dispatch (accessible to ROLE_DRIVER via POST /api/v1/notifications/dispatch)
  const handleSosTrigger = async () => {
    const sosTitle = `[KHẨN CẤP TÀI XẾ SOS] ${activeContainer?.vehicleLicensePlate || '51C-888.99'}`;
    const sosMessage = `Tài xế ${myDriverProfile?.fullName || user?.fullName || activeContainer?.driverName} phát tín hiệu SOS từ Container ${activeContainer?.containerCode}. ${currentCoords ? `Tọa độ GPS: ${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}` : 'Chưa có tọa độ GPS.'}`;
    publishCrossRoleNotification({
      eventType: 'DRIVER_SOS',
      severity: 'CRITICAL',
      senderRole: 'DRIVER',
      senderUsername: user?.username,
      senderName: myDriverProfile?.fullName || user?.fullName || 'Tài xế Đội xe',
      targetRoles: ['OPERATOR', 'ADMIN'],
      tripId: activeTripId || null,
      latitude: currentCoords?.[0] ?? null,
      longitude: currentCoords?.[1] ?? null,
      title: sosTitle,
      message: sosMessage
    });
    try {
      await api.dispatchEmergencyNotification({
        eventType: 'DRIVER_SOS',
        severity: 'CRITICAL',
        sourceService: 'driver-terminal',
        targetRole: 'DISPATCHER',
        tripId: activeTripId || undefined,
        title: sosTitle,
        message: sosMessage,
        ...(currentCoords ? { latitude: currentCoords[0], longitude: currentCoords[1] } : {}),
        metadataJson: JSON.stringify({
          containerCode: activeContainer?.containerCode,
          driverCode: myDriverProfile?.driverCode || null
        })
      });
      showToast(
        'warning',
        `TÍN HIỆU SOS ĐÃ GỬI TỚI TRUNG TÂM ĐIỀU HÀNH! ${currentCoords ? `GPS: ${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}` : 'Chưa có tọa độ GPS; hãy báo vị trí qua điện thoại.'}`
      );
    } catch (_) {
      showToast(
        'warning',
        `Đã phát tín hiệu SOS khẩn cấp lên kênh điều hành nội bộ! Hãy giữ liên lạc điện thoại với Trung tâm.`
      );
    }
  };

  const handleShiftToggle = async () => {
    const nextShift = shiftStatus === 'IN_SHIFT' ? 'REST' : 'IN_SHIFT';
    const nextDriverStatus = nextShift === 'REST' ? 'INACTIVE' : 'AVAILABLE';
    setShiftStatus(nextShift);
    try {
      const updatedRes = await api.updateDriverStatus(activeDriverId, nextDriverStatus);
      const updatedProfile = updatedRes?.result || updatedRes?.data;
      if (updatedProfile?.id) {
        setMyDriverProfile(updatedProfile);
      }
      showToast(
        'info',
        nextShift === 'REST'
          ? 'Đã chuyển trạng thái tài xế sang Tạm nghỉ ca.'
          : 'Đã bật trạng thái Sẵn sàng nhận chuyến.'
      );
    } catch (err) {
      showToast(
        'warning',
        `Chuyển trạng thái ca cục bộ (${err?.message || 'Chưa đồng bộ được Driver Status'}).`
      );
    }
  };

  const formattedHosLabel = useMemo(() => {
    const mins = Number(myDriverProfile?.hosContinuousMin ?? 0);
    const limitHours = Math.max(
      1,
      Math.round(Number(myDriverProfile?.hosContinuousLimitMin ?? 240) / 60)
    );
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${h}h${m}m / ${limitHours}h`;
  }, [myDriverProfile?.hosContinuousMin, myDriverProfile?.hosContinuousLimitMin]);

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

  const allDriverTabs = DRIVER_SIDEBAR_SECTIONS.flatMap((s) => s.items);
  const currentTabMeta =
    allDriverTabs.find((item) => item.id === activeTab) || allDriverTabs[0];

  const hosContinuousMin = Number(myDriverProfile?.hosContinuousMin ?? 0);
  const hosContinuousLimitMin = Math.max(1, Number(myDriverProfile?.hosContinuousLimitMin ?? 240));
  const hosDailyMin = Number(myDriverProfile?.hosDailyMin ?? 0);
  const hosDailyLimitMin = Math.max(1, Number(myDriverProfile?.hosDailyLimitMin ?? 600));
  const hosContinuousPct = Math.min(100, Math.round((hosContinuousMin / hosContinuousLimitMin) * 100));
  const hosDailyPct = Math.min(100, Math.round((hosDailyMin / hosDailyLimitMin) * 100));

  if (!myDriverProfile || (!activeContainer && !activeTrip)) {
    return <main className="page-body">
      <h1>Khoang lái tài xế</h1>
      <p>{dbStatus === 'CONNECTING' ? 'Đang tải hồ sơ…' : myDriverProfile
        ? 'Chưa có container hoặc chuyến được phân công.'
        : 'Chưa đọc được hồ sơ tài xế liên kết với tài khoản. Hãy kiểm tra kết nối hoặc liên hệ quản trị nhân sự.'}</p>
      <button type="button" onClick={loadFromBackend}>Tải lại</button>
      <button type="button" onClick={logout}>Đăng xuất</button>
    </main>;
  }

  return (
    <div
      className="app-container"
      style={{
        background: bgPage,
        color: textMain
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          1. ADMIN-STYLE COLLAPSIBLE DRIVER SIDEBAR + MOBILE DRAWER
      ════════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          background: isDark ? '#061611' : 'var(--bg-secondary)',
          borderRight: cardBorder
        }}
      >
        <div
          className="sidebar-header"
          style={{
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 12,
            padding: isSidebarCollapsed ? '18px 10px' : '18px 16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              gap: 10
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/')}
              title="Về trang chủ CCADRO"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left'
              }}
            >
              <CcadroLogo size={38} />
              {!isSidebarCollapsed && (
                <div className="logo-text">
                  <h1>CCADRO</h1>
                  <span>CABIN OS • TÀI XẾ</span>
                </div>
              )}
            </button>

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Thu gọn thanh bên"
                aria-label="Thu gọn thanh bên"
                style={{
                  background: 'rgba(148, 163, 184, 0.12)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </div>

          {isSidebarCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Mở rộng thanh bên"
                aria-label="Mở rộng thanh bên"
                style={{
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  borderRadius: 8,
                  width: 34,
                  height: 34,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}

          {!isSidebarCollapsed ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.28)'
              }}
            >
              <div
                style={{
                  fontSize: '0.67rem',
                  fontWeight: 800,
                  color: '#10b981',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                ● TÀI XẾ: {myDriverProfile?.driverCode || 'DRV-FC-001'} • HẠNG{' '}
                {myDriverProfile?.licenseClass || 'FC'}
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
                {myDriverProfile?.fullName || user?.fullName || 'Nguyễn Văn Tài'}
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.78, marginTop: 2 }}>
                Xe: <strong>{activeContainer?.vehicleLicensePlate || '51C-888.99'}</strong> •{' '}
                <code>@{user?.username || 'driver'}</code>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '6px 4px',
                borderRadius: 8,
                background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#10b981'
              }}
              title={`${myDriverProfile?.driverCode || 'DRV-FC-001'} • ${myDriverProfile?.fullName || 'Tài xế'}`}
            >
              DRV
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {DRIVER_SIDEBAR_SECTIONS.map((section) => (
            <div key={section.group}>
              {!isSidebarCollapsed && (
                <div className="sidebar-section-title">{section.group}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectDriverTab(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`nav-link ${active ? 'active' : ''}`}
                      style={{
                        width: '100%',
                        border: active ? '1px solid var(--border-highlight)' : '1px solid transparent',
                        background: active ? 'var(--accent-green-dim)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        justifyContent: isSidebarCollapsed ? 'center' : 'space-between'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 0
                        }}
                      >
                        <Icon size={17} style={{ flexShrink: 0 }} />
                        {!isSidebarCollapsed && (
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </span>
                      {!isSidebarCollapsed && item.id === 'chat' && unreadCustomerMessagesTotal > 0 && (
                        <span className="topbar-count-pill">{unreadCustomerMessagesTotal}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!isSidebarCollapsed && (
            <div style={{ marginTop: 10 }}>
              <div className="sidebar-section-title">CONTAINER PHÂN CÔNG ({containers.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {containers.slice(0, 5).map((c) => {
                  const isCurrent = c.containerCode === activeContainer?.containerCode;
                  return (
                    <button
                      key={c.containerCode}
                      type="button"
                      onClick={() => {
                        setSelectedCode(c.containerCode);
                        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                          setIsSidebarCollapsed(true);
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 9,
                        border: isCurrent
                          ? '1px solid rgba(16, 185, 129, 0.45)'
                          : '1px solid transparent',
                        background: isCurrent ? subtleBg : 'transparent',
                        color: isCurrent ? '#10b981' : textMain,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.76rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{c.containerCode}</span>
                        <span>{Math.round(Number(c.progressPct) || 0)}%</span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: textMuted,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {c.originName} → {c.destinationName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isSidebarCollapsed && <div className="sidebar-section-title">Điều Hướng Hệ Thống</div>}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Trang Chủ Website"
            className="nav-link"
            style={{
              width: '100%',
              border: '1px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Home size={17} style={{ flexShrink: 0 }} />
            <span>Trang Chủ Website</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất (Blacklist Token) & Cổng Xác Thực IAM"
            className="nav-link"
            style={{
              width: '100%',
              border: '1px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            <span>Đăng Xuất &amp; Đổi Tài Khoản</span>
          </button>
        </nav>

        <SidebarAccountCard
          collapsed={isSidebarCollapsed}
          onAfterLogout={handleLogout}
        />
      </aside>

      {!isSidebarCollapsed && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          2. MAIN WORKSPACE (UNIFIED ADMIN-STYLE TOPBAR + SUBNAV + PAGE BODY)
      ════════════════════════════════════════════════════════════════════════ */}
      <main className="main-content" style={{ position: 'relative' }}>
        <div className="ambient-gradient-mesh" />

        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: isDark ? 'rgba(4, 15, 12, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: cardBorder,
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 4px 16px rgba(15,23,42,0.05)'
          }}
        >
          <div
            className="topbar"
            style={{
              position: 'static',
              background: 'transparent',
              backdropFilter: 'none',
              borderBottom: 'none'
            }}
          >
            <div className="topbar-left">
              <button
                type="button"
                className="topbar-sidebar-btn"
                onClick={() => setIsSidebarCollapsed((v) => !v)}
                title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                aria-label={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>

              <div className="topbar-divider" aria-hidden="true" />

              <div className="topbar-title-group">
                <div className="topbar-eyebrow">
                  <span style={{ color: '#10b981' }}>CABIN OS • TÀI XẾ ĐỘI XE</span>
                  <span style={{ opacity: 0.45 }}>/</span>
                  <span>{currentTabMeta.short}</span>
                </div>
                <h1 className="topbar-title" title={currentTabMeta.label}>
                  {currentTabMeta.label}
                </h1>
              </div>
            </div>

            <div className="topbar-actions">
              <div
                className="topbar-status-pill"
                title="Trạng thái kết nối Hệ thống Điều hành"
                style={{
                  background:
                    dbStatus === 'LIVE_DB'
                      ? 'rgba(16, 185, 129, 0.14)'
                      : 'rgba(245, 158, 11, 0.14)',
                  borderColor:
                    dbStatus === 'LIVE_DB'
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(245, 158, 11, 0.4)',
                  color: dbStatus === 'LIVE_DB' ? '#10b981' : '#f59e0b'
                }}
              >
                <Database size={13} />
                <span>{dbStatus === 'LIVE_DB' ? 'Trực tuyến' : 'Đang kết nối'}</span>
                <span className="topbar-status-sub">{lastSyncTime}</span>
                <button
                  type="button"
                  onClick={loadFromBackend}
                  title="Cập nhật dữ liệu từ Trung tâm"
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

              <button
                type="button"
                className="topbar-btn"
                onClick={handleShiftToggle}
                title="Đổi trạng thái ca lái HOS"
                style={{
                  borderColor:
                    shiftStatus === 'IN_SHIFT'
                      ? 'rgba(56, 189, 248, 0.45)'
                      : 'rgba(148, 163, 184, 0.3)',
                  background:
                    shiftStatus === 'IN_SHIFT'
                      ? 'rgba(56, 189, 248, 0.14)'
                      : 'rgba(148, 163, 184, 0.12)',
                  color: shiftStatus === 'IN_SHIFT' ? '#38bdf8' : textMuted
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
                <span className="topbar-label topbar-label-compact">
                  {shiftStatus === 'IN_SHIFT' ? `CA LÁI (${formattedHosLabel})` : 'NGHỈ GIẢI LAO'}
                </span>
              </button>

              <button
                type="button"
                className="topbar-btn"
                onClick={handleSosTrigger}
                title="Phát tín hiệu SOS khẩn cấp"
                style={{
                  borderColor: '#ef4444',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <AlertOctagon size={15} />
                <span className="topbar-label">SOS</span>
              </button>

              <button
                type="button"
                className="topbar-btn topbar-btn-messenger"
                onClick={() => selectDriverTab('chat')}
                title="Mở Tin nhắn Điều phối & Chủ hàng"
              >
                <MessageCircle size={15} />
                <span className="topbar-label topbar-label-compact">Messenger</span>
                {unreadCustomerMessagesTotal > 0 && (
                  <span className="topbar-count-pill">{unreadCustomerMessagesTotal}</span>
                )}
              </button>

              <RoleNotificationBell
                user={user}
                isDark={isDark}
                compactLabel="Thông báo"
                panelTitle="Thông báo & Chỉ thị Điều hành"
              />

              <button
                type="button"
                className="topbar-btn topbar-btn-icon"
                onClick={toggleTheme}
                aria-label="Đổi giao diện"
                title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              >
                {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
              </button>

              <button
                type="button"
                data-testid="topbar-quick-settings"
                className="topbar-btn topbar-btn-icon"
                onClick={() => setOpenSettings(true)}
                aria-label="Cài đặt Cabin & Tài khoản"
                title="Cài đặt Cabin HOS, GPS, Âm báo & Tài khoản"
              >
                <Settings size={15} />
              </button>

              <span className="topbar-divider" aria-hidden="true" />

              <UserAccountMenu variant="portal" compact />
            </div>
          </div>

          {/* Slim Contextual Tab Strip & Active Container Switcher (Horizontal scroll on mobile) */}
          <div
            className="portal-subnav"
            style={{
              borderTop: isDark
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(15, 23, 42, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {allDriverTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const badge = tab.id === 'chat' ? unreadCustomerMessagesTotal : 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectDriverTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: active ? '1px solid #10b981' : '1px solid transparent',
                      background: active ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                      color: active ? '#10b981' : textMuted,
                      fontSize: '0.78rem',
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.short}</span>
                    {badge > 0 && <span className="topbar-count-pill">{badge}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700, whiteSpace: 'nowrap' }}>
                Container:
              </span>
              <select
                value={activeContainer?.containerCode || ''}
                onChange={(e) => setSelectedCode(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 9,
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  background: isDark ? '#071a14' : '#ffffff',
                  color: textMain,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  maxWidth: 240
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
        </header>

        {/* ════════════════════════════════════════════════════════════════════════
            3. WORKSPACE BODY (MATCHING ADMIN PAGE-BODY ARCHITECTURE)
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="page-body" style={{ position: 'relative' }}>
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
              TAB 0: ADMIN-STYLE EXECUTIVE CABIN OVERVIEW DASHBOARD
          ────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && activeContainer && (
            <div style={{ display: 'grid', gap: 18 }}>
              {/* 1. Executive Driver Hero Banner */}
              <div
                className="card glass-card-interactive"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 60%, rgba(56, 189, 248, 0.08) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.35)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 16
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className="badge badge-green" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                        <span className="radar-dot" /> DRIVER
                      </span>
                      <span className={`badge ${dbStatus === 'LIVE_DB' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                        <Database size={12} />
                        <span>{dbStatus === 'LIVE_DB' ? 'Hệ thống Trực tuyến' : 'Đang kết nối'}</span>
                      </span>
                      <span
                        className={`badge ${arrivalStatusInfo.arrived ? 'badge-green' : arrivalStatusInfo.status === 'APPROACHING_DESTINATION' ? 'badge-amber' : 'badge-blue'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        <MapPin size={12} />
                        <span>
                          {arrivalStatusInfo.arrived
                            ? 'Đã tới điểm giao hàng'
                            : arrivalStatusInfo.distanceMeters != null
                              ? `Cách đích ${
                                  arrivalStatusInfo.distanceMeters >= 1000
                                    ? `${arrivalStatusInfo.distanceKm} km`
                                    : `${arrivalStatusInfo.distanceMeters} m`
                                }`
                              : 'Đang định vị tuyến'}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.73rem', color: textMuted }}>
                        Đồng bộ lúc: <strong>{lastSyncTime}</strong>
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.38rem', fontWeight: 800, margin: '0 0 6px' }}>
                      Trung Tâm Khoang Lái &amp; Vận Hành Tài Xế •{' '}
                      {myDriverProfile?.fullName || user?.fullName || activeContainer.driverName}
                    </h2>
                    <p style={{ fontSize: '0.84rem', color: textMuted, margin: 0, maxWidth: 820, lineHeight: 1.5 }}>
                      Quản lý container được phân công ({activeContainer.containerCode}), kiểm định an toàn kỹ thuật trước chuyến, định vị vệ tinh dẫn đường, ký nhận chứng từ điện tử ePOD và xử lý sự cố hiện trường.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={loadFromBackend}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '9px 14px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Làm Mới Real-time</span>
                    </button>
                    <button
                      type="button"
                      disabled={activeContainer.status === 'DELIVERED'}
                      onClick={() => setAutoStream((v) => !v)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '9px 14px' }}
                    >
                      {autoStream ? <Pause size={14} /> : <Play size={14} />}
                      <span>{autoStream ? 'Dừng Auto GPS (5s)' : 'Bật Live GPS (5s)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDriverTab('inspection')}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '9px 14px' }}
                    >
                      <ShieldCheck size={14} color="#10b981" />
                      <span>Kiểm Tra 6 Điểm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDriverTab('navigation')}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '9px 14px' }}
                    >
                      <Navigation size={14} />
                      <span>Mở Dẫn Đường 3D</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Top KPI Row (4 Cards matching Admin Dashboard) */}
              <div className="grid-4" style={{ marginBottom: 0 }}>
                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Container &amp; Vận Đơn</div>
                    <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.35rem' }}>
                      {activeContainer.containerCode}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      {activeContainer.assignedShipmentCode || 'CHƯA GẮN ĐƠN'} • {activeContainer.status}
                    </span>
                  </div>
                  <Package size={28} color="#38bdf8" />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Tiến Độ &amp; ETA Tuyến</div>
                    <div className="stat-value" style={{ color: '#10b981', fontSize: '1.35rem' }}>
                      <CountingNumber value={Math.round(Number(activeContainer.progressPct) || 0)} />%
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      Còn ~{activeContainer.etaMinutes || 0} phút • {Math.round(Number(activeContainer.speedKmh) || 0)} km/h
                    </span>
                  </div>
                  <Compass size={28} color="#10b981" />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Geofence Điểm Đích (250m)</div>
                    <div
                      className="stat-value"
                      style={{
                        color: arrivalStatusInfo.arrived ? '#10b981' : '#f59e0b',
                        fontSize: '1.22rem'
                      }}
                    >
                      {arrivalStatusInfo.arrived
                        ? 'ĐÃ TỚI ĐÍCH'
                        : arrivalStatusInfo.distanceMeters != null
                          ? arrivalStatusInfo.distanceMeters >= 1000
                            ? `${arrivalStatusInfo.distanceKm} km`
                            : `${arrivalStatusInfo.distanceMeters} m`
                          : '--'}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      {arrivalStatusInfo.arrived ? 'Sẵn sàng ký nhận ePOD' : 'Đang tiến về kho đích'}
                    </span>
                  </div>
                  <MapPin size={28} color={arrivalStatusInfo.arrived ? '#10b981' : '#f59e0b'} />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Chuỗi Lạnh &amp; e-Seal IoT</div>
                    <div className="stat-value" style={{ color: '#a855f7', fontSize: '1.35rem' }}>
                      {activeContainer.supplyAirTempC}°C
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      {activeContainer.eSealNumber || 'VN-CUST'} • {activeContainer.batteryPct || 98}% Pin
                    </span>
                  </div>
                  <Thermometer size={28} color="#a855f7" />
                </div>
              </div>

              {/* 3. Second KPI Row (HOS, Rating, Eco-Score, Chat/Safety) */}
              <div className="grid-4" style={{ marginBottom: 0 }}>
                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Giờ Lái Liên Tục (HOS)</div>
                    <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.3rem' }}>
                      {formattedHosLabel}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      Tổng ngày: {hosDailyMin}/{hosDailyLimitMin} phút ({hosDailyPct}%)
                    </span>
                  </div>
                  <Clock size={26} color="#38bdf8" />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Uy Tín &amp; Số Chuyến</div>
                    <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.3rem' }}>
                      {myDriverProfile?.rating || activeContainer.driverSafetyScore || 4.95} ★
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      <CountingNumber value={Number(myDriverProfile?.totalTrips ?? 418)} /> chuyến •{' '}
                      {myDriverProfile?.onTimeRate ?? 99.4}% đúng giờ
                    </span>
                  </div>
                  <Star size={26} color="#f59e0b" />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Eco-Score &amp; Hành Lang Đệm</div>
                    <div
                      className="stat-value"
                      style={{ color: deviationSim ? '#ef4444' : '#22c55e', fontSize: '1.3rem' }}
                    >
                      {deviationSim ? 'LỆCH 260m' : `${myDriverProfile?.ecoScore ?? 97}/100`}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      {Number(myDriverProfile?.greenKmTotal ?? 42860).toLocaleString('vi-VN')} km xanh •{' '}
                      {myDriverProfile?.violationsCount ?? 0} vi phạm
                    </span>
                  </div>
                  <Truck size={26} color={deviationSim ? '#ef4444' : '#22c55e'} />
                </div>

                <div className="card stat-card glass-card-interactive">
                  <div>
                    <div className="stat-label">Giao Tiếp B2B &amp; Chứng Từ</div>
                    <div className="stat-value" style={{ color: '#10b981', fontSize: '1.3rem' }}>
                      {unreadCustomerMessagesTotal} <span style={{ fontSize: '0.88rem' }}>tin mới</span>
                    </div>
                    <span style={{ fontSize: '0.73rem', color: textMuted }}>
                      {containers.length} Container • {myDriverProfile?.preTripPassed ? 'Pre-Trip Đạt' : 'Chờ Pre-Trip'}
                    </span>
                  </div>
                  <MessageSquare size={26} color="#10b981" />
                </div>
              </div>

              {/* 4. Executive Split View: Real-Time Route Map + Assigned Container Queue */}
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                        Bản Đồ Tuyến Thực Tế &amp; Geofence Đích
                      </h3>
                      <div style={{ fontSize: '0.76rem', color: textMuted }}>
                        {activeContainer.originName} → {activeContainer.destinationName} • Nguồn: {routeData.source}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => pushTelemetryToDb(100)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                      >
                        Chạy tới đích 100%
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDriverTab('epod')}
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                      >
                        Mở Ký ePOD
                      </button>
                    </div>
                  </div>

                  <div style={{ borderRadius: 12, overflow: 'hidden', border: cardBorder }}>
                    <MapView
                      center={currentCoords}
                      zoom={12}
                      focusPosition={currentCoords}
                      focusZoom={13}
                      defaultLayer="google_hybrid"
                      default3D={true}
                      height={310}
                      hudTitle={`${activeContainer.containerCode} (${activeContainer.vehicleLicensePlate || '51C-888.99'})`}
                      hudSubtitle={`${Math.round(Number(activeContainer.progressPct) || 0)}% • ${
                        arrivalStatusInfo.arrived
                          ? 'ĐÃ TỚI ĐÍCH'
                          : `Cách đích ${arrivalStatusInfo.distanceMeters ?? '--'}m`
                      }`}
                    >
                      <OriginMarker
                        position={routeData.points[0] || (activeTripId ? null : originHub.coords)}
                        title={activeContainer.originName || originHub.label}
                        label={originHub.label}
                      />
                      <DestinationMarker
                        position={destinationCoords}
                        title={activeContainer.destinationName || destHub.label}
                        label={destHub.label}
                        showGeofence={true}
                        geofenceRadiusMeters={arrivalStatusInfo.arrivalRadiusMeters || 250}
                        arrived={arrivalStatusInfo.arrived}
                      />
                      <RoutePolyline
                        positions={routeData.points}
                        routingMetadataJson={routeData.routingMetadataJson}
                        color={rerouteAccepted ? '#0ea5e9' : '#10b981'}
                        weight={5}
                        showCorridorBuffer={true}
                      />
                      <VehicleMarker
                        position={currentCoords}
                        title={activeContainer.vehicleLicensePlate || '51C-888.99'}
                        heading={currentHeading}
                        speedKmh={Math.round(Number(activeContainer.speedKmh) || 0)}
                        status={deviationSim ? 'DEVIATION' : 'ON_ROUTE'}
                        tempC={activeContainer.supplyAirTempC}
                      />
                    </MapView>
                  </div>
                </div>

                <div className="card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                        Danh Sách Container &amp; Chuyến Phân Công
                      </h3>
                      <div style={{ fontSize: '0.76rem', color: textMuted }}>
                        Chọn 1 dòng để chuyển nhanh lệnh điều xe &amp; kiểm tra telemetry
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectDriverTab('mission')}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                    >
                      Chi Tiết Nhiệm Vụ
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Container</th>
                          <th>Hành Lang</th>
                          <th>Tiến Độ</th>
                          <th>Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {containers.map((c) => {
                          const isSelected = c.containerCode === activeContainer.containerCode;
                          return (
                            <tr
                              key={c.containerCode}
                              onClick={() => setSelectedCode(c.containerCode)}
                              style={{
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(16, 185, 129, 0.12)' : undefined
                              }}
                            >
                              <td>
                                <strong style={{ color: '#38bdf8' }}>{c.containerCode}</strong>
                                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                  {c.vehicleLicensePlate || '51C-888.99'}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                  {c.originName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                  → {c.destinationName}
                                </div>
                              </td>
                              <td>
                                <strong>{Math.round(Number(c.progressPct) || 0)}%</strong>
                                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                  {c.supplyAirTempC}°C
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`badge ${c.status === 'DELIVERED' ? 'badge-green' : 'badge-blue'}`}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
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

                {/* Destination Arrival Geofence Status Box ("Tracking giao tới địa điểm chưa") */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: arrivalStatusInfo.arrived
                      ? 'rgba(16, 185, 129, 0.14)'
                      : arrivalStatusInfo.status === 'APPROACHING_DESTINATION'
                        ? 'rgba(245, 158, 11, 0.14)'
                        : 'rgba(56, 189, 248, 0.1)',
                    border: arrivalStatusInfo.arrived
                      ? '1px solid #10b981'
                      : arrivalStatusInfo.status === 'APPROACHING_DESTINATION'
                        ? '1px solid #f59e0b'
                        : '1px solid rgba(56, 189, 248, 0.35)',
                    display: 'grid',
                    gap: 6
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: textMuted }}>
                      KIỂM TRA ĐÃ GIAO TỚI ĐỊA ĐIỂM (GEOFENCE {arrivalStatusInfo.arrivalRadiusMeters}m)
                    </span>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: arrivalStatusInfo.arrived
                          ? '#10b981'
                          : arrivalStatusInfo.status === 'APPROACHING_DESTINATION'
                            ? '#f59e0b'
                            : '#0ea5e9',
                        color: arrivalStatusInfo.arrived ? '#042f2e' : '#ffffff'
                      }}
                    >
                      {arrivalStatusInfo.status === 'DELIVERED'
                        ? '✓ ĐÃ BÀN GIAO ePOD'
                        : arrivalStatusInfo.arrived
                          ? '✓ ĐÃ TỚI ĐIỂM GIAO'
                          : arrivalStatusInfo.status === 'APPROACHING_DESTINATION'
                            ? '● SẮP TỚI ĐÍCH'
                            : '○ CHƯA TỚI ĐIỂM GIAO'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                    {arrivalStatusInfo.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: textMuted, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>
                      Khoảng cách tới đích:{' '}
                      <strong style={{ color: textMain }}>
                        {arrivalStatusInfo.distanceMeters != null
                          ? arrivalStatusInfo.distanceMeters >= 1000
                            ? `${arrivalStatusInfo.distanceKm} km`
                            : `${arrivalStatusInfo.distanceMeters} m`
                          : '--'}
                      </strong>
                    </span>
                    <span>
                      Tọa độ đích:{' '}
                      <code>
                        {destinationCoords ? `${destinationCoords[0].toFixed(4)}, ${destinationCoords[1].toFixed(4)}` : 'Chưa có tọa độ đích'}
                      </code>
                    </span>
                    {arrivalStatusInfo.arrivedAt && (
                      <span>
                        Chạm đích lúc:{' '}
                        <strong>
                          {new Date(arrivalStatusInfo.arrivedAt).toLocaleTimeString('vi-VN')}
                        </strong>
                      </span>
                    )}
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
                    lên máy chủ trung tâm để Khách hàng và Điều phối viên theo dõi trực tiếp.
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
        {activeTab === 'inspection' && activeTrip?.status === 'SCHEDULED' && (
          <section className="card" aria-label="Khởi hành chuyến đã phân công">
            <p>Chuyến {activeTrip.tripCode} đang chờ khởi hành. Gửi biên bản Pre-trip trước khi tiếp tục.</p>
            <button type="button" className="btn btn-primary" disabled={startingTrip} onClick={async () => {
              setStartingTrip(true);
              try {
                await api.startTrip(activeTrip.id);
                showToast('success', 'Đã ghi nhận khởi hành.');
                await loadFromBackend();
              } catch (failure) {
                showToast('warning', failure.message || 'Chưa thể khởi hành.');
              } finally {
                setStartingTrip(false);
              }
            }}>{startingTrip ? 'Đang xác minh…' : 'Xác nhận khởi hành'}</button>
          </section>
        )}
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
                    Biên Bản Kiểm Tra An Toàn 6 Hạng Mục Trước Chuyến
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
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
                        ? 'Đang nộp hồ sơ lên hệ thống...'
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
                  TRACKING TỚI ĐỊA ĐIỂM GIAO HÀNG
                </div>
                <div
                  style={{
                    fontSize: '1.12rem',
                    fontWeight: 900,
                    color: arrivalStatusInfo.arrived
                      ? '#10b981'
                      : arrivalStatusInfo.status === 'APPROACHING_DESTINATION'
                        ? '#f59e0b'
                        : '#38bdf8',
                    marginTop: 4
                  }}
                >
                  {arrivalStatusInfo.arrived
                    ? `ĐÃ TỚI ĐÍCH (${arrivalStatusInfo.distanceMeters ?? 0}m)`
                    : arrivalStatusInfo.distanceMeters != null
                      ? `CHƯA TỚI • Còn ${
                          arrivalStatusInfo.distanceMeters >= 1000
                            ? `${arrivalStatusInfo.distanceKm} km`
                            : `${arrivalStatusInfo.distanceMeters} m`
                        }`
                      : 'ĐANG ĐỊNH VỊ'}
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Geofence: {arrivalStatusInfo.arrivalRadiusMeters}m • Tuyến: {routeData.source}
                </div>
              </div>

              <div style={{ background: cardBg, border: cardBorder, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                  HÀNH LANG AN TOÀN ĐỘI XE
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
                  Ngưỡng: 50m Vàng • 200m Đỏ • Heading {currentHeading}°
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
                  gap: 6
                }}
              >
                <button
                  type="button"
                  onClick={() => pushTelemetryToDb()}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10b981',
                    color: '#042f2e',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cập nhật vị trí & Lưu DB
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => pushTelemetryToDb(100)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(56, 189, 248, 0.45)',
                      background: 'rgba(56, 189, 248, 0.14)',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Chạy tới đích (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHardwareGpsActive((v) => !v)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      background: hardwareGpsActive ? '#10b981' : 'rgba(16, 185, 129, 0.12)',
                      color: hardwareGpsActive ? '#042f2e' : '#10b981',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {hardwareGpsActive ? 'Tắt GPS Thật' : 'GPS Thiết bị thật'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDeviationSim((d) => !d)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    background: deviationSim ? '#ef4444' : 'rgba(239, 68, 68, 0.12)',
                    color: deviationSim ? '#ffffff' : '#f87171',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {deviationSim ? 'Khôi phục về tuyến chuẩn' : 'Mô phỏng lệch tuyến 260m'}
                </button>
              </div>
            </div>

            {/* Dynamic Reroute Proposal Banner (UC10 Human-in-the-loop) */}
            {rerouteOfferActive && !activeTripId && (
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
                        ? '[MÔ PHỎNG] Đã chọn phương án minh họa'
                        : '[MÔ PHỎNG] Đề xuất tránh ùn tắc minh họa'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: textMuted }}>
                      {rerouteAccepted
                        ? 'Chưa tạo phiên bản đường vận hành. Dispatcher cần tính và chốt tuyến thực.'
                        : 'Dữ liệu minh họa, chưa có đo lường giao thông hoặc CO₂ cho tuyến này.'}
                    </div>
                  </div>
                </div>

                {!rerouteAccepted ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRerouteAccepted(true);
                        showToast('info', 'Đã xem phương án minh họa; chưa thay đổi tuyến chính thức.');
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
                    Đang xem phương án minh họa
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
                hudSubtitle={`${activeContainer.originName} → ${activeContainer.destinationName} • ${Math.round(Number(activeContainer.progressPct) || 0)}% • ${routeData.source} • ${arrivalStatusInfo.arrived ? 'ĐÃ TỚI ĐÍCH' : 'Còn ' + (arrivalStatusInfo.distanceMeters ?? '--') + 'm'}`}
              >
                <OriginMarker
                  position={routeData.points[0] || (activeTripId ? null : originHub.coords)}
                  title={activeContainer.originName || originHub.label}
                  label={originHub.label}
                />
                <DestinationMarker
                  position={destinationCoords}
                  title={activeContainer.destinationName || destHub.label}
                  label={destHub.label}
                  showGeofence={true}
                  geofenceRadiusMeters={arrivalStatusInfo.arrivalRadiusMeters || 250}
                  arrived={arrivalStatusInfo.arrived}
                />
                <RoutePolyline
                  positions={routeData.points}
                  routingMetadataJson={routeData.routingMetadataJson}
                  color={rerouteAccepted ? '#0ea5e9' : '#10b981'}
                  weight={6}
                  showCorridorBuffer={true}
                />
                {recordedTrail.length >= 2 && (
                  <RoutePolyline
                    positions={recordedTrail}
                    color="#f59e0b"
                    weight={4}
                    dashArray="5, 6"
                    showCorridorBuffer={false}
                    autoFit={false}
                  />
                )}
                <VehicleMarker
                  position={currentCoords}
                  title={activeContainer.vehicleLicensePlate || '51C-888.99'}
                  heading={currentHeading}
                  speedKmh={Math.round(Number(activeContainer.speedKmh) || 0)}
                  status={deviationSim ? 'DEVIATION' : 'ON_ROUTE'}
                  tempC={activeContainer.supplyAirTempC}
                />
                {deviationSim && (
                  <DeviationMarker position={currentCoords} distanceMeters={260} severity="RED" />
                )}
              </MapView>
            </div>
            {routeData.routingMetadataJson && (
              <RouteEvidence candidate={{ routingMetadataJson: routeData.routingMetadataJson }} />
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 4: ELECTRONIC PROOF OF DELIVERY (ePOD) & INCIDENT REPORTING
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'epod' && activeContainer && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
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
                    Ký Nhận Giao Hàng Điện Tử (ePOD)
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
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: arrivalStatusInfo.arrived
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(245, 158, 11, 0.14)',
                      border: arrivalStatusInfo.arrived
                        ? '1px solid #10b981'
                        : '1px solid #f59e0b',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: arrivalStatusInfo.arrived ? '#10b981' : '#f59e0b'
                    }}
                  >
                    {arrivalStatusInfo.arrived
                      ? `✓ Xác nhận Geofence: Xe đang ở trong vùng giao hàng (cách điểm đích ${arrivalStatusInfo.distanceMeters ?? 0}m <= ${arrivalStatusInfo.arrivalRadiusMeters}m). Hợp lệ để ký nhận ePOD.`
                      : `⚠ Lưu ý Geofence: Xe còn cách điểm giao hàng ${
                          arrivalStatusInfo.distanceMeters != null
                            ? arrivalStatusInfo.distanceMeters >= 1000
                              ? `${arrivalStatusInfo.distanceKm} km`
                              : `${arrivalStatusInfo.distanceMeters} m`
                            : '--'
                        } (ngoài bán kính ${arrivalStatusInfo.arrivalRadiusMeters}m). Vui lòng xác nhận đúng địa điểm hạ bãi trước khi ký.`}
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
                        ? 'Đang lưu chứng từ ePOD lên hệ thống...'
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
                    Báo Cáo Sự Cố Hiện Trường
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
                    <option value="HIGH">HIGH • Nghiêm trọng (Đề xuất đổi tuyến đường tránh sự cố)</option>
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
                    Mô tả hiện trường ({currentCoords ? `GPS ${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}` : 'Chưa có tọa độ GPS'})
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

        {/* ──────────────────────────────────────────────────────────────────────
            TAB 5: HỒ SƠ GPLX, GIỜ LÁI HOS, ĐỘI XE & ĐÁNH GIÁ 5★
        ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'dossier' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              {/* Legal & Driver Profile Card */}
              <div className="card glass-card-interactive" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserCheck size={20} color="#10b981" />
                    <div>
                      <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
                        Hồ Sơ Tài Xế &amp; Pháp Lý GPLX
                      </h2>
                      <div style={{ fontSize: '0.76rem', color: textMuted }}>
                        Mã nội bộ: <code>{myDriverProfile?.driverCode || 'DRV-FC-001'}</code> • Tài khoản{' '}
                        <code>@{myDriverProfile?.accountUsername || user?.username || 'driver'}</code>
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-green">
                    {myDriverProfile?.verified !== false ? '✓ ĐÃ XÁC MINH GPLX' : 'CHỜ DUYỆT'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                    gap: 10,
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>HỌ VÀ TÊN</div>
                    <strong>{myDriverProfile?.fullName || user?.fullName || 'Nguyễn Văn Tài'}</strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>HẠNG GPLX &amp; SỐ BẰNG</div>
                    <strong>
                      Hạng {myDriverProfile?.licenseClass || 'FC'} • {myDriverProfile?.licenseNumber || '7901-8842-9012'}
                    </strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>HIỆU LỰC GPLX</div>
                    <strong>{myDriverProfile?.licenseExpiryDate || '18/10/2029'}</strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>ĐIỆN THOẠI &amp; QUÊ QUÁN</div>
                    <strong>{myDriverProfile?.phone || '0903 812 456'}</strong>
                    <div style={{ fontSize: '0.72rem', color: textMuted }}>
                      {myDriverProfile?.hometown || 'TP. Thủ Đức, TP. Hồ Chí Minh'}
                    </div>
                  </div>
                </div>
              </div>

              {/* HOS Driving Compliance Card */}
              <div className="card glass-card-interactive" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={20} color="#38bdf8" />
                    <div>
                      <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
                        Giám Sát Giờ Lái An Toàn (HOS)
                      </h2>
                      <div style={{ fontSize: '0.76rem', color: textMuted }}>
                        Giới hạn liên tục {hosContinuousLimitMin} phút (4h) • Giới hạn ngày {hosDailyLimitMin} phút (10h)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleShiftToggle}
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.76rem' }}
                  >
                    {shiftStatus === 'IN_SHIFT' ? 'Chuyển Nghỉ Ca' : 'Bắt Đầu Ca Lái'}
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span>Lái liên tục hiện tại</span>
                    <strong style={{ color: hosContinuousPct >= 85 ? '#ef4444' : '#38bdf8' }}>
                      {hosContinuousMin} / {hosContinuousLimitMin} phút ({hosContinuousPct}%)
                    </strong>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: subtleBg, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${hosContinuousPct}%`,
                        height: '100%',
                        background: hosContinuousPct >= 85 ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #10b981)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span>Tổng giờ lái tích lũy trong ngày</span>
                    <strong style={{ color: hosDailyPct >= 85 ? '#f59e0b' : '#10b981' }}>
                      {hosDailyMin} / {hosDailyLimitMin} phút ({hosDailyPct}%)
                    </strong>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: subtleBg, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${hosDailyPct}%`,
                        height: '100%',
                        background: hosDailyPct >= 85 ? '#f59e0b' : 'linear-gradient(90deg, #10b981, #22c55e)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Fleet Vehicles + Customer Star Reviews */}
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="card glass-card-interactive" style={{ display: 'grid', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                  Đội Xe &amp; Đầu Kéo Hỗ Trợ ({assignedVehicles.length})
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã Xe</th>
                        <th>Biển Số</th>
                        <th>Nhiên Liệu</th>
                        <th>Tải Trọng</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedVehicles.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: textMuted }}>
                            Chưa tải được danh sách xe từ Asset Service.
                          </td>
                        </tr>
                      ) : (
                        assignedVehicles.map((v) => (
                          <tr key={v.id || v.vehicleCode}>
                            <td><code>{v.vehicleCode}</code></td>
                            <td><strong>{v.plateNumber}</strong></td>
                            <td>{v.fuelType} ({v.euroStandard})</td>
                            <td>{v.maxPayloadTons}T</td>
                            <td>
                              <span className={`badge ${v.status === 'AVAILABLE' ? 'badge-green' : 'badge-blue'}`}>
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card glass-card-interactive" style={{ display: 'grid', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                  Đánh Giá Từ Chủ Hàng B2B ({driverReviews.length})
                </h3>
                {driverReviews.length === 0 ? (
                  <div style={{ padding: 16, borderRadius: 12, background: subtleBg, fontSize: '0.82rem', color: textMuted }}>
                    Điểm tín nhiệm trung bình: <strong style={{ color: '#f59e0b' }}>{myDriverProfile?.rating || 4.95} ★</strong> qua{' '}
                    <strong>{myDriverProfile?.totalTrips || 418}</strong> chuyến hoàn tất (tỉ lệ đúng giờ{' '}
                    <strong>{myDriverProfile?.onTimeRate || 99.4}%</strong>).
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {driverReviews.slice(0, 6).map((rev, idx) => (
                      <div key={rev.id || idx} style={{ padding: 12, borderRadius: 10, background: subtleBg }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                          <span>{rev.authorName || 'Khách hàng B2B'}</span>
                          <span style={{ color: '#f59e0b' }}>{rev.rating || 5} ★</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: 4 }}>
                          {rev.comment || 'Giao hàng đúng giờ, niêm phong Seal nguyên vẹn.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB 6: CCADRO MESSENGER (MULTI-PERSON & GROUP) ======================== */}
        {activeTab === 'chat' && (
          <MessengerWorkspaceModal
            inline
            isDark={isDark}
            drivers={driverProfilesList}
            shipments={containers}
            chatThreads={chatThreads}
            initialDriverCode={activeChatDriverCode}
            viewerRoleOverride="DRIVER"
          />
        )}
        </div>
      </main>

      <AccountSettingsModal
        isOpen={openSettings}
        onClose={() => setOpenSettings(false)}
      />
    </div>
  );
}
