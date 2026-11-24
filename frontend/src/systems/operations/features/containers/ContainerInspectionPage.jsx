import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Building2,
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  X
} from 'lucide-react';
import { api } from '../../../../services/api';
import { CONTAINER_STATUSES, CONTAINER_TYPES, formatDate } from './containerPresentation';
import ContainerSafetyInspection from './ContainerSafetyInspection';
import './containers.css';
import './container-inspections.css';

const STATES = {
  NOT_STARTED: 'Chưa kiểm tra',
  DRAFT: 'Đang kiểm tra',
  PASSED: 'Hoàn tất · Đạt',
  BLOCKED: 'Hoàn tất · Không đạt',
  EXPIRED: 'Cần kiểm tra lại'
};

const SORT_PRIORITY = {
  BLOCKED: 0,
  EXPIRED: 1,
  DRAFT: 2,
  NOT_STARTED: 3,
  PASSED: 4
};

export default function ContainerInspectionPage() {
  const [params, setParams] = useSearchParams();
  const selectedCode = params.get('container') || '';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [sortBy, setSortBy] = useState('ATTENTION_FIRST');
  const [now, setNow] = useState(Date.now);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.getContainerInspectionOverview();
      const rows = response?.result ?? response;
      setRecords(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (e) {
      setError(e.message || 'Không tải được danh sách kiểm tra container.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      load();
    }, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const hasActiveFilters = Boolean(query.trim() || status !== 'ALL' || type !== 'ALL');

  const resetFilters = () => {
    setQuery('');
    setStatus('ALL');
    setType('ALL');
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const filtered = records.filter(
      (item) =>
        (status === 'ALL' ||
          item.status === status ||
          (status === 'ATTENTION' && ['BLOCKED', 'EXPIRED'].includes(item.status))) &&
        (type === 'ALL' || item.containerType === type) &&
        `${item.containerCode} ${item.ownerName || ''} ${item.inspectedBy || ''}`
          .toLocaleLowerCase('vi')
          .includes(needle)
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === 'CODE_ASC') {
        return String(a.containerCode || '').localeCompare(String(b.containerCode || ''), 'vi');
      }
      if (sortBy === 'RECENT') {
        const ta = new Date(a.inspectedAt || a.updatedAt || 0).getTime();
        const tb = new Date(b.inspectedAt || b.updatedAt || 0).getTime();
        return tb - ta;
      }
      const pa = SORT_PRIORITY[a.status] ?? 9;
      const pb = SORT_PRIORITY[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return String(a.containerCode || '').localeCompare(String(b.containerCode || ''), 'vi');
    });
  }, [records, query, status, type, sortBy]);

  const selected = records.find((item) => item.containerCode === selectedCode);
  const select = (code) => {
    if (!locked) setParams({ container: code });
  };

  const totalRecords = records.length;

  return (
    <div className="inspection-page">
      <header className="inspection-page-header">
        <div>
          <p className="container-overline">TRUNG TÂM KIỂM TRA KỸ THUẬT &amp; AN TOÀN · CCADRO</p>
          <h1>Kiểm tra xe container</h1>
          <p>
            Theo dõi tình trạng tổ hợp xe, đánh giá từng vị trí theo chuẩn checklist và quản lý hồ
            sơ kiểm định xuất bến.
          </p>
        </div>

        <div className="inspection-header-actions">
          <Link to="/containers" className="btn btn-secondary">
            <Box size={15} /> Quản lý Container
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={locked || loading}
            onClick={load}
          >
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} /> Cập nhật
          </button>
        </div>
      </header>

      <div className="inspection-statistics" role="region" aria-label="Thống kê kiểm tra container">
        {[
          ['NOT_STARTED', 'Chưa kiểm tra', Box],
          ['DRAFT', 'Đang kiểm tra', ClipboardCheck],
          ['PASSED', 'Hoàn tất · Đạt', ShieldCheck],
          ['ATTENTION', 'Cần xử lý', AlertTriangle]
        ].map(([key, label, Icon]) => {
          const count = records.filter((item) =>
            key === 'ATTENTION' ? ['BLOCKED', 'EXPIRED'].includes(item.status) : item.status === key
          ).length;
          const pct = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
          return (
            <button
              type="button"
              key={key}
              className={`inspection-stat state-${key}`}
              aria-pressed={status === key}
              onClick={() => setStatus(status === key ? 'ALL' : key)}
            >
              <span className="inspection-stat__icon">
                <Icon size={20} />
              </span>
              <div className="inspection-stat__value-row">
                <strong>{count}</strong>
                <span className="inspection-stat__pct">{pct}% đội xe</span>
              </div>
              <span className="inspection-stat__label">{label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="container-notice container-notice-error" role="alert">
          {error}
          <button type="button" className="container-text-button" onClick={load}>
            Thử lại
          </button>
        </p>
      )}

      <div className="inspection-page-layout">
        <aside className="inspection-register" aria-label="Danh sách kiểm tra container">
          <div className="inspection-register-heading">
            <h2>
              <Truck size={17} /> Danh sách thiết bị
            </h2>
            <span className="inspection-register-count">
              {visible.length}/{records.length}
            </span>
          </div>

          <label className="inspection-search">
            <Search size={16} />
            <input
              aria-label="Tìm container kiểm tra"
              placeholder="Mã container, chủ sở hữu, người kiểm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="inspection-search-clear"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => setQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="inspection-register-filters">
            <div className="inspection-select-wrap">
              <select
                aria-label="Lọc loại container"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="ALL">Tất cả loại thiết bị</option>
                {Object.entries(CONTAINER_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="inspection-select-chevron" />
            </div>

            <div className="inspection-select-wrap">
              <select
                aria-label="Lọc trạng thái kiểm tra"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái kiểm tra</option>
                <option value="ATTENTION">Cần xử lý (Không đạt / Hết hạn)</option>
                {Object.entries(STATES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="inspection-select-chevron" />
            </div>

            <div className="inspection-select-wrap">
              <select
                aria-label="Sắp xếp danh sách kiểm tra"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="ATTENTION_FIRST">Ưu tiên cần kiểm tra trước</option>
                <option value="CODE_ASC">Theo mã container (A → Z)</option>
                <option value="RECENT">Cập nhật kiểm tra gần nhất</option>
              </select>
              <ChevronDown size={15} className="inspection-select-chevron" />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="inspection-filter-reset-row">
              <span className="inspection-register-timestamp">
                Đang lọc {visible.length} thiết bị
              </span>
              <button type="button" className="container-text-button" onClick={resetFilters}>
                <RotateCcw size={12} style={{ marginRight: 4 }} /> Đặt lại bộ lọc
              </button>
            </div>
          )}

          {locked && (
            <p className="inspection-register-hint">Lưu tiến độ trước khi chuyển container.</p>
          )}

          {loading ? (
            <p role="status" className="inspection-register-hint">
              Đang tải danh sách…
            </p>
          ) : visible.length === 0 ? (
            <div className="inspection-register-hint">
              Không có container phù hợp bộ lọc hiện tại.
            </div>
          ) : (
            <div className="inspection-register-list">
              {visible.map((item) => {
                const statusMeta = CONTAINER_STATUSES[item.containerStatus];
                return (
                  <button
                    type="button"
                    key={item.containerCode}
                    disabled={locked && item.containerCode !== selectedCode}
                    className={`inspection-register-item state-${item.status}`}
                    aria-pressed={selectedCode === item.containerCode}
                    onClick={() => select(item.containerCode)}
                  >
                    <div className="inspection-register-identity">
                      <span className="inspection-register-symbol">
                        <Truck size={16} />
                      </span>
                      <div>
                        <strong>{item.containerCode}</strong>
                        <span className="inspection-register-state">{STATES[item.status]}</span>
                      </div>
                      <ArrowUpRight size={14} />
                    </div>

                    <div className="inspection-register-meta">
                      <span>{CONTAINER_TYPES[item.containerType] || item.containerType}</span>
                      {statusMeta && <span>· {statusMeta.label}</span>}
                      {item.ownerName && (
                        <span className="inspection-register-owner">
                          <Building2 size={11} /> {item.ownerName}
                        </span>
                      )}
                    </div>

                    <progress value={item.checkedItemsCount} max={item.totalItemsCount || 1} />

                    <div className="inspection-register-progress-meta">
                      <span>
                        {item.checkedItemsCount}/{item.totalItemsCount} mục
                      </span>
                      {item.failedItemsCount > 0 && (
                        <span className="inspection-register-fail-tag">
                          {item.failedItemsCount} lỗi
                        </span>
                      )}
                    </div>

                    {item.inspectionNumber > 0 && (
                      <div className="inspection-register-timestamp">
                        Lần #{item.inspectionNumber} · {formatDate(item.inspectedAt || item.updatedAt)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="inspection-main" aria-label="Hồ sơ kiểm tra đã chọn">
          {selected ? (
            <ContainerSafetyInspection
              key={selected.containerCode}
              container={{ ...selected, status: selected.containerStatus }}
              now={now}
              onInspectionChange={load}
              onEditingChange={setLocked}
            />
          ) : (
            <div className="inspection-empty">
              <Truck size={48} />
              <h2>{selectedCode && !loading ? 'Không tìm thấy container' : 'Chọn container để xem mô hình & chỉ số an toàn'}</h2>
              <p>
                Chọn một thiết bị trong danh sách bên trái để hiển thị sơ đồ tổ hợp xe và đánh giá tình trạng theo phần trăm ISO 55000.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
