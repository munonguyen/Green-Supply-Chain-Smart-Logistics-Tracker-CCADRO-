import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Box,
  Boxes,
  Building2,
  ChevronDown,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Snowflake,
  Truck,
  UserRound,
  X
} from 'lucide-react';
import SearchField from '../../../../shared/components/search/SearchField';
import { useAuth } from '../../../../context/AuthContext';
import {
  containerOperationalIssues,
  ContainerConnectionBadge,
  formatSignalAge
} from './ContainerConnection';
import { api } from '../../../../services/api';
import ContainerDetails, { ContainerStatus } from './ContainerDetails';
import ContainerAttention from './ContainerAttention';
import ContainerSearchFilters from './ContainerSearchFilters';
import { EMPTY_CONTAINER_FILTERS, matchesContainerSearch } from './containerSearch';
import { ContainerCreateCard, ManifestCreateCard } from './ContainerForms';
import {
  asList,
  CONTAINER_STATUSES,
  CONTAINER_TYPES,
  EMPTY_CONTAINER,
  EMPTY_ITEM,
  formatDate,
  formatNumber
} from './containerPresentation';
import './containers.css';

const requestError = (error, fallback) =>
  error?.name === 'TimeoutError'
    ? fallback + ' Máy chủ phản hồi quá chậm.'
    : error?.message === 'Forbidden'
      ? fallback + ' Tài khoản chưa có quyền truy cập dữ liệu này.'
      : error?.message || fallback;

export default function ContainerManagementPage() {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = ['ADMIN', 'DISPATCHER'].includes(role);
  const [now, setNow] = useState(Date.now);
  const [lastSuccessAt, setLastSuccessAt] = useState(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const listRequest = useRef(null);
  const returnCode = useRef('');
  const detailHeading = useRef(null);
  const [containers, setContainers] = useState([]);
  const [catalogues, setCatalogues] = useState({ companies: [], vehicles: [], hubs: [] });
  const [selectedCode, setSelectedCode] = useState(() => new URLSearchParams(window.location.search).get('container') || '');
  const [query, setQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState(() => ({ ...EMPTY_CONTAINER_FILTERS }));
  const hasAdvancedFilters = Object.values(searchFilters).some((value) => value !== '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogueWarning, setCatalogueWarning] = useState('');
  const [vehicleCountAvailable, setVehicleCountAvailable] = useState(false);
  const [containerForm, setContainerForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [itemTarget, setItemTarget] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [manifest, setManifest] = useState({ code: '', items: [], state: 'loading', error: '' });
  const [manifestVersion, setManifestVersion] = useState(0);

  const refreshContainers = useCallback(() => {
    if (listRequest.current) return listRequest.current;
    const request = api
      .getContainers({}, { signal: AbortSignal.timeout?.(12000) })
      .then((response) => {
        const priority = { IN_TRANSIT: 0, ASSIGNED: 1, AVAILABLE: 2, MAINTENANCE: 3, DELIVERED: 4 };
        const receivedAt = Date.now();
        setContainers(
          asList(response).sort(
            (left, right) =>
              (priority[left.status] ?? 5) - (priority[right.status] ?? 5) ||
              containerOperationalIssues(right, receivedAt).length -
                containerOperationalIssues(left, receivedAt).length ||
              left.containerCode.localeCompare(right.containerCode)
          )
        );
        setLastSuccessAt(Date.now());
        setError('');
        return true;
      })
      .catch((failure) => {
        setError(requestError(failure, 'Không tải được danh sách container.'));
        return false;
      })
      .finally(() => {
        listRequest.current = null;
        setLoading(false);
        setNow(Date.now());
      });
    listRequest.current = request;
    return request;
  }, []);

  const load = useCallback(async () => {
    const [, ...catalogueResults] = await Promise.allSettled([
      refreshContainers(),
      api.getCompanies(),
      api.getVehicles(),
      api.getDistributionHubs()
    ]);
    const keys = ['companies', 'vehicles', 'hubs'];
    const labels = ['công ty', 'đầu kéo', 'cơ sở nhận'];
    const unavailable = [];
    const nextCatalogues = {};
    catalogueResults.forEach((result, index) => {
      nextCatalogues[keys[index]] = result.status === 'fulfilled' ? asList(result.value) : [];
      if (result.status === 'rejected') unavailable.push(labels[index]);
    });
    setCatalogues(nextCatalogues);
    setVehicleCountAvailable(catalogueResults[1].status === 'fulfilled');
    setCatalogueWarning(
      unavailable.length
        ? 'Chưa tải được danh mục ' +
            unavailable.join(', ') +
            '. Danh sách container vẫn được hiển thị; hãy thử tải lại.'
        : ''
    );
  }, [refreshContainers]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedCode || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('container')) return;
    url.searchParams.delete('container');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [selectedCode]);

  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      setNow(Date.now());
      if (!document.hidden && navigator.onLine) refreshContainers();
    };
    const timer = setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [refreshContainers]);

  useEffect(() => {
    if (selectedCode) {
      detailHeading.current?.focus();
      document.body.classList.add('container-modal-open');
    } else {
      document.body.classList.remove('container-modal-open');
      if (returnCode.current) {
        document.getElementById('open-container-' + returnCode.current)?.focus();
        returnCode.current = '';
      }
    }

    const handleKeyDown = (e) => {
      if (e.defaultPrevented || document.querySelector('.container-editor-dialog[open]')) return;
      if (e.key === 'Tab' && selectedCode) {
        const controls = [
          ...document.querySelectorAll(
            '.container-modal-card-window button, .container-modal-card-window input, .container-modal-card-window select, .container-modal-card-window textarea, .container-modal-card-window a[href]'
          )
        ].filter(
          (element) =>
            !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === 'Escape' && selectedCode) {
        returnCode.current = selectedCode;
        setItemForm(null);
        setSelectedCode('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('container-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCode]);

  const filteredContainers = useMemo(
    () =>
      containers.filter((container) => {
        return (
          (statusFilter === 'ALL' || container.status === statusFilter) &&
          (!attentionOnly || containerOperationalIssues(container, now).length > 0) &&
          matchesContainerSearch(container, query, searchFilters, now)
        );
      }),
    [containers, statusFilter, attentionOnly, query, searchFilters, now]
  );
  const selected = containers.find((container) => container.containerCode === selectedCode);
  const activeCode = selected?.containerCode || '';
  const counts = useMemo(
    () =>
      containers.reduce(
        (result, container) => ({
          ...result,
          [container.status]: (result[container.status] || 0) + 1
        }),
        {}
      ),
    [containers]
  );
  const attentionCount = useMemo(
    () =>
      containers.filter((container) => containerOperationalIssues(container, now).length > 0)
        .length,
    [containers, now]
  );

  useEffect(() => {
    let cancelled = false;
    if (!activeCode) return undefined;
    setManifest({ code: activeCode, items: [], state: 'loading', error: '' });
    api
      .getContainerManifestItems(
        { containerCode: activeCode },
        { signal: AbortSignal.timeout?.(12000) }
      )
      .then((response) => {
        if (!cancelled)
          setManifest({ code: activeCode, items: asList(response), state: 'ready', error: '' });
      })
      .catch((failure) => {
        if (!cancelled)
          setManifest({
            code: activeCode,
            items: [],
            state: 'error',
            error: requestError(failure, 'Không tải được manifest.')
          });
      });
    return () => {
      cancelled = true;
    };
  }, [activeCode, manifestVersion]);

  const submitContainer = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError('');
    try {
      const company = catalogues.companies.find(
        (item) => item.id === containerForm.responsibleCompanyId
      );
      if (!company) throw new Error('Vui lòng chọn một công ty phụ trách hợp lệ.');
      const { eSealNumber, ...fields } = containerForm;
      const payload = {
        ...fields,
        containerCode: fields.containerCode.trim(),
        cscApprovalCountry: fields.cscApprovalCountry.trim() || null,
        cscApprovalReference: fields.cscApprovalReference.trim() || null,
        cscManufactureDate: fields.cscManufactureDate || null,
        cscInspectionScheme: fields.cscInspectionScheme || null,
        cscAcepProgramNumber:
          fields.cscInspectionScheme === 'ACEP' ? fields.cscAcepProgramNumber.trim() || null : null,
        cscNextExaminationDate:
          fields.cscInspectionScheme === 'PERIODIC' ? fields.cscNextExaminationDate || null : null,
        tareWeightTons: Number(fields.tareWeightTons),
        maxPayloadTons: Number(fields.maxPayloadTons),
        cubicCapacityM3: fields.cubicCapacityM3 === '' ? null : Number(fields.cubicCapacityM3),
        esealNumber: eSealNumber.trim() || null,
        telematicsModel: fields.telematicsModel.trim() || null,
        responsibleCompanyCode: company.companyCode,
        responsibleCompanyName: company.companyName
      };
      await api.createContainer(payload);
      setContainerForm(null);
      setQuery('');
      setStatusFilter('ALL');
      setAttentionOnly(false);
      setSearchFilters({ ...EMPTY_CONTAINER_FILTERS });
      await load();
    } catch (failure) {
      setFormError(requestError(failure, 'Không tạo được hồ sơ container.'));
    } finally {
      setSaving(false);
    }
  };

  const submitItem = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (
        itemForm.requiresColdChain &&
        !containers.find((container) => container.containerCode === itemTarget)?.isReefer
      ) {
        throw new Error('Hàng yêu cầu chuỗi lạnh cần được xếp vào container có thiết bị làm lạnh.');
      }
      const payload = {
        ...itemForm,
        itemCode: itemForm.itemCode.trim().toUpperCase(),
        deliveryLat: Number(itemForm.deliveryLat),
        deliveryLng: Number(itemForm.deliveryLng),
        weightKg: Number(itemForm.weightKg),
        parcelCount: Number(itemForm.parcelCount),
        requiredTempC: itemForm.requiresColdChain ? Number(itemForm.requiredTempC) : null
      };
      await api.createContainerManifestItem(itemTarget, payload);
      setItemForm(null);
      setManifestVersion((version) => version + 1);
    } catch (failure) {
      setFormError(requestError(failure, 'Không thêm được hàng hóa.'));
    } finally {
      setSaving(false);
    }
  };

  const openContainerForm = () => {
    setFormError('');
    setItemForm(null);
    setContainerForm({ ...EMPTY_CONTAINER });
  };
  const openItemForm = () => {
    if (itemForm && itemTarget === activeCode) return;
    setFormError('');
    setContainerForm(null);
    setItemTarget(activeCode);
    setItemForm({ ...EMPTY_ITEM, shipmentCode: selected?.assignedShipmentCode || '' });
  };
  const resetFilters = () => {
    setQuery('');
    setSearchFilters({ ...EMPTY_CONTAINER_FILTERS });
    setStatusFilter('ALL');
    setAttentionOnly(false);
  };
  const activeManifest =
    manifest.code === activeCode ? manifest : { items: [], state: 'loading', error: '' };
  const unavailable = loading || (error && containers.length === 0);

  return (
    <div className="page-body container-page">
      <header className="container-page-header">
        <div>
          <div className="eyebrow">Tài sản vận tải / Container & Manifest</div>
          <h1>Quản lý Container</h1>
          <p>Quản lý thiết bị, xe vận chuyển, đơn vị phụ trách và hàng hóa tại một nơi.</p>
        </div>
        <div className="container-page-actions">
          <button
            type="button"
            className="container-icon-button"
            title="Tải lại dữ liệu"
            aria-label="Tải lại dữ liệu"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'container-spin' : ''} />
          </button>
          {!selectedCode && canManage && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={openContainerForm}
              disabled={saving}
              aria-expanded={!!containerForm}
              aria-haspopup="dialog"
            >
              <Plus size={17} /> Tạo container
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className="container-notice container-notice-error" role="alert">
          {error}
          <button type="button" className="container-text-button" onClick={load}>
            Thử tải lại
          </button>
        </div>
      )}
      {catalogueWarning && (
        <div className="container-notice" role="status">
          {catalogueWarning}
        </div>
      )}
      {!selectedCode && (
        <section className="container-statistics" aria-label="Thống kê container">
          <button
            type="button"
            className={'card container-statistic' + (statusFilter === 'ALL' ? ' is-active' : '')}
            onClick={() => {
              setStatusFilter('ALL');
              setAttentionOnly(false);
            }}
            aria-pressed={statusFilter === 'ALL'}
          >
            <span>Tổng container</span>
            <strong>{unavailable ? '—' : containers.length}</strong>
          </button>
          <button
            type="button"
            className={
              'card container-statistic container-statistic-attention' +
              (attentionOnly ? ' is-active' : '')
            }
            title="Thiếu thông tin điều phối, thiết bị/GPS chậm, thiếu dữ liệu nhiệt hoặc niêm phong báo lỗi"
            onClick={() => setAttentionOnly((active) => !active)}
            aria-pressed={attentionOnly}
          >
            <span>
              <AlertTriangle size={13} /> Cần chú ý
            </span>
            <strong>{unavailable ? '—' : attentionCount}</strong>
          </button>
          {Object.entries(CONTAINER_STATUSES).map(([status, definition]) => (
            <button
              type="button"
              key={status}
              className={'card container-statistic' + (statusFilter === status ? ' is-active' : '')}
              onClick={() => {
                setStatusFilter(status);
                setAttentionOnly(false);
              }}
              aria-pressed={statusFilter === status}
            >
              <span>
                <i className={'container-dot container-tone-' + definition.tone} />
                {definition.label}
              </span>
              <strong>{unavailable ? '—' : counts[status] || 0}</strong>
            </button>
          ))}
          <div className="card container-statistic">
            <span>
              <Truck size={13} /> Đầu kéo sẵn sàng
            </span>
            <strong>
              {loading || !vehicleCountAvailable
                ? '—'
                : catalogues.vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length}
            </strong>
          </div>
        </section>
      )}
      {containerForm && (
        <ContainerCreateCard
          form={containerForm}
          setForm={setContainerForm}
          companies={catalogues.companies}
          onClose={() => setContainerForm(null)}
          onSubmit={submitContainer}
          saving={saving}
          error={formError}
        />
      )}
      <div className="container-sync-status">
        {offline
          ? 'Trình duyệt ngoại tuyến'
          : error
            ? 'Chưa tải được dữ liệu mới'
            : 'Kiểm tra cập nhật mỗi 30 giây'}
        {lastSuccessAt && ` · Lần tải gần nhất ${formatDate(lastSuccessAt)}`}
      </div>

      {/* DANH SÁCH CONTAINER (Luôn hiển thị trên nền làm việc chính) */}
      <section className="card container-list-card" aria-label="Danh sách container">
        <div className="container-list-heading">
          <div>
            <h2>Danh sách container</h2>
            <p>
              Đối chiếu phân công, hành trình, tín hiệu thiết bị và GPS để ưu tiên chuyến cần xử lý.
            </p>
          </div>
          <span role="status" aria-live="polite">
            {loading
              ? 'Đang tải…'
              : filteredContainers.length +
                ' / ' +
                containers.length +
                (attentionOnly ? ' · chỉ mục cần chú ý' : '')}
          </span>
        </div>
        <div className="container-filters">
          <SearchField
            id="container-search"
            label="Tìm kiếm"
            value={query}
            onValueChange={setQuery}
            placeholder="Mã container, vận đơn, xe, tài xế, chủ sở hữu, ISO, seal…"
            hint="Tìm không dấu; có thể kết hợp nhiều từ khóa, ví dụ: Cát Lái 51C."
            aria-label="Tìm container"
          />
          <div className="container-filter-group">
            <label className="container-filter-label" htmlFor="container-status">
              Trạng thái vận hành
            </label>
            <div className="container-select-control">
              <select
                id="container-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Lọc trạng thái container"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(CONTAINER_STATUSES).map(([status, definition]) => (
                  <option key={status} value={status}>
                    {definition.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} aria-hidden="true" />
            </div>
          </div>
          {(query || statusFilter !== 'ALL' || attentionOnly || hasAdvancedFilters) && (
            <button
              type="button"
              className="container-text-button container-reset"
              onClick={resetFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
        <ContainerSearchFilters filters={searchFilters} onChange={setSearchFilters} />
        <div className="container-list-results" aria-busy={loading}>
          {loading ? (
            <p className="container-empty" role="status">
              Đang tải container…
            </p>
          ) : error && containers.length === 0 ? (
            <div className="container-empty">
              <Box size={28} />
              <h3>Chưa tải được dữ liệu</h3>
              <p>Hãy thử tải lại danh sách container.</p>
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="container-empty">
              <Search size={28} />
              <h3>{containers.length ? 'Không tìm thấy container' : 'Chưa có container'}</h3>
              <p>
                {containers.length
                  ? attentionOnly && !query && statusFilter === 'ALL' && !hasAdvancedFilters
                    ? 'Không có điểm cần chú ý theo dữ liệu hiện có.'
                    : 'Thử thay đổi từ khóa hoặc bộ lọc trạng thái.'
                  : 'Tạo hồ sơ đầu tiên để bắt đầu quản lý.'}
              </p>
              {containers.length > 0 && (
                <button type="button" className="container-text-button" onClick={resetFilters}>
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="container-table-wrapper">
              <table className="container-fleet-table" role="table">
                <thead>
                  <tr>
                    <th scope="col">Container</th>
                    <th scope="col">Phân công</th>
                    <th scope="col">Chuyến & hành trình</th>
                    <th scope="col">Vận hành</th>
                    <th scope="col">Theo dõi</th>
                    <th scope="col">Điểm cần chú ý</th>
                    <th scope="col">Hồ sơ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContainers.map((container) => (
                    <tr
                      key={container.containerCode}
                      className={
                        selectedCode === container.containerCode ? 'container-row-active' : ''
                      }
                      onClick={() => {
                        setContainerForm(null);
                        setSelectedCode(container.containerCode);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <th scope="row">
                        <div className="container-cell-code-stack">
                          <span className="container-code-chip">
                            <Box size={14} />
                            <strong>{container.containerCode}</strong>
                          </span>
                          <div className="container-type-chip-row">
                            <span className="container-type-chip">
                              {CONTAINER_TYPES[container.containerType] || container.containerType}
                            </span>
                            {container.isReefer && (
                              <span className="container-reefer-chip">
                                <Snowflake size={11} /> Chuỗi lạnh
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                      <td data-label="Phân công">
                        <div className="container-list-cell-stack">
                          <span className="container-company-name">
                            <Building2 size={12} />{' '}
                            {container.responsibleCompanyName || 'Chưa có đơn vị phụ trách'}
                          </span>
                          <span className="container-plate-badge">
                            <Truck size={12} /> {container.vehicleLicensePlate || 'Chưa gán xe'}
                          </span>
                          <span className="container-driver-badge">
                            <UserRound size={12} /> {container.driverName || 'Chưa gán tài xế'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Chuyến & hành trình">
                        <div className="container-list-cell-stack">
                          <span className="container-shipment-pill">
                            <Package size={12} />{' '}
                            {container.assignedShipmentCode || 'Chưa gán vận đơn'}
                          </span>
                          <div className="container-route-stack">
                            <span className="route-point origin">
                              {container.originName || 'Chưa có điểm đi'}
                            </span>
                            <span className="route-arrow-icon" aria-hidden="true">
                              →
                            </span>
                            <span className="route-point destination">
                              {container.destinationName || 'Chưa có điểm đến'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Vận hành">
                        <ContainerStatus status={container.status} />
                      </td>
                      <td data-label="Theo dõi">
                        <div className="container-list-cell-stack">
                          <ContainerConnectionBadge container={container} now={now} />
                          <span className="container-location-badge">
                            <MapPin size={12} /> {container.lastLocationName || 'Chưa có vị trí'}
                          </span>
                          <div className="container-telemetry-row">
                            <span className="telemetry-sub">
                              GPS · {formatSignalAge(container.lastPositionReceivedAt, now)}
                            </span>
                            <span className="telemetry-sub">
                              Thiết bị · {formatSignalAge(container.lastTelemetryReceivedAt, now)}
                            </span>
                            {container.lastLocationName && (
                              <span className="telemetry-sub">
                                Vị trí · {formatSignalAge(container.lastLocationNameAt, now)}
                              </span>
                            )}
                          </div>
                          {container.lastProgressAt ? (
                            <span className="container-progress-tag">
                              Tiến độ {formatNumber(container.progressPct, '%')} ·{' '}
                              {formatSignalAge(container.lastProgressAt, now)}
                            </span>
                          ) : (
                            <span className="telemetry-sub">
                              Chưa có tiến độ GPS được đóng dấu thời gian
                            </span>
                          )}
                          {container.lastEtaAt && container.etaMinutes != null && (
                            <span className="container-progress-tag">
                              ETA {formatNumber(container.etaMinutes, ' phút')} ·{' '}
                              {formatSignalAge(container.lastEtaAt, now)}
                            </span>
                          )}
                          {container.isReefer && (
                            <span className="telemetry-sub">
                              Nhiệt cấp / hồi: {formatNumber(container.supplyAirTempC, ' °C')} /{' '}
                              {formatNumber(container.returnAirTempC, ' °C')}
                              {' · '}cấp {formatSignalAge(container.lastSupplyAirTempAt, now)}
                              {' · '}hồi {formatSignalAge(container.lastReturnAirTempAt, now)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Điểm cần chú ý">
                        <ContainerAttention
                          code={container.containerCode}
                          issues={containerOperationalIssues(container, now)}
                        />
                      </td>
                      <td>
                        <button
                          id={'open-container-' + container.containerCode}
                          className="btn btn-secondary container-open-detail-btn"
                          type="button"
                          aria-label={'Thông tin chi tiết ' + container.containerCode}
                          onClick={() => {
                            setContainerForm(null);
                            setSelectedCode(container.containerCode);
                          }}
                        >
                          Thông tin chi tiết <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CARD ĐÈ LÊN TRANG (Modal Overlay Card Drawer) */}
      {selectedCode && (
        <div
          className="container-modal-backdrop"
          onClick={() => {
            returnCode.current = selectedCode;
            setItemForm(null);
            setSelectedCode('');
          }}
          role="presentation"
        >
          <div
            className="container-modal-card-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={'Chi tiết container ' + (selected?.containerCode || activeCode)}
          >
            <header className="container-modal-topbar">
              <button
                ref={detailHeading}
                className="container-back-link"
                type="button"
                onClick={() => {
                  returnCode.current = selectedCode;
                  setItemForm(null);
                  setSelectedCode('');
                }}
              >
                <ArrowLeft size={16} />
                <span>Quay lại danh sách</span>
              </button>
              <div className="dispatch-window-context">
                <Boxes size={15} />
                <span>Bàn điều hành container</span>
                <span className="dispatch-window-separator">/</span>
                <strong>{activeCode}</strong>
              </div>
              <div className="container-modal-topbar-right">
                <button
                  type="button"
                  className="container-modal-close-icon-btn"
                  aria-label="Đóng chi tiết container"
                  onClick={() => {
                    returnCode.current = selectedCode;
                    setItemForm(null);
                    setSelectedCode('');
                  }}
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            {/* Scrollable body with ContainerDetails */}
            <div className="container-modal-content-body">
              {selected ? (
                <ContainerDetails
                  key={activeCode}
                  container={selected}
                  items={activeManifest.items}
                  manifestState={activeManifest.state}
                  manifestError={activeManifest.error}
                  onRetryManifest={() => setManifestVersion((version) => version + 1)}
                  manifestEditor={
                    itemForm && (
                      <ManifestCreateCard
                        containerCode={itemTarget}
                        form={itemForm}
                        setForm={setItemForm}
                        hubs={catalogues.hubs}
                        onClose={() => setItemForm(null)}
                        onSubmit={submitItem}
                        saving={saving}
                        error={formError}
                      />
                    )
                  }
                  onAddItem={openItemForm}
                  canManage={canManage}
                  role={role}
                  companies={catalogues.companies}
                  hubs={catalogues.hubs}
                  now={now}
                  onRefresh={refreshContainers}
                  synchronization={{ state: offline ? 'offline' : error ? 'error' : 'ready' }}
                />
              ) : (
                <p className="container-empty">Container không còn trong danh sách.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
