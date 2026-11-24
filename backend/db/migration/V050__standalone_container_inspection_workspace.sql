-- Inspections belong to the equipment; a dispatch round is optional context.
ALTER TABLE container_safety_inspection ALTER COLUMN control_round_id DROP NOT NULL;
ALTER TABLE container_safety_inspection ALTER COLUMN inspected_at DROP NOT NULL;
ALTER TABLE container_safety_inspection DROP CONSTRAINT container_safety_inspection_round_number_check;
ALTER TABLE container_safety_inspection ALTER COLUMN round_number SET DEFAULT 0;
ALTER TABLE container_safety_inspection ADD CONSTRAINT container_safety_inspection_round_number_check CHECK (round_number >= 0);
ALTER TABLE container_safety_inspection DROP CONSTRAINT container_safety_inspection_status_check;
ALTER TABLE container_safety_inspection ADD CONSTRAINT container_safety_inspection_status_check CHECK (status IN ('DRAFT','PASSED','BLOCKED'));
ALTER TABLE container_safety_inspection ADD COLUMN inspection_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE container_safety_inspection ADD COLUMN checked_items_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE container_safety_inspection ADD COLUMN total_items_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE container_safety_inspection ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE container_safety_inspection ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
WITH numbered AS (
    SELECT id, row_number() OVER (PARTITION BY container_id ORDER BY inspected_at, created_at, id) AS number
    FROM container_safety_inspection
)
UPDATE container_safety_inspection i SET inspection_number=n.number,
    checked_items_count=jsonb_array_length(i.checklist_json), total_items_count=jsonb_array_length(i.checklist_json),
    updated_at=i.created_at FROM numbered n WHERE i.id=n.id;
CREATE UNIQUE INDEX uq_container_inspection_number ON container_safety_inspection(container_id,inspection_number);
ALTER TABLE container_safety_inspection ADD CONSTRAINT container_inspection_counts CHECK
    (checked_items_count >= 0 AND total_items_count > 0 AND checked_items_count <= total_items_count);
