import React, { useEffect, useState } from 'react';
import ContainerDispatchRelease from './ContainerDispatchRelease';
import ContainerControlContext, { ControlEvidence, CONTROL_STAGE_GUIDE } from './ContainerControlContext';
import ContainerSafetyGate from './ContainerSafetyGate';
import './container-inspections.css';
import { hasCurrentSafetyPass } from './containerSafety';
import { api } from '../../../../services/api';
import { asList, formatDate } from './containerPresentation';

const roleLabels = { ADMIN: 'Quản trị', DISPATCHER: 'Điều phối', SAFETY_MANAGER: 'An toàn' };

function StageForm({ stage, busy, onConfirm }) {
  const [checked, setChecked] = useState([]);
  const [notes, setNotes] = useState('');
  return (
    <form
      className="container-stage-form"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(checked, notes.trim());
      }}
    >
      <fieldset disabled={busy}>
        <legend>Các mục cần xác nhận</legend>
        {stage.checks.map(({ key, label }) => (
          <label key={key} className="container-checkbox">
            <input
              type="checkbox"
              checked={checked.includes(key)}
              onChange={(event) => {
                setChecked(
                  event.target.checked
                    ? [...checked, key]
                    : checked.filter((value) => value !== key)
                );
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="container-field">
        <span>Ghi chú kết quả kiểm tra</span>
        <textarea
          disabled={busy}
          required
          maxLength={2000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Ghi kết quả thực tế, chứng từ đã đối chiếu, điểm khác biệt và cách xử lý / người liên hệ."
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy || checked.length !== stage.checks.length || !notes.trim()}
      >
        {busy ? 'Đang lưu…' : 'Xác nhận ' + stage.label.toLocaleLowerCase('vi')}
      </button>
    </form>
  );
}

function AssignmentForm({ code, onSave, busy }) {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([api.getShipments(), api.getVehicles(), api.getDispatchDrivers()])
      .then(([shipments, vehicles, drivers]) => {
        if (active)
          setOptions({
            shipments: asList(shipments).filter(
              (item) =>
                item.originName &&
                item.destinationName &&
                !['DELIVERED', 'CANCELLED', 'IN_TRANSIT', 'DISPATCHED'].includes(item.status)
            ),
            vehicles: asList(vehicles).filter((item) => item.status === 'AVAILABLE'),
            drivers: asList(drivers)
          });
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!options) return <p role="status">Đang tải vận đơn, xe và tài xế…</p>;
  return (
    <form
      className="container-stage-form"
      data-container-focus="assignment"
      aria-label="Phân công vận đơn, xe và tài xế"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const shipment = options.shipments.find(({ id }) => id === data.get('shipments'));
        const vehicle = options.vehicles.find(({ id }) => id === data.get('vehicles'));
        const driver = options.drivers.find(({ id }) => id === data.get('drivers'));
        if (!shipment || !vehicle || !driver?.eligible) return;
        onSave(() =>
          api.assignContainerTrip(code, {
            assignedShipmentId: shipment.id,
            assignedShipmentCode: shipment.shipmentCode,
            assignedDriverId: driver.id,
            assignedVehicleId: vehicle.id,
            vehicleLicensePlate: vehicle.plateNumber,
            vehicleTypeLabel: vehicle.fuelType,
            originName: shipment.originName,
            destinationName: shipment.destinationName
          })
        );
      }}
    >
      <div className="container-form-grid">
        {[
          [
            'shipments',
            'Vận đơn',
            (item) => `${item.shipmentCode} · ${item.originName} → ${item.destinationName}`
          ],
          ['vehicles', 'Xe', (item) => item.plateNumber],
          [
            'drivers',
            'Tài xế',
            (item) =>
              item.eligible ? item.fullName : `${item.fullName} · ${item.reasons.join(', ')}`
          ]
        ].map(([name, label, describe]) => (
          <label key={name} className="container-field">
            <span>{label}</span>
            <select name={name} required defaultValue="" disabled={busy}>
              <option value="">
                {options[name].length
                  ? 'Chọn ' + label.toLocaleLowerCase('vi')
                  : 'Chưa có lựa chọn phù hợp'}
              </option>
              {options[name].map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={name === 'drivers' && !item.eligible}
                >
                  {describe(item)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        Lưu phân công
      </button>
    </form>
  );
}

function StageRecord({ stage }) {
  return (
    <div className="container-stage-record">
      <p>
        {stage.completedBy} · {roleLabels[stage.completedRole] || stage.completedRole} ·{' '}
        {formatDate(stage.completedAt)}
      </p>
      <ul>
        {stage.checks
          .filter(({ key }) => stage.checkedKeys.includes(key))
          .map(({ key, label }) => (
            <li key={key}>{label}</li>
          ))}
      </ul>
      <p className="container-stage-notes">{stage.notes}</p>
      <ControlEvidence fields={stage.evidence} />
    </div>
  );
}

export default function ContainerControlPanel({
  container,
  role,
  canManage,
  onRefresh,
  manifestState,
  items,
  onSelectTab,
  onAddItem,
  actionRequest
}) {
  const code = container.containerCode;
  const [workflow, setWorkflow] = useState(null);
  const [readError, setReadError] = useState('');
  const [writeError, setWriteError] = useState('');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(actionRequest?.target === 'assignment');
  const [result, setResult] = useState('');
  const [safetyInspection, setSafetyInspection] = useState(null);
  const [safetyNow, setSafetyNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setSafetyNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (actionRequest?.target === 'assignment') setAssigning(true);
  }, [actionRequest]);
  const loadAgain = () => setVersion((value) => value + 1);
  useEffect(() => {
    let active = true;
    api
      .getContainerControl(code)
      .then((response) => {
        if (active) {
          setWorkflow(response.result);
          setReadError('');
        }
      })
      .catch((error) => {
        if (active) setReadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [code, version]);

  const save = async (operation, reloadWorkflow = false) => {
    setBusy(true);
    setWriteError('');
    setResult('');
    try {
      const response = await operation();
      if (reloadWorkflow) setWorkflow(response.result);
      setAssigning(false);
      setResult(response.message || 'Đã lưu thay đổi.');
      await onRefresh?.();
    } catch (failure) {
      setWriteError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  if (readError)
    return (
      <div className="container-notice container-notice-error" role="alert">
        {readError}
        <button className="container-text-button" type="button" onClick={loadAgain}>
          Tải lại đợt kiểm soát
        </button>
      </div>
    );
  if (!workflow)
    return (
      <p className="container-empty" role="status">
        Đang tải đợt kiểm soát…
      </p>
    );
  const activeStage = workflow.stages.find((stage) => !stage.completedAt);
  const activeRound = workflow.roundNumber > 0 && !workflow.completedAt;
  const canStart = roleLabels[role] && ['AVAILABLE', 'ASSIGNED'].includes(container.status);
  const hasAssignedTrip =
    container.status === 'ASSIGNED' &&
    container.assignedVehicleId &&
    container.assignedDriverId &&
    container.assignedShipmentId;
  const hasEpod =
    container.status === 'DELIVERED' && container.completedAt && container.epodSignature;
  return (
    <section className="container-control" aria-label="Kiểm soát theo đợt">
      <div className="container-manifest-heading">
        <div>
          <h3>
            {workflow.roundNumber
              ? 'Đợt kiểm soát #' + workflow.roundNumber
              : 'Chưa mở đợt kiểm soát'}
          </h3>
          <p>
            {workflow.startedAt
              ? `${workflow.startedBy} · ${formatDate(workflow.startedAt)}`
              : 'Mỗi chuyến có một đợt xác nhận theo bốn giai đoạn.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => {
            loadAgain();
            onRefresh?.();
          }}
        >
          Cập nhật đợt
        </button>
      </div>
      {writeError && (
        <div className="container-notice container-notice-error" role="alert">
          {writeError}
        </div>
      )}
      {result && (
        <p className="container-field-hint" role="status">
          {result}
        </p>
      )}
      <ContainerControlContext {...{ container, workflow, items, manifestState, onSelectTab }} />
      <ContainerSafetyGate container={container} onInspectionChange={setSafetyInspection} now={safetyNow} />
      {!activeRound &&
        (canStart ? (
          <button
            type="button"
            className="btn btn-primary"
            data-container-focus={actionRequest?.target === 'assignment' ? 'assignment' : undefined}
            disabled={busy}
            onClick={() =>
              save(() => api.startContainerControlRound(code, workflow.roundNumber), true)
            }
          >
            Mở đợt kiểm soát
          </button>
        ) : workflow.completedAt && canManage && container.status === 'DELIVERED' ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => save(() => api.updateContainerStatus(code, 'AVAILABLE'))}
          >
            Đưa về sẵn sàng
          </button>
        ) : (
          <p className="container-field-hint">
            Có thể mở đợt khi container sẵn sàng hoặc đã phân công.
          </p>
        ))}
      {activeRound &&
        ['PREPARATION', 'DEPARTURE'].includes(activeStage?.stage) &&
        !hasAssignedTrip &&
        canManage && (
          <div className="container-assignment">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              aria-expanded={assigning}
              onClick={() => setAssigning(!assigning)}
            >
              {assigning ? 'Đóng phân công' : 'Phân công chuyến'}
            </button>
            {assigning && <AssignmentForm code={code} busy={busy} onSave={save} />}
          </div>
        )}
      {hasAssignedTrip && canManage && (
        <div data-container-focus={actionRequest?.target === 'assignment' ? 'assignment' : undefined}>
          <ContainerDispatchRelease {...{ container, onSelectTab, onRefresh }} />
        </div>
      )}
      <ol className="container-stages">
        {workflow.stages.map((stage) => {
          const current = activeRound && stage === activeStage;
          const blocker =
            ['PREPARATION', 'DEPARTURE'].includes(stage.stage) && !hasAssignedTrip
              ? 'Cần phân công vận đơn, xe và tài xế.'
              : ['PREPARATION', 'DEPARTURE'].includes(stage.stage) &&
                  (manifestState !== 'ready' ||
                    !items.some((item) => item.shipmentCode === container.assignedShipmentCode))
                ? 'Cần bổ sung và đối chiếu hàng hóa của vận đơn hiện tại trong tab Hàng hóa.'
                : stage.stage === 'DEPARTURE' && !hasCurrentSafetyPass(safetyInspection, container, safetyNow)
                  ? 'Cần hoàn tất hồ sơ kiểm tra container và có kết quả đạt trong 24 giờ, đúng loại và phiên bản checklist.'
                : stage.stage === 'IN_TRANSIT' && container.status !== 'IN_TRANSIT'
                  ? 'Container chưa xuất bến.'
                  : stage.stage === 'HANDOVER' && !hasEpod
                    ? 'Chờ tài xế nộp ePOD trong ca vận hành.'
                    : '';
          return (
            <li
              key={stage.stage}
              className="container-stage"
              data-container-focus={actionRequest?.target === 'handover' && stage.stage === 'HANDOVER' ? 'handover' : undefined}
              aria-current={current ? 'step' : undefined}
            >
              <div className="container-stage-heading">
                <h4>{stage.label}</h4>
                <span>
                  {stage.completedAt ? 'Đã xác nhận' : current ? 'Đến lượt kiểm soát' : 'Đang chờ'}
                </span>
              </div>
              <p className="control-stage-purpose">{CONTROL_STAGE_GUIDE[stage.stage]?.[1]}</p>
              <p className="container-field-hint">{CONTROL_STAGE_GUIDE[stage.stage]?.[2]}</p>
              {stage.completedAt ? (
                <StageRecord stage={stage} />
              ) : (
                current && (
                  <>
                    {blocker && (
                      <div className="container-field-hint">
                        {blocker}
                        {canManage && /hàng hóa/.test(blocker) && (
                          <button
                            type="button"
                            className="container-text-button"
                            onClick={() => {
                              onSelectTab?.('manifest');
                              onAddItem?.();
                            }}
                          >
                            Bổ sung hàng ngay
                          </button>
                        )}
                      </div>
                    )}
                    {!stage.permittedRoles.includes(role) ? (
                      <p className="container-field-hint">
                        Vai trò xác nhận:{' '}
                        {stage.permittedRoles.map((key) => roleLabels[key]).join(', ')}.
                      </p>
                    ) : (
                      !blocker && (
                        <StageForm
                          key={`${workflow.roundNumber}-${stage.stage}`}
                          stage={stage}
                          busy={busy}
                          onConfirm={(checkedKeys, notes) =>
                            save(
                              () =>
                                api.confirmContainerControlStage(code, stage.stage, {
                                  roundNumber: workflow.roundNumber,
                                  checkedKeys,
                                  notes
                                }),
                              true
                            )
                          }
                        />
                      )
                    )}
                  </>
                )
              )}
            </li>
          );
        })}
      </ol>
      {workflow.history.length > 0 && (
        <div className="container-control-history">
          <h3>Lịch sử các đợt</h3>
          {workflow.history.map((round) => (
            <details key={round.roundNumber}>
              <summary>
                Đợt #{round.roundNumber} · {round.shipmentCode || 'Chưa ghi vận đơn'} ·{' '}
                {formatDate(round.startedAt)}
              </summary>
              {round.epodRecipient && (
                <p className="container-field-hint">
                  ePOD · {round.epodRecipient} · {formatDate(round.epodAt)}
                </p>
              )}
              {round.stages
                .filter((stage) => stage.completedAt)
                .map((stage) => (
                  <div key={stage.stage}>
                    <h4>{stage.label}</h4>
                    <StageRecord stage={stage} />
                  </div>
                ))}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
