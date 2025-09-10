-- ========================================
-- RETAILVERSE - COMPLETE DATABASE SCHEMA
-- ========================================
-- This script creates the complete database schema for the new RetailVerse system
-- Run this script to set up the database from scratch

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'brand_admin', 'brand_user', 'retailer_admin', 'retailer_user')),
    company_id INTEGER,
    company_type VARCHAR(20) CHECK (company_type IN ('brand', 'retailer')),
    parent_user_id INTEGER REFERENCES users(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- ========================================
-- 2. BRANDS TABLE
-- ========================================
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    brand_name VARCHAR(255) NOT NULL,
    website_url VARCHAR(255),
    contact_number VARCHAR(20),
    official_email VARCHAR(255),
    designation VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avg_trade_margin VARCHAR(20),
    annual_turnover VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brands Indexes
CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brands_brand_name ON brands(brand_name);
CREATE INDEX idx_brands_official_email ON brands(official_email);

-- ========================================
-- 3. RETAILERS TABLE
-- ========================================
CREATE TABLE retailers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    retailer_name VARCHAR(255) NOT NULL,
    retailer_category VARCHAR(50),
    retailer_format VARCHAR(100),
    retailer_sale_model VARCHAR(20),
    outlet_count INTEGER,
    city_count INTEGER,
    state_count INTEGER,
    purchase_model VARCHAR(20),
    credit_days INTEGER,
    logo_url VARCHAR(500),
    store_images TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Retailers Indexes
CREATE INDEX idx_retailers_user_id ON retailers(user_id);
CREATE INDEX idx_retailers_retailer_name ON retailers(retailer_name);
CREATE INDEX idx_retailers_category ON retailers(retailer_category);
CREATE INDEX idx_retailers_format ON retailers(retailer_format);

-- ========================================
-- 4. BRAND CATEGORIES TABLE
-- ========================================
CREATE TABLE brand_categories (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Brand Categories Indexes
CREATE INDEX idx_brand_categories_brand_id ON brand_categories(brand_id);
CREATE INDEX idx_brand_categories_category ON brand_categories(category);
CREATE INDEX idx_brand_categories_sub_category ON brand_categories(sub_category);

-- ========================================
-- 5. PRODUCTS TABLE
-- ========================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(50) NOT NULL UNIQUE,
    product_description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    mrp DECIMAL(10,2) NOT NULL,
    pack_size VARCHAR(100),
    uom VARCHAR(30),
    value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products Indexes
CREATE INDEX idx_products_brand_name ON products(brand_name);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sub_category ON products(sub_category);

-- ========================================
-- 6. RETAILER LOCATIONS TABLE
-- ========================================
CREATE TABLE retailer_locations (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Retailer Locations Indexes
CREATE INDEX idx_retailer_locations_retailer_id ON retailer_locations(retailer_id);
CREATE INDEX idx_retailer_locations_city ON retailer_locations(city);
CREATE INDEX idx_retailer_locations_state ON retailer_locations(state);

-- ========================================
-- 7. RETAILER PRODUCT MAPPINGS TABLE
-- ========================================
CREATE TABLE retailer_product_mappings (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    avg_selling_price DECIMAL(10,2) NOT NULL,
    annual_sale INTEGER NOT NULL,
    retailer_margin DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(retailer_id, product_id)
);

-- Retailer Product Mappings Indexes
CREATE INDEX idx_retailer_product_mappings_retailer_id ON retailer_product_mappings(retailer_id);
CREATE INDEX idx_retailer_product_mappings_product_id ON retailer_product_mappings(product_id);
CREATE INDEX idx_retailer_product_mappings_avg_selling_price ON retailer_product_mappings(avg_selling_price);

-- ========================================
-- 8. CATEGORIES SUBCATEGORIES TABLE (Master Data)
-- ========================================
CREATE TABLE categories_subcategories (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, sub_category)
);

-- Categories Subcategories Indexes
CREATE INDEX idx_categories_subcategories_category ON categories_subcategories(category);
CREATE INDEX idx_categories_subcategories_sub_category ON categories_subcategories(sub_category);

-- ========================================
-- 9. FILE UPLOADS TABLE
-- ========================================
CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- File Uploads Indexes
CREATE INDEX idx_file_uploads_admin_user_id ON file_uploads(admin_user_id);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);

-- ========================================
-- 10. USER INVITATIONS TABLE
-- ========================================
CREATE TABLE user_invitations (
    id SERIAL PRIMARY KEY,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    company_id INTEGER,
    company_type VARCHAR(20),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Invitations Indexes
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_invitation_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);

-- ========================================
-- 11. AUDIT LOGS TABLE
-- ========================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================================
-- COMMENTS ON TABLES
-- ========================================
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE brands IS 'Brand information and admin users';
COMMENT ON TABLE retailers IS 'Retailer information and admin users';
COMMENT ON TABLE brand_categories IS 'Categories and subcategories selected by brands for FIT score calculation';
COMMENT ON TABLE products IS 'Product information from Excel imports';
COMMENT ON TABLE retailer_locations IS 'Retailer location data (cities and states)';
COMMENT ON TABLE retailer_product_mappings IS 'Mapping between retailers and products with pricing and sales data';
COMMENT ON TABLE categories_subcategories IS 'Master data for categories and subcategories';
COMMENT ON TABLE file_uploads IS 'Track file uploads and processing status';
COMMENT ON TABLE user_invitations IS 'User invitation system for brand and retailer admins';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system activities';

-- ========================================
-- SCHEMA CREATION COMPLETE
-- ========================================
-- Next: Run 002_insert_master_data.sql to populate master data
