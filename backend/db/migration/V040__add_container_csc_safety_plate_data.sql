ALTER TABLE container
    ADD COLUMN IF NOT EXISTS csc_approval_country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS csc_approval_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS csc_manufacture_date DATE,
    ADD COLUMN IF NOT EXISTS csc_inspection_scheme VARCHAR(30),
    ADD COLUMN IF NOT EXISTS csc_acep_program_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS csc_next_examination_date DATE;
