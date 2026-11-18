-- ==============================================================================
-- V029: Kafka Outbox + Legal B2B PDF Contract & Receipt Evidence Delivery
-- ==============================================================================

ALTER TABLE payment_evidence
    ADD COLUMN IF NOT EXISTS contract_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS contract_pdf_base64 TEXT,
    ADD COLUMN IF NOT EXISTS contract_pdf_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS receipt_pdf_base64 TEXT,
    ADD COLUMN IF NOT EXISTS receipt_pdf_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS buyer_legal_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS buyer_tax_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS buyer_business_license VARCHAR(64),
    ADD COLUMN IF NOT EXISTS buyer_representative VARCHAR(200),
    ADD COLUMN IF NOT EXISTS buyer_address TEXT,
    ADD COLUMN IF NOT EXISTS kafka_topic VARCHAR(100) NOT NULL DEFAULT 'ccadro.payment.evidence.v1',
    ADD COLUMN IF NOT EXISTS kafka_published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_provider_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS email_provider_message_id TEXT,
    ADD COLUMN IF NOT EXISTS email_delivered_at TIMESTAMPTZ;

ALTER TABLE payment_email_inbox
    ADD COLUMN IF NOT EXISTS contract_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(48),
    ADD COLUMN IF NOT EXISTS contract_pdf_base64 TEXT,
    ADD COLUMN IF NOT EXISTS contract_pdf_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS receipt_pdf_base64 TEXT,
    ADD COLUMN IF NOT EXISTS receipt_pdf_sha256 CHAR(64);

CREATE INDEX IF NOT EXISTS idx_outbox_payment_pending
    ON outbox_event(created_at ASC)
    WHERE aggregate_type = 'PAYMENT_EVIDENCE' AND status = 'PENDING';

