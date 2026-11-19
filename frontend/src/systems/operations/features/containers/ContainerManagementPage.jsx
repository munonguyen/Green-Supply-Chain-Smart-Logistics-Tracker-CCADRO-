import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, Truck } from 'lucide-react';
import { api } from '../../../../services/api';

const STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'MAINTENANCE'];
const TYPES = ['DRY_20FT', 'DRY_40FT', 'REEFER_20FT', 'REEFER_40FT', 'FLAT_RACK', 'OPEN_TOP'];
const emptyContainer = {
  containerCode: '', containerType: 'DRY_40FT', isoType: '45G1', ownerName: '',
  tareWeightTons: '', maxPayloadTons: '', cubicCapacityM3: '', isReefer: false,
  responsibleCompanyId: '', responsibleCompanyCode: '', responsibleCompanyName: ''
};
const emptyItem = {
  itemCode: '', shipmentCode: '', hubCode: '', cargoName: '', cargoCategory: '',
  consigneeName: '', consigneePhone: '', deliveryAddress: '', deliveryZoneName: '',
  deliveryLat: '', deliveryLng: '', weightKg: '', parcelCount: 1, requiredTempC: '',
  requiresColdChain: false, slaWindow: 'Theo thỏa thuận'
};
const unwrap = (response) => response?.result ?? response;
const statusLabel = {
  AVAILABLE: 'Sẵn sàng', ASSIGNED: 'Đã phân công', IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao', MAINTENANCE: 'Bảo trì'
};

export default function ContainerManagementPage() {
  const [containers, setContainers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [containerForm, setContainerForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [containerRes, companyRes, vehicleRes, hubRes] = await Promise.all([
        api.getContainers(), api.getCompanies(), api.getVehicles(), api.getDistributionHubs()
      ]);
      const list = unwrap(containerRes) || [];
      setContainers(Array.isArray(list) ? list : []);
      setCompanies(unwrap(companyRes) || []);
      setVehicles(unwrap(vehicleRes) || []);
      setHubs(unwrap(hubRes) || []);
      setSelectedCode((current) => current || list?.[0]?.containerCode || '');
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu quản lý container.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredContainers = useMemo(() => containers.filter((container) => {
    const matchesStatus = statusFilter === 'ALL' || container.status === statusFilter;
    const text = `${container.containerCode} ${container.responsibleCompanyName || ''} ${container.responsibleCompanyCode || ''} ${container.vehicleLicensePlate || ''} ${container.destinationName || ''}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  }), [containers, statusFilter, query]);
  const selected = containers.find((container) => container.containerCode === selectedCode) || null;
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, containers.filter((c) => c.status === status).length])), [containers]);

  const loadManifest = async (containerCode) => {
    if (!containerCode) return setItems([]);
    try {
      const response = await api.getContainerManifestItems({ containerCode });
      setItems((unwrap(response) || []).filter((item) => !item.isDeleted));
    } catch (err) {
      setError(err?.message || 'Không tải được manifest của container.');
      setItems([]);
    }
  };

  useEffect(() => { loadManifest(selectedCode); }, [selectedCode]);

  const submitContainer = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const company = companies.find((item) => item.id === containerForm.responsibleCompanyId);
      const payload = {
        ...containerForm,
        tareWeightTons: Number(containerForm.tareWeightTons),
        maxPayloadTons: Number(containerForm.maxPayloadTons),
        cubicCapacityM3: Number(containerForm.cubicCapacityM3),
        responsibleCompanyCode: company?.companyCode || '',
        responsibleCompanyName: company?.companyName || ''
      };
      await api.createContainer(payload);
      setContainerForm(null);
      await load();
      setSelectedCode(payload.containerCode);
    } catch (err) {
      setError(err?.message || 'Không tạo được hồ sơ container.');
    } finally { setSaving(false); }
  };

  const submitItem = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...itemForm,
        deliveryLat: Number(itemForm.deliveryLat), deliveryLng: Number(itemForm.deliveryLng),
        weightKg: Number(itemForm.weightKg), parcelCount: Number(itemForm.parcelCount),
        requiredTempC: itemForm.requiredTempC === '' ? null : Number(itemForm.requiredTempC)
      };
      await api.createContainerManifestItem(selectedCode, payload);
      setItemForm(null);
      await loadManifest(selectedCode);
    } catch (err) {
      setError(err?.message || 'Không thêm được mặt hàng vào manifest.');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-body">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div><div className="eyebrow">Tài sản vận tải · Container & Manifest</div><h1 style={{ margin: '6px 0' }}>Quản lý Container</h1><p style={{ margin: 0, color: 'var(--text-muted)' }}>Theo dõi thiết bị, xe đầu kéo, công ty phụ trách và hàng hóa theo từng mã sản phẩm.</p></div>
        <button className="btn btn-primary" type="button" onClick={() => setContainerForm({ ...emptyContainer })}><Plus size={16} /> Tạo container</button>
      </div>
      {error && <div role="alert" className="alert alert-error" style={{ margin: '14px 0' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, margin: '18px 0' }}>
        {[['Tổng container', containers.length], ...STATUSES.map((status) => [statusLabel[status], counts[status] || 0]), ['Đầu kéo sẵn sàng', vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length]].map(([label, value]) => <div className="card" key={label} style={{ padding: 14 }}><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 0.85fr) minmax(520px, 1.7fr)', gap: 16, alignItems: 'start' }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 14, display: 'grid', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Search size={16} /><input aria-label="Tìm container" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mã container, công ty, biển số" /></label>
            <select aria-label="Lọc trạng thái container" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">Tất cả trạng thái</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select>
          </div>
          {loading ? <p style={{ padding: 16 }}>Đang tải...</p> : filteredContainers.length === 0 ? <p style={{ padding: 16, color: 'var(--text-muted)' }}>Không có container phù hợp.</p> : filteredContainers.map((container) => <button type="button" key={container.id} onClick={() => setSelectedCode(container.containerCode)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border-color)', background: container.containerCode === selectedCode ? 'var(--bg-subtle)' : 'transparent', color: 'inherit', padding: 14, cursor: 'pointer' }}>
            <strong>{container.containerCode}</strong><span className="badge" style={{ float: 'right' }}>{statusLabel[container.status] || container.status}</span>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>{container.responsibleCompanyName || 'Chưa gán công ty'} · {container.vehicleLicensePlate || 'Chưa gán xe'}</div>
          </button>)}
        </section>
        <section style={{ display: 'grid', gap: 14 }}>
          {selected ? <>
            <article className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>MÃ THIẾT BỊ CONTAINER</div><h2 style={{ margin: '4px 0' }}>{selected.containerCode}</h2></div><span className="badge">{statusLabel[selected.status] || selected.status}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginTop: 16 }}>
                <div><Building2 size={15} /> <b>Công ty phụ trách</b><div>{selected.responsibleCompanyName || selected.responsibleCompanyCode || 'Chưa gán'}</div></div>
                <div><Truck size={15} /> <b>Xe đầu kéo</b><div>{selected.vehicleLicensePlate || 'Chưa gán'} · {selected.vehicleTypeLabel || '—'}</div></div>
                <div><b>Tài xế</b><div>{selected.driverName || 'Chưa gán'}</div><small>{selected.driverPhone || ''}</small></div>
                <div><b>Loại / ISO</b><div>{selected.containerType} · {selected.isoType || '—'}</div></div>
                <div><b>Tải trọng / thể tích</b><div>{selected.maxPayloadTons} t · {selected.cubicCapacityM3} m³</div></div>
                <div><b>Niêm phong</b><div>{selected.eSealNumber || '—'} · {selected.eSealStatus || '—'}</div></div>
                <div><b>Vận đơn</b><div>{selected.assignedShipmentCode || 'Chưa gán'}</div></div>
                <div><b>Hành trình</b><div>{selected.originName || '—'} → {selected.destinationName || '—'}</div></div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, paddingTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>Mã container là định danh thiết bị. Công ty khách hàng/phụ trách được lưu riêng và không thay thế mã ISO.</div>
            </article>
            <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><h3 style={{ margin: 0 }}>Hàng hóa trong container</h3><small style={{ color: 'var(--text-muted)' }}>{items.length} mặt hàng/kiện trong manifest</small></div><button className="btn btn-secondary" type="button" onClick={() => setItemForm({ ...emptyItem })}><Plus size={15} /> Thêm mặt hàng</button></div>
              {items.length === 0 ? <p style={{ padding: '0 16px 16px', color: 'var(--text-muted)' }}>Container này chưa có hàng hóa trong manifest.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}><thead><tr>{['Mã sản phẩm', 'Hàng hóa', 'Vận đơn', 'Kiện / kg', 'Người nhận', 'Cơ sở giao'].map((head) => <th key={head} style={{ padding: 11, borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>{head}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td style={{ padding: 11 }}>{item.itemCode}</td><td style={{ padding: 11 }}>{item.cargoName}<div style={{ color: 'var(--text-muted)' }}>{item.cargoCategory}</div></td><td style={{ padding: 11 }}>{item.shipmentCode}</td><td style={{ padding: 11 }}>{item.parcelCount} / {item.weightKg}</td><td style={{ padding: 11 }}>{item.consigneeName}</td><td style={{ padding: 11 }}>{item.deliveryZoneName}<div style={{ color: 'var(--text-muted)' }}>{item.deliveryAddress}</div></td></tr>)}</tbody></table></div>}
            </article>
          </> : <div className="card" style={{ color: 'var(--text-muted)' }}>Chọn container để xem thông tin thiết bị và manifest.</div>}
        </section>
      </div>

      {containerForm && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={submitContainer} style={{ maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}><h2>Tạo hồ sơ container</h2><p>Mã container nhập theo nhãn định danh trên thiết bị; công ty phụ trách là thông tin vận hành riêng.</p><div className="form-grid">
        <label>Mã container<input required value={containerForm.containerCode} onChange={(e) => setContainerForm({ ...containerForm, containerCode: e.target.value.toUpperCase() })} placeholder="ABCU1234567" /></label>
        <label>Loại container<select value={containerForm.containerType} onChange={(e) => setContainerForm({ ...containerForm, containerType: e.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>ISO type<input value={containerForm.isoType} onChange={(e) => setContainerForm({ ...containerForm, isoType: e.target.value })} /></label>
        <label>Chủ sở hữu thiết bị<input value={containerForm.ownerName} onChange={(e) => setContainerForm({ ...containerForm, ownerName: e.target.value })} /></label>
        <label>Công ty phụ trách<select required value={containerForm.responsibleCompanyId} onChange={(e) => setContainerForm({ ...containerForm, responsibleCompanyId: e.target.value })}><option value="">Chọn công ty</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyCode} · {company.companyName}</option>)}</select></label>
        <label>Tare weight (tấn)<input required type="number" min="0" step="0.01" value={containerForm.tareWeightTons} onChange={(e) => setContainerForm({ ...containerForm, tareWeightTons: e.target.value })} /></label>
        <label>Tải trọng tối đa (tấn)<input required type="number" min="0.01" step="0.01" value={containerForm.maxPayloadTons} onChange={(e) => setContainerForm({ ...containerForm, maxPayloadTons: e.target.value })} /></label>
        <label>Thể tích (m³)<input type="number" min="0" step="0.01" value={containerForm.cubicCapacityM3} onChange={(e) => setContainerForm({ ...containerForm, cubicCapacityM3: e.target.value })} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={containerForm.isReefer} onChange={(e) => setContainerForm({ ...containerForm, isReefer: e.target.checked })} /> Container lạnh</label>
      </div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setContainerForm(null)}>Đóng</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo hồ sơ'}</button></div></form></div>}

      {itemForm && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={submitItem} style={{ maxWidth: 760, maxHeight: '90vh', overflow: 'auto' }}><h2>Thêm hàng hóa vào {selectedCode}</h2><p>Mỗi dòng manifest có mã hàng riêng để truy xuất khi đóng, giao nhận và đối soát.</p><div className="form-grid">
        <label>Mã sản phẩm/kiện<input required value={itemForm.itemCode} onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value.toUpperCase() })} placeholder="SKU-VNM-000123" /></label>
        <label>Mã vận đơn<input required value={itemForm.shipmentCode} onChange={(e) => setItemForm({ ...itemForm, shipmentCode: e.target.value })} /></label>
        <label>Hub nhận<select required value={itemForm.hubCode} onChange={(e) => setItemForm({ ...itemForm, hubCode: e.target.value })}><option value="">Chọn cơ sở nhận</option>{hubs.map((hub) => <option key={hub.id} value={hub.hubCode}>{hub.hubCode} · {hub.hubName}</option>)}</select></label>
        <label>Tên hàng<input required value={itemForm.cargoName} onChange={(e) => setItemForm({ ...itemForm, cargoName: e.target.value })} /></label>
        <label>Nhóm hàng<input required value={itemForm.cargoCategory} onChange={(e) => setItemForm({ ...itemForm, cargoCategory: e.target.value })} /></label>
        <label>Số kiện<input required type="number" min="1" value={itemForm.parcelCount} onChange={(e) => setItemForm({ ...itemForm, parcelCount: e.target.value })} /></label>
        <label>Khối lượng (kg)<input required type="number" min="0.01" step="0.01" value={itemForm.weightKg} onChange={(e) => setItemForm({ ...itemForm, weightKg: e.target.value })} /></label>
        <label>Người nhận<input required value={itemForm.consigneeName} onChange={(e) => setItemForm({ ...itemForm, consigneeName: e.target.value })} /></label>
        <label>Điện thoại người nhận<input required value={itemForm.consigneePhone} onChange={(e) => setItemForm({ ...itemForm, consigneePhone: e.target.value })} /></label>
        <label>Khu vực giao<input required value={itemForm.deliveryZoneName} onChange={(e) => setItemForm({ ...itemForm, deliveryZoneName: e.target.value })} /></label>
        <label>Địa chỉ giao<input required value={itemForm.deliveryAddress} onChange={(e) => setItemForm({ ...itemForm, deliveryAddress: e.target.value })} /></label>
        <label>Vĩ độ<input required type="number" step="any" value={itemForm.deliveryLat} onChange={(e) => setItemForm({ ...itemForm, deliveryLat: e.target.value })} /></label>
        <label>Kinh độ<input required type="number" step="any" value={itemForm.deliveryLng} onChange={(e) => setItemForm({ ...itemForm, deliveryLng: e.target.value })} /></label>
        <label>SLA giao<input required value={itemForm.slaWindow} onChange={(e) => setItemForm({ ...itemForm, slaWindow: e.target.value })} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={itemForm.requiresColdChain} onChange={(e) => setItemForm({ ...itemForm, requiresColdChain: e.target.checked })} /> Yêu cầu chuỗi lạnh</label>
      </div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setItemForm(null)}>Đóng</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm vào manifest'}</button></div></form></div>}
    </div>
  );
}
