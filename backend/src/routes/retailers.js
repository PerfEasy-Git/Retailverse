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
router.get('/profile', requireRole(['retailer_admin', 'retailer_user']), async (req, res) => {
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
// GET RETAILER DETAILS FOR DISCOVERY PAGE
// ========================================
router.get('/:id/details', async (req, res) => {
    try {
        const { id } = req.params;

        // Get retailer basic info
        const retailerResult = await db.query(`
            SELECT 
                r.id,
                r.retailer_name,
                r.retailer_category,
                r.retailer_format,
                r.retailer_sale_model,
                r.outlet_count,
                r.city_count,
                r.state_count,
                r.purchase_model,
                r.credit_days,
                r.logo_url,
                r.store_images,
                u.first_name,
                u.last_name,
                u.email
            FROM retailers r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = $1
        `, [id]);

        if (retailerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Retailer not found'
            });
        }

        const retailer = retailerResult.rows[0];

        // Get FIT score and market size by calculating it on-the-fly (same logic as Discovery page)
        let fitScore = 0;
        let categorySize = "0.0Cr";
        let categoryPercentage = "0%";
        
        try {
            // Import the FitScoreService to calculate FIT score and market size
            const FitScoreService = require('../services/fitScoreService');
            
            // Get the brand ID for the current user (assuming brand user is viewing retailer details)
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE user_id = $1',
                [req.user.id]
            );
            
            if (brandResult.rows.length > 0) {
                const brandId = brandResult.rows[0].id;
                const fitScoreResult = await FitScoreService.calculateFitScoreForAllRetailers(brandId);
                
                // Find the FIT score and market size for this specific retailer
                const retailerFitScore = fitScoreResult.retailers.find(r => r.retailer_id == id);
                console.log(`🔍 Debug - Looking for retailer ID: ${id}`);
                console.log(`🔍 Debug - Available retailers:`, fitScoreResult.retailers.map(r => ({ id: r.retailer_id, name: r.retailer_name })));
                console.log(`🔍 Debug - Found retailer:`, retailerFitScore);
                
                if (retailerFitScore) {
                    fitScore = retailerFitScore.fit_score;
                    categorySize = retailerFitScore.market_size_display || "0.0Cr";
                    categoryPercentage = retailerFitScore.market_share_display || "0%";
                    console.log(`🔍 Debug - Retailer Details - Market Size: ${categorySize}, Market Share: ${categoryPercentage}`);
                    console.log(`🔍 Debug - Raw market_size_display from backend: "${retailerFitScore.market_size_display}"`);
                    console.log(`🔍 Debug - Final categorySize being sent to frontend: "${categorySize}"`);
                }
            }
            
        } catch (error) {
            console.log('Could not calculate FIT score or market data:', error.message);
            fitScore = 0; // Default to 0 if calculation fails
            categorySize = "0.0Cr";
            categoryPercentage = "0%";
        }

        // Get real subcategory and brand share data from database
        let subCategoryShare = [];
        let brandShare = [];
        
        // Get brand ID for filtering (if brand user is viewing)
        let viewingBrandId = null;
        try {
            const brandResult = await db.query(
                'SELECT id FROM brands WHERE user_id = $1',
                [req.user.id]
            );
            if (brandResult.rows.length > 0) {
                viewingBrandId = brandResult.rows[0].id;
                console.log(`📊 Filtering retailer details for brand ID: ${viewingBrandId}`);
            }
        } catch (error) {
            console.log('No brand context found for user - showing all retailer data');
        }
        
        try {
            // Calculate subcategory distribution - only show matching subcategories with brand
            let subCategoryResult;
            
            if (viewingBrandId) {
                // Filter to show only subcategories that match the brand's products
                subCategoryResult = await db.query(`
                    SELECT 
                        p.sub_category as name,
                        ROUND(
                            (SUM(rpm.annual_sale)::DECIMAL / 
                             NULLIF((SELECT SUM(rpm2.annual_sale)::DECIMAL 
                              FROM retailer_product_mappings rpm2 
                              JOIN products p2 ON rpm2.product_id = p2.id 
                              WHERE rpm2.retailer_id = $1
                                AND p2.sub_category IN (
                                    SELECT DISTINCT sub_category 
                                    FROM brand_products 
                                    WHERE brand_id = $2
                                )), 0)
                            ) * 100, 1
                        ) as percentage
                    FROM retailer_product_mappings rpm
                    JOIN products p ON rpm.product_id = p.id
                    WHERE rpm.retailer_id = $1
                      AND p.sub_category IN (
                          SELECT DISTINCT sub_category 
                          FROM brand_products 
                          WHERE brand_id = $2
                      )
                    GROUP BY p.sub_category
                    HAVING SUM(rpm.annual_sale) > 0
                    ORDER BY percentage DESC
                `, [id, viewingBrandId]);
            } else {
                // Fallback: show all subcategories if no brand context
                subCategoryResult = await db.query(`
                    SELECT 
                        p.sub_category as name,
                        ROUND(
                            (SUM(rpm.annual_sale)::DECIMAL / 
                             (SELECT SUM(annual_sale)::DECIMAL 
                              FROM retailer_product_mappings rpm2 
                              JOIN products p2 ON rpm2.product_id = p2.id 
                              WHERE rpm2.retailer_id = $1)
                            ) * 100, 1
                        ) as percentage
                    FROM retailer_product_mappings rpm
                    JOIN products p ON rpm.product_id = p.id
                    WHERE rpm.retailer_id = $1
                    GROUP BY p.sub_category
                    HAVING SUM(rpm.annual_sale) > 0
                    ORDER BY percentage DESC
                `, [id]);
            }

            // Add colors to subcategory data
            const subCategoryColors = ["#7C3AED", "#A855F7", "#9333EA", "#C084FC", "#E879F9", "#F0ABFC"];
            subCategoryShare = subCategoryResult.rows.map((row, index) => ({
                name: row.name.toUpperCase(),
                percentage: parseFloat(row.percentage),
                color: subCategoryColors[index % subCategoryColors.length]
            }));
            
            console.log(`📊 Subcategory Share (${viewingBrandId ? 'filtered' : 'all'}):`, 
                subCategoryShare.map(s => `${s.name}: ${s.percentage}%`).join(', '));

            // Calculate brand market share - only show brands in matching categories
            let brandResult;
            
            if (viewingBrandId) {
                // Filter to show only brands that compete in the same categories as viewing brand
                brandResult = await db.query(`
                    SELECT 
                        p.brand_name as name,
                        ROUND(
                            (SUM(rpm.annual_sale)::DECIMAL / 
                             NULLIF((SELECT SUM(rpm2.annual_sale)::DECIMAL 
                              FROM retailer_product_mappings rpm2 
                              JOIN products p2 ON rpm2.product_id = p2.id 
                              WHERE rpm2.retailer_id = $1
                                AND p2.category IN (
                                    SELECT DISTINCT category 
                                    FROM brand_products 
                                    WHERE brand_id = $2
                                )), 0)
                            ) * 100, 1
                        ) as percentage
                    FROM retailer_product_mappings rpm
                    JOIN products p ON rpm.product_id = p.id
                    WHERE rpm.retailer_id = $1
                      AND p.category IN (
                          SELECT DISTINCT category 
                          FROM brand_products 
                          WHERE brand_id = $2
                      )
                    GROUP BY p.brand_name
                    HAVING SUM(rpm.annual_sale) > 0
                    ORDER BY percentage DESC
                    LIMIT 6
                `, [id, viewingBrandId]);
            } else {
                // Fallback: show all brands if no brand context
                brandResult = await db.query(`
                    SELECT 
                        p.brand_name as name,
                        ROUND(
                            (SUM(rpm.annual_sale)::DECIMAL / 
                             (SELECT SUM(annual_sale)::DECIMAL 
                              FROM retailer_product_mappings rpm2 
                              JOIN products p2 ON rpm2.product_id = p2.id 
                              WHERE rpm2.retailer_id = $1)
                            ) * 100, 1
                        ) as percentage
                    FROM retailer_product_mappings rpm
                    JOIN products p ON rpm.product_id = p.id
                    WHERE rpm.retailer_id = $1
                    GROUP BY p.brand_name
                    HAVING SUM(rpm.annual_sale) > 0
                    ORDER BY percentage DESC
                    LIMIT 6
                `, [id]);
            }

            // Add colors to brand data
            const brandColors = ["#F97316", "#FB923C", "#FBBF24", "#D97706", "#F59E0B", "#92400E"];
            brandShare = brandResult.rows.map((row, index) => ({
                name: row.name.toUpperCase(),
                percentage: parseFloat(row.percentage),
                color: brandColors[index % brandColors.length]
            }));
            
            console.log(`📊 Brand Share (${viewingBrandId ? 'filtered' : 'all'}):`, 
                brandShare.map(b => `${b.name}: ${b.percentage}%`).join(', '));

            // Handle case where no data is available
            if (subCategoryShare.length === 0) {
                const noDataMessage = viewingBrandId ? "NO MATCHING SUBCATEGORIES" : "NO DATA AVAILABLE";
                subCategoryShare = [{ name: noDataMessage, percentage: 100, color: "#E5E7EB" }];
            }
            
            if (brandShare.length === 0) {
                const noDataMessage = viewingBrandId ? "NO MATCHING BRANDS" : "NO DATA AVAILABLE";
                brandShare = [{ name: noDataMessage, percentage: 100, color: "#E5E7EB" }];
            }

        } catch (error) {
            console.error('Error calculating pie chart data:', error);
            // Fallback to placeholder data if calculation fails
            subCategoryShare = [
                { name: "DATA UNAVAILABLE", percentage: 100, color: "#E5E7EB" }
            ];
            brandShare = [
                { name: "DATA UNAVAILABLE", percentage: 100, color: "#E5E7EB" }
            ];
        }

        // Parse store images if available
        let inStoreImages = [];
        if (retailer.store_images) {
            try {
                inStoreImages = JSON.parse(retailer.store_images);
            } catch (e) {
                // If parsing fails, use default placeholder
                inStoreImages = ["/api/placeholder/300/200", "/api/placeholder/300/200", "/api/placeholder/300/200", "/api/placeholder/300/200"];
            }
        } else {
            inStoreImages = ["/api/placeholder/300/200", "/api/placeholder/300/200", "/api/placeholder/300/200", "/api/placeholder/300/200"];
        }

        res.json({
            success: true,
            data: {
                id: retailer.id,
                name: retailer.retailer_name,
                logo: retailer.logo_url || "/api/placeholder/60/60",
                chainType: retailer.retailer_format || "NMT",
                storeCount: retailer.outlet_count || 0,
                businessModel: retailer.retailer_sale_model || "B2C",
                format: retailer.retailer_format || "GROCERY",
                paymentTerm: retailer.purchase_model || "OUTRIGHT",
                paymentTime: retailer.credit_days ? `${retailer.credit_days} DAYS` : "21 DAYS",
                statePresence: retailer.state_count || 0,
                cityPresence: retailer.city_count || 0,
                contactPerson: `${retailer.first_name || ''} ${retailer.last_name || ''}`.trim() || "Contact Person",
                email: retailer.email,
                matchScore: fitScore,
                categorySize: categorySize,
                categoryPercentage: categoryPercentage,
                subCategoryShare,
                brandShare,
                inStoreImages
            }
        });

    } catch (error) {
        console.error('Get retailer details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get retailer details'
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
