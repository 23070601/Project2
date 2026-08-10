-- Database Migration Script: Add 'Inactive' to Assets status constraint
ALTER TABLE Assets DROP CHECK chk_assets_status;
ALTER TABLE Assets ADD CONSTRAINT chk_assets_status CHECK (
    status IN ('Operational', 'Under Repair', 'Recommended for Replacement', 'Retired', 'Inactive')
);
