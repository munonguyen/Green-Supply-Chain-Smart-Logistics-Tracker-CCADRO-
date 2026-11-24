import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../../../services/api';
import { hasCurrentSafetyPass } from './containerSafety';
import { formatDate } from './containerPresentation';

export default function ContainerSafetyGate({ container, onInspectionChange, now }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => {
      api.getContainerSafetyInspection(container.containerCode).then(response => {
        if (!active) return;
        const result = response?.result ?? response;
        setData(result); setError(''); onInspectionChange(result);
      }).catch(e => { if (active) { setError(e.message); onInspectionChange(null); } });
    };
    onInspectionChange(null); load(); window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener('focus', load); };
  }, [container.containerCode, container.containerType, onInspectionChange]);
  const passed = hasCurrentSafetyPass(data, container, now);
  return <section className="inspection-dispatch-gate" aria-label="Kết quả kiểm tra container">
    <ShieldCheck size={24} /><div><h3>Đối chiếu an toàn container</h3>
      <p>{error || (!data ? 'Đang xác minh hồ sơ kiểm tra…' : passed ? `Đạt · lần #${data.inspection.inspectionNumber} · ${formatDate(data.inspection.inspectedAt)}`
        : data.inspection?.status === 'DRAFT' ? 'Hồ sơ đang kiểm tra; cần hoàn tất đánh giá.' : 'Cần kết quả kiểm tra đạt còn hiệu lực trước khi xuất bến.')}</p></div>
    <a className="btn btn-secondary" href={`/container-inspections?container=${encodeURIComponent(container.containerCode)}`}>Mở hồ sơ kiểm tra</a>
  </section>;
}
