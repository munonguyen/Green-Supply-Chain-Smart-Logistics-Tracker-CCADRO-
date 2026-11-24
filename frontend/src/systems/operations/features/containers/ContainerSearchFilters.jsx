import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import SearchField from '../../../../shared/components/search/SearchField';
import { CONTAINER_TYPES } from './containerPresentation';
import { CONTAINER_SEARCH_GROUPS } from './containerSearch';

export default function ContainerSearchFilters({ filters, onChange }) {
  const count = Object.values(filters).filter((value) => value !== '').length;
  const set = (name, value) => onChange((current) => ({ ...current, [name]: value }));
  const invalidRange = filters.payloadMin !== '' && filters.payloadMax !== '' &&
    Number(filters.payloadMin) > Number(filters.payloadMax);
  return <details className="container-search-advanced">
    <summary><SlidersHorizontal size={16} aria-hidden="true" /> Tìm kiếm nâng cao
      <span>{count ? count + ' bộ lọc đang áp dụng' : 'Hồ sơ · phân công · hành trình · thiết bị'}</span>
    </summary>
    <div className="container-search-selects">
      <label className="container-field"><span>Loại container</span>
        <select aria-label="Loại container" value={filters.type} onChange={(event) => set('type', event.target.value)}>
          <option value="">Tất cả loại</option>
          {Object.entries(CONTAINER_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="container-field"><span>Tín hiệu GPS</span>
        <select aria-label="Tín hiệu GPS" value={filters.signal} onChange={(event) => set('signal', event.target.value)}>
          <option value="">Tất cả tín hiệu</option>
          <option value="fresh">GPS mới (tối đa 2 phút)</option>
          <option value="delayed">GPS chậm (trên 2–10 phút)</option>
          <option value="missing">Mất cập nhật (trên 10 phút)</option>
          <option value="unknown">Chưa có / chưa xác minh thời điểm GPS</option>
        </select>
      </label>
      <label className="container-field"><span>Liên kết phân công</span>
        <select aria-label="Liên kết phân công" value={filters.assignment} onChange={(event) => set('assignment', event.target.value)}>
          <option value="">Tất cả hồ sơ</option>
          <option value="linked">Đủ ID vận đơn, xe và tài xế</option>
          <option value="missing">Thiếu liên kết phân công</option>
        </select>
      </label>
      {[['payloadMin', 'Tải tối đa từ (tấn)'], ['payloadMax', 'Tải tối đa đến (tấn)']].map(([key, label]) =>
        <label key={key} className="container-field"><span>{label}</span>
          <input type="number" min="0" step="0.1" value={filters[key]}
            aria-invalid={invalidRange || undefined} onChange={(event) => set(key, event.target.value)} />
        </label>)}
    </div>
    {invalidRange && <p role="alert" className="container-field-hint">Mức tải “từ” phải nhỏ hơn hoặc bằng mức tải “đến”.</p>}
    <div className="container-search-groups">
      {CONTAINER_SEARCH_GROUPS.map(({ label, fields }) => <fieldset key={label}>
        <legend>{label}</legend>
        {fields.map(([key, name]) => <SearchField key={key} label={name}
          value={filters[key]} onValueChange={(value) => set(key, value)}
          clearLabel={'Xóa lọc ' + name.toLocaleLowerCase('vi')} placeholder={'Nhập ' + name.toLocaleLowerCase('vi')} />)}
      </fieldset>)}
    </div>
    <p className="container-field-hint">Các điều kiện được kết hợp đồng thời, hỗ trợ nhập tiếng Việt không dấu.
      Tìm trong hồ sơ container đã tải; tra cứu mặt hàng chi tiết trong tab Hàng hóa của từng container.</p>
  </details>;
}
