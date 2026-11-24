import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  Database,
  Fuel,
  LayoutDashboard,
  Leaf,
  MapPin,
  Moon,
  Navigation,
  Package,
  PlusCircle,
  Route,
  ShieldCheck,
  Sun,
  Truck,
  UserCheck
} from 'lucide-react';
import SearchField from './SearchField';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const ALL_COMMAND_ITEMS = [
  {
    id: 'dashboard',
    group: 'Điều hành & Hạm đội',
    label: 'Trung Tâm Giám Sát NOC',
    hint: 'Tổng quan đội xe, KPIs, doanh thu & bản đồ trực tuyến',
    path: '/portal',
    roles: ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'],
    icon: LayoutDashboard
  },
  {
    id: 'shipments',
    group: 'Điều hành & Hạm đội',
    label: 'Quản Lý Vận Đơn',
    hint: 'Theo dõi vận đơn UC03–UC11 & trạng thái giao nhận',
    path: '/shipments',
    roles: ['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'],
    icon: Package
  },
  {
    id: 'containers',
    group: 'Điều hành & Hạm đội',
    label: 'Quản Lý Container & Soi Chiếu 3D',
    hint: 'Niêm phong, cân tải & kiểm tra an toàn container',
    path: '/container-inspections',
    roles: ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'],
    icon: ShieldCheck
  },
  {
    id: 'new-shipment',
    group: 'Điều hành & Hạm đội',
    label: 'Tạo Đơn Hàng Mới (UC03)',
    hint: 'Khởi tạo vận đơn mới trong hệ thống',
    path: '/shipments/new',
    roles: ['ADMIN', 'DISPATCHER'],
    icon: PlusCircle
  },
  {
    id: 'dispatch',
    group: 'Điều hành & Hạm đội',
    label: 'Điều Phối & Xuất Bến (UC06–UC07)',
    hint: 'Gán xe, tài xế và xác nhận tuyến đường thực tế',
    path: '/operations/dispatch',
    roles: ['ADMIN', 'DISPATCHER'],
    icon: Navigation
  },
  {
    id: 'tracking',
    group: 'Điều hành & Hạm đội',
    label: 'Giám Sát GPS & Lệch Tuyến',
    hint: 'Theo dõi GPS hành trình & cảnh báo lệch hành lang',
    path: '/operations/tracking',
    roles: ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'],
    icon: MapPin
  },
  {
    id: 'planning',
    group: 'Lộ Trình & Xanh Hóa (ESG)',
    label: 'Đa Mục Tiêu Pareto (UC05)',
    hint: 'Tối ưu quãng đường ngắn, thời gian tắc đường & carbon',
    path: '/operations/planning',
    roles: ['ADMIN', 'DISPATCHER'],
    icon: Route
  },
  {
    id: 'carbon',
    group: 'Lộ Trình & Xanh Hóa (ESG)',
    label: 'Kiểm Toán GLEC v3 (UC12)',
    hint: 'Báo cáo phát thải CO₂e theo chuẩn ISO 14083 / GLEC v3',
    path: '/operations/carbon',
    roles: ['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'],
    icon: Leaf
  },
  {
    id: 'benchmark',
    group: 'Lộ Trình & Xanh Hóa (ESG)',
    label: 'Định Mức Hành Lang (UC13)',
    hint: 'So sánh hiệu suất CO₂ theo từng hành lang vận tải',
    path: '/analytics/benchmark',
    roles: ['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'],
    icon: BarChart3
  },
  {
    id: 'vehicle-fuels',
    group: 'Lộ Trình & Xanh Hóa (ESG)',
    label: 'Nhiên Liệu & CO₂ Đội Xe',
    hint: 'Chọn xăng dầu Petrolimex thực tế & bài toán tối ưu Pareto',
    path: '/vehicle-fuels',
    roles: ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'],
    icon: Fuel
  },
  {
    id: 'data',
    group: 'Quản Trị & An Toàn',
    label: 'Dữ Liệu Hệ Thống',
    hint: 'Kiểm kê dữ liệu và tình trạng các microservice',
    path: '/admin/data',
    roles: ['ADMIN'],
    icon: Database
  },
  {
    id: 'users',
    group: 'Quản Trị & An Toàn',
    label: 'Tài Khoản & Phân Quyền IAM',
    hint: 'Quản lý tài khoản, khóa/mở khóa và vai trò',
    path: '/admin/users',
    roles: ['ADMIN'],
    icon: UserCheck
  },
  {
    id: 'drivers',
    group: 'Quản Trị & An Toàn',
    label: 'Nhân Viên Lái Xe & GPLX',
    hint: 'Hồ sơ tài xế và hạn bằng lái',
    path: '/admin/drivers',
    roles: ['ADMIN'],
    icon: Truck
  },
  {
    id: 'controllers',
    group: 'Quản Trị & An Toàn',
    label: 'Nhân Viên Kiểm Soát HSE/ESG',
    hint: 'Danh sách kiểm soát viên an toàn & kiểm toán',
    path: '/admin/controllers',
    roles: ['ADMIN'],
    icon: ClipboardCheck
  },
  {
    id: 'companies',
    group: 'Quản Trị & An Toàn',
    label: 'Công Ty & Đối Tác B2B',
    hint: 'Pháp lý, hợp đồng Net-30 và đối tác vận tải',
    path: '/admin/companies',
    roles: ['ADMIN'],
    icon: Building2
  },
  {
    id: 'governance',
    group: 'Quản Trị & An Toàn',
    label: 'An Toàn & Sự Cố',
    hint: 'Quản trị sự cố hành trình & điều phối khẩn cấp',
    path: '/governance',
    roles: ['ADMIN', 'SAFETY_MANAGER'],
    icon: ShieldCheck
  }
];

export default function CommandFinder({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { toggleTheme, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const role = user?.role || 'ADMIN';
    const routeItems = ALL_COMMAND_ITEMS.filter((item) => item.roles.includes(role));
    const actionItem = {
      id: 'toggle-theme',
      group: 'Thao tác nhanh',
      label: isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối',
      hint: 'Hiệu ứng chuyển cảnh vòng tròn từ trung tâm màn hình',
      icon: isDark ? Sun : Moon,
      action: (event) => {
        toggleTheme(event);
        onClose();
      }
    };
    const all = [...routeItems, actionItem];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) =>
      `${item.label} ${item.hint} ${item.group}`.toLowerCase().includes(q)
    );
  }, [user?.role, isDark, query, toggleTheme, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeItem = (item, event) => {
    if (!item) return;
    if (item.action) {
      item.action(event);
      return;
    }
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      executeItem(items[selectedIndex], event);
    }
  };

  let lastGroup = '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="halvi-finder-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="halvi-finder"
            role="dialog"
            aria-modal="true"
            aria-label="Tìm nhanh chức năng"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="halvi-finder__head">
              <SearchField
                ref={inputRef}
                hideLabel
                label="Tìm nhanh chức năng hệ thống"
                placeholder="Tìm trang điều hành, báo cáo carbon, nhiên liệu, IAM…"
                aria-label="Tìm nhanh chức năng hệ thống"
                value={query}
                onValueChange={setQuery}
                className="halvi-finder__search"
              />
              <span className="halvi-kbd">ESC</span>
            </div>

            <div className="halvi-finder__list" role="listbox">
              {!items.length && (
                <div className="halvi-finder__empty">
                  Không tìm thấy chức năng phù hợp với &ldquo;{query}&rdquo;.
                </div>
              )}

              {items.map((item, idx) => {
                const Icon = item.icon;
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <React.Fragment key={item.id}>
                    {showGroup && <div className="halvi-finder__group">{item.group}</div>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={idx === selectedIndex}
                      className="halvi-finder__item"
                      style={{ animationDelay: `${Math.min(idx, 8) * 20}ms` }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={(e) => executeItem(item, e)}
                    >
                      <span className="halvi-finder__ico">
                        <Icon size={16} />
                      </span>
                      <span className="halvi-finder__meta">
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </span>
                      <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="halvi-finder__foot">
              <div>
                <span>
                  <kbd className="halvi-kbd">↑↓</kbd> Di chuyển
                </span>
                <span>
                  <kbd className="halvi-kbd">↵</kbd> Mở ngay
                </span>
              </div>
              <span>Phím tắt: ⌘K / Ctrl+K hoặc /</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
