const express = require('express');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');

const router = express.Router();

// ========================================
// CREATE RETAILER
// ========================================
router.post('/',
    requireRole(['retailer_admin']),
    [
        body('retailer_name').notEmpty().trim(),
        body('retailer_category').optional().trim(),
        body('retailer_format').optional().trim(),
        body('retailer_sale_model').optional().trim(),
        body('outlet_count').optional().isInt({ min: 0 }),
        body('city_count').optional().isInt({ min: 0 }),
        body('state_count').optional().isInt({ min: 0 }),
        body('purchase_model').optional().trim(),
        body('credit_days').optional().isInt({ min: 0, max: 365 }),
        body('logo_url').optional().isURL(),
        body('store_images').optional().isString()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const {
                retailer_name, retailer_category, retailer_format, retailer_sale_model,
                outlet_count, city_count, state_count, purchase_model, credit_days,
                logo_url, store_images
            } = req.body;

            // Create retailer
            const result = await db.query(`
                INSERT INTO retailers (user_id, retailer_name, retailer_category, retailer_format,
                                    retailer_sale_model, outlet_count, city_count, state_count,
                                    purchase_model, credit_days, logo_url, store_images)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                req.user.id, retailer_name, retailer_category, retailer_format,
                retailer_sale_model, outlet_count, city_count, state_count,
                purchase_model, credit_days, logo_url, store_images
            ]);

            const retailer = result.rows[0];

            // Update user's company_id
            await db.query(
                'UPDATE users SET company_id = $1, company_type = $2 WHERE id = $3',
                [retailer.id, 'retailer', req.user.id]
            );

            // Log retailer creation
            await auditLogger.log({
                user_id: req.user.id,
                action: 'retailer_created',
                resource_type: 'retailer',
                resource_id: retailer.id,
                new_values: { retailer_name, retailer_category },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Retailer created successfully',
                data: retailer
            });

        } catch (error) {
            console.error('Create retailer error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create retailer'
            });
        }
    }
);

// ========================================
// GET RETAILER PROFILE
// ========================================
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, u.email, u.first_name as user_first_name, u.last_name as user_last_name
            FROM retailers r
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Retailer profile not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get retailer profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer profile'
        });
    }
});

// ========================================
// GET ALL RETAILERS (for admin and brands)
// ========================================
router.get('/',
    requireRole(['admin', 'brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await db.query(`
                SELECT r.*, u.email, u.first_name as user_first_name, u.last_name as user_last_name
                FROM retailers r
                JOIN users u ON r.user_id = u.id
                ORDER BY r.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            const countResult = await db.query('SELECT COUNT(*) as total FROM retailers');

            res.json({
                success: true,
                data: {
                    retailers: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get all retailers error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get retailers'
            });
        }
    }
);

// ========================================
// GET RETAILER BY ID
// ========================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                r.*,
                rl.city,
                rl.state,
                rl.pincode,
                rl.address
            FROM retailers r
            LEFT JOIN retailer_locations rl ON r.id = rl.retailer_id
            WHERE r.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Retailer not found'
            });
        }

        // Group locations
        const retailer = result.rows[0];
        const locations = result.rows.map(row => ({
            city: row.city,
            state: row.state,
            pincode: row.pincode,
            address: row.address
        })).filter(loc => loc.city); // Remove null locations

        res.json({
            success: true,
            data: {
                ...retailer,
                locations
            }
        });

    } catch (error) {
        console.error('Get retailer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer'
        });
    }
});

// ========================================
// GET RETAILER PRODUCTS
// ========================================
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                p.id as product_id,
                p.product_description,
                p.category,
                p.sub_category,
                p.mrp,
                rpm.avg_selling_price,
                rpm.annual_sale,
                rpm.retailer_margin,
                rpm.stock_status,
                rpm.last_updated
            FROM products p
            JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
            WHERE rpm.retailer_id = $1
            ORDER BY p.product_description
        `, [id]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get retailer products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer products'
        });
    }
});

// ========================================
// GET RETAILER LOCATIONS
// ========================================
router.get('/:id/locations', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                rl.id,
                rl.city,
                rl.state,
                rl.pincode,
                rl.address,
                rl.outlet_type,
                rl.contact_person,
                rl.contact_phone,
                rl.created_at
            FROM retailer_locations rl
            WHERE rl.retailer_id = $1
            ORDER BY rl.city, rl.state
        `, [id]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get retailer locations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer locations'
        });
    }
});

// ========================================
// GET RETAILER ANALYTICS
// ========================================
router.get('/:id/analytics', async (req, res) => {
    try {
        const { id } = req.params;

        // Get retailer basic info
        const retailerResult = await db.query(`
            SELECT 
                r.retailer_name,
                r.retailer_category,
                r.retailer_format,
                r.outlet_count
            FROM retailers r
            WHERE r.id = $1
        `, [id]);

        if (retailerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Retailer not found'
            });
        }

        // Get product analytics
        const productAnalytics = await db.query(`
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COUNT(DISTINCT p.category) as categories_covered,
                AVG(rpm.avg_selling_price) as avg_asp,
                AVG(rpm.retailer_margin) as avg_margin,
                SUM(rpm.annual_sale) as total_annual_sales
            FROM products p
            JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
            WHERE rpm.retailer_id = $1
        `, [id]);

        // Get category breakdown
        const categoryBreakdown = await db.query(`
            SELECT 
                p.category,
                COUNT(DISTINCT p.id) as product_count,
                AVG(rpm.avg_selling_price) as avg_asp,
                AVG(rpm.retailer_margin) as avg_margin
            FROM products p
            JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
            WHERE rpm.retailer_id = $1
            GROUP BY p.category
            ORDER BY product_count DESC
        `, [id]);

        // Get location analytics
        const locationAnalytics = await db.query(`
            SELECT 
                rl.state,
                COUNT(*) as outlet_count
            FROM retailer_locations rl
            WHERE rl.retailer_id = $1
            GROUP BY rl.state
            ORDER BY outlet_count DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                retailer: retailerResult.rows[0],
                analytics: {
                    products: productAnalytics.rows[0],
                    category_breakdown: categoryBreakdown.rows,
                    location_breakdown: locationAnalytics.rows
                }
            }
        });

    } catch (error) {
        console.error('Get retailer analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer analytics'
        });
    }
});

module.exports = router;
