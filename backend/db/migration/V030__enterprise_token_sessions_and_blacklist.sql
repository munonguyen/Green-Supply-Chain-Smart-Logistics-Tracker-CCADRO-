-- ==============================================================================
-- Migration: V030__enterprise_token_sessions_and_blacklist.sql
-- Description: Phase 1 & Phase 2 Enterprise Token Architecture
--              1. Mở rộng invalidated_tokens với username & reason phục vụ audit/dọn rác
--              2. Bảng user_sessions quản lý Refresh Token Rotation, Token Family
--                 (Reuse Attack Detection) và đa phiên thiết bị theo từng User
-- ==============================================================================

ALTER TABLE invalidated_tokens
    ADD COLUMN IF NOT EXISTS username VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reason VARCHAR(80);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    family_id UUID NOT NULL,
    refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
    previous_refresh_token_hash VARCHAR(128),
    device_info VARCHAR(255),
    ip_address VARCHAR(64),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_username_revoked
    ON user_sessions(username, revoked);
CREATE INDEX IF NOT EXISTS idx_user_sessions_family
    ON user_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_prev_hash
    ON user_sessions(previous_refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
    ON user_sessions(expires_at);

