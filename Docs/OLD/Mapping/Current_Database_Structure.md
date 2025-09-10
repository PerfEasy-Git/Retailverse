# Current Database Structure
## RetailVerse Platform - Live Database Documentation

**Date:** December 2024  
**Database:** PostgreSQL (retailverse)  
**Connection:** localhost:5432/retailverse (postgres)  
**Analysis Method:** Direct database querying

---

## 📊 Database Overview

- **Total Tables:** 12
- **Database Size:** 9,771 kB
- **PostgreSQL Version:** 15.4
- **Total Records:** 81 records across all tables

---

## 🗄️ Complete Table Structure

### 1. `analytics` Table
**Purpose:** User analytics and events tracking

**Columns (7):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('analytics_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `event_type` - character varying(100) NOT NULL
4. `event_data` - jsonb NULL
5. `ip_address` - character varying(45) NULL
6. `user_agent` - text NULL
7. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 0
**Constraints:** FOREIGN KEY: user_id -> users.id
**Indexes:** analytics_pkey, idx_analytics_created_at, idx_analytics_event_type, idx_analytics_user_id

---

### 2. `bookmarks` Table
**Purpose:** User bookmarks and notes

**Columns (6):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('bookmarks_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `brand_id` - integer(32) NULL
4. `retailer_id` - integer(32) NULL
5. `notes` - text NULL
6. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 0
**Constraints:** 
- FOREIGN KEY: brand_id -> brands.id
- FOREIGN KEY: retailer_id -> retailers.id
- FOREIGN KEY: user_id -> users.id
**Indexes:** bookmarks_pkey, idx_bookmarks_brand_id, idx_bookmarks_retailer_id, idx_bookmarks_user_id

---

### 3. `brand_categories` Table
**Purpose:** Brand category mappings and trade margins

**Columns (7):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('brand_categories_id_seq'::regclass)
2. `brand_id` - integer(32) NOT NULL
3. `category` - character varying(100) NOT NULL
4. `sub_category` - character varying(100) NOT NULL
5. `avg_trade_margin` - character varying(20) NOT NULL
6. `annual_turnover` - character varying(20) NOT NULL
7. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 3
**Constraints:** 
- FOREIGN KEY: brand_id -> brands.id
- UNIQUE: sub_category
- UNIQUE: category
**Indexes:** brand_categories_pkey, idx_brand_categories_brand_id, idx_brand_categories_category, idx_brand_categories_sub_category

---

### 4. `brands` Table
**Purpose:** Brand profiles and information

**Columns (27):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('brands_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `name` - character varying(255) NOT NULL
4. `category` - character varying(100) NULL
5. `description` - text NULL
6. `website` - character varying(255) NULL
7. `region` - character varying(100) NULL
8. `format` - character varying(100) NULL
9. `logo_url` - character varying(500) NULL
10. `contact_email` - character varying(255) NULL
11. `contact_phone` - character varying(20) NULL
12. `founded_year` - integer(32) NULL
13. `employee_count` - character varying(50) NULL
14. `annual_revenue` - character varying(100) NULL
15. `is_verified` - boolean NULL DEFAULT false
16. `created_at` - timestamp without time zone NULL DEFAULT now()
17. `updated_at` - timestamp without time zone NULL DEFAULT now()
18. `brand_name` - character varying(255) NULL
19. `poc_name` - character varying(255) NULL
20. `designation` - character varying(100) NULL
21. `official_email` - character varying(255) NULL
22. `website_url` - character varying(255) NULL
23. `contact_number` - character varying(20) NULL
24. `sub_category` - character varying(100) NULL
25. `avg_trade_margin` - character varying(20) NULL
26. `annual_turnover` - numeric(10,2) NULL
27. `trade_margin` - numeric(5,2) NULL DEFAULT 15.00

**Row Count:** 8
**Constraints:** 
- FOREIGN KEY: user_id -> users.id
- CHECK: chk_brands_avg_trade_margin
- CHECK: chk_brands_official_email
**Indexes:** brands_pkey, idx_brands_annual_turnover, idx_brands_brand_name, idx_brands_category, idx_brands_official_email, idx_brands_region, idx_brands_trade_margin, idx_brands_user_id

---

### 5. `category_subcategories` Table
**Purpose:** Master category-subcategory mappings

**Columns (4):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('category_subcategories_id_seq'::regclass)
2. `category` - character varying(100) NOT NULL
3. `sub_category` - character varying(100) NOT NULL
4. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 29
**Constraints:** 
- UNIQUE: sub_category
- UNIQUE: category
**Indexes:** category_subcategories_category_sub_category_key, category_subcategories_pkey, idx_category_subcategories_category, idx_category_subcategories_sub_category

---

### 6. `file_uploads` Table
**Purpose:** File upload tracking

**Columns (12):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('file_uploads_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `filename` - character varying(255) NOT NULL
4. `original_name` - character varying(255) NULL
5. `file_path` - character varying(500) NOT NULL
6. `file_size` - integer(32) NULL
7. `mime_type` - character varying(100) NULL
8. `upload_type` - character varying(50) NULL
9. `status` - character varying(20) NULL DEFAULT 'pending'::character varying
10. `error_message` - text NULL
11. `created_at` - timestamp without time zone NULL DEFAULT now()
12. `updated_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 0
**Constraints:** FOREIGN KEY: user_id -> users.id
**Indexes:** file_uploads_pkey, idx_uploads_status, idx_uploads_user_id

---

### 7. `fit_scores` Table
**Purpose:** Fit analysis scores between brands and retailers

**Columns (11):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('fit_scores_id_seq'::regclass)
2. `brand_id` - integer(32) NULL
3. `retailer_id` - integer(32) NULL
4. `score` - integer(32) NULL
5. `factors` - jsonb NULL
6. `category_match` - boolean NULL
7. `region_match` - boolean NULL
8. `format_match` - boolean NULL
9. `product_alignment_score` - integer(32) NULL
10. `calculated_at` - timestamp without time zone NULL DEFAULT now()
11. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 17
**Constraints:** 
- FOREIGN KEY: brand_id -> brands.id
- FOREIGN KEY: retailer_id -> retailers.id
- CHECK: fit_scores_score_check
- UNIQUE: brand_id, retailer_id
**Indexes:** fit_scores_brand_id_retailer_id_key, fit_scores_pkey, idx_fit_scores_brand_id, idx_fit_scores_calculated, idx_fit_scores_retailer_id, idx_fit_scores_score

---

### 8. `products` Table
**Purpose:** Product catalog and specifications

**Columns (23):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('products_id_seq'::regclass)
2. `brand_id` - integer(32) NULL
3. `name` - character varying(255) NOT NULL
4. `sku` - character varying(100) NULL
5. `category` - character varying(100) NULL
6. `subcategory` - character varying(100) NULL
7. `price` - numeric(10,2) NULL
8. `currency` - character varying(3) NULL DEFAULT 'USD'::character varying
9. `description` - text NULL
10. `specifications` - jsonb NULL
11. `image_url` - character varying(500) NULL
12. `is_active` - boolean NULL DEFAULT true
13. `created_at` - timestamp without time zone NULL DEFAULT now()
14. `updated_at` - timestamp without time zone NULL DEFAULT now()
15. `pack_size` - character varying(100) NULL
16. `mrp` - numeric(10,2) NULL
17. `avg_trade_margin` - numeric(5,2) NULL
18. `sku_name` - character varying(50) NULL
19. `short_description` - character varying(200) NULL
20. `specification` - character varying(100) NULL
21. `uom` - character varying(30) NULL
22. `gst` - integer(32) NULL
23. `asp` - numeric(10,2) NULL

**Row Count:** 14
**Constraints:** 
- FOREIGN KEY: brand_id -> brands.id
- CHECK: chk_products_gst
- CHECK: chk_products_mrp
- CHECK: chk_products_uom
**Indexes:** idx_products_brand_id, idx_products_category, idx_products_mrp, idx_products_pack_size, idx_products_sku, idx_products_sku_name, idx_products_subcategory, products_pkey

---

### 9. `retailer_locations` Table
**Purpose:** Geographic locations for retailers

**Columns (7):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('retailer_locations_id_seq'::regclass)
2. `retailer_id` - integer(32) NULL
3. `city` - character varying(100) NULL
4. `state` - character varying(100) NULL
5. `is_active` - boolean NULL DEFAULT true
6. `created_at` - timestamp without time zone NULL DEFAULT now()
7. `updated_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 0
**Constraints:** 
- FOREIGN KEY: retailer_id -> retailers.id
- UNIQUE: retailer_id, city, state
**Indexes:** idx_retailer_locations_active, idx_retailer_locations_city, idx_retailer_locations_retailer_id, idx_retailer_locations_state, retailer_locations_pkey, retailer_locations_retailer_id_city_state_key

---

### 10. `retailer_sku_data` Table
**Purpose:** SKU-level retailer-product relationships

**Columns (15):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('retailer_sku_data_id_seq'::regclass)
2. `retailer_id` - integer(32) NULL
3. `product_id` - integer(32) NULL
4. `sku_name` - character varying(255) NULL
5. `sku_mrp` - numeric(10,2) NULL
6. `sku_contribution_percent` - numeric(5,2) NULL
7. `price_point_category` - character varying(100) NULL
8. `created_at` - timestamp without time zone NULL DEFAULT now()
9. `updated_at` - timestamp without time zone NULL DEFAULT now()
10. `brand_name` - character varying(255) NULL
11. `product_name` - character varying(255) NULL
12. `asp` - numeric(10,2) NULL
13. `pack_size` - character varying(100) NULL
14. `uom` - character varying(50) NULL
15. `category_size` - numeric(15,2) NULL

**Row Count:** 0
**Constraints:** 
- FOREIGN KEY: product_id -> products.id
- FOREIGN KEY: retailer_id -> retailers.id
- UNIQUE: retailer_id, product_id
**Indexes:** idx_retailer_sku_data_asp, idx_retailer_sku_data_brand_name, idx_retailer_sku_data_pack_size, idx_retailer_sku_data_product_id, idx_retailer_sku_data_product_name, idx_retailer_sku_data_retailer_id, retailer_sku_data_pkey, retailer_sku_data_retailer_id_product_id_key

---

### 11. `retailers` Table
**Purpose:** Retailer profiles and business information

**Columns (33):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('retailers_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `name` - character varying(255) NOT NULL
4. `category` - character varying(100) NULL
5. `region` - character varying(100) NULL
6. `format` - character varying(100) NULL
7. `description` - text NULL
8. `website` - character varying(255) NULL
9. `logo_url` - character varying(500) NULL
10. `contact_email` - character varying(255) NULL
11. `contact_phone` - character varying(20) NULL
12. `store_count` - integer(32) NULL
13. `annual_revenue` - character varying(100) NULL
14. `target_audience` - character varying(255) NULL
15. `is_verified` - boolean NULL DEFAULT false
16. `created_at` - timestamp without time zone NULL DEFAULT now()
17. `updated_at` - timestamp without time zone NULL DEFAULT now()
18. `retailer_type` - character varying(50) NULL
19. `categories_present` - text NULL
20. `subcategories_present` - text NULL
21. `buying_model` - character varying(20) NULL
22. `avg_credit_days` - integer(32) NULL
23. `asp_category` - numeric(10,2) NULL
24. `competitor_benchmark` - text NULL
25. `category_size_value` - numeric(15,2) NULL
26. `category_size_units` - integer(32) NULL
27. `supply_type` - character varying(50) NULL
28. `price_point_sales_distribution` - text NULL
29. `sku_names_under_subcategory` - text NULL
30. `sku_mrp_values` - text NULL
31. `sku_contribution_percent` - text NULL
32. `subcategory` - character varying(100) NULL
33. `avg_trade_margin` - double precision(53) NULL

**Row Count:** 5
**Constraints:** 
- FOREIGN KEY: user_id -> users.id
- CHECK: check_avg_credit_days
- CHECK: check_buying_model
- CHECK: check_category
- CHECK: check_format
- CHECK: check_region
- CHECK: check_store_count
- CHECK: check_subcategory
- CHECK: check_supply_type
**Indexes:** idx_retailers_buying_model, idx_retailers_category, idx_retailers_region, idx_retailers_retailer_type, idx_retailers_subcategory, idx_retailers_supply_type, idx_retailers_user_id, retailers_pkey

---

### 12. `user_sessions` Table
**Purpose:** User session management

**Columns (9):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('user_sessions_id_seq'::regclass)
2. `user_id` - integer(32) NULL
3. `token` - character varying(500) NOT NULL
4. `refresh_token` - character varying(500) NULL
5. `expires_at` - timestamp without time zone NOT NULL
6. `ip_address` - character varying(45) NULL
7. `user_agent` - text NULL
8. `is_active` - boolean NULL DEFAULT true
9. `created_at` - timestamp without time zone NULL DEFAULT now()

**Row Count:** 0
**Constraints:** FOREIGN KEY: user_id -> users.id
**Indexes:** idx_sessions_expires, idx_sessions_token, idx_sessions_user_id, user_sessions_pkey

---

### 13. `users` Table
**Purpose:** User accounts and authentication

**Columns (14):**
1. `id` - integer(32) NOT NULL DEFAULT nextval('users_id_seq'::regclass)
2. `email` - character varying(255) NOT NULL
3. `password` - character varying(255) NOT NULL
4. `role` - character varying(20) NOT NULL
5. `company_name` - character varying(255) NOT NULL
6. `first_name` - character varying(100) NULL
7. `last_name` - character varying(100) NULL
8. `phone` - character varying(20) NULL
9. `is_active` - boolean NULL DEFAULT true
10. `email_verified` - boolean NULL DEFAULT false
11. `created_at` - timestamp without time zone NULL DEFAULT now()
12. `updated_at` - timestamp without time zone NULL DEFAULT now()
13. `reset_token` - character varying(255) NULL
14. `reset_token_expiry` - timestamp without time zone NULL

**Row Count:** 14
**Constraints:** 
- CHECK: users_role_check
- UNIQUE: email
**Indexes:** idx_users_active, idx_users_email, idx_users_reset_token, idx_users_role, users_email_key, users_pkey

---

## 🔗 Database Relationships

### Foreign Key Relationships
1. `brands.user_id` → `users.id`
2. `retailers.user_id` → `users.id`
3. `products.brand_id` → `brands.id`
4. `fit_scores.brand_id` → `brands.id`
5. `fit_scores.retailer_id` → `retailers.id`
6. `retailer_locations.retailer_id` → `retailers.id`
7. `retailer_sku_data.retailer_id` → `retailers.id`
8. `retailer_sku_data.product_id` → `products.id`
9. `brand_categories.brand_id` → `brands.id`
10. `analytics.user_id` → `users.id`
11. `bookmarks.user_id` → `users.id`
12. `bookmarks.brand_id` → `brands.id`
13. `bookmarks.retailer_id` → `retailers.id`
14. `file_uploads.user_id` → `users.id`
15. `user_sessions.user_id` → `users.id`

### Check Constraints
- `users.role` - Must be 'brand', 'retailer', or 'admin'
- `retailers.format` - Multiple allowed values (RMT, NMT, SMT, Pharmacy, etc.)
- `retailers.category` - Multiple allowed values (Makeup, Skin, Hair, etc.)
- `retailers.region` - Multiple allowed values (North America, Europe, etc.)
- `retailers.buying_model` - Must be 'Outright', 'SOR', or 'MG'
- `retailers.supply_type` - Must be 'DC supply' or 'Direct store supply'
- `products.gst` - Must be between 0 and 28
- `products.mrp` - Must be greater than 0
- `products.uom` - Must be valid unit of measurement
- `fit_scores.score` - Must be between 0 and 100
- `brands.avg_trade_margin` - Must be valid format
- `brands.official_email` - Must be valid email format

---

## 📊 Database Statistics

### Table Sizes
- **Total Database:** 9,771 kB
- **Largest Tables:** products (176 kB), retailers (144 kB), users (112 kB)

### Record Distribution
- **Users:** 14 records
- **Brands:** 8 records
- **Retailers:** 5 records
- **Products:** 14 records
- **Fit Scores:** 17 records
- **Brand Categories:** 3 records
- **Category Subcategories:** 29 records
- **Other Tables:** 0 records (empty)

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Prepared By:** AI Assistant  
**Review Status:** Validated Against Live Database
