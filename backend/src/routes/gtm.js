const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { sessionAuth } = require('../middleware/sessionAuth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');

// ========================================
// GTM STRATEGY ENDPOINTS
// ========================================

// GENERATE GTM STRATEGY
// ========================================
router.post('/generate-strategy',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    [
        body('preferences.paymentTerm').isIn(['OUTRIGHT', 'CREDIT', 'CONSIGNMENT']),
        body('preferences.businessModel').isIn(['B2C', 'B2B', 'B2B2C']),
        body('preferences.nmtRmt').isIn(['NMT', 'RMT', 'HYBRID']),
        body('fitScoreResults').isObject(),
        body('fitScoreResults.retailers').isArray({ min: 1 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { preferences, fitScoreResults } = req.body;
            const userId = req.user.id;

            console.log('🚀 GTM Strategy Generation Started for User ID:', userId);
            console.log('📊 Preferences:', preferences);
            console.log('📈 FIT Score Results:', fitScoreResults.retailers.length, 'retailers');

            // Get user's brand ID
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

            // Process retailers based on preferences and FIT scores
            const processedRetailers = await processRetailersForGTM(
                fitScoreResults.retailers, 
                preferences, 
                brandId
            );

            // Generate strategy insights
            const strategyInsights = generateStrategyInsights(processedRetailers, preferences);

            // Create GTM strategy result
            const gtmStrategy = {
                preferences,
                retailers: processedRetailers,
                insights: strategyInsights,
                generatedAt: new Date().toISOString(),
                brandId
            };

            // Log GTM strategy generation
            await auditLogger.log({
                user_id: userId,
                action: 'gtm_strategy_generated',
                resource_type: 'gtm_strategy',
                resource_id: brandId,
                new_values: { 
                    preferences,
                    retailers_count: processedRetailers.length,
                    strategy_type: `${preferences.businessModel}_${preferences.paymentTerm}_${preferences.nmtRmt}`
                },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            console.log('✅ GTM Strategy Generated Successfully:', processedRetailers.length, 'retailers processed');

            res.json({
                success: true,
                data: gtmStrategy
            });

        } catch (error) {
            console.error('❌ GTM Strategy Generation Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate GTM strategy'
            });
        }
    }
);

// Helper function to process retailers for GTM strategy
async function processRetailersForGTM(retailers, preferences, brandId) {
    const processedRetailers = [];

    for (const retailer of retailers) {
        try {
            // Get detailed retailer information
            const retailerResult = await db.query(`
                SELECT 
                    r.*,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM retailers r
                JOIN users u ON r.user_id = u.id
                WHERE r.id = $1
            `, [retailer.retailer_id]);

            if (retailerResult.rows.length === 0) {
                continue;
            }

            const retailerData = retailerResult.rows[0];

            // Calculate GTM match score based on preferences
            const gtmMatchScore = calculateGTMMatchScore(retailerData, preferences, retailer.fit_score);

            // Get market data
            const marketData = await getMarketData(retailer.retailer_id);

            processedRetailers.push({
                id: retailer.retailer_id,
                name: retailer.retailer_name,
                logo: retailerData.logo_url || "/api/placeholder/60/60",
                matchScore: gtmMatchScore,
                fitScore: retailer.fit_score,
                marketSize: marketData.marketSize,
                storeCount: retailerData.outlet_count || 0,
                businessModel: retailerData.retailer_sale_model,
                paymentTerm: retailerData.purchase_model,
                format: retailerData.retailer_format,
                contactPerson: `${retailerData.first_name || ''} ${retailerData.last_name || ''}`.trim() || "Contact Person",
                email: retailerData.email,
                preferences: {
                    paymentTerm: preferences.paymentTerm,
                    businessModel: preferences.businessModel,
                    nmtRmt: preferences.nmtRmt
                }
            });

        } catch (error) {
            console.error(`❌ Error processing retailer ${retailer.retailer_id}:`, error);
            continue;
        }
    }

    // Sort by GTM match score (highest first)
    return processedRetailers.sort((a, b) => b.matchScore - a.matchScore);
}

// Calculate GTM match score based on preferences
function calculateGTMMatchScore(retailerData, preferences, fitScore) {
    let gtmScore = fitScore; // Start with FIT score as base

    // Adjust based on payment term preference
    if (preferences.paymentTerm === 'OUTRIGHT' && retailerData.purchase_model === 'OUTRIGHT') {
        gtmScore += 10;
    } else if (preferences.paymentTerm === 'CREDIT' && retailerData.purchase_model === 'CREDIT') {
        gtmScore += 10;
    } else if (preferences.paymentTerm === 'CONSIGNMENT' && retailerData.purchase_model === 'CONSIGNMENT') {
        gtmScore += 10;
    }

    // Adjust based on business model preference
    if (preferences.businessModel === 'B2C' && retailerData.retailer_sale_model === 'B2C') {
        gtmScore += 5;
    } else if (preferences.businessModel === 'B2B' && retailerData.retailer_sale_model === 'B2B') {
        gtmScore += 5;
    }

    // Adjust based on NMT/RMT preference
    if (preferences.nmtRmt === 'NMT' && retailerData.retailer_format === 'NMT') {
        gtmScore += 5;
    } else if (preferences.nmtRmt === 'RMT' && retailerData.retailer_format === 'RMT') {
        gtmScore += 5;
    }

    // Cap at 100%
    return Math.min(gtmScore, 100);
}

// Get market data for retailer
async function getMarketData(retailerId) {
    try {
        const marketResult = await db.query(`
            SELECT 
                SUM(rpm.annual_sale * rpm.avg_selling_price) as total_market_size,
                COUNT(DISTINCT p.category) as category_count
            FROM retailer_product_mappings rpm
            JOIN products p ON rpm.product_id = p.id
            WHERE rpm.retailer_id = $1
        `, [retailerId]);

        let marketSize = 0;
        if (marketResult.rows.length > 0 && marketResult.rows[0].total_market_size) {
            // Convert to crores (divide by 10,000,000)
            marketSize = (marketResult.rows[0].total_market_size / 10000000).toFixed(1);
        }

        return {
            marketSize: `${marketSize}Cr`,
            categoryCount: marketResult.rows[0]?.category_count || 0
        };
    } catch (error) {
        console.error('Error getting market data:', error);
        return {
            marketSize: '0.0Cr',
            categoryCount: 0
        };
    }
}

// Generate strategy insights
function generateStrategyInsights(retailers, preferences) {
    const totalRetailers = retailers.length;
    const highMatchRetailers = retailers.filter(r => r.matchScore >= 80).length;
    const mediumMatchRetailers = retailers.filter(r => r.matchScore >= 60 && r.matchScore < 80).length;
    const lowMatchRetailers = retailers.filter(r => r.matchScore < 60).length;

    const totalStores = retailers.reduce((sum, r) => sum + r.storeCount, 0);
    const avgMatchScore = retailers.reduce((sum, r) => sum + r.matchScore, 0) / totalRetailers;

    return {
        summary: {
            totalRetailers,
            highMatchRetailers,
            mediumMatchRetailers,
            lowMatchRetailers,
            totalStores,
            avgMatchScore: Math.round(avgMatchScore)
        },
        recommendations: [
            `Focus on ${highMatchRetailers} high-match retailers (80%+ score) for immediate partnerships`,
            `Consider ${mediumMatchRetailers} medium-match retailers (60-79% score) for expansion`,
            `Evaluate ${lowMatchRetailers} low-match retailers for future opportunities`,
            `Total market reach: ${totalStores.toLocaleString()} stores across ${totalRetailers} retail chains`
        ],
        strategyType: `${preferences.businessModel} ${preferences.paymentTerm} ${preferences.nmtRmt} Strategy`
    };
}

module.exports = router;
