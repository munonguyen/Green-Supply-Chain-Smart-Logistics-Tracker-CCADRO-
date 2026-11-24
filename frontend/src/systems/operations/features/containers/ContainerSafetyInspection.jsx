import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  FileText,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  UserCheck
} from 'lucide-react';
import { api } from '../../../../services/api';
import { CONTAINER_STATUSES, CONTAINER_TYPES, formatDate } from './containerPresentation';
import ContainerInspectionModel from './ContainerInspectionModel';
import ContainerInspectionPointCard from './ContainerInspectionPointCard';
import {
  evaluateMetricBound,
  resolveInspectionItemSpec
} from './containerInspectionCriteria';
import {
  buildTelemetryAutoChecks,
  computeCompositeFleetSafety,
  computePartSafetyAssessment,
  resolveAhiBand
} from './containerSafetyIntelligence';
import { hasCurrentSafetyPass } from './containerSafety';

export default function ContainerSafetyInspection({
  container,
  onInspectionChange,
  onEditingChange,
  now = Date.now()
}) {
  const modelRef = useRef(null);
  const pointCardId = 'inspection-point-' + useId().replace(/:/g, '');
  const [pointCard, setPointCard] = useState(null);
  const [data, setData] = useState(null);
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [readVersion, setReadVersion] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState('');
  const [historyId, setHistoryId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const currentCode = useRef(container.containerCode);
  currentCode.current = container.containerCode;

  const apply = (result) => {
    setData(result);
    setChecks(Object.fromEntries((result.inspection?.checks || []).map((item) => [item.key, item])));
    setNotes(result.inspection?.summaryNotes || '');
    setDirty(false);
    setHistoryId(null);
  };

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setNotice('');
    setDirty(false);
    setSelectedPoint('');
    setPointCard(null);
    setHistoryId(null);
    api
      .getContainerSafetyInspection(container.containerCode)
      .then((response) => {
        if (active) apply(response?.result ?? response);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Không tải được hồ sơ kiểm tra.');
      });
    return () => {
      active = false;
    };
  }, [container.containerCode, container.containerType, readVersion]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    onEditingChange?.(dirty || busy);
  }, [dirty, busy, onEditingChange]);

  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  const latest = data?.inspection;
  const displayed = historyId ? data.history.find((item) => item.id === historyId) : latest;
  const editing = latest?.status === 'DRAFT' && !historyId;
  const enabled = container.status !== 'IN_TRANSIT';
  const values = editing
    ? checks
    : Object.fromEntries((displayed?.checks || []).map((item) => [item.key, item]));

  const checkedList = Object.values(values).filter((item) =>
    ['PASS', 'FAIL'].includes(item.status)
  );
  const checked = checkedList.length;
  const passedCount = checkedList.filter((item) => item.status === 'PASS').length;
  const failures = checkedList.filter((item) => item.status === 'FAIL').length;
  const total = data?.template?.length || 0;
  const pendingCount = Math.max(0, total - checked);
  const telemetryPreview = useMemo(
    () => buildTelemetryAutoChecks(data?.template || [], container, {}, now).checks,
    [data?.template, container, now]
  );
  const safetyComposite = useMemo(
    () => computeCompositeFleetSafety(data?.template || [], values),
    [data?.template, values]
  );

  const runTelemetrySync = () => {
    if (!editing || !enabled || busy || !data?.template?.length) return;
    const { checks: synced, appliedCount } = buildTelemetryAutoChecks(
      data.template,
      container,
      checks,
      now
    );
    if (appliedCount > 0) {
      setChecks(synced);
      setDirty(true);
      setNotice(
        `Đã đối chiếu tự động ${appliedCount} bộ phận từ Telemetry IoT & Hồ sơ CSC/E-Seal.`
      );
    } else {
      setNotice('Không có thêm dữ liệu Telemetry mới để tự động điền; hãy chấm trên mô hình.');
    }
  };

  const isFailReasonComplete = (item) => {
    if (item?.status !== 'FAIL') return true;
    const hasNotes = (item.notes || '').trim().length >= 5;
    const hasReason = Array.isArray(item.selectedReasons) && item.selectedReasons.length > 0;
    return hasNotes || hasReason;
  };
  const missingFailNotes = Object.values(checks).filter((item) => !isFailReasonComplete(item)).length;
  const validNotes = missingFailNotes === 0;
  const passed = !historyId && hasCurrentSafetyPass(data, container, now);
  const status = editing
    ? 'Đang kiểm tra'
    : displayed?.status === 'PASSED'
      ? historyId
        ? 'Đã hoàn tất · Đạt'
        : passed
          ? 'Hoàn tất · Đạt'
          : 'Cần kiểm tra lại'
      : displayed?.status === 'BLOCKED'
        ? 'Hoàn tất · Không đạt'
        : 'Chưa kiểm tra';

  const update = (key, field, value) => {
    setChecks((previous) => ({
      ...previous,
      [key]: {
        key,
        status: previous[key]?.status || '',
        notes: previous[key]?.notes || '',
        ...(previous[key]?.criteriaResults ? { criteriaResults: previous[key].criteriaResults } : {}),
        ...(previous[key]?.measurements ? { measurements: previous[key].measurements } : {}),
        ...(previous[key]?.selectedReasons ? { selectedReasons: previous[key].selectedReasons } : {}),
        [field]: value
      }
    }));
    setDirty(true);
    setNotice('');
  };

  const updateCriterion = (key, code, verdict) => {
    setChecks((previous) => {
      const current = previous[key] || { key, status: '', notes: '' };
      const nextCriteria = { ...(current.criteriaResults || {}), [code]: verdict };
      const anyFail = Object.values(nextCriteria).some((v) => v === 'FAIL');
      return {
        ...previous,
        [key]: {
          ...current,
          criteriaResults: nextCriteria,
          status: verdict === 'FAIL' || anyFail ? 'FAIL' : current.status
        }
      };
    });
    setDirty(true);
    setNotice('');
  };

  const updateMeasurement = (key, criterion, rawValue) => {
    setChecks((previous) => {
      const current = previous[key] || { key, status: '', notes: '' };
      const nextMeasurements = { ...(current.measurements || {}) };
      if (rawValue === '' || rawValue == null) delete nextMeasurements[criterion.code];
      else nextMeasurements[criterion.code] = String(rawValue);
      const bound = evaluateMetricBound(criterion, rawValue);
      const nextCriteria = { ...(current.criteriaResults || {}) };
      if (bound === 'OUT_OF_RANGE') nextCriteria[criterion.code] = 'FAIL';
      else if (bound === 'IN_RANGE') nextCriteria[criterion.code] = 'PASS';
      const anyFail = Object.values(nextCriteria).some((v) => v === 'FAIL');
      return {
        ...previous,
        [key]: {
          ...current,
          measurements: nextMeasurements,
          criteriaResults: nextCriteria,
          status: bound === 'OUT_OF_RANGE' || anyFail ? 'FAIL' : current.status
        }
      };
    });
    setDirty(true);
    setNotice('');
  };

  const passAllCriteria = (key, criteriaList) => {
    setChecks((previous) => {
      const current = previous[key] || { key, status: '', notes: '' };
      const nextCriteria = Object.fromEntries(criteriaList.map((c) => [c.code, 'PASS']));
      const nextMeasurements = { ...(current.measurements || {}) };
      delete nextMeasurements._conditionPct;
      return {
        ...previous,
        [key]: {
          ...current,
          measurements: nextMeasurements,
          criteriaResults: nextCriteria,
          selectedReasons: [],
          status: 'PASS'
        }
      };
    });
    setDirty(true);
    setNotice('');
  };

  const updateConditionPct = (key, item, rawPct) => {
    const pct = Math.max(0, Math.min(100, Math.round(Number(rawPct))));
    setChecks((previous) => {
      const current = previous[key] || { key, status: '', notes: '' };
      const nextMeasurements = { ...(current.measurements || {}), _conditionPct: String(pct) };
      const specCriteria = resolveInspectionItemSpec(item).criteria || [];
      const hasFailedCriterion = Object.values(current.criteriaResults || {}).some((v) => v === 'FAIL');
      const hasOutOfRange = specCriteria.some(
        (c) => evaluateMetricBound(c, nextMeasurements[c.code]) === 'OUT_OF_RANGE'
      );
      const nextStatus = pct < 70 || hasFailedCriterion || hasOutOfRange ? 'FAIL' : 'PASS';
      const stats = computePartSafetyAssessment(item, {
        ...current,
        status: nextStatus,
        measurements: nextMeasurements
      });
      const band = resolveAhiBand(pct);
      const autoNote = `[Đánh giá ${pct}% · ${band?.label || ''}] Hư hại ${100 - pct}% · Chi phí sửa/thay ~${stats.repairCostRatioPct ?? Math.round((100 - pct) * 0.62)}% RAV. ${stats.recommendedAction}`;
      const existingNote = (current.notes || '').trim();
      const nextNotes =
        !existingNote || existingNote.startsWith('[Đánh giá ') ? autoNote.slice(0, 1000) : current.notes;
      return {
        ...previous,
        [key]: {
          ...current,
          status: nextStatus,
          measurements: nextMeasurements,
          notes: nextNotes
        }
      };
    });
    setDirty(true);
    setNotice('');
  };

  const toggleReason = (key, reason) => {
    setChecks((previous) => {
      const current = previous[key] || { key, status: '', notes: '' };
      const existing = current.selectedReasons || [];
      const active = existing.includes(reason);
      const nextReasons = active ? existing.filter((r) => r !== reason) : [...existing, reason];
      let nextNotes = current.notes || '';
      if (!active && !nextNotes.includes(reason)) {
        nextNotes = nextNotes.trim() ? `${nextNotes.trim()}; ${reason}` : reason;
      }
      return {
        ...previous,
        [key]: {
          ...current,
          status: nextReasons.length > 0 ? 'FAIL' : current.status,
          selectedReasons: nextReasons,
          notes: nextNotes
        }
      };
    });
    setDirty(true);
    setNotice('');
  };

  const markRemainingPass = () => {
    if (!editing || !enabled || busy || !data?.template?.length) return;
    setChecks((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const item of data.template) {
        if (!next[item.key]?.status) {
          next[item.key] = {
            key: item.key,
            status: 'PASS',
            measurements: { ...(next[item.key]?.measurements || {}), _conditionPct: '95' },
            notes:
              next[item.key]?.notes ||
              '[Đánh giá 95% · Hạng A · Nguyên trạng (IICL)] Xác nhận đạt nhanh các hạng mục không phát hiện lỗi.'
          };
          changed = true;
        }
      }
      if (changed) {
        setDirty(true);
        setNotice('Đã chấm 95% (Hạng A) cho các hạng mục còn lại. Nhấn Lưu tiến độ hoặc Hoàn tất.');
      }
      return next;
    });
  };

  const openPointCard = (key, anchor) => {
    const trigger = anchor || modelRef.current?.querySelector(`[data-inspection-point="${key}"]`) || modelRef.current;
    setSelectedPoint(key);
    setPointCard({ key, anchor: trigger });
    setError('');
  };

  const closePointCard = (restoreFocus = true) => {
    const trigger = modelRef.current?.querySelector(`[data-inspection-point="${pointCard?.key}"]`) || pointCard?.anchor;
    setPointCard(null);
    if (restoreFocus && trigger?.isConnected) trigger.focus?.({ preventScroll: true });
  };

  const jumpToNextPending = () => {
    const nextItem = (data?.template || []).find((item) => !values[item.key]?.status);
    if (nextItem) openPointCard(nextItem.key);
  };

  const save = async (complete, start = false) => {
    if (busy || !enabled || (!start && (!validNotes || (complete && checked !== total)))) return;
    const code = container.containerCode;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.submitContainerSafetyInspection(code, {
        inspectionId: start ? null : latest.id,
        revision: start ? null : latest.revision,
        complete,
        templateVersion: data.templateVersion,
        summaryNotes: start ? null : notes.trim() || null,
        checks: start
          ? []
          : data.template
              .filter((item) => checks[item.key]?.status)
              .map(({ key }) => {
                const entry = checks[key];
                const payload = {
                  key,
                  status: entry.status,
                  notes: entry.notes?.trim() || null
                };
                if (entry.criteriaResults && Object.keys(entry.criteriaResults).length > 0) {
                  payload.criteriaResults = entry.criteriaResults;
                }
                if (entry.measurements && Object.keys(entry.measurements).length > 0) {
                  payload.measurements = entry.measurements;
                }
                if (entry.selectedReasons && entry.selectedReasons.length > 0) {
                  payload.selectedReasons = entry.selectedReasons;
                }
                return payload;
              })
      });
      if (currentCode.current !== code) return;
      const result = response?.result ?? response;
      apply(result);
      setNotice(
        start
          ? 'Đã mở lần kiểm tra mới. Đánh giá trực tiếp từng hạng mục trên container.'
          : complete
            ? 'Đã hoàn tất và lưu biên bản kiểm tra.'
            : 'Đã lưu tiến độ. Có thể rời trang và tiếp tục lần kiểm tra này sau.'
      );
      onInspectionChange?.(result);
    } catch (e) {
      if (currentCode.current === code) setError(e.message || 'Không lưu được hồ sơ kiểm tra.');
    } finally {
      if (currentCode.current === code) setBusy(false);
    }
  };

  const containerStatusLabel =
    CONTAINER_STATUSES[container.status]?.label || container.status || 'Chưa xác định';

  return (
    <section
      className="container-safety-inspection inspection-workspace"
      aria-label="Kiểm tra an toàn container"
    >
      <header className="container-safety-heading">
        <div className="container-safety-icon">
          <Truck size={22} />
        </div>
        <div>
          <p>PHƯƠNG TIỆN ĐANG KIỂM TRA</p>
          <h2>{container.containerCode}</h2>
          <span>
            {CONTAINER_TYPES[container.containerType] || container.containerType} ·{' '}
            {displayed ? `Lần kiểm tra #${displayed.inspectionNumber}` : 'Chưa có biên bản'}
          </span>
        </div>
        <span
          className={`container-safety-status ${
            passed
              ? 'is-passed'
              : displayed?.status === 'BLOCKED'
                ? 'is-blocked'
                : 'is-incomplete'
          }`}
        >
          {passed ? <ShieldCheck size={16} /> : <ClipboardCheck size={16} />}
          {status}
        </span>
      </header>

      {error && (
        <div className="container-notice container-notice-error" role="alert">
          {error}
          <button
            type="button"
            className="container-text-button"
            onClick={() => setReadVersion((v) => v + 1)}
          >
            Tải lại hồ sơ
          </button>
        </div>
      )}

      {!data && !error && <p role="status">Đang tải hồ sơ kiểm tra…</p>}
      {notice && (
        <p className="inspection-notice" role="status">
          {notice}
        </p>
      )}

      {data && (
        <>
          {/* Structured Dossier Summary Data */}
          <dl className="inspection-dossier-grid" aria-label="Thông tin hồ sơ container">
            <div className="inspection-dossier-card">
              <dt>
                <Building2 size={13} /> Chủ sở hữu / Đơn vị
              </dt>
              <dd>{container.ownerName || 'Chưa ghi nhận'}</dd>
            </div>
            <div className="inspection-dossier-card">
              <dt>
                <Truck size={13} /> Trạng thái thiết bị
              </dt>
              <dd>{containerStatusLabel}</dd>
            </div>
            <div className="inspection-dossier-card">
              <dt>
                <UserCheck size={13} /> Người kiểm tra
              </dt>
              <dd>{displayed?.inspectedBy || 'Chưa phân công'}</dd>
            </div>
            <div className="inspection-dossier-card">
              <dt>
                <CalendarClock size={13} /> {editing ? 'Lưu tiến độ lúc' : 'Thời điểm ghi nhận'}
              </dt>
              <dd>
                {displayed
                  ? formatDate(displayed.inspectedAt || displayed.updatedAt)
                  : 'Chưa có biên bản'}
              </dd>
            </div>
            <div className="inspection-dossier-card">
              <dt>
                <FileText size={13} /> Phiên bản checklist
              </dt>
              <dd>v{displayed?.templateVersion || data.templateVersion}</dd>
            </div>
          </dl>

          {/* Multi-Metric Progress Card */}
          <div className="inspection-progress">
            <div className="inspection-progress-head">
              <strong>
                {checked}/{total} hạng mục
              </strong>
              <div className="inspection-progress-pills">
                <span className="inspection-mini-pill inspection-mini-pill--pass">
                  <Check size={12} /> {passedCount} đạt
                </span>
                <span
                  className={`inspection-mini-pill ${
                    failures > 0 ? 'inspection-mini-pill--fail' : ''
                  }`}
                >
                  <AlertTriangle size={12} /> {failures} điểm không đạt
                </span>
                <span className="inspection-mini-pill">{pendingCount} chưa chấm</span>
                {(dirty || editing) && (
                  <span
                    className={`inspection-mini-pill ${
                      dirty ? 'inspection-mini-pill--dirty' : ''
                    }`}
                  >
                    {dirty ? 'Có thay đổi chưa lưu' : 'Tiến độ đã lưu'}
                  </span>
                )}
              </div>
            </div>
            <progress value={checked} max={total || 1} aria-label="Tiến độ kiểm tra" />
          </div>

          {!enabled && (
            <p className="container-notice" role="status">
              Container đang vận chuyển. Có thể xem hồ sơ; thực hiện kiểm tra trực tiếp sau khi kết
              thúc chuyến.
            </p>
          )}

          {historyId && (
            <p className="container-notice">
              Đang xem biên bản lịch sử · chỉ đọc.
              <button
                type="button"
                className="container-text-button"
                onClick={() => setHistoryId(null)}
              >
                Về lần kiểm tra hiện tại
              </button>
            </p>
          )}

          {editing && (
            <div className="inspection-save-bar">
              <span className="inspection-save-bar__status">
                {missingFailNotes > 0
                  ? `Cần nhập ghi chú khắc phục (tối thiểu 5 ký tự) cho ${missingFailNotes} mục không đạt.`
                  : checked === total
                    ? failures > 0
                      ? 'Đã đánh giá đủ hạng mục. Có lỗi: kết quả hoàn tất sẽ là Không đạt.'
                      : 'Đã đánh giá đủ hạng mục. Sẵn sàng hoàn tất biên bản.'
                    : `Còn ${pendingCount} hạng mục chưa kiểm tra.${
                        failures > 0 ? ' Có lỗi: kết quả hoàn tất sẽ là Không đạt.' : ''
                      }`}
              </span>
              <div className="inspection-save-bar__actions">
                {pendingCount > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy || !enabled}
                      onClick={jumpToNextPending}
                    >
                      <Crosshair size={15} /> Mục chưa chấm tiếp
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy || !enabled}
                      onClick={markRemainingPass}
                    >
                      <CheckCheck size={15} /> Đạt các mục còn lại
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || !enabled || !validNotes}
                  onClick={() => save(false)}
                >
                  <Save size={15} /> Lưu tiến độ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !enabled || checked !== total || !validNotes}
                  onClick={() => save(true)}
                >
                  <CheckCircle2 size={15} />
                  {busy ? 'Đang lưu…' : 'Hoàn tất đánh giá'}
                </button>
              </div>
            </div>
          )}

          <div className={`inspection-safety-banner grade-${safetyComposite.grade}`} aria-label="Chỉ số an toàn tổng hợp tổ hợp xe">
            <div className="inspection-safety-score">
              <span>CHỈ SỐ AN TOÀN TỔNG HỢP</span>
              <strong>
                {safetyComposite.overallSafetyPct != null
                  ? `${safetyComposite.overallSafetyPct}%`
                  : 'Chưa đo'}
              </strong>
              <small>
                {safetyComposite.grade === 'SAFE'
                  ? 'Đạt ngưỡng xuất bến an toàn'
                  : safetyComposite.grade === 'ADVISORY'
                    ? 'Có hao mòn cần theo dõi / bảo dưỡng'
                    : safetyComposite.grade === 'BLOCKED'
                      ? 'Cảnh báo an toàn — có lỗi trọng yếu'
                      : 'Bấm điểm trên mô hình hoặc đồng bộ Telemetry'}
              </small>
            </div>
            <div className="inspection-safety-metrics">
              <div>
                <span>Mức hư hại trung bình</span>
                <strong>
                  {safetyComposite.overallDamagePct != null
                    ? `${safetyComposite.overallDamagePct}%`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Mức an toàn tối đa sau sửa</span>
                <strong>
                  {safetyComposite.maxRecoverableSafetyPct != null
                    ? `${safetyComposite.maxRecoverableSafetyPct}%`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Độ phủ đo đạc</span>
                <strong>
                  {safetyComposite.evaluatedCount}/{safetyComposite.totalCount} điểm ({safetyComposite.coveragePct}%)
                </strong>
              </div>
            </div>
            {safetyComposite.lowestPart && safetyComposite.lowestPart.assessment.damagePct > 0 && (
              <div className="inspection-safety-priority">
                <strong>Ưu tiên tối ưu an toàn ({safetyComposite.lowestPart.item.label}):</strong>{' '}
                <span>{safetyComposite.lowestPart.assessment.recommendedAction}</span>
              </div>
            )}
          </div>

          <div className="inspection-exam-layout">
            <div className="inspection-exam-model" ref={modelRef}>
              <ContainerInspectionModel
                type={displayed?.containerType || container.containerType}
                template={data.template}
                results={values}
                telemetryPreview={telemetryPreview}
                onSelect={openPointCard}
                openPointKey={pointCard?.key}
                pointDialogId={pointCardId}
                selectedKey={selectedPoint}
              />
              <div className="inspection-exam-model-footer">
                <p className="inspection-vehicle-context">
                  <Truck size={15} />
                  <span>
                    Đầu kéo &amp; sơ mi rơ moóc hiển thị đầy đủ lốp, phanh, khung, sàn, CSC &amp; cụm lạnh.
                    Chọn trực tiếp từng điểm trên mô hình để đo chỉ số.
                  </span>
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editing && enabled && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={runTelemetrySync}
                    >
                      <Crosshair size={15} /> Đối chiếu tự động Telemetry
                    </button>
                  )}
                  {!editing && !historyId && enabled && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => save(false, true)}
                    >
                      {latest ? <RotateCcw size={15} /> : <Play size={15} />}
                      {busy ? 'Đang mở hồ sơ…' : latest ? 'Bắt đầu kiểm tra lại' : 'Bắt đầu kiểm tra'}
                    </button>
                  )}
                </div>
              </div>
              <p className="container-safety-note">
                Hồ sơ độc lập với phân công chuyến; kết quả đạt còn hiệu lực 24 giờ để đối chiếu trước xuất bến.
              </p>
            </div>

            {editing ? (
              <label className="container-field">
                <span>Nhận xét tổng kết biên bản</span>
                <textarea
                  rows={2}
                  maxLength={2000}
                  disabled={busy || !enabled}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Tổng hợp nhận xét chung & khuyến nghị bảo dưỡng (nếu có)..."
                />
              </label>
            ) : (
              displayed?.summaryNotes && (
                <p className="inspection-notice">{displayed.summaryNotes}</p>
              )
            )}
          </div>

          {data.history?.length > 0 && (
            <section className="inspection-history">
              <h3>Lịch sử kiểm tra · {data.history.length} lần</h3>
              <div>
                {data.history.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={displayed?.id === item.id}
                    onClick={() => {
                      if (dirty) {
                        setError('Lưu tiến độ trước khi chuyển sang biên bản khác.');
                        return;
                      }
                      setHistoryId(item.id === latest?.id ? null : item.id);
                    }}
                  >
                    <strong>
                      Lần #{item.inspectionNumber} ·{' '}
                      {item.status === 'DRAFT'
                        ? 'Đang kiểm tra'
                        : item.status === 'PASSED'
                          ? 'Đạt'
                          : 'Không đạt'}
                    </strong>
                    <span>
                      {formatDate(item.inspectedAt || item.updatedAt)} · {item.inspectedBy}
                    </span>
                    <small>
                      {item.checkedItemsCount}/{item.totalItemsCount} mục · {item.failedItemsCount}{' '}
                      lỗi
                    </small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {pointCard && data.template.some(item => item.key === pointCard.key) && <ContainerInspectionPointCard
            key={pointCard.key}
            id={pointCardId}
            item={data.template.find(item => item.key === pointCard.key)}
            number={data.template.findIndex(item => item.key === pointCard.key) + 1}
            total={total}
            anchor={pointCard.anchor}
            check={values[pointCard.key] || { status: '', notes: '' }}
            savedCheck={latest?.checks?.find(item => item.key === pointCard.key)}
            editing={editing}
            enabled={enabled}
            busy={busy}
            validInspection={validNotes}
            error={error}
            canStart={!editing && !historyId && enabled}
            onStart={() => save(false, true)}
            onUpdate={update}
            onUpdateCriterion={updateCriterion}
            onUpdateMeasurement={updateMeasurement}
            onSetConditionPct={updateConditionPct}
            onPassAllCriteria={passAllCriteria}
            onToggleReason={toggleReason}
            onSave={() => save(false)}
            onNext={editing && data.template.some(item => item.key !== pointCard.key && !values[item.key]?.status) ? () => {
              const next = data.template.find(item => item.key !== pointCard.key && !values[item.key]?.status);
              if (next) openPointCard(next.key);
            } : null}
            onClose={closePointCard}
          />}

          <p className="container-safety-note">
            Checklist vận hành nội bộ; đối chiếu thêm biển CSC, yêu cầu chủ hàng và quy trình kỹ
            thuật của đơn vị sở hữu.
          </p>
        </>
      )}
    </section>
  );
}
