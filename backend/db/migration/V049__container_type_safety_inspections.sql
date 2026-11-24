CREATE TABLE container_safety_inspection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID NOT NULL REFERENCES container(id),
    container_code VARCHAR(50) NOT NULL REFERENCES container(container_code),
    container_type VARCHAR(30) NOT NULL,
    control_round_id UUID NOT NULL REFERENCES container_control_round(id),
    round_number INTEGER NOT NULL CHECK (round_number > 0),
    template_version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASSED', 'BLOCKED')),
    failed_items_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_items_count >= 0),
    inspected_by VARCHAR(120) NOT NULL,
    inspector_role VARCHAR(40) NOT NULL,
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checklist_json JSONB NOT NULL,
    summary_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_container_safety_round_latest
    ON container_safety_inspection(container_id, control_round_id, inspected_at DESC, created_at DESC);
