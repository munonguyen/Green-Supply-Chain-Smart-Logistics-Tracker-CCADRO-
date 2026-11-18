-- Additive migration: do not rewrite V001..V026 or repair checksums automatically.
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS receipt_email VARCHAR(254);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmation_source VARCHAR(32);
CREATE TABLE payment_evidence (
 id UUID PRIMARY KEY, transaction_code VARCHAR(48) NOT NULL UNIQUE REFERENCES payment_transactions(transaction_code),
 owner_username VARCHAR(100), recipient_email VARCHAR(254), snapshot_json TEXT NOT NULL,
 snapshot_sha256 CHAR(64) NOT NULL, html_content TEXT NOT NULL, html_sha256 CHAR(64) NOT NULL,
 delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', attempts INT NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payment_evidence_pending ON payment_evidence(next_attempt_at) WHERE delivery_status = 'PENDING';
CREATE TABLE payment_email_inbox (
 event_id UUID PRIMARY KEY, recipient_email VARCHAR(254) NOT NULL, subject TEXT NOT NULL,
 snapshot_json TEXT NOT NULL, snapshot_sha256 CHAR(64) NOT NULL,
 html_content TEXT NOT NULL, html_sha256 CHAR(64) NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'PENDING', attempts INT NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), provider_message_id TEXT, last_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ
);
CREATE INDEX payment_email_pending ON payment_email_inbox(next_attempt_at) WHERE status = 'PENDING';
CREATE TABLE payment_email_attempt (
 id UUID PRIMARY KEY, event_id UUID NOT NULL REFERENCES payment_email_inbox(event_id),
 outcome VARCHAR(32) NOT NULL, provider_message_id TEXT, attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Keep the original evidence bytes even after contract amendments, refunds or soft delete.
CREATE FUNCTION protect_payment_evidence() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Payment evidence cannot be deleted'; END IF;
 IF ROW(NEW.id,NEW.transaction_code,NEW.owner_username,NEW.recipient_email,NEW.snapshot_json,NEW.snapshot_sha256,NEW.html_content,NEW.html_sha256,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.transaction_code,OLD.owner_username,OLD.recipient_email,OLD.snapshot_json,OLD.snapshot_sha256,OLD.html_content,OLD.html_sha256,OLD.created_at)
 THEN RAISE EXCEPTION 'Payment evidence content is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_evidence_immutable BEFORE UPDATE OR DELETE ON payment_evidence
 FOR EACH ROW EXECUTE FUNCTION protect_payment_evidence();

CREATE FUNCTION protect_payment_email_inbox() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Payment email evidence cannot be deleted'; END IF;
 IF ROW(NEW.event_id,NEW.recipient_email,NEW.subject,NEW.snapshot_json,NEW.snapshot_sha256,NEW.html_content,NEW.html_sha256,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.event_id,OLD.recipient_email,OLD.subject,OLD.snapshot_json,OLD.snapshot_sha256,OLD.html_content,OLD.html_sha256,OLD.created_at)
 THEN RAISE EXCEPTION 'Payment email content is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_email_immutable BEFORE UPDATE OR DELETE ON payment_email_inbox
 FOR EACH ROW EXECUTE FUNCTION protect_payment_email_inbox();
CREATE FUNCTION protect_payment_email_attempt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Payment email attempts are append-only'; END $$;
CREATE TRIGGER payment_email_attempt_append_only BEFORE UPDATE OR DELETE ON payment_email_attempt
 FOR EACH ROW EXECUTE FUNCTION protect_payment_email_attempt();
