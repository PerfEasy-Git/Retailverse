const express = require('express');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const FitScoreService = require('../services/fitScoreService');
const { auditLogger } = require('../utils/logger');

const router = express.Router();

// ========================================
// CALCULATE FIT SCORE FOR SELECTED CATEGORIES
// ========================================
router.post('/calculate',
    requireRole(['brand_admin', 'brand_user']),
    [
        body('selected_categories').isArray({ min: 1 }),
        body('selected_categories.*.category').notEmpty().trim(),
        body('selected_categories.*.sub_categories').isArray({ min: 1 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { selected_categories } = req.body;
            const userId = req.user.id;

            console.log(`🚀 FIT Score API Call - User ID: ${userId}`);
            console.log(`📋 Selected Categories:`, JSON.stringify(selected_categories, null, 2));

            // Get brand ID
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE user_id = $1',
                [userId]
            );

            if (brandResult.rows.length === 0) {
                console.log(`❌ No brand found for user ID: ${userId}`);
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found'
                });
            }

            const brandId = brandResult.rows[0].id;
            console.log(`✅ Brand ID found: ${brandId}`);

            // Calculate FIT scores for all retailers
            const result = await FitScoreService.calculateFitScoreForAllRetailers(brandId, selected_categories);

            // Log FIT score calculation
            await auditLogger.log({
                user_id: userId,
                action: 'fit_score_calculated',
                resource_type: 'fit_score',
                resource_id: brandId,
                new_values: { selected_categories, result_count: result.retailers.length },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            console.log(`✅ FIT Score API Response - ${result.retailers.length} retailers processed`);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('❌ FIT score calculation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate FIT scores'
            });
        }
    }
);

// ========================================
// GET FIT SCORES FOR BRAND
// ========================================
router.get('/brand/:brandId',
    requireRole(['brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            const { brandId } = req.params;
            const userId = req.user.id;

            // Verify brand ownership
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
                [brandId, userId]
            );

            if (brandResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found'
                });
            }

            // Get FIT scores for this brand
            const result = await FitScoreService.getFitScoresForBrand(brandId);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Get FIT scores error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get FIT scores'
            });
        }
    }
);

// ========================================
// GET DETAILED FIT SCORE FOR SPECIFIC RETAILER
// ========================================
router.get('/retailer/:retailerId',
    requireRole(['brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            const { retailerId } = req.params;
            const userId = req.user.id;

            // Get brand ID
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE user_id = $1',
                [userId]
            );

            if (brandResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found'
                });
            }

            const brandId = brandResult.rows[0].id;

            // Get detailed FIT score
            const result = await FitScoreService.getDetailedFitScore(brandId, retailerId);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Get detailed FIT score error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get detailed FIT score'
            });
        }
    }
);

// ========================================
// BULK CALCULATE FIT SCORES
// ========================================
router.post('/bulk-calculate',
    requireRole(['brand_admin', 'brand_user']),
    [
        body('brandId').isInt({ min: 1 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { brandId } = req.body;
            const userId = req.user.id;

            // Verify brand ownership
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
                [brandId, userId]
            );

            if (brandResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found'
                });
            }

            // Get brand's selected categories
            const categoriesResult = await db.query(`
                SELECT category, sub_category
                FROM brand_categories
                WHERE brand_id = $1
            `, [brandId]);

            if (categoriesResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No categories selected for this brand'
                });
            }

            // Group categories
            const selectedCategories = {};
            categoriesResult.rows.forEach(row => {
                if (!selectedCategories[row.category]) {
                    selectedCategories[row.category] = [];
                }
                selectedCategories[row.category].push(row.sub_category);
            });

            // Convert to array format
            const categoriesArray = Object.keys(selectedCategories).map(category => ({
                category,
                sub_categories: selectedCategories[category]
            }));

            // Calculate FIT scores for all retailers
            const result = await FitScoreService.calculateFitScoreForAllRetailers(brandId, categoriesArray);

            // Log bulk calculation
            await auditLogger.log({
                user_id: userId,
                action: 'bulk_fit_score_calculated',
                resource_type: 'fit_score',
                resource_id: brandId,
                new_values: { result_count: result.retailers.length },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Bulk FIT score calculation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate bulk FIT scores'
            });
        }
    }
);

// ========================================
// GET FIT SCORE HISTORY
// ========================================
router.get('/history',
    requireRole(['brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            // Get brand ID from user
            const brandResult = await db.query(`
                SELECT b.id FROM brands b WHERE b.user_id = $1
            `, [req.user.id]);

            if (brandResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand profile not found'
                });
            }

            const brandId = brandResult.rows[0].id;

            // Get FIT score history from audit logs
            const historyResult = await db.query(`
                SELECT 
                    al.created_at,
                    al.new_values->>'retailerId' as retailer_id,
                    al.new_values->>'score' as score,
                    r.retailer_name
                FROM audit_logs al
                LEFT JOIN retailers r ON (al.new_values->>'retailerId')::int = r.id
                WHERE al.user_id = $1 
                AND al.action = 'fit_score_calculated'
                ORDER BY al.created_at DESC
                LIMIT 50
            `, [req.user.id]);

            res.json({
                success: true,
                data: historyResult.rows
            });

        } catch (error) {
            console.error('FIT score history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch FIT score history'
            });
        }
    }
);

module.exports = router;