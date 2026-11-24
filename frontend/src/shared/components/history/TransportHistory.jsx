import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Search, X } from 'lucide-react';
import { api } from '../../../services/api';
import { ModalDialog } from '../ui/SharedPrimitives';
import SearchField from '../search/SearchField';
import './transport-history.css';

const labels = {
  SCHEDULED: 'Chưa khởi hành',
  EN_ROUTE: 'Đang vận chuyển',
  DELAYED: 'Chậm tiến độ',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  DEPARTED: 'Đã xác nhận xuất bến',
  DELIVERED: 'Đã bàn giao',
  MANIFEST_ONLY: 'Chỉ có manifest'
};
const date = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const amount = (value, unit) => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} ${unit}`;

export function TransportHistory({ resource, subjectId }) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setError('');
    setData(null);
    api.getTransportHistory(resource, subjectId, { page, query })
      .then(({ result }) => { if (current) setData(result); })
      .catch((failure) => { if (current) setError(failure.message || 'Không tải được lịch sử.'); });
    return () => { current = false; };
  }, [attempt, page, query, resource, subjectId]);

  const search = (value) => {
    setPage(0);
    setQuery(value.trim());
  };

  return (
    <section className="transport-history" aria-label="Lịch sử vận chuyển">
      <form onSubmit={(event) => { event.preventDefault(); search(draft); }}>
        <SearchField hideLabel label="Tìm trong lịch sử" placeholder="Mã chuyến, vận đơn hoặc tên hàng"
          maxLength={120} value={draft} onValueChange={(value) => {
            setDraft(value);
            if (!value) search('');
          }} />
        <button type="submit" className="btn btn-secondary"><Search size={15} /> Tìm</button>
      </form>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setAttempt(attempt + 1)}>Thử lại</button>
        </div>
      ) : !data ? <p role="status">Đang tải lịch sử vận chuyển…</p> : (
        <>
          {!data.linked && <p>Hồ sơ nhân viên chưa liên kết với tài xế trong đội xe.</p>}
          {data.linked && !data.entries.length && <p>{query ? 'Không có kết quả phù hợp.' : 'Chưa có lịch sử vận chuyển.'}</p>}
          {data.entries.map((entry) => (
            <article className="transport-history-entry" key={entry.id}>
              <div className="transport-history-heading">
                <strong>{entry.shipmentCode || 'Chưa có mã vận đơn'}{entry.tripCode && <small>{entry.tripCode}</small>}</strong>
                <span className={`badge ${['COMPLETED', 'DELIVERED'].includes(entry.status) ? 'badge-green' : 'badge-blue'}`}>
                  {labels[entry.status] || entry.status}
                </span>
              </div>
              {(entry.origin || entry.destination) && <p>{entry.origin || '—'} → {entry.destination || '—'}</p>}
              <dl>
                {resource !== 'containers' && <div><dt>Container</dt><dd>{entry.containerCode || 'Chưa ghi nhận'}</dd></div>}
                {resource === 'containers' && <div><dt>Tài xế</dt><dd>{entry.driverName || 'Chưa ghi nhận'}{entry.driverCode && ` · ${entry.driverCode}`}</dd></div>}
                <div><dt>Biển số</dt><dd>{entry.plateNumber || '—'}</dd></div>
                <div><dt>{entry.departedAt ? 'Khởi hành' : 'Ghi nhận'}</dt><dd>{date(entry.departedAt || entry.recordedAt)}</dd></div>
                <div><dt>Kết thúc</dt><dd>{date(entry.arrivedAt)}</dd></div>
                {entry.declaredWeightTons != null && <div><dt>Tải khai báo</dt><dd>{amount(entry.declaredWeightTons, 'tấn')}</dd></div>}
              </dl>
              {entry.items.length ? (
                <details>
                  <summary>{entry.items.length} dòng hàng · {entry.cargoSnapshot ? 'Đã chốt lúc xuất bến' : 'Theo manifest'}</summary>
                  <ul>
                    {entry.items.map((item) => <li key={item.itemCode}>
                      <strong>{item.name}</strong><span>{item.itemCode} · {amount(item.parcelCount, 'kiện')} · {amount(item.weightKg, 'kg')}</span>
                    </li>)}
                  </ul>
                </details>
              ) : <small>Chưa có chi tiết mặt hàng.</small>}
            </article>
          ))}
          {(page > 0 || data.hasMore) && <nav aria-label="Trang lịch sử">
            <button type="button" className="btn btn-secondary" aria-label="Trang trước" disabled={!page}
              onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            <span>Trang {page + 1}</span>
            <button type="button" className="btn btn-secondary" aria-label="Trang sau" disabled={!data.hasMore}
              onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </nav>}
        </>
      )}
    </section>
  );
}

export function DriverTransportHistory({ driver, staff = false, onClose }) {
  if (!driver) return null;
  return (
    <ModalDialog onClose={onClose} title="Lịch sử vận chuyển của tài xế" maxWidth={880}
      subtitle={[driver.fullName, driver.driverCode || driver.employeeCode].filter(Boolean).join(' · ')}>
      <TransportHistory key={driver.id} resource={staff ? 'staff-drivers' : 'drivers'} subjectId={driver.id} />
      <button type="button" className="btn btn-secondary" onClick={onClose}><X size={15} /> Đóng lịch sử</button>
    </ModalDialog>
  );
}

export function DriverHistoryButton({ onClick }) {
  return <button type="button" className="btn btn-secondary" onClick={onClick}><History size={15} /> Lịch sử</button>;
}
