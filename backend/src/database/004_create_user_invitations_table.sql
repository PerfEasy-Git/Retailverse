-- ========================================
-- USER INVITATIONS TABLE
-- ========================================
-- This table tracks user invitations with tokens and expiration

CREATE TABLE user_invitations (
    id SERIAL PRIMARY KEY,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('brand_admin', 'brand_user', 'retailer_admin', 'retailer_user')),
    company_id INTEGER,
    company_type VARCHAR(20) CHECK (company_type IN ('brand', 'retailer')),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_invitations_updated_at();

-- Add comments
COMMENT ON TABLE user_invitations IS 'Tracks user invitations with tokens and expiration';
COMMENT ON COLUMN user_invitations.invited_by IS 'ID of the user who sent the invitation';
COMMENT ON COLUMN user_invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN user_invitations.role IS 'Role to be assigned to the invited user';
COMMENT ON COLUMN user_invitations.company_id IS 'Company ID if user belongs to a company';
COMMENT ON COLUMN user_invitations.company_type IS 'Type of company (brand or retailer)';
COMMENT ON COLUMN user_invitations.invitation_token IS 'Unique token for invitation acceptance';
COMMENT ON COLUMN user_invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN user_invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted';
