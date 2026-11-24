import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  LayoutGrid,
  List,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Truck,
  UserPlus,
  Users,
  XCircle
} from 'lucide-react';
import SearchToolbar from '../../../../shared/components/search/SearchToolbar';
import { DriverHistoryButton, DriverTransportHistory } from '../../../../shared/components/history/TransportHistory';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import { api } from '../../../../services/api';
import StaffComplianceModal from '../../shared/StaffComplianceModal';
import {
  buildRoleBreakdown,
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  getLocalBranches,
  getLocalStaff,
  resolveStaffCategory,
  saveLocalBranches,
  saveLocalStaff,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_ORDER,
  VERIFICATION_STATUS_META
} from '../../../../utils/adminOrgSync';

function createInitialForm(focusMode) {
  const defaultRole =
    focusMode === 'DRIVERS'
      ? 'DRIVER'
      : focusMode === 'CONTROLLERS'
        ? 'SAFETY_MANAGER'
        : 'DISPATCHER';
  return {
    id: null,
    employeeCode: '',
    fullName: '',
    username: '',
    email: '',
    phone: '',
    nationalId: '',
    roleCode: defaultRole,
    department: '',
    jobTitle: '',
    branchId: '',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 18000000,
    hireDate: new Date().toISOString().slice(0, 10),
    status: 'ACTIVE',
    verificationStatus: 'PENDING_REVIEW',
    backgroundCheckPassed: true,
    licenseNumber: '',
    licenseClass: defaultRole === 'HUB_SHIPPER' ? 'A1' : 'CE',
    dateOfBirth: '',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    healthCheckPassed: false,
    safetyTrainingCertified: false,
    assignedVehiclePlate: '',
    assignedHubCode: '',
    demeritPoints: 0,
    certificationCode: '',
    certificateExpiryDate: '',
    issuingAuthority: '',
    inspectionScope: '',
    canSignOffCompliance: false,
    notes: ''
  };
}

const CONTRACT_LABELS = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  CONTRACT: 'Hợp đồng thời vụ'
};

const STATUS_BADGE = {
  ACTIVE: 'badge-green',
  ON_LEAVE: 'badge-amber',
  SUSPENDED: 'badge-red'
};

const FOCUS_CONFIG = {
  ALL: {
    heading: 'Danh Sách Nhân Viên Theo Từng Vai Trò',
    subtitle:
      'Phân nhóm rõ từng vai trò nghiệp vụ, chi nhánh trực thuộc, ca làm việc và trạng thái kiểm duyệt',
    allowedRoles: STAFF_ROLE_ORDER
  },
  DRIVERS: {
    heading: 'Danh Sách Nhân Viên Lái Xe & Giao Nhận (DRIVER / HUB_SHIPPER)',
    subtitle:
      'Quản lý tài xế đường dài đầu kéo EV/Container và shipper giao nhận Hub cùng hồ sơ GPLX, sức khỏe & kiểm duyệt nghiệp vụ',
    allowedRoles: DRIVER_ROLE_CODES
  },
  CONTROLLERS: {
    heading: 'Danh Sách Nhân Viên Kiểm Soát & Kiểm Toán (SAFETY / ESG / HUB_AUDITOR)',
    subtitle:
      'Quản lý đội ngũ kiểm soát an toàn Pre-Trip, kiểm toán Carbon ISO 14083, kiểm tra viên Photo POD và quyền ký duyệt',
    allowedRoles: CONTROLLER_ROLE_CODES
  }
};

function generateClientUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `st-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function AdminStaffByRoleTab({
  isAdmin = true,
  canVerify = true,
  focusMode = 'ALL',
  onStaffChanged
}) {
  const config = FOCUS_CONFIG[focusMode] || FOCUS_CONFIG.ALL;
  const [staffList, setStaffList] = useState(() => getLocalStaff(true));
  const [branches, setBranches] = useState(() => getLocalBranches(false));
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState(focusMode === 'ALL' ? 'GROUPED' : 'TABLE');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffForm, setStaffForm] = useState(() => createInitialForm(focusMode));
  const [complianceTargetId, setComplianceTargetId] = useState(null);
  const [historyDriver, setHistoryDriver] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRoleFilter('ALL');
    setVerificationFilter('ALL');
    setViewMode(focusMode === 'ALL' ? 'GROUPED' : 'TABLE');
    setStaffForm(createInitialForm(focusMode));
  }, [focusMode]);

  const loadData = useCallback(async () => {
    try {
      const [stRes, brRes] = await Promise.all([
        api.getStaff({ includeDeleted: true }),
        api.getBranches({ includeDeleted: false })
      ]);
      const remoteStaff = stRes?.result ?? stRes?.data ?? stRes;
      const remoteBranches = brRes?.result ?? brRes?.data ?? brRes;
      if (Array.isArray(remoteBranches) && remoteBranches.length > 0) {
        saveLocalBranches(remoteBranches);
        setBranches(remoteBranches.filter((b) => !b.isDeleted));
      }
      if (Array.isArray(remoteStaff) && remoteStaff.length > 0) {
        const synced = saveLocalStaff(remoteStaff);
        setStaffList(synced);
        if (onStaffChanged) onStaffChanged(synced);
      }
    } catch {
      const localStaff = getLocalStaff(true);
      setStaffList(localStaff);
      setBranches(getLocalBranches(false));
      if (onStaffChanged) onStaffChanged(localStaff);
    }
  }, [onStaffChanged]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const focusScopedStaff = useMemo(() => {
    return staffList.filter((s) =>
      focusMode === 'ALL' ? true : config.allowedRoles.includes(s.roleCode)
    );
  }, [staffList, focusMode, config.allowedRoles]);

  const roleBreakdown = useMemo(
    () =>
      buildRoleBreakdown(focusScopedStaff).filter((r) =>
        focusMode === 'ALL' ? true : config.allowedRoles.includes(r.roleCode)
      ),
    [focusScopedStaff, focusMode, config.allowedRoles]
  );

  const activeStaff = useMemo(
    () => focusScopedStaff.filter((s) => !s.isDeleted),
    [focusScopedStaff]
  );
  const approvedCount = useMemo(
    () => activeStaff.filter((s) => (s.verificationStatus || 'PENDING_REVIEW') === 'APPROVED').length,
    [activeStaff]
  );
  const pendingOrRevisionCount = useMemo(
    () =>
      activeStaff.filter((s) =>
        ['PENDING_REVIEW', 'REVISION_REQUIRED'].includes(s.verificationStatus || 'PENDING_REVIEW')
      ).length,
    [activeStaff]
  );
  const deletedStaffCount = useMemo(
    () => focusScopedStaff.filter((s) => Boolean(s.isDeleted)).length,
    [focusScopedStaff]
  );
  const totalMonthlyPayroll = useMemo(
    () => activeStaff.reduce((sum, s) => sum + Number(s.baseSalaryVnd || 0), 0),
    [activeStaff]
  );

  const visiblePool = useMemo(() => {
    return focusScopedStaff.filter((s) => {
      if (showDeleted ? !s.isDeleted : Boolean(s.isDeleted)) return false;
      if (roleFilter !== 'ALL' && s.roleCode !== roleFilter) return false;
      if (
        verificationFilter !== 'ALL' &&
        (s.verificationStatus || 'PENDING_REVIEW') !== verificationFilter
      ) {
        return false;
      }
      if (branchFilter !== 'ALL' && s.branchId !== branchFilter && s.branchCode !== branchFilter) {
        return false;
      }
      return true;
    });
  }, [focusScopedStaff, showDeleted, roleFilter, verificationFilter, branchFilter]);

  const elasticResult = useMemo(
    () =>
      elasticSearchMatch(visiblePool, searchQuery, [
        'employeeCode',
        'fullName',
        'username',
        'email',
        'roleCode',
        'department',
        'jobTitle',
        'branchCode',
        'branchName',
        'licenseNumber',
        'assignedVehiclePlate',
        'certificationCode',
        'inspectionScope',
        'verificationStatus'
      ]),
    [visiblePool, searchQuery]
  );

  const groupedByRole = useMemo(() => {
    const groups = new Map();
    elasticResult.items.forEach((member) => {
      const key = member.roleCode || 'OTHER';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(member);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ia = STAFF_ROLE_ORDER.indexOf(a);
      const ib = STAFF_ROLE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [elasticResult.items]);

  const handleEditClick = (member) => {
    setFeedback(null);
    setStaffForm({
      id: member.id,
      employeeCode: member.employeeCode || '',
      fullName: member.fullName || '',
      username: member.username || '',
      email: member.email || '',
      phone: member.phone || '',
      nationalId: member.nationalId || '',
      roleCode: member.roleCode || 'DISPATCHER',
      department: member.department || '',
      jobTitle: member.jobTitle || '',
      branchId: member.branchId || '',
      contractType: member.contractType || 'FULL_TIME',
      shiftName: member.shiftName || 'CA_HANH_CHINH',
      baseSalaryVnd: Number(member.baseSalaryVnd || 0),
      hireDate: member.hireDate || new Date().toISOString().slice(0, 10),
      status: member.status || 'ACTIVE',
      verificationStatus: member.verificationStatus || 'PENDING_REVIEW',
      backgroundCheckPassed: Boolean(member.backgroundCheckPassed),
      licenseNumber: member.licenseNumber || '',
      licenseClass: member.licenseClass || (member.roleCode === 'HUB_SHIPPER' ? 'A1' : 'CE'),
      dateOfBirth: member.dateOfBirth || '',
      licenseIssueDate: member.licenseIssueDate || '',
      licenseExpiryDate: member.licenseExpiryDate || '',
      healthCheckPassed: Boolean(member.healthCheckPassed),
      safetyTrainingCertified: Boolean(member.safetyTrainingCertified),
      assignedVehiclePlate: member.assignedVehiclePlate || '',
      assignedHubCode: member.assignedHubCode || '',
      demeritPoints: Number(member.demeritPoints || 0),
      certificationCode: member.certificationCode || '',
      certificateExpiryDate: member.certificateExpiryDate || '',
      issuingAuthority: member.issuingAuthority || '',
      inspectionScope: member.inspectionScope || '',
      canSignOffCompliance: Boolean(member.canSignOffCompliance),
      notes: member.notes || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFeedback(null);

    const code = String(staffForm.employeeCode || '').trim().toUpperCase();
    const fullName = String(staffForm.fullName || '').trim();
    const email = String(staffForm.email || '').trim().toLowerCase();
    if (!code || !fullName || !email || !staffForm.department.trim() || !staffForm.jobTitle.trim()) {
      setFeedback({
        ok: false,
        message: 'Vui lòng nhập đầy đủ Mã NV, Họ tên, Email, Phòng ban và Chức danh.'
      });
      return;
    }

    const selectedBranch = branches.find((b) => b.id === staffForm.branchId) || null;
    const payload = {
      employeeCode: code,
      fullName,
      username: staffForm.username?.trim().toLowerCase() || null,
      email,
      phone: staffForm.phone?.trim() || null,
      nationalId: staffForm.nationalId?.trim() || null,
      roleCode: staffForm.roleCode,
      staffCategory: resolveStaffCategory(staffForm.roleCode),
      department: staffForm.department.trim(),
      jobTitle: staffForm.jobTitle.trim(),
      branchId: selectedBranch ? selectedBranch.id : null,
      branchCode: selectedBranch ? selectedBranch.branchCode : null,
      contractType: staffForm.contractType,
      shiftName: staffForm.shiftName,
      baseSalaryVnd: Math.max(0, Number(staffForm.baseSalaryVnd || 0)),
      hireDate: staffForm.hireDate || new Date().toISOString().slice(0, 10),
      status: staffForm.status || 'ACTIVE',
      verificationStatus: staffForm.id ? undefined : staffForm.verificationStatus || 'PENDING_REVIEW',
      backgroundCheckPassed: Boolean(staffForm.backgroundCheckPassed),
      licenseNumber: staffForm.licenseNumber?.trim().toUpperCase() || null,
      licenseClass: staffForm.licenseClass?.trim().toUpperCase() || null,
      dateOfBirth: staffForm.dateOfBirth || null,
      licenseIssueDate: staffForm.licenseIssueDate || null,
      licenseExpiryDate: staffForm.licenseExpiryDate || null,
      healthCheckPassed: Boolean(staffForm.healthCheckPassed),
      safetyTrainingCertified: Boolean(staffForm.safetyTrainingCertified),
      assignedVehiclePlate: staffForm.assignedVehiclePlate?.trim().toUpperCase() || null,
      assignedHubCode: staffForm.assignedHubCode?.trim().toUpperCase() || null,
      demeritPoints: Math.max(0, Number(staffForm.demeritPoints || 0)),
      certificationCode: staffForm.certificationCode?.trim().toUpperCase() || null,
      certificateExpiryDate: staffForm.certificateExpiryDate || null,
      issuingAuthority: staffForm.issuingAuthority?.trim() || null,
      inspectionScope: staffForm.inspectionScope?.trim() || null,
      canSignOffCompliance: Boolean(staffForm.canSignOffCompliance),
      notes: staffForm.notes?.trim() || null
    };

    setSaving(true);
    try {
      let savedRecord = null;
      try {
        const res = staffForm.id
          ? await api.updateStaff(staffForm.id, payload)
          : await api.createStaff(payload);
        savedRecord = res?.result ?? res?.data ?? res;
      } catch (apiErr) {
        if ((staffForm.roleCode === 'DRIVER' && import.meta.env.VITE_DEMO_MODE !== 'true') || (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500)) {
          throw apiErr;
        }
        const current = getLocalStaff(true);
        if (staffForm.id) {
          const updatedList = current.map((item) =>
            item.id === staffForm.id
              ? {
                  ...item,
                  ...payload,
                  verificationStatus: item.verificationStatus || 'PENDING_REVIEW',
                  employeeCode: item.employeeCode,
                  branchName: selectedBranch ? selectedBranch.branchName : null
                }
              : item
          );
          saveLocalStaff(updatedList);
          savedRecord = updatedList.find((i) => i.id === staffForm.id);
        } else {
          if (current.some((i) => i.employeeCode.toUpperCase() === code)) {
            throw new Error(`Mã nhân viên ${code} đã tồn tại.`);
          }
          savedRecord = {
            ...payload,
            verificationStatus: payload.verificationStatus || 'PENDING_REVIEW',
            id: generateClientUuid(),
            branchName: selectedBranch ? selectedBranch.branchName : null,
            isDeleted: false
          };
          saveLocalStaff([savedRecord, ...current]);
        }
      }

      if (savedRecord?.id) {
        const current = getLocalStaff(true);
        const exists = current.some((s) => s.id === savedRecord.id);
        const merged = exists
          ? current.map((s) => (s.id === savedRecord.id ? { ...s, ...savedRecord } : s))
          : [savedRecord, ...current];
        const synced = saveLocalStaff(merged);
        setStaffList(synced);
        if (onStaffChanged) onStaffChanged(synced);
      } else {
        await loadData();
      }

      setFeedback({
        ok: true,
        message: staffForm.id
          ? `Đã cập nhật hồ sơ nhân viên "${fullName}" (${savedRecord?.employeeCode || code}).`
          : `Đã thêm nhân viên "${fullName}" vào vai trò ${staffForm.roleCode}.`
      });
      setStaffForm(createInitialForm(focusMode));
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể lưu hồ sơ nhân viên.' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySubmit = async (member, candidate) => {
    let savedRecord = null;
    try {
      const res = await api.verifyStaff(member.id, { ...candidate, dateOfBirth: candidate.dateOfBirth || null, licenseIssueDate: candidate.licenseIssueDate || null });
      savedRecord = res?.result ?? res?.data ?? res;
    } catch (apiErr) {
      if ((member.roleCode === 'DRIVER' && import.meta.env.VITE_DEMO_MODE !== 'true') || (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500)) {
        throw apiErr;
      }
      const nextList = getLocalStaff(true).map((item) =>
        item.id === member.id
          ? {
              ...item,
              ...candidate,
              verifiedBy: 'admin',
              verifiedAt: new Date().toISOString()
            }
          : item
      );
      saveLocalStaff(nextList);
      savedRecord = nextList.find((i) => i.id === member.id);
    }

    if (savedRecord?.id) {
      const merged = getLocalStaff(true).map((s) =>
        s.id === savedRecord.id ? { ...s, ...savedRecord } : s
      );
      const synced = saveLocalStaff(merged);
      setStaffList(synced);
      if (onStaffChanged) onStaffChanged(synced);
    } else {
      await loadData();
    }

    const statusMeta =
      VERIFICATION_STATUS_META[candidate.verificationStatus] || VERIFICATION_STATUS_META.APPROVED;
    setFeedback({
      ok: true,
      message: `Đã cập nhật kiểm duyệt nghiệp vụ cho ${member.fullName} (${member.employeeCode}): ${statusMeta.label}.`
    });
  };

  const handleSoftDelete = async (member) => {
    setFeedback(null);
    if (member.username === 'admin') {
      setFeedback({ ok: false, message: 'Không thể xóa hồ sơ Root Admin.' });
      return;
    }
    try {
      try {
        await api.softDeleteStaff(member.id);
      } catch (apiErr) {
        if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
          throw apiErr;
        }
      }
      const next = saveLocalStaff(
        getLocalStaff(true).map((item) =>
          item.id === member.id
            ? { ...item, isDeleted: true, status: 'SUSPENDED', deletedAt: new Date().toISOString() }
            : item
        )
      );
      setStaffList(next);
      if (onStaffChanged) onStaffChanged(next);
      setFeedback({
        ok: true,
        message: `Đã xóa mềm nhân viên ${member.fullName} (${member.employeeCode}).`
      });
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể xóa mềm nhân viên.' });
    }
  };

  const handleRestore = async (member) => {
    setFeedback(null);
    try {
      try {
        await api.restoreStaff(member.id);
      } catch (apiErr) {
        if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
          throw apiErr;
        }
      }
      const next = saveLocalStaff(
        getLocalStaff(true).map((item) =>
          item.id === member.id
            ? { ...item, isDeleted: false, status: 'ACTIVE', deletedAt: null }
            : item
        )
      );
      setStaffList(next);
      if (onStaffChanged) onStaffChanged(next);
      setFeedback({
        ok: true,
        message: `Đã khôi phục hồ sơ nhân viên ${member.fullName} (${member.employeeCode}).`
      });
    } catch (err) {
      setFeedback({ ok: false, message: err?.message || 'Không thể khôi phục nhân viên.' });
    }
  };

  const complianceTarget = staffList.find((s) => s.id === complianceTargetId) || null;
  const formRoleIsDriver = DRIVER_ROLE_CODES.includes(staffForm.roleCode);
  const formRoleIsController = CONTROLLER_ROLE_CODES.includes(staffForm.roleCode);

  const renderVerificationCell = (m) => {
    const vCode = m.verificationStatus || 'PENDING_REVIEW';
    const vMeta = VERIFICATION_STATUS_META[vCode] || VERIFICATION_STATUS_META.PENDING_REVIEW;
    const isDriver = DRIVER_ROLE_CODES.includes(m.roleCode);
    const isCtrl = CONTROLLER_ROLE_CODES.includes(m.roleCode);

    return (
      <div>
        <span className={`badge ${vMeta.badgeClass}`} style={{ fontSize: '0.69rem' }}>
          {vMeta.shortLabel}
        </span>
        <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: 3 }}>
          {isDriver && (
            <>
              {m.backgroundCheckPassed ? 'CCCD ✓' : 'CCCD ✗'} •{' '}
              {m.licenseNumber ? `GPLX ${m.licenseClass || ''} ✓` : 'GPLX ✗'} •{' '}
              {m.healthCheckPassed ? 'SK ✓' : 'SK ✗'} •{' '}
              {m.safetyTrainingCertified ? 'EV/PCCC ✓' : 'EV/PCCC ✗'}
            </>
          )}
          {isCtrl && (
            <>
              {m.backgroundCheckPassed ? 'Độc lập ✓' : 'Độc lập ✗'} •{' '}
              {m.certificationCode ? 'Chứng chỉ ✓' : 'Chứng chỉ ✗'} •{' '}
              {m.canSignOffCompliance ? 'Quyền ký ✓' : 'Quyền ký ✗'}
            </>
          )}
          {!isDriver && !isCtrl && (m.verifiedBy ? `Duyệt bởi @${m.verifiedBy}` : 'Chờ xác nhận')}
        </div>
      </div>
    );
  };

  const renderRoleSpecificInfo = (m) => {
    const isDriver = DRIVER_ROLE_CODES.includes(m.roleCode);
    const isCtrl = CONTROLLER_ROLE_CODES.includes(m.roleCode);
    if (isDriver) {
      return (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>
            {m.licenseNumber ? `GPLX ${m.licenseClass || ''}: ${m.licenseNumber}` : 'Chưa cập nhật GPLX'}
          </div>
          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
            Xe: <strong>{m.assignedVehiclePlate || '--'}</strong> • Hạn: {m.licenseExpiryDate || '--'}
          </div>
          <div style={{ fontSize: '0.7rem', color: Number(m.demeritPoints || 0) > 5 ? '#f87171' : '#10b981' }}>
            Điểm trừ an toàn: {m.demeritPoints || 0}/20đ
          </div>
        </div>
      );
    }
    if (isCtrl) {
      return (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>
            {m.certificationCode || 'Chưa gắn mã chứng chỉ'}
          </div>
          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
            {m.inspectionScope || m.jobTitle}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Hạn CC: {m.certificateExpiryDate || '--'} • {m.canSignOffCompliance ? 'Được ký duyệt' : 'Chưa cấp quyền ký'}
          </div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.79rem' }}>{m.jobTitle}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {m.department} • {CONTRACT_LABELS[m.contractType] || m.contractType}
        </div>
      </div>
    );
  };

  const renderActionButtons = (member) => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => setComplianceTargetId(member.id)}
        title="Xem chi tiết & kiểm duyệt nghiệp vụ"
        className="btn btn-secondary"
        style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#38bdf8' }}
      >
        <ClipboardCheck size={13} />
        <span>Kiểm duyệt</span>
      </button>
      {member.roleCode === 'DRIVER' && member.id &&
        <DriverHistoryButton onClick={() => setHistoryDriver(member)} />}
      {!member.isDeleted && isAdmin && (
        <button
          type="button"
          onClick={() => handleEditClick(member)}
          title="Chỉnh sửa nhân viên"
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
        >
          <Edit3 size={13} />
        </button>
      )}
      {!member.isDeleted && isAdmin && member.username !== 'admin' && (
        <button
          type="button"
          onClick={() => handleSoftDelete(member)}
          title="Xóa mềm nhân viên"
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#f87171' }}
        >
          <Trash2 size={13} />
        </button>
      )}
      {member.isDeleted && isAdmin && (
        <button
          type="button"
          onClick={() => handleRestore(member)}
          title="Khôi phục nhân viên"
          className="btn btn-primary"
          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Role Breakdown, Verification Compliance & Payroll Bar */}
      <div className="grid-4">
        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">
              {focusMode === 'DRIVERS'
                ? 'Nhân Viên Lái Xe & Shipper'
                : focusMode === 'CONTROLLERS'
                  ? 'Nhân Viên Kiểm Soát & Audit'
                  : 'Tổng Nhân Sự Hoạt Động'}
            </div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {activeStaff.length} <span style={{ fontSize: '0.95rem' }}>NV</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Trên {roleBreakdown.filter((r) => r.totalCount > 0).length} vai trò chuyên môn
            </span>
          </div>
          {focusMode === 'DRIVERS' ? (
            <Truck size={28} color="#10b981" />
          ) : focusMode === 'CONTROLLERS' ? (
            <ShieldCheck size={28} color="#10b981" />
          ) : (
            <Users size={28} color="#10b981" />
          )}
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Đã Kiểm Duyệt Đạt Chuẩn</div>
            <div className="stat-value" style={{ color: '#22c55e' }}>
              {approvedCount}/{activeStaff.length}
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {activeStaff.length > 0 ? Math.round((approvedCount / activeStaff.length) * 100) : 0}% đạt quy chuẩn nghiệp vụ
            </span>
          </div>
          <CheckCircle2 size={28} color="#22c55e" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Chờ Duyệt / Cần Bổ Sung</div>
            <div className="stat-value" style={{ color: pendingOrRevisionCount > 0 ? '#f59e0b' : '#34d399' }}>
              {pendingOrRevisionCount}
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Cần thẩm định hồ sơ hoặc cấp quyền
            </span>
          </div>
          <ClipboardCheck size={28} color="#f59e0b" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Quỹ Lương Cơ Bản / Tháng</div>
            <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.25rem' }}>
              {(totalMonthlyPayroll / 1_000_000).toLocaleString('vi-VN')} Tr ₫
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {branches.length} chi nhánh trực thuộc
            </span>
          </div>
          <Briefcase size={28} color="#38bdf8" />
        </div>
      </div>

      {/* Role Filter Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '10px'
        }}
      >
        <button
          type="button"
          onClick={() => setRoleFilter('ALL')}
          className="card"
          style={{
            textAlign: 'left',
            marginBottom: 0,
            padding: '12px 14px',
            cursor: 'pointer',
            borderColor: roleFilter === 'ALL' ? '#10b981' : 'var(--border-color)',
            background: roleFilter === 'ALL' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            TẤT CẢ VAI TRÒ ({focusMode})
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4 }}>{activeStaff.length} NV</div>
          <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{approvedCount} đã kiểm duyệt</div>
        </button>

        {roleBreakdown.map((rb) => {
          const selected = roleFilter === rb.roleCode;
          return (
            <button
              key={rb.roleCode}
              type="button"
              onClick={() => setRoleFilter(rb.roleCode)}
              className="card"
              style={{
                textAlign: 'left',
                marginBottom: 0,
                padding: '12px 14px',
                cursor: 'pointer',
                borderColor: selected ? rb.color : 'var(--border-color)',
                background: selected ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-card)'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: rb.color, fontWeight: 800 }}>
                {rb.roleCode}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
                {rb.totalCount} NV
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {rb.shortLabel} • {(rb.monthlyPayrollVnd / 1_000_000).toFixed(1)} Tr
              </div>
            </button>
          );
        })}
      </div>

      {/* Verification Status Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          Trạng thái kiểm duyệt nghiệp vụ:
        </span>
        {[
          { code: 'ALL', label: `Tất cả (${activeStaff.length})` },
          { code: 'APPROVED', label: 'Đã kiểm duyệt đạt chuẩn' },
          { code: 'PENDING_REVIEW', label: 'Chờ kiểm duyệt' },
          { code: 'REVISION_REQUIRED', label: 'Cần bổ sung hồ sơ' },
          { code: 'REJECTED', label: 'Từ chối' }
        ].map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setVerificationFilter(item.code)}
            className={`btn ${verificationFilter === item.code ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.73rem', padding: '5px 11px' }}
          >
            {item.label}
          </button>
        ))}
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
        {/* Left: Staff Grouped by Role or Table */}
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
                {config.heading} ({elasticResult.items.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {config.subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setViewMode('GROUPED')}
                className={`btn ${viewMode === 'GROUPED' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.73rem', padding: '6px 10px' }}
              >
                <LayoutGrid size={13} />
                <span>Nhóm Vai Trò</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.73rem', padding: '6px 10px' }}
              >
                <List size={13} />
                <span>Bảng Chi Tiết</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleted((v) => !v)}
                className={`btn ${showDeleted ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.73rem', padding: '6px 10px' }}
              >
                <Trash2 size={13} />
                <span>Thùng rác ({deletedStaffCount})</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '10px',
              marginBottom: '12px',
              alignItems: 'center'
            }}
          >
            <SearchToolbar
              value={searchQuery}
              onChange={setSearchQuery}
              label="Tìm nhân sự"
              placeholder="Mã nhân viên, họ tên, biển số hoặc chi nhánh…"
              totalCount={visiblePool.length}
              matchedCount={elasticResult.items.length}
            />
            <select
              aria-label="Lọc theo chi nhánh"
              className="form-input"
              style={{ minWidth: '180px' }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchCode} — {b.city}
                </option>
              ))}
            </select>
          </div>

          {elasticResult.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Không tìm thấy nhân viên phù hợp điều kiện lọc.
            </div>
          ) : viewMode === 'GROUPED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {groupedByRole.map(([roleCode, members]) => (
                <div
                  key={roleCode}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(148, 163, 184, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BadgeCheck size={16} color="#10b981" />
                      <strong style={{ fontSize: '0.86rem' }}>
                        {STAFF_ROLE_LABELS[roleCode] || roleCode}
                      </strong>
                    </div>
                    <span className="badge badge-blue">{members.length} nhân sự</span>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Mã / Họ Tên</th>
                          <th>Hồ Sơ Nghiệp Vụ</th>
                          <th>Kiểm Duyệt Nghiệp Vụ</th>
                          <th>Chi Nhánh</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id || m.employeeCode}>
                            <td>
                              <code style={{ color: '#38bdf8', fontWeight: 700 }}>{m.employeeCode}</code>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{m.fullName}</div>
                              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                                {m.username ? `@${m.username} • ` : ''}
                                {m.phone || m.email}
                              </div>
                            </td>
                            <td>{renderRoleSpecificInfo(m)}</td>
                            <td>{renderVerificationCell(m)}</td>
                            <td>
                              {m.branchCode ? (
                                <>
                                  <code>{m.branchCode}</code>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {m.branchName}
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                                  Chưa gán chi nhánh
                                </span>
                              )}
                            </td>
                            <td>{renderActionButtons(m)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mã NV / Họ Tên</th>
                    <th>Vai Trò</th>
                    <th>Chi Tiết Chuyên Môn</th>
                    <th>Kiểm Duyệt Nghiệp Vụ</th>
                    <th>Chi Nhánh</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {elasticResult.items.map((m) => (
                    <tr key={m.id || m.employeeCode}>
                      <td>
                        <code style={{ color: '#38bdf8', fontWeight: 700 }}>{m.employeeCode}</code>
                        <div style={{ fontWeight: 700 }}>{m.fullName}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                          {m.phone || m.email}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          {m.roleCode}
                        </span>
                        <div style={{ marginTop: 4 }}>
                          <span className={`badge ${STATUS_BADGE[m.status] || 'badge-blue'}`} style={{ fontSize: '0.66rem' }}>
                            {m.isDeleted ? 'DELETED' : m.status}
                          </span>
                        </div>
                      </td>
                      <td>{renderRoleSpecificInfo(m)}</td>
                      <td>{renderVerificationCell(m)}</td>
                      <td>
                        <code>{m.branchCode || '--'}</code>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {(Number(m.baseSalaryVnd || 0) / 1_000_000).toLocaleString('vi-VN')} Tr ₫
                        </div>
                      </td>
                      <td>{renderActionButtons(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Create / Edit Staff Form */}
        <div className="card glass-card-interactive" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {staffForm.id ? <PlusCircle size={17} color="#38bdf8" /> : <UserPlus size={17} color="#10b981" />}
              <span>{staffForm.id ? `Sửa Nhân Viên ${staffForm.employeeCode}` : 'Thêm Nhân Viên Mới'}</span>
            </h3>
            {staffForm.id && (
              <button
                type="button"
                onClick={() => setStaffForm(createInitialForm(focusMode))}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
              >
                Thêm Mới
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="staff-code">Mã Nhân Viên *</label>
                <input
                  id="staff-code"
                  className="form-input"
                  value={staffForm.employeeCode}
                  disabled={Boolean(staffForm.id)}
                  onChange={(e) => setStaffForm({ ...staffForm, employeeCode: e.target.value })}
                  placeholder="VD: NV-DSP-099"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="staff-role">Vai Trò Nghiệp Vụ *</label>
                <select
                  id="staff-role"
                  className="form-input"
                  value={staffForm.roleCode}
                  onChange={(e) => setStaffForm({ ...staffForm, roleCode: e.target.value })}
                >
                  {config.allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {STAFF_ROLE_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="staff-fullname">Họ Và Tên *</label>
                <input
                  id="staff-fullname"
                  className="form-input"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Thị Lan Anh"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="staff-national-id">Số CCCD</label>
                <input
                  id="staff-national-id"
                  className="form-input"
                  value={staffForm.nationalId}
                  onChange={(e) => setStaffForm({ ...staffForm, nationalId: e.target.value })}
                  placeholder="0790xxxxxxxx"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="staff-email">Email Công Ty *</label>
                <input
                  id="staff-email"
                  type="email"
                  className="form-input"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="nhanvien@ccadro.vn"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="staff-username">Tài Khoản IAM (Tùy chọn)</label>
                <input
                  id="staff-username"
                  className="form-input"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  placeholder="VD: driver_nam"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="staff-department">Phòng Ban *</label>
                <input
                  id="staff-department"
                  className="form-input"
                  value={staffForm.department}
                  onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                  placeholder="VD: Đội Xe Đầu Kéo"
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="staff-jobtitle">Chức Danh *</label>
                <input
                  id="staff-jobtitle"
                  className="form-input"
                  value={staffForm.jobTitle}
                  onChange={(e) => setStaffForm({ ...staffForm, jobTitle: e.target.value })}
                  placeholder="VD: Tài Xế Container FC"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="staff-branch">Chi Nhánh Trực Thuộc</label>
              <select
                id="staff-branch"
                className="form-input"
                value={staffForm.branchId}
                onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}
              >
                <option value="">-- Chọn Chi Nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchCode} — {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver-specific compliance fields */}
            {formRoleIsDriver && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: 'rgba(16, 185, 129, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#10b981' }}>
                  Chứng Từ Lái Xe &amp; Phương Tiện
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" htmlFor="staff-license-no">Số GPLX</label>
                    <input
                      id="staff-license-no"
                      className="form-input"
                      value={staffForm.licenseNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, licenseNumber: e.target.value })}
                      placeholder="790145..."
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="staff-license-class">Hạng Bằng</label>
                    <select
                      id="staff-license-class"
                      className="form-input"
                      value={staffForm.licenseClass}
                      onChange={(e) => setStaffForm({ ...staffForm, licenseClass: e.target.value })}
                    >
                      <option value="CE">CE · Đầu kéo sơ mi rơ moóc</option>
                      <option value="FC">FC · GPLX cấp trước 01/01/2025</option>
                      <option value="C">C</option>
                      <option value="B2">B2</option>
                      <option value="A1">A1</option>
                    </select>
                  </div>
                  {staffForm.roleCode === 'DRIVER' && [
                    ['dateOfBirth', 'Ngày sinh'],
                    ['licenseIssueDate', 'Ngày cấp GPLX']
                  ].map(([field, label]) => (
                    <label key={field} className="form-label">{label}
                      <input className="form-input" type="date" value={staffForm[field]}
                        onChange={(event) => setStaffForm({ ...staffForm, [field]: event.target.value })} />
                    </label>
                  ))}
                  <div>
                    <label className="form-label" htmlFor="staff-license-exp">Hạn GPLX</label>
                    <input
                      id="staff-license-exp"
                      type="date"
                      className="form-input"
                      value={staffForm.licenseExpiryDate}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, licenseExpiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" htmlFor="staff-plate">Biển Số Xe Phụ Trách</label>
                    <input
                      id="staff-plate"
                      className="form-input"
                      value={staffForm.assignedVehiclePlate}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, assignedVehiclePlate: e.target.value })
                      }
                      placeholder="51C-888.99"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="staff-hub">Mã Hub (nếu có)</label>
                    <input
                      id="staff-hub"
                      className="form-input"
                      value={staffForm.assignedHubCode}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, assignedHubCode: e.target.value })
                      }
                      placeholder="HUB-DINHBANG-BN"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Controller-specific compliance fields */}
            {formRoleIsController && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  background: 'rgba(245, 158, 11, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b' }}>
                  Chứng Chỉ Kiểm Soát &amp; Kiểm Toán
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" htmlFor="staff-cert-code">Mã Chứng Chỉ</label>
                    <input
                      id="staff-cert-code"
                      className="form-input"
                      value={staffForm.certificationCode}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, certificationCode: e.target.value })
                      }
                      placeholder="HSE-2026-xxx"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="staff-cert-exp">Hạn Chứng Chỉ</label>
                    <input
                      id="staff-cert-exp"
                      type="date"
                      className="form-input"
                      value={staffForm.certificateExpiryDate}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, certificateExpiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="staff-scope">Phạm Vi Kiểm Soát</label>
                  <input
                    id="staff-scope"
                    className="form-input"
                    value={staffForm.inspectionScope}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, inspectionScope: e.target.value })
                    }
                    placeholder="Kiểm định xe, Kiểm toán Carbon"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="staff-phone">Số Điện Thoại</label>
                <input
                  id="staff-phone"
                  className="form-input"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="0909-xxx-xxx"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="staff-contract">Loại Hợp Đồng</label>
                <select
                  id="staff-contract"
                  className="form-input"
                  value={staffForm.contractType}
                  onChange={(e) => setStaffForm({ ...staffForm, contractType: e.target.value })}
                >
                  <option value="FULL_TIME">Toàn thời gian</option>
                  <option value="PART_TIME">Bán thời gian</option>
                  <option value="CONTRACT">Hợp đồng</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="staff-salary">Lương Cơ Bản (VNĐ)</label>
                <input
                  id="staff-salary"
                  type="number"
                  min={0}
                  step={500000}
                  className="form-input"
                  value={staffForm.baseSalaryVnd}
                  onChange={(e) => setStaffForm({ ...staffForm, baseSalaryVnd: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !isAdmin}
              className="btn btn-primary"
              style={{ marginTop: 4 }}
            >
              {saving ? 'Đang lưu...' : staffForm.id ? 'Lưu Cập Nhật Nhân Viên' : 'Thêm Nhân Viên Vào Hệ Thống'}
            </button>
          </form>
        </div>
      </div>

      {/* Compliance Detail & Approval Modal */}
      <StaffComplianceModal
        staff={complianceTarget}
        canVerify={canVerify}
        onClose={() => setComplianceTargetId(null)}
        onSubmitVerification={handleVerifySubmit}
      />
      <DriverTransportHistory staff driver={historyDriver} onClose={() => setHistoryDriver(null)} />
    </div>
  );
}
