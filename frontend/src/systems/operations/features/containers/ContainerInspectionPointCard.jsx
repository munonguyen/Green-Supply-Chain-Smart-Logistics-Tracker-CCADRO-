import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Save,
  ShieldAlert,
  X
} from 'lucide-react';
import { evaluateMetricBound, resolveInspectionItemSpec } from './containerInspectionCriteria';
import { AHI_BANDS, computePartSafetyAssessment, resolveAhiBand } from './containerSafetyIntelligence';
import './container-inspection-point-card.css';

export default function ContainerInspectionPointCard({
  id,
  item,
  number,
  total,
  anchor,
  check,
  savedCheck,
  editing,
  enabled,
  busy,
  validInspection,
  error,
  canStart,
  onStart,
  onUpdate,
  onUpdateCriterion,
  onUpdateMeasurement,
  onSetConditionPct,
  onPassAllCriteria,
  onToggleReason,
  onSave,
  onNext,
  onClose
}) {
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 440 });

  const spec = resolveInspectionItemSpec(item);
  const criteria = spec.criteria;
  const failureReasons = spec.failureReasons;
  const criteriaResults = check.criteriaResults || {};
  const measurements = check.measurements || {};
  const selectedReasons = check.selectedReasons || [];
  const note = check.notes || '';

  const hasFailedCriterion = Object.values(criteriaResults).some((v) => v === 'FAIL');
  const hasOutOfRangeMetric = criteria.some(
    (c) => evaluateMetricBound(c, measurements[c.code]) === 'OUT_OF_RANGE'
  );
  const invalidNote =
    check.status === 'FAIL' && note.trim().length < 5 && selectedReasons.length === 0;
  const invalidPassConflict = check.status === 'PASS' && (hasFailedCriterion || hasOutOfRangeMetric);

  const saved = Boolean(
    check.status &&
      savedCheck?.status === check.status &&
      (savedCheck.notes || '').trim() === note.trim() &&
      JSON.stringify(savedCheck.criteriaResults || null) ===
        JSON.stringify(Object.keys(criteriaResults).length ? criteriaResults : null) &&
      JSON.stringify(savedCheck.measurements || null) ===
        JSON.stringify(Object.keys(measurements).length ? measurements : null) &&
      JSON.stringify(savedCheck.selectedReasons || null) ===
        JSON.stringify(selectedReasons.length ? selectedReasons : null)
  );

  const editable = editing && enabled;
  const label =
    check.status === 'PASS' ? 'Đạt' : check.status === 'FAIL' ? 'Không đạt' : 'Chưa kiểm tra';

  const criteriaPassedCount = criteria.filter((c) => criteriaResults[c.code] === 'PASS').length;
  const criteriaFailedCount = criteria.filter((c) => criteriaResults[c.code] === 'FAIL').length;
  const recordedCriteriaCount = Object.keys(criteriaResults).length;
  const reasonCount = selectedReasons.length;
  const partStats = computePartSafetyAssessment(item, check);
  const conditionPct =
    measurements._conditionPct !== undefined && measurements._conditionPct !== ''
      ? Number(measurements._conditionPct)
      : partStats.evaluated
        ? partStats.safetyPct
        : 95;
  const activeBand = partStats.band || (check.status ? resolveAhiBand(conditionPct) : null);
  const costRatio = partStats.repairCostRatioPct ?? Math.round((100 - conditionPct) * 0.62);

  useLayoutEffect(() => {
    const place = () => {
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const width = Math.min(480, viewportWidth - 24);
      const height = Math.min(cardRef.current?.offsetHeight || 520, viewportHeight - 24);
      const trigger = anchor?.matches?.('[data-inspection-point]')
        ? anchor
        : anchor?.querySelector?.(`[data-inspection-point="${item.key}"]`) || anchor;
      const rect = trigger?.getBoundingClientRect?.();
      let left = viewportLeft + (viewportWidth - width) / 2;
      let top = viewportTop + viewportHeight - height - 12;
      if (viewportWidth > 640 && rect) {
        left =
          rect.right + 16 + width <= viewportLeft + viewportWidth - 12
            ? rect.right + 16
            : rect.left - width - 16;
        left = Math.max(
          viewportLeft + 12,
          Math.min(left, viewportLeft + viewportWidth - width - 12)
        );
        top = Math.max(
          viewportTop + 12,
          Math.min(rect.top - 20, viewportTop + viewportHeight - height - 12)
        );
      }
      setPosition({ left, top, width, maxHeight: viewportHeight - 24 });
    };
    place();
    const frame = requestAnimationFrame(place);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (cardRef.current) observer?.observe(cardRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [
    anchor,
    item.key,
    check.status,
    criteria.length,
    recordedCriteriaCount,
    reasonCount,
    editing,
    error,
    saved
  ]);

  useLayoutEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [item.key]);

  useEffect(() => {
    const outside = (event) => {
      if (
        !cardRef.current?.contains(event.target) &&
        !event.target.closest?.('[data-inspection-point]')
      )
        onClose(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose(true);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  return createPortal(
    <section
      id={id}
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-guidance`}
      className="inspection-point-card"
      style={position}
    >
      <header className="inspection-point-card-header">
        <span className={`inspection-point-card-number state-${check.status || 'PENDING'}`}>
          {number}
        </span>
        <div>
          <p>
            ĐIỂM KIỂM TRA {number}/{total} · {item.group}
          </p>
          <h3 id={`${id}-title`} ref={titleRef} tabIndex={-1}>
            {item.label}
          </h3>
        </div>
        <button
          type="button"
          className="inspection-point-card-close"
          aria-label="Đóng card kiểm tra"
          onClick={() => onClose(true)}
        >
          <X size={18} />
        </button>
      </header>

      <div className="inspection-point-card-body">
        <p id={`${id}-guidance`} className="inspection-point-card-guidance">
          {item.guidance}
        </p>

        <div className="point-objective-box">
          {(spec.standardRef || criteria.length > 0) && (
            <div className="point-objective-top">
              {spec.standardRef && (
                <span className="point-standard-pill">
                  <ClipboardList size={12} /> {spec.standardRef}
                </span>
              )}
              {criteria.length > 0 && (
                <span
                  className={`point-progress-pill${
                    criteriaFailedCount > 0
                      ? ' has-fail'
                      : criteriaPassedCount === criteria.length
                        ? ' is-complete'
                        : ''
                  }`}
                >
                  Tiêu chí: {criteriaPassedCount}/{criteria.length} đạt
                </span>
              )}
            </div>
          )}
          {spec.objective && (
            <p className="point-objective-text">
              <strong>Mục tiêu: </strong>
              {spec.objective}
            </p>
          )}
          <div className="point-safety-telemetry" aria-label="Chỉ số an toàn và khả năng phục hồi bộ phận">
            <div>
              <span>An toàn hiện tại</span>
              <strong>{partStats.evaluated ? `${partStats.safetyPct}%` : 'Chưa đo'}</strong>
            </div>
            <div>
              <span>Hao mòn / Hư hại</span>
              <strong>{partStats.evaluated ? `${partStats.damagePct}%` : '—'}</strong>
            </div>
            <div>
              <span>Sửa / Phục hồi được</span>
              <strong>
                {partStats.evaluated
                  ? partStats.damagePct > 0
                    ? `${partStats.repairablePct}% → Tối đa ${partStats.postRepairSafetyPct}%`
                    : 'Không cần sửa (100%)'
                  : '—'}
              </strong>
            </div>
            <div>
              <span>Chi phí sửa / Thay mới</span>
              <strong className={costRatio > 45 && partStats.evaluated ? 'is-danger' : ''}>
                {partStats.evaluated
                  ? costRatio > 45
                    ? `${costRatio}% RAV · Thay mới`
                    : `${costRatio}% RAV`
                  : '—'}
              </strong>
            </div>
          </div>
          {partStats.evaluated && partStats.damagePct > 0 && (
            <p className="point-repair-advice">
              <strong>Đề xuất kỹ thuật:</strong> {partStats.recommendedAction}
            </p>
          )}
        </div>

        {editable && (
          <section className="point-percentage-evaluator" aria-label="Đánh giá tình trạng theo phần trăm ISO 55000">
            <div className="point-pct-head">
              <span>Chấm điểm % tình trạng (ISO 55000)</span>
              <span className={`point-pct-badge ${conditionPct < 70 || check.status === 'FAIL' ? 'is-fail' : check.status === 'PASS' ? 'is-pass' : ''}`}>
                {check.status
                  ? `${conditionPct}% · ${activeBand?.label?.split('·')[0]?.trim() || 'Đã chấm'}`
                  : 'Kéo hoặc chọn mức %'}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              disabled={busy}
              className={`point-pct-slider${conditionPct < 70 ? ' is-fail' : ''}`}
              aria-label="Phần trăm tình trạng an toàn bộ phận"
              value={conditionPct}
              onChange={(event) => onSetConditionPct?.(item.key, item, event.target.value)}
            />
            <div className="point-pct-scale" aria-hidden="true">
              <span>0% (Hỏng)</span>
              <span>50%</span>
              <span>70% Ngưỡng đạt</span>
              <span>100%</span>
            </div>

            <div className="point-pct-presets" role="group" aria-label="Chọn nhanh cấp độ AHI theo %">
              {AHI_BANDS.map((band) => {
                const pressed = Boolean(
                  check.status && Number(measurements._conditionPct) === band.pct
                );
                return (
                  <button
                    key={band.id}
                    type="button"
                    disabled={busy}
                    className={`point-pct-preset ${band.pass ? 'is-pass' : 'is-fail'}`}
                    aria-pressed={pressed}
                    onClick={() => onSetConditionPct?.(item.key, item, band.pct)}
                  >
                    {band.shortLabel}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {criteria.length > 0 && (
          <div className="point-criteria-section" aria-label="Tiêu chí và chỉ số bộ phận">
            <div className="point-criteria-head">
              <span>Tiêu chí &amp; chỉ số đo chuẩn</span>
              {editable && onPassAllCriteria && (
                <button
                  type="button"
                  className="point-criteria-quick"
                  disabled={busy}
                  onClick={() => onPassAllCriteria(item.key, criteria)}
                >
                  <CheckCheck size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                  Đạt tất cả tiêu chí
                </button>
              )}
            </div>

            {criteria.map((c) => {
              const cState = criteriaResults[c.code] || '';
              const measured = measurements[c.code] ?? '';
              const boundState = evaluateMetricBound(c, measured);
              return (
                <div
                  key={c.code}
                  className={`point-criteria-row${
                    cState === 'FAIL' || boundState === 'OUT_OF_RANGE'
                      ? ' is-fail'
                      : cState === 'PASS'
                        ? ' is-pass'
                        : ''
                  }`}
                >
                  <div className="point-criteria-row-top">
                    <div className="point-criteria-label">
                      <strong>{c.label}</strong>
                      <small>
                        Ngưỡng chuẩn: <b>{c.thresholdLabel}</b>
                      </small>
                    </div>
                    {editable ? (
                      <div className="point-criteria-btns">
                        <button
                          type="button"
                          disabled={busy}
                          className="is-c-pass"
                          aria-label={`Đạt tiêu chí · ${c.label}`}
                          aria-pressed={cState === 'PASS'}
                          onClick={() => onUpdateCriterion?.(item.key, c.code, 'PASS')}
                        >
                          Đạt tiêu chí
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="is-c-fail"
                          aria-label={`Lỗi tiêu chí · ${c.label}`}
                          aria-pressed={cState === 'FAIL'}
                          onClick={() => onUpdateCriterion?.(item.key, c.code, 'FAIL')}
                        >
                          Lỗi
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`point-metric-bound ${
                          cState === 'FAIL' ? 'is-bad' : cState === 'PASS' ? 'is-ok' : ''
                        }`}
                      >
                        {cState === 'PASS' ? 'Đạt' : cState === 'FAIL' ? 'Lỗi' : 'Chưa chấm'}
                      </span>
                    )}
                  </div>

                  {c.metricName && (
                    <div className="point-metric-input-row">
                      {editable ? (
                        <label>
                          <Gauge size={13} />
                          <span>{c.metricName}:</span>
                          <input
                            type="number"
                            step="any"
                            disabled={busy}
                            aria-label={`Chỉ số ${c.label}`}
                            placeholder="Nhập số đo"
                            value={measured}
                            onChange={(e) => onUpdateMeasurement?.(item.key, c, e.target.value)}
                          />
                          <span className="point-metric-unit">{c.unit}</span>
                        </label>
                      ) : (
                        measured !== '' && (
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {c.metricName}: <strong>{measured} {c.unit}</strong>
                          </span>
                        )
                      )}
                      {boundState === 'IN_RANGE' && (
                        <span className="point-metric-bound is-ok">Trong ngưỡng</span>
                      )}
                      {boundState === 'OUT_OF_RANGE' && (
                        <span className="point-metric-bound is-bad">Vượt ngưỡng</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <span className={`inspection-point-card-verdict state-${check.status || 'PENDING'}`}>
          {check.status === 'PASS' ? (
            <CheckCircle2 size={15} />
          ) : check.status === 'FAIL' ? (
            <AlertTriangle size={15} />
          ) : null}
          {label}
        </span>

        {editable ? (
          <>
            <div
              className="inspection-point-card-options"
              role="group"
              aria-label={`Kết quả tại điểm · ${item.label}`}
            >
              <button
                type="button"
                disabled={busy || hasFailedCriterion || hasOutOfRangeMetric}
                aria-pressed={check.status === 'PASS'}
                className="point-pass"
                onClick={() => onUpdate(item.key, 'status', 'PASS')}
              >
                <Check size={17} /> Đạt
              </button>
              <button
                type="button"
                disabled={busy}
                aria-pressed={check.status === 'FAIL'}
                className="point-fail"
                onClick={() => onUpdate(item.key, 'status', 'FAIL')}
              >
                <AlertTriangle size={17} /> Không đạt
              </button>
            </div>

            {(hasFailedCriterion || hasOutOfRangeMetric) && (
              <p className="inspection-point-card-warning">
                <ShieldAlert size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                Có tiêu chí hoặc chỉ số vượt ngưỡng — điểm này chỉ có thể ghi nhận Không đạt.
              </p>
            )}

            <details className="point-optional-notes" open={Boolean(invalidNote || selectedReasons.length > 0)}>
              <summary>Ghi chú hiện trường &amp; lý do chi tiết (tự động từ % — tùy chọn bổ sung)</summary>
              {failureReasons.length > 0 && (
                <div className="point-reasons-box" style={{ marginBottom: 8 }}>
                  <span>Lý do chuẩn hóa (chọn nhanh để ghi nhận nguyên nhân):</span>
                  <div className="point-reasons-list">
                    {failureReasons.map((reason) => {
                      const active = selectedReasons.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          disabled={busy}
                          className="point-reason-chip"
                          aria-pressed={active}
                          onClick={() => onToggleReason?.(item.key, reason)}
                        >
                          {reason}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="inspection-point-card-field">
                <span>
                  {check.status === 'FAIL'
                    ? 'Hiện trạng cần khắc phục · bắt buộc nếu chưa chấm %'
                    : 'Ghi nhận thực tế (tùy chọn)'}
                </span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  disabled={busy || !check.status}
                  value={note}
                  required={check.status === 'FAIL' && selectedReasons.length === 0}
                  aria-invalid={invalidNote}
                  aria-describedby={invalidNote ? `${id}-note-error` : undefined}
                  placeholder={
                    check.status === 'FAIL'
                      ? 'Mô tả hư hỏng, chỉ số đo thực tế và hướng xử lý…'
                      : 'Kết quả đo thực tế, tình trạng quan sát…'
                  }
                  onChange={(event) => onUpdate(item.key, 'notes', event.target.value)}
                />
              </label>
            </details>

            {invalidNote && (
              <p id={`${id}-note-error`} className="inspection-point-card-warning">
                Mục không đạt cần chọn lý do hoặc mô tả tối thiểu 5 ký tự.
              </p>
            )}
            {!invalidNote && !validInspection && (
              <p className="inspection-point-card-warning">
                Còn hạng mục khác chưa có đủ mô tả lỗi để lưu tiến độ.
              </p>
            )}
            <p
              className={`inspection-point-card-save-state${saved ? ' is-saved' : ''}`}
              role="status"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={14} /> Đã lưu vào hồ sơ
                </>
              ) : check.status ? (
                'Có thay đổi chưa lưu'
              ) : (
                'Đánh giá theo tiêu chí và chọn kết quả sau khi kiểm tra trực tiếp.'
              )}
            </p>
          </>
        ) : (
          <>
            {selectedReasons.length > 0 && (
              <div className="point-reasons-box">
                <span>Lý do đã ghi nhận:</span>
                <div className="point-reasons-list">
                  {selectedReasons.map((r) => (
                    <span key={r} className="point-reason-chip" aria-pressed="true">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="inspection-point-card-readonly">
              {note || 'Chưa có ghi nhận thực tế tại điểm này.'}
            </p>
            {canStart ? (
              <p className="inspection-point-card-hint">
                Bắt đầu lần kiểm tra để chấm kết quả ngay tại vị trí này.
              </p>
            ) : (
              <p className="inspection-point-card-hint">Hồ sơ đang ở chế độ chỉ xem.</p>
            )}
          </>
        )}

        {error && (
          <p className="inspection-point-card-warning" role="alert">
            {error}
          </p>
        )}
      </div>

      <footer className="inspection-point-card-footer">
        {editable ? (
          <>
            {onNext && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || invalidNote}
                onClick={onNext}
              >
                Điểm tiếp <ArrowRight size={15} />
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !check.status || invalidNote || invalidPassConflict || !validInspection}
              onClick={onSave}
            >
              <Save size={16} />
              {busy ? 'Đang lưu…' : 'Lưu kết quả'}
            </button>
          </>
        ) : canStart ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onStart}>
            {busy ? 'Đang mở hồ sơ…' : 'Bắt đầu kiểm tra tại đây'}
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => onClose(true)}>
            Đóng
          </button>
        )}
      </footer>
    </section>,
    document.body
  );
}
