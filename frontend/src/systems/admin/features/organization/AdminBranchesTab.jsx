import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  MapPin,
  Phone,
  PlusCircle,
  RotateCcw,
  Trash2,
  Truck,
  Users,
  XCircle
} from 'lucide-react';
import { SearchToolbar } from '../../../../shared/components/ui/SharedPrimitives';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import { formatCompactVnd, formatMillionVnd, formatVnd } from '../../../../utils/formatters';
import { api } from '../../../../services/api';
import {
  getLocalBranches,
  getLocalStaff,
  saveLocalBranches,
  saveLocalStaff
} from '../../../../utils/adminOrgSync';

const EMPTY_BRANCH_FORM = {
  id: null,
  branchCode: '',
  branchName: '',
  region: 'MIEN_NAM',
  branchType: 'REGIONAL_HUB',
  city: '',
  address: '',
  phone: '',
  email: '',
  managerUsername: '',
  managerName: '',
  vehicleCapacity: 40,
  monthlyRevenueTargetVnd: 900000000,
  status: 'ACTIVE'
};

const REGION_LABELS = {
  ALL: 'Tất cả vùng',
  MIEN_BAC: 'Miền Bắc',
  MIEN_TRUNG: 'Miền Trung',
  MIEN_NAM: 'Miền Nam'
};

const BRANCH_TYPE_LABELS = {
  HEADQUARTERS: 'Trụ sở chính (HQ)',
  HUB_GATEWAY: 'Hub Gateway',
  DEPOT_EV: 'Depot Xe Điện EV',
  REGIONAL_HUB: 'Trạm trung chuyển'
};

const STATUS_BADGE = {
  ACTIVE: 'badge-green',
  MAINTENANCE: 'badge-amber',
  INACTIVE: 'badge-red'
};

function generateClientUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `br-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function AdminBranchesTab({ isAdmin = true, onBranchesChanged }) {
  const [branches, setBranches] = useState(() => getLocalBranches(true));
  const [staffList, setStaffList] = useState(() => getLocalStaff(false));
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [showDeleted, setShowDeleted] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const [inspectBranchId, setInspectBranchId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [brRes, stRes] = await Promise.all([
        api.getBranches({ includeDeleted: true }),
        api.getStaff({ includeDeleted: false })
      ]);
      const remoteBranches = brRes?.result ?? brRes?.data ?? brRes;
      const remoteStaff = stRes?.result ?? stRes?.data ?? stRes;
      if (Array.isArray(remoteBranches) && remoteBranches.length > 0) {
        const synced = saveLocalBranches(remoteBranches);
        setBranches(synced);
        if (onBranchesChanged) onBranchesChanged(synced);
      }
      if (Array.isArray(remoteStaff)) {
        saveLocalStaff(remoteStaff);
        setStaffList(remoteStaff.filter((s) => !s.isDeleted));
      }
    } catch {
      const localBranches = getLocalBranches(true);
      setBranches(localBranches);
      setStaffList(getLocalStaff(false));
      if (onBranchesChanged) onBranchesChanged(localBranches);
    }
  }, [onBranchesChanged]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeBranches = useMemo(() => branches.filter((b) => !b.isDeleted), [branches]);
  const deletedBranchesCount = useMemo(
    () => branches.filter((b) => Boolean(b.isDeleted)).length,
    [branches]
  );

  const totalVehicleCapacity = useMemo(
    () => activeBranches.reduce((sum, b) => sum + Number(b.vehicleCapacity || 0), 0),
    [activeBranches]
  );

  const totalTargetRevenue = useMemo(
    () => activeBranches.reduce((sum, b) => sum + Number(b.monthlyRevenueTargetVnd || 0), 0),
    [activeBranches]
  );

  const visiblePool = useMemo(() => {
    return branches.filter((b) => {
      if (showDeleted ? !b.isDeleted : Boolean(b.isDeleted)) return false;
      if (regionFilter !== 'ALL' && b.region !== regionFilter) return false;
      return true;
    });
  }, [branches, regionFilter, showDeleted]);

  const elasticResult = useMemo(
    () =>
      elasticSearchMatch(visiblePool, searchQuery, [
        'branchCode',
        'branchName',
        'city',
        'region',
        'branchType',
        'managerName',
        'managerUsername',
        'phone'
      ]),
    [visiblePool, searchQuery]
  );

  const handleEditClick = (branch) => {
    setFeedback(null);
    setBranchForm({
      id: branch.id,
      branchCode: branch.branchCode || '',
      branchName: branch.branchName || '',
      region: branch.region || 'MIEN_NAM',
      branchType: branch.branchType || 'REGIONAL_HUB',
      city: branch.city || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      managerUsername: branch.managerUsername || '',
      managerName: branch.managerName || '',
      vehicleCapacity: Number(branch.vehicleCapacity || 0),
      monthlyRevenueTargetVnd: Number(branch.monthlyRevenueTargetVnd || 0),
      status: branch.status || 'ACTIVE'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFeedback(null);
    const code = String(branchForm.branchCode || '').trim().toUpperCase();
    const name = String(branchForm.branchName || '').trim();
    const city = String(branchForm.city || '').trim();
    if (!code || !name || !city) {
      setFeedback({ ok: false, message: 'Vui lòng nhập đầy đủ Mã chi nhánh, Tên chi nhánh và Tỉnh/Thành phố.' });
      return;
    }

    const payload = {
      branchCode: code,
      branchName: name,
      region: branchForm.region,
      branchType: branchForm.branchType,
      city,
      address: branchForm.address?.trim() || null,
      phone: branchForm.phone?.trim() || null,
      email: branchForm.email?.trim() || null,
      managerUsername: branchForm.managerUsername?.trim() || null,
      managerName: branchForm.managerName?.trim() || null,
      vehicleCapacity: Math.max(0, Number(branchForm.vehicleCapacity || 0)),
      monthlyRevenueTargetVnd: Math.max(0, Number(branchForm.monthlyRevenueTargetVnd || 0)),
      status: branchForm.status || 'ACTIVE'
    };

    setSaving(true);
    try {
      let savedRecord = null;
      try {
        const res = branchForm.id
          ? await api.updateBranch(branchForm.id, payload)
          : await api.createBranch(payload);
        savedRecord = res?.result ?? res?.data ?? res;
      } catch (apiErr) {
        if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
          throw apiErr;
        }
        // Offline / local sandbox CRUD fallback
        const current = getLocalBranches(true);
        if (branchForm.id) {
          const updatedList = current.map((item) =>
            item.id === branchForm.id ? { ...item, ...payload, branchCode: item.branchCode } : item
          );
          saveLocalBranches(updatedList);
          savedRecord = updatedList.find((i) => i.id === branchForm.id);
        } else {
          if (current.some((i) => i.branchCode.toUpperCase() === code)) {
            throw new Error(`Mã chi nhánh ${code} đã tồn tại trong hệ thống.`);
          }
          savedRecord = {
            ...payload,
            id: generateClientUuid(),
            activeStaffCount: 0,
            isDeleted: false
          };
          saveLocalBranches([savedRecord, ...current]);
        }
      }

      if (savedRecord?.id) {
        const current = getLocalBranches(true);
        const exists = current.some((b) => b.id === savedRecord.id);
        const merged = exists
          ? current.map((b) => (b.id === savedRecord.id ? { ...b, ...savedRecord } : b))
          : [savedRecord, ...current];
        const synced = saveLocalBranches(merged);
        setBranches(synced);
        if (onBranchesChanged) onBranchesChanged(synced);
      } else {
        await loadData();
      }

      setFeedback({
        ok: true,
        message: branchForm.id
          ? `Đã cập nhật chi nhánh "${name}" (${savedRecord?.branchCode || code}).`
          : `Đã khởi tạo chi nhánh mới "${name}" (${code}).`
      });
      setBranchForm(EMPTY_BRANCH_FORM);
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể lưu chi nhánh.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (branch) => {
    setFeedback(null);
    if (branch.branchCode === 'BR-HCM-HQ') {
      setFeedback({ ok: false, message: 'Không thể xóa Trụ sở chính BR-HCM-HQ đang vận hành.' });
      return;
    }
    try {
      try {
        await api.softDeleteBranch(branch.id);
      } catch (apiErr) {
        if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
          throw apiErr;
        }
      }
      const next = saveLocalBranches(
        getLocalBranches(true).map((item) =>
          item.id === branch.id
            ? { ...item, isDeleted: true, status: 'INACTIVE', deletedAt: new Date().toISOString() }
            : item
        )
      );
      setBranches(next);
      if (onBranchesChanged) onBranchesChanged(next);
      setFeedback({
        ok: true,
        message: `Đã xóa mềm chi nhánh ${branch.branchCode} (có thể khôi phục từ Thùng rác).`
      });
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể xóa mềm chi nhánh.' });
    }
  };

  const handleRestore = async (branch) => {
    setFeedback(null);
    try {
      try {
        await api.restoreBranch(branch.id);
      } catch (apiErr) {
        if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
          throw apiErr;
        }
      }
      const next = saveLocalBranches(
        getLocalBranches(true).map((item) =>
          item.id === branch.id
            ? { ...item, isDeleted: false, status: 'ACTIVE', deletedAt: null }
            : item
        )
      );
      setBranches(next);
      if (onBranchesChanged) onBranchesChanged(next);
      setFeedback({ ok: true, message: `Đã khôi phục hoạt động chi nhánh ${branch.branchCode}.` });
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể khôi phục chi nhánh.' });
    }
  };

  const inspectedBranch = branches.find((b) => b.id === inspectBranchId) || null;
  const inspectedBranchStaff = inspectedBranch
    ? staffList.filter(
        (s) => s.branchId === inspectedBranch.id || s.branchCode === inspectedBranch.branchCode
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Summary Row */}
      <div className="grid-4">
        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Chi Nhánh Hoạt Động</div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>
              {activeBranches.length}
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Trụ sở, Hub Gateway &amp; Depot EV
            </span>
          </div>
          <Building2 size={28} color="#38bdf8" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Tổng Sức Chứa Đội Xe</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {totalVehicleCapacity} <span style={{ fontSize: '0.95rem' }}>Slot</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Bãi đỗ &amp; trụ sạc toàn mạng lưới
            </span>
          </div>
          <Truck size={28} color="#10b981" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Chỉ Tiêu Doanh Thu Tháng</div>
            <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.32rem' }}>
              {formatCompactVnd(totalTargetRevenue)}
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {formatVnd(totalTargetRevenue, 'VNĐ')} / tháng
            </span>
          </div>
          <MapPin size={28} color="#f59e0b" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Nhân Sự Thuộc Chi Nhánh</div>
            <div className="stat-value" style={{ color: '#a855f7' }}>
              {staffList.length}
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Đang phân bổ tại {activeBranches.length} điểm cầu
            </span>
          </div>
          <Users size={28} color="#a855f7" />
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: feedback.ok ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedback.ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: feedback.ok ? '#10b981' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          {feedback.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="layout-split-14-10">
        {/* Left: Branches Directory Table */}
        <div className="card glass-card-interactive" style={{ marginBottom: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700 }}>
                Danh Sách Chi Nhánh &amp; Hub Mạng Lưới CCADRO
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Quản lý trụ sở, bãi xe Depot EV, sức chứa đội xe và định mức doanh thu từng vùng
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleted((v) => !v)}
              className={`btn ${showDeleted ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              <Trash2 size={13} />
              <span>
                {showDeleted
                  ? `Đang xem Thùng rác (${deletedBranchesCount})`
                  : `Thùng rác (${deletedBranchesCount})`}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {Object.entries(REGION_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRegionFilter(key)}
                className={`btn ${regionFilter === key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '5px 10px' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <SearchToolbar
              value={searchQuery}
              onChange={setSearchQuery}
              label="Tìm chi nhánh"
              placeholder="Mã chi nhánh, tên hub hoặc tỉnh thành…"
              totalCount={visiblePool.length}
              matchedCount={elasticResult.items.length}
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã / Tên Chi Nhánh</th>
                  <th>Khu Vực &amp; Loại Hình</th>
                  <th>Trưởng Chi Nhánh</th>
                  <th>Định Mức &amp; Nhân Sự</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {elasticResult.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không tìm thấy chi nhánh phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  elasticResult.items.map((b) => (
                    <tr key={b.id || b.branchCode}>
                      <td>
                        <code style={{ color: '#38bdf8', fontWeight: 700 }}>{b.branchCode}</code>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 2 }}>
                          {b.branchName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {b.city} {b.phone ? `• ${b.phone}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                          {REGION_LABELS[b.region] || b.region}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {BRANCH_TYPE_LABELS[b.branchType] || b.branchType}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {b.managerName || 'Chưa gán'}
                        </div>
                        {b.managerUsername && (
                          <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            @{b.managerUsername}
                          </code>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#f59e0b' }}>
                          {formatMillionVnd(b.monthlyRevenueTargetVnd)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {b.vehicleCapacity || 0} xe • {b.activeStaffCount || 0} nhân sự
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[b.status] || 'badge-blue'}`}>
                          {b.isDeleted ? 'DELETED' : b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setInspectBranchId(b.id)}
                            title="Xem chi tiết chi nhánh & nhân sự"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            <Eye size={13} />
                          </button>
                          {!b.isDeleted && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(b)}
                              title="Chỉnh sửa chi nhánh"
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {!b.isDeleted && isAdmin && b.branchCode !== 'BR-HCM-HQ' && (
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(b)}
                              title="Xóa mềm chi nhánh"
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#f87171' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          {b.isDeleted && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRestore(b)}
                              title="Khôi phục chi nhánh"
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Create / Edit Branch Form */}
        <div className="card glass-card-interactive" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={17} color="#10b981" />
              <span>{branchForm.id ? `Cập Nhật Chi Nhánh ${branchForm.branchCode}` : 'Thêm Chi Nhánh Mới'}</span>
            </h3>
            {branchForm.id && (
              <button
                type="button"
                onClick={() => setBranchForm(EMPTY_BRANCH_FORM)}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
              >
                Tạo Mới
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="branch-code">Mã Chi Nhánh *</label>
                <input
                  id="branch-code"
                  className="form-input"
                  value={branchForm.branchCode}
                  disabled={Boolean(branchForm.id)}
                  onChange={(e) => setBranchForm({ ...branchForm, branchCode: e.target.value })}
                  placeholder="VD: BR-HP-PORT"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="branch-city">Tỉnh / Thành Phố *</label>
                <input
                  id="branch-city"
                  className="form-input"
                  value={branchForm.city}
                  onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                  placeholder="VD: Hải Phòng"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="branch-name">Tên Chi Nhánh / Trung Tâm *</label>
              <input
                id="branch-name"
                className="form-input"
                value={branchForm.branchName}
                onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
                placeholder="VD: Chi Nhánh Cảng Chùa Vẽ — Hải Phòng"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="branch-region">Vùng Vận Hành</label>
                <select
                  id="branch-region"
                  className="form-input"
                  value={branchForm.region}
                  onChange={(e) => setBranchForm({ ...branchForm, region: e.target.value })}
                >
                  <option value="MIEN_NAM">Miền Nam</option>
                  <option value="MIEN_BAC">Miền Bắc</option>
                  <option value="MIEN_TRUNG">Miền Trung</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="branch-type">Loại Hình Điểm Cầu</label>
                <select
                  id="branch-type"
                  className="form-input"
                  value={branchForm.branchType}
                  onChange={(e) => setBranchForm({ ...branchForm, branchType: e.target.value })}
                >
                  <option value="HEADQUARTERS">Trụ sở chính (HQ)</option>
                  <option value="HUB_GATEWAY">Hub Gateway</option>
                  <option value="DEPOT_EV">Depot Xe Điện EV</option>
                  <option value="REGIONAL_HUB">Trạm trung chuyển</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="branch-address">Địa Chỉ Chi Tiết</label>
              <input
                id="branch-address"
                className="form-input"
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                placeholder="Số nhà, Khu công nghiệp, Quận/Huyện..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="branch-manager-name">Trưởng Chi Nhánh</label>
                <input
                  id="branch-manager-name"
                  className="form-input"
                  value={branchForm.managerName}
                  onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                  placeholder="Họ và tên quản lý"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="branch-manager-username">Username Quản Lý</label>
                <input
                  id="branch-manager-username"
                  className="form-input"
                  value={branchForm.managerUsername}
                  onChange={(e) => setBranchForm({ ...branchForm, managerUsername: e.target.value })}
                  placeholder="VD: dispatcher"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="branch-phone">Hotline Chi Nhánh</label>
                <input
                  id="branch-phone"
                  className="form-input"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="028-3897-xxxx"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="branch-email">Email Liên Hệ</label>
                <input
                  id="branch-email"
                  type="email"
                  className="form-input"
                  value={branchForm.email}
                  onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                  placeholder="branch@ccadro.vn"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="branch-capacity">Sức Chứa Xe</label>
                <input
                  id="branch-capacity"
                  type="number"
                  min={0}
                  className="form-input"
                  value={branchForm.vehicleCapacity}
                  onChange={(e) => setBranchForm({ ...branchForm, vehicleCapacity: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="branch-revenue">Mục Tiêu Tháng (VNĐ)</label>
                <input
                  id="branch-revenue"
                  type="number"
                  min={0}
                  step={10000000}
                  className="form-input"
                  value={branchForm.monthlyRevenueTargetVnd}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, monthlyRevenueTargetVnd: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label" htmlFor="branch-status">Trạng Thái</label>
                <select
                  id="branch-status"
                  className="form-input"
                  value={branchForm.status}
                  onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !isAdmin}
              className="btn btn-primary"
              style={{ marginTop: 4 }}
            >
              {saving ? 'Đang lưu...' : branchForm.id ? 'Lưu Cập Nhật Chi Nhánh' : 'Khởi Tạo Chi Nhánh'}
            </button>
          </form>
        </div>
      </div>

      {/* Inspect Branch Detail Panel */}
      {inspectedBranch && (
        <div
          className="card glass-card-interactive"
          style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                Chi Tiết Chi Nhánh: {inspectedBranch.branchName} ({inspectedBranch.branchCode})
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {inspectedBranch.address || inspectedBranch.city} •{' '}
                <Phone size={12} style={{ verticalAlign: 'middle', margin: '0 4px' }} />
                {inspectedBranch.phone || '--'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInspectBranchId(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 10px' }}
            >
              Đóng Chi Tiết
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
            Nhân sự đang trực thuộc ({inspectedBranchStaff.length}):
          </div>
          {inspectedBranchStaff.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Chưa có nhân viên nào được gán về chi nhánh này.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {inspectedBranchStaff.map((st) => (
                <span
                  key={st.id || st.employeeCode}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-hover)',
                    fontSize: '0.76rem'
                  }}
                >
                  <strong>{st.fullName}</strong> ({st.employeeCode}) •{' '}
                  <span style={{ color: '#38bdf8' }}>{st.roleCode}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
