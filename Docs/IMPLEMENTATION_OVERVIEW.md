# RetailVerse Platform - Complete Implementation Guide

## 📋 Project Overview

**Objective**: Rebuild the complete RetailVerse platform with new data structure while preserving existing UI components.

**Key Requirements**:
- Three user types: Admin, Brand Admin/Users, Retailer Admin/Users
- Excel file upload system for data population
- Real-time FIT score calculation
- Category/subcategory selection for brands
- Production-ready implementation without over-engineering

---

## 🏗️ System Architecture

### User Hierarchy
```
Super Admin (System Admin)
├── Brand Admin (Creates brand, manages brand users)
│   └── Brand Users (Child users under brand admin)
└── Retailer Admin (Creates retailer, manages retailer users)
    └── Retailer Users (Child users under retailer admin)
```

### Data Flow
```
Admin Uploads Excel → System Validates & Imports → Brand Users Select Categories → Real-time FIT Score Calculation → Display Results
```

---

## 📊 Database Schema

### Core Tables

#### 1. Users Table
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
```

#### 2. Brands Table
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
```

#### 3. Retailers Table
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
```

#### 4. Brand Categories Table
```sql
CREATE TABLE brand_categories (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Products Table
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
```

#### 6. Retailer Locations Table
```sql
CREATE TABLE retailer_locations (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. Retailer Product Mappings Table
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
```

#### 8. Categories Subcategories Table
```sql
CREATE TABLE categories_subcategories (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 9. File Uploads Table
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
```

---

## 🔧 FIT Score Calculation Logic

### Algorithm Implementation
```javascript
function calculateFitScore(brandData, retailerData, selectedCategories) {
    let categoryScore = 0;
    let subcategoryScore = 0;
    let marginScore = 0;
    let aspScore = 0;

    // 1. Category Match (30% weight)
    if (selectedCategories.includes(retailerData.category)) {
        categoryScore = 100;
    }

    // 2. Subcategory Match (30% weight)
    const subcategoryGap = calculateSubcategoryGap(brandData.subcategories, retailerData.subcategories);
    if (subcategoryGap > 2) {
        subcategoryScore = 100;
    } else {
        subcategoryScore = (subcategoryGap / 2) * 100;
    }

    // 3. Trade Margin Match (10% weight)
    if (brandData.avgTradeMargin >= retailerData.avgMargin) {
        marginScore = 100;
    } else {
        marginScore = (brandData.avgTradeMargin / retailerData.avgMargin) * 100;
    }

    // 4. ASP Match (30% weight)
    const aspDifference = Math.abs(brandData.ASP - retailerData.ASP);
    const aspThreshold = retailerData.ASP * 0.15;
    if (aspDifference <= aspThreshold) {
        aspScore = 100;
    } else {
        aspScore = Math.max(0, 100 - (aspDifference / retailerData.ASP) * 100);
    }

    // Overall Score
    const overallScore = (categoryScore * 0.3) + (subcategoryScore * 0.3) + 
                        (marginScore * 0.1) + (aspScore * 0.3);

    return {
        overallScore: Math.round(overallScore),
        categoryScore,
        subcategoryScore,
        marginScore,
        aspScore,
        recommendation: getRecommendation(overallScore)
    };
}

function getRecommendation(score) {
    if (score >= 80) return { priority: 'High', action: 'Launch in All Stores' };
    if (score >= 60) return { priority: 'Medium', action: 'Pilot Launch in Select Stores' };
    return { priority: 'Low', action: 'Delay Entry' };
}
```

---

## 🚀 Implementation Phases

### Phase 1: Database Setup
1. Create new database schema
2. Insert master category-subcategory data
3. Set up database connections and migrations

### Phase 2: Backend API Development
1. Authentication system with role-based access
2. User management APIs
3. File upload and validation system
4. FIT score calculation API
5. Data management APIs

### Phase 3: Frontend Development
1. Adapt existing UI components
2. Create new interfaces for file upload
3. Implement category selection
4. Build FIT score display
5. User management interfaces

### Phase 4: Testing & Deployment
1. Unit testing
2. Integration testing
3. User acceptance testing
4. Production deployment

---

## 📁 File Structure

```
retailverse/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── database/
│   │   │   ├── connection.js
│   │   │   └── migrations/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validation.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── brands.js
│   │   │   ├── retailers.js
│   │   │   ├── products.js
│   │   │   ├── fitScores.js
│   │   │   └── uploads.js
│   │   ├── services/
│   │   │   ├── fitScoreService.js
│   │   │   ├── uploadService.js
│   │   │   └── userService.js
│   │   └── utils/
│   │       ├── jwt.js
│   │       └── validation.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── contexts/
│   └── package.json
└── Docs/
    ├── IMPLEMENTATION_OVERVIEW.md
    ├── DATABASE_SCHEMA.md
    ├── API_SPECIFICATION.md
    ├── FIT_SCORE_LOGIC.md
    └── DEPLOYMENT_GUIDE.md
```

---

## ✅ Success Criteria

1. **Admin can upload Excel files** and system validates/imports data
2. **Brand users can select categories** and calculate FIT scores
3. **FIT scores are calculated in real-time** with accurate results
4. **User hierarchy works correctly** with proper permissions
5. **UI maintains existing design** while supporting new functionality
6. **System is production-ready** with proper error handling and validation

---

**Next Steps**: Review individual implementation documents for detailed specifications.
