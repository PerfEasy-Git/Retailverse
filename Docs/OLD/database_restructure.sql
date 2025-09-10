-- RetailVerse Database Update Script
-- Based on current database structure and new requirements
-- This script safely updates the existing database with new functionality

-- Start transaction for safe execution
BEGIN;

-- ============================================================================
-- PHASE 1: ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================================

-- 1.1 Add new columns to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS poc_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
ADD COLUMN IF NOT EXISTS official_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

-- 1.2 Add subcategory to retailers table
ALTER TABLE retailers 
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- 1.3 Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS short_description VARCHAR(200),
ADD COLUMN IF NOT EXISTS specification VARCHAR(100),
ADD COLUMN IF NOT EXISTS uom VARCHAR(30),
ADD COLUMN IF NOT EXISTS gst INTEGER;

-- ============================================================================
-- PHASE 2: CREATE NEW TABLES
-- ============================================================================

-- 2.1 Create Brand Categories table for multi-category support
CREATE TABLE IF NOT EXISTS brand_categories (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  avg_trade_margin VARCHAR(20) NOT NULL CHECK (avg_trade_margin IN ('20-25', '25-30', '30 and above')),
  annual_turnover VARCHAR(50) NOT NULL CHECK (annual_turnover IN ('equal to less then 1cr', '1cr-10cr', '10cr-50cr', '50Cr-250Cr', 'more then 250Cr')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, category, sub_category)
);

-- 2.2 Create Categories and Subcategories reference table
CREATE TABLE IF NOT EXISTS category_subcategories (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, sub_category)
);

-- ============================================================================
-- PHASE 3: INSERT REFERENCE DATA
-- ============================================================================

-- 3.1 Insert category-subcategory mappings from category-Subcat.txt
INSERT INTO category_subcategories (category, sub_category) VALUES
-- Makeup
('Makeup', 'Face'),
('Makeup', 'Eyes'),
('Makeup', 'Lips'),
('Makeup', 'Nail'),
-- Skin
('Skin', 'Moisturizers'),
('Skin', 'Cleansers'),
('Skin', 'Masks'),
('Skin', 'Toners'),
('Skin', 'Body Care'),
('Skin', 'Eye Care'),
('Skin', 'Lip Care'),
('Skin', 'Sun Care'),
-- Hair
('Hair', 'Hair Care'),
-- Bath & Body
('Bath & Body', 'Bath & Shower'),
('Bath & Body', 'Body Care'),
('Bath & Body', 'Shaving & Hair Removal'),
('Bath & Body', 'Men''s Grooming'),
('Bath & Body', 'Hands & Feet'),
('Bath & Body', 'Hygiene Essentials'),
('Bath & Body', 'Oral Care'),
-- Mom & Baby
('Mom & Baby', 'Baby Care'),
('Mom & Baby', 'Maternity Care'),
('Mom & Baby', 'Kids Care'),
('Mom & Baby', 'Nursing & Feeding'),
-- Health & Wellness
('Health & Wellness', 'Health Supplements'),
('Health & Wellness', 'Beauty Supplements'),
('Health & Wellness', 'Sports Nutrition'),
('Health & Wellness', 'Weight Management'),
('Health & Wellness', 'Health Foods')
ON CONFLICT (category, sub_category) DO NOTHING;

-- ============================================================================
-- PHASE 4: MIGRATE EXISTING DATA
-- ============================================================================

-- 4.1 Update brands table with new structure
UPDATE brands SET 
  brand_name = COALESCE(name, 'Unknown Brand'),
  poc_name = COALESCE(contact_email, 'Unknown POC'),
  designation = 'Unknown Designation',
  official_email = COALESCE(contact_email, 'unknown@example.com'),
  website_url = website,
  contact_number = contact_phone
WHERE brand_name IS NULL;

-- 4.2 Update products table with new structure
UPDATE products SET 
  sku_name = COALESCE(sku, 'SKU-' || id),
  short_description = COALESCE(description, ''),
  specification = 'Default Specification',
  uom = 'PCS',
  gst = 18
WHERE sku_name IS NULL;

-- ============================================================================
-- PHASE 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- 5.1 Indexes for brand_categories
CREATE INDEX IF NOT EXISTS idx_brand_categories_brand_id ON brand_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_categories_category ON brand_categories(category);
CREATE INDEX IF NOT EXISTS idx_brand_categories_sub_category ON brand_categories(sub_category);

-- 5.2 Indexes for category_subcategories
CREATE INDEX IF NOT EXISTS idx_category_subcategories_category ON category_subcategories(category);
CREATE INDEX IF NOT EXISTS idx_category_subcategories_sub_category ON category_subcategories(sub_category);

-- 5.3 Indexes for updated columns
CREATE INDEX IF NOT EXISTS idx_brands_brand_name ON brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_brands_official_email ON brands(official_email);
CREATE INDEX IF NOT EXISTS idx_products_sku_name ON products(sku_name);
CREATE INDEX IF NOT EXISTS idx_retailers_subcategory ON retailers(subcategory);

-- ============================================================================
-- PHASE 6: CREATE VIEWS FOR EASY DATA ACCESS
-- ============================================================================

-- 6.1 View for brand with categories
CREATE OR REPLACE VIEW brand_with_categories AS
SELECT 
  b.id,
  b.user_id,
  b.brand_name,
  b.poc_name,
  b.designation,
  b.official_email,
  b.website_url,
  b.contact_number,
  b.is_verified,
  b.created_at,
  b.updated_at,
  bc.category,
  bc.sub_category,
  bc.avg_trade_margin,
  bc.annual_turnover
FROM brands b
LEFT JOIN brand_categories bc ON b.id = bc.brand_id;

-- 6.2 View for products with enhanced specs
CREATE OR REPLACE VIEW products_with_specs AS
SELECT 
  p.id,
  p.brand_id,
  p.name,
  p.sku_name,
  p.category,
  p.subcategory as sub_category,
  p.short_description,
  p.specification,
  p.pack_size,
  p.uom,
  p.mrp,
  p.gst,
  p.price,
  p.description,
  p.is_active,
  p.created_at,
  p.updated_at
FROM products p;

-- 6.3 View for retailers with subcategories
CREATE OR REPLACE VIEW retailers_with_subcategories AS
SELECT 
  r.id,
  r.user_id,
  r.name,
  r.category,
  r.subcategory,
  r.region,
  r.format,
  r.description,
  r.website,
  r.logo_url,
  r.contact_email,
  r.contact_phone,
  r.store_count,
  r.annual_revenue,
  r.target_audience,
  r.is_verified,
  r.created_at,
  r.updated_at
FROM retailers r;

-- ============================================================================
-- PHASE 7: CREATE FUNCTIONS FOR ENHANCED FIT SCORE CALCULATION
-- ============================================================================

-- 7.1 Function to calculate subcategory gap
CREATE OR REPLACE FUNCTION calculate_subcategory_gap(
  brand_subcategories TEXT[],
  retailer_subcategories TEXT[]
) RETURNS FLOAT AS $$
DECLARE
  common_count INTEGER;
  gap INTEGER;
BEGIN
  -- Count common subcategories
  SELECT COUNT(*) INTO common_count
  FROM (
    SELECT UNNEST(brand_subcategories) AS sub
    INTERSECT
    SELECT UNNEST(retailer_subcategories) AS sub
  ) AS common;
  
  -- Calculate gap
  gap := array_length(brand_subcategories, 1) - common_count;
  
  -- Return score based on gap
  IF gap <= 2 THEN
    RETURN 1.0;
  ELSE
    RETURN GREATEST(0, 1 - (gap - 2) * 0.2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.2 Function to calculate margin fit
CREATE OR REPLACE FUNCTION calculate_margin_fit(
  brand_margin VARCHAR(20),
  retailer_margin VARCHAR(20)
) RETURNS FLOAT AS $$
DECLARE
  brand_min FLOAT;
  brand_max FLOAT;
  retailer_min FLOAT;
  retailer_max FLOAT;
BEGIN
  -- Parse brand margin range
  CASE brand_margin
    WHEN '20-25' THEN brand_min := 20; brand_max := 25;
    WHEN '25-30' THEN brand_min := 25; brand_max := 30;
    WHEN '30 and above' THEN brand_min := 30; brand_max := 100;
    ELSE brand_min := 0; brand_max := 0;
  END CASE;
  
  -- Parse retailer margin range
  CASE retailer_margin
    WHEN '20-25' THEN retailer_min := 20; retailer_max := 25;
    WHEN '25-30' THEN retailer_min := 25; retailer_max := 30;
    WHEN '30 and above' THEN retailer_min := 30; retailer_max := 100;
    ELSE retailer_min := 0; retailer_max := 0;
  END CASE;
  
  -- Calculate fit
  IF brand_min >= retailer_min THEN
    RETURN 1.0;
  ELSIF brand_max >= retailer_min * 0.8 THEN
    RETURN 0.5;
  ELSE
    RETURN 0.0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.3 Function to calculate ASP match
CREATE OR REPLACE FUNCTION calculate_asp_match(
  brand_asp FLOAT,
  retailer_asp FLOAT
) RETURNS FLOAT AS $$
DECLARE
  difference FLOAT;
BEGIN
  IF retailer_asp = 0 THEN
    RETURN 0.5;
  END IF;
  
  difference := ABS(brand_asp - retailer_asp) / retailer_asp;
  
  IF difference <= 0.15 THEN
    RETURN 1.0; -- Within ±15%
  ELSIF difference <= 0.30 THEN
    RETURN 0.5; -- Within ±30%
  ELSE
    RETURN 0.0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.4 Function to calculate enhanced fit score
CREATE OR REPLACE FUNCTION calculate_enhanced_fit_score(
  p_brand_id INTEGER,
  p_retailer_id INTEGER
) RETURNS TABLE(
  score INTEGER,
  category_match BOOLEAN,
  subcategory_match FLOAT,
  margin_match FLOAT,
  asp_match FLOAT,
  factors JSONB
) AS $$
DECLARE
  brand_record RECORD;
  retailer_record RECORD;
  brand_categories_record RECORD;
  category_match BOOLEAN;
  subcategory_match FLOAT;
  margin_match FLOAT;
  asp_match FLOAT;
  brand_asp FLOAT;
  retailer_asp FLOAT;
  factors JSONB;
  final_score INTEGER;
BEGIN
  -- Get brand and retailer data
  SELECT * INTO brand_record FROM brands WHERE id = p_brand_id;
  SELECT * INTO retailer_record FROM retailers WHERE id = p_retailer_id;
  
  -- Get brand categories
  SELECT * INTO brand_categories_record FROM brand_categories WHERE brand_id = p_brand_id LIMIT 1;
  
  -- If no brand categories found, use default values
  IF brand_categories_record IS NULL THEN
    category_match := false;
    subcategory_match := 0.0;
    margin_match := 0.0;
  ELSE
    -- Calculate category match
    category_match := (brand_categories_record.category = retailer_record.category);
    
    -- Calculate subcategory gap
    SELECT calculate_subcategory_gap(
      ARRAY[brand_categories_record.sub_category],
      ARRAY[retailer_record.subcategory]
    ) INTO subcategory_match;
    
    -- Calculate margin fit
    SELECT calculate_margin_fit(
      brand_categories_record.avg_trade_margin,
      '25-30' -- Default retailer margin, should be updated with actual data
    ) INTO margin_match;
  END IF;
  
  -- Calculate ASP match
  SELECT AVG(mrp) INTO brand_asp FROM products WHERE brand_id = p_brand_id AND is_active = true;
  retailer_asp := COALESCE(retailer_record.asp_category, 100); -- Use actual retailer ASP if available
  
  SELECT calculate_asp_match(brand_asp, retailer_asp) INTO asp_match;
  
  -- Calculate final score
  final_score := ROUND(
    (CASE WHEN category_match THEN 1 ELSE 0 END * 30) +
    (subcategory_match * 30) +
    (margin_match * 10) +
    (asp_match * 30)
  );
  
  -- Build factors JSON
  factors := jsonb_build_object(
    'categoryMatch', category_match,
    'subcategoryMatch', subcategory_match,
    'marginMatch', margin_match,
    'aspMatch', asp_match
  );
  
  RETURN QUERY SELECT
    final_score,
    category_match,
    subcategory_match,
    margin_match,
    asp_match,
    factors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 8: CREATE TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- 8.1 Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to brands table
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 9: CREATE CONSTRAINTS FOR DATA VALIDATION
-- ============================================================================

-- 9.1 Add constraints to brands table (only if they don't exist)
DO $$
BEGIN
  -- Add email validation constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_brands_official_email'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT chk_brands_official_email 
    CHECK (official_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- 9.2 Add constraints to products table (only if they don't exist)
DO $$
BEGIN
  -- Add GST constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_products_gst'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_gst CHECK (gst >= 0 AND gst <= 100);
  END IF;
  
  -- Add UOM constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_products_uom'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_uom CHECK (uom IN ('PCS', 'GM', 'ML'));
  END IF;
END $$;

-- ============================================================================
-- PHASE 10: VERIFICATION QUERIES
-- ============================================================================

-- 10.1 Verify table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('brands', 'brand_categories', 'products', 'retailers', 'category_subcategories')
ORDER BY table_name, ordinal_position;

-- 10.2 Verify data migration
SELECT 'Brands' as table_name, COUNT(*) as count FROM brands
UNION ALL
SELECT 'Brand Categories', COUNT(*) FROM brand_categories
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Retailers', COUNT(*) FROM retailers
UNION ALL
SELECT 'Category Subcategories', COUNT(*) FROM category_subcategories;

-- 10.3 Verify indexes
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('brands', 'brand_categories', 'products', 'retailers', 'category_subcategories')
ORDER BY tablename, indexname;

-- 10.4 Test enhanced fit score calculation
SELECT 
  b.brand_name,
  r.name as retailer_name,
  (calculate_enhanced_fit_score(b.id, r.id)).*
FROM brands b
CROSS JOIN retailers r
LIMIT 5;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Database update completed successfully!';
  RAISE NOTICE 'New columns added to existing tables';
  RAISE NOTICE 'New tables created: brand_categories, category_subcategories';
  RAISE NOTICE 'Indexes and constraints added for performance and data integrity';
  RAISE NOTICE 'Views created for easy data access';
  RAISE NOTICE 'Enhanced fit score functions created';
  RAISE NOTICE 'Triggers added for automatic timestamp updates';
  RAISE NOTICE 'Reference data inserted for categories and subcategories';
END $$; 