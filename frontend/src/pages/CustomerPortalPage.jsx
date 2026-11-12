import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Crosshair,
  Download,
  FileCheck2,
  FileText,
  Gauge,
  LayoutDashboard,
  Leaf,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Navigation,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  PhoneCall,
  PieChart,
  Play,
  PlusCircle,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Thermometer,
  Trash2,
  Truck,
  User,
  UserCheck,
  Zap
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
import { getRealRoadRoute, interpolateRoadPosition } from '../services/roadRoutingService';
import {
  HUB_CORRIDOR_DIRECTORY,
  STANDARD_FLEET_CATALOG,
  SMART_CONTAINER_CATALOG,
  PARETO_ROUTING_MODES,
  calculateDetailedGlecQuote,
  buildRouteCheckpoints,
  generateContainerIsoCode,
  generateESealNumber
} from '../services/logisticsReferenceData';
import '../styles/landing.css';

export const USER_SHIPMENTS_STORAGE_KEY = 'ccadro_user_shipments_realtime_v2';

const NODE_COORDINATES = {
  vsip: [10.9242, 106.7145],
  songthan: [10.8925, 106.7428],
  tanbinh: [10.8184, 106.6286],
  catlai: [10.7623, 106.7824],
  nhontrach: [10.7352, 106.8954],
  hiepphuoc: [10.6354, 106.7522],
  caimep: [10.5256, 107.0225],
  vsip2: [11.0542, 106.6987],
  amata: [10.9412, 106.8821],
  longhau: [10.6285, 106.7124],
  phuoclong: [10.8245, 106.7689],
  tantao: [10.7512, 106.5824]
};

const NODE_ADDRESSES = {
  vsip: 'Số 8 Đại lộ Hữu Nghị, KCN VSIP 1, Thuận An, Bình Dương',
  songthan: 'Khu phố Bình Đường 3, P. An Bình, Dĩ An, Bình Dương',
  tanbinh: 'Đường Tây Thạnh, KCN Tân Bình, Q. Tân Phú, TP. HCM',
  catlai: '1295B Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP. HCM',
  nhontrach: 'Đường Tôn Đức Thắng (25B), KCN Nhơn Trạch, Đồng Nai',
  hiepphuoc: 'Khu B, Đường số 1, KCN Hiệp Phước, Nhà Bè, TP. HCM',
  caimep: 'Khu phố Tân Lộc, P. Phước Hòa, Phú Mỹ, Bà Rịa – Vũng Tàu',
  vsip2: 'Đường Dân Chủ, KCN VSIP 2, Phường Hòa Phú, TP. Thủ Dầu Một, Bình Dương',
  amata: 'Quốc lộ 1A, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
  longhau: 'Ấp 3, Xã Long Hậu, Huyện Cần Giuộc, Long An',
  phuoclong: 'Km 9 Xa lộ Hà Nội, P. Phước Long A, TP. Thủ Đức, TP. HCM',
  tantao: 'Quốc lộ 1A, P. Tân Tạo A, Quận Bình Tân, TP. HCM'
};

/**
 * 5 Danh mục Container thực tế mẫu của doanh nghiệp (3 Đang đi, 2 Đã tới)
 * Tích hợp toàn diện thông tin Container ISO 6346, Hộp đen IoT, Khóa E-Seal và Người lái
 */
export const DEFAULT_SEED_SHIPMENTS = [
  {
    id: 'seed-ship-001',
    shipmentCode: 'SHP-2026-8192',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Tập Đoàn Thủy Hải Sản Minh Phú • Đối Tác B2B',
    createdByUsername: 'customer',
    originId: 'catlai',
    destinationId: 'songthan',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'ICD Sóng Thần, Dĩ An, Bình Dương',
    originCoords: [10.7626, 106.7956],
    destCoords: [10.9082, 106.7452],
    distanceKm: 18.6,
    status: 'IN_TRANSIT',
    statusLabel: 'Đang di chuyển trên Xa lộ Hà Nội',
    currentLocation: 'Đoạn ngã 4 Thủ Đức • Tốc độ 52 km/h',
    speedKmh: 52,
    progress: 54.0,
    traveledKm: 10.0,
    remainingKm: 8.6,
    initialEtaMinutes: 28,
    etaMinutes: 12,
    cargoType: 'Chuỗi lạnh thủy hải sản xuất khẩu (-18°C)',
    cargoWeightTons: 18.5,
    containerCode: 'TCKU-781920-4',
    containerTypeId: '40_REEFER',
    containerTypeLabel: 'Container Lạnh 40ft High Cube (Smart Reefer)',
    isoType: '45R1',
    containerOwner: 'Tân Cảng Sài Gòn (SNP Logistics)',
    tareWeightKg: 4480,
    maxPayloadKg: 29520,
    cubicCapacityM3: 67.9,
    eSealNumber: 'VN-CUST-819204',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    shockG: 0.24,
    supplyAirTempC: -18.4,
    returnAirTempC: -17.9,
    humidityPct: 88,
    solarPowerWatts: 42,
    iotUnitModel: 'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3',
    cellularNetwork: '4G LTE-M / 18 GNSS Sats (Roaming)',
    powertrainId: 'ev',
    vehicleType: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    licensePlate: '51C-888.99',
    driverName: 'Nguyễn Văn Tài',
    driverPhone: '0903 812 456',
    driverLicense: 'GPLX Hạng FC • 9 năm kinh nghiệm',
    driverSafetyScore: 4.95,
    co2SavedKg: 12.8,
    co2ReductionPct: 40.0,
    estimatedCostVnd: 1850000,
    createdAt: '12/11/2026, 08:30:00'
  },
  {
    id: 'seed-ship-002',
    shipmentCode: 'SHP-2026-4920',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Công Ty Điện Tử Samsung Vina • Đối Tác B2B',
    createdByUsername: 'customer',
    originId: 'catlai',
    destinationId: 'caimep',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'Cụm Cảng Cái Mép – Thị Vải, BR-VT',
    originCoords: [10.7626, 106.7956],
    destCoords: [10.5182, 107.0215],
    distanceKm: 67.4,
    status: 'IN_TRANSIT',
    statusLabel: 'Đang di chuyển trên Cao tốc Long Thành - Dầu Giây',
    currentLocation: 'Đoạn nút giao Vành đai 3 • Tốc độ 60 km/h',
    speedKmh: 60,
    progress: 68.0,
    traveledKm: 45.8,
    remainingKm: 21.6,
    initialEtaMinutes: 85,
    etaMinutes: 26,
    cargoType: 'Linh kiện điện tử & bán dẫn giá trị cao',
    cargoWeightTons: 14.0,
    containerCode: 'MSKU-492018-7',
    containerTypeId: '40_DRY_HC',
    containerTypeLabel: 'Container Khô 40ft High Cube IoT (Dry Box)',
    isoType: '45G1',
    containerOwner: 'Maersk Line A/S',
    tareWeightKg: 3900,
    maxPayloadKg: 28600,
    cubicCapacityM3: 76.4,
    eSealNumber: 'VN-CUST-901423',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    shockG: 0.21,
    supplyAirTempC: 26.2,
    returnAirTempC: 26.8,
    humidityPct: 52,
    solarPowerWatts: 45,
    iotUnitModel: 'Orbcomm CT 3500 Solar Asset Tracker',
    cellularNetwork: '4G LTE-M / GPS Galileo Multi-Constellation',
    powertrainId: 'ev',
    vehicleType: 'Xe đầu kéo điện (EV) • 40T BEV',
    licensePlate: '51C-704.33',
    driverName: 'Lê Minh Khôi',
    driverPhone: '0908 551 209',
    driverLicense: 'GPLX Hạng FC • 7 năm kinh nghiệm',
    driverSafetyScore: 4.90,
    co2SavedKg: 46.5,
    co2ReductionPct: 38.4,
    estimatedCostVnd: 3450000,
    createdAt: '12/11/2026, 09:10:00'
  },
  {
    id: 'seed-ship-003',
    shipmentCode: 'SHP-2026-8219',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Unilever Việt Nam • Đối Tác Logistics B2B',
    createdByUsername: 'customer',
    originId: 'tanbinh',
    destinationId: 'vsip',
    originName: 'KCN Tân Bình, Q. Tân Phú',
    destinationName: 'KCN VSIP 1, Thuận An, Bình Dương',
    originCoords: [10.8124, 106.6278],
    destCoords: [10.9312, 106.6974],
    distanceKm: 24.2,
    status: 'IN_TRANSIT',
    statusLabel: 'Đang di chuyển trên Quốc lộ 13',
    currentLocation: 'Đoạn ngã 4 Bình Phước • Tốc độ 46 km/h',
    speedKmh: 46,
    progress: 30.0,
    traveledKm: 7.3,
    remainingKm: 16.9,
    initialEtaMinutes: 36,
    etaMinutes: 24,
    cargoType: 'Hàng tiêu dùng nhanh & bao bì đóng gói',
    cargoWeightTons: 20.0,
    containerCode: 'CMAU-821903-2',
    containerTypeId: '40_DRY_HC',
    containerTypeLabel: 'Container Khô 40ft High Cube IoT (Dry Box)',
    isoType: '45G1',
    containerOwner: 'CMA CGM Group',
    tareWeightKg: 3900,
    maxPayloadKg: 28600,
    cubicCapacityM3: 76.4,
    eSealNumber: 'VN-CUST-774102',
    eSealStatus: 'LOCKED_SECURE',
    eSealIntegrityPct: 100,
    shockG: 0.28,
    supplyAirTempC: 28.0,
    returnAirTempC: 28.5,
    humidityPct: 60,
    solarPowerWatts: 38,
    iotUnitModel: 'Orbcomm CT 3500 Solar Asset Tracker',
    cellularNetwork: '4G LTE-M / Roaming VNPT-Viettel',
    powertrainId: 'euro5',
    vehicleType: 'Xe tải chuẩn Euro 5 SCR',
    licensePlate: '51D-662.18',
    driverName: 'Trần Hoàng Nam',
    driverPhone: '0914 720 881',
    driverLicense: 'GPLX Hạng FC • 11 năm kinh nghiệm',
    driverSafetyScore: 4.98,
    co2SavedKg: 13.6,
    co2ReductionPct: 26.0,
    estimatedCostVnd: 2100000,
    createdAt: '12/11/2026, 10:00:00'
  },
  {
    id: 'seed-ship-004',
    shipmentCode: 'SHP-2026-6192',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Mega Market • Chuỗi Cung Ứng Lạnh',
    createdByUsername: 'customer',
    originId: 'hiepphuoc',
    destinationId: 'nhontrach',
    originName: 'Cảng Container Hiệp Phước, Nhà Bè',
    destinationName: 'KCN Nhơn Trạch, Đồng Nai',
    originCoords: [10.6385, 106.7482],
    destCoords: [10.7241, 106.9182],
    distanceKm: 39.8,
    status: 'COMPLETED',
    statusLabel: 'Đã cập bến • Hoàn tất bàn giao ePOD',
    currentLocation: 'Kho ngoại quan KCN Nhơn Trạch • Hạ bãi thành công',
    speedKmh: 0,
    progress: 100.0,
    traveledKm: 39.8,
    remainingKm: 0.0,
    initialEtaMinutes: 55,
    etaMinutes: 0,
    completedAt: '09:15 Sáng nay',
    epodRecipient: 'Nguyễn Văn Thanh (Trưởng kho Nhơn Trạch)',
    epodSignature: 'Đã ký số Token SHA-256',
    cargoType: 'Thịt bò & bơ sữa nhập khẩu (-18°C)',
    cargoWeightTons: 22.0,
    containerCode: 'CCLU-619284-5',
    containerTypeId: '40_REEFER',
    containerTypeLabel: 'Container Lạnh 40ft High Cube (Smart Reefer)',
    isoType: '45R1',
    containerOwner: 'CCADRO Green Alliance',
    tareWeightKg: 4480,
    maxPayloadKg: 29520,
    cubicCapacityM3: 67.9,
    eSealNumber: 'VN-CUST-619284',
    eSealStatus: 'UNLOCKED_AUTHORIZED',
    eSealIntegrityPct: 100,
    shockG: 0.18,
    supplyAirTempC: -18.2,
    returnAirTempC: -17.8,
    humidityPct: 86,
    solarPowerWatts: 44,
    iotUnitModel: 'Carrier DataCOLD 600 / Nexxiot Edge',
    cellularNetwork: '4G LTE-M / Vệ tinh LEO',
    powertrainId: 'euro5',
    vehicleType: 'Xe tải chuẩn Euro 5',
    licensePlate: '61C-419.52',
    driverName: 'Phạm Quốc Tuấn',
    driverPhone: '0989 341 612',
    driverLicense: 'GPLX Hạng C/FC • 8 năm kinh nghiệm',
    driverSafetyScore: 4.92,
    co2SavedKg: 21.4,
    co2ReductionPct: 24.4,
    estimatedCostVnd: 2450000,
    createdAt: '12/11/2026, 06:15:00'
  },
  {
    id: 'seed-ship-005',
    shipmentCode: 'SHP-2026-3301',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Yazaki EDS Vietnam • KCN VSIP 2',
    createdByUsername: 'customer',
    originId: 'caimep',
    destinationId: 'vsip2',
    originName: 'Cụm Cảng Cái Mép – Thị Vải',
    destinationName: 'KCN VSIP 2 & TP. Mới Bình Dương',
    originCoords: [10.5182, 107.0215],
    destCoords: [11.0512, 106.6985],
    distanceKm: 82.1,
    status: 'COMPLETED',
    statusLabel: 'Đã cập bến • Hoàn tất bàn giao ePOD',
    currentLocation: 'Bãi giao nhận Nhà máy Yazaki VSIP 2',
    speedKmh: 0,
    progress: 100.0,
    traveledKm: 82.1,
    remainingKm: 0.0,
    initialEtaMinutes: 115,
    etaMinutes: 0,
    completedAt: '07:45 Sáng nay',
    epodRecipient: 'Trần Thị Thu Thảo (Điều phối kho)',
    epodSignature: 'Đã ký số Token SHA-256',
    cargoType: 'Hạt nhựa công nghiệp nguyên sinh (Bao 25kg)',
    cargoWeightTons: 25.0,
    containerCode: 'TGHU-330198-1',
    containerTypeId: '20_STANDARD',
    containerTypeLabel: 'Container 20ft Tiêu Chuẩn IoT (Smart Standard 20ft)',
    isoType: '22G1',
    containerOwner: 'Textainer Group / Hapag-Lloyd',
    tareWeightKg: 2200,
    maxPayloadKg: 28280,
    cubicCapacityM3: 33.2,
    eSealNumber: 'VN-CUST-330198',
    eSealStatus: 'UNLOCKED_AUTHORIZED',
    eSealIntegrityPct: 100,
    shockG: 0.22,
    supplyAirTempC: 29.0,
    returnAirTempC: 29.5,
    humidityPct: 50,
    solarPowerWatts: 36,
    iotUnitModel: 'Sensitech TempTale GEO / CalAmp TTU-2830',
    cellularNetwork: '4G LTE-M / Roaming Viettel-Vinaphone',
    powertrainId: 'diesel',
    vehicleType: 'Xe diesel tối ưu lộ trình xanh',
    licensePlate: '51D-402.11',
    driverName: 'Võ Thành Đạt',
    driverPhone: '0937 618 904',
    driverLicense: 'GPLX Hạng FC • 6 năm kinh nghiệm',
    driverSafetyScore: 4.88,
    co2SavedKg: 16.4,
    co2ReductionPct: 8.0,
    estimatedCostVnd: 3850000,
    createdAt: '12/11/2026, 05:00:00'
  }
];

/**
 * Load real shipments created by users, normalizing with full container & driver telematics.
 */
export function loadStoredUserShipments() {
  try {
    const raw = window.localStorage.getItem(USER_SHIPMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => {
          const fleet =
            STANDARD_FLEET_CATALOG.find((f) => f.powertrainId === item.powertrainId) ||
            STANDARD_FLEET_CATALOG[idx % STANDARD_FLEET_CATALOG.length];
          const cont =
            SMART_CONTAINER_CATALOG.find((c) => c.typeId === item.containerTypeId) ||
            SMART_CONTAINER_CATALOG[0];
          return {
            ...item,
            containerCode:
              item.containerCode ||
              generateContainerIsoCode(item.containerTypeId === '40_REEFER' ? 'TCKU' : 'MSKU'),
            containerTypeLabel: item.containerTypeLabel || cont.label,
            isoType: item.isoType || cont.isoType,
            containerOwner:
              item.containerOwner ||
              (item.containerTypeId === '40_REEFER'
                ? 'Tân Cảng Sài Gòn (SNP Logistics)'
                : 'Maersk Line A/S'),
            tareWeightKg: item.tareWeightKg || cont.tareWeightKg,
            maxPayloadKg: item.maxPayloadKg || cont.maxPayloadKg,
            cubicCapacityM3: item.cubicCapacityM3 || cont.cubicCapacityM3,
            eSealNumber: item.eSealNumber || generateESealNumber(),
            eSealStatus:
              item.eSealStatus ||
              (item.status === 'COMPLETED' ? 'UNLOCKED_AUTHORIZED' : 'LOCKED_SECURE'),
            eSealIntegrityPct: item.eSealIntegrityPct ?? 100,
            driverName: item.driverName || fleet.driverName,
            driverPhone: item.driverPhone || fleet.driverPhone,
            driverLicense: item.driverLicense || fleet.driverLicense,
            driverSafetyScore:
              item.driverSafetyScore || Number((4.95 - (idx % 3) * 0.05).toFixed(2)),
            supplyAirTempC:
              item.supplyAirTempC ?? (item.containerTypeId === '40_REEFER' ? -18.4 : 26.5),
            returnAirTempC:
              item.returnAirTempC ?? (item.containerTypeId === '40_REEFER' ? -17.9 : 27.1),
            humidityPct: item.humidityPct ?? (item.containerTypeId === '40_REEFER' ? 88 : 55),
            shockG: item.shockG ?? 0.24,
            solarPowerWatts: item.solarPowerWatts ?? 42,
            iotUnitModel: item.iotUnitModel || cont.telematicsUnit,
            cellularNetwork: item.cellularNetwork || '4G LTE-M / Vệ tinh LEO Direct'
          };
        });
      }
    }
  } catch (_) {
    // ignore
  }
  return DEFAULT_SEED_SHIPMENTS;
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
      m.bindTooltip(
        `<div style="font-size:11.5px;font-weight:600;line-height:1.4;">
          <strong>${node.label}</strong><br/>
          <span>${NODE_ADDRESSES[node.id] || ''}</span>
        </div>`,
        { direction: 'top', offset: [0, -18] }
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
        icon: LayoutDashboard,
        badge: null
      },
      {
        id: 'tracking',
        label: 'Bản Đồ 3D Giám Sát Real-Time',
        shortLabel: 'Bản Đồ 3D',
        icon: Navigation,
        badge: 'LIVE'
      },
      {
        id: 'containers',
        label: 'Giám Sát Danh Sách Container & Tài Xế',
        shortLabel: 'DS Container',
        icon: Box,
        badge: 'cont'
      }
    ]
  },
  {
    group: 'NGHIỆP VỤ THUÊ VẬN TẢI',
    items: [
      {
        id: 'booking',
        label: 'Đặt Thuê Xe & Tối Ưu Tuyến (UC05)',
        shortLabel: 'Đặt Thuê Xe',
        icon: PlusCircle,
        badge: null
      },
      {
        id: 'orders',
        label: 'Quản Lý Vận Đơn & Hợp Đồng',
        shortLabel: 'Quản Lý Đơn',
        icon: Package,
        badge: 'count'
      }
    ]
  },
  {
    group: 'HẠ TẦNG & DANH MỤC LOGISTICS',
    items: [
      {
        id: 'hubs',
        label: 'Danh Mục Cảng & Trạm Sạc Xanh',
        shortLabel: 'Hạ Tầng Cảng',
        icon: MapPin,
        badge: '7 HUB'
      },
      {
        id: 'fleet',
        label: 'Danh Mục Đội Xe & Chuẩn GLEC',
        shortLabel: 'Đội Xe Chuẩn',
        icon: Truck,
        badge: null
      }
    ]
  },
  {
    group: 'KIỂM TOÁN CARBON & HỒ SƠ',
    items: [
      {
        id: 'carbon',
        label: 'Sổ Cái CO2e & Chứng Nhận ISO 14083',
        shortLabel: 'Sổ Cái CO2e',
        icon: FileCheck2,
        badge: null
      },
      {
        id: 'profile',
        label: 'Hồ Sơ Doanh Nghiệp & Cảnh Báo',
        shortLabel: 'Hồ Sơ B2B',
        icon: Building2,
        badge: null
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [allShipments, setAllShipments] = useState(() => loadStoredUserShipments());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedContractModal, setSelectedContractModal] = useState(null);
  const [selectedESealModal, setSelectedESealModal] = useState(null);
  const [selectedIoTModal, setSelectedIoTModal] = useState(null);
  const [selectedDriverModal, setSelectedDriverModal] = useState(null);
  const [containerStatusFilter, setContainerStatusFilter] = useState('ALL'); // 'ALL' | 'IN_TRANSIT' | 'COMPLETED'
  const [containerTypeFilter, setContainerTypeFilter] = useState('ALL');
  const [containerSearch, setContainerSearch] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [isLiveSim, setIsLiveSim] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 1 = Real-time 1x (Khớp thực tế ~52 km/h), 2 = 2x, 5 = 5x, 10 = 10x, 0 = Tạm dừng
  const [followVehicle, setFollowVehicle] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Booking form state with Smart Container IoT hardware options
  const [bookingForm, setBookingForm] = useState({
    originId: 'catlai',
    destinationId: 'vsip',
    containerTypeId: '40_REEFER',
    cargoType: 'Chuỗi lạnh tiêu chuẩn (-18°C)',
    cargoWeightTons: 16,
    powertrainId: 'ev',
    paretoModeId: 'PARETO_BALANCED',
    requireESeal: true,
    requireShockSensor: true,
    requireReeferTelematics: true,
    pickupDate: new Date().toISOString().slice(0, 10),
    pickupTime: '08:30',
    notes: 'Ưu tiên lộ trình xanh tránh ùn tắc cầu Phú Mỹ, duy trì nhiệt độ thùng đông lạnh -18°C, giám sát Khóa Seal Hải quan GPS.'
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

  // PER-USER ISOLATION: Show shipments created by this user/account and company demo seed containers!
  const userOwnShipments = useMemo(() => {
    if (!user) return allShipments;
    const currentUsername = (user.username || '').toLowerCase().trim();
    const currentCustomerId = (user.customerId || '').toUpperCase().trim();

    return allShipments.filter((s) => {
      const matchUsername =
        s.createdByUsername && s.createdByUsername.toLowerCase().trim() === currentUsername;
      const matchCustomerId =
        currentCustomerId &&
        currentCustomerId !== 'KHACH_HANG_MOI' &&
        s.customerId?.toUpperCase().trim() === currentCustomerId;
      const matchCompanySeed =
        s.createdByUsername === 'customer' || s.customerId === 'DOANH_NGHIEP_B2B';
      return matchUsername || matchCustomerId || matchCompanySeed;
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
        s.licensePlate.toLowerCase().includes(q) ||
        s.vehicleType.toLowerCase().includes(q)
      );
    });
  }, [userOwnShipments, statusFilter, searchQuery]);

  // Container fleet KPI metrics
  const containerKpi = useMemo(() => {
    const total = userOwnShipments.length;
    const inTransit = userOwnShipments.filter((s) => s.status === 'IN_TRANSIT').length;
    const completed = userOwnShipments.filter((s) => s.status === 'COMPLETED').length;
    const reeferCount = userOwnShipments.filter((s) => s.containerTypeId === '40_REEFER').length;
    const dryCount = total - reeferCount;
    return { total, inTransit, completed, reeferCount, dryCount };
  }, [userOwnShipments]);

  // Filtered containers for the Containers Monitoring Tab
  const filteredContainers = useMemo(() => {
    return userOwnShipments.filter((ship) => {
      if (containerStatusFilter === 'IN_TRANSIT' && ship.status !== 'IN_TRANSIT') return false;
      if (containerStatusFilter === 'COMPLETED' && ship.status !== 'COMPLETED') return false;
      if (containerTypeFilter !== 'ALL' && ship.containerTypeId !== containerTypeFilter) return false;

      if (!containerSearch.trim()) return true;
      const q = containerSearch.toLowerCase().trim();
      return (
        (ship.containerCode || '').toLowerCase().includes(q) ||
        (ship.shipmentCode || '').toLowerCase().includes(q) ||
        (ship.driverName || '').toLowerCase().includes(q) ||
        (ship.driverPhone || '').toLowerCase().includes(q) ||
        (ship.licensePlate || '').toLowerCase().includes(q) ||
        (ship.originName || '').toLowerCase().includes(q) ||
        (ship.destinationName || '').toLowerCase().includes(q) ||
        (ship.eSealNumber || '').toLowerCase().includes(q)
      );
    });
  }, [userOwnShipments, containerStatusFilter, containerTypeFilter, containerSearch]);

  // User-decided live route tracking state (allows user to freely decide Origin & Destination anytime)
  const [liveOriginId, setLiveOriginId] = useState('catlai');
  const [liveDestId, setLiveDestId] = useState('vsip');
  const [trackingSource, setTrackingSource] = useState('interactive'); // 'interactive' (Tuyến tự chọn) | 'shipment' (Vận đơn đã đặt)
  const [interactiveProgress, setInteractiveProgress] = useState(0.0);
  const [interactiveSpeedKmh, setInteractiveSpeedKmh] = useState(52);

  // Active shipment currently selected for tracking inspection
  const activeShipment = useMemo(() => {
    if (userOwnShipments.length === 0) return null;
    return (
      userOwnShipments.find((s) => s.shipmentCode === selectedCode) || userOwnShipments[0] || null
    );
  }, [userOwnShipments, selectedCode]);

  // Determine current active nodes for tracking (user-decided or active shipment)
  const trackingOriginNode = useMemo(() => {
    const id = trackingSource === 'shipment' && activeShipment ? activeShipment.originId : liveOriginId;
    return HUB_CORRIDOR_DIRECTORY.find((h) => h.id === id) || HUB_CORRIDOR_DIRECTORY[0];
  }, [trackingSource, activeShipment, liveOriginId]);

  const trackingDestNode = useMemo(() => {
    const id = trackingSource === 'shipment' && activeShipment ? activeShipment.destinationId : liveDestId;
    return HUB_CORRIDOR_DIRECTORY.find((h) => h.id === id) || HUB_CORRIDOR_DIRECTORY[1];
  }, [trackingSource, activeShipment, liveDestId]);

  const trackingOriginLabel = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment) return activeShipment.originName;
    return `${trackingOriginNode.label}, ${trackingOriginNode.area}`;
  }, [trackingSource, activeShipment, trackingOriginNode]);

  const trackingDestLabel = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment) return activeShipment.destinationName;
    return `${trackingDestNode.label}, ${trackingDestNode.area}`;
  }, [trackingSource, activeShipment, trackingDestNode]);

  // Turn-by-turn road route strictly calculated from the user-decided Origin and Destination
  const currentLiveRoute = useMemo(() => {
    const oId = trackingSource === 'shipment' && activeShipment ? activeShipment.originId : liveOriginId;
    const dId = trackingSource === 'shipment' && activeShipment ? activeShipment.destinationId : liveDestId;
    return getRealRoadRoute(oId, dId);
  }, [trackingSource, activeShipment, liveOriginId, liveDestId]);

  const trackingWaypoints = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.waypoints?.length > 5) {
      return activeShipment.waypoints;
    }
    return currentLiveRoute.points || [];
  }, [trackingSource, activeShipment, currentLiveRoute]);

  const trackingProgress = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment) {
      return Number(activeShipment.progress) || 0;
    }
    return interactiveProgress;
  }, [trackingSource, activeShipment, interactiveProgress]);

  const trackingSpeedKmh = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment) {
      return Number(activeShipment.speedKmh) || 52;
    }
    return interactiveSpeedKmh;
  }, [trackingSource, activeShipment, interactiveSpeedKmh]);

  const trackingDistanceKm = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment) {
      return Number(activeShipment.distanceKm) || currentLiveRoute.distanceKm;
    }
    return currentLiveRoute.distanceKm;
  }, [trackingSource, activeShipment, currentLiveRoute]);

  const trackingTraveledKm = useMemo(() => {
    return Number(((trackingProgress / 100) * trackingDistanceKm).toFixed(1));
  }, [trackingProgress, trackingDistanceKm]);

  const trackingRemainingKm = useMemo(() => {
    return Number(Math.max(0, trackingDistanceKm - trackingTraveledKm).toFixed(1));
  }, [trackingDistanceKm, trackingTraveledKm]);

  const trackingEtaMinutes = useMemo(() => {
    if (trackingRemainingKm <= 0) return 0;
    return Math.max(1, Math.round((trackingRemainingKm / Math.max(20, trackingSpeedKmh)) * 60));
  }, [trackingRemainingKm, trackingSpeedKmh]);

  // Vehicle position on map
  const trackingVehiclePosition = useMemo(() => {
    if (!trackingWaypoints || trackingWaypoints.length === 0) return [10.7623, 106.7824];
    return interpolateRoadPosition(trackingWaypoints, trackingProgress);
  }, [trackingWaypoints, trackingProgress]);

  // Highway Checkpoints along user-decided route
  const trackingCheckpoints = useMemo(() => {
    return buildRouteCheckpoints(
      trackingOriginNode.id,
      trackingDestNode.id,
      trackingOriginLabel,
      trackingDestLabel,
      trackingDistanceKm,
      trackingProgress
    );
  }, [trackingOriginNode, trackingDestNode, trackingOriginLabel, trackingDestLabel, trackingDistanceKm, trackingProgress]);

  // Smart Container IoT Telematics & E-Seal computed state
  const currentContainerCode = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.containerCode) {
      return activeShipment.containerCode;
    }
    return 'TCKU-781920-4';
  }, [trackingSource, activeShipment]);

  const currentESealNumber = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.eSealNumber) {
      return activeShipment.eSealNumber;
    }
    return 'VN-CUST-819204';
  }, [trackingSource, activeShipment]);

  const currentShockG = useMemo(() => {
    const base = trackingSpeedKmh > 55 ? 0.32 : 0.22;
    return Number((base + Math.sin(trackingProgress) * 0.05).toFixed(2));
  }, [trackingSpeedKmh, trackingProgress]);

  const currentSupplyAirTempC = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.supplyAirTempC != null) {
      return activeShipment.supplyAirTempC;
    }
    return -18.4;
  }, [trackingSource, activeShipment]);

  const currentReturnAirTempC = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.returnAirTempC != null) {
      return activeShipment.returnAirTempC;
    }
    return -17.9;
  }, [trackingSource, activeShipment]);

  const currentHumidityPct = useMemo(() => {
    if (trackingSource === 'shipment' && activeShipment?.humidityPct != null) {
      return activeShipment.humidityPct;
    }
    return 88;
  }, [trackingSource, activeShipment]);

  // Real-time GPS telemetry tick based on authentic vehicle speed & physics
  useEffect(() => {
    if (!isLiveSim || simSpeed === 0) return undefined;

    const intervalMs = 2000; // 2 seconds per GPS heartbeat
    const dtSeconds = intervalMs / 1000;

    const timer = setInterval(() => {
      // 1. Tick for interactive user-defined route
      setInteractiveSpeedKmh((prevSpd) => {
        const delta = (Math.random() - 0.48) * 1.8;
        return Math.round(Math.max(44, Math.min(62, prevSpd + delta)));
      });

      setInteractiveProgress((prevProg) => {
        const distKm = Number(currentLiveRoute.distanceKm) || 28.9;
        const spd = interactiveSpeedKmh;
        const metersMoved = ((spd * 1000) / 3600) * dtSeconds * simSpeed;
        const totalMeters = distKm * 1000;
        const pctMoved = (metersMoved / totalMeters) * 100;
        return Math.min(99.9, Number((prevProg + pctMoved).toFixed(2)));
      });

      // 2. Tick for user own shipments in transit
      if (userOwnShipments.length > 0 && userOwnShipments.some((s) => s.status === 'IN_TRANSIT')) {
        setAllShipments((prev) => {
          let changed = false;
          const updated = prev.map((s) => {
            if (s.status !== 'IN_TRANSIT') return s;
            changed = true;

            const distKm = Number(s.distanceKm) || 28.9;
            const currentSpeed = Number(s.speedKmh) || 52;
            const speedDelta = (Math.random() - 0.48) * 1.8;
            const nextSpeed = Math.round(Math.max(42, Math.min(64, currentSpeed + speedDelta)));

            const metersMoved = ((nextSpeed * 1000) / 3600) * dtSeconds * simSpeed;
            const totalMeters = distKm * 1000;
            const pctMoved = (metersMoved / totalMeters) * 100;

            const currentProg = Number(s.progress) || 0;
            const nextProg = Math.min(99.9, Number((currentProg + pctMoved).toFixed(2)));

            const traveledKm = Number(((nextProg / 100) * distKm).toFixed(1));
            const remainingKm = Number(Math.max(0, distKm - traveledKm).toFixed(1));
            const nextEta =
              remainingKm <= 0 ? 0 : Math.max(1, Math.round((remainingKm / nextSpeed) * 60));

            return {
              ...s,
              progress: nextProg,
              speedKmh: nextSpeed,
              traveledKm,
              remainingKm,
              etaMinutes: nextEta,
              currentLocation:
                nextProg < 5
                  ? `Cổng xuất bến ${s.originName?.split(',')[0] || ''}`
                  : nextProg > 92
                    ? `Tiếp cận điểm giao ${s.destinationName?.split(',')[0] || ''}`
                    : `Đang lưu thông trên hành lang ${distKm} km (50-60 km/h)`
            };
          });

          if (changed) {
            saveStoredUserShipments(updated);
          }
          return updated;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isLiveSim, simSpeed, currentLiveRoute.distanceKm, interactiveSpeedKmh, userOwnShipments]);

  // Handle switching / deciding route interactively
  const handleSelectRoute = (oId, dId) => {
    setLiveOriginId(oId);
    setLiveDestId(dId);
    setInteractiveProgress(0.0);
    setTrackingSource('interactive');
    if (mapInstanceRef.current) {
      const newRoute = getRealRoadRoute(oId, dId);
      if (newRoute.points && newRoute.points.length > 0) {
        const bounds = L.latLngBounds(newRoute.points);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  };

  const handleSwapRoute = () => {
    handleSelectRoute(liveDestId, liveOriginId);
  };

  // Reset progress to 0% to allow testing departure from origin depot
  const handleResetTripProgress = (shipmentCode) => {
    setAllShipments((prev) => {
      const updated = prev.map((s) => {
        if (s.shipmentCode !== shipmentCode) return s;
        const dist = Number(s.distanceKm) || 28.9;
        return {
          ...s,
          progress: 0.0,
          traveledKm: 0.0,
          remainingKm: dist,
          status: 'IN_TRANSIT',
          etaMinutes: s.initialEtaMinutes || Math.round((dist / 52) * 60),
          statusLabel: 'Đang di chuyển trên hành lang xanh 3D',
          currentLocation: `Cổng xuất bến ${s.originName?.split(',')[0] || ''}`
        };
      });
      saveStoredUserShipments(updated);
      return updated;
    });
  };

  const handleResetCurrentProgress = () => {
    if (trackingSource === 'shipment' && activeShipment) {
      handleResetTripProgress(activeShipment.shipmentCode);
    } else {
      setInteractiveProgress(0.0);
    }
  };

  const handleBookCurrentRoute = () => {
    setBookingForm((prev) => ({
      ...prev,
      originId: trackingOriginNode.id,
      destinationId: trackingDestNode.id
    }));
    setActiveTab('booking');
  };

  useEffect(() => {
    if (followVehicle && mapInstanceRef.current && trackingVehiclePosition) {
      mapInstanceRef.current.panTo(trackingVehiclePosition, { animate: true, duration: 0.8 });
    }
  }, [followVehicle, trackingVehiclePosition]);

  // Live scientific quote calculation for Booking tab (GLEC v3.0 & Pareto UC05)
  const bookingQuote = useMemo(() => {
    const originNode =
      HUB_CORRIDOR_DIRECTORY.find((n) => n.id === bookingForm.originId) || HUB_CORRIDOR_DIRECTORY[0];
    const destNode =
      HUB_CORRIDOR_DIRECTORY.find((n) => n.id === bookingForm.destinationId) ||
      HUB_CORRIDOR_DIRECTORY[1];
    const powertrain = POWERTRAINS.find((p) => p.id === bookingForm.powertrainId) || POWERTRAINS[0];
    const fleetConfig =
      STANDARD_FLEET_CATALOG.find((f) => f.powertrainId === bookingForm.powertrainId) ||
      STANDARD_FLEET_CATALOG[0];

    const originCoords = NODE_COORDINATES[originNode.id] || [10.7623, 106.7824];
    const destCoords = NODE_COORDINATES[destNode.id] || [10.9242, 106.7145];

    const glecQuote = calculateDetailedGlecQuote({
      originId: originNode.id,
      destinationId: destNode.id,
      cargoWeightTons: bookingForm.cargoWeightTons,
      powertrainId: bookingForm.powertrainId,
      paretoModeId: bookingForm.paretoModeId
    });

    return {
      originNode,
      destNode,
      originCoords,
      destCoords,
      powertrain,
      fleetConfig,
      ...glecQuote
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

    const containerConfig =
      SMART_CONTAINER_CATALOG.find((c) => c.typeId === bookingForm.containerTypeId) ||
      SMART_CONTAINER_CATALOG[0];

    const fleetModel =
      STANDARD_FLEET_CATALOG.find((f) => f.powertrainId === bookingForm.powertrainId) ||
      STANDARD_FLEET_CATALOG[0];

    const containerCode = generateContainerIsoCode(
      bookingForm.containerTypeId === '40_REEFER' ? 'TCKU' : 'MSKU'
    );
    const eSealNumber = generateESealNumber();
    const isReefer = bookingForm.containerTypeId === '40_REEFER';

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
      containerCode,
      containerTypeId: bookingForm.containerTypeId,
      containerTypeLabel: containerConfig.label,
      isoType: containerConfig.isoType,
      containerOwner: isReefer ? 'Tân Cảng Sài Gòn (SNP Logistics)' : 'Maersk Line A/S',
      tareWeightKg: containerConfig.tareWeightKg || 4480,
      maxPayloadKg: containerConfig.maxPayloadKg || 29520,
      cubicCapacityM3: containerConfig.cubicCapacityM3 || 67.9,
      eSealNumber,
      eSealStatus: 'LOCKED_SECURE',
      eSealIntegrityPct: 100,
      shockG: 0.24,
      supplyAirTempC: isReefer ? -18.4 : 26.5,
      returnAirTempC: isReefer ? -17.9 : 27.1,
      humidityPct: isReefer ? 88 : 55,
      solarPowerWatts: 42,
      iotUnitModel: containerConfig.telematicsUnit,
      cellularNetwork: '4G LTE-M / 18 GNSS Sats (Roaming)',
      distanceKm: bookingQuote.distanceKm,
      powertrainId: bookingForm.powertrainId,
      vehicleType: bookingQuote.powertrain.name,
      licensePlate,
      driverName: fleetModel.driverName || 'Nguyễn Văn Tài',
      driverPhone: fleetModel.driverPhone || '0903 812 456',
      driverLicense: fleetModel.driverLicense || 'GPLX Hạng FC • 9 năm kinh nghiệm',
      driverSafetyScore: 4.95,
      status: 'IN_TRANSIT',
      statusLabel: 'Đang di chuyển trên hành lang xanh 3D',
      currentLocation: `Cổng xuất bến ${bookingQuote.originNode.label}`,
      speedKmh: 52,
      initialEtaMinutes: bookingQuote.etaMinutes,
      etaMinutes: bookingQuote.etaMinutes,
      temperatureC: isReefer ? -18.0 : 18.5,
      baselineCo2Kg: bookingQuote.baselineCo2Kg,
      actualCo2Kg: bookingQuote.actualCo2Kg,
      co2SavedKg: bookingQuote.savedCo2Kg,
      co2ReductionPct: bookingQuote.reductionPct,
      wttCo2Kg: bookingQuote.wttCo2Kg,
      ttwCo2Kg: bookingQuote.ttwCo2Kg,
      energyConsumed: bookingQuote.energyConsumed,
      energyUnit: bookingQuote.energyUnit,
      estimatedCostVnd: bookingQuote.estimatedCostVnd,
      progress: 0.0,
      traveledKm: 0.0,
      remainingKm: bookingQuote.distanceKm,
      corridorState: 'ON_CORRIDOR (Bám sát tim đường lộ trình thực tế)',
      certificateHash: `0x${Math.random().toString(16).slice(2, 18)}${Math.random()
        .toString(16)
        .slice(2, 18)}`,
      pickupDate: bookingForm.pickupDate,
      pickupTime: bookingForm.pickupTime,
      notes: bookingForm.notes,
      paretoMode: bookingForm.paretoModeId,
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
      // Local sync
    }

    const updated = [newOrder, ...allShipments];
    setAllShipments(updated);
    saveStoredUserShipments(updated);

    setSelectedCode(newCode);
    setBookingSuccess(
      `Đã đặt thuê xe & khởi tạo vận đơn ${newCode} thành công! Xe ${licensePlate} đã sẵn sàng xuất bến tại ${bookingQuote.originNode.label} (tiết kiệm ${bookingQuote.savedCo2Kg} kg CO2e).`
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
          1. COLLAPSIBLE CUSTOMER B2B SIDEBAR (THU GỌN / MỞ RỘNG LINH HOẠT)
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: isSidebarCollapsed ? 78 : 280,
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
          zIndex: 35,
          transition: 'width 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Sidebar Brand Header */}
        <div
          style={{
            padding: isSidebarCollapsed ? '20px 10px 16px' : '20px 18px 16px',
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between'
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
                textAlign: 'left',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Về trang chủ CCADRO"
            >
              <CcadroLogo
                size={36}
                showText={!isSidebarCollapsed}
                title="CCADRO B2B"
                subtitle="HỆ THỐNG KHÁCH HÀNG"
              />
            </button>

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Thu gọn thanh bên"
                style={{
                  background: 'rgba(148, 163, 184, 0.12)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: 'inherit',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </div>

          {/* Toggle Expand button when collapsed */}
          {isSidebarCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Mở rộng thanh bên"
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

          {/* Active Partner Workspace Card */}
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
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '6px 4px',
                borderRadius: 8,
                background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#10b981'
              }}
              title={`Mã đối tác: ${user?.customerId || 'B2B'} (${user?.companyName || user?.fullName})`}
            >
              B2B
            </div>
          )}
        </div>

        {/* Sidebar Navigation Groups */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isSidebarCollapsed ? '12px 8px' : '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.group}>
              {!isSidebarCollapsed && (
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    opacity: 0.55,
                    padding: '0 10px 6px'
                  }}
                >
                  {section.group}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                        gap: 10,
                        padding: isSidebarCollapsed ? '11px 0' : '10px 12px',
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
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 0
                        }}
                      >
                        <Icon size={18} style={{ flexShrink: 0 }} />
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

                      {!isSidebarCollapsed && (
                        <>
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
                          {item.id === 'containers' && (
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
                              {containerKpi.inTransit > 0 ? `${containerKpi.inTransit} Đi` : containerKpi.total}
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
                          {item.id === 'hubs' && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                opacity: 0.65
                              }}
                            >
                              7 HUB
                            </span>
                          )}
                        </>
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
            padding: isSidebarCollapsed ? '12px 8px 16px' : '14px 14px 18px',
            borderTop: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {!isSidebarCollapsed ? (
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
          ) : (
            <div
              style={{ textAlign: 'center', fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}
              title="Dữ liệu kết nối trực tiếp Real-Time"
            >
              ● LIVE
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            title={isSidebarCollapsed ? 'Đăng xuất tài khoản' : undefined}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: isSidebarCollapsed ? '9px 0' : '9px 14px',
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} />
            {!isSidebarCollapsed && <span>Đăng Xuất Tài Khoản</span>}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          2. MAIN WORKSPACE (TOP NAVIGATION BAR + COMPONENT VIEWS)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* ── Top Header Navigation Bar ── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: isDark ? 'rgba(6, 22, 17, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            borderBottom: isDark
              ? '1px solid rgba(110, 231, 183, 0.14)'
              : '1px solid rgba(15, 23, 42, 0.08)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          {/* Left: Collapse Toggle + Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: subtleBg,
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
              <h1 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '2px 0 0' }}>
                {currentNavMeta.label}
              </h1>
            </div>
          </div>

          {/* Center: Quick Top Navigation Pills */}
          <nav
            aria-label="Điều hướng nhanh hệ thống khách hàng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
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
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: active
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'transparent',
                    color: active ? '#042f2e' : 'inherit',
                    fontSize: '0.76rem',
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

          {/* ── 4 REAL-TIME KPI CARDS (100% TỪ VẬN ĐƠN THỰC CỦA TÀI KHOẢN) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                    ? 'Tài khoản mới • Chưa phát sinh đơn'
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
                    : 'Hạch toán theo chuẩn GLEC v3 WTW',
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
                    onClick={() => setActiveTab('containers')}
                    className="lp-btn lp-btn--ghost lp-btn--sm"
                    style={{
                      color: '#38bdf8',
                      borderColor: 'rgba(56, 189, 248, 0.45)',
                      background: 'rgba(56, 189, 248, 0.08)'
                    }}
                  >
                    <Box size={15} /> DS Container ({containerKpi.inTransit} Đi / {containerKpi.completed} Tới)
                  </button>
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
                              <span>Thực tế WTW: {s.actualCo2Kg} kg</span>
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
                          strokeDasharray={`${(kpiStats.evCount / Math.max(1, kpiStats.totalOrders)) * 289} 289`}
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
                              {Number(s.progress || 0).toFixed(1)}% ({s.speedKmh} km/h)
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
                  center={trackingVehiclePosition || [10.785, 106.765]}
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
                  {trackingWaypoints.length > 0 && (
                    <>
                      <RoutePolyline
                        positions={trackingWaypoints}
                        color="#10b981"
                        weight={5}
                        showCorridorBuffer={true}
                      />
                      <OriginMarker
                        position={trackingWaypoints[0]}
                        label={trackingOriginLabel}
                      />
                      <DestinationMarker
                        position={trackingWaypoints[trackingWaypoints.length - 1]}
                        label={trackingDestLabel}
                      />
                      <VehicleMarker
                        position={trackingVehiclePosition}
                        vehicleCode={
                          trackingSource === 'shipment' && activeShipment
                            ? activeShipment.licensePlate
                            : '51C-ECO.99'
                        }
                        speedKmh={trackingSpeedKmh}
                        status="ON_ROUTE"
                        label={
                          trackingSource === 'shipment' && activeShipment
                            ? activeShipment.vehicleType
                            : 'Xe đầu kéo điện (EV)'
                        }
                      />
                    </>
                  )}
                </MapView>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: 3D REAL-TIME GOOGLE MAP TRACKING (USER-DECIDED ROUTE OR ORDERS)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'tracking' && (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* TOP: Interactive Origin & Destination Controller */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: 20,
                  background: cardBg,
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#10b981',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase'
                      }}
                    >
                      BỘ ĐIỀU KHIỂN ĐỊNH VỊ REAL-TIME DO NGƯỜI DÙNG QUYẾT ĐỊNH
                    </div>
                    <h2 style={{ fontSize: '1.24rem', fontWeight: 800, margin: '3px 0' }}>
                      Tùy Chọn Điểm Bắt Đầu &amp; Điểm Tới Trên Bản Đồ Vệ Tinh 3D
                    </h2>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0 }}>
                      Khảo sát lộ trình tim đường cao tốc thực tế, các trạm kiểm soát liên tỉnh, tốc
                      độ xe chạy và hạch toán giảm phát thải GLEC v3.0 tức thì.
                    </p>
                  </div>

                  {/* Mode switcher if user has booked shipments */}
                  {userOwnShipments.length > 0 && (
                    <div
                      style={{
                        display: 'inline-flex',
                        background: subtleBg,
                        padding: 3,
                        borderRadius: 10,
                        border: '1px solid rgba(148,163,184,0.2)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setTrackingSource('interactive')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 7,
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: trackingSource === 'interactive' ? '#10b981' : 'transparent',
                          color: trackingSource === 'interactive' ? '#042f2e' : 'inherit'
                        }}
                      >
                        ● Tuyến Tự Chọn ({HUB_CORRIDOR_DIRECTORY.length} Hubs)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrackingSource('shipment')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 7,
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: trackingSource === 'shipment' ? '#10b981' : 'transparent',
                          color: trackingSource === 'shipment' ? '#042f2e' : 'inherit'
                        }}
                      >
                        📦 Vận Đơn Của Bạn ({userOwnShipments.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Origin & Destination Dropdown Selectors */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) auto repeat(auto-fit, minmax(240px, 1fr)) auto',
                    gap: 12,
                    alignItems: 'end'
                  }}
                >
                  {/* Origin */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        marginBottom: 6,
                        color: '#10b981'
                      }}
                    >
                      🚩 Điểm Bắt Đầu (Origin) *
                    </label>
                    <select
                      value={liveOriginId}
                      onChange={(e) => handleSelectRoute(e.target.value, liveDestId)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      {HUB_CORRIDOR_DIRECTORY.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label} — {h.area}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={handleSwapRoute}
                    title="Đảo chiều hành trình (Swap Origin & Destination)"
                    style={{
                      height: 42,
                      padding: '0 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(16,185,129,0.35)',
                      background: 'rgba(16,185,129,0.12)',
                      color: '#10b981',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ArrowLeftRight size={16} />
                  </button>

                  {/* Destination */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        marginBottom: 6,
                        color: '#38bdf8'
                      }}
                    >
                      🏁 Điểm Tới (Destination) *
                    </label>
                    <select
                      value={liveDestId}
                      onChange={(e) => handleSelectRoute(liveOriginId, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      {HUB_CORRIDOR_DIRECTORY.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label} — {h.area}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Book Button */}
                  <button
                    type="button"
                    onClick={handleBookCurrentRoute}
                    className="lp-btn lp-btn--primary"
                    style={{
                      height: 42,
                      padding: '0 18px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    title="Chuyển sang form đặt xe với điểm bắt đầu và điểm tới vừa chọn"
                  >
                    <PlusCircle size={16} /> Đặt Thuê Tuyến Này
                  </button>
                </div>

                {/* Quick Corridor Selection Chips */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(148,163,184,0.15)'
                  }}
                >
                  <span style={{ fontSize: '0.72rem', opacity: 0.75, fontWeight: 700 }}>
                    Hành lang gợi ý:
                  </span>
                  {[
                    { o: 'catlai', d: 'vsip', label: 'Cát Lái → VSIP 1 (28.9 km)' },
                    { o: 'catlai', d: 'songthan', label: 'Cát Lái → Sóng Thần (18.6 km)' },
                    { o: 'catlai', d: 'caimep', label: 'Cát Lái → Cái Mép (67.4 km)' },
                    { o: 'tanbinh', d: 'vsip', label: 'Tân Bình → VSIP 1 (24.2 km)' },
                    { o: 'hiepphuoc', d: 'nhontrach', label: 'Hiệp Phước → Nhơn Trạch (39.8 km)' },
                    { o: 'caimep', d: 'vsip2', label: 'Cái Mép → VSIP 2 (82.1 km)' },
                    { o: 'amata', d: 'catlai', label: 'Amata → Cát Lái (34.5 km)' },
                    { o: 'longhau', d: 'vsip', label: 'Long Hậu → VSIP 1 (38.2 km)' }
                  ].map((corr) => {
                    const isActive = liveOriginId === corr.o && liveDestId === corr.d;
                    return (
                      <button
                        key={`${corr.o}-${corr.d}`}
                        type="button"
                        onClick={() => handleSelectRoute(corr.o, corr.d)}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: isActive ? 800 : 600,
                          padding: '4px 9px',
                          borderRadius: 8,
                          border: isActive
                            ? '1.5px solid #10b981'
                            : '1px solid rgba(148,163,184,0.25)',
                          background: isActive ? 'rgba(16,185,129,0.18)' : subtleBg,
                          color: isActive ? '#10b981' : 'inherit',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {corr.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MAIN CONTENT: Shipment Selector (if any) + 3D Map & Telemetry Inspector */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    trackingSource === 'shipment' && userOwnShipments.length > 0
                      ? 'minmax(280px, 340px) 1fr'
                      : '1fr',
                  gap: 20,
                  alignItems: 'start'
                }}
              >
                {/* Left Column: Shipment List (only when tracking user shipments) */}
                {trackingSource === 'shipment' && userOwnShipments.length > 0 && (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 20,
                      background: cardBg,
                      border: cardBorder
                    }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#10b981',
                          textTransform: 'uppercase'
                        }}
                      >
                        Vận Đơn Thực Tế Của Bạn ({userOwnShipments.length})
                      </div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>
                        Chọn vận đơn để khóa camera 3D theo xe trên bản đồ Google Maps
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {userOwnShipments.map((s) => {
                        const isSelected = activeShipment?.shipmentCode === s.shipmentCode;
                        return (
                          <div
                            key={s.shipmentCode}
                            onClick={() => {
                              setSelectedCode(s.shipmentCode);
                              if (s.originId && s.destinationId) {
                                setLiveOriginId(s.originId);
                                setLiveDestId(s.destinationId);
                              }
                            }}
                            style={{
                              padding: 13,
                              borderRadius: 14,
                              background: isSelected ? 'rgba(16, 185, 129, 0.14)' : subtleBg,
                              border: isSelected
                                ? '1.5px solid #10b981'
                                : '1px solid rgba(148, 163, 184, 0.2)',
                              cursor: 'pointer',
                              transition: 'all 0.18s'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifySelf: 'space-between',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6
                              }}
                            >
                              <code
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: isSelected ? '#10b981' : 'inherit'
                                }}
                              >
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
                              <span>
                                {s.speedKmh ? `${s.speedKmh} km/h • ` : ''}Tiến độ:{' '}
                                {Number(s.progress || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Right Column: 3D Map, Telemetry Gauges & Checkpoints */}
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
                        BẢN ĐỒ VỆ TINH 3D GOOGLE HYBRID •{' '}
                        {trackingSource === 'shipment' && activeShipment
                          ? activeShipment.shipmentCode
                          : 'GIÁM SÁT TUYẾN THEO YÊU CẦU'}
                      </span>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '3px 0' }}>
                        {trackingOriginLabel} → {trackingDestLabel}
                      </h3>
                      <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 4 }}>
                        Tọa độ xe thực tế:{' '}
                        <code style={{ color: '#10b981', fontWeight: 700 }}>
                          {trackingVehiclePosition[0].toFixed(4)}°N,{' '}
                          {trackingVehiclePosition[1].toFixed(4)}°E
                        </code>
                        <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
                        <span>
                          Đã đi:{' '}
                          <strong style={{ color: '#38bdf8' }}>{trackingTraveledKm} km</strong> /{' '}
                          {trackingDistanceKm} km ({trackingProgress.toFixed(1)}%)
                        </span>
                        <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          Bám sát tim đường cao tốc (Độ lệch buffer &lt; 50m)
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}
                    >
                      {/* Simulation Speed Multipliers */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'rgba(15,23,42,0.6)',
                          borderRadius: 9,
                          padding: '2px 4px',
                          border: '1px solid rgba(148,163,184,0.25)',
                          gap: 2
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.68rem',
                            opacity: 0.72,
                            padding: '0 4px',
                            fontWeight: 700
                          }}
                        >
                          Tốc độ:
                        </span>
                        {[
                          { val: 1, label: '1x Thực tế' },
                          { val: 2, label: '2x' },
                          { val: 5, label: '5x' },
                          { val: 10, label: '10x' }
                        ].map((spd) => {
                          const active = simSpeed === spd.val && isLiveSim;
                          return (
                            <button
                              key={spd.val}
                              type="button"
                              onClick={() => {
                                setSimSpeed(spd.val);
                                setIsLiveSim(true);
                              }}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: active ? 800 : 600,
                                border: 'none',
                                background: active ? '#10b981' : 'transparent',
                                color: active ? '#042f2e' : 'inherit',
                                cursor: 'pointer'
                              }}
                              title={`Chạy mô phỏng ở tốc độ ${spd.label}`}
                            >
                              {spd.label}
                            </button>
                          );
                        })}
                      </div>

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

                      <button
                        type="button"
                        onClick={handleResetCurrentProgress}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '7px 11px',
                          borderRadius: 9,
                          border: '1px solid rgba(148,163,184,0.3)',
                          background: 'rgba(148,163,184,0.1)',
                          color: 'inherit',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Đặt lại vị trí xe về điểm xuất phát (0%)"
                      >
                        <RotateCcw size={13} /> Đặt lại 0%
                      </button>

                      {trackingSource === 'shipment' &&
                        activeShipment &&
                        activeShipment.status === 'IN_TRANSIT' && (
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

                  {/* Leaflet 3D Map View */}
                  <div style={{ marginBottom: 16 }}>
                    <MapView
                      center={trackingVehiclePosition}
                      zoom={11}
                      height="400px"
                      defaultTile="google_hybrid"
                      default3D={true}
                      defaultPitch={38}
                      overlayTitle={`${trackingOriginNode.label} → ${trackingDestNode.label} (${trackingDistanceKm} km)`}
                      onMapReady={(m) => {
                        mapInstanceRef.current = m;
                      }}
                    >
                      <RoutePolyline
                        positions={trackingWaypoints}
                        color="#10b981"
                        weight={5}
                        showCorridorBuffer={true}
                      />
                      <OriginMarker
                        position={trackingWaypoints[0]}
                        label={trackingOriginLabel}
                      />
                      <DestinationMarker
                        position={trackingWaypoints[trackingWaypoints.length - 1]}
                        label={trackingDestLabel}
                      />
                      <VehicleMarker
                        position={trackingVehiclePosition}
                        vehicleCode={
                          trackingSource === 'shipment' && activeShipment
                            ? activeShipment.licensePlate
                            : '51C-ECO.99'
                        }
                        speedKmh={trackingSpeedKmh}
                        status="ON_ROUTE"
                        label={
                          trackingSource === 'shipment' && activeShipment
                            ? activeShipment.vehicleType
                            : 'Xe đầu kéo điện (EV) • Hàng chuỗi lạnh'
                        }
                      />
                    </MapView>
                  </div>

                  {/* 5 Telemetry Gauges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 12,
                      marginBottom: 16
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
                      <strong style={{ fontSize: '1.15rem' }}>{trackingSpeedKmh} km/h</strong>
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
                        <Activity size={13} color="#10b981" /> Tiến độ &amp; Đã đi
                      </div>
                      <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>
                        {trackingProgress.toFixed(1)}%
                      </strong>
                      <div style={{ fontSize: '0.68rem', opacity: 0.75, marginTop: 2 }}>
                        {trackingTraveledKm} / {trackingDistanceKm} km
                      </div>
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
                        {trackingEtaMinutes > 0 ? `${trackingEtaMinutes} phút` : 'Đã đến đích'}
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
                        {trackingSource === 'shipment' && activeShipment
                          ? `${activeShipment.temperatureC}°C`
                          : '-18.2°C'}
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
                        {trackingSource === 'shipment' && activeShipment
                          ? `-${activeShipment.co2SavedKg} kg`
                          : `-${Math.round(trackingDistanceKm * 16 * 0.043)} kg`}
                      </strong>
                    </div>
                  </div>

                  {/* Smart Container IoT Telematics & E-Seal Monitoring Card */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: subtleBg,
                      border: '1px solid rgba(56, 189, 248, 0.28)',
                      marginBottom: 16
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(56, 189, 248, 0.18)',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Radio size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                            HỘP ĐEN IOT CONTAINER &amp; KHÓA SEAL ĐIỆN TỬ HẢI QUAN
                          </div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                            Hệ thống thiết bị viễn thông độc lập gắn trực tiếp trên vỏ container (Solar + Pin 7 năm)
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedESealModal({
                              eSealNumber: currentESealNumber,
                              containerCode: currentContainerCode,
                              status: 'LOCKED_SECURE',
                              integrityPct: 100,
                              batteryPct: 98,
                              voltageV: 3.62,
                              isoStandard: 'ISO 17712 High Security Seal',
                              lastPing: new Date().toLocaleTimeString('vi-VN'),
                              geofenceCorridor: `${trackingOriginLabel} ↔ ${trackingDestLabel}`
                            })
                          }
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Lock size={12} /> Chứng Thư Seal Hải Quan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedIoTModal({
                              containerCode: currentContainerCode,
                              eSealNumber: currentESealNumber,
                              hardwareModel: 'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3',
                              solarPowerWatts: 42,
                              batteryLife: 'Pin Li-SOCl2 19Ah (tuổi thọ 7 năm)',
                              connectivity: '4G LTE-M / NB-IoT / Vệ tinh LEO Direct',
                              supplyAirTemp: currentSupplyAirTempC,
                              returnAirTemp: currentReturnAirTempC,
                              humidity: currentHumidityPct,
                              shockG: currentShockG,
                              doorStatus: 'Đóng kín (Optical Door Breach OK)'
                            })
                          }
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Cpu size={12} /> Thông Số Hộp Đen
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: 10
                      }}
                    >
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid rgba(148, 163, 184, 0.2)'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', opacity: 0.72, textTransform: 'uppercase' }}>
                          Mã Container ISO 6346
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                          {currentContainerCode}
                        </div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.7, marginTop: 2 }}>
                          Loại: 40ft High Cube Reefer (45R1)
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', opacity: 0.72, textTransform: 'uppercase' }}>
                          Khóa Seal Hải Quan ISO 17712
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                          {currentESealNumber}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#10b981', marginTop: 2, fontWeight: 700 }}>
                          ● ĐANG KHÓA AN TOÀN (TAMPER-FREE)
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid rgba(148, 163, 184, 0.2)'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', opacity: 0.72, textTransform: 'uppercase' }}>
                          Gia Tốc Kế 3 Trục (Chấn Động)
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 2 }}>
                          {currentShockG} G <span style={{ fontSize: '0.7rem', color: '#10b981' }}>(&lt; 1.0G Chuẩn)</span>
                        </div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.7, marginTop: 2 }}>
                          Triệt tiêu dằn xóc, hàng hóa êm ái
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid rgba(148, 163, 184, 0.2)'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', opacity: 0.72, textTransform: 'uppercase' }}>
                          Chuỗi Lạnh: Gió Cấp / Gió Hồi
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                          {currentSupplyAirTempC}°C / {currentReturnAirTempC}°C
                        </div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.7, marginTop: 2 }}>
                          Độ ẩm khoang hàng: {currentHumidityPct}% RH
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corridor Highway Checkpoints Log */}
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: subtleBg,
                      border: '1px solid rgba(148,163,184,0.18)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>
                        ● NHẬT KÝ ĐIỂM CHỐT KIỂM SOÁT HÀNH LANG (CHECKPOINTS)
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                        Ngưỡng an toàn buffer 50m (Vàng) / 200m (Đỏ)
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      {trackingCheckpoints.map((cp) => (
                        <div
                          key={cp.step}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 8,
                            background:
                              cp.state === 'CURRENT'
                                ? 'rgba(16, 185, 129, 0.16)'
                                : 'rgba(255,255,255,0.03)',
                            border:
                              cp.state === 'CURRENT'
                                ? '1px solid rgba(16, 185, 129, 0.4)'
                                : '1px solid transparent',
                            fontSize: '0.76rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                background:
                                  cp.state === 'PASSED'
                                    ? '#10b981'
                                    : cp.state === 'CURRENT'
                                      ? '#38bdf8'
                                      : 'rgba(148,163,184,0.3)',
                                color: '#042f2e',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {cp.step}
                            </span>
                            <div>
                              <strong>{cp.name}</strong>
                              <div style={{ fontSize: '0.68rem', opacity: 0.72 }}>
                                {cp.road} ({cp.kmAtPoint} km)
                              </div>
                            </div>
                          </div>

                          <div>
                            {cp.state === 'PASSED' && (
                              <span style={{ color: '#10b981', fontWeight: 700 }}>
                                ✓ Đã qua ({cp.deviationMeters}m)
                              </span>
                            )}
                            {cp.state === 'CURRENT' && (
                              <span style={{ color: '#38bdf8', fontWeight: 800 }}>
                                ● Đang tiếp cận ({cp.deviationMeters}m)
                              </span>
                            )}
                            {cp.state === 'UPCOMING' && (
                              <span style={{ opacity: 0.55 }}>Chờ qua trạm</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: GIÁM SÁT DANH SÁCH CONTAINER & THÔNG TIN TÀI XẾ (SMART IOT)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'containers' && (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Header Title & CTA Actions */}
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(56, 189, 248, 0.18)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Box size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.24rem', fontWeight: 800, margin: 0 }}>
                        Giám Sát Danh Sách Container &amp; Đội Ngũ Tài Xế
                      </h2>
                      <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                        ● HỆ THỐNG VIỄN THÔNG VỎ CONTAINER ĐỘC LẬP &amp; HẢI QUAN ĐIỆN TỬ
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', opacity: 0.78, margin: 0, maxWidth: 760 }}>
                    Theo dõi trực quan danh mục vỏ container chuẩn ISO 6346, phân loại Container Đang Đi / Container Đã Tới,
                    kiểm soát chỉ số viễn thông IoT, khóa E-Seal hải quan và kết nối điện thoại trực tiếp với người lái.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tracking')}
                    className="lp-btn lp-btn--ghost lp-btn--sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Navigation size={14} color="#38bdf8" /> Xem Trên Bản Đồ 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('booking')}
                    className="lp-btn lp-btn--primary lp-btn--sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <PlusCircle size={14} /> Đặt Thuê Container Mới
                  </button>
                </div>
              </div>

              {/* 4 KPI Metrics Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14
                }}
              >
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', opacity: 0.75, fontWeight: 700 }}>
                      TỔNG SỐ CONTAINER
                    </span>
                    <Box size={18} color="#38bdf8" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
                    {containerKpi.total} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>vỏ cont</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>
                    {containerKpi.reeferCount} cont lạnh (45R1) • {containerKpi.dryCount} cont khô/tiêu chuẩn
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: cardBg,
                    border: '1.5px solid rgba(56, 189, 248, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>
                      CONTAINER ĐANG ĐI TRÊN ĐƯỜNG
                    </span>
                    <Navigation size={18} color="#38bdf8" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: 4, color: '#38bdf8' }}>
                    {containerKpi.inTransit} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>cont</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: 4, fontWeight: 600 }}>
                    ● LIVE • Tốc độ TB ~52 km/h • Đang bám tuyến
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: cardBg,
                    border: '1.5px solid rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                      CONTAINER ĐÃ TỚI / HOÀN TẤT
                    </span>
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                    {containerKpi.completed} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>cont</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                    ✓ 100% Giao đúng hẹn SLA • Đã ký số ePOD
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: cardBg,
                    border: cardBorder
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                      AN NINH E-SEAL &amp; ĐỘI NGŨ
                    </span>
                    <ShieldCheck size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                    100% <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Niêm Phong</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>
                    Khóa GPS ISO 17712 • 5 Tài xế Hạng FC 4.9★
                  </div>
                </div>
              </div>

              {/* Smart Toolbar: Filter Status, Type Selector & Search Box */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: cardBg,
                  border: cardBorder,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                {/* Segmented Filter: All / In Transit / Completed */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `Tất Cả (${containerKpi.total})` },
                    { id: 'IN_TRANSIT', label: `Đang Đi Trên Đường (${containerKpi.inTransit})` },
                    { id: 'COMPLETED', label: `Đã Cập Bến Hoàn Tất (${containerKpi.completed})` }
                  ].map((tab) => {
                    const active = containerStatusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setContainerStatusFilter(tab.id)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 999,
                          border: active
                            ? '1.5px solid #10b981'
                            : '1px solid rgba(148, 163, 184, 0.25)',
                          background: active ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                          color: active ? '#10b981' : 'inherit',
                          fontSize: '0.78rem',
                          fontWeight: active ? 800 : 600,
                          cursor: 'pointer'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Right controls: Container Type Filter & Search Bar */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={containerTypeFilter}
                    onChange={(e) => setContainerTypeFilter(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      background: isDark ? '#0f172a' : '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      color: 'inherit',
                      fontSize: '0.78rem'
                    }}
                  >
                    <option value="ALL">Tất cả quy cách vỏ</option>
                    <option value="40_REEFER">40ft Reefer Lạnh (45R1)</option>
                    <option value="40_DRY_HC">40ft Dry Khô (45G1)</option>
                    <option value="20_STANDARD">20ft Tiêu Chuẩn (22G1)</option>
                  </select>

                  <div style={{ position: 'relative', minWidth: 260 }}>
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
                      value={containerSearch}
                      onChange={(e) => setContainerSearch(e.target.value)}
                      placeholder="Tìm mã Cont, Tài xế, SĐT, Biển số..."
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 32px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.3)',
                        background: 'transparent',
                        color: 'inherit',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Container Cards List */}
              {filteredContainers.length === 0 ? (
                <div
                  style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    borderRadius: 20,
                    background: subtleBg,
                    border: '1px dashed rgba(148,163,184,0.3)'
                  }}
                >
                  <Box size={36} color="#38bdf8" style={{ opacity: 0.6, marginBottom: 12 }} />
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 6 }}>
                    Không tìm thấy container nào phù hợp
                  </h3>
                  <p style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: 16 }}>
                    Thử đổi bộ lọc trạng thái hoặc xóa từ khóa tìm kiếm để xem tất cả container của doanh nghiệp.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setContainerStatusFilter('ALL');
                      setContainerTypeFilter('ALL');
                      setContainerSearch('');
                    }}
                    className="lp-btn lp-btn--ghost lp-btn--sm"
                  >
                    Xóa Bộ Lọc Tìm Kiếm
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {filteredContainers.map((cont) => {
                    const isInTransit = cont.status === 'IN_TRANSIT';
                    const isReefer = cont.containerTypeId === '40_REEFER';

                    return (
                      <div
                        key={cont.containerCode || cont.shipmentCode}
                        style={{
                          borderRadius: 18,
                          padding: 22,
                          background: cardBg,
                          border: isInTransit
                            ? '1.5px solid rgba(56, 189, 248, 0.45)'
                            : '1px solid rgba(16, 185, 129, 0.35)',
                          display: 'grid',
                          gap: 16,
                          boxShadow: isInTransit
                            ? '0 6px 24px rgba(56, 189, 248, 0.08)'
                            : '0 4px 18px rgba(0,0,0,0.04)'
                        }}
                      >
                        {/* Section 1: Container ISO Header & Status Badge */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 12,
                            borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                            paddingBottom: 14
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: isReefer ? '#0284c7' : '#047857',
                                  color: '#ffffff'
                                }}
                              >
                                {cont.isoType || '45R1'}
                              </span>
                              <h3
                                style={{
                                  fontSize: '1.24rem',
                                  fontWeight: 900,
                                  color: '#38bdf8',
                                  margin: 0,
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {cont.containerCode}
                              </h3>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.9 }}>
                                • {cont.containerTypeLabel}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.74rem', opacity: 0.75, marginTop: 4 }}>
                              Chủ vỏ: <strong>{cont.containerOwner || 'Tân Cảng Sài Gòn (SNP Logistics)'}</strong> •
                              Hợp đồng: <code>HĐ-{cont.shipmentCode}</code> • Loại hàng: <strong>{cont.cargoType}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isInTransit ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 14px',
                                  borderRadius: 999,
                                  background: 'rgba(56, 189, 248, 0.16)',
                                  border: '1px solid rgba(56, 189, 248, 0.45)',
                                  color: '#38bdf8',
                                  fontSize: '0.76rem',
                                  fontWeight: 800
                                }}
                              >
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#38bdf8',
                                    boxShadow: '0 0 8px #38bdf8'
                                  }}
                                />
                                ĐANG ĐI TRÊN ĐƯỜNG ({cont.progress.toFixed(0)}%)
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 14px',
                                  borderRadius: 999,
                                  background: 'rgba(16, 185, 129, 0.16)',
                                  border: '1px solid rgba(16, 185, 129, 0.45)',
                                  color: '#10b981',
                                  fontSize: '0.76rem',
                                  fontWeight: 800
                                }}
                              >
                                <Check size={13} />
                                ĐÃ CẬP BẾN • HOÀN TẤT ePOD
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Section 2: Route & Live Transit Progress */}
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6,
                              fontSize: '0.82rem'
                            }}
                          >
                            <div>
                              <strong>{cont.originName}</strong>{' '}
                              <span style={{ color: '#10b981', margin: '0 4px' }}>➔</span>{' '}
                              <strong>{cont.destinationName}</strong> ({cont.distanceKm} km)
                            </div>
                            <div style={{ fontWeight: 800, color: isInTransit ? '#38bdf8' : '#10b981' }}>
                              {isInTransit ? `Đã đi ${cont.traveledKm} / ${cont.distanceKm} km` : 'Hoàn tất 100%'}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div
                            style={{
                              width: '100%',
                              height: 8,
                              borderRadius: 999,
                              background: 'rgba(148, 163, 184, 0.18)',
                              overflow: 'hidden',
                              marginBottom: 8
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, cont.progress)}%`,
                                height: '100%',
                                background: isInTransit
                                  ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                                  : 'linear-gradient(90deg, #059669, #10b981)',
                                transition: 'width 0.6s ease'
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.74rem',
                              opacity: 0.82,
                              flexWrap: 'wrap',
                              gap: 8
                            }}
                          >
                            <div>
                              Vị trí: <strong>{cont.currentLocation}</strong>
                            </div>
                            <div>
                              {isInTransit ? (
                                <>
                                  Vận tốc GPS: <strong>{cont.speedKmh} km/h</strong> • Dự kiến đến (ETA):{' '}
                                  <strong style={{ color: '#f59e0b' }}>
                                    {cont.etaMinutes > 0 ? `${cont.etaMinutes} phút` : 'Đang cập bến'}
                                  </strong>
                                </>
                              ) : (
                                <>
                                  Bàn giao lúc: <strong>{cont.completedAt || 'Hôm nay'}</strong> • Ký nhận:{' '}
                                  <strong style={{ color: '#10b981' }}>{cont.epodRecipient || 'Thủ kho'}</strong>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Smart Container IoT Gauges & E-Seal */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 10
                          }}
                        >
                          {/* E-Seal Gauge */}
                          <div
                            style={{
                              padding: 11,
                              borderRadius: 12,
                              background: subtleBg,
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.68rem',
                                opacity: 0.75,
                                fontWeight: 700
                              }}
                            >
                              <span>KHÓA SEAL GPS HẢI QUAN</span>
                              <Lock size={12} color="#10b981" />
                            </div>
                            <div
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                color: '#10b981',
                                marginTop: 3,
                                cursor: 'pointer'
                              }}
                              onClick={() =>
                                setSelectedESealModal({
                                  eSealNumber: cont.eSealNumber,
                                  containerCode: cont.containerCode,
                                  status: cont.eSealStatus,
                                  integrityPct: cont.eSealIntegrityPct || 100,
                                  batteryPct: 98,
                                  voltageV: 3.62,
                                  isoStandard: 'ISO 17712 High Security Seal',
                                  geofenceCorridor: `${cont.originName} ↔ ${cont.destinationName}`
                                })
                              }
                              title="Bấm để xem Chứng thư Khóa Seal Hải quan"
                            >
                              {cont.eSealNumber}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#10b981', marginTop: 2, fontWeight: 700 }}>
                              {cont.eSealStatus === 'LOCKED_SECURE'
                                ? '● LOCKED (100% Tamper-Free)'
                                : '✓ Đã Mở Kiểm Hóa Hợp Lệ'}
                            </div>
                          </div>

                          {/* Cold Chain / Environment */}
                          <div
                            style={{
                              padding: 11,
                              borderRadius: 12,
                              background: subtleBg,
                              border: '1px solid rgba(56, 189, 248, 0.25)'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.68rem',
                                opacity: 0.75,
                                fontWeight: 700
                              }}
                            >
                              <span>{isReefer ? 'CHUỖI LẠNH: CẤP / HỒI' : 'MÔI TRƯỜNG THÙNG'}</span>
                              <Thermometer size={12} color="#38bdf8" />
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8', marginTop: 3 }}>
                              {isReefer
                                ? `${cont.supplyAirTempC}°C / ${cont.returnAirTempC}°C`
                                : `${cont.supplyAirTempC}°C (Khô)`}
                            </div>
                            <div style={{ fontSize: '0.66rem', opacity: 0.75, marginTop: 2 }}>
                              Độ ẩm khoang: <strong>{cont.humidityPct}% RH</strong>
                            </div>
                          </div>

                          {/* Shock & Vibration */}
                          <div
                            style={{
                              padding: 11,
                              borderRadius: 12,
                              background: subtleBg,
                              border: '1px solid rgba(148, 163, 184, 0.2)'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.68rem',
                                opacity: 0.75,
                                fontWeight: 700
                              }}
                            >
                              <span>GIA TỐC KẾ 3 TRỤC (SHOCK)</span>
                              <Activity size={12} color="#f59e0b" />
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: 3 }}>
                              {cont.shockG} G{' '}
                              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                                (&lt; 1.0G Chuẩn)
                              </span>
                            </div>
                            <div style={{ fontSize: '0.66rem', opacity: 0.75, marginTop: 2 }}>
                              Solar: <strong>{cont.solarPowerWatts || 42}W</strong> • Pin 7 năm
                            </div>
                          </div>

                          {/* Payload & Cubic Capacity */}
                          <div
                            style={{
                              padding: 11,
                              borderRadius: 12,
                              background: subtleBg,
                              border: '1px solid rgba(148, 163, 184, 0.2)'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.68rem',
                                opacity: 0.75,
                                fontWeight: 700
                              }}
                            >
                              <span>TẢI TRỌNG &amp; THỂ TÍCH</span>
                              <Package size={12} color="#10b981" />
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: 3 }}>
                              {cont.cargoWeightTons} tấn{' '}
                              <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                                / Max {(cont.maxPayloadKg / 1000).toFixed(1)}T
                              </span>
                            </div>
                            <div style={{ fontSize: '0.66rem', opacity: 0.75, marginTop: 2 }}>
                              Thể tích: <strong>{cont.cubicCapacityM3} m³</strong> • Vỏ:{' '}
                              <strong>{(cont.tareWeightKg / 1000).toFixed(1)}T</strong>
                            </div>
                          </div>
                        </div>

                        {/* Section 4: DRIVER INFORMATION & TELEPHONE CONTACT BOX */}
                        <div
                          style={{
                            padding: '14px 16px',
                            borderRadius: 14,
                            background: isDark ? 'rgba(15, 23, 42, 0.55)' : '#f1f5f9',
                            border: '1px solid rgba(148, 163, 184, 0.22)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#042f2e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.05rem',
                                flexShrink: 0
                              }}
                            >
                              {cont.driverName ? cont.driverName.charAt(0) : 'T'}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                                  {cont.driverName || 'Nguyễn Văn Tài'}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 6,
                                    background: 'rgba(16, 185, 129, 0.18)',
                                    color: '#10b981'
                                  }}
                                >
                                  ★ {cont.driverSafetyScore || 4.95} Eco-Driver
                                </span>
                              </div>

                              <div style={{ fontSize: '0.74rem', opacity: 0.78, marginTop: 2 }}>
                                {cont.driverLicense || 'GPLX Hạng FC • 9 năm kinh nghiệm'} • Xe đầu kéo:{' '}
                                <strong>{cont.licensePlate}</strong> ({cont.vehicleType})
                              </div>

                              <div style={{ fontSize: '0.8rem', marginTop: 4, fontWeight: 800, color: '#10b981' }}>
                                📞 Số điện thoại: <span>{cont.driverPhone || '0903 812 456'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Call & Message Telephony Actions */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <a
                              href={`tel:${(cont.driverPhone || '0903812456').replace(/\s+/g, '')}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                borderRadius: 999,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#042f2e',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                textDecoration: 'none',
                                boxShadow: '0 3px 10px rgba(16, 185, 129, 0.28)'
                              }}
                            >
                              <PhoneCall size={13} />
                              Gọi Điện Thoại
                            </a>

                            <a
                              href={`sms:${(cont.driverPhone || '0903812456').replace(/\s+/g, '')}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 12px',
                                borderRadius: 999,
                                background: subtleBg,
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                color: 'inherit',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                textDecoration: 'none'
                              }}
                            >
                              <MessageSquare size={13} />
                              Nhắn Tin
                            </a>

                            <button
                              type="button"
                              onClick={() => setSelectedDriverModal(cont)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '7px 12px',
                                borderRadius: 999,
                                background: subtleBg,
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                color: '#38bdf8',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <User size={13} />
                              Hồ Sơ
                            </button>
                          </div>
                        </div>

                        {/* Section 5: Action Buttons */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(148, 163, 184, 0.14)'
                          }}
                        >
                          <div style={{ fontSize: '0.74rem', opacity: 0.75 }}>
                            Giảm phát thải GLEC v3: <strong style={{ color: '#10b981' }}>-{cont.co2SavedKg} kg CO2e</strong>{' '}
                            (-{cont.co2ReductionPct}%)
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCode(cont.shipmentCode);
                                setActiveTab('tracking');
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: '#38bdf8',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <Navigation size={13} /> Định Vị 3D
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedIoTModal({
                                  containerCode: cont.containerCode,
                                  eSealNumber: cont.eSealNumber,
                                  hardwareModel: cont.iotUnitModel,
                                  solarPowerWatts: cont.solarPowerWatts || 42,
                                  batteryLife: 'Pin Li-SOCl2 19Ah (tuổi thọ 7 năm)',
                                  connectivity: cont.cellularNetwork,
                                  supplyAirTemp: cont.supplyAirTempC,
                                  returnAirTemp: cont.returnAirTempC,
                                  humidity: cont.humidityPct,
                                  shockG: cont.shockG,
                                  doorStatus: 'Đóng kín (Optical Door Breach OK)'
                                })
                              }
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                background: subtleBg,
                                color: 'inherit',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <Cpu size={13} /> Hộp Đen IoT
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedESealModal({
                                  eSealNumber: cont.eSealNumber,
                                  containerCode: cont.containerCode,
                                  status: cont.eSealStatus,
                                  integrityPct: cont.eSealIntegrityPct || 100,
                                  batteryPct: 98,
                                  voltageV: 3.62,
                                  isoStandard: 'ISO 17712 High Security Seal',
                                  geofenceCorridor: `${cont.originName} ↔ ${cont.destinationName}`
                                })
                              }
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <Lock size={13} /> Seal Hải Quan
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedContractModal(cont)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                background: subtleBg,
                                color: 'inherit',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <FileText size={13} /> Hợp Đồng / ePOD
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: BOOK GREEN SHIPMENT (TẠO VẬN ĐƠN & TỐI ƯU TUYẾN UC05)
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
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#10b981',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    NGHIỆP VỤ UC05 • TỐI ƯU TUYẾN ĐA TIÊU CHÍ PARETO
                  </div>
                  <h2 style={{ fontSize: '1.24rem', fontWeight: 800, margin: '2px 0 6px' }}>
                    Đặt Thuê Xe Vận Chuyển Xanh &amp; Khởi Tạo Vận Đơn Real-Time
                  </h2>
                  <p style={{ fontSize: '0.82rem', opacity: 0.78, margin: 0 }}>
                    Hệ thống sẽ điều xe thực tế mang biển số riêng cho doanh nghiệp bạn, tự động
                    kích hoạt luồng GPS 3D và hạch toán giảm phát thải GLEC v3.0.
                  </p>
                </div>

                <form onSubmit={handleCreateShipment}>
                  {/* Origin & Destination */}
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
                        {HUB_CORRIDOR_DIRECTORY.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.area})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      title="Đổi chiều hành trình"
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
                        {HUB_CORRIDOR_DIRECTORY.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.area})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Preset Corridor Chips in Booking */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 14,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', opacity: 0.75, fontWeight: 700 }}>
                      Chọn tuyến nhanh:
                    </span>
                    {[
                      { o: 'catlai', d: 'vsip', label: 'Cát Lái → VSIP 1 (28.9 km)' },
                      { o: 'catlai', d: 'songthan', label: 'Cát Lái → Sóng Thần (18.6 km)' },
                      { o: 'catlai', d: 'caimep', label: 'Cát Lái → Cái Mép (67.4 km)' },
                      { o: 'tanbinh', d: 'vsip', label: 'Tân Bình → VSIP 1 (24.2 km)' },
                      { o: 'hiepphuoc', d: 'nhontrach', label: 'Hiệp Phước → Nhơn Trạch (39.8 km)' },
                      { o: 'caimep', d: 'vsip2', label: 'Cái Mép → VSIP 2 (82.1 km)' }
                    ].map((corr) => {
                      const isActive =
                        bookingForm.originId === corr.o && bookingForm.destinationId === corr.d;
                      return (
                        <button
                          key={`bk-${corr.o}-${corr.d}`}
                          type="button"
                          onClick={() =>
                            setBookingForm((prev) => ({
                              ...prev,
                              originId: corr.o,
                              destinationId: corr.d
                            }))
                          }
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: isActive ? 800 : 600,
                            padding: '3px 8px',
                            borderRadius: 7,
                            border: isActive
                              ? '1.5px solid #10b981'
                              : '1px solid rgba(148,163,184,0.25)',
                            background: isActive ? 'rgba(16,185,129,0.18)' : subtleBg,
                            color: isActive ? '#10b981' : 'inherit',
                            cursor: 'pointer'
                          }}
                        >
                          {corr.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pareto Optimization Mode Selection */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        marginBottom: 6
                      }}
                    >
                      Chiến Lược Tối Ưu Tuyến Pareto (UC05 Multi-Criteria)
                    </label>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {PARETO_ROUTING_MODES.map((mode) => {
                        const active = bookingForm.paretoModeId === mode.id;
                        return (
                          <div
                            key={mode.id}
                            onClick={() =>
                              setBookingForm((prev) => ({ ...prev, paretoModeId: mode.id }))
                            }
                            style={{
                              padding: '9px 12px',
                              borderRadius: 10,
                              background: active
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isDark
                                  ? 'rgba(15, 23, 42, 0.4)'
                                  : '#f8fafc',
                              border: active
                                ? '1.5px solid #10b981'
                                : '1px solid rgba(148, 163, 184, 0.2)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  color: active ? '#10b981' : 'inherit'
                                }}
                              >
                                {mode.label}
                              </div>
                              <div style={{ fontSize: '0.71rem', opacity: 0.72 }}>
                                {mode.weightsLabel}
                              </div>
                            </div>
                            {active && <Check size={16} color="#10b981" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Smart Container Hardware & Telematics Selection */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        Quy Cách Vỏ Container Thông Minh (Smart Container IoT Hardware)
                      </label>
                      <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                        ● Chuẩn ISO 6346 &amp; Hải Quan
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      {SMART_CONTAINER_CATALOG.map((cont) => {
                        const isSelected = bookingForm.containerTypeId === cont.typeId;
                        return (
                          <div
                            key={cont.typeId}
                            onClick={() =>
                              setBookingForm((prev) => ({
                                ...prev,
                                containerTypeId: cont.typeId,
                                cargoType:
                                  cont.typeId === '40_REEFER'
                                    ? 'Chuỗi lạnh tiêu chuẩn (-18°C)'
                                    : 'Linh kiện điện tử giá trị cao'
                              }))
                            }
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: isSelected
                                ? 'rgba(56, 189, 248, 0.12)'
                                : isDark
                                  ? 'rgba(15, 23, 42, 0.4)'
                                  : '#f8fafc',
                              border: isSelected
                                ? '1.5px solid #38bdf8'
                                : '1px solid rgba(148, 163, 184, 0.2)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: isSelected ? '#38bdf8' : 'rgba(148,163,184,0.2)',
                                    color: isSelected ? '#0f172a' : 'inherit'
                                  }}
                                >
                                  {cont.isoType}
                                </span>
                                <strong
                                  style={{
                                    fontSize: '0.82rem',
                                    color: isSelected ? '#38bdf8' : 'inherit'
                                  }}
                                >
                                  {cont.label}
                                </strong>
                              </div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 3 }}>
                                Hộp đen: <strong>{cont.telematicsUnit}</strong> • Tải max:{' '}
                                {(cont.maxPayloadKg / 1000).toFixed(1)} tấn • Thể tích: {cont.cubicCapacityM3} m³
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#38bdf8" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hardware IoT & E-Seal Add-ons */}
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 10,
                        background: subtleBg,
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        display: 'grid',
                        gap: 8
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bookingForm.requireESeal}
                          onChange={(e) =>
                            setBookingForm((prev) => ({ ...prev, requireESeal: e.target.checked }))
                          }
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>
                          <strong>Khóa Seal Chốt Điện Tử GPS Hải Quan ISO 17712</strong> (Cảnh báo mở trái phép qua viễn thông M2M)
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bookingForm.requireShockSensor}
                          onChange={(e) =>
                            setBookingForm((prev) => ({ ...prev, requireShockSensor: e.target.checked }))
                          }
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>
                          <strong>Gia tốc kế 3 trục đo chấn động G-Force</strong> (Cảnh báo rung lắc, dằn xóc quá ngưỡng 1.0G)
                        </span>
                      </label>

                      {bookingForm.containerTypeId === '40_REEFER' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={bookingForm.requireReeferTelematics}
                            onChange={(e) =>
                              setBookingForm((prev) => ({ ...prev, requireReeferTelematics: e.target.checked }))
                            }
                            style={{ accentColor: '#38bdf8' }}
                          />
                          <span>
                            <strong>Cổng viễn thông máy lạnh Carrier DataCOLD / Thermo King</strong> (Đồng bộ nhiệt độ gió cấp &amp; gió hồi)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Cargo & Weight */}
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

                  {/* Vehicle Powertrain Selection */}
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

                  {/* Pickup date & time */}
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

              {/* Right: Live 3D Route Preview & Detailed Quote */}
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: 'linear-gradient(145deg, #042f2e 0%, #091e1a 100%)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  color: '#f8fafc'
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
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#6ee7b7',
                      textTransform: 'uppercase'
                    }}
                  >
                    MÔ PHỎNG LỘ TRÌNH 3D &amp; BÁO GIÁ KHOA HỌC (GLEC v3)
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#38bdf8',
                      background: 'rgba(56,189,248,0.15)',
                      padding: '2px 8px',
                      borderRadius: 999
                    }}
                  >
                    702 GPS Points
                  </span>
                </div>

                <h3 style={{ fontSize: '1.24rem', fontWeight: 800, margin: '2px 0 12px' }}>
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
                    overlayTitle={`Cự ly tuyến thực tế: ${bookingQuote.distanceKm} km (~${bookingQuote.etaMinutes} phút)`}
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
                    Phát thải CO2e cắt giảm so với mốc Diesel:
                  </div>
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      color: '#6ee7b7',
                      margin: '2px 0'
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

                {/* Transparent Financial & Carbon Breakdown */}
                <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Sản lượng vận tải:</span>
                    <strong>{bookingQuote.tonneKm} tấn·km</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Mốc Diesel chuẩn (108.0 g/tkm):</span>
                    <span>{bookingQuote.baselineCo2Kg} kg CO2e</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>
                      Thực tế WTW ({bookingQuote.actualIntensityG} g/tkm):
                    </span>
                    <strong style={{ color: '#34d399' }}>{bookingQuote.actualCo2Kg} kg CO2e</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Năng lượng tiêu hao:</span>
                    <strong>
                      {bookingQuote.energyConsumed} {bookingQuote.energyUnit}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Ưu đãi giảm giá xe xanh:</span>
                    <strong style={{ color: '#6ee7b7' }}>
                      -{bookingQuote.greenDiscountVnd.toLocaleString('vi-VN')} ₫
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
                        <th style={{ padding: '11px 10px' }}>Container &amp; Khóa Seal</th>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedIoTModal({
                                    containerCode: s.containerCode || 'TCKU-781920-4',
                                    eSealNumber: s.eSealNumber || 'VN-CUST-819204',
                                    hardwareModel: s.iotUnitModel || 'Carrier DataCOLD 600 / Nexxiot Edge',
                                    solarPowerWatts: s.solarPowerWatts || 42,
                                    batteryLife: 'Pin Li-SOCl2 19Ah (tuổi thọ 7 năm)',
                                    connectivity: s.cellularNetwork || '4G LTE-M / NB-IoT / Vệ tinh LEO',
                                    supplyAirTemp: s.supplyAirTempC ?? -18.4,
                                    returnAirTemp: s.returnAirTempC ?? -17.9,
                                    humidity: s.humidityPct ?? 88,
                                    shockG: s.shockG ?? 0.24,
                                    doorStatus: 'Đóng kín (Optical Door Breach OK)'
                                  })
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  textAlign: 'left',
                                  color: '#38bdf8',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Cpu size={12} /> {s.containerCode || 'TCKU-781920-4'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedESealModal({
                                    eSealNumber: s.eSealNumber || 'VN-CUST-819204',
                                    containerCode: s.containerCode || 'TCKU-781920-4',
                                    status: s.eSealStatus || 'LOCKED_SECURE',
                                    integrityPct: s.eSealIntegrityPct || 100,
                                    batteryPct: 98,
                                    voltageV: 3.62,
                                    isoStandard: 'ISO 17712 High Security Seal',
                                    lastPing: 'Vừa cập nhật',
                                    geofenceCorridor: `${s.originName} ↔ ${s.destinationName}`
                                  })
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  textAlign: 'left',
                                  color: '#10b981',
                                  fontWeight: 700,
                                  fontSize: '0.73rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Lock size={11} /> {s.eSealNumber || 'VN-CUST-819204'}
                              </button>
                            </div>
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
                              {Number(s.progress || 0).toFixed(1)}%
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

                              <button
                                type="button"
                                onClick={() => setSelectedContractModal(s)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148,163,184,0.3)',
                                  background: subtleBg,
                                  color: 'inherit',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <FileText size={12} /> Hợp Đồng
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
              TAB 5: HUBS & ECO-INFRASTRUCTURE DIRECTORY (MỚI)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'hubs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#10b981',
                      textTransform: 'uppercase'
                    }}
                  >
                    MẠNG LƯỚI 7 TRUNG TÂM LOGISTICS &amp; CẢNG BIỂN PHÍA NAM
                  </div>
                  <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '2px 0 4px' }}>
                    Danh Mục Hạ Tầng Cảng Biển, Trạm Sạc DC &amp; Kho Chuỗi Lạnh
                  </h2>
                  <p style={{ fontSize: '0.82rem', opacity: 0.78, margin: 0 }}>
                    Dữ liệu vị trí GPS chuẩn xác, hạ tầng sạc điện công suất cao và liên kết cao tốc
                    kết nối các vùng kinh tế trọng điểm.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 16
                  }}
                >
                  {HUB_CORRIDOR_DIRECTORY.map((hub) => (
                    <div
                      key={hub.id}
                      style={{
                        padding: 18,
                        borderRadius: 16,
                        background: subtleBg,
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.12)',
                              padding: '2px 8px',
                              borderRadius: 6
                            }}
                          >
                            {hub.code}
                          </span>
                          <span style={{ fontSize: '0.74rem', opacity: 0.75 }}>
                            Tải trọng tối đa: <strong>{hub.maxWeightTons}T</strong>
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '4px 0 6px' }}>
                          {hub.label}
                        </h3>

                        <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: 8 }}>
                          <MapPin size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                          {hub.address}
                        </div>

                        <div style={{ display: 'grid', gap: 5, fontSize: '0.75rem' }}>
                          <div>
                            <span style={{ opacity: 0.7 }}>Trục giao thông:</span>{' '}
                            <strong>{hub.primaryHighways}</strong>
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>Hải quan:</span>{' '}
                            <span>{hub.customsGate}</span>
                          </div>
                          <div style={{ color: '#10b981' }}>
                            <Zap size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />{' '}
                            <strong>{hub.evChargers}</strong>
                          </div>
                          <div style={{ color: '#38bdf8' }}>
                            <Thermometer
                              size={12}
                              style={{ display: 'inline', verticalAlign: '-1px' }}
                            />{' '}
                            {hub.coldChainSupport}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingForm((prev) => ({ ...prev, originId: hub.id }));
                            setActiveTab('booking');
                          }}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: 8,
                            border: '1px solid #10b981',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Xuất phát từ đây
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingForm((prev) => ({ ...prev, destinationId: hub.id }));
                            setActiveTab('booking');
                          }}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Giao hàng đến đây
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: FLEET CATALOG & GLEC STANDARDS (MỚI)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: cardBg,
                  border: cardBorder
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#10b981',
                      textTransform: 'uppercase'
                    }}
                  >
                    CẤU HÌNH ĐỘI XE &amp; ĐỊNH MỨC PHÁT THẢI TOÀN VÒNG ĐỜI
                  </div>
                  <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '2px 0 4px' }}>
                    Danh Mục Đội Xe Xanh Theo Chuẩn GLEC Framework v3.0 &amp; ISO 14083
                  </h2>
                  <p style={{ fontSize: '0.82rem', opacity: 0.78, margin: 0 }}>
                    Thông số kỹ thuật pin, mức tiêu hao nhiên liệu, suất phát thải WTW và tài xế
                    chuyên nghiệp phụ trách điều vận.
                  </p>
                </div>

                <div className="table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.24)' }}>
                        <th style={{ padding: '12px 10px' }}>Mã &amp; Mẫu Phương Tiện</th>
                        <th style={{ padding: '12px 10px' }}>Phân Loại</th>
                        <th style={{ padding: '12px 10px' }}>Tải Trọng</th>
                        <th style={{ padding: '12px 10px' }}>Hạ Tầng Năng Lượng</th>
                        <th style={{ padding: '12px 10px' }}>Suất WTW (g/tkm)</th>
                        <th style={{ padding: '12px 10px' }}>Cắt Giảm CO2e</th>
                        <th style={{ padding: '12px 10px' }}>Tài Xế Phụ Trách</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STANDARD_FLEET_CATALOG.map((f) => (
                        <tr
                          key={f.modelCode}
                          style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}
                        >
                          <td style={{ padding: '12px 10px' }}>
                            <strong style={{ color: '#10b981' }}>{f.modelCode}</strong>
                            <div style={{ fontSize: '0.78rem', marginTop: 2 }}>{f.modelName}</div>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background:
                                  f.powertrainId === 'ev'
                                    ? 'rgba(16, 185, 129, 0.18)'
                                    : 'rgba(56, 189, 248, 0.18)',
                                color: f.powertrainId === 'ev' ? '#10b981' : '#38bdf8'
                              }}
                            >
                              {f.vehicleTypeLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>{f.maxPayloadTons} tấn</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div>{f.batteryOrTank}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.72 }}>
                              Định mức: {f.consumptionSpec}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                            {f.wtwIntensityG} gCO2e
                          </td>
                          <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: 800 }}>
                            -{f.reductionPct}%
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <strong>{f.driverName}</strong> ({f.samplePlate})
                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                              {f.driverLicense}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 7: CARBON LEDGER & ISO 14083 CERTIFICATES
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
              TAB 8: COMPANY PROFILE & NOTIFICATION SETTINGS
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

      {/* ── MODAL: HỢP ĐỒNG THUÊ VẬN TẢI XANH ĐIỆN TỬ (E-CONTRACT) ── */}
      {selectedContractModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: isDark ? '#061611' : '#ffffff',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: 24,
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                paddingBottom: 14,
                marginBottom: 16
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
                  HỢP ĐỒNG ĐIỆN TỬ THUÊ VẬN TẢI XANH SỐ
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0' }}>
                  HĐ-{selectedContractModal.shipmentCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, fontSize: '0.82rem' }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: subtleBg,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10
                }}
              >
                <div>
                  <span style={{ opacity: 0.7 }}>Bên Thuê Vận Tải (Chủ Hàng):</span>
                  <div>
                    <strong>{selectedContractModal.customerName}</strong>
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.75 }}>
                    Mã B2B: {selectedContractModal.customerId}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.7 }}>Đơn Vị Cung Cấp Hạ Tầng Vận Tải:</span>
                  <div>
                    <strong>CCADRO GREEN LOGISTICS ALLIANCE</strong>
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.75 }}>
                    Mã vận hành: CCADRO-FLEET-NETZERO
                  </div>
                </div>
              </div>

              <div>
                <strong>Điều khoản dịch vụ &amp; Cam kết tiêu chuẩn SLA:</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.6 }}>
                  <li>
                    Mã Container ISO 6346: <strong>{selectedContractModal.containerCode || 'TCKU-781920-4'}</strong> (Loại:{' '}
                    {selectedContractModal.containerTypeLabel || 'Container Lạnh 40ft High Cube ISO 45R1'}).
                  </li>
                  <li>
                    Khóa niêm phong điện tử Hải quan: <strong>{selectedContractModal.eSealNumber || 'VN-CUST-819204'}</strong> (Chuẩn ISO 17712 High Security Seal).
                  </li>
                  <li>
                    Phương tiện cam kết: <strong>{selectedContractModal.vehicleType}</strong> (Biển
                    số: {selectedContractModal.licensePlate}).
                  </li>
                  <li>
                    Lộ trình chuẩn:{' '}
                    <strong>
                      {selectedContractModal.originName} → {selectedContractModal.destinationName}
                    </strong>{' '}
                    ({selectedContractModal.distanceKm} km).
                  </li>
                  <li>
                    Duy trì kiểm soát nhiệt độ thùng hàng liên tục:{' '}
                    <strong style={{ color: '#10b981' }}>
                      {selectedContractModal.temperatureC}°C
                    </strong>{' '}
                    (Báo động nếu lệch &gt; 2°C).
                  </li>
                  <li>
                    Cam kết phát thải Scope 3 theo ISO 14083: Cắt giảm tối thiểu{' '}
                    <strong style={{ color: '#10b981' }}>
                      {selectedContractModal.co2SavedKg} kg CO2e
                    </strong>
                    .
                  </li>
                  <li>Bàn giao và ký xác nhận điện tử (ePOD) ngay khi phương tiện cập bến.</li>
                </ul>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>Tổng cước phí hợp đồng:</div>
                  <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>
                    {(selectedContractModal.estimatedCostVnd || 1850000).toLocaleString('vi-VN')}{' '}
                    VNĐ
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>Trạng thái hợp đồng:</div>
                  <strong style={{ color: '#38bdf8' }}>● ĐANG THỰC HIỆN</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedContractModal(null)}
                className="lp-btn lp-btn--ghost lp-btn--sm"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedContractModal(null);
                  setSelectedCode(selectedContractModal.shipmentCode);
                  setActiveTab('tracking');
                }}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <Navigation size={14} /> Theo Dõi Hành Trình 3D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHỨNG THƯ GIÁM SÁT KHÓA SEAL ĐIỆN TỬ HẢI QUAN (E-SEAL ISO 17712) ── */}
      {selectedESealModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: isDark ? '#061611' : '#ffffff',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: 24,
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                paddingBottom: 12,
                marginBottom: 16
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
                  TỔNG CỤC HẢI QUAN VIỆT NAM • GIÁM SÁT NIÊM PHONG ĐIỆN TỬ
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '3px 0 0' }}>
                  Chứng Thư Khóa Seal GPS: {selectedESealModal.eSealNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedESealModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, fontSize: '0.82rem' }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <ShieldCheck size={28} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>
                    TRẠNG THÁI: KHÓA AN TOÀN TUYỆT ĐỐI (TAMPER-FREE)
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: 2 }}>
                    Cáp chốt cơ học và mạch quang học nguyên vẹn 100%. Chưa phát hiện dấu hiệu can thiệp vật lý hoặc cắt seal.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  background: subtleBg
                }}
              >
                <div>
                  <span style={{ opacity: 0.72 }}>Mã Container niêm phong:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem', marginTop: 2 }}>
                    {selectedESealModal.containerCode}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Tiêu chuẩn an ninh quốc tế:</span>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>
                    {selectedESealModal.isoStandard || 'ISO 17712 High Security Seal'}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Dung lượng pin chốt seal:</span>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    {selectedESealModal.batteryPct || 98}% ({selectedESealModal.voltageV || 3.62}V Li-SOCl2)
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Hành lang Geofencing:</span>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>
                    {selectedESealModal.geofenceCorridor || 'Cát Lái ↔ VSIP 1'}
                  </div>
                </div>
              </div>

              <div>
                <strong>Cơ chế bảo mật &amp; Quy định Hải quan:</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.6 }}>
                  <li>
                    <strong>Mạch cảm biến sợi quang lõi cáp (Optical Fiber):</strong> Tự động kích hoạt còi báo động và truyền gói tin cảnh báo khẩn SOS qua mạng 4G LTE-M / NB-IoT nếu chốt cáp bị cắt đứt.
                  </li>
                  <li>
                    <strong>Định vị kép GNSS &amp; RFID UHF EPC Gen 2:</strong> Cổng hải quan cảng biển tự động quét nhận diện container trong 0.2 giây khi xe qua barie.
                  </li>
                  <li>
                    <strong>Quy định pháp lý:</strong> Tuân thủ Quyết định của Tổng cục Hải quan về giám sát hàng hóa vận chuyển chịu sự giám sát hải quan bằng Seal định vị điện tử.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedESealModal(null)}
                className="lp-btn lp-btn--ghost lp-btn--sm"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Đã tải về Chứng thư Giám sát Niêm phong Hải quan điện tử cho Seal ${selectedESealModal.eSealNumber}!`);
                }}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <Download size={14} /> Tải Biên Bản Niêm Phong (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: THÔNG SỐ HỘP ĐEN IOT CONTAINER ĐỘC LẬP ── */}
      {selectedIoTModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 660,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: isDark ? '#061611' : '#ffffff',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: 24,
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                paddingBottom: 12,
                marginBottom: 16
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
                  HỆ THỐNG GIÁM SÁT VIỄN THÔNG VỎ CONTAINER (SMART CONTAINER TELEMATICS)
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '3px 0 0' }}>
                  Hộp Đen IoT: {selectedIoTModal.containerCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIoTModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, fontSize: '0.82rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  background: subtleBg
                }}
              >
                <div>
                  <span style={{ opacity: 0.72 }}>Model Hộp Đen:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                    {selectedIoTModal.hardwareModel}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Nguồn năng lượng:</span>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    Solar Harvester {selectedIoTModal.solarPowerWatts || 42}W + {selectedIoTModal.batteryLife}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Kênh truyền thông:</span>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>
                    {selectedIoTModal.connectivity}
                  </div>
                </div>
                <div>
                  <span style={{ opacity: 0.72 }}>Khóa Seal điện tử kèm theo:</span>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    {selectedIoTModal.eSealNumber}
                  </div>
                </div>
              </div>

              <div>
                <strong>Mạng cảm biến không dây nội bộ (BLE Wireless Mesh):</strong>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    marginTop: 8
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Nhiệt độ gió cấp</div>
                    <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{selectedIoTModal.supplyAirTemp}°C</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Nhiệt độ gió hồi</div>
                    <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{selectedIoTModal.returnAirTemp}°C</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Độ ẩm khoang (%RH)</div>
                    <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>{selectedIoTModal.humidity}%</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Gia tốc chấn động</div>
                    <strong style={{ fontSize: '1.05rem', color: '#f59e0b' }}>{selectedIoTModal.shockG} G</strong>
                  </div>
                </div>
              </div>

              <div>
                <strong>Lợi ích vượt trội so với định vị xe đầu kéo (OBD-II):</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.6 }}>
                  <li>
                    <strong>Giám sát liên tục ngay cả khi hạ bãi:</strong> Khi container được dỡ khỏi rơ-moóc lưu tại bãi depot Cát Lái hoặc sang sà lan đường thủy, hộp đen vẫn duy trì phát tín hiệu GPS và nhiệt độ không bị ngắt quãng.
                  </li>
                  <li>
                    <strong>Không khoan thủng thành cách nhiệt:</strong> Cảm biến trong khoang kết nối không dây Bluetooth Low Energy Mesh tới Gateway gắn ngoài, đảm bảo không làm rò rỉ nhiệt hay mất thẩm mỹ vỏ container.
                  </li>
                  <li>
                    <strong>Tự cấp nguồn vĩnh cửu:</strong> Tấm pin mặt trời tích hợp sạc liên tục ban ngày, pin Lithium Thionyl Chloride dự phòng hoạt động bền bỉ trong môi trường khắc nghiệt từ -30°C đến +70°C.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedIoTModal(null)}
                className="lp-btn lp-btn--ghost lp-btn--sm"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Đã xuất gói dữ liệu Telemetry chuẩn JSON cho Container ${selectedIoTModal.containerCode}!`);
                }}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <Download size={14} /> Xuất Dữ Liệu Hộp Đen (JSON)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: THÔNG TIN HỒ SƠ TÀI XẾ & ĐIỀU PHỐI ĐƯỜNG TRƯỜNG ── */}
      {selectedDriverModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: isDark ? '#061611' : '#ffffff',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: 24,
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                paddingBottom: 12,
                marginBottom: 16
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
                  CCADRO GREEN FLEET ALLIANCE • HỒ SƠ TÀI XẾ CONTAINER
                </span>
                <h3 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '3px 0 0' }}>
                  {selectedDriverModal.driverName || 'Nguyễn Văn Tài'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriverModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, fontSize: '0.82rem' }}>
              {/* Driver Contact Highlight Card */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.08))',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.8, textTransform: 'uppercase' }}>
                    Số Điện Thoại Trực Tiếp (24/7)
                  </div>
                  <strong style={{ fontSize: '1.35rem', color: '#10b981', letterSpacing: '0.5px' }}>
                    {selectedDriverModal.driverPhone || '0903 812 456'}
                  </strong>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>
                    Tài xế đang sẵn sàng nhận cuộc gọi điều phối chuyến hàng.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`tel:${(selectedDriverModal.driverPhone || '0903812456').replace(/\s+/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#042f2e',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <PhoneCall size={14} /> Gọi Điện Ngay
                  </a>
                  <a
                    href={`sms:${(selectedDriverModal.driverPhone || '0903812456').replace(/\s+/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      borderRadius: 999,
                      background: subtleBg,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      color: 'inherit',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <MessageSquare size={14} /> Nhắn Tin
                  </a>
                </div>
              </div>

              {/* Driver Details Table */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  background: subtleBg
                }}
              >
                <div>
                  <span style={{ opacity: 0.72 }}>Giấy phép lái xe:</span>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>
                    {selectedDriverModal.driverLicense || 'GPLX Hạng FC • 9 năm kinh nghiệm'}
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.72 }}>Điểm đánh giá an toàn:</span>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    ★ {selectedDriverModal.driverSafetyScore || 4.95} / 5.0 (0 vi phạm)
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.72 }}>Phương tiện đầu kéo:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                    {selectedDriverModal.licensePlate} ({selectedDriverModal.vehicleType})
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.72 }}>Container đang chở:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                    {selectedDriverModal.containerCode} ({selectedDriverModal.isoType || '45R1'})
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.72 }}>Lộ trình được phân công:</span>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>
                    {selectedDriverModal.originName} ➔ {selectedDriverModal.destinationName}
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.72 }}>Khóa Seal Hải quan:</span>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                    {selectedDriverModal.eSealNumber} (ISO 17712)
                  </div>
                </div>
              </div>

              <div>
                <strong>Cam kết Tiêu chuẩn Lái xe An toàn &amp; Tiết kiệm Năng lượng (Eco-Driving):</strong>
                <ul style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.6 }}>
                  <li>
                    <strong>Tuyệt đối bám sát tim đường lộ trình xanh (UC05):</strong> Không rẽ lệch hành lang &gt; 200m trừ khi có điều phối viên duyệt đổi tuyến (UC10).
                  </li>
                  <li>
                    <strong>Giữ vận tốc ổn định chuẩn GLEC v3:</strong> Duy trì dải tốc độ tối ưu 45 - 60 km/h trên cao tốc, hạn chế phanh gấp giúp bảo vệ chất lượng hàng hóa và triệt tiêu rung chấn.
                  </li>
                  <li>
                    <strong>Hỗ trợ kiểm tra niêm phong khóa seal:</strong> Ký biên bản giao nhận điện tử (ePOD) đầy đủ tại kho đích và bàn giao chứng từ ngay khi đến nơi.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedDriverModal(null)}
                className="lp-btn lp-btn--ghost lp-btn--sm"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDriverModal(null);
                  setSelectedCode(selectedDriverModal.shipmentCode);
                  setActiveTab('tracking');
                }}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <Navigation size={14} /> Theo Dõi Xe &amp; Container Này 3D
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
