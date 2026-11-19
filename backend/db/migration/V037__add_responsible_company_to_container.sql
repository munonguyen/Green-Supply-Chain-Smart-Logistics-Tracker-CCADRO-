ALTER TABLE container
    ADD COLUMN IF NOT EXISTS responsible_company_id UUID,
    ADD COLUMN IF NOT EXISTS responsible_company_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS responsible_company_name VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_container_responsible_company
    ON container (responsible_company_id)
    WHERE responsible_company_id IS NOT NULL;
