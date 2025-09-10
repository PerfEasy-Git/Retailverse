# API Specification - Complete Implementation

## 🔌 API Overview

**Base URL**: `http://localhost:1200/api`  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

---

## 🔐 Authentication APIs

### POST /api/auth/register
Register a new user

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "brand_admin",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "brand_admin",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/login
Login user

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "brand_admin",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/forgot-password
Request password reset

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password
Reset password with token

**Request Body**:
```json
{
  "token": "reset_token_here",
  "password": "newpassword123"
}
```

---

## 👥 User Management APIs

### GET /api/users/profile
Get current user profile

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "brand_admin",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "company_id": 1,
    "company_type": "brand"
  }
}
```

### PUT /api/users/profile
Update user profile

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

### GET /api/users/company-users
Get users under same company (for admins)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "email": "user2@example.com",
      "role": "brand_user",
      "first_name": "Jane",
      "last_name": "Smith",
      "is_active": true
    }
  ]
}
```

### POST /api/users/invite
Invite new user to company

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "role": "brand_user",
  "first_name": "New",
  "last_name": "User"
}
```

---

## 🏢 Brand Management APIs

### POST /api/brands/create
Create brand profile

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "brand_name": "My Brand",
  "website_url": "https://mybrand.com",
  "contact_number": "+1234567890",
  "official_email": "contact@mybrand.com",
  "designation": "CEO",
  "first_name": "John",
  "last_name": "Doe",
  "avg_trade_margin": "30 & ABOVE",
  "annual_turnover": "MORE THAN 250Cr"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "id": 1,
    "brand_name": "My Brand",
    "website_url": "https://mybrand.com"
  }
}
```

### GET /api/brands/profile
Get brand profile

**Headers**: `Authorization: Bearer <token>`

### PUT /api/brands/profile
Update brand profile

**Headers**: `Authorization: Bearer <token>`

### GET /api/brands/categories
Get brand's selected categories

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": "Makeup",
      "sub_category": "Face"
    },
    {
      "id": 2,
      "category": "Skin",
      "sub_category": "Moisturizers"
    }
  ]
}
```

### POST /api/brands/categories
Save brand's selected categories

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "categories": [
    {
      "category": "Makeup",
      "sub_category": "Face"
    },
    {
      "category": "Skin",
      "sub_category": "Moisturizers"
    }
  ]
}
```

---

## 🏪 Retailer Management APIs

### POST /api/retailers/create
Create retailer profile

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "retailer_name": "My Retailer",
  "retailer_category": "NMT",
  "retailer_format": "Pharmacy",
  "retailer_sale_model": "B2C",
  "outlet_count": 100,
  "city_count": 10,
  "state_count": 3,
  "purchase_model": "Outright",
  "credit_days": 30,
  "logo_url": "https://example.com/logo.jpg"
}
```

### GET /api/retailers/profile
Get retailer profile

**Headers**: `Authorization: Bearer <token>`

### PUT /api/retailers/profile
Update retailer profile

**Headers**: `Authorization: Bearer <token>`

---

## 📊 FIT Score Calculation APIs

### GET /api/categories
Get all available categories and subcategories

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "category": "Makeup",
      "subcategories": ["Face", "Eyes", "Lips", "Nail"]
    },
    {
      "category": "Skin",
      "subcategories": ["Moisturizers", "Cleansers", "Masks", "Toners"]
    }
  ]
}
```

### POST /api/fit-scores/calculate
Calculate FIT scores for selected categories

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "selected_categories": [
    {
      "category": "Makeup",
      "sub_categories": ["Face", "Eyes"]
    },
    {
      "category": "Skin",
      "sub_categories": ["Moisturizers"]
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "retailers": [
      {
        "retailer_id": 1,
        "retailer_name": "Apollo",
        "retailer_category": "NMT",
        "retailer_format": "Pharmacy",
        "outlet_count": 5500,
        "fit_score": 85,
        "recommendation": {
          "priority": "High",
          "action": "Launch in All Stores",
          "notes": "Prefer Outright if credit days < 30"
        },
        "score_breakdown": {
          "category_score": 100,
          "subcategory_score": 80,
          "margin_score": 90,
          "asp_score": 75
        }
      }
    ],
    "calculation_summary": {
      "total_retailers": 39,
      "high_priority": 15,
      "medium_priority": 18,
      "low_priority": 6
    }
  }
}
```

### GET /api/fit-scores/retailer/:retailerId
Get detailed FIT score for specific retailer

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "retailer": {
      "id": 1,
      "name": "Apollo",
      "category": "NMT",
      "format": "Pharmacy",
      "outlet_count": 5500,
      "locations": [
        {
          "city": "Bengaluru",
          "state": "Karnataka"
        }
      ]
    },
    "fit_score": 85,
    "recommendation": {
      "priority": "High",
      "action": "Launch in All Stores"
    },
    "score_breakdown": {
      "category_score": 100,
      "subcategory_score": 80,
      "margin_score": 90,
      "asp_score": 75
    },
    "products": [
      {
        "product_id": "RV_PI_00001",
        "product_name": "Axe Denim After Shave",
        "mrp": 249,
        "asp": 115.58,
        "margin": 15
      }
    ]
  }
}
```

---

## 📁 File Upload APIs

### POST /api/uploads/excel
Upload Excel file for data import

**Headers**: `Authorization: Bearer <token>`

**Request**: Multipart form data
- `file`: Excel file (.xlsx)
- `upload_type`: "retailer_data"

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "upload_id": 1,
    "filename": "retailer_data.xlsx",
    "status": "processing"
  }
}
```

### GET /api/uploads/status/:uploadId
Get upload processing status

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "upload_id": 1,
    "filename": "retailer_data.xlsx",
    "status": "completed",
    "records_processed": 3242,
    "error_message": null,
    "created_at": "2024-12-01T10:00:00Z"
  }
}
```

### GET /api/uploads/history
Get upload history

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "filename": "retailer_data.xlsx",
      "status": "completed",
      "records_processed": 3242,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ]
}
```

---

## 📈 Data Management APIs

### GET /api/products
Get all products

**Query Parameters**:
- `brand_name`: Filter by brand name
- `category`: Filter by category
- `sub_category`: Filter by subcategory
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "brand_name": "AXE",
        "product_id": "RV_PI_00016",
        "product_description": "Axe Denim After Shave Lotion 100 Ml",
        "category": "SHAVING",
        "sub_category": "AFTER SHAVE",
        "mrp": 249,
        "pack_size": "100",
        "uom": "ML"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 57,
      "items_per_page": 20
    }
  }
}
```

### GET /api/retailers
Get all retailers

**Query Parameters**:
- `category`: Filter by retailer category
- `format`: Filter by retailer format
- `page`: Page number
- `limit`: Items per page

### GET /api/retailers/:id/locations
Get retailer locations

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "city": "Bengaluru",
      "state": "Karnataka"
    },
    {
      "id": 2,
      "city": "Mumbai",
      "state": "Maharashtra"
    }
  ]
}
```

### GET /api/retailers/:id/products
Get retailer's products

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "product_name": "Axe Denim After Shave",
      "avg_selling_price": 115.58,
      "annual_sale": 7,
      "retailer_margin": 15
    }
  ]
}
```

---

## 🔧 Admin APIs

### GET /api/admin/dashboard
Get admin dashboard data

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_brands": 25,
    "total_retailers": 39,
    "total_products": 57,
    "recent_uploads": [
      {
        "id": 1,
        "filename": "retailer_data.xlsx",
        "status": "completed",
        "created_at": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### GET /api/admin/users
Get all users (admin only)

**Headers**: `Authorization: Bearer <token>`

### PUT /api/admin/users/:id/status
Update user status

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "is_active": false
}
```

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ERROR`: Resource already exists
- `FILE_UPLOAD_ERROR`: File upload failed
- `PROCESSING_ERROR`: Data processing failed

---

## 🔒 Authentication & Authorization

### JWT Token Structure
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "role": "brand_admin",
  "company_id": 1,
  "company_type": "brand",
  "iat": 1701432000,
  "exp": 1701518400
}
```

### Role-Based Access Control
- **admin**: Full system access
- **brand_admin**: Brand management + invite users
- **brand_user**: Brand operations only
- **retailer_admin**: Retailer management + invite users
- **retailer_user**: Retailer operations only

---

**Next**: Review FIT_SCORE_LOGIC.md for calculation implementation details.
