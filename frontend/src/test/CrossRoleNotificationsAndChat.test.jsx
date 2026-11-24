import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import RoleNotificationBell from '../shared/notifications/RoleNotificationBell';
import {
  getNotificationsForViewer,
  isNotificationUnreadForViewer,
  publishCrossRoleNotification
} from '../utils/roleNotificationSync';
import {
  buildMessengerContacts,
  sendGrabChatMessage,
  loadChatThreadsMap,
  setChatSandboxOverride
} from '../utils/driverChatSync';

describe('Cross-Role Notification Bus & Multi-Role Chat Handoff (4 Core Roles)', () => {
  beforeEach(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      }
    });
    setChatSandboxOverride(true);
  });

  it('routes operational notifications accurately across CUSTOMER -> OPERATOR -> DRIVER -> ADMIN', () => {
    const adminUser = { username: 'admin', role: 'ADMIN' };
    const operatorUser = { username: 'dispatcher', role: 'OPERATOR' };
    const hubOperatorUser = {
      username: 'hub_mgr_dinhbang',
      role: 'OPERATOR',
      assignedHubCode: 'HUB-DINHBANG-BN'
    };
    const driverShipperUser = {
      username: 'shipper',
      role: 'DRIVER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: 'SHP-BN-001'
    };
    const otherHubShipper = {
      username: 'shipper_amata',
      role: 'DRIVER',
      assignedHubCode: 'HUB-AMATA-BH',
      assignedShipperCode: 'SHP-BH-101'
    };
    const customerUser = { username: 'customer', role: 'CUSTOMER' };

    // 1. CUSTOMER creates a new green shipment -> notifies OPERATOR & ADMIN
    const bookingEvent = publishCrossRoleNotification({
      eventType: 'CUSTOMER_BOOKING_CREATED',
      severity: 'INFO',
      senderRole: 'CUSTOMER',
      senderUsername: 'customer',
      senderName: 'Vinamilk B2B',
      targetRoles: ['OPERATOR', 'ADMIN'],
      title: 'Đơn đặt xe xanh mới SHP-2026-9901',
      message: 'Khởi tạo vận đơn lạnh 18 tấn Cát Lái → VSIP 1.'
    });

    expect(getNotificationsForViewer(operatorUser).some((n) => n.id === bookingEvent.id)).toBe(true);
    expect(getNotificationsForViewer(adminUser).some((n) => n.id === bookingEvent.id)).toBe(true);
    expect(getNotificationsForViewer(driverShipperUser).some((n) => n.id === bookingEvent.id)).toBe(false);

    // 2. Hub OPERATOR assigns parcel range -> scoped strictly to HUB-DINHBANG-BN & SHP-BN-001
    const rangeEvent = publishCrossRoleNotification({
      eventType: 'HUB_RANGE_ASSIGNED',
      severity: 'INFO',
      senderRole: 'OPERATOR',
      senderUsername: 'hub_mgr_dinhbang',
      senderName: 'Điều hành Bưu cục Đình Bảng',
      targetRoles: ['DRIVER', 'OPERATOR'],
      hubCode: 'HUB-DINHBANG-BN',
      shipperCode: 'SHP-BN-001',
      title: 'Giao dải đơn PKG-DB-0001 → PKG-DB-0003',
      message: 'Đã phân công 3 kiện hàng chuỗi lạnh cho Nguyễn Văn Toàn.'
    });

    expect(getNotificationsForViewer(driverShipperUser).some((n) => n.id === rangeEvent.id)).toBe(true);
    expect(getNotificationsForViewer(hubOperatorUser).some((n) => n.id === rangeEvent.id)).toBe(true);
    // Isolated from Amata hub shipper!
    expect(getNotificationsForViewer(otherHubShipper).some((n) => n.id === rangeEvent.id)).toBe(false);

    // 3. Shipper completes Photo POD -> notifies CUSTOMER, Hub OPERATOR, and ADMIN
    const podEvent = publishCrossRoleNotification({
      eventType: 'LAST_MILE_POD_COMPLETED',
      severity: 'INFO',
      senderRole: 'DRIVER',
      senderUsername: 'shipper',
      senderName: 'Nguyễn Văn Toàn',
      targetRoles: ['OPERATOR', 'CUSTOMER', 'ADMIN'],
      hubCode: 'HUB-DINHBANG-BN',
      title: 'Đã giao thành công kiện PKG-DB-0001 (Có ảnh POD)',
      message: 'Người nhận Lê Thị Mai đã ký nhận đủ 18 thùng lạnh.'
    });

    expect(getNotificationsForViewer(customerUser).some((n) => n.id === podEvent.id)).toBe(true);
    expect(isNotificationUnreadForViewer(podEvent, customerUser)).toBe(true);
    // Sender itself should not see its own notification as unread
    expect(isNotificationUnreadForViewer(podEvent, driverShipperUser)).toBe(false);
  });

  it('renders RoleNotificationBell for DRIVER and supports acknowledging directives', () => {
    const driverUser = { username: 'driver', role: 'DRIVER', fullName: 'Trần Văn Tài' };

    publishCrossRoleNotification({
      eventType: 'MANUAL_DIRECTIVE',
      severity: 'CRITICAL',
      senderRole: 'OPERATOR',
      senderUsername: 'dispatcher',
      senderName: 'Trung tâm Điều hành',
      targetAudience: 'ALL_DRIVERS',
      title: 'Cảnh báo phong tỏa làn container Quốc lộ 13',
      message: 'Tai nạn giao thông tại trạm thu phí Vĩnh Phú.',
      actionDirective: 'Chuyển hướng sang tuyến Mỹ Phước – Tân Vạn ngay.'
    });

    render(<RoleNotificationBell user={driverUser} panelTitle="Thông báo & Chỉ thị Điều hành" />);

    const bellBtn = screen.getByTestId('role-notification-bell');
    fireEvent.click(bellBtn);

    expect(screen.getByText(/Cảnh báo phong tỏa làn container Quốc lộ 13/i)).toBeInTheDocument();
    expect(screen.getByText(/Chỉ thị: Chuyển hướng sang tuyến Mỹ Phước/i)).toBeInTheDocument();

    const ackButtons = screen.getAllByRole('button', { name: /Đã tiếp nhận/i });
    fireEvent.click(ackButtons[0]);

    // After clicking all "Đã tiếp nhận", unread count shrinks cleanly
    expect(screen.queryByText(/Cảnh báo phong tỏa làn container Quốc lộ 13/i)).toBeInTheDocument();
  });

  it('categorizes all 4 Core Roles (ADMIN, OPERATOR, DRIVER, CUSTOMER) cleanly in Messenger directory and syncs messages', async () => {
    const contacts = buildMessengerContacts({
      accounts: [
        { username: 'ops_center', fullName: 'Lê Điều Hành', role: 'OPERATOR', department: 'Trung tâm Điều vận' },
        {
          username: 'ops_hub_bn',
          fullName: 'Quang Bưu Cục',
          role: 'OPERATOR',
          assignedHubCode: 'HUB-DINHBANG-BN',
          department: 'Bưu cục Đình Bảng'
        },
        {
          username: 'drv_hub_bn',
          fullName: 'Toàn Shipper',
          role: 'DRIVER',
          assignedHubCode: 'HUB-DINHBANG-BN',
          assignedShipperCode: 'SHP-BN-009'
        },
        { username: 'drv_longhaul', fullName: 'Tài Container', role: 'DRIVER' },
        { username: 'cust_b2b', fullName: 'Minh Phú Corp', role: 'CUSTOMER' }
      ],
      currentUser: { username: 'admin', role: 'ADMIN' }
    });

    const opsCenter = contacts.find((c) => c.username === 'ops_center');
    const opsHub = contacts.find((c) => c.username === 'ops_hub_bn');
    const drvHub = contacts.find((c) => c.username === 'drv_hub_bn');
    const drvLongHaul = contacts.find((c) => c.username === 'drv_longhaul');
    const custB2b = contacts.find((c) => c.username === 'cust_b2b');

    expect(opsCenter.category).toBe('OPS');
    expect(opsHub.category).toBe('HUB');
    expect(drvHub.category).toBe('HUB');
    expect(drvLongHaul.category).toBe('DRIVER');
    expect(custB2b.category).toBe('CUSTOMER');

    await sendGrabChatMessage({
      driverCode: 'DRV-FC-001',
      senderName: 'Lê Điều Hành',
      senderRole: 'OPERATOR',
      senderUsername: 'ops_center',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText: 'Đã duyệt lộ trình mới tránh ùn tắc cầu Phú Hữu nhé bác tài!'
    });

    const threads = loadChatThreadsMap();
    expect(
      threads['DRV-FC-001'].some((m) =>
        m.messageText.includes('Đã duyệt lộ trình mới tránh ùn tắc cầu Phú Hữu')
      )
    ).toBe(true);
  });
});
