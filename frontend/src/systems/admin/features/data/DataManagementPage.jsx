import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldAlert,
  XCircle
} from 'lucide-react';
import { api } from '../../../../services/api';
import './data-management.css';

const sourceOf = (response) => response?.result ?? response?.data ?? response;
const DATASETS = [
  { key: 'users', name: 'Tài khoản & IAM', service: 'Identity', group: 'Danh tính', sensitivity: 'Định danh', action: 'Quản lý tài khoản', path: '/admin/users', get: () => api.getUsers() },
  { key: 'staff', name: 'Hồ sơ nhân sự & tuân thủ', service: 'Identity', group: 'Danh tính', sensitivity: 'PII / sức khỏe / GPLX', action: 'Nhân viên theo vai trò', path: '/admin/staff', get: () => api.getStaff() },
  { key: 'branches', name: 'Chi nhánh', service: 'Identity', group: 'Danh tính', sensitivity: 'Nội bộ', action: 'Quản lý chi nhánh', path: '/admin/branches', get: () => api.getBranches() },
  { key: 'companies', name: 'Công ty & đối tác', service: 'Identity', group: 'Danh tính', sensitivity: 'Pháp lý doanh nghiệp', action: 'Quản lý công ty', path: '/admin/companies', get: () => api.getCompanies() },
  { key: 'drivers', name: 'Hồ sơ lái xe / GPLX', service: 'Asset', group: 'Đội xe', sensitivity: 'PII / GPLX / HOS', action: 'Danh sách lái xe', path: '/admin/drivers', get: () => api.getDrivers() },
  { key: 'vehicles', name: 'Phương tiện', service: 'Asset', group: 'Đội xe', sensitivity: 'Tài sản vận hành', action: 'An toàn & Pre-trip', path: '/governance', get: () => api.getVehicles() },
  { key: 'containers', name: 'Container', service: 'Asset', group: 'Đội xe', sensitivity: 'Vận đơn / hàng hóa', action: 'Quản lý container', path: '/containers', get: () => api.getContainers() },
  { key: 'shipments', name: 'Vận đơn', service: 'Shipment', group: 'Vận tải', sensitivity: 'Khách hàng / hàng hóa', action: 'Danh sách vận đơn', path: '/shipments', get: () => api.getShipments() },
  { key: 'trips', name: 'Chuyến & theo dõi', service: 'Tracking', group: 'Vận tải', sensitivity: 'Vị trí / lộ trình', action: 'Theo dõi chuyến', path: '/operations/tracking', get: () => api.getTrips() },
  { key: 'incidents', name: 'Sự cố & xử lý', service: 'Incident', group: 'An toàn', sensitivity: 'An toàn cá nhân', action: 'An toàn & sự cố', path: '/governance', get: () => api.getIncidents() },
  { key: 'contracts', name: 'Hợp đồng & SLA', service: 'Payment', group: 'Tài chính', sensitivity: 'Hợp đồng / thương mại', action: 'Bảng điều hành', path: '/portal', get: () => api.getContracts() },
  { key: 'payments', name: 'Thanh toán & chứng từ', service: 'Payment', group: 'Tài chính', sensitivity: 'Tài chính / chứng từ', action: 'Bảng điều hành', path: '/portal', get: () => api.getPayments() },
  { key: 'notifications', name: 'Thông báo vận hành', service: 'Notification', group: 'Điều hành', sensitivity: 'Nội bộ', action: 'Bảng điều hành', path: '/portal', get: () => api.getNotifications() },
  { key: 'manifest', name: 'Manifest hàng hóa', service: 'Asset / Hub', group: 'Đội xe', sensitivity: 'Hàng hóa / người nhận', action: 'Container', path: '/containers' },
  { key: 'routes', name: 'Phiên bản lộ trình', service: 'Routing', group: 'Vận tải', sensitivity: 'Hành trình', action: 'Vận đơn', path: '/shipments' },
  { key: 'carbon', name: 'Tính toán phát thải', service: 'Carbon', group: 'Vận tải', sensitivity: 'Đầu vào / hệ số', action: 'Carbon', path: '/benchmark' },
  { key: 'inspections', name: 'Biên bản Pre-trip', service: 'Asset', group: 'An toàn', sensitivity: 'An toàn / tài xế', action: 'An toàn', path: '/governance' },
  { key: 'applications', name: 'Ứng tuyển', service: 'Identity', group: 'Danh tính', sensitivity: 'Hồ sơ nhân sự', action: 'Ứng tuyển', path: '/admin/applications' },
  { key: 'hubs', name: 'Điểm giao nhận', service: 'Hub', group: 'Điều hành', sensitivity: 'Nội bộ', action: 'Container', path: '/containers' },
  { key: 'hubAccounts', name: 'Tài khoản Hub', service: 'Identity / Hub', group: 'Danh tính', sensitivity: 'Danh tính', action: 'Tài khoản', path: '/admin/users' },
  { key: 'outbox', name: 'Sự kiện chờ phát', service: 'Shipment', group: 'Điều hành', sensitivity: 'Nội bộ', action: 'Vận đơn', path: '/shipments' },
  { key: 'sagas', name: 'Giao dịch điều phối', service: 'Shipment', group: 'Điều hành', sensitivity: 'Vận hành', action: 'Vận đơn', path: '/shipments' }

];

const GROUPS = ['Danh tính', 'Đội xe', 'Vận tải', 'An toàn', 'Tài chính', 'Điều hành'];

export default function DataManagementPage() {
  const [checks, setChecks] = useState({});
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [serviceHealth, setServiceHealth] = useState({ state: 'loading', services: [] });

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.getDataInventory(),
      api.getDiscoveredServiceHealth()
    ]);
    const inventory = results[0];
    if (inventory.status === 'fulfilled') {
      const payload = sourceOf(inventory.value);
      setRecords(payload.datasets || {});
      setChecks(payload.checks || {});
    } else {
      setRecords(Object.fromEntries(DATASETS.map(({ key }) => [key, { state: 'unavailable', count: null }])));
      setChecks({});
    }
    const runtime = results[1];
    if (runtime.status === 'fulfilled') {
      setServiceHealth({ state: 'available', ...sourceOf(runtime.value) });
    } else {
      setServiceHealth({ state: 'unavailable', services: [], error: 'Chưa đọc được registry / health' });
    }
    setLastCheckedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const summary = useMemo(() => {
    const values = Object.values(records);
    return {
      available: values.filter((value) => value.state === 'available').length,
      unavailable: values.filter((value) => value.state === 'unavailable').length,
      unknown: values.filter((value) => value.state === 'unknown').length
    };
  }, [records]);


  return (
    <div className="page-body data-management-page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">QUẢN TRỊ NỘI BỘ / KIỂM SOÁT DỮ LIỆU</div>
          <h1>Danh mục dữ liệu hệ thống</h1>
          <p>Đọc số lượng từ cơ sở dữ liệu dùng chung; trạng thái lỗi hoặc chưa có API được hiển thị riêng.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} /> {loading ? 'Đang kiểm tra…' : 'Kiểm tra lại nguồn dữ liệu'}
        </button>
      </div>

      <div className="data-management-summary" aria-live="polite">
        <article><strong>{summary.available}</strong><span>nguồn dữ liệu có thể đọc</span></article>
        <article className={summary.unavailable ? 'has-alert' : ''}><strong>{summary.unavailable}</strong><span>nguồn chưa truy cập được</span></article>
        <article className={summary.unknown ? 'has-alert' : ''}><strong>{summary.unknown}</strong><span>nguồn có response nhưng chưa đếm được</span></article>
        <p>{lastCheckedAt ? `Kiểm tra lần cuối ${lastCheckedAt.toLocaleString('vi-VN')}` : 'Chưa có lần kiểm tra'}</p>
      </div>

      {!loading && summary.unavailable > 0 && (
        <div className="data-management-alert" role="alert">
          <XCircle size={18} />
          <span>{summary.unavailable} nguồn dữ liệu không trả lời. Không kết luận tổng dữ liệu toàn hệ thống đã được kiểm soát khi một service chưa truy cập được.</span>
        </div>
      )}

      <p role="note">Phạm vi hiện tại gồm PostgreSQL dùng chung và Eureka/Actuator. Chưa xác minh nội dung MongoDB, Redis, độ trễ Kafka, bản sao lưu, phục hồi và kho tệp. Số lượng bản ghi chỉ là kiểm kê dữ liệu.</p>
      <section className="data-integrity-panel" aria-label="Cảnh báo dữ liệu tuân thủ">
        <div><ShieldAlert size={19} /><h2>Đối chiếu hồ sơ nhân sự</h2></div>
        <p>
          {checks.pendingDrivers != null
            ? `${checks.pendingDrivers} tài xế đang chờ duyệt · ${checks.expiredLicenses} hồ sơ tài xế có GPLX quá hạn · ${checks.deletedUsers} tài khoản đã xóa mềm.`
            : 'Chưa tải được danh bạ nhân sự để kiểm tra tình trạng GPLX và duyệt nghiệp vụ.'}
        </p>
        <Link to="/admin/drivers">Mở hồ sơ lái xe <ArrowUpRight size={14} /></Link>
        {records.drivers?.state === 'available' && <p>{checks.unlinkedDrivers ?? "Chưa xác minh"} hồ sơ chưa đạt đối chiếu điều kiện phân công.</p>}
      </section>

      <section className="data-group" aria-label="Tình trạng service đang chạy">
        <h2><CheckCircle2 size={17} /> Service đang chạy</h2>
        {serviceHealth.state === 'unavailable' ? (
          <div className="data-management-alert" role="alert"><XCircle size={18} /> Không tải được registry / health tổng hợp: {serviceHealth.error}</div>
        ) : (
          <>
            <p className="data-inventory-note">Đọc Eureka registry và Actuator health của từng instance; không coi service chưa đăng ký là đang chạy.</p>
            <div className="data-service-grid">
              {(serviceHealth.services || []).map((service) => (
                <article className={`data-service-card status-${String(service.status || 'unknown').toLowerCase()}`} key={service.serviceId}>
                  <strong>{service.serviceId}</strong>
                  <span>{service.status}</span>
                  <small>{service.healthyInstances || 0}/{service.instances || 0} instance khỏe</small>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {GROUPS.map((group) => {
        const datasets = DATASETS.filter((dataset) => dataset.group === group);
        return (
          <section className="data-group" key={group}>
            <h2><Database size={17} /> {group}</h2>
            <div className="data-group-grid">
              {datasets.map((dataset) => {
                const record = records[dataset.key];
                const state = record?.state || (loading ? 'loading' : 'unknown');
                return (
                  <article className={`data-source-card data-source-${state}`} key={dataset.key}>
                    <div className="data-source-topline">
                      <span>{dataset.service}</span>
                      {state === 'available' ? <CheckCircle2 size={16} /> : state === 'unavailable' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <h3>{dataset.name}</h3>
                    <div className="data-source-count">
                      {state === 'available' ? record.count.toLocaleString('vi-VN') : state === 'loading' ? '…' : state === 'unavailable' ? 'Không truy cập được' : 'Chưa xác định'}
                    </div>
                    <p>{state === 'unavailable' ? record.error : 'Nguồn dữ liệu do service nghiệp vụ quản lý'}</p>
                    <Link to={dataset.path}>{dataset.action} <ArrowUpRight size={14} /></Link>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="data-coverage-note">
        <h2>Phạm vi kiểm soát trong màn hình này</h2>
        <p>Đây là kiểm kê số lượng bản ghi theo nguồn. Các bảng nghiệp vụ và audit phải sửa qua chức năng của service chủ quản để giữ kiểm tra quyền, lịch sử, khóa ngoại và tính nhất quán.</p>
        <p>Chưa kiểm kê route candidates, lịch sử giao sự kiện, Redis session/cache, độ trễ Kafka, MongoDB chat, việc gửi thông báo, kho chứng từ và khả năng phục hồi bản sao lưu.</p>
        <p>Kiến trúc repo hiện dùng chung PostgreSQL database cho nhiều business service; sơ đồ tham khảo thể hiện database-per-service. Registry/Actuator coverage chỉ quan sát runtime của service đăng ký, không thay thế đối soát đầy đủ dữ liệu, migration, backup/restore, log/audit hoặc quyền đọc từng bảng.</p>
      </section>
    </div>
  );
}
