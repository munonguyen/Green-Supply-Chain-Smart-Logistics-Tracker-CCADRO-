import React from 'react';
import { formatDate, formatNumber, sealData } from './containerPresentation';
import { signalFreshness } from './ContainerConnection';

export const CONTROL_STAGE_GUIDE = {
  PREPARATION: ['Chuẩn bị chuyến', 'Đối chiếu container, hàng và điểm giao; kiểm tra tải trọng, điều kiện bảo quản và chằng buộc.', 'Manifest và thông tin phân công phải khớp vận đơn hiện tại.'],
  DEPARTURE: ['Duyệt trước xuất bến', 'Đối chiếu kết quả từ chức năng Kiểm tra Container, tài xế, xe và biên bản Pre-trip đạt trong 24 giờ.', 'Chỉ cho phép xác nhận khi hồ sơ kiểm tra container độc lập đạt và còn hiệu lực, Pre-trip của xe/tài xế còn hiệu lực, seal và lộ trình đã được đối chiếu. Xác nhận chưa tự khởi hành; cần phát lệnh và tài xế thực hiện bước xuất bến.'],
  IN_TRANSIT: ['Theo dõi trong hành trình', 'Đối chiếu mốc GPS, nhiệt độ và tiến độ với tài xế; ghi rõ sự cố, liên hệ và hướng xử lý.', 'Dữ liệu thiếu thời điểm nhận không chứng minh được tình trạng hiện tại.'],
  HANDOVER: ['Đối soát bàn giao', 'Kiểm tra nơi giao, người nhận, niêm phong và số kiện thực nhận; đối chiếu ePOD trước hoàn tất.', 'Chữ ký ePOD được tài xế nộp; điều phối xác nhận sau khi đối chiếu.']
};

export function ControlEvidence({ fields = [] }) {
  if (!fields.length) return <p className="container-field-hint">Biên bản cũ chưa lưu bản dữ liệu đối chiếu tại thời điểm xác nhận.</p>;
  const groups = [...new Set(fields.map((field) => field.group))];
  return <details className="control-evidence">
    <summary>Dữ liệu đã lưu lúc xác nhận · {fields.length} trường</summary>
    {groups.map((group) => <section key={group}>
      <h4>{group}</h4>
      <dl>{fields.filter((field) => field.group === group).map((field) => (
        <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>
      ))}</dl>
    </section>)}
  </details>;
}

export default function ContainerControlContext({ container, workflow, items, manifestState, onSelectTab }) {
  const stage = workflow.stages.find((item) => !item.completedAt);
  const active = workflow.roundNumber > 0 && !workflow.completedAt;
  const completed = workflow.stages.filter((item) => item.completedAt).length;
  const manifest = container.assignedShipmentCode
    ? items.filter((item) => item.shipmentCode === container.assignedShipmentCode && !item.isDeleted) : [];
  const seal = sealData(container);
  const fields = [
    ['Vận đơn', container.assignedShipmentCode || 'Chưa phân công'],
    ['Điểm đi → điểm giao', [container.originName || 'Chưa khai báo', container.destinationName || 'Chưa khai báo'].join(' → ')],
    ['Xe / tài xế', [container.vehicleLicensePlate || 'Chưa gán xe', container.driverName || 'Chưa gán tài xế'].join(' · ')],
    ['Liên kết phân công', container.assignedShipmentId && container.assignedVehicleId && container.assignedDriverId ? 'Đã có ID vận đơn, xe và tài xế' : 'Chưa đủ ID để xác minh chuyến'],
    ['Hàng của vận đơn hiện tại', manifestState === 'ready' ? manifest.length + ' dòng · ' + formatNumber(manifest.reduce((sum, item) => sum + Number(item.parcelCount || 0), 0), ' kiện') : 'Manifest chưa tải được'],
    ['Khối lượng / tải tối đa', manifestState === 'ready' ? formatNumber(manifest.reduce((sum, item) => sum + Number(item.weightKg || 0), 0), ' kg') + ' / ' + formatNumber(container.maxPayloadTons, ' tấn') : 'Chưa xác minh tải trọng'],
    ['Số niêm phong', seal.number || 'Chưa khai báo'],
    ['GPS gần nhất', signalFreshness(container.lastPositionReceivedAt).label + ' · ' + formatDate(container.lastPositionReceivedAt)],
    ['Người nhận / thời điểm ePOD', [container.epodRecipient || 'Chưa có người nhận', formatDate(container.completedAt)].join(' · ')]
  ];
  return <section className="control-round-context" aria-label="Thông tin đối chiếu đợt kiểm soát">
    <header><h3>{active ? 'Đang chờ: ' + (stage?.label || 'Hoàn tất') : workflow.completedAt ? 'Đợt đã hoàn tất' : 'Chưa có đợt đang mở'}</h3>
      <span>{completed}/{workflow.stages.length} bước đã xác nhận</span></header>
    <p>{workflow.startedAt ? 'Mở bởi ' + workflow.startedBy + ' · ' + (workflow.startedRole || '') + ' · ' + formatDate(workflow.startedAt) : 'Mở đợt trước khi xác nhận chuẩn bị chuyến.'}</p>
    {workflow.completedAt && <p>Kết thúc: {formatDate(workflow.completedAt)} · Vận đơn đợt: {workflow.shipmentCode || 'Chưa ghi nhận'}</p>}
    <h4>Dữ liệu container hiện tại để đối chiếu</h4>
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="container-field-hint">Thông tin trên là hồ sơ hiện tại. Mỗi bước xác nhận mới lưu riêng một bản dữ liệu tại thời điểm đó; tích chọn vẫn cần kiểm tra thực tế.</p>
    <nav aria-label="Đối chiếu dữ liệu nguồn">
      {[['manifest', 'Xem hàng'], ['connection', 'Xem GPS / thiết bị'], ['route', 'Xem tuyến']].map(([tab, label]) => (
        <button key={tab} className="container-text-button" type="button" onClick={() => onSelectTab?.(tab)}>{label} →</button>
      ))}
    </nav>
  </section>;
}
