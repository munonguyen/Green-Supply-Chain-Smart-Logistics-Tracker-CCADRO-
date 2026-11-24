import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, MessageSquareText, Plus, Save, X } from 'lucide-react';
import { api } from '../../../../services/api';
import { formatDate } from './containerPresentation';

export const NOTE_CATEGORIES = {
  OPERATIONS: 'Tình hình vận hành',
  DELAY: 'Chậm tiến độ',
  DEVICE: 'Thiết bị / kết nối',
  CARGO: 'Tình trạng hàng',
  HANDOVER: 'Giao nhận'
};

export function DispatchNoteForm({ code, onSaved, onClose }) {
  const [category, setCategory] = useState('OPERATIONS');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="dispatch-inline-form"
      aria-label="Ghi nhận cập nhật điều hành"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !content.trim()) return;
        setBusy(true);
        setError('');
        try {
          await api.createContainerDispatchNote(code, { category, content: content.trim() });
          onSaved();
        } catch (failure) {
          setError(failure.message || 'Chưa lưu được nhật ký. Hãy thử lại.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="dispatch-inline-heading">
        <strong>Cập nhật tình hình</strong>
        <button
          className="container-icon-button"
          type="button"
          aria-label="Đóng ghi nhận cập nhật"
          disabled={busy}
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>
      <p>Ghi rõ tình hình, cách xử lý và việc cần theo dõi.</p>
      <fieldset disabled={busy}>
        <label className="container-field">
          <span>Phân loại</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {Object.entries(NOTE_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="container-field">
          <span>Nội dung cập nhật *</span>
          <textarea
            autoFocus
            required
            maxLength={2000}
            rows={5}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ví dụ: Đã liên hệ tài xế, đang chờ thông quan tại cổng…"
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="container-notice container-notice-error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy || !content.trim()}>
        <Save size={14} />
        {busy ? 'Đang lưu…' : 'Lưu cập nhật'}
      </button>
      <small>
        Nhật ký lưu người thực hiện và thời điểm. Các xác nhận xuất bến, bàn giao được thực hiện
        riêng theo quy trình.
      </small>
    </form>
  );
}

export default function ContainerDispatchJournal({ code, version, canManage, onAdd }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const load = useCallback(() => setRetry((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    if (typeof api.getContainerDispatchNotes !== 'function') {
      setLoading(false);
      return undefined;
    }
    Promise.resolve(api.getContainerDispatchNotes(code))
      .then((response) => {
        if (active) setNotes(Array.isArray(response?.result) ? response.result : []);
      })
      .catch((failure) => {
        if (active) setError(failure.message || 'Chưa tải được nhật ký.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, version, retry]);
  return (
    <section className="dispatch-journal" aria-label="Nhật ký điều hành">
      <div className="dispatch-section-heading">
        <div>
          <span className="container-overline">THEO DÕI XỬ LÝ</span>
          <h3>
            <MessageSquareText size={16} />
            Nhật ký điều hành
          </h3>
        </div>
        {canManage && (
          <button className="container-text-button" type="button" onClick={onAdd}>
            <Plus size={14} /> Ghi cập nhật
          </button>
        )}
      </div>
      {loading ? (
        <p role="status">Đang tải nhật ký…</p>
      ) : error ? (
        <p role="alert">
          {error}{' '}
          <button className="container-text-button" onClick={load} type="button">
            Thử lại
          </button>
        </p>
      ) : notes.length ? (
        <ol>
          {notes.map((note) => (
            <li key={note.id}>
              <span className="dispatch-journal-dot">
                <Clock3 size={13} />
              </span>
              <div>
                <div className="dispatch-journal-meta">
                  <strong>{NOTE_CATEGORIES[note.category] || note.category}</strong>
                  <span>
                    {note.createdBy} · {formatDate(note.createdAt)}
                  </span>
                </div>
                <p>{note.content}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="dispatch-journal-empty">
          <MessageSquareText size={23} />
          <div>
            <strong>Chưa có ghi nhận điều hành</strong>
            <p>Cập nhật tình hình để các ca điều phối cùng theo dõi.</p>
          </div>
        </div>
      )}
    </section>
  );
}
