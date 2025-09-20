const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { sessionAuth } = require('../middleware/sessionAuth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========================================
// BRAND PRODUCTS ENDPOINTS
// ========================================

// GET BRAND PRODUCTS
// ========================================
router.get('/products',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            // Get user's brand ID
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

            // Get brand products
            const result = await db.query(`
                SELECT 
                    id,
                    product_name,
                    category,
                    sub_category,
                    mrp,
                    asp,
                    quantity,
                    uom,
                    trade_margin,
                    created_at,
                    updated_at
                FROM brand_products 
                WHERE brand_id = $1
                ORDER BY created_at DESC
            `, [brandId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Get brand products error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch brand products'
            });
        }
    }
);

// CREATE BRAND PRODUCT
// ========================================
router.post('/products',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    [
        body('product_name').notEmpty().trim(),
        body('category').notEmpty().trim(),
        body('sub_category').notEmpty().trim(),
        body('mrp').isNumeric().isFloat({ min: 0 }),
        body('asp').isNumeric().isFloat({ min: 0 }),
        body('quantity').isInt({ min: 1 }),
        body('uom').optional().trim(),
        body('trade_margin').isNumeric().isFloat({ min: 0, max: 100 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const {
                product_name,
                category,
                sub_category,
                mrp,
                asp,
                quantity,
                uom,
                trade_margin
            } = req.body;

            // Get user's brand ID
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

            // Create brand product
            const result = await db.query(`
                INSERT INTO brand_products (
                    brand_id, product_name, category, sub_category, 
                    mrp, asp, quantity, uom, trade_margin
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [brandId, product_name, category, sub_category, mrp, asp, quantity, uom, trade_margin]);

            // Log product creation
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_product_created',
                resource_type: 'brand_product',
                resource_id: result.rows[0].id,
                new_values: { product_name, category, sub_category },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Create brand product error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create product'
            });
        }
    }
);

// UPDATE BRAND PRODUCT
// ========================================
router.put('/products/:id',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    [
        body('product_name').optional().trim(),
        body('category').optional().trim(),
        body('sub_category').optional().trim(),
        body('mrp').optional().isNumeric().isFloat({ min: 0 }),
        body('asp').optional().isNumeric().isFloat({ min: 0 }),
        body('quantity').optional().isInt({ min: 1 }),
        body('uom').optional().trim(),
        body('trade_margin').optional().isNumeric().isFloat({ min: 0, max: 100 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const productId = req.params.id;
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            // Build dynamic update query
            const allowedFields = ['product_name', 'category', 'sub_category', 'mrp', 'asp', 'quantity', 'uom', 'trade_margin'];
            
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex}`);
                    values.push(req.body[field]);
                    paramIndex++;
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid fields to update'
                });
            }

            // Add updated_at and product ID
            updateFields.push(`updated_at = NOW()`);
            values.push(productId);

            // Get user's brand ID for verification
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

            // Update product (with brand ownership check)
            const result = await db.query(`
                UPDATE brand_products 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex} AND brand_id = $${paramIndex + 1}
                RETURNING *
            `, [...values, brandId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found or access denied'
                });
            }

            // Log product update
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_product_updated',
                resource_type: 'brand_product',
                resource_id: productId,
                new_values: req.body,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Update brand product error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update product'
            });
        }
    }
);

// DELETE BRAND PRODUCT
// ========================================
router.delete('/products/:id',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    async (req, res) => {
        try {
            const productId = req.params.id;

            // Get user's brand ID for verification
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

            // Delete product (with brand ownership check)
            const result = await db.query(`
                DELETE FROM brand_products 
                WHERE id = $1 AND brand_id = $2
                RETURNING *
            `, [productId, brandId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found or access denied'
                });
            }

            // Log product deletion
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_product_deleted',
                resource_type: 'brand_product',
                resource_id: productId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });

        } catch (error) {
            console.error('Delete brand product error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete product'
            });
        }
    }
);

// UPLOAD EXCEL FILE
// ========================================
router.post('/upload-excel',
    sessionAuth,
    requireRole(['brand_admin', 'brand_user']),
    upload.single('excelFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            // Get user's brand ID
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

            // Read Excel file
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);

            if (data.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Excel file is empty'
                });
            }

                // Debug: Log the first row to see actual column names
                console.log('📊 Excel file structure:');
                console.log('First row keys:', Object.keys(data[0] || {}));
                console.log('First row data:', data[0]);

                // Process product data template (8 columns format)
                console.log('📦 Processing product data template...');
                
                let products = [];
                let errors = [];

                data.forEach((row, index) => {
                    const rowNum = index + 2; // Excel row number (accounting for header)

                    // Get values from the 8 columns
                    const productName = row['PRODUCT NAME'];
                    const category = row['CATEGORY'];
                    const subCategory = row['SUB CATEGORY'];
                    const mrp = row['MRP'];
                    const asp = row['ASP'];
                    const quantity = row['QUANTITY'];
                    const uom = row['UOM'];
                    const tradeMargin = row['TRADE MARGIN'];

                    // Validate required fields
                    if (!productName || !category || !subCategory || !mrp || !asp || !quantity || !tradeMargin) {
                        errors.push(`Row ${rowNum}: Missing required fields (found: ${Object.keys(row).join(', ')})`);
                        return;
                    }

                    // Validate numeric fields
                    if (isNaN(mrp) || isNaN(asp) || isNaN(quantity) || isNaN(tradeMargin)) {
                        errors.push(`Row ${rowNum}: Invalid numeric values`);
                        return;
                    }

                    products.push({
                        brand_id: brandId,
                        product_name: productName.toString().trim(),
                        category: category.toString().trim(),
                        sub_category: subCategory.toString().trim(),
                        mrp: parseFloat(mrp),
                        asp: parseFloat(asp),
                        quantity: parseInt(quantity),
                        uom: uom ? uom.toString().trim() : null,
                        trade_margin: parseFloat(tradeMargin)
                    });
                });

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation errors found',
                    details: errors
                });
            }

            // Insert products in batch
            const insertedProducts = [];
            for (const product of products) {
                const result = await db.query(`
                    INSERT INTO brand_products (
                        brand_id, product_name, category, sub_category, 
                        mrp, asp, quantity, uom, trade_margin
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `, [
                    product.brand_id, product.product_name, product.category, product.sub_category,
                    product.mrp, product.asp, product.quantity, product.uom, product.trade_margin
                ]);
                insertedProducts.push(result.rows[0]);
            }

            // Log Excel upload
            await auditLogger.log({
                user_id: req.user.id,
                action: 'brand_products_excel_uploaded',
                resource_type: 'brand_product',
                resource_id: brandId,
                new_values: { 
                    file_name: req.file.originalname,
                    products_count: insertedProducts.length 
                },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: `Successfully uploaded ${insertedProducts.length} products`,
                data: insertedProducts
            });

        } catch (error) {
            console.error('Excel upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process Excel file'
            });
        }
    }
);

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
