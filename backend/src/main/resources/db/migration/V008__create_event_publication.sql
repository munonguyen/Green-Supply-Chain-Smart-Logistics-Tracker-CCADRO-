-- V008__create_event_publication.sql
-- Spring Modulith Event Publication Outbox Table for PostgreSQL

CREATE TABLE IF NOT EXISTS event_publication (
    id UUID PRIMARY KEY,
    listener_id VARCHAR(512) NOT NULL,
    event_type VARCHAR(512) NOT NULL,
    serialized_event TEXT NOT NULL,
    publication_date TIMESTAMPTZ NOT NULL,
    completion_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_pub_completion ON event_publication(completion_date);
