const express = require('express');
const { db } = require('../database/connection');

const router = express.Router();

// ========================================
// GET ALL CATEGORIES AND SUBCATEGORIES
// ========================================
router.get('/', async (req, res) => {
    try {
        console.log('📂 Loading categories and subcategories...');
        
        const result = await db.query(`
            SELECT DISTINCT category, sub_category 
            FROM categories_subcategories 
            ORDER BY category, sub_category
        `);

        console.log(`📊 Found ${result.rows.length} category-subcategory combinations`);

        // Group by category
        const categories = {};
        result.rows.forEach(row => {
            if (!categories[row.category]) {
                categories[row.category] = [];
            }
            categories[row.category].push(row.sub_category);
        });

        // Convert to array format expected by frontend
        const categoriesArray = Object.keys(categories).map(category => ({
            category,
            subcategories: categories[category]
        }));

        console.log(`✅ Categories loaded: ${categoriesArray.length} categories with subcategories`);

        res.json({
            success: true,
            data: categoriesArray
        });

    } catch (error) {
        console.error('❌ Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get categories'
        });
    }
});

// ========================================
// GET CATEGORIES BY BRAND (for FIT score calculation)
// ========================================
router.get('/brand/:brandId', async (req, res) => {
    try {
        const { brandId } = req.params;

        const result = await db.query(`
            SELECT bc.category, bc.sub_category
            FROM brand_categories bc
            WHERE bc.brand_id = $1
            ORDER BY bc.category, bc.sub_category
        `, [brandId]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get brand categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get brand categories'
        });
    }
});

module.exports = router;
