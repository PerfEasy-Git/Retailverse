# Database Schema - Complete Implementation

## 📊 Database Overview

**Database**: PostgreSQL  
**Name**: retailverse  
**Version**: 15.4+  
**Connection**: localhost:5432/retailverse

---

## 🗄️ Complete Table Definitions

### 1. Users Table
```sql
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_parent_user_id ON users(parent_user_id);
```

### 2. Brands Table
```sql
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

-- Indexes
CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brands_brand_name ON brands(brand_name);
CREATE INDEX idx_brands_official_email ON brands(official_email);
```

### 3. Retailers Table
```sql
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

-- Indexes
CREATE INDEX idx_retailers_user_id ON retailers(user_id);
CREATE INDEX idx_retailers_retailer_name ON retailers(retailer_name);
CREATE INDEX idx_retailers_category ON retailers(retailer_category);
CREATE INDEX idx_retailers_format ON retailers(retailer_format);
```

### 4. Brand Categories Table
```sql
CREATE TABLE brand_categories (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_categories_brand_id ON brand_categories(brand_id);
CREATE INDEX idx_brand_categories_category ON brand_categories(category);
CREATE INDEX idx_brand_categories_sub_category ON brand_categories(sub_category);
```

### 5. Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    mrp DECIMAL(10,2) NOT NULL,
    pack_size VARCHAR(100),
    uom VARCHAR(30),
    value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_brand_name ON products(brand_name);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sub_category ON products(sub_category);
```

### 6. Retailer Locations Table
```sql
CREATE TABLE retailer_locations (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_retailer_locations_retailer_id ON retailer_locations(retailer_id);
CREATE INDEX idx_retailer_locations_city ON retailer_locations(city);
CREATE INDEX idx_retailer_locations_state ON retailer_locations(state);
```

### 7. Retailer Product Mappings Table
```sql
CREATE TABLE retailer_product_mappings (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    avg_selling_price DECIMAL(10,2) NOT NULL,
    annual_sale INTEGER NOT NULL,
    retailer_margin DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_retailer_product_mappings_retailer_id ON retailer_product_mappings(retailer_id);
CREATE INDEX idx_retailer_product_mappings_product_id ON retailer_product_mappings(product_id);
```

### 8. Categories Subcategories Table
```sql
CREATE TABLE categories_subcategories (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_subcategories_category ON categories_subcategories(category);
CREATE INDEX idx_categories_subcategories_sub_category ON categories_subcategories(sub_category);
```

### 9. File Uploads Table
```sql
CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_file_uploads_admin_user_id ON file_uploads(admin_user_id);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
```

---

## 📋 Master Data Insertion

### Categories and Subcategories
```sql
INSERT INTO categories_subcategories (category, sub_category) VALUES
('Makeup', 'Face'),
('Makeup', 'Eyes'),
('Makeup', 'Lips'),
('Makeup', 'Nail'),
('Skin', 'Moisturizers'),
('Skin', 'Cleansers'),
('Skin', 'Masks'),
('Skin', 'Toners'),
('Skin', 'Body Care'),
('Skin', 'Eye Care'),
('Skin', 'Lip Care'),
('Skin', 'Sun Care'),
('Hair', 'Hair Care'),
('Bath & Body', 'Bath & Shower'),
('Bath & Body', 'Body Care'),
('Bath & Body', 'Shaving & Hair Removal'),
('Bath & Body', 'Men''s Grooming'),
('Bath & Body', 'Hands & Feet'),
('Bath & Body', 'Hygiene Essentials'),
('Bath & Body', 'Oral Care'),
('Mom & Baby', 'Baby Care'),
('Mom & Baby', 'Maternity Care'),
('Mom & Baby', 'Kids Care'),
('Mom & Baby', 'Nursing & Feeding'),
('Health & Wellness', 'Health Supplements'),
('Health & Wellness', 'Beauty Supplements'),
('Health & Wellness', 'Sports Nutrition'),
('Health & Wellness', 'Weight Management'),
('Health & Wellness', 'Health Foods');
```

---

## 🔗 Database Relationships

### Foreign Key Relationships
1. `brands.user_id` → `users.id`
2. `retailers.user_id` → `users.id`
3. `brand_categories.brand_id` → `brands.id`
4. `retailer_locations.retailer_id` → `retailers.id`
5. `retailer_product_mappings.retailer_id` → `retailers.id`
6. `retailer_product_mappings.product_id` → `products.id`
7. `file_uploads.admin_user_id` → `users.id`
8. `users.parent_user_id` → `users.id`

### Check Constraints
- `users.role` - Must be one of: admin, brand_admin, brand_user, retailer_admin, retailer_user
- `users.company_type` - Must be one of: brand, retailer
- `file_uploads.status` - Must be one of: pending, processing, completed, failed

---

## 🚀 Database Setup Script


### Complete Setup Script
```sql
-- Create database
CREATE DATABASE retailverse;

-- Connect to database
\c retailverse;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables (run the CREATE TABLE statements above)

-- Create all indexes (run the CREATE INDEX statements above)

-- Insert master data (run the INSERT statements above)

-- Create default admin user
INSERT INTO users (email, password, role, first_name, last_name, is_active, email_verified) 
VALUES ('admin@retailverse.com', '$2b$10$encrypted_password', 'admin', 'System', 'Admin', true, true);
```

---

## 📊 Data Validation Rules

### Excel File Validation
1. **RETAILER_INFO Sheet**: Must have 15 columns with exact names
2. **RETAILER_PRODUCT_MAPPING Sheet**: Must have 5 columns with exact names
3. **RETAILER_LOCATION Sheet**: Must have 3 columns with exact names
4. **PRODUCT_INFO Sheet**: Must have 9 columns with exact names

### Data Type Validation
- **RETAILER_ID**: Must match pattern RT_XXXX
- **PRODUCT_ID**: Must match pattern RV_PI_XXXXX
- **MRP**: Must be positive decimal
- **ASP**: Must be positive decimal
- **MARGIN**: Must be between 0-100

### Business Logic Validation
- **Retailer Category**: Must be NMT or RMT
- **Retailer Format**: Must be Pharmacy, Grocery, or Beauty
- **Sale Model**: Must be B2C or B2B
- **Purchase Model**: Must be Outright
- **Credit Days**: Must be positive integer

---

## 🔧 Database Maintenance

### Backup Strategy
```bash
# Daily backup
pg_dump -h localhost -U postgres -d retailverse > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres -d retailverse < backup_20241201.sql
```

### Performance Monitoring
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

---

**Next**: Review API_SPECIFICATION.md for backend implementation details.
