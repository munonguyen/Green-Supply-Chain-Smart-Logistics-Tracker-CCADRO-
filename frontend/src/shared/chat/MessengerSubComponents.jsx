import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  Building2,
  Check,
  CheckCircle2,
  MapPin,
  Pin,
  PinOff,
  Search,
  Truck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { elasticSearchMatch } from '../../utils/elasticSearch';

function getInitials(name = 'U') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return (parts[0] || 'U').slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function MessengerAvatar({
  title = 'User',
  type = 'DM',
  color = '#0084ff',
  online = true,
  size = 42,
  isDark = false
}) {
  const ringBorder = isDark ? '#0b1120' : '#ffffff';

  if (type === 'GROUP') {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width: Math.round(size * 0.68),
            height: Math.round(size * 0.68),
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0084ff 0%, #0284c7 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontSize: Math.max(10, Math.round(size * 0.28)),
            fontWeight: 800,
            position: 'absolute',
            top: 0,
            right: 0,
            border: `2px solid ${ringBorder}`
          }}
        >
          <Users size={Math.max(11, Math.round(size * 0.3))} />
        </div>
        <div
          style={{
            width: Math.round(size * 0.68),
            height: Math.round(size * 0.68),
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontSize: Math.max(9, Math.round(size * 0.25)),
            fontWeight: 800,
            position: 'absolute',
            bottom: 0,
            left: 0,
            border: `2px solid ${ringBorder}`
          }}
        >
          {getInitials(title)}
        </div>
        {online && (
          <span
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: Math.max(9, Math.round(size * 0.24)),
              height: Math.max(9, Math.round(size * 0.24)),
              borderRadius: '50%',
              background: '#31a24c',
              border: `2px solid ${ringBorder}`
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color} 0%, #0f172a 170%)`,
          color: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          fontSize: Math.max(11, Math.round(size * 0.34)),
          fontWeight: 800,
          letterSpacing: '0.02em',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.16)'
        }}
      >
        {getInitials(title)}
      </div>
      {online && (
        <span
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: Math.max(10, Math.round(size * 0.26)),
            height: Math.max(10, Math.round(size * 0.26)),
            borderRadius: '50%',
            background: '#31a24c',
            border: `2px solid ${ringBorder}`
          }}
        />
      )}
    </div>
  );
}

export function MessengerComposePanel({
  contacts = [],
  shipments = [],
  isDark = false,
  onCancel,
  onCreate
}) {
  const [mode, setMode] = useState('GROUP'); // 'DM' | 'GROUP'
  const [groupTitle, setGroupTitle] = useState('');
  const [containerCode, setContainerCode] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const border = isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? 'rgba(15, 23, 42, 0.7)' : '#f1f5f9';

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    return elasticSearchMatch(contacts, contactSearch, [
      'fullName',
      'roleLabel',
      'companyName',
      'username',
      'assignedContainerCode'
    ]).items;
  }, [contacts, contactSearch]);

  const toggleContact = (contact) => {
    if (mode === 'DM') {
      onCreate({ type: 'DM', contacts: [contact] });
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(contact.id) ? prev.filter((id) => id !== contact.id) : [...prev, contact.id]
    );
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const chosen = contacts.filter((c) => selectedIds.includes(c.id));
    if (chosen.length === 0) return;
    onCreate({
      type: chosen.length === 1 && !groupTitle.trim() ? 'DM' : 'GROUP',
      title: groupTitle.trim(),
      containerCode: containerCode || null,
      contacts: chosen
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        padding: 12,
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.86rem', color: textMain }}>Tin nhắn / Tạo nhóm mới</strong>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng tạo cuộc trò chuyện mới"
          style={{
            background: 'transparent',
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: textMuted,
            padding: 4,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { id: 'DM', label: 'Nhắn 1-1' },
          { id: 'GROUP', label: 'Tạo nhóm chat' }
        ].map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setSelectedIds([]);
              }}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: `1px solid ${active ? '#0084ff' : border}`,
                background: active ? 'rgba(0, 132, 255, 0.14)' : 'transparent',
                color: active ? '#0084ff' : textMuted,
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {mode === 'GROUP' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Tên nhóm (VD: Điều phối Cont lạnh Q9)..."
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 9,
              border: `1px solid ${border}`,
              background: inputBg,
              color: textMain,
              fontSize: '0.76rem',
              outline: 'none'
            }}
          />
          <select
            value={containerCode}
            onChange={(e) => setContainerCode(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 9,
              border: `1px solid ${border}`,
              background: inputBg,
              color: textMain,
              fontSize: '0.74rem',
              outline: 'none'
            }}
          >
            <option value="">-- Gắn mã Container / Chuyến (tùy chọn) --</option>
            {shipments.slice(0, 8).map((s) => (
              <option key={s.containerCode || s.shipmentCode} value={s.containerCode || s.shipmentCode}>
                {s.containerCode} ({s.originName} ➔ {s.destinationName})
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <Search
          size={13}
          color={textMuted}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          placeholder="Tìm người dùng, tài xế, hub, công ty..."
          style={{
            width: '100%',
            padding: '7px 10px 7px 29px',
            borderRadius: 999,
            border: `1px solid ${border}`,
            background: inputBg,
            color: textMain,
            fontSize: '0.75rem',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 4, alignContent: 'start' }}>
        {filteredContacts.map((c) => {
          const picked = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleContact(c)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 8px',
                borderRadius: 10,
                border: `1px solid ${picked ? '#0084ff' : 'transparent'}`,
                background: picked ? 'rgba(0, 132, 255, 0.12)' : 'transparent',
                color: textMain,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 9
              }}
            >
              <MessengerAvatar
                title={c.fullName}
                color={c.avatarColor}
                online={c.online}
                size={34}
                isDark={isDark}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.77rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {c.fullName}
                </div>
                <div
                  style={{
                    fontSize: '0.67rem',
                    color: textMuted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {c.roleLabel} • {c.companyName}
                </div>
              </div>
              {mode === 'GROUP' && (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `1.5px solid ${picked ? '#0084ff' : border}`,
                    background: picked ? '#0084ff' : 'transparent',
                    color: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0
                  }}
                >
                  {picked && <Check size={11} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === 'GROUP' && (
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={handleCreateGroup}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: selectedIds.length > 0 ? '#0084ff' : inputBg,
            color: selectedIds.length > 0 ? '#ffffff' : textMuted,
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          Tạo nhóm chat ({selectedIds.length} người)
        </button>
      )}
    </div>
  );
}

export function MessengerInfoSidebar({
  thread,
  contacts = [],
  activeShipment = null,
  inThreadSearch = '',
  onChangeInThreadSearch,
  onTogglePin,
  onToggleMute,
  onInviteMembers,
  onCloseInfo,
  isDark = false
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSelected, setInviteSelected] = useState([]);

  if (!thread) return null;

  const border = isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const subtleBg = isDark ? 'rgba(15, 23, 42, 0.58)' : '#f8fafc';

  const memberIds = Array.isArray(thread.memberIds) ? thread.memberIds : [thread.id];
  const invitableContacts = contacts.filter((c) => !memberIds.includes(c.id));

  const submitInvite = () => {
    const chosen = contacts.filter((c) => inviteSelected.includes(c.id));
    if (chosen.length === 0) return;
    onInviteMembers(chosen);
    setInviteSelected([]);
    setInviteOpen(false);
  };

  return (
    <aside
      style={{
        width: 268,
        flexShrink: 0,
        borderLeft: `1px solid ${border}`,
        background: isDark ? 'rgba(9, 14, 28, 0.94)' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflowY: 'auto',
        padding: 14,
        gap: 14
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: textMuted }}>CHI TIẾT HỘI THOẠI</span>
        {onCloseInfo && (
          <button
            type="button"
            onClick={onCloseInfo}
            aria-label="Ẩn thông tin đoạn chat"
            style={{
              border: 'none',
              background: 'transparent',
              color: textMuted,
              cursor: 'pointer',
              padding: 3
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Identity Block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
        <MessengerAvatar
          title={thread.title || thread.fullName}
          type={thread.type}
          color={thread.avatarColor}
          online={thread.online}
          size={62}
          isDark={isDark}
        />
        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: textMain }}>
          {thread.title || thread.fullName}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#31a24c', fontWeight: 700 }}>
          {thread.online ? '● Đang hoạt động trực tuyến' : 'Ngoại tuyến'}
        </div>
        <div style={{ fontSize: '0.72rem', color: textMuted }}>
          {thread.roleLabel || thread.subtitle}
        </div>
        {thread.companyName && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 999,
              background: subtleBg,
              border: `1px solid ${border}`,
              fontSize: '0.69rem',
              color: textMain
            }}
          >
            <Building2 size={12} color="#0084ff" />
            <span>{thread.companyName}</span>
          </div>
        )}
      </div>

      {/* Quick Messenger Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
        <button
          type="button"
          onClick={onTogglePin}
          style={{
            background: 'transparent',
            border: 'none',
            color: textMain,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.68rem',
            fontWeight: 600
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: thread.isPinned ? 'rgba(0, 132, 255, 0.16)' : subtleBg,
              border: `1px solid ${thread.isPinned ? '#0084ff' : border}`,
              display: 'grid',
              placeItems: 'center',
              color: thread.isPinned ? '#0084ff' : textMain
            }}
          >
            {thread.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </span>
          <span>{thread.isPinned ? 'Bỏ ghim' : 'Ghim chat'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          style={{
            background: 'transparent',
            border: 'none',
            color: textMain,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.68rem',
            fontWeight: 600
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: thread.isMuted ? 'rgba(245, 158, 11, 0.16)' : subtleBg,
              border: `1px solid ${thread.isMuted ? '#f59e0b' : border}`,
              display: 'grid',
              placeItems: 'center',
              color: thread.isMuted ? '#f59e0b' : textMain
            }}
          >
            {thread.isMuted ? <BellOff size={15} /> : <Bell size={15} />}
          </span>
          <span>{thread.isMuted ? 'Bật tiếng' : 'Tắt thông báo'}</span>
        </button>
      </div>

      {/* Search within conversation */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.69rem',
            fontWeight: 700,
            color: textMuted,
            marginBottom: 5
          }}
        >
          Tìm trong cuộc trò chuyện
        </label>
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            color={textMuted}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={inThreadSearch}
            onChange={(e) => onChangeInThreadSearch(e.target.value)}
            placeholder="Lọc nội dung tin nhắn..."
            style={{
              width: '100%',
              padding: '7px 10px 7px 29px',
              borderRadius: 999,
              border: `1px solid ${border}`,
              background: subtleBg,
              color: textMain,
              fontSize: '0.74rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Shipment / Container Context Card */}
      {(activeShipment || thread.assignedContainerCode || thread.containerCode) && (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: subtleBg,
            border: `1px solid ${border}`,
            fontSize: '0.73rem',
            display: 'grid',
            gap: 4
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#10b981' }}>
            <Truck size={13} />
            <span>
              Cont {activeShipment?.containerCode || thread.assignedContainerCode || thread.containerCode}
            </span>
          </div>
          {activeShipment && (
            <>
              <div style={{ color: textMain, fontWeight: 600 }}>
                {activeShipment.originName} ➔ {activeShipment.destinationName}
              </div>
              <div style={{ color: textMuted, display: 'flex', gap: 8 }}>
                <span>Nhiệt độ: {activeShipment.supplyAirTempC ?? -18.4}°C</span>
                <span>• ETA: {activeShipment.etaMinutes ?? 25}p</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Members & Add People to Conversation */}
      <div style={{ display: 'grid', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: textMuted }}>
            THÀNH VIÊN ({Array.isArray(thread.memberNames) ? thread.memberNames.length : 2})
          </span>
          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: 'rgba(0, 132, 255, 0.1)',
              color: '#0084ff',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <UserPlus size={12} /> Thêm người
          </button>
        </div>

        {Array.isArray(thread.memberNames) && thread.memberNames.length > 0 ? (
          <div style={{ display: 'grid', gap: 5 }}>
            {thread.memberNames.map((name) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.74rem',
                  color: textMain
                }}
              >
                <CheckCircle2 size={12} color="#31a24c" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.73rem', color: textMain }}>
            • Bạn &amp; {thread.fullName}
          </div>
        )}

        {inviteOpen && (
          <div
            style={{
              padding: 9,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: subtleBg,
              display: 'grid',
              gap: 6
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: textMuted }}>
              Mời thêm người vào đoạn chat này:
            </div>
            <div style={{ maxHeight: 130, overflowY: 'auto', display: 'grid', gap: 4 }}>
              {invitableContacts.map((c) => {
                const checked = inviteSelected.includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.72rem',
                      color: textMain,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setInviteSelected((prev) =>
                          checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                    />
                    <span>{c.fullName}</span>
                  </label>
                );
              })}
              {invitableContacts.length === 0 && (
                <div style={{ fontSize: '0.7rem', color: textMuted }}>Đã mời tất cả liên hệ.</div>
              )}
            </div>
            <button
              type="button"
              disabled={inviteSelected.length === 0}
              onClick={submitInvite}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                background: inviteSelected.length > 0 ? '#0084ff' : border,
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: inviteSelected.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              Xác nhận mời ({inviteSelected.length})
            </button>
          </div>
        )}
      </div>

      {/* Compliance note */}
      <div
        style={{
          marginTop: 'auto',
          padding: 9,
          borderRadius: 10,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.68rem',
          color: textMuted,
          lineHeight: 1.45,
          display: 'flex',
          gap: 6
        }}
      >
        <MapPin size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Hội thoại được đồng bộ đa tab &amp; lưu vết phục vụ đối soát SLA / ePOD.</span>
      </div>
    </aside>
  );
}

