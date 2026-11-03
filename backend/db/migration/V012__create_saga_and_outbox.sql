-- ==============================================================================
-- V012: Create Saga State Log & Transactional Outbox Tables (TASK-17 / UC06)
-- Supports Orchestration Saga for distributed transactions and Outbox for reliable event streaming
-- ==============================================================================

CREATE TABLE IF NOT EXISTS saga_state_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saga_type VARCHAR(50) NOT NULL DEFAULT 'TRIP_DISPATCH_SAGA_UC06',
    shipment_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    current_step VARCHAR(50) NOT NULL,
    saga_status VARCHAR(30) NOT NULL, -- STARTED, SUCCEEDED, COMPENSATING, ROLLED_BACK
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saga_shipment ON saga_state_log(shipment_id);
CREATE INDEX IF NOT EXISTS idx_saga_status ON saga_state_log(saga_status);

CREATE TABLE IF NOT EXISTS outbox_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    kafka_topic VARCHAR(100) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PUBLISHED, FAILED_DLQ
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_event(created_at ASC) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_event(aggregate_type, aggregate_id);

