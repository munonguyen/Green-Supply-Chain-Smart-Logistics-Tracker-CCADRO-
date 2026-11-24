ALTER TABLE reroute_proposal ADD COLUMN IF NOT EXISTS source_candidate_id UUID;
ALTER TABLE reroute_proposal ADD COLUMN IF NOT EXISTS proposed_duration_seconds NUMERIC(12,2);
ALTER TABLE reroute_proposal ADD COLUMN IF NOT EXISTS routing_metadata_json TEXT;
