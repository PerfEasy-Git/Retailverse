const express = require('express');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// ========================================
// GET ALL PRODUCTS
// ========================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, sub_category, brand_name } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND category = $${paramIndex++}`;
            params.push(category);
        }

        if (sub_category) {
            query += ` AND sub_category = $${paramIndex++}`;
            params.push(sub_category);
        }

        if (brand_name) {
            query += ` AND brand_name ILIKE $${paramIndex++}`;
            params.push(`%${brand_name}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (category) {
            countQuery += ` AND category = $${countParamIndex++}`;
            countParams.push(category);
        }

        if (sub_category) {
            countQuery += ` AND sub_category = $${countParamIndex++}`;
            countParams.push(sub_category);
        }

        if (brand_name) {
            countQuery += ` AND brand_name ILIKE $${countParamIndex++}`;
            countParams.push(`%${brand_name}%`);
        }

        const countResult = await db.query(countQuery, countParams);

        res.json({
            success: true,
            data: {
                products: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(countResult.rows[0].total / limit),
                    total_items: parseInt(countResult.rows[0].total),
                    items_per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get products'
        });
    }
});

// ========================================
// GET PRODUCT BY ID
// ========================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get product'
        });
    }
});

// ========================================
// GET PRODUCT CATEGORIES
// ========================================
router.get('/categories/list', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT category, sub_category 
            FROM categories_subcategories 
            ORDER BY category, sub_category
        `);

        // Group by category
        const categories = {};
        result.rows.forEach(row => {
            if (!categories[row.category]) {
                categories[row.category] = [];
            }
            categories[row.category].push(row.sub_category);
        });

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get categories'
        });
    }
});

// ========================================
// GET PRODUCTS BY RETAILER
// ========================================
router.get('/retailer/:retailerId',
    requireRole(['admin', 'brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            const { retailerId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await db.query(`
                SELECT p.*, rpm.avg_selling_price, rpm.annual_sale, rpm.retailer_margin
                FROM products p
                JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
                WHERE rpm.retailer_id = $1
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3
            `, [retailerId, limit, offset]);

            const countResult = await db.query(`
                SELECT COUNT(*) as total 
                FROM products p
                JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
                WHERE rpm.retailer_id = $1
            `, [retailerId]);

            res.json({
                success: true,
                data: {
                    products: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get retailer products error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get retailer products'
            });
        }
    }
);

module.exports = router;
