const express = require('express');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');

const router = express.Router();

// ========================================
// CREATE BRAND
// ========================================
router.post('/',
    requireRole(['brand_admin']),
    [
        body('brand_name').notEmpty().trim(),
        body('website_url').optional().isURL(),
        body('contact_number').optional().isMobilePhone(),
        body('official_email').optional().isEmail(),
        body('designation').optional().trim(),
        body('first_name').optional().trim(),
        body('last_name').optional().trim(),
        body('avg_trade_margin').optional().trim(),
        body('annual_turnover').optional().trim()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const {
                brand_name, website_url, contact_number, official_email,
                designation, first_name, last_name, avg_trade_margin, annual_turnover
            } = req.body;

            // Create brand
            const result = await db.query(`
                INSERT INTO brands (user_id, brand_name, website_url, contact_number, 
                                  official_email, designation, first_name, last_name, 
                                  avg_trade_margin, annual_turnover)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, brand_name, website_url, contact_number, official_email,
                         designation, first_name, last_name, avg_trade_margin, annual_turnover
            `, [
                req.user.id, brand_name, website_url, contact_number, official_email,
                designation, first_name, last_name, avg_trade_margin, annual_turnover
            ]);

            const brand = result.rows[0];

            // Update user's company_id
            await db.query(
                'UPDATE users SET company_id = $1, company_type = $2 WHERE id = $3',
                [brand.id, 'brand', req.user.id]
            );

            // Log brand creation
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_created',
                resource_type: 'brand',
                resource_id: brand.id,
                new_values: { brand_name, official_email },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Brand created successfully',
                data: brand
            });

        } catch (error) {
            console.error('Create brand error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create brand'
            });
        }
    }
);

// ========================================
// GET BRAND PROFILE
// ========================================
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.*, u.email, u.first_name as user_first_name, u.last_name as user_last_name
            FROM brands b
            JOIN users u ON b.user_id = u.id
            WHERE b.user_id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Brand profile not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get brand profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get brand profile'
        });
    }
});

// ========================================
// UPDATE BRAND PROFILE
// ========================================
router.put('/profile',
    requireRole(['brand_admin']),
    [
        body('brand_name').optional().trim(),
        body('website_url').optional().isURL(),
        body('contact_number').optional().isMobilePhone(),
        body('official_email').optional().isEmail(),
        body('designation').optional().trim(),
        body('first_name').optional().trim(),
        body('last_name').optional().trim(),
        body('avg_trade_margin').optional().trim(),
        body('annual_turnover').optional().trim()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            // Build dynamic update query
            Object.keys(req.body).forEach(key => {
                if (req.body[key] !== undefined) {
                    updateFields.push(`${key} = $${paramIndex++}`);
                    values.push(req.body[key]);
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update'
                });
            }

            updateFields.push(`updated_at = NOW()`);
            values.push(req.user.id);

            const result = await db.query(`
                UPDATE brands 
                SET ${updateFields.join(', ')}
                WHERE user_id = $${paramIndex}
                RETURNING *
            `, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand profile not found'
                });
            }

            // Log brand update
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_updated',
                resource_type: 'brand',
                resource_id: result.rows[0].id,
                new_values: req.body,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Brand profile updated successfully',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Update brand profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update brand profile'
            });
        }
    }
);

// ========================================
// GET BRAND CATEGORIES
// ========================================
router.get('/categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT bc.*, cs.category, cs.sub_category
            FROM brand_categories bc
            JOIN categories_subcategories cs ON bc.category = cs.category AND bc.sub_category = cs.sub_category
            WHERE bc.brand_id = (SELECT id FROM brands WHERE user_id = $1)
            ORDER BY bc.category, bc.sub_category
        `, [req.user.id]);

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

// ========================================
// ADD BRAND CATEGORIES
// ========================================
router.post('/categories',
    requireRole(['brand_admin', 'brand_user']),
    [
        body('categories').isArray({ min: 1 }),
        body('categories.*.category').notEmpty().trim(),
        body('categories.*.sub_category').notEmpty().trim()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { categories } = req.body;

            // Get brand ID
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE user_id = $1',
                [req.user.id]
            );

            if (brandResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found'
                });
            }

            const brandId = brandResult.rows[0].id;

            // Clear existing categories
            await db.query(
                'DELETE FROM brand_categories WHERE brand_id = $1',
                [brandId]
            );

            // Insert new categories
            const insertedCategories = [];
            for (const category of categories) {
                const result = await db.query(`
                    INSERT INTO brand_categories (brand_id, category, sub_category)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `, [brandId, category.category, category.sub_category]);
                
                insertedCategories.push(result.rows[0]);
            }

            // Log category update
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_categories_updated',
                resource_type: 'brand_categories',
                resource_id: brandId,
                new_values: { categories: insertedCategories },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Brand categories updated successfully',
                data: insertedCategories
            });

        } catch (error) {
            console.error('Add brand categories error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add brand categories'
            });
        }
    }
);

// ========================================
// GET ALL BRANDS (for admin)
// ========================================
router.get('/',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await db.query(`
                SELECT b.*, u.email, u.first_name as user_first_name, u.last_name as user_last_name
                FROM brands b
                JOIN users u ON b.user_id = u.id
                ORDER BY b.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            const countResult = await db.query('SELECT COUNT(*) as total FROM brands');

            res.json({
                success: true,
                data: {
                    brands: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get all brands error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get brands'
            });
        }
    }
);

module.exports = router;
