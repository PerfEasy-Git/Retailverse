-- ========================================
-- FILE UPLOADS TABLE
-- ========================================
-- This table tracks all file uploads with status and processing information

CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_type VARCHAR(50) NOT NULL DEFAULT 'retailer_data',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_file_uploads_admin_user_id ON file_uploads(admin_user_id);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_file_uploads_upload_type ON file_uploads(upload_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_file_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_file_uploads_updated_at();

-- Add comments
COMMENT ON TABLE file_uploads IS 'Tracks file uploads with processing status and results';
COMMENT ON COLUMN file_uploads.admin_user_id IS 'ID of the admin user who uploaded the file';
COMMENT ON COLUMN file_uploads.filename IS 'Original filename of the uploaded file';
COMMENT ON COLUMN file_uploads.file_path IS 'Path to the uploaded file on the server';
COMMENT ON COLUMN file_uploads.upload_type IS 'Type of upload (retailer_data, product_data, etc.)';
COMMENT ON COLUMN file_uploads.status IS 'Current processing status of the upload';
COMMENT ON COLUMN file_uploads.records_processed IS 'Number of records successfully processed';
COMMENT ON COLUMN file_uploads.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN file_uploads.processing_started_at IS 'When processing started';
COMMENT ON COLUMN file_uploads.processing_completed_at IS 'When processing completed';
