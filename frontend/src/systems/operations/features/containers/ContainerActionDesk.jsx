import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FilePenLine,
  MessageSquarePlus,
  Loader2,
  PackagePlus,
  Radio,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { DispatchNoteForm } from './ContainerDispatchJournal';
import { api } from '../../../../services/api';
import { sealData } from './containerPresentation';
import { formatSignalAge } from './ContainerConnection';
import ContainerEditorDialog from './ContainerEditorDialog';

const profileOf = (container) => ({
  responsibleCompanyId: container.responsibleCompanyId || '',
  ownerName: container.ownerName || '',
  isoType: container.isoType || '',
  telematicsModel: container.telematicsModel || '',
  sealNumber: sealData(container).number || ''
});

export function ContainerProfileEditor({
  container,
  onSaved,
  onClose,
  profileLocked = false,
  focusTarget = 'profile',
  companies = []
}) {
  const [initial] = useState(() => profileOf(container));
  const [draft, setDraft] = useState(initial);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <ContainerEditorDialog
      title="Chỉnh sửa hồ sơ"
      code={container.containerCode}
      busy={busy}
      onClose={onClose}
    >
      <form
        className="container-editor-form"
        data-container-focus={focusTarget === 'seal' ? undefined : 'profile'}
        aria-label="Cập nhật hồ sơ container"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await api.updateContainerProfile(container.containerCode, {
              ...draft,
              responsibleCompanyId: draft.responsibleCompanyId || null,
              previousValues: initial,
              reason: reason.trim()
            });
            await onSaved();
          } catch (failure) {
            setError(failure.message || 'Chưa lưu được thay đổi. Vui lòng thử lại.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="container-editor-body">
          {profileLocked && (
            <p className="dispatch-lock-note">
              <ShieldCheck size={16} /> Mã ISO và số niêm phong đã chốt được khóa.
            </p>
          )}
          <fieldset disabled={busy}>
            <label className="container-field">
              <span>Đơn vị phụ trách</span>
              <select
                value={draft.responsibleCompanyId}
                onChange={(event) =>
                  setDraft({ ...draft, responsibleCompanyId: event.target.value })
                }
              >
                <option value="">Chưa có đơn vị</option>
                {draft.responsibleCompanyId &&
                  !companies.some((company) => company.id === draft.responsibleCompanyId) && (
                    <option value={draft.responsibleCompanyId}>
                      {container.responsibleCompanyName || 'Đơn vị hiện tại'}
                    </option>
                  )}
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyCode} · {company.companyName}
                  </option>
                ))}
              </select>
            </label>

            {[
              ['ownerName', 'Chủ sở hữu', 100],
              ['isoType', 'Mã loại ISO', 10],
              ['sealNumber', 'Số niêm phong', 50],
              ['telematicsModel', 'Thiết bị giám sát', 100]
            ].map(([key, label, maxLength]) => (
              <label
                className={key === 'telematicsModel' ? 'container-field container-editor-wide' : 'container-field'}
                data-container-focus={key === 'sealNumber' && focusTarget === 'seal' ? 'seal' : undefined}
                key={key}
              >
                <span>{label}</span>
                <input
                  disabled={profileLocked && ['isoType', 'sealNumber'].includes(key)}
                  value={draft[key]}
                  maxLength={maxLength}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                />
              </label>
            ))}
            <label className="container-field container-editor-wide">
              <span>Lý do cập nhật *</span>
              <textarea
                required
                maxLength={500}
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </fieldset>
          {error && (
            <p className="container-notice container-notice-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="container-editor-footer">
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !reason.trim()}>
            {busy ? <Loader2 size={15} className="container-spin" /> : <Save size={15} />}
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </footer>
      </form>
    </ContainerEditorDialog>
  );
}

export default function ContainerActionDesk({
  container,
  now,
  canManage,
  tab,
  setTab,
  onAddItem,
  onRefresh,
  editorOpen,
  setEditorOpen,
  onSaved,
  profileLocked,
  noteOpen,
  setNoteOpen,
  onNoteSaved,
  companies,
  onAction,
  actionRequest
}) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const actions = [
    ['control', Truck, 'Phân công & kiểm soát', 'Xe, tài xế và xác nhận theo chuyến'],
    ['safety', ShieldCheck, 'Kiểm tra an toàn container', 'Sơ đồ kỹ thuật, kết quả từng điểm và biên bản'],
    ['manifest', PackagePlus, 'Bổ sung hàng hóa', 'Nhập mã hàng, số kiện và điểm giao'],
    ['route', Route, 'Lập và chốt tuyến', 'So sánh, lựa chọn phương án'],
    ['overview', ShieldCheck, 'Cập nhật CSC', 'Thông tin biển và hạn kiểm tra'],
    ['connection', Radio, 'Thiết bị & kết nối', 'Theo dõi GPS và tín hiệu nhận']
  ];
  return (
    <aside className="dispatch-action-desk" aria-label="Thao tác điều phối">
      <div className="dispatch-desk-heading">
        <span className="dispatch-desk-icon">
          <FilePenLine size={19} />
        </span>
        <div>
          <h3>Thao tác điều phối</h3>
          <p>Xử lý ngay tại container này</p>
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          className="btn btn-primary dispatch-edit-profile"
          onClick={() => {
            setNoteOpen(!noteOpen);
            setEditorOpen(false);
            setMessage('');
          }}
        >
          <MessageSquarePlus size={16} /> Ghi nhận cập nhật
        </button>
      )}
      {noteOpen && canManage && (
        <DispatchNoteForm
          code={container.containerCode}
          onClose={() => setNoteOpen(false)}
          onSaved={() => {
            setNoteOpen(false);
            onNoteSaved();
            setMessage('Đã lưu cập nhật vào nhật ký điều hành.');
          }}
        />
      )}
      {canManage && (
        <button
          type="button"
          className="btn btn-secondary dispatch-edit-profile"
          onClick={() => {
            setEditorOpen(true);
            setNoteOpen(false);
            setMessage('');
          }}
        >
          <FilePenLine size={16} /> Chỉnh sửa hồ sơ
        </button>
      )}
      {editorOpen && canManage && (
        <ContainerProfileEditor
          key={container.containerCode}
          container={container}
          companies={companies}
          profileLocked={profileLocked}
          focusTarget={actionRequest?.target}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await onSaved();
            onNoteSaved?.();
            setEditorOpen(false);
            setMessage('Đã lưu hồ sơ container.');
          }}
        />
      )}
      <nav className="dispatch-action-list" aria-label="Xử lý nhanh">
        {actions.map(([id, Icon, label, description]) => (
          <button
            key={label}
            type="button"
            className={tab === id || (id === 'safety' && actionRequest?.target === 'safety' && tab === 'control') ? 'is-active' : ''}
            onClick={() => {
              if (onAction) {
                onAction({ control: 'assignment', overview: 'csc', connection: 'device' }[id] || id);
                return;
              }
              setTab(id === 'safety' ? 'control' : id);
              if (
                id === 'manifest' &&
                canManage &&
                ['AVAILABLE', 'ASSIGNED'].includes(container.status)
              )
                onAddItem();
              if (id === 'overview')
                requestAnimationFrame(() =>
                  document
                    .getElementById('container-csc-section')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                );
            }}
          >
            <Icon size={18} />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </nav>
      <section className="dispatch-contact-card">
        <span className="container-overline">PHỤ TRÁCH CHUYẾN</span>
        <strong>{container.driverName || 'Chưa phân công tài xế'}</strong>
        <span>{container.vehicleLicensePlate || 'Chưa gán phương tiện'}</span>
        {container.driverPhone ? (
          <a href={'tel:' + container.driverPhone.replace(/[^+\d]/g, '')}>
            Gọi tài xế · {container.driverPhone}
          </a>
        ) : (
          <small>Chưa có số liên hệ</small>
        )}
      </section>
      <div className="dispatch-desk-sync">
        <p>
          <ClipboardCheck size={14} /> GPS ·{' '}
          {formatSignalAge(container.lastPositionReceivedAt, now)}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            setError('');
            setMessage('');
            try {
              const refreshed = await onRefresh();
              if (refreshed === false)
                throw new Error('Chưa tải được dữ liệu mới. Hãy kiểm tra kết nối và thử lại.');
              setMessage('Đã tải dữ liệu. Xem mốc nhận GPS và thiết bị để kiểm tra tín hiệu.');
            } catch (failure) {
              setError(failure.message || 'Chưa tải được dữ liệu mới.');
            } finally {
              setChecking(false);
            }
          }}
        >
          <RefreshCw size={14} className={checking ? 'container-spin' : ''} />{' '}
          {checking ? 'Đang tải…' : 'Kiểm tra cập nhật'}
        </button>
      </div>
      {message && (
        <p className="dispatch-save-success" role="status">
          <Check size={15} />
          {message}
        </p>
      )}
      {error && (
        <p className="container-notice container-notice-error" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
