# FIT Score Calculation Logic - Complete Implementation

## 🎯 Overview

The FIT score calculation system determines compatibility between brands and retailers based on four key factors with specific weightages.

---

## 📊 Calculation Algorithm

### Core Formula
```
Overall FIT Score = (Category Score × 30%) + (Subcategory Score × 30%) + 
                   (Trade Margin Score × 10%) + (ASP Score × 30%)
```

### Maximum Score: 100 points

---

## 🔍 Detailed Calculation Logic

### 1. Category Match (30% Weight)
**Purpose**: Check if brand's selected categories match retailer's category

**Logic**:
```javascript
function calculateCategoryScore(brandCategories, retailerCategory) {
    // Check if any of brand's selected categories match retailer's category
    const hasMatch = brandCategories.some(cat => cat.category === retailerCategory);
    return hasMatch ? 100 : 0;
}
```

**Examples**:
- Brand selects: ["Makeup", "Skin"] + Retailer category: "Makeup" → **100 points**
- Brand selects: ["Makeup", "Skin"] + Retailer category: "Hair" → **0 points**

---

### 2. Subcategory Match (30% Weight)
**Purpose**: Evaluate subcategory alignment with gap analysis

**Logic**:
```javascript
function calculateSubcategoryScore(brandSubcategories, retailerSubcategories) {
    // Calculate subcategory gap
    const gap = calculateSubcategoryGap(brandSubcategories, retailerSubcategories);
    
    if (gap > 2) {
        return 100; // Full points for significant gap
    } else {
        return (gap / 2) * 100; // Partial points based on gap
    }
}

function calculateSubcategoryGap(brandSubs, retailerSubs) {
    // Count common subcategories
    const commonSubs = brandSubs.filter(sub => retailerSubs.includes(sub));
    
    // Calculate gap based on common vs total
    const totalSubs = Math.max(brandSubs.length, retailerSubs.length);
    const gap = totalSubs - commonSubs.length;
    
    return gap;
}
```

**Examples**:
- Brand: ["Face", "Eyes"] + Retailer: ["Face", "Eyes", "Lips"] → Gap: 1 → **50 points**
- Brand: ["Face"] + Retailer: ["Face", "Eyes", "Lips", "Nail"] → Gap: 3 → **100 points**

---

### 3. Trade Margin Match (10% Weight)
**Purpose**: Compare brand's trade margin with retailer's average margin

**Logic**:
```javascript
function calculateMarginScore(brandMargin, retailerAvgMargin) {
    if (brandMargin >= retailerAvgMargin) {
        return 100; // Full points if brand margin is higher or equal
    } else {
        return (brandMargin / retailerAvgMargin) * 100; // Partial points
    }
}
```

**Examples**:
- Brand margin: 30% + Retailer avg: 25% → **100 points**
- Brand margin: 20% + Retailer avg: 30% → **66.67 points**

---

### 4. ASP Match (30% Weight)
**Purpose**: Check if brand's ASP is within ±15% of retailer's ASP

**Logic**:
```javascript
function calculateASPScore(brandASP, retailerASP) {
    const difference = Math.abs(brandASP - retailerASP);
    const threshold = retailerASP * 0.15; // ±15% threshold
    
    if (difference <= threshold) {
        return 100; // Full points within threshold
    } else {
        // Calculate penalty based on how far outside threshold
        const penalty = (difference - threshold) / retailerASP;
        return Math.max(0, 100 - (penalty * 100));
    }
}
```

**Examples**:
- Brand ASP: 100 + Retailer ASP: 110 → Difference: 10, Threshold: 16.5 → **100 points**
- Brand ASP: 100 + Retailer ASP: 130 → Difference: 30, Threshold: 19.5 → **89.23 points**

---

## 🎯 Recommendation System

### Priority Levels
```javascript
function getRecommendation(overallScore) {
    if (overallScore >= 80) {
        return {
            priority: 'High',
            action: 'Launch in All Stores',
            notes: 'Prefer Outright if credit days < 30'
        };
    } else if (overallScore >= 60) {
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
}
```

### Recommendation Matrix
| Score Range | Priority | Action | Additional Notes |
|-------------|----------|--------|------------------|
| 80-100 | High | Launch in All Stores | Prefer Outright if credit days < 30 |
| 60-79 | Medium | Pilot Launch in Select Stores | Prefer SOR if competition high |
| 0-59 | Low | Delay Entry | Suggest rework or reprice strategy |

---

## 🔧 Implementation Details

### Complete Calculation Function
```javascript
function calculateFitScore(brandData, retailerData, selectedCategories) {
    // Extract brand information
    const brandCategories = selectedCategories.map(cat => cat.category);
    const brandSubcategories = selectedCategories.flatMap(cat => cat.sub_categories);
    const brandMargin = parseFloat(brandData.avg_trade_margin);
    const brandASP = calculateBrandASP(brandData);

    // Extract retailer information
    const retailerCategory = retailerData.retailer_category;
    const retailerSubcategories = getRetailerSubcategories(retailerData);
    const retailerAvgMargin = calculateRetailerAvgMargin(retailerData);
    const retailerASP = calculateRetailerASP(retailerData);

    // Calculate individual scores
    const categoryScore = calculateCategoryScore(brandCategories, retailerCategory);
    const subcategoryScore = calculateSubcategoryScore(brandSubcategories, retailerSubcategories);
    const marginScore = calculateMarginScore(brandMargin, retailerAvgMargin);
    const aspScore = calculateASPScore(brandASP, retailerASP);

    // Calculate overall score
    const overallScore = (categoryScore * 0.3) + (subcategoryScore * 0.3) + 
                        (marginScore * 0.1) + (aspScore * 0.3);

    // Get recommendation
    const recommendation = getRecommendation(overallScore);

    return {
        overallScore: Math.round(overallScore),
        categoryScore: Math.round(categoryScore),
        subcategoryScore: Math.round(subcategoryScore),
        marginScore: Math.round(marginScore),
        aspScore: Math.round(aspScore),
        recommendation: recommendation,
        scoreBreakdown: {
            category: { score: categoryScore, weight: 30 },
            subcategory: { score: subcategoryScore, weight: 30 },
            margin: { score: marginScore, weight: 10 },
            asp: { score: aspScore, weight: 30 }
        }
    };
}
```

### Helper Functions
```javascript
// Calculate brand's average ASP from products
function calculateBrandASP(brandData) {
    const products = brandData.products || [];
    if (products.length === 0) return 0;
    
    const totalASP = products.reduce((sum, product) => sum + product.mrp, 0);
    return totalASP / products.length;
}

// Calculate retailer's average ASP from product mappings
function calculateRetailerASP(retailerData) {
    const mappings = retailerData.product_mappings || [];
    if (mappings.length === 0) return 0;
    
    const totalASP = mappings.reduce((sum, mapping) => sum + mapping.avg_selling_price, 0);
    return totalASP / mappings.length;
}

// Calculate retailer's average margin
function calculateRetailerAvgMargin(retailerData) {
    const mappings = retailerData.product_mappings || [];
    if (mappings.length === 0) return 0;
    
    const totalMargin = mappings.reduce((sum, mapping) => sum + mapping.retailer_margin, 0);
    return totalMargin / mappings.length;
}

// Get retailer's subcategories from products
function getRetailerSubcategories(retailerData) {
    const products = retailerData.products || [];
    return [...new Set(products.map(product => product.sub_category))];
}
```

---

## 📊 Data Requirements

### Brand Data Structure
```javascript
{
    id: 1,
    brand_name: "My Brand",
    avg_trade_margin: "30",
    annual_turnover: "MORE THAN 250Cr",
    products: [
        {
            id: 1,
            product_description: "Product 1",
            category: "Makeup",
            sub_category: "Face",
            mrp: 250
        }
    ]
}
```

### Retailer Data Structure
```javascript
{
    id: 1,
    retailer_name: "Apollo",
    retailer_category: "NMT",
    retailer_format: "Pharmacy",
    credit_days: 30,
    products: [
        {
            id: 1,
            product_description: "Product 1",
            sub_category: "Face"
        }
    ],
    product_mappings: [
        {
            product_id: 1,
            avg_selling_price: 200,
            retailer_margin: 15
        }
    ]
}
```

### Selected Categories Structure
```javascript
[
    {
        category: "Makeup",
        sub_categories: ["Face", "Eyes"]
    },
    {
        category: "Skin",
        sub_categories: ["Moisturizers"]
    }
]
```

---

## 🚀 API Integration

### Request Format
```javascript
POST /api/fit-scores/calculate
{
    "selected_categories": [
        {
            "category": "Makeup",
            "sub_categories": ["Face", "Eyes"]
        }
    ]
}
```

### Response Format
```javascript
{
    "success": true,
    "data": {
        "retailers": [
            {
                "retailer_id": 1,
                "retailer_name": "Apollo",
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
        ]
    }
}
```

---

## 🧪 Testing Scenarios

### Test Case 1: Perfect Match
- Brand: Makeup + Face, Eyes
- Retailer: Makeup + Face, Eyes, Lips
- Brand Margin: 30%, Retailer Avg: 25%
- Brand ASP: 100, Retailer ASP: 105
- **Expected Score**: 100 (30+30+10+30)

### Test Case 2: Partial Match
- Brand: Makeup + Face
- Retailer: Makeup + Face, Eyes, Lips, Nail
- Brand Margin: 20%, Retailer Avg: 30%
- Brand ASP: 100, Retailer ASP: 130
- **Expected Score**: 85 (30+100+6.67+89.23)

### Test Case 3: No Match
- Brand: Makeup + Face
- Retailer: Hair + Hair Care
- Brand Margin: 20%, Retailer Avg: 30%
- Brand ASP: 100, Retailer ASP: 200
- **Expected Score**: 0 (0+0+6.67+0)

---

**Next**: Review DEPLOYMENT_GUIDE.md for production setup instructions.
