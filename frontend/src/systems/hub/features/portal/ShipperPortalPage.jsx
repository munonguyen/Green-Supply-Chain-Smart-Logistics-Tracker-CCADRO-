import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Compass,
  Cpu,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Moon,
  Navigation,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  Truck,
  Users,
  Webhook
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { api } from '../../../../services/api';
import CcadroLogo from '../../../../shared/components/CcadroLogo';
import UserAccountMenu from '../../../../shared/components/UserAccountMenu';
import AccountSettingsModal from '../../../../shared/components/AccountSettingsModal';
import SidebarAccountCard from '../../../../shared/components/SidebarAccountCard';
import { getRoleHeaderMeta } from '../../../../utils/userSettings';
import ElasticSearchBar from '../../../../shared/components/ElasticSearchBar';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import GrabDriverAvatar from '../../../../shared/components/GrabDriverAvatar';
import HubShipperIsolationPanel from '../isolation/HubShipperIsolationPanel';
import HubIamAccountsTab from '../iam/HubIamAccountsTab';
import PhotoPodModal from '../../shared/PhotoPodModal';
import MessengerWorkspaceModal from '../../../../shared/chat/MessengerWorkspaceModal';
import {
    DINHBANG_HANDOVER,
    DINHBANG_HUB,
    DINHBANG_MANIFEST_ITEMS,
    DINHBANG_SHIPPERS,
    INITIAL_HUB_POLICIES,
    INITIAL_TASK_RANGE_BATCHES,
    enrichSenderMetadata,
    parseTrackingTimeline
} from '../../shared/hubShipperSeedData';
import {
    getUnreadCountForViewer,
    loadChatThreadsMap,
    markChatThreadRead,
    sendGrabChatMessage,
    subscribeDriverChat,
    syncChatThreadFromDb
} from '../../../../utils/driverChatSync';

const EARTH_RADIUS_KM = 6371.0;

export function calculateHaversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

const INITIAL_DISTRIBUTION_HUBS = [
    DINHBANG_HUB,
    {
        id: '55555555-5555-4555-8555-555555550001',
        hubCode: 'HUB-AMATA-BH',
        shortName: 'Trụ sở Amata • Biên Hòa',
        hubName: 'Trụ sở Giao nhận Khu vực Amata • Biên Hòa',
        companyName: 'Kerry Cold Chain 3PL',
        externalSystemName: 'Kerry SmartWMS v4 (Hub Biên Hòa)',
        webhookEndpoint: 'https://api.kerry-wms.example.vn/v2/webhooks/ccadro/handover',
        address: 'Đại lộ Amata, P. Long Bình, TP. Biên Hòa, Đồng Nai',
        districtZone: 'Cụm KCN Amata - Long Bình - Tam Hiệp',
        centerLat: 10.9465,
        centerLng: 106.892,
        coverageRadiusKm: 6.5
    },
    {
        id: '55555555-5555-4555-8555-555555550002',
        hubCode: 'HUB-SHTP-Q9',
        shortName: 'Trụ sở SHTP • Quận 9',
        hubName: 'Trụ sở Điều phối Khu Công Nghệ Cao Quận 9 (SHTP)',
        companyName: 'Samsung SDS Logistics WMS',
        externalSystemName: 'SAP EWM 9.5 SHTP Hub',
        webhookEndpoint: 'https://ewm-gateway.sds-vn.example.com/api/inbound/container',
        address: 'Lô I-3B Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức',
        districtZone: 'Cụm SHTP - Tân Phú - Long Thạnh Mỹ',
        centerLat: 10.8552,
        centerLng: 106.785,
        coverageRadiusKm: 6.0
    },
    {
        id: '55555555-5555-4555-8555-555555550003',
        hubCode: 'HUB-VSIP1-BD',
        shortName: 'Trụ sở VSIP 1 • Bình Dương',
        hubName: 'Trụ sở Bưu cục Trung tâm VSIP 1 • Thuận An',
        companyName: 'Gemadept Distribution 3PL',
        externalSystemName: 'Gemadept SmartPort DMS',
        webhookEndpoint: 'https://connect.gemadept.example.vn/webhook/container-arrived',
        address: 'Số 8 Hữu Nghị, KCN VSIP 1, TP. Thuận An, Bình Dương',
        districtZone: 'Cụm VSIP 1 - Bình Hòa - An Phú',
        centerLat: 10.928,
        centerLng: 106.713,
        coverageRadiusKm: 6.0
    },
    {
        id: '55555555-5555-4555-8555-555555550004',
        hubCode: 'HUB-NT2-DN',
        shortName: 'Trụ sở Nhơn Trạch 2 • Đồng Nai',
        hubName: 'Trụ sở Kho Lạnh & Giao nhận Nhơn Trạch 2',
        companyName: 'ViettelPost Cold Chain Hub',
        externalSystemName: 'VTP Fulfillment Core DMS',
        webhookEndpoint: 'https://partner-gw.viettelpost.example.vn/ccadro/epod-sync',
        address: 'Đường 25B, KCN Nhơn Trạch 2, H. Nhơn Trạch, Đồng Nai',
        districtZone: 'Cụm Nhơn Trạch 1 - Nhơn Trạch 2 - Hiệp Phước',
        centerLat: 10.736,
        centerLng: 106.879,
        coverageRadiusKm: 7.0
    }
];

const INITIAL_HUB_LOCAL_SHIPPERS = [
    ...DINHBANG_SHIPPERS,
    {
        id: '66666666-6666-4666-8666-666666660101',
        shipperCode: 'SHP-BH-101',
        hubCode: 'HUB-AMATA-BH',
        fullName: 'Đặng Quốc Bảo',
        phone: '0902 418 229',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '60C-192.45',
        assignedZoneName: 'Phân khu Bắc KCN Amata & Kho Lạnh Long Bình',
        assignedLat: 10.952,
        assignedLng: 106.8965,
        coverageRadiusKm: 2.2,
        currentLat: 10.9508,
        currentLng: 106.8952,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 240,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.96
    },
    {
        id: '66666666-6666-4666-8666-666666660102',
        shipperCode: 'SHP-BH-102',
        hubCode: 'HUB-AMATA-BH',
        fullName: 'Võ Minh Khang',
        phone: '0908 773 910',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '60C-338.12',
        assignedZoneName: 'Phân khu Nam Amata & Cụm Thương Mại Tam Hiệp',
        assignedLat: 10.9385,
        assignedLng: 106.8845,
        coverageRadiusKm: 2.4,
        currentLat: 10.9396,
        currentLng: 106.8858,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 180,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.91
    },
    {
        id: '66666666-6666-4666-8666-666666660103',
        shipperCode: 'SHP-BH-103',
        hubCode: 'HUB-AMATA-BH',
        fullName: 'Huỳnh Gia Huy',
        phone: '0933 612 804',
        vehicleType: 'Xe Tải Nhẹ EV 2.0T',
        vehiclePlate: '60C-510.88',
        assignedZoneName: 'Phân khu Đông Amata & Khu Công Nghiệp Loteco',
        assignedLat: 10.944,
        assignedLng: 106.906,
        coverageRadiusKm: 2.5,
        currentLat: 10.9451,
        currentLng: 106.9044,
        coldChainCapable: false,
        maxCapacityKg: 2000,
        currentLoadKg: 320,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.88
    },
    {
        id: '66666666-6666-4666-8666-666666660201',
        shipperCode: 'SHP-Q9-201',
        hubCode: 'HUB-SHTP-Q9',
        fullName: 'Trương Hoàng Phúc',
        phone: '0919 304 512',
        vehicleType: 'Xe Van Chống Tĩnh Điện & Lạnh 1.5T',
        vehiclePlate: '51D-819.20',
        assignedZoneName: 'Phân khu Bán dẫn & Điện tử Lõi SHTP (Đường D1 - D2)',
        assignedLat: 10.8588,
        assignedLng: 106.7885,
        coverageRadiusKm: 2.0,
        currentLat: 10.8579,
        currentLng: 106.7878,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 150,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.98
    },
    {
        id: '66666666-6666-4666-8666-666666660202',
        shipperCode: 'SHP-Q9-202',
        hubCode: 'HUB-SHTP-Q9',
        fullName: 'Lâm Tấn Phát',
        phone: '0977 821 440',
        vehicleType: 'Xe Tải Nhẹ EV 2.0T',
        vehiclePlate: '51D-902.11',
        assignedZoneName: 'Phân khu R&D Nam SHTP & Cụm Kho ngoại quan Phú Hữu',
        assignedLat: 10.8465,
        assignedLng: 106.781,
        coverageRadiusKm: 2.5,
        currentLat: 10.8472,
        currentLng: 106.7821,
        coldChainCapable: false,
        maxCapacityKg: 2000,
        currentLoadKg: 280,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.92
    },
    {
        id: '66666666-6666-4666-8666-666666660203',
        shipperCode: 'SHP-Q9-203',
        hubCode: 'HUB-SHTP-Q9',
        fullName: 'Phan Thanh Tùng',
        phone: '0904 115 678',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '51D-774.66',
        assignedZoneName: 'Phân khu Đông SHTP & Khu Công Nghệ Long Thạnh Mỹ',
        assignedLat: 10.853,
        assignedLng: 106.7985,
        coverageRadiusKm: 2.3,
        currentLat: 10.8525,
        currentLng: 106.7972,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 90,
        activeItemCount: 0,
        shiftStatus: 'AVAILABLE',
        rating: 4.94
    },
    {
        id: '66666666-6666-4666-8666-666666660301',
        shipperCode: 'SHP-BD-301',
        hubCode: 'HUB-VSIP1-BD',
        fullName: 'Nguyễn Thành Đạt',
        phone: '0938 920 115',
        vehicleType: 'Xe Tải Nhẹ EV 2.0T',
        vehiclePlate: '61C-612.09',
        assignedZoneName: 'Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1',
        assignedLat: 10.9315,
        assignedLng: 106.7165,
        coverageRadiusKm: 2.2,
        currentLat: 10.9308,
        currentLng: 106.7158,
        coldChainCapable: false,
        maxCapacityKg: 2000,
        currentLoadKg: 480,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.95
    },
    {
        id: '66666666-6666-4666-8666-666666660302',
        shipperCode: 'SHP-BD-302',
        hubCode: 'HUB-VSIP1-BD',
        fullName: 'Bùi Tuấn Kiệt',
        phone: '0963 440 289',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '61C-705.41',
        assignedZoneName: 'Tuyến Nam VSIP 1 - Cụm Kho Lạnh & Siêu thị Bình Hòa',
        assignedLat: 10.921,
        assignedLng: 106.708,
        coverageRadiusKm: 2.4,
        currentLat: 10.9218,
        currentLng: 106.7091,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 390,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.93
    },
    {
        id: '66666666-6666-4666-8666-666666660303',
        shipperCode: 'SHP-BD-303',
        hubCode: 'HUB-VSIP1-BD',
        fullName: 'Đỗ Hoàng Duy',
        phone: '0915 608 332',
        vehicleType: 'Xe Tải Nhẹ EV 2.0T',
        vehiclePlate: '61C-819.77',
        assignedZoneName: 'Tuyến Bắc VSIP 1 - Cụm Logistics An Phú & Việt Hương',
        assignedLat: 10.937,
        assignedLng: 106.723,
        coverageRadiusKm: 2.5,
        currentLat: 10.9362,
        currentLng: 106.7219,
        coldChainCapable: false,
        maxCapacityKg: 2000,
        currentLoadKg: 480,
        activeItemCount: 1,
        shiftStatus: 'AVAILABLE',
        rating: 4.89
    },
    {
        id: '66666666-6666-4666-8666-666666660401',
        shipperCode: 'SHP-DN-401',
        hubCode: 'HUB-NT2-DN',
        fullName: 'Lý Minh Quân',
        phone: '0909 514 820',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '60C-881.20',
        assignedZoneName: 'Phân khu Lạnh Trung tâm KCN Nhơn Trạch 2 (Đường 25B)',
        assignedLat: 10.7395,
        assignedLng: 106.8825,
        coverageRadiusKm: 2.5,
        currentLat: 10.7388,
        currentLng: 106.8819,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 0,
        activeItemCount: 0,
        shiftStatus: 'AVAILABLE',
        rating: 4.97
    },
    {
        id: '66666666-6666-4666-8666-666666660402',
        shipperCode: 'SHP-DN-402',
        hubCode: 'HUB-NT2-DN',
        fullName: 'Châu Gia Bảo',
        phone: '0984 239 711',
        vehicleType: 'Xe Van Lạnh EV 1.5T',
        vehiclePlate: '60C-912.64',
        assignedZoneName: 'Phân khu Nam Nhơn Trạch 2 & Cụm Chế biến Thực phẩm',
        assignedLat: 10.729,
        assignedLng: 106.873,
        coverageRadiusKm: 2.5,
        currentLat: 10.7301,
        currentLng: 106.8742,
        coldChainCapable: true,
        maxCapacityKg: 1500,
        currentLoadKg: 0,
        activeItemCount: 0,
        shiftStatus: 'AVAILABLE',
        rating: 4.94
    },
    {
        id: '66666666-6666-4666-8666-666666660403',
        shipperCode: 'SHP-DN-403',
        hubCode: 'HUB-NT2-DN',
        fullName: 'Mai Xuân Trường',
        phone: '0937 190 543',
        vehicleType: 'Xe Tải Nhẹ EV 2.0T',
        vehiclePlate: '60C-740.18',
        assignedZoneName: 'Phân khu Đông Nhơn Trạch & Tuyến Cảng Phước An',
        assignedLat: 10.742,
        assignedLng: 106.891,
        coverageRadiusKm: 2.8,
        currentLat: 10.7412,
        currentLng: 106.8901,
        coldChainCapable: false,
        maxCapacityKg: 2000,
        currentLoadKg: 0,
        activeItemCount: 0,
        shiftStatus: 'AVAILABLE',
        rating: 4.9
    }
];

const INITIAL_MANIFEST_ITEMS = [
    ...DINHBANG_MANIFEST_ITEMS,
    {
        id: '77777777-7777-4777-8777-777777770101',
        itemCode: 'WB-AMATA-8192-01',
        containerCode: 'TCKU-781920-4',
        shipmentCode: 'SHP-2026-8192',
        hubCode: 'HUB-AMATA-BH',
        cargoName: 'Lô Tôm Sú Đông Lạnh IQF Minh Phú (32 Thùng Bảo Ôn)',
        cargoCategory: 'COLD_FROZEN',
        consigneeName: 'Nhà máy Chế biến Thủy sản CP Bắc Amata',
        consigneePhone: '0251 3891 204',
        deliveryAddress: 'Lô 12 Đường số 3, Khu Bắc KCN Amata, P. Long Bình, Biên Hòa',
        deliveryZoneName: 'Phân khu Bắc KCN Amata & Kho Lạnh Long Bình',
        deliveryLat: 10.9532,
        deliveryLng: 106.8978,
        weightKg: 420,
        parcelCount: 32,
        requiredTempC: -18.0,
        requiresColdChain: true,
        slaWindow: 'Trước 14:30 hôm nay',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770102',
        itemCode: 'WB-AMATA-8192-02',
        containerCode: 'TCKU-781920-4',
        shipmentCode: 'SHP-2026-8192',
        hubCode: 'HUB-AMATA-BH',
        cargoName: 'Phi lê Cá Hồi Tươi Chilled & Hải sản Cao cấp (24 Kiện)',
        cargoCategory: 'COLD_CHILLED',
        consigneeName: 'Trung tâm Phân phối Lotte Mart Nam Amata - Tam Hiệp',
        consigneePhone: '0251 3892 550',
        deliveryAddress: 'Khu Thương mại Nam Amata, P. Tam Hiệp, TP. Biên Hòa',
        deliveryZoneName: 'Phân khu Nam Amata & Cụm Thương Mại Tam Hiệp',
        deliveryLat: 10.9372,
        deliveryLng: 106.8832,
        weightKg: 340,
        parcelCount: 24,
        requiredTempC: -12.0,
        requiresColdChain: true,
        slaWindow: 'Trước 15:00 hôm nay',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770103',
        itemCode: 'WB-AMATA-8192-03',
        containerCode: 'TCKU-781920-4',
        shipmentCode: 'SHP-2026-8192',
        hubCode: 'HUB-AMATA-BH',
        cargoName: 'Bao bì Thực phẩm Khô & Thùng Carton Cách Nhiệt (18 Pallet)',
        cargoCategory: 'FMCG_DRY',
        consigneeName: 'Kho Đóng gói Xuất khẩu Nestlé Đông Amata (Loteco)',
        consigneePhone: '0251 3895 771',
        deliveryAddress: 'Đường số 9, Phân khu Đông Amata - Loteco, TP. Biên Hòa',
        deliveryZoneName: 'Phân khu Đông Amata & Khu Công Nghiệp Loteco',
        deliveryLat: 10.9452,
        deliveryLng: 106.9072,
        weightKg: 360,
        parcelCount: 18,
        requiredTempC: 22.0,
        requiresColdChain: false,
        slaWindow: 'Trước 16:00 hôm nay',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770201',
        itemCode: 'WB-SHTP-4920-01',
        containerCode: 'MSKU-492018-7',
        shipmentCode: 'SHP-2026-4920',
        hubCode: 'HUB-SHTP-Q9',
        cargoName: 'Khay Wafer Bán dẫn & Cảm biến Quang học (15 Kiện ESD)',
        cargoCategory: 'HIGH_VALUE_TECH',
        consigneeName: 'Nhà máy Intel Products Vietnam - Phân khu Lõi D1',
        consigneePhone: '028 3736 2200',
        deliveryAddress: 'Lô I-2 Đường D1, Khu Công Nghệ Cao Quận 9, TP. Thủ Đức',
        deliveryZoneName: 'Phân khu Bán dẫn & Điện tử Lõi SHTP (Đường D1 - D2)',
        deliveryLat: 10.8595,
        deliveryLng: 106.7892,
        weightKg: 290,
        parcelCount: 15,
        requiredTempC: 20.0,
        requiresColdChain: true,
        slaWindow: 'Ưu tiên SLA 60 phút',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770202',
        itemCode: 'WB-SHTP-4920-02',
        containerCode: 'MSKU-492018-7',
        shipmentCode: 'SHP-2026-4920',
        hubCode: 'HUB-SHTP-Q9',
        cargoName: 'Linh kiện Bo mạch Điện tử & Vỏ Thiết bị Tự động hóa (22 Thùng)',
        cargoCategory: 'FMCG_DRY',
        consigneeName: 'Trung tâm R&D Nidec Nam SHTP',
        consigneePhone: '028 3736 0911',
        deliveryAddress: 'Lô E-4 Đường D9, Phân khu Nam SHTP, TP. Thủ Đức',
        deliveryZoneName: 'Phân khu R&D Nam SHTP & Cụm Kho ngoại quan Phú Hữu',
        deliveryLat: 10.8458,
        deliveryLng: 106.7802,
        weightKg: 330,
        parcelCount: 22,
        requiredTempC: 24.0,
        requiresColdChain: false,
        slaWindow: 'Trước 15:30 hôm nay',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770203',
        itemCode: 'WB-SHTP-4920-03',
        containerCode: 'MSKU-492018-7',
        shipmentCode: 'SHP-2026-4920',
        hubCode: 'HUB-SHTP-Q9',
        cargoName: 'Hóa chất Bán dẫn Tinh khiết Bảo quản Lạnh (12 Bình Chuyên Dụng)',
        cargoCategory: 'COLD_CHILLED',
        consigneeName: 'Nhà máy Samsung HCMC CE Complex (Đông SHTP)',
        consigneePhone: '028 3736 8888',
        deliveryAddress: 'Lô I-11 Đường D15, Phân khu Đông SHTP, P. Long Thạnh Mỹ',
        deliveryZoneName: 'Phân khu Đông SHTP & Khu Công Nghệ Long Thạnh Mỹ',
        deliveryLat: 10.8538,
        deliveryLng: 106.7995,
        weightKg: 240,
        parcelCount: 12,
        requiredTempC: 8.0,
        requiresColdChain: true,
        slaWindow: 'Trước 14:45 hôm nay',
        dispatchStatus: 'IN_CONTAINER',
        assignedShipperCode: null,
        assignedShipperName: null,
        proximityDistanceKm: null,
        matchScore: null,
        dispatchReason: null
    },
    {
        id: '77777777-7777-4777-8777-777777770301',
        itemCode: 'WB-VSIP-8219-01',
        containerCode: 'CMAU-821903-2',
        shipmentCode: 'SHP-2026-8219',
        hubCode: 'HUB-VSIP1-BD',
        cargoName: 'Lô Hàng Tiêu Dùng Nhanh P&G (40 Thùng Master Carton)',
        cargoCategory: 'FMCG_DRY',
        consigneeName: 'Kho Phân Phối Trung Tâm P&G Đông Dương - Đại lộ Tự Do',
        consigneePhone: '0274 3743 880',
        deliveryAddress: 'Số 14 Đại lộ Tự Do, KCN VSIP 1, TP. Thuận An, Bình Dương',
        deliveryZoneName: 'Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1',
        deliveryLat: 10.9324,
        deliveryLng: 106.7174,
        weightKg: 480,
        parcelCount: 40,
        requiredTempC: 25.0,
        requiresColdChain: false,
        slaWindow: 'Đang giao trong ca chiều',
        dispatchStatus: 'ASSIGNED_TO_SHIPPER',
        assignedShipperCode: 'SHP-BD-301',
        assignedShipperName: 'Nguyễn Thành Đạt',
        proximityDistanceKm: 0.14,
        matchScore: 98.2,
        dispatchReason: 'Gần vị trí phân công nhất (0.14 km) • Thuộc Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1'
    },
    {
        id: '77777777-7777-4777-8777-777777770302',
        itemCode: 'WB-VSIP-8219-02',
        containerCode: 'CMAU-821903-2',
        shipmentCode: 'SHP-2026-8219',
        hubCode: 'HUB-VSIP1-BD',
        cargoName: 'Sữa Tươi & Chế phẩm Dinh dưỡng Bảo Ôn (28 Khay Lạnh)',
        cargoCategory: 'COLD_CHILLED',
        consigneeName: 'Siêu thị AEON Canary & Cụm Kho Lạnh Bình Hòa',
        consigneePhone: '0274 3763 655',
        deliveryAddress: 'Đại lộ Bình Dương, Khu Nam VSIP 1, P. Bình Hòa, Thuận An',
        deliveryZoneName: 'Tuyến Nam VSIP 1 - Cụm Kho Lạnh & Siêu thị Bình Hòa',
        deliveryLat: 10.9201,
        deliveryLng: 106.7072,
        weightKg: 390,
        parcelCount: 28,
        requiredTempC: 4.0,
        requiresColdChain: true,
        slaWindow: 'Ưu tiên chuỗi lạnh 4°C',
        dispatchStatus: 'OUT_FOR_DELIVERY',
        assignedShipperCode: 'SHP-BD-302',
        assignedShipperName: 'Bùi Tuấn Kiệt',
        proximityDistanceKm: 0.13,
        matchScore: 98.5,
        dispatchReason: 'Gần vị trí phân công nhất (0.13 km) • Đạt chuẩn Xe Van Lạnh bảo ôn • Tuyến Nam VSIP 1'
    },
    {
        id: '77777777-7777-4777-8777-777777770303',
        itemCode: 'WB-VSIP-8219-03',
        containerCode: 'CMAU-821903-2',
        shipmentCode: 'SHP-2026-8219',
        hubCode: 'HUB-VSIP1-BD',
        cargoName: 'Nguyên liệu Đóng gói & Nhựa Kỹ thuật (30 Kiện)',
        cargoCategory: 'FMCG_DRY',
        consigneeName: 'Nhà máy Bao bì Tân Tiến Bắc VSIP 1 - An Phú',
        consigneePhone: '0274 3711 402',
        deliveryAddress: 'Đường số 6, Khu Bắc VSIP 1 - Giáp An Phú, Thuận An',
        deliveryZoneName: 'Tuyến Bắc VSIP 1 - Cụm Logistics An Phú & Việt Hương',
        deliveryLat: 10.9378,
        deliveryLng: 106.7239,
        weightKg: 480,
        parcelCount: 30,
        requiredTempC: 25.0,
        requiresColdChain: false,
        slaWindow: 'Trước 16:30 hôm nay',
        dispatchStatus: 'ASSIGNED_TO_SHIPPER',
        assignedShipperCode: 'SHP-BD-303',
        assignedShipperName: 'Đỗ Hoàng Duy',
        proximityDistanceKm: 0.13,
        matchScore: 98.3,
        dispatchReason: 'Gần vị trí phân công nhất (0.13 km) • Thuộc Tuyến Bắc VSIP 1 - An Phú'
    },
    {
        id: '77777777-7777-4777-8777-777777770401',
        itemCode: 'WB-NT2-6192-01',
        containerCode: 'CCLU-619284-5',
        shipmentCode: 'SHP-2026-6192',
        hubCode: 'HUB-NT2-DN',
        cargoName: 'Hải sản Xuất khẩu Đông Lạnh Sâu (-18°C • 26 Thùng)',
        cargoCategory: 'COLD_FROZEN',
        consigneeName: 'Kho Lạnh Thực phẩm Quốc tế Trung tâm Nhơn Trạch 2',
        consigneePhone: '0251 3569 112',
        deliveryAddress: 'Lô B2 Đường 25B, KCN Nhơn Trạch 2, H. Nhơn Trạch',
        deliveryZoneName: 'Phân khu Lạnh Trung tâm KCN Nhơn Trạch 2 (Đường 25B)',
        deliveryLat: 10.7402,
        deliveryLng: 106.8831,
        weightKg: 350,
        parcelCount: 26,
        requiredTempC: -18.0,
        requiresColdChain: true,
        slaWindow: 'Đã hoàn tất đúng SLA',
        dispatchStatus: 'DELIVERED_POD',
        assignedShipperCode: 'SHP-DN-401',
        assignedShipperName: 'Lý Minh Quân',
        proximityDistanceKm: 0.1,
        matchScore: 99.0,
        dispatchReason: 'Gần vị trí phân công nhất (0.10 km) • Đã ký nhận POD tại Kho Lạnh Đường 25B',
        recipientPodName: 'Kho Lạnh Quốc tế Nhơn Trạch 2 (Đã ký POD)'
    },
    {
        id: '77777777-7777-4777-8777-777777770402',
        itemCode: 'WB-NT2-6192-02',
        containerCode: 'CCLU-619284-5',
        shipmentCode: 'SHP-2026-6192',
        hubCode: 'HUB-NT2-DN',
        cargoName: 'Nguyên liệu Chế biến Thực phẩm Lạnh (20 Thùng)',
        cargoCategory: 'COLD_CHILLED',
        consigneeName: 'Nhà máy Thực phẩm Ajinomoto Nam Nhơn Trạch 2',
        consigneePhone: '0251 3569 408',
        deliveryAddress: 'Đường số 7, Phân khu Nam KCN Nhơn Trạch 2, Đồng Nai',
        deliveryZoneName: 'Phân khu Nam Nhơn Trạch 2 & Cụm Chế biến Thực phẩm',
        deliveryLat: 10.7284,
        deliveryLng: 106.8722,
        weightKg: 290,
        parcelCount: 20,
        requiredTempC: -10.0,
        requiresColdChain: true,
        slaWindow: 'Đã hoàn tất đúng SLA',
        dispatchStatus: 'DELIVERED_POD',
        assignedShipperCode: 'SHP-DN-402',
        assignedShipperName: 'Châu Gia Bảo',
        proximityDistanceKm: 0.11,
        matchScore: 98.8,
        dispatchReason: 'Gần vị trí phân công nhất (0.11 km) • Đã ký nhận POD tại Khu Nam Nhơn Trạch 2',
        recipientPodName: 'Ajinomoto Nam Nhơn Trạch 2 (Đã ký POD)'
    },
    {
        id: '77777777-7777-4777-8777-777777770403',
        itemCode: 'WB-NT2-6192-03',
        containerCode: 'CCLU-619284-5',
        shipmentCode: 'SHP-2026-6192',
        hubCode: 'HUB-NT2-DN',
        cargoName: 'Vật tư Đóng gói & Pallet Nhựa Xuất khẩu (15 Kiện)',
        cargoCategory: 'FMCG_DRY',
        consigneeName: 'Trung tâm Logistics Đông Nhơn Trạch - Phước An',
        consigneePhone: '0251 3569 890',
        deliveryAddress: 'Đường Tôn Đức Thắng nối dài, Đông Nhơn Trạch, Đồng Nai',
        deliveryZoneName: 'Phân khu Đông Nhơn Trạch & Tuyến Cảng Phước An',
        deliveryLat: 10.7428,
        deliveryLng: 106.8918,
        weightKg: 300,
        parcelCount: 15,
        requiredTempC: 24.0,
        requiresColdChain: false,
        slaWindow: 'Đã hoàn tất đúng SLA',
        dispatchStatus: 'DELIVERED_POD',
        assignedShipperCode: 'SHP-DN-403',
        assignedShipperName: 'Mai Xuân Trường',
        proximityDistanceKm: 0.12,
        matchScore: 98.6,
        dispatchReason: 'Gần vị trí phân công nhất (0.12 km) • Đã ký nhận POD tại Khu Đông Nhơn Trạch',
        recipientPodName: 'Logistics Đông Nhơn Trạch (Đã ký POD)'
    }
];

const INITIAL_THIRD_PARTY_HANDOVERS = [
    DINHBANG_HANDOVER,
    {
        id: '44444444-4444-4444-8444-444444440001',
        containerCode: 'TCKU-781920-4',
        shipmentCode: 'SHP-2026-8192',
        hubCode: 'HUB-AMATA-BH',
        destinationHub: 'KCN Amata Biên Hòa • Kho Lạnh Trung Tâm',
        shipperCompany: 'Kerry Cold Chain 3PL',
        externalSystemName: 'Kerry SmartWMS v4',
        externalTrackingRef: '3PL-AMATA-8192',
        webhookEndpoint: 'https://api.kerry-wms.example.vn/v2/webhooks/ccadro/handover',
        dockGate: 'Cổng B • Dock Lạnh D-04',
        handoverStatus: 'AWAITING_ARRIVAL',
        manifestParcelCount: 3,
        manifestTotalWeightKg: 1120,
        manifestIngested: false,
        driverCode: 'DRV-FC-001',
        driverName: 'Nguyễn Văn Hùng',
        driverPhone: '0903 812 456',
        vehiclePlate: '51C-888.99',
        etaMinutes: 32,
        tempC: -18.4,
        eSealNumber: 'VN-CUST-819204',
        epodSignedBy: null,
        epodSignatureHash: null,
        lastSyncStatus: 'SUBSCRIBED',
        lastSyncPayload: null,
        lastSyncedAt: new Date(Date.now() - 12 * 60000).toISOString()
    },
    {
        id: '44444444-4444-4444-8444-444444440002',
        containerCode: 'MSKU-492018-7',
        shipmentCode: 'SHP-2026-4920',
        hubCode: 'HUB-SHTP-Q9',
        destinationHub: 'Khu Công Nghệ Cao Quận 9 (SHTP)',
        shipperCompany: 'Samsung SDS Logistics WMS',
        externalSystemName: 'SAP EWM 9.5 SHTP',
        externalTrackingRef: 'SHTP-INB-4920',
        webhookEndpoint: 'https://ewm-gateway.sds-vn.example.com/api/inbound/container',
        dockGate: 'Gate 2 • Ramp ESD-02',
        handoverStatus: 'AWAITING_ARRIVAL',
        manifestParcelCount: 3,
        manifestTotalWeightKg: 860,
        manifestIngested: false,
        driverCode: 'DRV-FC-002',
        driverName: 'Lê Minh Khôi',
        driverPhone: '0908 551 209',
        vehiclePlate: '51C-704.33',
        etaMinutes: 24,
        tempC: 21.5,
        eSealNumber: 'VN-CUST-492018',
        epodSignedBy: null,
        epodSignatureHash: null,
        lastSyncStatus: 'SUBSCRIBED',
        lastSyncPayload: null,
        lastSyncedAt: new Date(Date.now() - 8 * 60000).toISOString()
    },
    {
        id: '44444444-4444-4444-8444-444444440003',
        containerCode: 'CMAU-821903-2',
        shipmentCode: 'SHP-2026-8219',
        hubCode: 'HUB-VSIP1-BD',
        destinationHub: 'KCN VSIP 1 Thuận An, Bình Dương',
        shipperCompany: 'Gemadept Distribution 3PL',
        externalSystemName: 'Gemadept SmartPort API',
        externalTrackingRef: 'GMD-VSIP-8219',
        webhookEndpoint: 'https://connect.gemadept.example.vn/webhook/container-arrived',
        dockGate: 'Bay 07 • Inbound FMCG',
        handoverStatus: 'AT_GATE_DOCKED',
        manifestParcelCount: 3,
        manifestTotalWeightKg: 1350,
        manifestIngested: true,
        driverCode: 'DRV-FC-003',
        driverName: 'Trần Hoàng Nam',
        driverPhone: '0914 720 881',
        vehiclePlate: '51D-662.18',
        etaMinutes: 5,
        tempC: 24.0,
        eSealNumber: 'VN-CUST-821903',
        epodSignedBy: null,
        epodSignatureHash: null,
        lastSyncStatus: 'AUTO_DISPATCHED_BY_PROXIMITY',
        lastSyncPayload:
            '{"event":"CONTAINER_MANIFEST_INGESTED_TO_HUB","containerCode":"CMAU-821903-2","hubCode":"HUB-VSIP1-BD","itemCount":3}',
        lastSyncedAt: new Date(Date.now() - 3 * 60000).toISOString()
    },
    {
        id: '44444444-4444-4444-8444-444444440004',
        containerCode: 'CCLU-619284-5',
        shipmentCode: 'SHP-2026-6192',
        hubCode: 'HUB-NT2-DN',
        destinationHub: 'KCN Nhơn Trạch 2, Đồng Nai',
        shipperCompany: 'ViettelPost Cold Chain Hub',
        externalSystemName: 'VTP Fulfillment Core',
        externalTrackingRef: 'VTP-NT2-6192',
        webhookEndpoint: 'https://partner-gw.viettelpost.example.vn/ccadro/epod-sync',
        dockGate: 'Dock Lạnh C-01',
        handoverStatus: 'SYNCED_3PL',
        manifestParcelCount: 3,
        manifestTotalWeightKg: 940,
        manifestIngested: true,
        driverCode: 'DRV-FC-004',
        driverName: 'Phạm Quốc Tuấn',
        driverPhone: '0989 341 612',
        vehiclePlate: '61C-419.52',
        etaMinutes: 0,
        tempC: -18.2,
        eSealNumber: 'VN-CUST-619284',
        epodSignedBy: 'Nguyễn Minh Tuấn (Thủ kho 3PL Nhơn Trạch)',
        epodSignatureHash: 'SHA256:9f84b1c208aa34d1',
        lastSyncStatus: 'SYNCED_3PL',
        lastSyncPayload:
            '{"event":"CONTAINER_HANDOVER_UPDATE","containerCode":"CCLU-619284-5","externalRef":"VTP-NT2-6192","system":"VTP Fulfillment Core","dockGate":"Dock Lạnh C-01","status":"SYNCED_3PL"}',
        lastSyncedAt: new Date(Date.now() - 45 * 60000).toISOString()
    }
];

const HANDOVER_STATUS_META = {
    AWAITING_ARRIVAL: { label: 'Container đang tới Trụ sở', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.14)' },
    AT_GATE_DOCKED: { label: 'Đã cập Trụ sở • Đã nhận Manifest', color: '#d97706', bg: 'rgba(245, 158, 11, 0.15)' },
    UNLOADING: { label: 'Đang xả hàng tại Trụ sở', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.14)' },
    HANDED_OVER_EPOD: { label: 'Trụ sở đã ký nhận Container', color: '#059669', bg: 'rgba(16, 185, 129, 0.15)' },
    SYNCED_3PL: { label: 'Hoàn tất giao & Đồng bộ 3PL', color: '#059669', bg: 'rgba(16, 185, 129, 0.16)' }
};

const DISPATCH_STATUS_META = {
    IN_CONTAINER: {
        label: 'Nằm trong Container (Chưa gửi sang Trụ sở)',
        shortLabel: 'Chờ gửi Trụ sở',
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.14)'
    },
    SYNCED_TO_HUB: {
        label: 'Đã gửi dữ liệu sang Trụ sở (Chờ chia Shipper)',
        shortLabel: 'Chờ chia Shipper',
        color: '#d97706',
        bg: 'rgba(245, 158, 11, 0.16)'
    },
    ASSIGNED_TO_SHIPPER: {
        label: 'Đã phân công Shipper gần vị trí nhất',
        shortLabel: 'Đã chia Shipper',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.15)'
    },
    OUT_FOR_DELIVERY: {
        label: 'Shipper đang giao tới điểm nhận',
        shortLabel: 'Đang đi giao',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.15)'
    },
    DELIVERED_POD: {
        label: 'Shipper đã giao hoàn tất (POD)',
        shortLabel: 'Đã giao POD',
        color: '#059669',
        bg: 'rgba(16, 185, 129, 0.16)'
    }
};

const SHIPPER_SIDEBAR_SECTIONS = [
    {
        group: 'ĐIỀU PHỐI TRỤ SỞ & SHIPPER',
        items: [
            {
                id: 'dispatch',
                label: 'Điều Phối Hàng & Tracking POD',
                shortLabel: 'Điều Phối & POD',
                icon: Compass
            },
            {
                id: 'policy',
                label: 'Chính Sách & Giao Dải Mã',
                shortLabel: 'Chính Sách & Dải Mã',
                icon: ShieldCheck
            },
            {
                id: 'shippers',
                label: 'Đội Ngũ & Phạm Vi Hôm Nay',
                shortLabel: 'Đội Ngũ & Phạm Vi',
                icon: Users
            }
        ]
    },
    {
        group: 'CONTAINER & HỆ THỐNG TRỤ SỞ',
        items: [
            {
                id: 'containers',
                label: 'Container Cập Bãi & Manifest',
                shortLabel: 'Container & Manifest',
                icon: Truck
            },
            {
                id: 'hubs',
                label: 'Mạng Lưới Trụ Sở Khu Vực',
                shortLabel: 'Mạng Lưới Trụ Sở',
                icon: Building2
            },
            {
                id: 'iam',
                label: 'Kho Tài khoản & Bảo mật IAM',
                shortLabel: 'Tài khoản & IAM',
                icon: Lock,
                allowedRoles: ['ADMIN', 'HUB_MANAGER']
            }
        ]
    }
];

const STORAGE_KEY_HANDOVERS = 'ccadro_third_party_shipper_handovers_v3';
const STORAGE_KEY_MANIFEST_ITEMS = 'ccadro_hub_manifest_items_v3';
const STORAGE_KEY_HUB_SHIPPERS = 'ccadro_hub_local_shippers_v3';
const STORAGE_KEY_TASK_RANGES = 'ccadro_hub_task_ranges_v3';

function loadStoredJson(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore storage errors
    }
    return fallback;
}

function saveStoredJson(key, list) {
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
        // ignore storage errors
    }
}

export default function ShipperPortalPage() {
    const {
        user,
        logout,
        accounts = [],
        hubAuthAuditLogs = [],
        provisionHubAccount,
        toggleHubAccountStatus,
        adminDeleteAccount,
        adminRestoreAccount
    } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const userRole = user?.role || 'HUB_SHIPPER';
    const isAdminRole = userRole === 'ADMIN';
    const isHubManager = userRole === 'HUB_MANAGER';
    const isHubShipper = userRole === 'HUB_SHIPPER' || userRole === 'SHIPPER';
    const isReadOnlyAuditor = userRole === 'HUB_AUDITOR';
    const canIngestAndDispatch = isAdminRole || isHubManager;
    const canAssignCodeRange = isAdminRole || isHubManager;
    const canUpdateDeliveryPod = (isAdminRole || isHubManager || isHubShipper) && !isReadOnlyAuditor;
    const canManageHubIam = isAdminRole || isHubManager;

    const boundShipperDefault = useMemo(() => {
        const uname = (user?.username || '').toLowerCase();
        const explicitHub = user?.assignedHubCode;
        const explicitShipper = user?.assignedShipperCode;
        if (explicitHub) {
            return {
                hubCode: explicitHub,
                shipperCode: explicitShipper || null,
                enforced: !isAdminRole
            };
        }
        if (uname === 'shipper' || uname.startsWith('shipper_bn') || uname.includes('dinhbang') || uname === 'hub_inspector_bn') {
            return {
                hubCode: 'HUB-DINHBANG-BN',
                shipperCode: uname === 'shipper_bn2' ? 'SHP-BN-002' : uname === 'shipper_bn3' ? 'SHP-BN-003' : isHubShipper ? 'SHP-BN-001' : null,
                enforced: !isAdminRole
            };
        }
        if (uname === 'shipper_amata' || uname === 'hub_mgr_amata') {
            return {
                hubCode: 'HUB-AMATA-BH',
                shipperCode: isHubShipper ? 'SHP-BH-101' : null,
                enforced: !isAdminRole
            };
        }
        return { hubCode: 'HUB-AMATA-BH', shipperCode: null, enforced: false };
    }, [user, isAdminRole, isHubShipper]);

    const strictHubIsolationEnforced = !isAdminRole;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= 768
    );
    const [activeTab, setActiveTab] = useState('dispatch');

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

    const selectShipperTab = useCallback((tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setIsSidebarCollapsed(true);
        }
    }, []);
    const [hubs, setHubs] = useState(INITIAL_DISTRIBUTION_HUBS);
    const [selectedHubCode, setSelectedHubCode] = useState(boundShipperDefault.hubCode);

    useEffect(() => {
        if (!isAdminRole && boundShipperDefault.hubCode) {
            setSelectedHubCode(boundShipperDefault.hubCode);
        }
    }, [isAdminRole, boundShipperDefault.hubCode]);

    const [handovers, setHandovers] = useState(() =>
        loadStoredJson(STORAGE_KEY_HANDOVERS, INITIAL_THIRD_PARTY_HANDOVERS)
    );
    const [shippers, setShippers] = useState(() =>
        loadStoredJson(STORAGE_KEY_HUB_SHIPPERS, INITIAL_HUB_LOCAL_SHIPPERS)
    );
    const [manifestItems, setManifestItems] = useState(() =>
        loadStoredJson(STORAGE_KEY_MANIFEST_ITEMS, INITIAL_MANIFEST_ITEMS)
    );
    const [hubPolicies, setHubPolicies] = useState(INITIAL_HUB_POLICIES);
    const [rangeAssignments, setRangeAssignments] = useState(() =>
        loadStoredJson(STORAGE_KEY_TASK_RANGES, INITIAL_TASK_RANGE_BATCHES)
    );
    const [photoPodModalItem, setPhotoPodModalItem] = useState(null);
    const [zoomedPhotoItem, setZoomedPhotoItem] = useState(null);

    const [selectedShipperFilter, setSelectedShipperFilter] = useState('ALL');
    const [dispatchStatusFilter, setDispatchStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeletedManifest, setShowDeletedManifest] = useState(false);
    const [toast, setToast] = useState(null);
    const [syncingAction, setSyncingAction] = useState(null);

    // Two-way chat with container driver & CCADRO Messenger
    const [messengerOpen, setMessengerOpen] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);
    const [chatThreadsMap, setChatThreadsMap] = useState(() => loadChatThreadsMap());
    const [chatContainerCode, setChatContainerCode] = useState(null);
    const [chatDraft, setChatDraft] = useState('');
    const chatScrollRef = useRef(null);

    const showToast = useCallback((message) => {
        setToast({ message });
        setTimeout(() => setToast(null), 4200);
    }, []);

    const refreshHubEcosystem = useCallback(async () => {
        try {
            const [hubRes, handoverRes, shipperRes, itemRes, workspaceRes] = await Promise.all([
                Promise.resolve(api.getDistributionHubs?.()).catch(() => null),
                Promise.resolve(api.getShipperHandovers?.()).catch(() => null),
                Promise.resolve(api.getHubLocalShippers?.()).catch(() => null),
                Promise.resolve(api.getContainerManifestItems?.()).catch(() => null),
                Promise.resolve(
                    api.getHubShipperWorkspace?.({
                        username: user?.username,
                        hubCode: selectedHubCode
                    })
                ).catch(() => null)
            ]);

            const hubList = hubRes?.result ?? hubRes?.data;
            if (Array.isArray(hubList) && hubList.length > 0) {
                setHubs(hubList);
            }
            const handoverList = handoverRes?.result ?? handoverRes?.data;
            if (Array.isArray(handoverList) && handoverList.length > 0) {
                setHandovers((prev) => {
                    const merged = handoverList.map((dbItem) => {
                        const localMatch = prev.find((p) => p.containerCode === dbItem.containerCode) || {};
                        return { ...localMatch, ...dbItem };
                    });
                    saveStoredJson(STORAGE_KEY_HANDOVERS, merged);
                    return merged;
                });
            }
            const shipperList = shipperRes?.result ?? shipperRes?.data;
            if (Array.isArray(shipperList) && shipperList.length > 0) {
                setShippers(shipperList);
                saveStoredJson(STORAGE_KEY_HUB_SHIPPERS, shipperList);
            }
            const itemList = itemRes?.result ?? itemRes?.data;
            if (Array.isArray(itemList) && itemList.length > 0) {
                setManifestItems(itemList);
                saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, itemList);
            }
            const workspaceData = workspaceRes?.result ?? workspaceRes?.data;
            if (workspaceData?.policy) {
                setHubPolicies((prev) => ({
                    ...prev,
                    [workspaceData.policy.hubCode]: workspaceData.policy
                }));
            }
            if (Array.isArray(workspaceData?.rangeAssignments) && workspaceData.rangeAssignments.length > 0) {
                setRangeAssignments(workspaceData.rangeAssignments);
                saveStoredJson(STORAGE_KEY_TASK_RANGES, workspaceData.rangeAssignments);
            }
            if (workspaceData?.isolatedHubCode && strictHubIsolationEnforced) {
                setSelectedHubCode(workspaceData.isolatedHubCode);
            }
        } catch {
            // fallback to local seeded state
        }
    }, [selectedHubCode, strictHubIsolationEnforced, user?.username]);

    useEffect(() => {
        refreshHubEcosystem();
    }, [refreshHubEcosystem]);

    useEffect(() => {
        const unsub = subscribeDriverChat((nextMap) => {
            setChatThreadsMap({ ...nextMap });
        });
        return unsub;
    }, []);

    const currentNavMeta = useMemo(() => {
        for (const sec of SHIPPER_SIDEBAR_SECTIONS) {
            const found = sec.items.find((i) => i.id === activeTab);
            if (found) return found;
        }
        return SHIPPER_SIDEBAR_SECTIONS[0].items[0];
    }, [activeTab]);

    const activeHub = useMemo(
        () => hubs.find((h) => h.hubCode === selectedHubCode) || hubs[0],
        [hubs, selectedHubCode]
    );

    const hubHandovers = useMemo(() => {
        if (selectedHubCode === 'ALL') return handovers;
        return handovers.filter((h) => h.hubCode === selectedHubCode);
    }, [handovers, selectedHubCode]);

    const activeContainer = useMemo(
        () => hubHandovers[0] || handovers[0],
        [hubHandovers, handovers]
    );

    const hubShippers = useMemo(() => {
        if (selectedHubCode === 'ALL') return shippers;
        return shippers.filter((s) => s.hubCode === selectedHubCode);
    }, [shippers, selectedHubCode]);

    const activePolicy = useMemo(
        () => hubPolicies[activeHub?.hubCode] || hubPolicies['HUB-DINHBANG-BN'],
        [hubPolicies, activeHub]
    );

    const activeShipperProfile = useMemo(() => {
        if (isHubShipper && boundShipperDefault.shipperCode) {
            return (
                hubShippers.find((s) => s.shipperCode === boundShipperDefault.shipperCode) ||
                hubShippers[0] ||
                null
            );
        }
        if (selectedShipperFilter !== 'ALL') {
            return hubShippers.find((s) => s.shipperCode === selectedShipperFilter) || null;
        }
        if (strictHubIsolationEnforced) {
            return (
                hubShippers.find(
                    (s) =>
                        s.accountUsername === user?.username ||
                        s.shipperCode === boundShipperDefault.shipperCode
                ) ||
                hubShippers[0] ||
                null
            );
        }
        return hubShippers[0] || null;
    }, [
        hubShippers,
        selectedShipperFilter,
        strictHubIsolationEnforced,
        isHubShipper,
        user?.username,
        boundShipperDefault.shipperCode
    ]);

    // Compute live proximity table for each manifest item against all shippers in its Hub
    // When logged in as HUB_SHIPPER / SHIPPER, enforce strict shipper-level item scoping
    const handleSoftDeleteManifestItem = useCallback(
        (itemCode) => {
            const actor = user?.username || 'hub_manager';
            const deletedAt = new Date().toISOString();
            setManifestItems((prev) => {
                const updated = prev.map((it) =>
                    it.itemCode === itemCode ? { ...it, isDeleted: true, deletedAt, deletedBy: actor } : it
                );
                try {
                    window.localStorage.setItem(STORAGE_KEY_MANIFEST_ITEMS, JSON.stringify(updated));
                } catch {
                    // ignore
                }
                return updated;
            });
            api.softDeleteHubManifestItem(itemCode, actor).catch(() => { });
            showToast(`Đã xóa mềm kiện hàng ${itemCode} (chuyển vào Thùng rác).`);
        },
        [user?.username, showToast]
    );

    const handleRestoreManifestItem = useCallback(
        (itemCode) => {
            setManifestItems((prev) => {
                const updated = prev.map((it) =>
                    it.itemCode === itemCode ? { ...it, isDeleted: false, deletedAt: null, deletedBy: null } : it
                );
                try {
                    window.localStorage.setItem(STORAGE_KEY_MANIFEST_ITEMS, JSON.stringify(updated));
                } catch {
                    // ignore
                }
                return updated;
            });
            api.restoreHubManifestItem(itemCode).catch(() => { });
            showToast(`Đã khôi phục kiện hàng ${itemCode} về danh sách giao nhận.`);
        },
        [showToast]
    );

    const scopedManifestItemsBase = useMemo(() => {
        return manifestItems.filter((item) => {
            if (selectedHubCode !== 'ALL' && item.hubCode !== selectedHubCode) return false;
            if (isHubShipper && boundShipperDefault.shipperCode) {
                if (item.assignedShipperCode !== boundShipperDefault.shipperCode) return false;
            }
            if (selectedShipperFilter !== 'ALL' && item.assignedShipperCode !== selectedShipperFilter) {
                return false;
            }
            if (dispatchStatusFilter !== 'ALL' && item.dispatchStatus !== dispatchStatusFilter) {
                return false;
            }
            return true;
        });
    }, [
        manifestItems,
        selectedHubCode,
        isHubShipper,
        boundShipperDefault.shipperCode,
        selectedShipperFilter,
        dispatchStatusFilter
    ]);

    const deletedManifestCount = useMemo(
        () => scopedManifestItemsBase.filter((item) => Boolean(item.isDeleted)).length,
        [scopedManifestItemsBase]
    );

    const activeOrDeletedManifestItems = useMemo(
        () =>
            scopedManifestItemsBase.filter((item) =>
                showDeletedManifest ? Boolean(item.isDeleted) : !item.isDeleted
            ),
        [scopedManifestItemsBase, showDeletedManifest]
    );

    const elasticManifestResult = useMemo(
        () =>
            elasticSearchMatch(activeOrDeletedManifestItems, searchQuery, [
                'itemCode',
                'cargoName',
                'consigneeName',
                'senderName',
                'deliveryZoneName',
                'deliveryAddress',
                'assignedShipperName',
                'assignedShipperCode'
            ]),
        [activeOrDeletedManifestItems, searchQuery]
    );

    const enrichedManifestItems = useMemo(() => {
        return elasticManifestResult.items.map((rawItem) => {
            const item = enrichSenderMetadata(rawItem);
            const sameHubShippers = shippers.filter((s) => s.hubCode === item.hubCode);
            const shipperCandidates = sameHubShippers
                .map((s) => {
                    const distanceKm = calculateHaversineKm(
                        item.deliveryLat,
                        item.deliveryLng,
                        s.assignedLat,
                        s.assignedLng
                    );
                    const inZone = distanceKm <= (s.coverageRadiusKm || 2.5);
                    const coldOk = !item.requiresColdChain || Boolean(s.coldChainCapable);
                    return {
                        ...s,
                        distanceKm: Math.round(distanceKm * 100) / 100,
                        inZone,
                        coldOk
                    };
                })
                .sort((a, b) => {
                    if (a.coldOk !== b.coldOk) return a.coldOk ? -1 : 1;
                    return a.distanceKm - b.distanceKm;
                });

            return {
                ...item,
                trackingTimeline: parseTrackingTimeline(item),
                shipperCandidates,
                recommendedShipper: shipperCandidates[0] || null
            };
        });
    }, [
        elasticManifestResult.items,
        shippers
    ]);

    const kpiStats = useMemo(() => {
        const scopeItems = manifestItems.filter((i) => {
            if (selectedHubCode !== 'ALL' && i.hubCode !== selectedHubCode) return false;
            if (isHubShipper && boundShipperDefault.shipperCode) {
                return i.assignedShipperCode === boundShipperDefault.shipperCode;
            }
            return true;
        });
        const inContainerCount = scopeItems.filter((i) => i.dispatchStatus === 'IN_CONTAINER').length;
        const syncedToHubCount = scopeItems.filter((i) => i.dispatchStatus === 'SYNCED_TO_HUB').length;
        const assignedOrOutCount = scopeItems.filter(
            (i) => i.dispatchStatus === 'ASSIGNED_TO_SHIPPER' || i.dispatchStatus === 'OUT_FOR_DELIVERY'
        ).length;
        const deliveredCount = scopeItems.filter((i) => i.dispatchStatus === 'DELIVERED_POD').length;
        return {
            totalItems: scopeItems.length,
            inContainerCount,
            syncedToHubCount,
            assignedOrOutCount,
            deliveredCount
        };
    }, [manifestItems, selectedHubCode, isHubShipper, boundShipperDefault.shipperCode]);

    // Step 1: Send Container Cargo Manifest Data to the Hub System
    const handleIngestManifestToHub = async (containerCode) => {
        if (!containerCode) return;
        setSyncingAction(`INGEST_${containerCode}`);
        try {
            const res = await Promise.resolve(api.ingestContainerManifest?.(containerCode)).catch(
                () => null
            );
            const nowIso = new Date().toISOString();

            setManifestItems((prev) => {
                const next = prev.map((item) => {
                    if (item.containerCode !== containerCode) return item;
                    const ingestedItems = res?.result ?? res?.data;
                    const dbMatch = Array.isArray(ingestedItems)
                        ? ingestedItems.find((d) => d.itemCode === item.itemCode)
                        : null;
                    if (dbMatch) return dbMatch;
                    return {
                        ...item,
                        dispatchStatus:
                            item.dispatchStatus === 'IN_CONTAINER' ? 'SYNCED_TO_HUB' : item.dispatchStatus
                    };
                });
                saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);
                return next;
            });

            setHandovers((prev) => {
                const next = prev.map((h) =>
                    h.containerCode === containerCode
                        ? {
                            ...h,
                            manifestIngested: true,
                            manifestIngestedAt: nowIso,
                            handoverStatus:
                                h.handoverStatus === 'AWAITING_ARRIVAL' ? 'AT_GATE_DOCKED' : h.handoverStatus,
                            lastSyncStatus: 'MANIFEST_INGESTED',
                            lastSyncPayload: JSON.stringify({
                                event: 'CONTAINER_MANIFEST_INGESTED_TO_HUB',
                                containerCode,
                                hubCode: h.hubCode,
                                itemCount: 3,
                                syncedAt: nowIso
                            }),
                            lastSyncedAt: nowIso
                        }
                        : h
                );
                saveStoredJson(STORAGE_KEY_HANDOVERS, next);
                return next;
            });

            showToast(
                `Đã gửi dữ liệu các món hàng từ Container ${containerCode} sang hệ thống ${activeHub?.hubName}!`
            );
        } finally {
            setSyncingAction(null);
        }
    };

    // Step 2: Geo-Proximity Auto-Dispatch to Local Shippers in the Hub
    const handleAutoDispatchByProximity = async (hubCode, containerCode) => {
        setSyncingAction(`DISPATCH_${hubCode || containerCode}`);
        try {
            const res = await Promise.resolve(
                api.autoDispatchByProximity?.({ hubCode, containerCode })
            ).catch(() => null);
            const nowIso = new Date().toISOString();

            setManifestItems((prev) => {
                const next = prev.map((item) => {
                    const inScope =
                        (containerCode && item.containerCode === containerCode) ||
                        (!containerCode && (!hubCode || hubCode === 'ALL' || item.hubCode === hubCode));
                    if (!inScope) return item;
                    if (
                        item.dispatchStatus === 'DELIVERED_POD' ||
                        item.dispatchStatus === 'OUT_FOR_DELIVERY'
                    ) {
                        return item;
                    }

                    const ingestedItems = res?.result ?? res?.data;
                    const dbMatch = Array.isArray(ingestedItems)
                        ? ingestedItems.find((d) => d.itemCode === item.itemCode)
                        : null;
                    if (dbMatch && dbMatch.assignedShipperCode) return dbMatch;

                    // Local deterministic Haversine proximity computation
                    const candidateShippers = shippers.filter((s) => s.hubCode === item.hubCode);
                    const eligible = candidateShippers.filter(
                        (s) => !item.requiresColdChain || Boolean(s.coldChainCapable)
                    );
                    const pool = eligible.length > 0 ? eligible : candidateShippers;
                    let best = pool[0];
                    let minKm = Infinity;
                    pool.forEach((s) => {
                        const dist = calculateHaversineKm(
                            item.deliveryLat,
                            item.deliveryLng,
                            s.assignedLat,
                            s.assignedLng
                        );
                        if (dist < minKm) {
                            minKm = dist;
                            best = s;
                        }
                    });

                    if (!best) return item;
                    const roundedKm = Math.round(minKm * 100) / 100;
                    const score = Math.min(99.8, Math.round((99.5 - roundedKm * 8.5 + 1.2) * 10) / 10);
                    return {
                        ...item,
                        dispatchStatus: 'ASSIGNED_TO_SHIPPER',
                        assignedShipperCode: best.shipperCode,
                        assignedShipperName: best.fullName,
                        proximityDistanceKm: roundedKm,
                        matchScore: score,
                        dispatchReason: `Gần vị trí phân công nhất (${roundedKm.toFixed(2)} km) • ${best.assignedZoneName} • ${item.requiresColdChain ? 'Đạt chuẩn Xe bảo ôn lạnh' : 'Khớp tải trọng tuyến nội khu'
                            }`,
                        assignedAt: nowIso
                    };
                });
                saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);
                return next;
            });

            if (containerCode) {
                setHandovers((prev) => {
                    const next = prev.map((h) =>
                        h.containerCode === containerCode
                            ? {
                                ...h,
                                manifestIngested: true,
                                handoverStatus:
                                    h.handoverStatus === 'AWAITING_ARRIVAL' ? 'AT_GATE_DOCKED' : h.handoverStatus,
                                lastSyncStatus: 'AUTO_DISPATCHED_BY_PROXIMITY',
                                lastSyncedAt: nowIso
                            }
                            : h
                    );
                    saveStoredJson(STORAGE_KEY_HANDOVERS, next);
                    return next;
                });
            }

            showToast(
                'Đã tự động phân công từng món hàng cho các Shipper có vị trí phân công gần điểm giao nhất!'
            );
        } finally {
            setSyncingAction(null);
        }
    };

    // Manual reassign to a specific shipper in the Hub
    const handleManualAssignShipper = async (item, shipperCode) => {
        const targetShipper = shippers.find((s) => s.shipperCode === shipperCode);
        if (!targetShipper) return;

        await Promise.resolve(api.assignManifestItemToShipper?.(item.itemCode, shipperCode)).catch(
            () => null
        );
        const distKm =
            Math.round(
                calculateHaversineKm(
                    item.deliveryLat,
                    item.deliveryLng,
                    targetShipper.assignedLat,
                    targetShipper.assignedLng
                ) * 100
            ) / 100;

        setManifestItems((prev) => {
            const next = prev.map((m) =>
                m.itemCode === item.itemCode
                    ? {
                        ...m,
                        dispatchStatus: 'ASSIGNED_TO_SHIPPER',
                        assignedShipperCode: targetShipper.shipperCode,
                        assignedShipperName: targetShipper.fullName,
                        proximityDistanceKm: distKm,
                        matchScore: Math.max(70, Math.round((99.2 - distKm * 8.5) * 10) / 10),
                        dispatchReason: `Điều phối theo vị trí (${distKm.toFixed(2)} km tới chốt ${targetShipper.assignedZoneName})`
                    }
                    : m
            );
            saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);
            return next;
        });

        showToast(
            `Đã phân công kiện ${item.itemCode} cho Shipper ${targetShipper.fullName} (cách vị trí phân công ${distKm.toFixed(2)} km)`
        );
    };

    // Step 3: Shipper Last-Mile Status Progression
    const handleUpdateItemStatus = async (item, nextStatus) => {
        const podName =
            nextStatus === 'DELIVERED_POD' ? `${item.consigneeName} (Ký nhận POD)` : undefined;
        await Promise.resolve(
            api.updateManifestItemStatus?.(item.itemCode, nextStatus, podName)
        ).catch(() => null);

        setManifestItems((prev) => {
            const next = prev.map((m) =>
                m.itemCode === item.itemCode
                    ? {
                        ...m,
                        dispatchStatus: nextStatus,
                        recipientPodName: podName || m.recipientPodName,
                        deliveredAt: nextStatus === 'DELIVERED_POD' ? new Date().toISOString() : m.deliveredAt
                    }
                    : m
            );
            saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);

            const containerItems = next.filter((i) => i.containerCode === item.containerCode);
            if (
                containerItems.length > 0 &&
                containerItems.every((i) => i.dispatchStatus === 'DELIVERED_POD')
            ) {
                setHandovers((hPrev) => {
                    const hNext = hPrev.map((h) =>
                        h.containerCode === item.containerCode
                            ? {
                                ...h,
                                handoverStatus: 'SYNCED_3PL',
                                lastSyncStatus: 'SYNCED_3PL',
                                epodSignedBy: `Trụ sở ${h.hubCode} (Hoàn tất 100% kiện hàng Last-Mile)`
                            }
                            : h
                    );
                    saveStoredJson(STORAGE_KEY_HANDOVERS, hNext);
                    return hNext;
                });
            }

            return next;
        });

        showToast(
            nextStatus === 'DELIVERED_POD'
                ? `Shipper ${item.assignedShipperName || ''} đã giao hoàn tất kiện ${item.itemCode} & ký POD!`
                : `Shipper ${item.assignedShipperName || ''} đã xuất phát giao kiện ${item.itemCode}!`
        );
    };

    // Hub-shipper-service (:8089): Assign Task by Item Code Range (fromItemCode -> toItemCode)
    const handleAssignCodeRange = async ({ hubCode, shipperCode, fromItemCode, toItemCode }) => {
        const shipper = shippers.find((s) => s.shipperCode === shipperCode && s.hubCode === hubCode);
        if (!shipper) {
            showToast(`Lỗi cô lập Trụ sở: Shipper ${shipperCode} không thuộc Trụ sở ${hubCode}.`);
            return;
        }

        const res = await Promise.resolve(
            api.assignHubTaskRange?.({
                hubCode,
                shipperCode,
                fromItemCode,
                toItemCode,
                assignedBy: user?.username || 'HUB_SUPERVISOR'
            })
        ).catch(() => null);

        const matchedItems = manifestItems.filter(
            (m) =>
                m.hubCode === hubCode &&
                m.itemCode.localeCompare(fromItemCode) >= 0 &&
                m.itemCode.localeCompare(toItemCode) <= 0
        );
        const totalWeightKg = matchedItems.reduce((acc, m) => acc + (Number(m.weightKg) || 0), 0);
        const nowIso = new Date().toISOString();

        setManifestItems((prev) => {
            const next = prev.map((m) => {
                if (
                    m.hubCode === hubCode &&
                    m.itemCode.localeCompare(fromItemCode) >= 0 &&
                    m.itemCode.localeCompare(toItemCode) <= 0
                ) {
                    const distKm =
                        Math.round(
                            calculateHaversineKm(
                                m.deliveryLat,
                                m.deliveryLng,
                                shipper.assignedLat,
                                shipper.assignedLng
                            ) * 100
                        ) / 100;
                    const prevTimeline = parseTrackingTimeline(m);
                    return {
                        ...m,
                        dispatchStatus:
                            m.dispatchStatus === 'DELIVERED_POD' ? 'DELIVERED_POD' : 'ASSIGNED_TO_SHIPPER',
                        assignedShipperCode: shipper.shipperCode,
                        assignedShipperName: shipper.fullName,
                        proximityDistanceKm: distKm,
                        dispatchReason: `Giao theo dải mã ${fromItemCode} → ${toItemCode} • Phạm vi: ${shipper.todayDeliveryScope || shipper.assignedZoneName}`,
                        trackingHistoryJson: JSON.stringify([
                            ...prevTimeline,
                            {
                                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                status: 'ASSIGNED_TO_SHIPPER',
                                note: `Giao dải mã ${fromItemCode} → ${toItemCode} cho ${shipper.fullName}`
                            }
                        ])
                    };
                }
                return m;
            });
            saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);
            return next;
        });

        const rangeData = res?.result ?? res?.data;
        const createdBatch = rangeData || {
            id: `range-${Date.now()}`,
            batchCode: `BATCH-${hubCode.replace('HUB-', '')}-${String(rangeAssignments.length + 1).padStart(2, '0')}`,
            hubCode,
            shipperCode: shipper.shipperCode,
            shipperName: shipper.fullName,
            fromItemCode,
            toItemCode,
            totalItems: matchedItems.length,
            totalWeightKg: Math.round(totalWeightKg * 10) / 10,
            assignedZoneScope: shipper.todayDeliveryScope || shipper.assignedZoneName,
            batchStatus: 'ACTIVE_IN_SHIFT',
            assignedBy: user?.username || 'HUB_SUPERVISOR',
            assignedAt: nowIso
        };

        setRangeAssignments((prev) => {
            const next = [createdBatch, ...prev];
            saveStoredJson(STORAGE_KEY_TASK_RANGES, next);
            return next;
        });

        setShippers((prev) => {
            const next = prev.map((s) =>
                s.shipperCode === shipper.shipperCode
                    ? { ...s, assignedCodeRangeFrom: fromItemCode, assignedCodeRangeTo: toItemCode }
                    : s
            );
            saveStoredJson(STORAGE_KEY_HUB_SHIPPERS, next);
            return next;
        });

        showToast(
            `Đã giao dải mã ${fromItemCode} → ${toItemCode} (${matchedItems.length} kiện) cho Shipper ${shipper.fullName}`
        );
    };

    // Hub-shipper-service (:8089): Submit Item Tracking & Mandatory Photo POD
    const handleConfirmPhotoPod = async ({
        itemCode,
        dispatchStatus,
        proofImageUrl,
        proofImageCaption,
        recipientPodName
    }) => {
        const res = await Promise.resolve(
            api.submitItemPhotoPod?.(itemCode, {
                dispatchStatus,
                proofImageUrl,
                proofImageCaption,
                recipientPodName
            })
        ).catch(() => null);

        const podUpdated = res?.result ?? res?.data;
        const nowIso = new Date().toISOString();
        setManifestItems((prev) => {
            const next = prev.map((m) => {
                if (m.itemCode !== itemCode) return m;
                if (podUpdated?.itemCode) return podUpdated;
                const timeline = parseTrackingTimeline(m);
                return {
                    ...m,
                    dispatchStatus,
                    proofImageUrl,
                    proofImageCaption,
                    proofUploadedAt: nowIso,
                    deliveredAt: nowIso,
                    recipientPodName,
                    trackingHistoryJson: JSON.stringify([
                        ...timeline,
                        {
                            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            status: 'DELIVERED_POD',
                            note: `Hoàn tất giao hàng kèm ảnh POD • ${recipientPodName}`
                        }
                    ])
                };
            });
            saveStoredJson(STORAGE_KEY_MANIFEST_ITEMS, next);
            return next;
        });

        setPhotoPodModalItem(null);
        showToast(`Đã lưu Ảnh xác thực POD & hoàn tất giao kiện ${itemCode}!`);
    };

    // Container Driver Chat helpers
    const activeChatHandover = useMemo(
        () => handovers.find((h) => h.containerCode === chatContainerCode) || null,
        [handovers, chatContainerCode]
    );

    const activeChatMessages = useMemo(() => {
        if (!chatContainerCode) return [];
        return chatThreadsMap[chatContainerCode] || [];
    }, [chatThreadsMap, chatContainerCode]);

    const openDriverChat = useCallback(async (handover) => {
        setChatContainerCode(handover.containerCode);
        markChatThreadRead(handover.containerCode, 'CUSTOMER');
        setChatThreadsMap(loadChatThreadsMap());
        if (handover.driverCode) {
            await syncChatThreadFromDb(handover.containerCode, handover.driverCode);
            setChatThreadsMap(loadChatThreadsMap());
        }
    }, []);

    const handleSendDriverChat = async (e) => {
        e?.preventDefault();
        if (!chatDraft.trim() || !activeChatHandover) return;
        const text = chatDraft.trim();
        setChatDraft('');
        await sendGrabChatMessage(activeChatHandover.containerCode, {
            senderRole: 'CUSTOMER',
            senderName: `${activeHub?.hubName || 'Trụ sở Giao nhận'} (${user?.username || 'shipper'})`,
            driverCode: activeChatHandover.driverCode,
            text
        });
        setChatThreadsMap(loadChatThreadsMap());
    };

    const handleSignOut = async () => {
        await logout();
        navigate('/login');
    };

    // Theme tokens matching CustomerPortalPage.jsx exactly
    const cardBg = isDark ? 'rgba(11, 25, 20, 0.92)' : '#ffffff';
    const cardBorder = isDark
        ? '1px solid rgba(110, 231, 183, 0.16)'
        : '1px solid rgba(15, 23, 42, 0.09)';
    const subtleBg = isDark ? 'rgba(15, 23, 42, 0.58)' : '#f8fafc';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark ? '#94a3b8' : '#64748b';

    return (
        <div
            className="lp-root app-container"
            style={{
                background: isDark ? '#040f0c' : '#f1f7f4',
                color: textPrimary,
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}
        >
            {/* ══════════════════════════════════════════════════════════════════
          1. COLLAPSIBLE SIDEBAR (ĐỒNG BỘ CHUẨN ADMIN & MOBILE DRAWER)
      ══════════════════════════════════════════════════════════════════ */}
            <aside
                className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
                style={{
                    background: isDark ? '#061611' : '#ffffff',
                    borderRight: isDark
                        ? '1px solid rgba(110, 231, 183, 0.14)'
                        : '1px solid rgba(15, 23, 42, 0.08)'
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
                                title="CCADRO 3PL"
                                subtitle="HỆ THỐNG TRỤ SỞ & SHIPPER"
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

                    {/* Active Hub Workspace Badge */}
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
                                ● TRỤ SỞ ĐANG TRỰC: {activeHub?.hubCode}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    marginTop: 2,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {activeHub?.shortName || activeHub?.hubName}
                            </div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.72, marginTop: 2 }}>
                                Tài khoản: <code>@{user?.username || 'shipper'}</code>
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
                        >
                            HUB
                        </div>
                    )}
                </div>

                {/* Sidebar Scrollable Navigation */}
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
                    {SHIPPER_SIDEBAR_SECTIONS.map((section) => (
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
                                {section.items
                                    .filter((item) => !item.allowedRoles || item.allowedRoles.includes(userRole))
                                    .map((item) => {
                                        const Icon = item.icon;
                                        const active = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => selectShipperTab(item.id)}
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
                                                        {item.id === 'dispatch' && (
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
                                                                {kpiStats.totalItems} kiện
                                                            </span>
                                                        )}
                                                        {item.id === 'shippers' && (
                                                            <span
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 800,
                                                                    padding: '1px 7px',
                                                                    borderRadius: 999,
                                                                    background: 'rgba(2, 132, 199, 0.16)',
                                                                    color: '#0284c7'
                                                                }}
                                                            >
                                                                {hubShippers.length} người
                                                            </span>
                                                        )}
                                                        {item.id === 'containers' && (
                                                            <span
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 800,
                                                                    padding: '1px 7px',
                                                                    borderRadius: 999,
                                                                    background: 'rgba(245, 158, 11, 0.18)',
                                                                    color: '#d97706'
                                                                }}
                                                            >
                                                                {hubHandovers.length} cont
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
                                                                {hubs.length} HUB
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

                    {/* Quick Hub Switcher inside Sidebar */}
                    {!isSidebarCollapsed && (
                        <div style={{ marginTop: 4 }}>
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
                                CHUYỂN TRỤ SỞ LÀM VIỆC
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {hubs.map((hub) => {
                                    const isCurrent = selectedHubCode === hub.hubCode;
                                    return (
                                        <button
                                            key={hub.hubCode}
                                            type="button"
                                            onClick={() => {
                                                setSelectedHubCode(hub.hubCode);
                                                setSelectedShipperFilter('ALL');
                                            }}
                                            style={{
                                                padding: '8px 11px',
                                                borderRadius: 10,
                                                border: isCurrent
                                                    ? '1px solid rgba(16, 185, 129, 0.45)'
                                                    : '1px solid transparent',
                                                background: isCurrent ? subtleBg : 'transparent',
                                                color: isCurrent ? '#10b981' : textPrimary,
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                fontSize: '0.77rem',
                                                fontWeight: isCurrent ? 800 : 600
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{hub.hubCode}</span>
                                                {isCurrent && <span>●</span>}
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
                                                {hub.districtZone}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Bottom Summary & Account Card */}
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
                                <span style={{ opacity: 0.75 }}>Kết nối Hệ thống Trụ sở:</span>
                                <strong style={{ color: '#10b981' }}>● Real-time</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.75 }}>Shipper đang trực:</span>
                                <strong>{hubShippers.length} Shipper</strong>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{ textAlign: 'center', fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}
                        >
                            ● LIVE
                        </div>
                    )}

                    <SidebarAccountCard collapsed={isSidebarCollapsed} onAfterLogout={handleSignOut} />
                </div>
            </aside>

            {!isSidebarCollapsed && (
                <button
                    type="button"
                    className="mobile-sidebar-backdrop"
                    aria-label="Đóng menu"
                    onClick={() => setIsSidebarCollapsed(true)}
                />
            )}

            {/* ══════════════════════════════════════════════════════════════════
          2. MAIN WORKSPACE (2-TIER HEADER + TAB VIEWS)
      ══════════════════════════════════════════════════════════════════ */}
            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
                <div className="ambient-gradient-mesh" />
                {/* 2-Tier Sticky Header matching CustomerPortalPage */}
                <header
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        background: isDark ? 'rgba(4, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderBottom: isDark
                            ? '1px solid rgba(16, 185, 129, 0.16)'
                            : '1px solid rgba(15, 23, 42, 0.08)',
                        boxShadow: isDark
                            ? '0 8px 24px rgba(0, 0, 0, 0.35)'
                            : '0 2px 12px rgba(15, 23, 42, 0.04)'
                    }}
                >
                    {/* Tier 1: Primary Command Strip */}
                    <div
                        className="topbar"
                        style={{
                            height: 62,
                            minHeight: 62,
                            position: 'static',
                            background: 'transparent',
                            backdropFilter: 'none',
                            borderBottom: 'none'
                        }}
                    >
                        {/* Left: Sidebar Toggle + Breadcrumb & Page Title */}
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
                                    <span style={{ color: getRoleHeaderMeta(userRole).accentColor }}>
                                        {getRoleHeaderMeta(userRole).shortBadge}
                                    </span>
                                    <span style={{ opacity: 0.45 }}>/</span>
                                    <span>{activeHub?.hubCode}</span>
                                    <span style={{ opacity: 0.45 }}>/</span>
                                    <span style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                                        {currentNavMeta.shortLabel}
                                    </span>
                                </div>
                                <h1
                                    className="topbar-title"
                                    title={`${currentNavMeta.label} — ${activeHub?.shortName || activeHub?.hubName}`}
                                >
                                    {currentNavMeta.label} — {activeHub?.shortName || activeHub?.hubName}
                                </h1>
                            </div>
                        </div>

                        {/* Right: Immutable RBAC Scope Badge + Hub Selector Pills + Sync + Messenger + Theme + Settings */}
                        <div className="topbar-actions">
                            <span
                                data-testid="hub-rbac-scope-badge"
                                className="topbar-status-pill"
                                style={{
                                    borderColor: strictHubIsolationEnforced
                                        ? 'rgba(5, 150, 105, 0.55)'
                                        : 'var(--border-color)',
                                    background: isReadOnlyAuditor
                                        ? 'rgba(245, 158, 11, 0.14)'
                                        : strictHubIsolationEnforced
                                            ? 'rgba(16, 185, 129, 0.14)'
                                            : subtleBg,
                                    color: isReadOnlyAuditor
                                        ? '#d97706'
                                        : strictHubIsolationEnforced
                                            ? '#059669'
                                            : textPrimary
                                }}
                            >
                                <Lock size={13} />
                                {isReadOnlyAuditor
                                    ? `CHỈ ĐỌC (AUDITOR) • ${selectedHubCode}`
                                    : strictHubIsolationEnforced
                                        ? `RBAC ${userRole} • ${selectedHubCode}${boundShipperDefault.shipperCode ? ` • ${boundShipperDefault.shipperCode}` : ''}`
                                        : `QUẢN TRỊ TOÀN HUB (${userRole})`}
                            </span>

                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: 3,
                                    borderRadius: 10,
                                    background: subtleBg,
                                    border: cardBorder,
                                    flexShrink: 0
                                }}
                            >
                                {hubs
                                    .filter((h) => !strictHubIsolationEnforced || h.hubCode === selectedHubCode)
                                    .map((hub) => {
                                        const active = selectedHubCode === hub.hubCode;
                                        return (
                                            <button
                                                key={hub.hubCode}
                                                type="button"
                                                data-testid={`hub-pill-${hub.hubCode}`}
                                                onClick={() => {
                                                    if (strictHubIsolationEnforced) return;
                                                    setSelectedHubCode(hub.hubCode);
                                                    setSelectedShipperFilter('ALL');
                                                }}
                                                style={{
                                                    padding: '5px 9px',
                                                    borderRadius: 7,
                                                    border: 'none',
                                                    background: active
                                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                                        : 'transparent',
                                                    color: active ? '#ffffff' : textMuted,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    whiteSpace: 'nowrap',
                                                    cursor: strictHubIsolationEnforced ? 'default' : 'pointer'
                                                }}
                                            >
                                                {hub.hubCode.replace('HUB-', '')}
                                            </button>
                                        );
                                    })}
                            </div>

                            <button
                                type="button"
                                className="topbar-btn"
                                onClick={refreshHubEcosystem}
                                title="Đồng bộ dữ liệu Trụ sở"
                            >
                                <RefreshCw size={14} />
                                <span className="topbar-label topbar-label-compact">Đồng bộ</span>
                            </button>

                            <button
                                type="button"
                                className="topbar-btn topbar-btn-messenger"
                                onClick={() => setMessengerOpen(true)}
                                title="Mở CCADRO Messenger (Chat đa người & nhóm)"
                            >
                                <MessageCircle size={15} />
                                <span className="topbar-label">Messenger</span>
                                {getUnreadCountForViewer(chatThreadsMap, userRole) > 0 && (
                                    <span className="topbar-count-pill">
                                        {getUnreadCountForViewer(chatThreadsMap, userRole)}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                className="topbar-btn topbar-btn-icon"
                                onClick={toggleTheme}
                                title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                                aria-label="Đổi giao diện Sáng / Tối"
                            >
                                {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
                            </button>

                            <button
                                type="button"
                                data-testid="topbar-quick-settings"
                                className="topbar-btn topbar-btn-icon"
                                onClick={() => setOpenSettings(true)}
                                title="Cài đặt Trụ sở, Geofence GPS & Tài khoản"
                                aria-label="Cài đặt tài khoản & nghiệp vụ"
                            >
                                <Settings size={15} />
                            </button>

                            <span className="topbar-divider" aria-hidden="true" />

                            <UserAccountMenu variant="portal" compact />
                        </div>
                    </div>

                    {/* Tier 2: Contextual Navigation Tabs & Quick Pipeline Actions */}
                    <div
                        className="portal-subnav"
                        style={{
                            minHeight: 46,
                            borderTop: isDark
                                ? '1px solid rgba(255, 255, 255, 0.05)'
                                : '1px solid rgba(15, 23, 42, 0.05)',
                            flexWrap: 'wrap'
                        }}
                    >
                        {/* Navigation Tab Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {SHIPPER_SIDEBAR_SECTIONS.flatMap((s) => s.items)
                                .filter((item) => !item.allowedRoles || item.allowedRoles.includes(userRole))
                                .map((item) => {
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
                                                padding: '6px 13px',
                                                borderRadius: 9,
                                                border: active
                                                    ? '1px solid rgba(16, 185, 129, 0.45)'
                                                    : '1px solid transparent',
                                                background: active ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                                                color: active ? '#059669' : textMuted,
                                                fontSize: '0.78rem',
                                                fontWeight: active ? 800 : 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Icon size={14} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* 2-Step Pipeline CTA Buttons restricted to HUB_MANAGER / ADMIN */}
                        {activeContainer && canIngestAndDispatch && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    data-testid="btn-ingest-manifest"
                                    disabled={syncingAction === `INGEST_${activeContainer.containerCode}`}
                                    onClick={() => handleIngestManifestToHub(activeContainer.containerCode)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 12px',
                                        borderRadius: 9,
                                        border: '1px solid rgba(217, 119, 6, 0.4)',
                                        background: 'rgba(245, 158, 11, 0.13)',
                                        color: isDark ? '#fbbf24' : '#b45309',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Webhook size={13} />
                                    1. Nhận dữ liệu Hàng hóa từ Container ({activeContainer.containerCode})
                                </button>

                                <button
                                    type="button"
                                    data-testid="btn-auto-dispatch-proximity"
                                    disabled={
                                        syncingAction ===
                                        `DISPATCH_${activeHub?.hubCode || activeContainer.containerCode}`
                                    }
                                    onClick={() =>
                                        handleAutoDispatchByProximity(
                                            activeHub?.hubCode,
                                            activeContainer.containerCode
                                        )
                                    }
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 14px',
                                        borderRadius: 9,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#ffffff',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                                    }}
                                >
                                    <Sparkles size={13} />
                                    2. Tự động chia đơn cho Shipper gần vị trí nhất
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {toast && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            zIndex: 90,
                            padding: '13px 20px',
                            borderRadius: 12,
                            background: '#059669',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            boxShadow: '0 14px 34px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9
                        }}
                    >
                        <CheckCircle2 size={17} />
                        {toast.message}
                    </div>
                )}

                {/* ── MAIN CONTENT CONTAINER ── */}
                <main className="page-body" style={{ maxWidth: 1480, width: '100%', margin: '0 auto', position: 'relative' }}>
                    {/* Active Hub Context Banner + Bento 4 KPI Cards (Same clean rhythm as CustomerPortalPage) */}
                    {activeHub && (
                        <div
                            style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: 16,
                                padding: '16px 20px',
                                marginBottom: 18,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 14,
                                boxShadow: isDark
                                    ? '0 8px 24px rgba(0,0,0,0.25)'
                                    : '0 2px 10px rgba(15, 23, 42, 0.04)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(16, 185, 129, 0.14)',
                                        color: '#059669',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{activeHub.hubName}</span>
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '2px 9px',
                                                borderRadius: 999,
                                                background: 'rgba(16, 185, 129, 0.14)',
                                                color: '#059669'
                                            }}
                                        >
                                            {activeHub.externalSystemName}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: 3 }}>
                                        {activeHub.address} • Tọa độ tâm: ({activeHub.centerLat.toFixed(4)},{' '}
                                        {activeHub.centerLng.toFixed(4)}) • Bán kính phủ:{' '}
                                        <strong>{activeHub.coverageRadiusKm} km</strong>
                                    </div>
                                </div>
                            </div>

                            {activeContainer && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '8px 14px',
                                        borderRadius: 12,
                                        background: subtleBg,
                                        border: cardBorder
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>
                                            CONTAINER ĐANG CẬP TRỤ SỞ
                                        </div>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                                            {activeContainer.containerCode} • {activeContainer.dockGate}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openDriverChat(activeContainer)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '7px 12px',
                                            borderRadius: 9,
                                            border: '1px solid rgba(16, 185, 129, 0.35)',
                                            background: 'rgba(16, 185, 129, 0.12)',
                                            color: '#059669',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <MessageSquare size={13} />
                                        Chat Tài xế ({activeContainer.driverName})
                                        {getUnreadCountForViewer(
                                            chatThreadsMap,
                                            activeContainer.containerCode,
                                            'CUSTOMER'
                                        ) > 0 && (
                                                <span
                                                    style={{
                                                        padding: '1px 6px',
                                                        borderRadius: 999,
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        fontSize: 10
                                                    }}
                                                >
                                                    {getUnreadCountForViewer(
                                                        chatThreadsMap,
                                                        activeContainer.containerCode,
                                                        'CUSTOMER'
                                                    )}
                                                </span>
                                            )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hub Isolation Policy + Today Delivery Scope Quick Bar */}
                    {activeHub && activePolicy && (
                        <div
                            data-testid="hub-scope-policy-bar"
                            style={{
                                background: isDark ? 'rgba(6, 78, 59, 0.22)' : 'rgba(16, 185, 129, 0.06)',
                                border: '1px solid rgba(16, 185, 129, 0.28)',
                                borderRadius: 14,
                                padding: '12px 18px',
                                marginBottom: 18,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 12
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 420px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                                        {strictHubIsolationEnforced ? '🔒 CÔ LẬP DỮ LIỆU TRỤ SỞ' : '📋 PHẠM VI & CHÍNH SÁCH SHIPPER'} •{' '}
                                        {activePolicy.policyCode}
                                    </span>
                                    {activeShipperProfile?.assignedCodeRangeFrom && (
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                background: 'rgba(2, 132, 199, 0.14)',
                                                color: '#0284c7'
                                            }}
                                        >
                                            Dải mã hôm nay: {activeShipperProfile.assignedCodeRangeFrom} →{' '}
                                            {activeShipperProfile.assignedCodeRangeTo || activeShipperProfile.assignedCodeRangeFrom}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: textPrimary }}>
                                    Phạm vi giao hôm nay:{' '}
                                    {activeShipperProfile?.todayDeliveryScope || activeHub.districtZone}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: textMuted }}>
                                    {activePolicy.photoPodRule}
                                </div>
                            </div>

                            <button
                                type="button"
                                data-testid="btn-open-policy-tab"
                                onClick={() => setActiveTab('policy')}
                                style={{
                                    padding: '8px 13px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(5, 150, 105, 0.4)',
                                    background: cardBg,
                                    color: '#059669',
                                    fontSize: '0.76rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexShrink: 0
                                }}
                            >
                                <ClipboardList size={14} /> Chính sách & Giao dải mã ({rangeAssignments.filter((r) => r.hubCode === activeHub.hubCode).length})
                            </button>
                        </div>
                    )}

                    {/* 4 Bento KPI Cards */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 14,
                            marginBottom: 20
                        }}
                    >
                        {[
                            {
                                label: 'Tổng kiện hàng từ Container',
                                value: kpiStats.totalItems,
                                sub: `Thuộc ${activeHub?.hubCode || 'Trụ sở'}`,
                                color: '#0284c7',
                                icon: Box
                            },
                            {
                                label: 'Đã gửi dữ liệu sang Trụ sở',
                                value: kpiStats.totalItems - kpiStats.inContainerCount,
                                sub: `${kpiStats.inContainerCount} kiện còn chờ đồng bộ`,
                                color: '#d97706',
                                icon: Cpu
                            },
                            {
                                label: 'Đã chia cho Shipper gần nhất',
                                value: kpiStats.assignedOrOutCount,
                                sub: `${hubShippers.length} Shipper chốt trực tại các phân khu`,
                                color: '#7c3aed',
                                icon: Compass
                            },
                            {
                                label: 'Shipper đã giao hoàn tất (POD)',
                                value: kpiStats.deliveredCount,
                                sub: 'Đồng bộ hoàn tất về Container CCADRO',
                                color: '#059669',
                                icon: PackageCheck
                            }
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.label}
                                    style={{
                                        background: cardBg,
                                        border: cardBorder,
                                        borderRadius: 15,
                                        padding: '16px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxShadow: isDark
                                            ? '0 6px 20px rgba(0,0,0,0.22)'
                                            : '0 2px 8px rgba(15, 23, 42, 0.03)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.76rem', color: textMuted, fontWeight: 700 }}>
                                            {item.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.65rem',
                                                fontWeight: 800,
                                                color: item.color,
                                                marginTop: 4,
                                                lineHeight: 1.1
                                            }}
                                        >
                                            {item.value}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 4 }}>
                                            {item.sub}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 12,
                                            background: `${item.color}18`,
                                            color: item.color,
                                            display: 'flex',
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
              TAB 1: ĐIỀU PHỐI HÀNG THEO VỊ TRÍ (DEFAULT)
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'dispatch' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Horizontal Strip of Assigned Local Shippers in this Hub (Clean 3-Card Row) */}
                            <section
                                style={{
                                    background: cardBg,
                                    border: cardBorder,
                                    borderRadius: 16,
                                    padding: '16px 20px'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 10,
                                        marginBottom: 12
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                color: '#059669',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em'
                                            }}
                                        >
                                            ĐỘI NGŨ SHIPPER TRỰC THUỘC {activeHub?.hubCode} ({hubShippers.length} SHIPPER)
                                        </div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 2 }}>
                                            Vị trí được phân công của từng Shipper quanh Trụ sở (Nhấn vào Shipper để lọc đơn)
                                        </div>
                                    </div>

                                    {selectedShipperFilter !== 'ALL' && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedShipperFilter('ALL')}
                                            style={{
                                                padding: '5px 11px',
                                                borderRadius: 8,
                                                border: cardBorder,
                                                background: subtleBg,
                                                color: '#059669',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Hiển thị tất cả Shipper ({hubShippers.length})
                                        </button>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                                        gap: 12
                                    }}
                                >
                                    {hubShippers.map((shipper) => {
                                        const assignedItems = manifestItems.filter(
                                            (m) => m.assignedShipperCode === shipper.shipperCode
                                        );
                                        const isSelected = selectedShipperFilter === shipper.shipperCode;
                                        return (
                                            <div
                                                key={shipper.shipperCode}
                                                onClick={() =>
                                                    setSelectedShipperFilter(isSelected ? 'ALL' : shipper.shipperCode)
                                                }
                                                style={{
                                                    padding: '13px 15px',
                                                    borderRadius: 13,
                                                    border: isSelected
                                                        ? '2px solid #10b981'
                                                        : cardBorder,
                                                    background: isSelected
                                                        ? isDark
                                                            ? 'rgba(16, 185, 129, 0.12)'
                                                            : 'rgba(16, 185, 129, 0.06)'
                                                        : subtleBg,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.16s ease'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: 8
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>
                                                            {shipper.fullName}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                padding: '2px 7px',
                                                                borderRadius: 6,
                                                                background: 'rgba(16, 185, 129, 0.15)',
                                                                color: '#059669'
                                                            }}
                                                        >
                                                            {shipper.shipperCode}
                                                        </span>
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            padding: '2px 8px',
                                                            borderRadius: 999,
                                                            background: shipper.coldChainCapable
                                                                ? 'rgba(2, 132, 199, 0.14)'
                                                                : 'rgba(100, 116, 139, 0.14)',
                                                            color: shipper.coldChainCapable ? '#0284c7' : textMuted
                                                        }}
                                                    >
                                                        {shipper.coldChainCapable ? '❄ Xe Bảo Ôn Lạnh' : 'Xe Hàng Khô'}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: 7,
                                                        fontSize: '0.76rem',
                                                        fontWeight: 700,
                                                        color: '#059669',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5
                                                    }}
                                                >
                                                    <MapPin size={13} />
                                                    <span>{shipper.assignedZoneName}</span>
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: 5,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.72rem',
                                                        color: textMuted
                                                    }}
                                                >
                                                    <span>
                                                        Tọa độ chốt: ({shipper.assignedLat.toFixed(4)},{' '}
                                                        {shipper.assignedLng.toFixed(4)}) • R={shipper.coverageRadiusKm}km
                                                    </span>
                                                    <strong style={{ color: '#0284c7' }}>
                                                        {assignedItems.length} kiện được giao
                                                    </strong>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Cargo Manifest Dispatch List & Filter Toolbar */}
                            <section
                                style={{
                                    background: cardBg,
                                    border: cardBorder,
                                    borderRadius: 16,
                                    padding: '18px 20px'
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
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                color: '#0284c7',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em'
                                            }}
                                        >
                                            DANH MỤC HÀNG HÓA TỪ CONTAINER & PHÂN CÔNG SHIPPER GẦN NHẤT
                                        </div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: 2 }}>
                                            So sánh khoảng cách từ điểm giao của từng món hàng tới vị trí phân công của các Shipper
                                        </div>
                                    </div>

                                    {/* Filter Pills + Search */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: 3,
                                                borderRadius: 9,
                                                background: subtleBg,
                                                border: cardBorder
                                            }}
                                        >
                                            {[
                                                { id: 'ALL', label: 'Tất cả' },
                                                { id: 'IN_CONTAINER', label: 'Trong Container' },
                                                { id: 'SYNCED_TO_HUB', label: 'Đã sang Trụ sở' },
                                                { id: 'ASSIGNED_TO_SHIPPER', label: 'Đã chia Shipper' },
                                                { id: 'DELIVERED_POD', label: 'Đã giao POD' }
                                            ].map((f) => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setDispatchStatusFilter(f.id)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: 7,
                                                        border: 'none',
                                                        background:
                                                            dispatchStatusFilter === f.id
                                                                ? 'rgba(16, 185, 129, 0.18)'
                                                                : 'transparent',
                                                        color: dispatchStatusFilter === f.id ? '#059669' : textMuted,
                                                        fontSize: '0.73rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>

                                        <ElasticSearchBar
                                            value={searchQuery}
                                            onChange={setSearchQuery}
                                            placeholder="Elastic search: mã kiện, hàng hóa, người nhận, shipper..."
                                            totalCount={activeOrDeletedManifestItems.length}
                                            matchedCount={enrichedManifestItems.length}
                                            tookMs={elasticManifestResult.tookMs}
                                            showDeleted={showDeletedManifest}
                                            onToggleDeleted={() => setShowDeletedManifest((prev) => !prev)}
                                            deletedCount={deletedManifestCount}
                                            minWidth={260}
                                            rounded={9}
                                        />
                                    </div>
                                </div>

                                {/* Clean Structured Cards for each Manifest Cargo Item */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {enrichedManifestItems.map((item) => {
                                        const statusMeta =
                                            DISPATCH_STATUS_META[item.dispatchStatus] ||
                                            DISPATCH_STATUS_META.IN_CONTAINER;

                                        return (
                                            <div
                                                key={item.itemCode}
                                                data-testid={`manifest-item-${item.itemCode}`}
                                                style={{
                                                    padding: '16px 18px',
                                                    borderRadius: 14,
                                                    background: subtleBg,
                                                    border: cardBorder
                                                }}
                                            >
                                                {/* Header row of the item */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                        gap: 10,
                                                        paddingBottom: 12,
                                                        borderBottom: cardBorder
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <span
                                                            style={{
                                                                fontSize: '0.74rem',
                                                                fontWeight: 800,
                                                                padding: '3px 9px',
                                                                borderRadius: 7,
                                                                background: 'rgba(2, 132, 199, 0.14)',
                                                                color: '#0284c7'
                                                            }}
                                                        >
                                                            {item.itemCode}
                                                        </span>
                                                        <span style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                                                            {item.cargoName}
                                                        </span>
                                                        {item.requiresColdChain && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    padding: '2px 8px',
                                                                    borderRadius: 999,
                                                                    background: 'rgba(2, 132, 199, 0.14)',
                                                                    color: '#0284c7'
                                                                }}
                                                            >
                                                                <Snowflake size={12} /> Chuỗi lạnh ({item.requiredTempC}°C)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span
                                                            style={{
                                                                fontSize: '0.73rem',
                                                                fontWeight: 800,
                                                                padding: '4px 11px',
                                                                borderRadius: 999,
                                                                color: statusMeta.color,
                                                                background: statusMeta.bg
                                                            }}
                                                        >
                                                            {statusMeta.label}
                                                        </span>
                                                        {canUpdateDeliveryPod &&
                                                            (item.isDeleted ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRestoreManifestItem(item.itemCode)}
                                                                    title="Khôi phục kiện hàng"
                                                                    style={{
                                                                        padding: '4px 9px',
                                                                        borderRadius: 8,
                                                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                                                        background: 'rgba(16, 185, 129, 0.14)',
                                                                        color: '#10b981',
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 4
                                                                    }}
                                                                >
                                                                    <RotateCcw size={12} /> Khôi phục
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSoftDeleteManifestItem(item.itemCode)}
                                                                    title="Xóa mềm kiện hàng (chuyển vào Thùng rác)"
                                                                    style={{
                                                                        padding: '4px 7px',
                                                                        borderRadius: 8,
                                                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                                        color: '#f87171',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>

                                                {/* Middle 2-Column Layout: Left (Delivery Point Info) | Right (3 Shipper Distance Cards) */}
                                                <div
                                                    style={{
                                                        marginTop: 12,
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                                                        gap: 14,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {/* Sender & Receiver & Delivery Point Details */}
                                                    <div
                                                        style={{
                                                            padding: '10px 12px',
                                                            borderRadius: 11,
                                                            background: cardBg,
                                                            border: cardBorder,
                                                            fontSize: '0.77rem',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 7
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                paddingBottom: 6,
                                                                borderBottom: cardBorder
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0284c7' }}>
                                                                NGƯỜI GỬI • {item.senderPhone || '1900 6868'}
                                                            </div>
                                                            <div style={{ fontWeight: 700, marginTop: 1 }}>{item.senderName}</div>
                                                            <div style={{ fontSize: '0.71rem', color: textMuted }}>{item.senderAddress}</div>
                                                        </div>

                                                        <div>
                                                            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: textMuted }}>
                                                                NGƯỜI NHẬN & ĐỊA ĐIỂM GIAO ({item.parcelCount} kiện • {item.weightKg} kg)
                                                            </div>
                                                            <div style={{ fontWeight: 800, marginTop: 2 }}>
                                                                {item.consigneeName} • {item.consigneePhone}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 2 }}>
                                                                {item.deliveryAddress}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: '0.71rem',
                                                                    fontWeight: 700,
                                                                    color: '#059669',
                                                                    marginTop: 4
                                                                }}
                                                            >
                                                                Phạm vi: {item.deliveryZoneName} • GPS ({item.deliveryLat.toFixed(4)},{' '}
                                                                {item.deliveryLng.toFixed(4)})
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Distance comparison to each Shipper's assigned zone */}
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 800,
                                                                color: textMuted,
                                                                marginBottom: 6,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 5
                                                            }}
                                                        >
                                                            <Navigation size={12} color="#059669" />
                                                            KHOẢNG CÁCH TỪ ĐIỂM GIAO TỚI VỊ TRÍ ĐƯỢC PHÂN CÔNG CỦA TỪNG SHIPPER:
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
                                                                gap: 8
                                                            }}
                                                        >
                                                            {item.shipperCandidates.map((cand, idx) => {
                                                                const isAssigned = item.assignedShipperCode === cand.shipperCode;
                                                                const isClosest = idx === 0;
                                                                return (
                                                                    <div
                                                                        key={cand.shipperCode}
                                                                        onClick={() => handleManualAssignShipper(item, cand.shipperCode)}
                                                                        style={{
                                                                            padding: '8px 10px',
                                                                            borderRadius: 10,
                                                                            border: isAssigned
                                                                                ? '2px solid #059669'
                                                                                : isClosest
                                                                                    ? '1px solid rgba(2, 132, 199, 0.45)'
                                                                                    : cardBorder,
                                                                            background: isAssigned
                                                                                ? 'rgba(16, 185, 129, 0.12)'
                                                                                : cardBg,
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                fontSize: '0.76rem'
                                                                            }}
                                                                        >
                                                                            <span style={{ fontWeight: 800 }}>{cand.fullName}</span>
                                                                            <span
                                                                                style={{
                                                                                    fontWeight: 800,
                                                                                    padding: '1px 6px',
                                                                                    borderRadius: 6,
                                                                                    background:
                                                                                        cand.distanceKm < 0.5
                                                                                            ? 'rgba(16, 185, 129, 0.18)'
                                                                                            : 'rgba(100, 116, 139, 0.14)',
                                                                                    color: cand.distanceKm < 0.5 ? '#059669' : textPrimary,
                                                                                    fontSize: '0.7rem'
                                                                                }}
                                                                            >
                                                                                {cand.distanceKm.toFixed(2)} km
                                                                            </span>
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                fontSize: '0.68rem',
                                                                                color: textMuted,
                                                                                marginTop: 2,
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis'
                                                                            }}
                                                                        >
                                                                            {cand.assignedZoneName}
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                marginTop: 3,
                                                                                fontSize: '0.68rem',
                                                                                fontWeight: 800,
                                                                                color: isAssigned
                                                                                    ? '#059669'
                                                                                    : !cand.coldOk
                                                                                        ? '#ef4444'
                                                                                        : isClosest
                                                                                            ? '#0284c7'
                                                                                            : textMuted
                                                                            }}
                                                                        >
                                                                            {isAssigned
                                                                                ? '✓ Đã phân công giao'
                                                                                : !cand.coldOk
                                                                                    ? '⚠ Xe không có thùng lạnh'
                                                                                    : isClosest
                                                                                        ? '★ Gần vị trí phân công nhất'
                                                                                        : 'Cách xa hơn'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer row: Assigned Shipper Summary & Action Buttons */}
                                                <div
                                                    style={{
                                                        marginTop: 12,
                                                        paddingTop: 10,
                                                        borderTop: cardBorder,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                        gap: 10
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.78rem' }}>
                                                        {item.assignedShipperCode ? (
                                                            <div>
                                                                <span style={{ color: textMuted }}>Shipper nhận đơn: </span>
                                                                <strong style={{ color: '#059669' }}>
                                                                    {item.assignedShipperName} ({item.assignedShipperCode})
                                                                </strong>
                                                                {item.proximityDistanceKm != null && (
                                                                    <span style={{ color: '#0284c7', fontWeight: 700, marginLeft: 8 }}>
                                                                        • Cách vị trí phân công {item.proximityDistanceKm} km
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#d97706', fontWeight: 700 }}>
                                                                Chưa phân công Shipper — Bấm &ldquo;2. Tự động chia đơn cho Shipper gần vị trí nhất&rdquo; trên thanh công cụ
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {canIngestAndDispatch && item.dispatchStatus === 'IN_CONTAINER' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleIngestManifestToHub(item.containerCode)}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 8,
                                                                    border: '1px solid rgba(217, 119, 6, 0.4)',
                                                                    background: 'rgba(245, 158, 11, 0.14)',
                                                                    color: '#d97706',
                                                                    fontSize: '0.74rem',
                                                                    fontWeight: 800,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Gửi sang Trụ sở
                                                            </button>
                                                        )}

                                                        {canIngestAndDispatch &&
                                                            (item.dispatchStatus === 'IN_CONTAINER' ||
                                                                item.dispatchStatus === 'SYNCED_TO_HUB') &&
                                                            item.recommendedShipper && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleManualAssignShipper(
                                                                            item,
                                                                            item.recommendedShipper.shipperCode
                                                                        )
                                                                    }
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: 8,
                                                                        border: 'none',
                                                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                        color: '#fff',
                                                                        fontSize: '0.74rem',
                                                                        fontWeight: 800,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Gán ngay {item.recommendedShipper.fullName} (
                                                                    {item.recommendedShipper.distanceKm.toFixed(2)} km)
                                                                </button>
                                                            )}

                                                        {canUpdateDeliveryPod && item.dispatchStatus === 'ASSIGNED_TO_SHIPPER' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateItemStatus(item, 'OUT_FOR_DELIVERY')}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 8,
                                                                    border: '1px solid rgba(124, 58, 237, 0.4)',
                                                                    background: 'rgba(124, 58, 237, 0.14)',
                                                                    color: '#7c3aed',
                                                                    fontSize: '0.74rem',
                                                                    fontWeight: 800,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Shipper xuất phát đi giao
                                                            </button>
                                                        )}

                                                        {canUpdateDeliveryPod &&
                                                            (item.dispatchStatus === 'ASSIGNED_TO_SHIPPER' ||
                                                                item.dispatchStatus === 'OUT_FOR_DELIVERY') && (
                                                                <button
                                                                    type="button"
                                                                    data-testid={`btn-open-pod-${item.itemCode}`}
                                                                    onClick={() => setPhotoPodModalItem(item)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: 8,
                                                                        border: '1px solid rgba(16, 185, 129, 0.45)',
                                                                        background: 'rgba(16, 185, 129, 0.16)',
                                                                        color: '#059669',
                                                                        fontSize: '0.74rem',
                                                                        fontWeight: 800,
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 5
                                                                    }}
                                                                >
                                                                    <Camera size={13} /> Chụp Ảnh POD & Hoàn tất giao
                                                                </button>
                                                            )}

                                                        {isReadOnlyAuditor && (
                                                            <span
                                                                data-testid={`auditor-readonly-pill-${item.itemCode}`}
                                                                style={{
                                                                    padding: '5px 10px',
                                                                    borderRadius: 8,
                                                                    background: 'rgba(245, 158, 11, 0.14)',
                                                                    color: '#d97706',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 800
                                                                }}
                                                            >
                                                                Chế độ Thanh tra Chỉ đọc
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tracking Timeline + Photo POD Proof Strip */}
                                                <div
                                                    style={{
                                                        marginTop: 10,
                                                        paddingTop: 10,
                                                        borderTop: cardBorder,
                                                        display: 'grid',
                                                        gridTemplateColumns: item.proofImageUrl
                                                            ? 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))'
                                                            : 'minmax(0, 1fr)',
                                                        gap: 12,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <div style={{ fontSize: '0.67rem', fontWeight: 800, color: textMuted }}>
                                                            LỊCH SỬ TRACKING KIỆN HÀNG ({item.itemCode})
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {(item.trackingTimeline || []).map((step, sIdx) => (
                                                                <span
                                                                    key={`${item.itemCode}-trk-${sIdx}`}
                                                                    style={{
                                                                        fontSize: '0.69rem',
                                                                        padding: '3px 8px',
                                                                        borderRadius: 7,
                                                                        background: cardBg,
                                                                        border: cardBorder,
                                                                        color: step.status === 'DELIVERED_POD' ? '#059669' : textPrimary
                                                                    }}
                                                                >
                                                                    <strong>{step.time}</strong> • {step.note}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {item.proofImageUrl && (
                                                        <div
                                                            onClick={() => setZoomedPhotoItem(item)}
                                                            title="Nhấn để phóng to ảnh xác thực POD"
                                                            style={{
                                                                padding: 6,
                                                                borderRadius: 10,
                                                                background: cardBg,
                                                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8
                                                            }}
                                                        >
                                                            <img
                                                                src={item.proofImageUrl}
                                                                alt={`POD ${item.itemCode}`}
                                                                style={{
                                                                    width: 56,
                                                                    height: 44,
                                                                    borderRadius: 6,
                                                                    objectFit: 'cover',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669' }}>
                                                                    ✓ Đã có Ảnh POD
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: '0.67rem',
                                                                        color: textMuted,
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis'
                                                                    }}
                                                                >
                                                                    {item.recipientPodName || 'Nhấn để xem ảnh'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
              TAB: CHÍNH SÁCH TRỤ SỞ, PHẠM VI & GIAO NHIỆM VỤ THEO DẢI MÃ
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'policy' && (
                        <HubShipperIsolationPanel
                            activeHub={activeHub}
                            policy={activePolicy}
                            activeShipper={activeShipperProfile}
                            hubShippers={hubShippers}
                            manifestItems={manifestItems}
                            rangeAssignments={rangeAssignments}
                            strictHubIsolationEnforced={strictHubIsolationEnforced}
                            currentUsername={user?.username || 'shipper'}
                            canAssignCodeRange={canAssignCodeRange}
                            isReadOnlyAuditor={isReadOnlyAuditor}
                            isDark={isDark}
                            onAssignCodeRange={handleAssignCodeRange}
                        />
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
              TAB 2: ĐỘI NGŨ SHIPPER NỘI KHU
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'shippers' && (
                        <section
                            style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: 16,
                                padding: '20px 22px'
                            }}
                        >
                            <div style={{ marginBottom: 16 }}>
                                <div
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: '#059669',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    DANH BẠ SHIPPER NỘI KHU & VỊ TRÍ ĐƯỢC PHÂN CÔNG
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: 2 }}>
                                    Đội ngũ Shipper thuộc {activeHub?.hubName} ({hubShippers.length} nhân sự)
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
                                    gap: 16
                                }}
                            >
                                {hubShippers.map((shipper) => {
                                    const assignedItems = manifestItems.filter(
                                        (m) => m.assignedShipperCode === shipper.shipperCode
                                    );
                                    const loadPct = Math.min(
                                        100,
                                        Math.round(
                                            ((shipper.currentLoadKg || 0) / (shipper.maxCapacityKg || 1500)) * 100
                                        )
                                    );
                                    return (
                                        <div
                                            key={shipper.shipperCode}
                                            style={{
                                                padding: 18,
                                                borderRadius: 15,
                                                background: subtleBg,
                                                border: cardBorder,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.96rem', fontWeight: 800 }}>
                                                        {shipper.fullName} ({shipper.shipperCode})
                                                    </div>
                                                    <div style={{ fontSize: '0.76rem', color: textMuted, marginTop: 2 }}>
                                                        {shipper.vehicleType} • Biển số {shipper.vehiclePlate} • SĐT:{' '}
                                                        {shipper.phone}
                                                    </div>
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        padding: '3px 9px',
                                                        borderRadius: 999,
                                                        background: 'rgba(16, 185, 129, 0.16)',
                                                        color: '#059669',
                                                        height: 'fit-content'
                                                    }}
                                                >
                                                    ★ {shipper.rating}
                                                </span>
                                            </div>

                                            <div
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 11,
                                                    background: cardBg,
                                                    border: cardBorder,
                                                    fontSize: '0.78rem'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, color: '#059669' }}>
                                                    Vị trí được phân công: {shipper.assignedZoneName}
                                                </div>
                                                {shipper.todayDeliveryScope && (
                                                    <div style={{ fontSize: '0.73rem', color: textPrimary, marginTop: 4 }}>
                                                        <strong>Phạm vi giao hôm nay:</strong> {shipper.todayDeliveryScope}
                                                    </div>
                                                )}
                                                {shipper.assignedCodeRangeFrom && (
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                                                        Dải mã đơn được giao: {shipper.assignedCodeRangeFrom} →{' '}
                                                        {shipper.assignedCodeRangeTo || shipper.assignedCodeRangeFrom}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 3 }}>
                                                    Tọa độ chốt: ({shipper.assignedLat.toFixed(4)},{' '}
                                                    {shipper.assignedLng.toFixed(4)}) • Bán kính phụ trách:{' '}
                                                    <strong>{shipper.coverageRadiusKm} km</strong>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 3 }}>
                                                    Tải trọng hiện tại: {shipper.currentLoadKg}/{shipper.maxCapacityKg} kg (
                                                    {loadPct}%)
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: textMuted }}>
                                                    ĐƠN HÀNG ĐƯỢC GIAO GẦN VỊ TRÍ PHÂN CÔNG ({assignedItems.length}):
                                                </div>
                                                {assignedItems.length === 0 ? (
                                                    <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: 4 }}>
                                                        Chưa có kiện hàng nào được gán trong ca này.
                                                    </div>
                                                ) : (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 6,
                                                            marginTop: 6
                                                        }}
                                                    >
                                                        {assignedItems.map((it) => (
                                                            <div
                                                                key={it.itemCode}
                                                                style={{
                                                                    padding: '7px 10px',
                                                                    borderRadius: 8,
                                                                    background: cardBg,
                                                                    border: cardBorder,
                                                                    fontSize: '0.74rem',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <span>
                                                                    <strong>{it.itemCode}</strong> • {it.consigneeName}
                                                                </span>
                                                                <span style={{ color: '#059669', fontWeight: 800 }}>
                                                                    {it.proximityDistanceKm != null
                                                                        ? `${it.proximityDistanceKm} km`
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
              TAB 3: CONTAINER CẬP BÃI & MANIFEST
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'containers' && (
                        <section
                            style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: 16,
                                padding: '20px 22px'
                            }}
                        >
                            <div style={{ marginBottom: 16 }}>
                                <div
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: '#0284c7',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    DANH SÁCH CONTAINER MIDDLE-MILE BÀN GIAO DỮ LIỆU VỀ TRỤ SỞ
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: 2 }}>
                                    Container cập bãi & trạng thái truyền dữ liệu Manifest sang hệ thống Trụ sở
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {handovers.map((h) => {
                                    const meta =
                                        HANDOVER_STATUS_META[h.handoverStatus] ||
                                        HANDOVER_STATUS_META.AWAITING_ARRIVAL;
                                    return (
                                        <div
                                            key={h.containerCode}
                                            style={{
                                                padding: '16px 18px',
                                                borderRadius: 14,
                                                background: subtleBg,
                                                border: cardBorder,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: 12
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: '0.96rem', fontWeight: 800 }}>
                                                        Container {h.containerCode}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            fontWeight: 800,
                                                            padding: '3px 9px',
                                                            borderRadius: 999,
                                                            color: meta.color,
                                                            background: meta.bg
                                                        }}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: 4 }}>
                                                    Trụ sở nhận: <strong>{h.hubCode}</strong> ({h.destinationHub}) • Cổng:{' '}
                                                    {h.dockGate} • Tài xế: {h.driverName} ({h.vehiclePlate})
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {canIngestAndDispatch && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleIngestManifestToHub(h.containerCode)}
                                                            style={{
                                                                padding: '7px 12px',
                                                                borderRadius: 9,
                                                                border: '1px solid rgba(217, 119, 6, 0.4)',
                                                                background: 'rgba(245, 158, 11, 0.14)',
                                                                color: '#d97706',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 800,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            1. Gửi dữ liệu Manifest sang {h.hubCode}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedHubCode(h.hubCode);
                                                                setActiveTab('dispatch');
                                                                handleAutoDispatchByProximity(h.hubCode, h.containerCode);
                                                            }}
                                                            style={{
                                                                padding: '7px 12px',
                                                                borderRadius: 9,
                                                                border: 'none',
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#fff',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 800,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            2. Tự động chia đơn cho Shipper {h.hubCode}
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openDriverChat(h)}
                                                    style={{
                                                        padding: '7px 12px',
                                                        borderRadius: 9,
                                                        border: cardBorder,
                                                        background: cardBg,
                                                        color: textPrimary,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Chat Tài xế
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
              TAB 4: MẠNG LƯỚI TRỤ SỞ KHU VỰC
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'hubs' && (
                        <section
                            style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: 16,
                                padding: '20px 22px'
                            }}
                        >
                            <div style={{ marginBottom: 16 }}>
                                <div
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: '#059669',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    MẠNG LƯỚI 4 TRỤ SỞ ĐIỀU PHỐI KHU VỰC (LOCAL DISTRIBUTION HUBS)
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: 2 }}>
                                    Danh sách Trụ sở tiếp nhận dữ liệu từ Container và điều phối Shipper nội khu
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
                                    gap: 16
                                }}
                            >
                                {hubs.map((hub) => (
                                    <div
                                        key={hub.hubCode}
                                        style={{
                                            padding: 18,
                                            borderRadius: 14,
                                            background: subtleBg,
                                            border:
                                                selectedHubCode === hub.hubCode ? '2px solid #10b981' : cardBorder
                                        }}
                                    >
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{hub.hubName}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700, marginTop: 3 }}>
                                            Mã Trụ sở: {hub.hubCode} • Hệ thống: {hub.externalSystemName}
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: textMuted, marginTop: 6 }}>
                                            Địa chỉ: {hub.address}
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: textMuted, marginTop: 4 }}>
                                            Tọa độ tâm: ({hub.centerLat.toFixed(4)}, {hub.centerLng.toFixed(4)}) • Bán
                                            kính điều phối: {hub.coverageRadiusKm} km
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedHubCode(hub.hubCode);
                                                setActiveTab('dispatch');
                                            }}
                                            style={{
                                                marginTop: 12,
                                                padding: '7px 13px',
                                                borderRadius: 9,
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Mở Bảng Điều Phối Trụ Sở Này
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
              TAB: KHO TÀI KHOẢN & BẢO MẬT IAM (hub_iam)
          ══════════════════════════════════════════════════════════════════ */}
                    {activeTab === 'iam' && canManageHubIam && (
                        <HubIamAccountsTab
                            currentUser={user}
                            accounts={accounts}
                            hubAuthAuditLogs={hubAuthAuditLogs}
                            activeHubCode={activeHub?.hubCode || selectedHubCode}
                            availableHubs={hubs}
                            hubShippers={hubShippers}
                            isDark={isDark}
                            onProvisionAccount={provisionHubAccount}
                            onToggleStatus={toggleHubAccountStatus}
                            onSoftDeleteAccount={adminDeleteAccount}
                            onRestoreAccount={adminRestoreAccount}
                        />
                    )}
                </main>
            </div>

            {/* Container Driver Chat Modal */}
            {activeChatHandover && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 80,
                        background: 'rgba(2, 6, 23, 0.72)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 18
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 480,
                            borderRadius: 20,
                            background: isDark ? '#0f172a' : '#fff',
                            border: cardBorder,
                            overflow: 'hidden',
                            boxShadow: '0 24px 54px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div
                            style={{
                                padding: '14px 18px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <GrabDriverAvatar
                                    driverCode={activeChatHandover.driverCode}
                                    name={activeChatHandover.driverName}
                                    size={36}
                                />
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                                        {activeChatHandover.driverName} • {activeChatHandover.vehiclePlate}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.9 }}>
                                        Container {activeChatHandover.containerCode} → {activeHub?.hubName}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setChatContainerCode(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '5px 10px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                Đóng
                            </button>
                        </div>

                        <div
                            ref={chatScrollRef}
                            style={{
                                height: 290,
                                overflowY: 'auto',
                                padding: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                            }}
                        >
                            {activeChatMessages.map((msg) => {
                                const isMe = msg.senderRole === 'CUSTOMER';
                                return (
                                    <div
                                        key={msg.id}
                                        style={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '82%',
                                            padding: '9px 13px',
                                            borderRadius: 13,
                                            background: isMe
                                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                                : isDark
                                                    ? '#1e293b'
                                                    : '#f1f5f9',
                                            color: isMe ? '#fff' : textPrimary,
                                            fontSize: 12
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: 10, opacity: 0.85, marginBottom: 3 }}>
                                            {msg.senderName}
                                        </div>
                                        <div>{msg.text}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <form
                            onSubmit={handleSendDriverChat}
                            style={{
                                padding: 12,
                                borderTop: cardBorder,
                                display: 'flex',
                                gap: 8
                            }}
                        >
                            <input
                                type="text"
                                value={chatDraft}
                                onChange={(e) => setChatDraft(e.target.value)}
                                placeholder="Nhắn tin cho tài xế Container về cổng tiếp nhận tại Trụ sở..."
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: 10,
                                    border: cardBorder,
                                    background: subtleBg,
                                    color: textPrimary,
                                    fontSize: 12,
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: '9px 15px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: '#10b981',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <Send size={13} /> Gửi
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Photo Proof-of-Delivery Modal */}
            {photoPodModalItem && (
                <PhotoPodModal
                    item={photoPodModalItem}
                    policy={activePolicy}
                    isDark={isDark}
                    onClose={() => setPhotoPodModalItem(null)}
                    onConfirmPod={handleConfirmPhotoPod}
                />
            )}

            {/* Photo POD Zoom Lightbox */}
            {zoomedPhotoItem && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setZoomedPhotoItem(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 96,
                        background: 'rgba(2, 6, 23, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        cursor: 'pointer'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: 680,
                            width: '100%',
                            background: cardBg,
                            borderRadius: 16,
                            overflow: 'hidden',
                            border: cardBorder
                        }}
                    >
                        <img
                            src={zoomedPhotoItem.proofImageUrl}
                            alt={`Ảnh POD ${zoomedPhotoItem.itemCode}`}
                            style={{ width: '100%', maxHeight: 420, objectFit: 'contain', background: '#020617' }}
                        />
                        <div style={{ padding: 14, fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 800, color: '#059669' }}>
                                {zoomedPhotoItem.itemCode} • {zoomedPhotoItem.consigneeName}
                            </div>
                            <div style={{ color: textMuted, marginTop: 4 }}>
                                {zoomedPhotoItem.proofImageCaption || zoomedPhotoItem.recipientPodName}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MessengerWorkspaceModal
                isOpen={messengerOpen}
                onClose={() => setMessengerOpen(false)}
                isDark={isDark}
            />

            <AccountSettingsModal
                isOpen={openSettings}
                onClose={() => setOpenSettings(false)}
            />
        </div>
    );
}
