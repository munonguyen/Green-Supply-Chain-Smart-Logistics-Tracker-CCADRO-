-- =============================================================================
-- Migration V059: Đồng bộ 4 Vai trò Cốt lõi (ADMIN, OPERATOR, DRIVER, CUSTOMER)
-- - Khởi tạo vai trò OPERATOR chuẩn hóa toàn bộ nghiệp vụ Điều hành & Bưu cục
-- - Bổ sung quyền giao nhận chặng cuối cho vai trò DRIVER
-- - Bổ sung OPERATOR và DRIVER vào danh mục hub_iam.hub_functional_roles
-- =============================================================================

INSERT INTO roles (name, description, is_system_role)
VALUES (
    'OPERATOR',
    'Điều hành Vận tải, An toàn Đội xe, Kiểm toán Phát thải & Quản lý Bưu cục khu vực',
    TRUE
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system_role = TRUE;

-- Kế thừa đầy đủ quyền nghiệp vụ điều hành nội bộ và điều phối bưu cục cho OPERATOR
INSERT INTO role_permissions (role_name, permission_name)
SELECT DISTINCT 'OPERATOR', rp.permission_name
FROM role_permissions rp
WHERE rp.role_name IN ('DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR', 'HUB_MANAGER')
ON CONFLICT DO NOTHING;

-- Bổ sung quyền giao hàng bưu cục chặng cuối cho DRIVER (hợp nhất Tài xế đường dài & Shipper)
INSERT INTO role_permissions (role_name, permission_name)
SELECT DISTINCT 'DRIVER', rp.permission_name
FROM role_permissions rp
WHERE rp.role_name IN ('HUB_SHIPPER')
ON CONFLICT DO NOTHING;

-- Bổ sung OPERATOR và DRIVER vào bảng tham chiếu khóa ngoại của hệ thống tài khoản Bưu cục
INSERT INTO hub_iam.hub_functional_roles (
    role_code, role_title, portal_path,
    can_manage_hub_dispatch, can_assign_code_range, can_submit_photo_pod,
    can_provision_hub_accounts, is_read_only_audit, hub_isolation_level, description
) VALUES
(
    'OPERATOR',
    'Nhân viên Điều hành & Trưởng Bưu cục',
    '/shipper',
    TRUE, TRUE, TRUE, TRUE, FALSE, 'STRICT_SINGLE_HUB',
    'Điều hành bưu cục được phân công: tiếp nhận Manifest Container, điều phối tự động, giao dải đơn và quản lý đội ngũ tài xế giao hàng nội khu.'
),
(
    'DRIVER',
    'Tài xế & Nhân viên Giao nhận Bưu cục',
    '/shipper',
    FALSE, FALSE, TRUE, FALSE, FALSE, 'STRICT_HUB_AND_SHIPPER',
    'Thực hiện nhận kiện xuất trạm, định vị GPS điểm giao, liên hệ người nhận theo quy chuẩn 3 cuộc gọi, chụp ảnh chứng từ POD và đối soát COD cuối ca.'
)
ON CONFLICT (role_code) DO UPDATE SET
    role_title = EXCLUDED.role_title,
    can_manage_hub_dispatch = EXCLUDED.can_manage_hub_dispatch,
    can_assign_code_range = EXCLUDED.can_assign_code_range,
    can_submit_photo_pod = EXCLUDED.can_submit_photo_pod,
    can_provision_hub_accounts = EXCLUDED.can_provision_hub_accounts,
    is_read_only_audit = EXCLUDED.is_read_only_audit,
    hub_isolation_level = EXCLUDED.hub_isolation_level,
    description = EXCLUDED.description;

