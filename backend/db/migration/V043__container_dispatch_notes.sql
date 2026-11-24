-- Human operational notes are separate from device telemetry and trip state.
CREATE TABLE container_dispatch_note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_code VARCHAR(50) NOT NULL REFERENCES container(container_code),
    category VARCHAR(30) NOT NULL CHECK (category IN ('OPERATIONS', 'DELAY', 'DEVICE', 'CARGO', 'HANDOVER')),
    content VARCHAR(2000) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_container_dispatch_note_recent ON container_dispatch_note(container_code, created_at DESC);
