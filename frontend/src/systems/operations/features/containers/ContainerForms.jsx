import React, { useEffect, useRef } from 'react';
import { Box, PackagePlus, X } from 'lucide-react';
import { CONTAINER_TYPES } from './containerPresentation';

function FormCard({
  title,
  description,
  icon: Icon,
  onClose,
  onSubmit,
  saving,
  error,
  children,
  submitLabel,
  modal = false
}) {
  const heading = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const element = dialog.current;
    if (modal) {
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
      document.body.classList.add('container-create-open');
    }
    heading.current?.focus({ preventScroll: true });
    if (!modal) heading.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    return () => {
      if (!modal) return;
      if (element.open && typeof element.close === 'function') element.close();
      document.body.classList.remove('container-create-open');
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [modal]);
  const Surface = modal ? 'dialog' : 'section';
  return (
    <Surface ref={dialog} className={'card container-form-card' + (modal ? ' container-create-dialog' : '')}
      aria-label={title} aria-modal={modal || undefined}
      onCancel={modal ? (event) => { event.preventDefault(); if (!saving) onClose(); } : undefined}>
      <header className="container-card-heading">
        <div className="container-heading-icon">
          <Icon size={21} aria-hidden="true" />
        </div>
        <div className="container-heading-copy">
          <h2 tabIndex={-1} ref={heading}>
            {title}
          </h2>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="container-icon-button"
          aria-label={'Đóng ' + title.toLowerCase()}
          onClick={onClose}
          disabled={saving}
        >
          <X size={20} />
        </button>
      </header>
      <form onSubmit={onSubmit}>
        {error && (
          <p className="container-notice container-notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="container-form-content">{children}</div>
        <footer className="container-form-footer">
          <span>Trường có dấu * là bắt buộc.</span>
          <div>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : submitLabel}
            </button>
          </div>
        </footer>
      </form>
    </Surface>
  );
}

function Field({ label, name, form, setForm, required = false, children, ...props }) {
  const control = {
    value: form[name],
    required,
    onChange: (event) => setForm((current) => ({ ...current, [name]: event.target.value })),
    ...props
  };
  return (
    <label className="container-field">
      <span>
        {label}
        {required && ' *'}
      </span>
      {children ? <select {...control}>{children}</select> : <input {...control} />}
    </label>
  );
}

export function ContainerCreateCard({
  form,
  setForm,
  companies,
  onClose,
  onSubmit,
  saving,
  error
}) {
  const changeType = (event) => {
    const type = event.target.value;
    const reefer = type.startsWith('REEFER');
    setForm((current) => ({
      ...current,
      containerType: type,
      isReefer: reefer,
      isoType: type.includes('20FT')
        ? reefer
          ? '22R1'
          : '22G1'
        : type.includes('40FT')
          ? reefer
            ? '45R1'
            : '45G1'
          : ''
    }));
  };
  return (
    <FormCard
      modal
      title="Tạo hồ sơ container"
      description="Đăng ký thiết bị và đơn vị phụ trách. Hồ sơ mới có trạng thái Sẵn sàng."
      icon={Box}
      {...{ onClose, onSubmit, saving, error }}
      submitLabel="Tạo hồ sơ"
    >
      <fieldset>
        <legend>01 · Định danh & đơn vị</legend>
        <div className="container-form-grid">
          <Field
            label="Mã container"
            name="containerCode"
            {...{ form, setForm }}
            required
            maxLength={50}
            placeholder="Ví dụ: MSKU1234567"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                containerCode: event.target.value.toUpperCase().replace(/\s/g, '')
              }))
            }
          />
          <Field
            label="Loại container"
            name="containerType"
            {...{ form, setForm }}
            onChange={changeType}
          >
            {Object.entries(CONTAINER_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Field>
          <Field
            label="Mã kích thước / loại ISO"
            name="isoType"
            {...{ form, setForm }}
            maxLength={10}
            placeholder="45G1"
          />
          <Field
            label="Chủ sở hữu thiết bị"
            name="ownerName"
            {...{ form, setForm }}
            maxLength={100}
            placeholder="Tên đơn vị sở hữu container"
          />
          <Field
            label="Công ty phụ trách"
            name="responsibleCompanyId"
            {...{ form, setForm }}
            required
          >
            <option value="">Chọn công ty</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyCode} · {company.companyName}
              </option>
            ))}
          </Field>
        </div>
        <p className="container-field-hint">
          Mã trên vỏ container là định danh thiết bị; công ty phụ trách được quản lý riêng.
        </p>
      </fieldset>
      <fieldset>
        <legend>02 · Thông số tải trọng</legend>
        <div className="container-form-grid">
          <Field
            label="Trọng lượng vỏ (tấn)"
            name="tareWeightTons"
            {...{ form, setForm }}
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="3,8"
          />
          <Field
            label="Tải trọng hàng tối đa (tấn)"
            name="maxPayloadTons"
            {...{ form, setForm }}
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="26,5"
          />
          <Field
            label="Thể tích (m³)"
            name="cubicCapacityM3"
            {...{ form, setForm }}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="67,9"
          />
        </div>
        <label className="container-checkbox">
          <input
            type="checkbox"
            checked={form.isReefer}
            onChange={(event) =>
              setForm((current) => ({ ...current, isReefer: event.target.checked }))
            }
          />{' '}
          Có thiết bị làm lạnh
        </label>
      </fieldset>
      <fieldset>
        <legend>03 · Niêm phong & giám sát</legend>
        <div className="container-form-grid">
          <Field
            label="Số niêm phong điện tử"
            name="eSealNumber"
            {...{ form, setForm }}
            maxLength={50}
            placeholder="Ví dụ: SEAL-000123"
          />
          <Field
            label="Thiết bị giám sát"
            name="telematicsModel"
            {...{ form, setForm }}
            maxLength={100}
            placeholder="Model thiết bị IoT / GPS"
          />
        </div>
        <p className="container-field-hint">
          Xe, tài xế và vận đơn được phân công ở bước điều phối sau khi tạo hồ sơ.
        </p>
      </fieldset>
      <fieldset>
        <legend>04 · Biển an toàn CSC</legend>
        <div className="container-form-grid">
          <Field
            label="Quốc gia / cơ quan phê duyệt"
            name="cscApprovalCountry"
            {...{ form, setForm }}
            maxLength={100}
            placeholder="Theo biển CSC"
          />
          <Field
            label="Mã tham chiếu phê duyệt CSC"
            name="cscApprovalReference"
            {...{ form, setForm }}
            maxLength={100}
            placeholder="Chép nguyên văn trên biển"
          />
          <Field
            label="Tháng / ngày sản xuất"
            name="cscManufactureDate"
            {...{ form, setForm }}
            type="date"
          />
          <Field
            label="Chương trình kiểm tra"
            name="cscInspectionScheme"
            {...{ form, setForm }}
          >
            <option value="">Chưa khai báo</option>
            <option value="PERIODIC">Kiểm tra định kỳ (PES)</option>
            <option value="ACEP">Chương trình ACEP</option>
          </Field>
          {form.cscInspectionScheme === 'PERIODIC' && (
            <Field
              label="Ngày kiểm tra kế tiếp"
              name="cscNextExaminationDate"
              {...{ form, setForm }}
              type="date"
            />
          )}
          {form.cscInspectionScheme === 'ACEP' && (
            <Field
              label="Mã chương trình ACEP"
              name="cscAcepProgramNumber"
              {...{ form, setForm }}
              maxLength={100}
              placeholder="Theo nhãn / hồ sơ chủ sở hữu"
            />
          )}
        </div>
        <p className="container-field-hint">
          Chép thông tin từ biển CSC và hồ sơ chủ sở hữu. Chỉ nhập ngày kế tiếp cho PES hoặc mã cho ACEP; dữ liệu này giúp theo dõi hồ sơ, không tự thay thế kiểm định.
        </p>
      </fieldset>
    </FormCard>
  );
}

export function ManifestCreateCard({
  containerCode,
  form,
  setForm,
  hubs,
  onClose,
  onSubmit,
  saving,
  error
}) {
  return (
    <FormCard
      title={'Thêm hàng hóa · ' + containerCode}
      description="Mỗi dòng có mã hàng riêng để truy xuất, giao nhận và đối soát."
      icon={PackagePlus}
      {...{ onClose, onSubmit, saving, error }}
      submitLabel="Thêm vào manifest"
    >
      <fieldset>
        <legend>01 · Hàng hóa & vận đơn</legend>
        <div className="container-form-grid">
          <Field
            label="Mã sản phẩm / kiện"
            name="itemCode"
            {...{ form, setForm }}
            required
            maxLength={50}
            placeholder="SKU-VNM-000123"
          />
          <Field
            label="Mã vận đơn"
            name="shipmentCode"
            {...{ form, setForm }}
            required
            maxLength={50}
          />
          <Field
            label="Tên hàng"
            name="cargoName"
            {...{ form, setForm }}
            required
            maxLength={220}
          />
          <Field
            label="Nhóm hàng"
            name="cargoCategory"
            {...{ form, setForm }}
            required
            maxLength={60}
          />
          <Field
            label="Số kiện"
            name="parcelCount"
            {...{ form, setForm }}
            required
            type="number"
            min="1"
            step="1"
          />
          <Field
            label="Khối lượng hàng (kg)"
            name="weightKg"
            {...{ form, setForm }}
            required
            type="number"
            min="0.01"
            step="0.01"
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>02 · Cơ sở giao & người nhận</legend>
        <div className="container-form-grid">
          <Field label="Cơ sở tiếp nhận" name="hubCode" {...{ form, setForm }} required>
            <option value="">Chọn cơ sở nhận</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.hubCode}>
                {hub.hubCode} · {hub.hubName}
              </option>
            ))}
          </Field>
          <Field
            label="Khu vực giao"
            name="deliveryZoneName"
            {...{ form, setForm }}
            required
            maxLength={160}
          />
          <Field
            label="Địa chỉ giao"
            name="deliveryAddress"
            {...{ form, setForm }}
            required
            maxLength={255}
          />
          <Field
            label="Người nhận"
            name="consigneeName"
            {...{ form, setForm }}
            required
            maxLength={180}
          />
          <Field
            label="Điện thoại người nhận"
            name="consigneePhone"
            {...{ form, setForm }}
            required
            type="tel"
            maxLength={40}
          />
          <Field
            label="Cam kết thời gian giao (SLA)"
            name="slaWindow"
            {...{ form, setForm }}
            required
            maxLength={80}
          />
          <Field
            label="Vĩ độ điểm giao"
            name="deliveryLat"
            {...{ form, setForm }}
            required
            type="number"
            min="-90"
            max="90"
            step="any"
          />
          <Field
            label="Kinh độ điểm giao"
            name="deliveryLng"
            {...{ form, setForm }}
            required
            type="number"
            min="-180"
            max="180"
            step="any"
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>03 · Điều kiện bảo quản</legend>
        <label className="container-checkbox">
          <input
            type="checkbox"
            checked={form.requiresColdChain}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                requiresColdChain: event.target.checked,
                requiredTempC: event.target.checked ? current.requiredTempC : ''
              }))
            }
          />{' '}
          Hàng yêu cầu chuỗi lạnh
        </label>
        {form.requiresColdChain && (
          <div className="container-form-grid">
            <Field
              label="Nhiệt độ yêu cầu (°C)"
              name="requiredTempC"
              {...{ form, setForm }}
              required
              type="number"
              min="-80"
              max="40"
              step="0.1"
            />
          </div>
        )}
      </fieldset>
    </FormCard>
  );
}
