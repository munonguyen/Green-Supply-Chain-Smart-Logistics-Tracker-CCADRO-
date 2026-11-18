import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';

export default function OperationSelectionPage({ mode }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const trips = mode === 'tracking' || mode === 'carbon';
  const title = {dispatch:'Chọn vận đơn để điều phối',planning:'Chọn vận đơn để lập tuyến',tracking:'Chọn chuyến để giám sát',carbon:'Chọn chuyến để xem phát thải'}[mode];
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    (trips ? api.getTrips() : api.getShipments()).then((r) => {
      if (active) setItems((r.result || []).filter((i) => !i.isDeleted));
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trips]);
  const path = (id) => mode === 'carbon' ? `/trips/${id}/carbon` : mode === 'tracking' ? `/trips/${id}` : `/${mode}/${id}`;
  return <div className="page-body"><h2>{title}</h2>
    {loading && <p role="status">Đang tải danh sách…</p>}
    {error && <p role="alert">Chưa tải được dữ liệu: {error}</p>}
    {!loading && !error && !items.length && <p>Chưa có {trips ? 'chuyến' : 'vận đơn'} phù hợp.</p>}
    <div className="table-wrapper"><table><thead><tr><th>Mã</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{items.map((i) => <tr key={i.id}><td>{i.tripCode || i.shipmentCode || i.id}</td><td>{i.status}</td><td><Link className="btn btn-secondary" to={path(i.id)}>Mở chi tiết</Link></td></tr>)}</tbody>
    </table></div>
  </div>;
}
