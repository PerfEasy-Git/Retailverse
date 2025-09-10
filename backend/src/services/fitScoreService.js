const { db } = require('../database/connection');

class FitScoreService {
    // ========================================
    // CALCULATE FIT SCORE FOR ALL RETAILERS
    // ========================================
    static async calculateFitScoreForAllRetailers(brandId, selectedCategories) {
        try {
            console.log(`🔍 FIT Score Calculation Started for Brand ID: ${brandId}`);
            console.log(`📊 Selected Categories:`, JSON.stringify(selectedCategories, null, 2));

            // Get brand data
            const brandResult = await db.query(`
                SELECT 
                    b.*,
                    STRING_AGG(bc.category, ',') as selected_categories,
                    STRING_AGG(bc.sub_category, ',') as selected_subcategories
                FROM brands b
                LEFT JOIN brand_categories bc ON b.id = bc.brand_id
                WHERE b.id = $1
                GROUP BY b.id
            `, [brandId]);

            if (brandResult.rows.length === 0) {
                console.error(`❌ Brand not found for ID: ${brandId}`);
                throw new Error('Brand not found');
            }

            const brandData = brandResult.rows[0];
            console.log(`✅ Brand found: ${brandData.brand_name}`);
            console.log(`💰 Brand Trade Margin: ${brandData.avg_trade_margin}`);

            // Get all retailers with their product data
            const retailersResult = await db.query(`
                SELECT 
                    r.*,
                    STRING_AGG(DISTINCT p.category, ',') as product_categories,
                    STRING_AGG(DISTINCT p.sub_category, ',') as product_subcategories,
                    AVG(rpm.avg_selling_price) as avg_asp,
                    AVG(rpm.retailer_margin) as avg_margin,
                    COUNT(DISTINCT p.id) as product_count
                FROM retailers r
                LEFT JOIN retailer_product_mappings rpm ON r.id = rpm.retailer_id
                LEFT JOIN products p ON rpm.product_id = p.id
                GROUP BY r.id
                ORDER BY r.retailer_name
            `);

            console.log(`🏪 Found ${retailersResult.rows.length} retailers to analyze`);

            const retailers = [];
            let highPriority = 0;
            let mediumPriority = 0;
            let lowPriority = 0;

            for (const retailer of retailersResult.rows) {
                const fitScore = this.calculateFitScore(brandData, retailer, selectedCategories);
                
                console.log(`📈 ${retailer.retailer_name}: FIT Score = ${fitScore.overallScore} (${fitScore.recommendation.priority})`);
                console.log(`   └─ Category: ${fitScore.categoryScore}%, Subcategory: ${fitScore.subcategoryScore}%, Margin: ${fitScore.marginScore}%, ASP: ${fitScore.aspScore}%`);
                
                retailers.push({
                    retailer_id: retailer.id,
                    retailer_name: retailer.retailer_name,
                    retailer_category: retailer.retailer_category,
                    retailer_format: retailer.retailer_format,
                    outlet_count: retailer.outlet_count,
                    fit_score: fitScore.overallScore,
                    recommendation: fitScore.recommendation,
                    score_breakdown: {
                        category_score: fitScore.categoryScore,
                        subcategory_score: fitScore.subcategoryScore,
                        margin_score: fitScore.marginScore,
                        asp_score: fitScore.aspScore
                    }
                });

                // Count priorities
                if (fitScore.overallScore >= 80) highPriority++;
                else if (fitScore.overallScore >= 60) mediumPriority++;
                else lowPriority++;
            }

            const summary = {
                total_retailers: retailers.length,
                high_priority: highPriority,
                medium_priority: mediumPriority,
                low_priority: lowPriority
            };

            console.log(`🎯 FIT Score Calculation Complete!`);
            console.log(`📊 Summary: ${summary.total_retailers} retailers analyzed`);
            console.log(`   └─ High Priority: ${summary.high_priority}, Medium: ${summary.medium_priority}, Low: ${summary.low_priority}`);

            return {
                retailers,
                calculation_summary: summary
            };

        } catch (error) {
            console.error('❌ FIT Score calculation error:', error);
            throw error;
        }
    }

    // ========================================
    // CALCULATE FIT SCORE FOR SINGLE RETAILER
    // ========================================
    static async calculateFitScore(brandId, retailerId) {
        try {
            // Get brand data
            const brandResult = await db.query(`
                SELECT 
                    b.*,
                    STRING_AGG(bc.category, ',') as selected_categories,
                    STRING_AGG(bc.sub_category, ',') as selected_subcategories
                FROM brands b
                LEFT JOIN brand_categories bc ON b.id = bc.brand_id
                WHERE b.id = $1
                GROUP BY b.id
            `, [brandId]);

            if (brandResult.rows.length === 0) {
                throw new Error('Brand not found');
            }

            const brandData = brandResult.rows[0];

            // Get retailer data
            const retailerResult = await db.query(`
                SELECT 
                    r.*,
                    STRING_AGG(DISTINCT p.category, ',') as product_categories,
                    STRING_AGG(DISTINCT p.sub_category, ',') as product_subcategories,
                    AVG(rpm.avg_selling_price) as avg_asp,
                    AVG(rpm.retailer_margin) as avg_margin
                FROM retailers r
                LEFT JOIN retailer_product_mappings rpm ON r.id = rpm.retailer_id
                LEFT JOIN products p ON rpm.product_id = p.id
                WHERE r.id = $1
                GROUP BY r.id
            `, [retailerId]);

            if (retailerResult.rows.length === 0) {
                throw new Error('Retailer not found');
            }

            const retailerData = retailerResult.rows[0];

            // Convert selected categories to array format
            const selectedCategories = [];
            if (brandData.selected_categories) {
                const categories = brandData.selected_categories.split(',');
                const subcategories = brandData.selected_subcategories.split(',');
                
                const categoryMap = {};
                categories.forEach((cat, index) => {
                    if (!categoryMap[cat]) {
                        categoryMap[cat] = [];
                    }
                    if (subcategories[index]) {
                        categoryMap[cat].push(subcategories[index]);
                    }
                });

                Object.keys(categoryMap).forEach(category => {
                    selectedCategories.push({
                        category,
                        sub_categories: categoryMap[category]
                    });
                });
            }

            return this.calculateFitScore(brandData, retailerData, selectedCategories);

        } catch (error) {
            console.error('FIT Score calculation error:', error);
            throw error;
        }
    }

    // ========================================
    // CORE FIT SCORE CALCULATION
    // ========================================
    static calculateFitScore(brandData, retailerData, selectedCategories) {
        // Extract brand's selected categories and subcategories
        const brandCategories = selectedCategories.map(cat => cat.category);
        const brandSubcategories = selectedCategories.flatMap(cat => cat.sub_categories);
        
        // Get retailer's product categories and subcategories
        const retailerProductCategories = retailerData.product_categories ? 
            retailerData.product_categories.split(',').map(cat => cat.trim()) : [];
        const retailerProductSubcategories = retailerData.product_subcategories ? 
            retailerData.product_subcategories.split(',').map(subcat => subcat.trim()) : [];
        
        // Calculate individual scores
        const categoryScore = this.calculateCategoryScore(brandCategories, retailerProductCategories);
        const subcategoryScore = this.calculateSubcategoryScore(brandSubcategories, retailerProductSubcategories);
        const marginScore = this.calculateMarginScore(brandData.avg_trade_margin, retailerData.avg_margin);
        const aspScore = this.calculateASPScore(brandData.avg_trade_margin, retailerData.avg_asp);

        // Overall Score
        const overallScore = (categoryScore * 0.3) + (subcategoryScore * 0.3) + 
                            (marginScore * 0.1) + (aspScore * 0.3);

        return {
            overallScore: Math.round(overallScore),
            categoryScore: Math.round(categoryScore),
            subcategoryScore: Math.round(subcategoryScore),
            marginScore: Math.round(marginScore),
            aspScore: Math.round(aspScore),
            recommendation: this.getRecommendation(overallScore)
        };
    }

    // ========================================
    // CATEGORY MATCH CALCULATION (30% Weight)
    // ========================================
    static calculateCategoryScore(brandCategories, retailerCategories) {
        if (brandCategories.length === 0 || retailerCategories.length === 0) return 0;
        
        const matches = brandCategories.filter(cat => 
            retailerCategories.some(retCat => retCat.trim() === cat.trim())
        );
        
        return (matches.length / brandCategories.length) * 100;
    }

    // ========================================
    // SUBCATEGORY MATCH CALCULATION (30% Weight)
    // ========================================
    static calculateSubcategoryScore(brandSubcategories, retailerSubcategories) {
        if (brandSubcategories.length === 0 || retailerSubcategories.length === 0) return 0;
        
        const matches = brandSubcategories.filter(subcat => 
            retailerSubcategories.some(retSubcat => retSubcat.trim() === subcat.trim())
        );
        
        return (matches.length / brandSubcategories.length) * 100;
    }

    // ========================================
    // TRADE MARGIN MATCH CALCULATION (10% Weight)
    // ========================================
    static calculateMarginScore(brandMargin, retailerMargin) {
        if (!brandMargin || !retailerMargin) return 0;
        
        const brandMarginNum = parseFloat(brandMargin.replace(/[^\d.]/g, ''));
        const retailerMarginNum = parseFloat(retailerMargin);
        
        if (isNaN(brandMarginNum) || isNaN(retailerMarginNum)) return 0;
        
        if (brandMarginNum >= retailerMarginNum) {
            return 100; // Full points if brand margin is higher or equal
        } else {
            return (brandMarginNum / retailerMarginNum) * 100; // Partial points
        }
    }

    // ========================================
    // ASP MATCH CALCULATION (30% Weight)
    // ========================================
    static calculateASPScore(brandMargin, retailerASP) {
        if (!brandMargin || !retailerASP) return 0;
        
        const brandMarginNum = parseFloat(brandMargin.replace(/[^\d.]/g, ''));
        const aspNum = parseFloat(retailerASP);
        
        if (isNaN(brandMarginNum) || isNaN(aspNum)) return 0;
        
        // Calculate ASP compatibility score
        const difference = Math.abs(brandMarginNum - aspNum);
        const threshold = aspNum * 0.15; // ±15% threshold
        
        if (difference <= threshold) {
            return 100; // Full points within threshold
        } else {
            // Calculate penalty based on how far outside threshold
            const penalty = (difference - threshold) / aspNum;
            return Math.max(0, 100 - (penalty * 100));
        }
    }

    // ========================================
    // RECOMMENDATION SYSTEM
    // ========================================
    static getRecommendation(overallScore) {
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

    // ========================================
    // GET FIT SCORES FOR BRAND
    // ========================================
    static async getFitScoresForBrand(brandId) {
        try {
            const result = await db.query(`
                SELECT 
                    r.id as retailer_id,
                    r.retailer_name,
                    r.retailer_category,
                    r.retailer_format,
                    r.outlet_count,
                    -- This would be calculated FIT scores stored in a table
                    -- For now, return basic retailer info
                    0 as fit_score,
                    'Not Calculated' as recommendation
                FROM retailers r
                ORDER BY r.retailer_name
            `);

            return {
                fitScores: result.rows,
                gtmPlan: result.rows.map(row => ({
                    retailer_id: row.retailer_id,
                    retailer_name: row.retailer_name,
                    gtmRecommendation: {
                        action: row.recommendation,
                        priority: 'Not Calculated'
                    }
                }))
            };

        } catch (error) {
            console.error('Get FIT scores for brand error:', error);
            throw error;
        }
    }

    // ========================================
    // GET DETAILED FIT SCORE
    // ========================================
    static async getDetailedFitScore(brandId, retailerId) {
        try {
            const fitScore = await this.calculateFitScore(brandId, retailerId);
            
            // Get retailer details
            const retailerResult = await db.query(`
                SELECT r.*, rl.city, rl.state
                FROM retailers r
                LEFT JOIN retailer_locations rl ON r.id = rl.retailer_id
                WHERE r.id = $1
            `, [retailerId]);

            const retailer = retailerResult.rows[0];

            // Get retailer's products
            const productsResult = await db.query(`
                SELECT 
                    p.*,
                    rpm.avg_selling_price,
                    rpm.annual_sale,
                    rpm.retailer_margin
                FROM products p
                JOIN retailer_product_mappings rpm ON p.id = rpm.product_id
                WHERE rpm.retailer_id = $1
                ORDER BY p.product_description
            `, [retailerId]);

            return {
                retailer: {
                    id: retailer.id,
                    name: retailer.retailer_name,
                    category: retailer.retailer_category,
                    format: retailer.retailer_format,
                    outlet_count: retailer.outlet_count,
                    locations: retailerResult.rows.map(row => ({
                        city: row.city,
                        state: row.state
                    }))
                },
                fit_score: fitScore.overallScore,
                recommendation: fitScore.recommendation,
                score_breakdown: {
                    category_score: fitScore.categoryScore,
                    subcategory_score: fitScore.subcategoryScore,
                    margin_score: fitScore.marginScore,
                    asp_score: fitScore.aspScore
                },
                products: productsResult.rows.map(product => ({
                    product_id: product.product_id,
                    product_name: product.product_description,
                    mrp: product.mrp,
                    asp: product.avg_selling_price,
                    margin: product.retailer_margin
                }))
            };

        } catch (error) {
            console.error('Get detailed FIT score error:', error);
            throw error;
        }
    }
}

module.exports = FitScoreService;