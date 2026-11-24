import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import SearchToolbar from '../../../shared/components/search/SearchToolbar';
import { elasticSearchMatch } from '../../../utils/elasticSearch';
import CarbonAuditHub from '../features/carbon/CarbonAuditHub';
import { ArrowRight, CheckCircle, Clock, Radio } from 'lucide-react';

function OperationSelectionContent({ mode }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const trips = mode === 'tracking';
  const meta = {
    dispatch: {
      overline: 'ĐIỀU PHỐI VẬN TẢI & GÁN TÀI XẾ',
      title: 'Chọn Vận Đơn Để Điều Phối & Xuất Bến',
      desc: 'Phân công xe tải, đầu kéo EV và xác thực tài xế trước khi xe lăn bánh.',
      actionLabel: 'Điều Phối Ngay'
    },
    planning: {
      overline: 'TỐI ƯU HÀNH LANG VẬN TẢI XANH',
      title: 'Chọn Vận Đơn Để Lập Tuyến & Tối Ưu Hóa',
      desc: 'Tính toán hành lang xanh đa mục tiêu (Thời gian, Chi phí, Phát thải CO₂e).',
      actionLabel: 'Lập Tuyến 3D'
    },
    tracking: {
      overline: 'GIÁM SÁT HÀNH TRÌNH VỆ TINH & CẢNH BÁO LỆCH TUYẾN',
      title: 'Chọn Chuyến Xe Để Giám Sát GPS Thời Gian Thực',
      desc: 'Theo dõi tọa độ GPS, radar lệch hành lang xanh và cảnh báo tắc nghẽn giao thông.',
      actionLabel: 'Mở Radar 3D'
    }
  }[mode] || {
    overline: 'TRUNG TÂM TÁC NGHIỆP ĐIỀU HÀNH',
    title: 'Danh Sách Nghiệp Vụ Hoạt Động',
    desc: 'Quản lý và xử lý thông tin vận chuyển trong chuỗi cung ứng xanh.',
    actionLabel: 'Mở Chi Tiết'
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    (trips ? api.getTrips() : api.getShipments())
      .then((r) => {
        if (active) setItems((r.result || []).filter((i) => !i.isDeleted));
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trips]);

  const path = (id) => (mode === 'tracking' ? `/trips/${id}` : `/${mode}/${id}`);

  const elasticItems = useMemo(
    () =>
      elasticSearchMatch(items, searchQuery, [
        'tripCode',
        'shipmentCode',
        'id',
        'status',
        'originName',
        'destinationName',
        'customerId'
      ]),
    [items, searchQuery]
  );

  return (
    <div className="page-body">
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: 'var(--accent-green, #10b981)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 4
          }}
        >
          {meta.overline}
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>{meta.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>{meta.desc}</p>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Danh sách {trips ? 'chuyến xe' : 'vận đơn'} ({elasticItems.items.length} / {items.length})
          </div>

          <div style={{ minWidth: 0, flex: '0 1 340px', width: '100%' }}>
            <SearchToolbar
              value={searchQuery}
              onChange={setSearchQuery}
              label="Tìm kiếm"
              loading={loading}
              placeholder="Mã, trạng thái, địa điểm…"
              totalCount={items.length}
              matchedCount={elasticItems.items.length}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              marginBottom: 14,
              fontSize: '0.86rem'
            }}
          >
            Chưa tải được dữ liệu: {error}
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã {trips ? 'Chuyến Xe' : 'Vận Đơn'}</th>
                <th>Trạng Thái Vận Hành</th>
                <th>Thông Tin Chi Tiết</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '28px' }}>
                    Đang tải danh sách {trips ? 'chuyến xe' : 'vận đơn'}…
                  </td>
                </tr>
              ) : elasticItems.items.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                    Chưa có {trips ? 'chuyến' : 'vận đơn'} phù hợp với từ khóa "{searchQuery}".
                  </td>
                </tr>
              ) : (
                elasticItems.items.map((i) => {
                  const code = i.tripCode || i.shipmentCode || i.id;
                  const isLive = i.status === 'EN_ROUTE' || i.status === 'IN_TRANSIT';
                  const isDone = i.status === 'COMPLETED' || i.status === 'DELIVERED';

                  return (
                    <tr key={i.id}>
                      <td>
                        <b style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          {code}
                        </b>
                        {i.customerId && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            Khách hàng: {i.customerId}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isDone ? 'badge-green' : isLive ? 'badge-blue' : 'badge-amber'
                          }`}
                        >
                          {isLive && <Radio size={12} />}
                          {isDone && <CheckCircle size={12} />}
                          {!isLive && !isDone && <Clock size={12} />}
                          {i.status}
                        </span>
                      </td>
                      <td>
                        {i.originName && i.destinationName ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{i.originName}</span>
                            <span style={{ margin: '0 6px', color: 'var(--accent-green)' }}>➔</span>
                            <span style={{ fontWeight: 600 }}>{i.destinationName}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Chuyến xe mã ID: {i.id?.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          className="btn btn-primary"
                          to={path(i.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            fontSize: '0.78rem'
                          }}
                        >
                          {meta.actionLabel}
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OperationSelectionPage({ mode }) {
  if (mode === 'carbon') {
    return <CarbonAuditHub />;
  }
  return <OperationSelectionContent mode={mode} />;
}
