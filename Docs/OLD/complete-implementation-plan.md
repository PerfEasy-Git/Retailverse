# Complete Implementation Plan - RetailVerse System

## Executive Summary

This document provides a comprehensive implementation plan to address all missing functionalities identified in the RetailVerse system. The plan focuses on real implementation without placeholders, mockups, or static data.

## Missing Functionalities Analysis

### 1. Database Schema Issues

#### Brand Entity Missing Fields:
- ❌ `brand_name` (currently using `name`)
- ❌ `poc_name` (Point of Contact name)
- ❌ `designation` 
- ❌ `official_email` (currently using `contact_email`)
- ❌ `website_url` (currently using `website`)
- ❌ `contact_number` (currently using `contact_phone`)
- ❌ `sub_category` field in brands table
- ❌ `avg_trade_margin` as FLOAT (currently numeric)
- ❌ `annual_turnover` as FLOAT (currently numeric)

#### Product Entity Missing Fields:
- ❌ `sku_name` VARCHAR(50) (currently using `sku`)
- ❌ `short_description` VARCHAR(200)
- ❌ `specification` VARCHAR(100)
- ❌ `pack_size` as INT (currently VARCHAR)
- ❌ `uom` VARCHAR(30) with CHECK constraint (PCS, GM, ML)
- ❌ `mrp` as INT (currently numeric)
- ❌ `gst` as INT (currently missing)

#### Retailer Entity Missing:
- ❌ `subcategory` field (mentioned in requirements)

## Phase 1: Database Schema Restructuring

### 1.1 Update Brands Table
```sql
-- Add missing fields to brands table
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

-- Add constraints
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
```

### 1.2 Create Brand Categories Table
```sql
-- Create brand_categories table for multi-category support
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
```

### 1.3 Update Products Table
```sql
-- Add missing fields to products table
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

-- Add constraints
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
```

### 1.4 Update Retailers Table
```sql
-- Add subcategory field to retailers
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS avg_trade_margin FLOAT;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS asp_category NUMERIC;
```

## Phase 2: Backend API Implementation

### 2.1 Enhanced Brand Registration
```javascript
// routes/brands.js - Enhanced registration endpoint
router.post('/register', authenticate, requireRole(['brand']), brandRegistrationValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      brand_name, poc_name, designation, official_email, 
      website_url, contact_number
    } = req.body;

    // Check if brand already exists for this user
    const existingBrand = await brandQueries.findByUserId(userId);
    if (existingBrand.length > 0) {
      return res.status(400).json({ error: 'Brand already registered for this user' });
    }

    // Create brand with new fields
    const brandData = {
      user_id: userId,
      brand_name,
      poc_name,
      designation,
      official_email,
      website_url,
      contact_number,
      is_verified: false
    };

    const brand = await brandQueries.create(brandData);
    
    res.status(201).json({ 
      message: 'Brand registered successfully',
      brand: { id: brand.id, brand_name, official_email }
    });
  } catch (error) {
    console.error('Brand registration error:', error);
    res.status(500).json({ error: 'Failed to register brand' });
  }
});
```

### 2.2 Brand Profile Setup with Multi-Category
```javascript
// routes/brands.js - Profile setup endpoint
router.post('/:brandId/profile-setup', authenticate, requireRole(['brand']), brandProfileSetupValidation, async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { categories } = req.body; // Array of category objects

    // Verify brand ownership
    const brand = await brandQueries.getById(brandId);
    if (!brand || brand.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to brand' });
    }

    // Delete existing categories
    await brandQueries.deleteBrandCategories(brandId);

    // Insert new categories
    for (const categoryData of categories) {
      const { category, sub_category, avg_trade_margin, annual_turnover } = categoryData;
      
      await brandQueries.createBrandCategory({
        brand_id: brandId,
        category,
        sub_category,
        avg_trade_margin,
        annual_turnover
      });
    }

    res.json({ message: 'Brand profile updated successfully' });
  } catch (error) {
    console.error('Brand profile setup error:', error);
    res.status(500).json({ error: 'Failed to update brand profile' });
  }
});
```

### 2.3 Enhanced Product Management
```javascript
// routes/products.js - Single product creation
router.post('/', authenticate, requireRole(['brand']), productValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      brand_id, sku_name, category, sub_category, short_description,
      specification, pack_size, uom, mrp, gst, price, description
    } = req.body;

    // Verify brand ownership
    const brand = await brandQueries.getById(brand_id);
    if (!brand || brand.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to brand' });
    }

    const productData = {
      brand_id,
      name: sku_name, // Map to existing name field
      sku_name,
      category,
      subcategory: sub_category, // Map to existing subcategory field
      short_description,
      specification,
      pack_size: parseInt(pack_size),
      uom,
      mrp: parseInt(mrp),
      gst: parseInt(gst),
      price: parseFloat(price),
      description
    };

    const product = await productQueries.create(productData);
    
    res.status(201).json({ 
      message: 'Product created successfully',
      product: { id: product.id, sku_name, category, sub_category }
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});
```

### 2.4 Excel Upload Implementation
```javascript
// routes/products.js - Excel upload endpoint
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/upload-excel', authenticate, requireRole(['brand']), upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { brand_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify brand ownership
    const brand = await brandQueries.getById(brand_id);
    if (!brand || brand.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to brand' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const products = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Map Excel columns to product fields
        const productData = {
          brand_id: parseInt(brand_id),
          sku_name: row['SKU Name'] || row['sku_name'] || row['SKU'],
          category: row['Category'] || row['category'],
          sub_category: row['Sub Category'] || row['sub_category'] || row['Subcategory'],
          short_description: row['Short Description'] || row['short_description'] || row['Description'],
          specification: row['Specification'] || row['specification'],
          pack_size: parseInt(row['Pack Size'] || row['pack_size'] || '1'),
          uom: row['UOM'] || row['uom'] || 'PCS',
          mrp: parseInt(row['MRP'] || row['mrp'] || '0'),
          gst: parseInt(row['GST'] || row['gst'] || '18'),
          price: parseFloat(row['Price'] || row['price'] || '0'),
          description: row['Description'] || row['description'] || ''
        };

        // Validate required fields
        if (!productData.sku_name || !productData.category || !productData.sub_category) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        // Validate UOM
        if (!['PCS', 'GM', 'ML'].includes(productData.uom)) {
          errors.push(`Row ${i + 2}: Invalid UOM - must be PCS, GM, or ML`);
          continue;
        }

        products.push(productData);
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Excel file contains errors',
        errors 
      });
    }

    // Bulk insert products
    const createdProducts = await productQueries.bulkCreate(products);
    
    res.json({ 
      message: `${createdProducts.length} products imported successfully`,
      products: createdProducts.map(p => ({ id: p.id, sku_name: p.sku_name }))
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});
```

## Phase 3: Enhanced Fit Score Algorithm

### 3.1 Database Functions
```sql
-- Enhanced fit score calculation function
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
```

### 3.2 Backend Implementation
```javascript
// routes/fitScores.js - Enhanced fit score calculation
router.post('/calculate', authenticate, requireRole(['brand']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { retailerId } = req.body;

    // Get user's brand
    const brands = await brandQueries.findByUserId(userId);
    if (brands.length === 0) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    const brandId = brands[0].id;

    // Calculate fit score using database function
    const result = await pool.query(
      'SELECT calculate_enhanced_fit_score($1, $2) as fit_score',
      [brandId, retailerId]
    );

    const fitScoreData = result.rows[0].fit_score;
    
    // Get GTM recommendation
    const recommendation = getGTMRecommendation(fitScoreData.score);

    // Save fit score
    const fitScore = await fitScoreQueries.create({
      brand_id: brandId,
      retailer_id: retailerId,
      score: fitScoreData.score,
      factors: fitScoreData.factors,
      calculated_at: new Date()
    });

    res.json({
      fit_score: fitScoreData.score,
      factors: fitScoreData.factors,
      recommendation,
      brand_asp: fitScoreData.brand_asp,
      retailer_asp: fitScoreData.retailer_asp,
      subcategory_gap: fitScoreData.subcategory_gap
    });
  } catch (error) {
    console.error('Fit score calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate fit score' });
  }
});

// GTM recommendation function
const getGTMRecommendation = (score) => {
  if (score >= 80) {
    return {
      priority: 'High',
      action: 'Recommend Launch in All Stores',
      notes: 'Prefer Outright if credit days < 30'
    };
  } else if (score >= 60) {
    return {
      priority: 'Medium',
      action: 'Pilot Launch in Select Stores',
      notes: 'Prefer SOR if competition high'
    };
  } else {
    return {
      priority: 'Low',
      action: 'Delay Entry',
      notes: 'Suggest rework or reprice strategy'
    };
  }
};
```

## Phase 4: Frontend Implementation

### 4.1 Brand Registration Component
```jsx
// components/BrandRegistration.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { brandService } from '../services/brandService';

const BrandRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    brand_name: '',
    poc_name: '',
    designation: '',
    official_email: '',
    website_url: '',
    contact_number: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await brandService.register(formData);
      navigate('/brand/profile-setup');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Brand Registration</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand Name *</label>
          <input
            type="text"
            name="brand_name"
            value={formData.brand_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Point of Contact Name *</label>
          <input
            type="text"
            name="poc_name"
            value={formData.poc_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Designation *</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Official Email ID *</label>
          <input
            type="email"
            name="official_email"
            value={formData.official_email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website URL</label>
          <input
            type="url"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Number</label>
          <input
            type="tel"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register Brand'}
        </button>
      </form>
    </div>
  );
};

export default BrandRegistration;
```

### 4.2 Brand Profile Setup Component
```jsx
// components/BrandProfileSetup.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { brandService } from '../services/brandService';

const BrandProfileSetup = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Reference data from files
  const categorySubcategoryMap = {
    'Makeup': ['Face', 'Eyes', 'Lips', 'Nail'],
    'Skin': ['Moisturizers', 'Cleansers', 'Masks', 'Toners', 'Body Care', 'Eye Care', 'Lip Care', 'Sun Care'],
    'Hair': ['Shampoo', 'Conditioner', 'Hair Oil', 'Hair Mask', 'Hair Styling', 'Hair Color'],
    'Bath & Body': ['Soaps', 'Shower Gels', 'Body Lotions', 'Deodorants', 'Hand Care'],
    'Mom & Baby': ['Baby Care', 'Maternity Care', 'Baby Food', 'Baby Toys'],
    'Health & Wellness': ['Vitamins', 'Supplements', 'Health Drinks', 'Fitness']
  };

  const tradeMarginOptions = ['20-25', '25-30', '30 and above'];
  const annualTurnoverOptions = [
    'equal to less then 1cr',
    '1cr-10cr',
    '10cr-50cr',
    '50Cr-250Cr',
    'more then 250Cr'
  ];

  const handleCategoryChange = (category, checked) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, { category, sub_categories: [] }]);
    } else {
      setSelectedCategories(selectedCategories.filter(cat => cat.category !== category));
    }
  };

  const handleSubcategoryChange = (category, subcategory, checked) => {
    setSelectedCategories(selectedCategories.map(cat => {
      if (cat.category === category) {
        if (checked) {
          return {
            ...cat,
            sub_categories: [...cat.sub_categories, subcategory]
          };
        } else {
          return {
            ...cat,
            sub_categories: cat.sub_categories.filter(sub => sub !== subcategory)
          };
        }
      }
      return cat;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const categoriesData = selectedCategories.map(cat => ({
        category: cat.category,
        sub_category: cat.sub_categories.join(','),
        avg_trade_margin: cat.avg_trade_margin || '25-30',
        annual_turnover: cat.annual_turnover || '1cr-10cr'
      }));

      await brandService.setupProfile(brandId, { categories: categoriesData });
      navigate('/brand/products');
    } catch (error) {
      setError(error.response?.data?.error || 'Profile setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Brand Profile Setup</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Categories & Subcategories</h3>
          
          {Object.entries(categorySubcategoryMap).map(([category, subcategories]) => (
            <div key={category} className="border border-gray-200 rounded-lg p-4 mb-4">
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={selectedCategories.some(cat => cat.category === category)}
                  onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  className="mr-2"
                />
                <span className="font-medium">{category}</span>
              </label>
              
              {selectedCategories.some(cat => cat.category === category) && (
                <div className="ml-6 grid grid-cols-2 gap-2">
                  {subcategories.map(subcategory => (
                    <label key={subcategory} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories
                          .find(cat => cat.category === category)?.sub_categories
                          .includes(subcategory) || false}
                        onChange={(e) => handleSubcategoryChange(category, subcategory, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">{subcategory}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Average Trade Margin</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {tradeMarginOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Annual Turnover</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {annualTurnoverOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || selectedCategories.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Setting up profile...' : 'Complete Profile Setup'}
        </button>
      </form>
    </div>
  );
};

export default BrandProfileSetup;
```

## Phase 5: Database Queries Update

### 5.1 Enhanced Brand Queries
```javascript
// database/queries.js - Updated brand queries
const brandQueries = {
  create: async (brandData) => {
    const query = `
      INSERT INTO brands (
        user_id, brand_name, poc_name, designation, official_email,
        website_url, contact_number, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      brandData.user_id, brandData.brand_name, brandData.poc_name,
      brandData.designation, brandData.official_email, brandData.website_url,
      brandData.contact_number, brandData.is_verified
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  createBrandCategory: async (categoryData) => {
    const query = `
      INSERT INTO brand_categories (
        brand_id, category, sub_category, avg_trade_margin, annual_turnover
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      categoryData.brand_id, categoryData.category, categoryData.sub_category,
      categoryData.avg_trade_margin, categoryData.annual_turnover
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  getBrandCategories: async (brandId) => {
    const query = 'SELECT * FROM brand_categories WHERE brand_id = $1';
    const result = await pool.query(query, [brandId]);
    return result.rows;
  },

  deleteBrandCategories: async (brandId) => {
    const query = 'DELETE FROM brand_categories WHERE brand_id = $1';
    await pool.query(query, [brandId]);
  }
};
```

### 5.2 Enhanced Product Queries
```javascript
// database/queries.js - Updated product queries
const productQueries = {
  create: async (productData) => {
    const query = `
      INSERT INTO products (
        brand_id, name, sku_name, category, subcategory, short_description,
        specification, pack_size, uom, mrp, gst, price, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      productData.brand_id, productData.name, productData.sku_name,
      productData.category, productData.subcategory, productData.short_description,
      productData.specification, productData.pack_size, productData.uom,
      productData.mrp, productData.gst, productData.price, productData.description
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  bulkCreate: async (products) => {
    const query = `
      INSERT INTO products (
        brand_id, name, sku_name, category, subcategory, short_description,
        specification, pack_size, uom, mrp, gst, price, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const createdProducts = [];
    for (const product of products) {
      const values = [
        product.brand_id, product.sku_name, product.sku_name,
        product.category, product.sub_category, product.short_description,
        product.specification, product.pack_size, product.uom,
        product.mrp, product.gst, product.price, product.description
      ];
      const result = await pool.query(query, values);
      createdProducts.push(result.rows[0]);
    }
    return createdProducts;
  }
};
```

## Implementation Timeline

### Week 1: Database & Backend Core
- [ ] Database schema updates
- [ ] Enhanced brand registration API
- [ ] Brand profile setup with multi-category
- [ ] Enhanced product management API
- [ ] Excel upload functionality

### Week 2: Fit Score Algorithm
- [ ] Database functions for fit score calculation
- [ ] Enhanced fit score API
- [ ] GTM recommendation logic
- [ ] Retailer data updates

### Week 3: Frontend Implementation
- [ ] Brand registration component
- [ ] Brand profile setup component
- [ ] Product management component
- [ ] Excel upload component
- [ ] Fit score display component

### Week 4: Testing & Integration
- [ ] End-to-end testing
- [ ] Data validation
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

## Success Criteria

1. **Database**: All required fields added with proper constraints
2. **Brand Registration**: Complete with all required fields and validation
3. **Multi-Category Support**: Brands can have multiple categories with subcategories
4. **Product Management**: All new fields supported with Excel upload
5. **Fit Score Algorithm**: Accurate calculation with proper weightage
6. **GTM Recommendations**: Proper recommendations based on score thresholds
7. **Frontend**: Complete UI for all functionality
8. **Data Integrity**: Proper validation and error handling

This implementation plan provides a complete roadmap for addressing all missing functionalities with real, production-ready code. 