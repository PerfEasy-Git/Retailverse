-- Alter purchase_model column size
-- =================================

-- Increase purchase_model column size from VARCHAR(20) to VARCHAR(100)
ALTER TABLE retailers 
ALTER COLUMN purchase_model TYPE VARCHAR(100);

-- Verify the change
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'retailers' 
AND column_name = 'purchase_model';
