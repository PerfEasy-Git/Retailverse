const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { sessionAuth } = require('../middleware/sessionAuth');

// ========================================
// DISCOVERY ENDPOINTS
// ========================================

// GET DISCOVERY BRANDS
// ========================================
router.get('/brands',
    sessionAuth,
    requireRole(['admin', 'brand_admin', 'brand_user', 'retailer_admin', 'retailer_user']),
    async (req, res) => {
        try {
            const { category, region, format, search } = req.query;
            
            let query = `
                SELECT DISTINCT
                    b.id,
                    b.brand_name as name,
                    b.official_email as email,
                    b.website_url as website,
                    b.contact_number as phone,
                    b.annual_turnover,
                    b.avg_trade_margin,
                    b.created_at,
                    STRING_AGG(DISTINCT bc.category, ', ') as categories
                FROM brands b
                LEFT JOIN brand_categories bc ON b.id = bc.brand_id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 0;
            
            if (category) {
                paramCount++;
                query += ` AND bc.category = $${paramCount}`;
                params.push(category);
            }
            
            if (search) {
                paramCount++;
                query += ` AND b.brand_name ILIKE $${paramCount}`;
                params.push(`%${search}%`);
            }
            
            query += ` GROUP BY b.id, b.brand_name, b.official_email, b.website_url, b.contact_number, b.annual_turnover, b.avg_trade_margin, b.created_at`;
            query += ` ORDER BY b.created_at DESC`;
            
            const result = await db.query(query, params);
            
            res.json({
                success: true,
                data: result.rows
            });
            
        } catch (error) {
            console.error('Discovery brands error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch brands'
            });
        }
    }
);

// GET DISCOVERY RETAILERS
// ========================================
router.get('/retailers',
    sessionAuth,
    requireRole(['admin', 'brand_admin', 'brand_user', 'retailer_admin', 'retailer_user']),
    async (req, res) => {
        try {
            const { category, region, format, search } = req.query;
            
            let query = `
                SELECT DISTINCT
                    r.id,
                    r.retailer_name as name,
                    r.retailer_category as category,
                    r.retailer_format as format,
                    r.created_at,
                    COUNT(DISTINCT rp.product_id) as product_count
                FROM retailers r
                LEFT JOIN retailer_product_mappings rp ON r.id = rp.retailer_id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 0;
            
            if (category) {
                paramCount++;
                query += ` AND r.retailer_category = $${paramCount}`;
                params.push(category);
            }
            
            if (format) {
                paramCount++;
                query += ` AND r.retailer_format ILIKE $${paramCount}`;
                params.push(`%${format}%`);
            }
            
            if (search) {
                paramCount++;
                query += ` AND r.retailer_name ILIKE $${paramCount}`;
                params.push(`%${search}%`);
            }
            
            query += ` GROUP BY r.id, r.retailer_name, r.retailer_category, r.retailer_format, r.created_at`;
            query += ` ORDER BY r.created_at DESC`;
            
            const result = await db.query(query, params);
            
            res.json({
                success: true,
                data: result.rows
            });
            
        } catch (error) {
            console.error('Discovery retailers error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch retailers'
            });
        }
    }
);

// GET TRENDING DATA
// ========================================
router.get('/trending',
    sessionAuth,
    requireRole(['admin', 'brand_admin', 'brand_user', 'retailer_admin', 'retailer_user']),
    async (req, res) => {
        try {
            // Get recent brands
            const recentBrands = await db.query(`
                SELECT 
                    b.id,
                    b.brand_name as name,
                    b.website_url as website,
                    b.created_at
                FROM brands b
                ORDER BY b.created_at DESC
                LIMIT 5
            `);
            
            // Get recent retailers
            const recentRetailers = await db.query(`
                SELECT 
                    r.id,
                    r.retailer_name as name,
                    r.retailer_category as category,
                    r.created_at
                FROM retailers r
                ORDER BY r.created_at DESC
                LIMIT 5
            `);
            
            // Get category insights
            const categoryInsights = await db.query(`
                SELECT 
                    bc.category,
                    COUNT(DISTINCT bc.brand_id) as brand_count
                FROM brand_categories bc
                GROUP BY bc.category
                ORDER BY brand_count DESC
                LIMIT 5
            `);
            
            res.json({
                success: true,
                data: {
                    brands: recentBrands.rows,
                    retailers: recentRetailers.rows,
                    insights: categoryInsights.rows.map(insight => 
                        `${insight.category} category has ${insight.brand_count} brands and ${insight.retailer_count} retailers`
                    )
                }
            });
            
        } catch (error) {
            console.error('Discovery trending error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch trending data'
            });
        }
    }
);

module.exports = router;
