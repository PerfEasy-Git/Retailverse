-- Complete Database Implementation Script for RetailVerse System
-- This script implements all missing functionalities from the plan

-- Phase 1: Update Brands Table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS poc_name VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS official_email VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS avg_trade_margin VARCHAR(20);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS annual_turnover VARCHAR(50);

-- Update existing data
UPDATE brands SET 
  brand_name = name,
  official_email = contact_email,
  website_url = website,
  contact_number = contact_phone
WHERE brand_name IS NULL;

-- Add constraints for brands table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_brands_official_email') THEN
    ALTER TABLE brands ADD CONSTRAINT chk_brands_official_email 
      CHECK (official_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_brands_avg_trade_margin') THEN
    ALTER TABLE brands ADD CONSTRAINT chk_brands_avg_trade_margin 
      CHECK (avg_trade_margin IN ('20-25', '25-30', '30 and above'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_brands_annual_turnover') THEN
    ALTER TABLE brands ADD CONSTRAINT chk_brands_annual_turnover 
      CHECK (annual_turnover IN ('equal to less then 1cr', '1cr-10cr', '10cr-50cr', '50Cr-250Cr', 'more then 250Cr'));
  END IF;
END $$;

-- Phase 2: Create Brand Categories Table
CREATE TABLE IF NOT EXISTS brand_categories (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  avg_trade_margin VARCHAR(20) NOT NULL,
  annual_turnover VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, category, sub_category)
);

-- Insert reference data from category-Subcat.txt
INSERT INTO brand_categories (brand_id, category, sub_category, avg_trade_margin, annual_turnover) VALUES
(1, 'Makeup', 'Face', '25-30', '1cr-10cr'),
(1, 'Skin', 'Moisturizers', '25-30', '1cr-10cr'),
(1, 'Hair', 'Shampoo', '20-25', '1cr-10cr');

-- Phase 3: Update Products Table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku_name VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS specification VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_size INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst INTEGER;

-- Update existing data
UPDATE products SET 
  sku_name = sku,
  pack_size = CAST(pack_size AS INTEGER) WHERE pack_size ~ '^[0-9]+$';

-- Add constraints for products table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_uom') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_uom 
      CHECK (uom IN ('PCS', 'GM', 'ML'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_pack_size') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_pack_size 
      CHECK (pack_size > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_mrp') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_mrp 
      CHECK (mrp > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_gst') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_gst 
      CHECK (gst >= 0 AND gst <= 28);
  END IF;
END $$;

-- Phase 4: Update Retailers Table
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS avg_trade_margin FLOAT;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS asp_category NUMERIC;

-- Phase 5: Create Enhanced Fit Score Function
CREATE OR REPLACE FUNCTION calculate_enhanced_fit_score(
  p_brand_id INTEGER,
  p_retailer_id INTEGER
) RETURNS JSON AS $$
DECLARE
  brand_record RECORD;
  retailer_record RECORD;
  brand_categories RECORD[];
  brand_products RECORD[];
  category_match_score FLOAT := 0;
  subcategory_match_score FLOAT := 0;
  margin_match_score FLOAT := 0;
  asp_match_score FLOAT := 0;
  total_score INTEGER := 0;
  brand_asp NUMERIC := 0;
  retailer_asp NUMERIC := 0;
  common_subcategories INTEGER := 0;
  subcategory_gap INTEGER := 0;
BEGIN
  -- Get brand data
  SELECT * INTO brand_record FROM brands WHERE id = p_brand_id;
  
  -- Get retailer data
  SELECT * INTO retailer_record FROM retailers WHERE id = p_retailer_id;
  
  -- Get brand categories
  SELECT ARRAY_AGG(ROW(bc.*)) INTO brand_categories 
  FROM brand_categories bc WHERE bc.brand_id = p_brand_id;
  
  -- Get brand products
  SELECT ARRAY_AGG(ROW(p.*)) INTO brand_products 
  FROM products p WHERE p.brand_id = p_brand_id;
  
  -- Calculate category match (30%)
  IF brand_categories IS NOT NULL THEN
    FOR i IN 1..array_length(brand_categories, 1) LOOP
      IF brand_categories[i].category = retailer_record.category THEN
        category_match_score := 1;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Calculate subcategory gap match (30%)
  IF brand_categories IS NOT NULL AND retailer_record.subcategory IS NOT NULL THEN
    FOR i IN 1..array_length(brand_categories, 1) LOOP
      IF brand_categories[i].sub_category = retailer_record.subcategory THEN
        common_subcategories := common_subcategories + 1;
      END IF;
    END LOOP;
    
    subcategory_gap := array_length(brand_categories, 1) - common_subcategories;
    IF subcategory_gap <= 2 THEN
      subcategory_match_score := 1;
    ELSE
      subcategory_match_score := GREATEST(0, 1 - (subcategory_gap - 2) * 0.2);
    END IF;
  END IF;
  
  -- Calculate margin match (10%)
  IF brand_categories IS NOT NULL AND retailer_record.avg_trade_margin IS NOT NULL THEN
    FOR i IN 1..array_length(brand_categories, 1) LOOP
      DECLARE
        brand_margin NUMERIC;
      BEGIN
        brand_margin := CASE 
          WHEN brand_categories[i].avg_trade_margin = '20-25' THEN 22.5
          WHEN brand_categories[i].avg_trade_margin = '25-30' THEN 27.5
          WHEN brand_categories[i].avg_trade_margin = '30 and above' THEN 35
          ELSE 0
        END;
        
        IF brand_margin >= retailer_record.avg_trade_margin THEN
          margin_match_score := 1;
          EXIT;
        ELSIF brand_margin >= retailer_record.avg_trade_margin * 0.8 THEN
          margin_match_score := 0.5;
        END IF;
      END;
    END LOOP;
  END IF;
  
  -- Calculate ASP match (30%)
  IF brand_products IS NOT NULL AND retailer_record.asp_category IS NOT NULL THEN
    -- Calculate brand ASP
    SELECT AVG(mrp) INTO brand_asp FROM products WHERE brand_id = p_brand_id;
    
    IF brand_asp > 0 AND retailer_record.asp_category > 0 THEN
      DECLARE
        asp_difference NUMERIC;
      BEGIN
        asp_difference := ABS(brand_asp - retailer_record.asp_category) / retailer_record.asp_category;
        
        IF asp_difference <= 0.15 THEN
          asp_match_score := 1; -- Within ±15%
        ELSIF asp_difference <= 0.30 THEN
          asp_match_score := 0.5; -- Within ±30%
        ELSE
          asp_match_score := 0;
        END IF;
      END;
    END IF;
  END IF;
  
  -- Calculate total score
  total_score := ROUND(
    (category_match_score * 30) +
    (subcategory_match_score * 30) +
    (margin_match_score * 10) +
    (asp_match_score * 30)
  );
  
  RETURN json_build_object(
    'score', total_score,
    'factors', json_build_object(
      'category_match', category_match_score,
      'subcategory_match', subcategory_match_score,
      'margin_match', margin_match_score,
      'asp_match', asp_match_score
    ),
    'brand_asp', brand_asp,
    'retailer_asp', retailer_record.asp_category,
    'subcategory_gap', subcategory_gap
  );
END;
$$ LANGUAGE plpgsql;

-- Phase 6: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_brands_brand_name ON brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_brands_official_email ON brands(official_email);
CREATE INDEX IF NOT EXISTS idx_brand_categories_brand_id ON brand_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku_name ON products(sku_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_retailers_subcategory ON retailers(subcategory);

-- Phase 7: Create Views for Easy Data Access
CREATE OR REPLACE VIEW brand_with_categories AS
SELECT 
  b.*,
  json_agg(
    json_build_object(
      'category', bc.category,
      'sub_category', bc.sub_category,
      'avg_trade_margin', bc.avg_trade_margin,
      'annual_turnover', bc.annual_turnover
    )
  ) as categories
FROM brands b
LEFT JOIN brand_categories bc ON b.id = bc.brand_id
GROUP BY b.id;

CREATE OR REPLACE VIEW products_with_specs AS
SELECT 
  p.*,
  b.brand_name,
  b.official_email
FROM products p
JOIN brands b ON p.brand_id = b.id;

-- Phase 8: Create Triggers for Automatic Timestamp Updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brands_updated_at') THEN
    CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brand_categories_updated_at') THEN
    CREATE TRIGGER update_brand_categories_updated_at BEFORE UPDATE ON brand_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Phase 9: Verification Queries
SELECT 'Database implementation completed successfully!' as status;

-- Verify new columns exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND column_name IN ('brand_name', 'poc_name', 'designation', 'official_email', 'website_url', 'contact_number', 'avg_trade_margin', 'annual_turnover');

-- Verify brand_categories table
SELECT COUNT(*) as brand_categories_count FROM brand_categories;

-- Verify products new columns
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('sku_name', 'short_description', 'specification', 'pack_size', 'uom', 'mrp', 'gst');

-- Verify function exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'calculate_enhanced_fit_score'; 