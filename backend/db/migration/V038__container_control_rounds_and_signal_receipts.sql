-- Old readings deliberately stay NULL: a historic record cannot prove current connectivity.
ALTER TABLE container
    ADD COLUMN IF NOT EXISTS last_telemetry_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_position_received_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS container_control_round (
    id UUID PRIMARY KEY,
    container_code VARCHAR(50) NOT NULL REFERENCES container(container_code),
    round_number INTEGER NOT NULL CHECK (round_number > 0),
    started_at TIMESTAMPTZ NOT NULL,
    started_by VARCHAR(100) NOT NULL,
    started_role VARCHAR(40) NOT NULL,
    initial_status VARCHAR(30) NOT NULL,
    completed_at TIMESTAMPTZ,
    shipment_code VARCHAR(50),
    epod_recipient TEXT,
    epod_signature TEXT,
    epod_at TIMESTAMPTZ,
    epod_notes TEXT,
    UNIQUE (container_code, round_number)
);
CREATE TABLE IF NOT EXISTS container_control_stage (
    id UUID PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES container_control_round(id),
    stage VARCHAR(30) NOT NULL CHECK (stage IN ('PREPARATION', 'DEPARTURE', 'IN_TRANSIT', 'HANDOVER')),
    checked_keys VARCHAR(500) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    completed_by VARCHAR(100) NOT NULL,
    completed_role VARCHAR(40) NOT NULL,
    notes TEXT,
    UNIQUE (round_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_container_control_stage_round ON container_control_stage(round_id);
