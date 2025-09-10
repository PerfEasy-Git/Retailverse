const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const { db } = require('../database/connection');
const bcrypt = require('bcryptjs');

class UploadService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
        this.allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
    }

    // ========================================
    // DATA VALIDATION METHODS
    // ========================================

    validateRowData(row, sheetName, rowIndex) {
        const errors = [];
        
        // Check for null/undefined values
        if (!row || row.length === 0) {
            errors.push(`Empty row`);
            return { isValid: false, errors };
        }
        
        // Check if all values in the row are empty/null/undefined
        const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
        if (!hasData) {
            errors.push(`Row contains no data`);
            return { isValid: false, errors };
        }
        
        // Sheet-specific validation
        switch (sheetName) {
            case 'RETAILER_INFO':
                if (!row[0] || !row[1]) {
                    errors.push(`Missing RETAILER_ID or RETAILER_NAME`);
                }
                if (row[0] && typeof row[0] !== 'string') {
                    errors.push(`RETAILER_ID must be a string`);
                }
                break;
            case 'PRODUCT_INFO':
                if (!row[0] || !row[1]) {
                    errors.push(`Missing PRODUCT_ID or BRAND`);
                }
                break;
            case 'RETAILER_PRODUCT_MAPPING':
                if (!row[0] || !row[1]) {
                    errors.push(`Missing RETAILER_ID or PRODUCT_ID`);
                }
                break;
            case 'RETAILER_LOCATION':
                if (!row[0] || !row[1] || !row[2]) {
                    errors.push(`Missing RETAILER_ID, CITY, or STATE`);
                }
                break;
        }
        
        return { isValid: errors.length === 0, errors };
    }

    safeString(value) {
        return value ? String(value).trim() : null;
    }

    safeNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    // ========================================
    // FILE VALIDATION METHODS
    // ========================================

    async validateExcelFile(filePath) {
        try {
            const workbook = xlsx.readFile(filePath);
            const requiredSheets = ['RETAILER_INFO', 'RETAILER_PRODUCT_MAPPING', 'RETAILER_LOCATION', 'PRODUCT_INFO'];
            
            // Check if all required sheets exist
            const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
            if (missingSheets.length > 0) {
                throw new Error(`Missing required sheets: ${missingSheets.join(', ')}`);
            }

            // Validate each sheet structure
            const validationResults = {};
            for (const sheetName of requiredSheets) {
                validationResults[sheetName] = await this.validateSheetStructure(workbook, sheetName);
            }

            return {
                isValid: true,
                validationResults,
                totalSheets: workbook.SheetNames.length
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    async validateSheetStructure(workbook, sheetName) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            return { isValid: false, error: 'Sheet is empty' };
        }

        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);

        // Define expected headers for each sheet
        const expectedHeaders = {
            'RETAILER_INFO': [
                'RETAILER_ID', 'RETAILER_NAME', 'RETAILER_CATEGORY', 'RETAILER_FORMAT',
                'RETAILER_SALE_MODEL', 'RETAILER_OUTLET_COUNT', 'RETAILER_CITY_COUNT',
                'RETAILER_STATE_COUNT', 'RETAILER_PURCAHSE_MODEL', 'RETAILER_CREDIT_DAYS',
                'RETAILER_LOGO_IMG_LINK', 'RETAILER_STORE_IMG_1_LINK', 'RETAILER_STORE_IMG_2_LINK',
                'RETAILER_STORE_IMG_3_LINK', 'RETAILER_STORE_IMG_4_LINK'
            ],
            'RETAILER_PRODUCT_MAPPING': [
                'RETAILER_ID', 'PRODUCT_ID', 'AVG_SELLING_PRICE', 'ANNUAL_SALE', 'RETAILER_MARGIN'
            ],
            'RETAILER_LOCATION': [
                'RETAILER_ID', 'RETAILER_CITY', 'RETAILER_STATE'
            ],
            'PRODUCT_INFO': [
                'PRODUCT_ID', 'Prod-BRAND', 'CATEGORY', 'SUB_CATEGORY', 'PRODUCT_DESCRIPTION',
                'MRP', 'PACK_SIZE', 'UOM', 'VALUE'
            ]
        };

        const expected = expectedHeaders[sheetName];
        if (!expected) {
            return { isValid: false, error: 'Unknown sheet type' };
        }

        // Check if all expected headers are present
        const missingHeaders = expected.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            return { isValid: false, error: `Missing headers: ${missingHeaders.join(', ')}` };
        }

        // Validate data types and constraints
        const dataValidation = await this.validateSheetData(sheetName, dataRows, headers);
        
        return {
            isValid: true,
            rowCount: dataRows.length,
            headerCount: headers.length,
            dataValidation
        };
    }

    async validateSheetData(sheetName, dataRows, headers) {
        const validationErrors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNumber = i + 2; // +2 because we start from row 2 (after header)
            
            // Check for empty required fields
            for (let j = 0; j < headers.length; j++) {
                if (row[j] === undefined || row[j] === null || row[j] === '') {
                    validationErrors.push({
                        row: rowNumber,
                        column: headers[j],
                        error: 'Required field is empty'
                    });
                }
            }

            // Sheet-specific validations
            if (sheetName === 'RETAILER_INFO') {
                const retailerId = row[0];
                if (retailerId && !retailerId.match(/^RT_\d{4}$/)) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'RETAILER_ID',
                        error: 'Invalid format. Expected RT_XXXX'
                    });
                }

                const outletCount = parseInt(row[5]);
                if (isNaN(outletCount) || outletCount < 0) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'RETAILER_OUTLET_COUNT',
                        error: 'Must be a positive integer'
                    });
                }
            }

            if (sheetName === 'PRODUCT_INFO') {
                const productId = row[0];
                if (productId && !productId.match(/^RV_PI_\d{5}$/)) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'PRODUCT_ID',
                        error: 'Invalid format. Expected RV_PI_XXXXX'
                    });
                }

                const mrp = parseFloat(row[5]);
                if (isNaN(mrp) || mrp <= 0) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'MRP',
                        error: 'Must be a positive number'
                    });
                }
            }

            if (sheetName === 'RETAILER_PRODUCT_MAPPING') {
                const asp = parseFloat(row[2]);
                if (isNaN(asp) || asp <= 0) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'AVG_SELLING_PRICE',
                        error: 'Must be a positive number'
                    });
                }

                const margin = parseFloat(row[4]);
                if (isNaN(margin) || margin < 0 || margin > 100) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'RETAILER_MARGIN',
                        error: 'Must be between 0 and 100'
                    });
                }
            }
        }

        return {
            isValid: validationErrors.length === 0,
            errors: validationErrors,
            totalRows: dataRows.length
        };
    }

    // ========================================
    // FILE PROCESSING METHODS
    // ========================================

    async processExcelFile(filePath, uploadId, adminUserId) {
        try {
            // Update upload status to processing
            await this.updateUploadStatus(uploadId, 'processing', null, new Date());

            const workbook = xlsx.readFile(filePath);
            let totalProcessed = 0;
            const processingResults = {};

            // Process each sheet with progress updates
            const sheets = ['RETAILER_INFO', 'RETAILER_PRODUCT_MAPPING', 'RETAILER_LOCATION', 'PRODUCT_INFO'];
            let totalErrors = 0;
            
            for (let i = 0; i < sheets.length; i++) {
                const sheetName = sheets[i];
                const progress = Math.round(((i + 1) / sheets.length) * 100);
                
                // Update progress
                try {
                    await this.updateUploadProgress(uploadId, progress, `Processing ${sheetName}...`);
                    console.log(`📈 Progress updated: ${progress}% - Processing ${sheetName}...`);
                } catch (error) {
                    console.error(`❌ Failed to update progress:`, error.message);
                }
                
                const result = await this.processSheet(workbook, sheetName, adminUserId);
                processingResults[sheetName] = result;
                totalProcessed += result.processed;
                totalErrors += result.errors ? result.errors.length : 0;
                
                console.log(`📊 ${sheetName}: ${result.processed} processed, ${result.errors ? result.errors.length : 0} errors`);
            }

            // Update upload status to completed with detailed results
            try {
                await this.updateUploadStatus(uploadId, 'completed', null, new Date(), totalProcessed, processingResults);
                console.log(`📊 Final status updated with detailed results:`, processingResults);
            } catch (error) {
                console.error(`❌ Failed to update final status:`, error.message);
            }

            return {
                success: true,
                totalProcessed,
                totalErrors,
                processingResults
            };

        } catch (error) {
            // Update upload status to failed
            await this.updateUploadStatus(uploadId, 'failed', error.message, new Date());

            return {
                success: false,
                error: error.message
            };
        }
    }

    async processSheet(workbook, sheetName, adminUserId) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const dataRows = jsonData.slice(1);

        let processed = 0;
        const errors = [];

        try {
            let result;
            switch (sheetName) {
                case 'RETAILER_INFO':
                    result = await this.processRetailerInfo(dataRows, adminUserId);
                    break;
                case 'RETAILER_PRODUCT_MAPPING':
                    result = await this.processRetailerProductMapping(dataRows, adminUserId);
                    break;
                case 'RETAILER_LOCATION':
                    result = await this.processRetailerLocation(dataRows, adminUserId);
                    break;
                case 'PRODUCT_INFO':
                    result = await this.processProductInfo(dataRows, adminUserId);
                    break;
            }
            
            if (result && typeof result === 'object') {
                processed = result.processed || 0;
                if (result.errors && result.errors.length > 0) {
                    errors.push(...result.errors);
                }
            } else {
                processed = result || 0;
            }
        } catch (error) {
            errors.push(error.message);
        }

        return {
            processed,
            errors,
            totalRows: dataRows.length
        };
    }

    async processRetailerInfo(dataRows, adminUserId) {
        let processed = 0;
        let errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // +2 because we skip header row and arrays are 0-indexed
            
            try {
                // Validate row data first
                const validation = this.validateRowData(row, 'RETAILER_INFO', rowIndex);
                if (!validation.isValid) {
                    console.error(`❌ Row ${rowIndex} in RETAILER_INFO: ${validation.errors.join(', ')}`);
                    console.error(`   Data: ${JSON.stringify(row)}`);
                    errors.push(`Row ${rowIndex}: ${validation.errors.join(', ')}`);
                    continue;
                }

                // Create retailer user first (or get existing)
                const retailerId = this.safeString(row[0]);
                const retailerName = this.safeString(row[1]);
                
                if (!retailerId || !retailerName) {
                    console.error(`❌ Row ${rowIndex}: Missing required data`);
                    errors.push(`Row ${rowIndex}: Missing required data`);
                    continue;
                }

                const email = `${retailerId.toLowerCase().replace('_', '')}@retailverse.com`;
                let userResult = await db.query(`
                    SELECT id FROM users WHERE email = $1
                `, [email]);

                let userId;
                if (userResult.rows.length === 0) {
                    // Create new user
                    userResult = await db.query(`
                        INSERT INTO users (email, password, role, company_type, first_name, last_name, is_active, email_verified)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                    `, [
                        email,
                        await bcrypt.hash('defaultpassword123', 12),
                        'retailer_admin',
                        'retailer',
                        row[1].split(' ')[0] || 'Retailer',
                        row[1].split(' ').slice(1).join(' ') || 'User',
                        true,
                        true
                    ]);
                    userId = userResult.rows[0].id;
                } else {
                    // Use existing user
                    userId = userResult.rows[0].id;
                }

                // Create retailer record (or update existing)
                const retailerData = [
                    userId,
                    retailerName,
                    this.safeString(row[2]), // retailer_category
                    this.safeString(row[3]), // retailer_format
                    this.safeString(row[4]), // retailer_sale_model
                    this.safeNumber(row[5]), // outlet_count
                    this.safeNumber(row[6]), // city_count
                    this.safeNumber(row[7]), // state_count
                    this.safeString(row[8]), // purchase_model
                    this.safeNumber(row[9]), // credit_days
                    this.safeString(row[10]), // logo_url
                    JSON.stringify([
                        this.safeString(row[11]),
                        this.safeString(row[12]),
                        this.safeString(row[13]),
                        this.safeString(row[14])
                    ]) // store_images
                ];

                await db.query(`
                    INSERT INTO retailers (user_id, retailer_name, retailer_category, retailer_format, 
                                         retailer_sale_model, outlet_count, city_count, state_count, 
                                         purchase_model, credit_days, logo_url, store_images)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (user_id) DO UPDATE SET
                        retailer_name = EXCLUDED.retailer_name,
                        retailer_category = EXCLUDED.retailer_category,
                        retailer_format = EXCLUDED.retailer_format,
                        retailer_sale_model = EXCLUDED.retailer_sale_model,
                        outlet_count = EXCLUDED.outlet_count,
                        city_count = EXCLUDED.city_count,
                        state_count = EXCLUDED.state_count,
                        purchase_model = EXCLUDED.purchase_model,
                        credit_days = EXCLUDED.credit_days,
                        logo_url = EXCLUDED.logo_url,
                        store_images = EXCLUDED.store_images,
                        updated_at = NOW()
                `, retailerData);

                processed++;
                console.log(`✅ Processed retailer: ${retailerName} (Row ${rowIndex})`);
            } catch (error) {
                console.error(`❌ Error processing retailer at row ${rowIndex}:`, error.message);
                console.error(`   Data: ${JSON.stringify(row)}`);
                errors.push(`Row ${rowIndex}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.log(`⚠️  RETAILER_INFO processing completed with ${errors.length} errors:`);
            errors.forEach(error => console.log(`   - ${error}`));
        }

        return { processed, errors };
    }

    async processProductInfo(dataRows, adminUserId) {
        let processed = 0;
        let errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // +2 because we skip header row and arrays are 0-indexed
            
            try {
                // Validate row data first
                const validation = this.validateRowData(row, 'PRODUCT_INFO', rowIndex);
                if (!validation.isValid) {
                    console.error(`❌ Row ${rowIndex} in PRODUCT_INFO: ${validation.errors.join(', ')}`);
                    console.error(`   Data: ${JSON.stringify(row)}`);
                    errors.push(`Row ${rowIndex}: ${validation.errors.join(', ')}`);
                    continue;
                }

                const productData = [
                    this.safeString(row[1]), // brand_name
                    this.safeString(row[0]), // product_id
                    this.safeString(row[4]), // product_description
                    this.safeString(row[2]), // category
                    this.safeString(row[3]), // sub_category
                    this.safeNumber(row[5]), // mrp
                    this.safeNumber(row[6]), // pack_size
                    this.safeString(row[7]), // uom
                    this.safeNumber(row[8])  // value
                ];

                await db.query(`
                    INSERT INTO products (brand_name, product_id, product_description, category, 
                                        sub_category, mrp, pack_size, uom, value)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (product_id) DO UPDATE SET
                        brand_name = EXCLUDED.brand_name,
                        product_description = EXCLUDED.product_description,
                        category = EXCLUDED.category,
                        sub_category = EXCLUDED.sub_category,
                        mrp = EXCLUDED.mrp,
                        pack_size = EXCLUDED.pack_size,
                        uom = EXCLUDED.uom,
                        value = EXCLUDED.value
                `, productData);

                processed++;
                console.log(`✅ Processed product: ${productData[1]} (Row ${rowIndex})`);
            } catch (error) {
                console.error(`❌ Error processing product at row ${rowIndex}:`, error.message);
                console.error(`   Data: ${JSON.stringify(row)}`);
                errors.push(`Row ${rowIndex}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.log(`⚠️  PRODUCT_INFO processing completed with ${errors.length} errors:`);
            errors.forEach(error => console.log(`   - ${error}`));
        }

        return { processed, errors };
    }

    async processRetailerProductMapping(dataRows, adminUserId) {
        let processed = 0;
        let errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // +2 because we skip header row and arrays are 0-indexed
            
            try {
                // Validate row data first
                const validation = this.validateRowData(row, 'RETAILER_PRODUCT_MAPPING', rowIndex);
                if (!validation.isValid) {
                    console.error(`❌ Row ${rowIndex} in RETAILER_PRODUCT_MAPPING: ${validation.errors.join(', ')}`);
                    console.error(`   Data: ${JSON.stringify(row)}`);
                    errors.push(`Row ${rowIndex}: ${validation.errors.join(', ')}`);
                    continue;
                }

                const retailerId = this.safeString(row[0]);
                const productId = this.safeString(row[1]);
                const avgSellingPrice = this.safeNumber(row[2]);
                const annualSale = this.safeNumber(row[3]);
                const retailerMargin = this.safeNumber(row[4]);
                
                if (!retailerId || !productId || !avgSellingPrice || !annualSale || !retailerMargin) {
                    console.error(`❌ Row ${rowIndex}: Missing required data`);
                    errors.push(`Row ${rowIndex}: Missing required data`);
                    continue;
                }

                // Get retailer ID
                const retailerResult = await db.query(`
                    SELECT r.id FROM retailers r
                    JOIN users u ON r.user_id = u.id
                    WHERE u.email LIKE $1
                `, [`%${retailerId.toLowerCase().replace('_', '')}%`]);

                // Get product ID
                const productResult = await db.query(`
                    SELECT id FROM products WHERE product_id = $1
                `, [productId]);

                if (retailerResult.rows.length > 0 && productResult.rows.length > 0) {
                    const retailerDbId = retailerResult.rows[0].id;
                    const productDbId = productResult.rows[0].id;
                    
                    await db.query(`
                        INSERT INTO retailer_product_mappings (retailer_id, product_id, avg_selling_price, annual_sale, retailer_margin)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (retailer_id, product_id) DO UPDATE SET
                            avg_selling_price = EXCLUDED.avg_selling_price,
                            annual_sale = EXCLUDED.annual_sale,
                            retailer_margin = EXCLUDED.retailer_margin
                    `, [retailerDbId, productDbId, avgSellingPrice, Math.round(annualSale), retailerMargin]);

                    processed++;
                    console.log(`✅ Processed mapping: ${retailerId} -> ${productId} (Row ${rowIndex})`);
                } else {
                    if (retailerResult.rows.length === 0) {
                        console.error(`❌ Row ${rowIndex}: Retailer ${retailerId} not found in database`);
                        errors.push(`Row ${rowIndex}: Retailer ${retailerId} not found in database`);
                    }
                    if (productResult.rows.length === 0) {
                        console.error(`❌ Row ${rowIndex}: Product ${productId} not found in database`);
                        errors.push(`Row ${rowIndex}: Product ${productId} not found in database`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing mapping at row ${rowIndex}:`, error.message);
                console.error(`   Data: ${JSON.stringify(row)}`);
                errors.push(`Row ${rowIndex}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.log(`⚠️  RETAILER_PRODUCT_MAPPING processing completed with ${errors.length} errors:`);
            errors.forEach(error => console.log(`   - ${error}`));
        }

        return { processed, errors };
    }

    async processRetailerLocation(dataRows, adminUserId) {
        let processed = 0;
        let errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // +2 because we skip header row and arrays are 0-indexed
            
            try {
                // Validate row data first
                const validation = this.validateRowData(row, 'RETAILER_LOCATION', rowIndex);
                if (!validation.isValid) {
                    console.error(`❌ Row ${rowIndex} in RETAILER_LOCATION: ${validation.errors.join(', ')}`);
                    console.error(`   Data: ${JSON.stringify(row)}`);
                    errors.push(`Row ${rowIndex}: ${validation.errors.join(', ')}`);
                    continue;
                }

                const retailerId = this.safeString(row[0]);
                const city = this.safeString(row[1]);
                const state = this.safeString(row[2]);
                
                if (!retailerId || !city || !state) {
                    console.error(`❌ Row ${rowIndex}: Missing required data`);
                    errors.push(`Row ${rowIndex}: Missing required data`);
                    continue;
                }

                // Get retailer ID by retailer_id
                const retailerResult = await db.query(`
                    SELECT r.id FROM retailers r
                    JOIN users u ON r.user_id = u.id
                    WHERE u.email LIKE $1
                `, [`%${retailerId.toLowerCase().replace('_', '')}%`]);

                if (retailerResult.rows.length > 0) {
                    const retailerDbId = retailerResult.rows[0].id;
                    
                    await db.query(`
                        INSERT INTO retailer_locations (retailer_id, city, state)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (retailer_id, city, state) DO NOTHING
                    `, [retailerDbId, city, state]);

                    processed++;
                    console.log(`✅ Processed location: ${city}, ${state} for retailer ${retailerId} (Row ${rowIndex})`);
                } else {
                    console.error(`❌ Row ${rowIndex}: Retailer ${retailerId} not found in database`);
                    errors.push(`Row ${rowIndex}: Retailer ${retailerId} not found in database`);
                }
            } catch (error) {
                console.error(`❌ Error processing location at row ${rowIndex}:`, error.message);
                console.error(`   Data: ${JSON.stringify(row)}`);
                errors.push(`Row ${rowIndex}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.log(`⚠️  RETAILER_LOCATION processing completed with ${errors.length} errors:`);
            errors.forEach(error => console.log(`   - ${error}`));
        }

        return { processed, errors };
    }

    // ========================================
    // STATUS TRACKING METHODS
    // ========================================

    async updateUploadStatus(uploadId, status, errorMessage = null, processingStartedAt = null, recordsProcessed = 0, processingResults = null) {
        const updateFields = ['status = $2'];
        const values = [uploadId, status];
        let paramIndex = 3;

        if (errorMessage) {
            updateFields.push(`error_message = $${paramIndex++}`);
            values.push(errorMessage);
        }

        if (processingStartedAt) {
            updateFields.push(`processing_started_at = $${paramIndex++}`);
            values.push(processingStartedAt);
        }

        if (recordsProcessed > 0) {
            updateFields.push(`records_processed = $${paramIndex++}`);
            values.push(recordsProcessed);
        }

        if (processingResults) {
            updateFields.push(`processing_results = $${paramIndex++}`);
            values.push(JSON.stringify(processingResults));
        }

        if (status === 'completed' || status === 'failed') {
            updateFields.push(`processing_completed_at = NOW()`);
        }

        await db.query(`
            UPDATE file_uploads 
            SET ${updateFields.join(', ')}
            WHERE id = $1
        `, values);
    }

    async updateUploadProgress(uploadId, progress, statusMessage = null) {
        const updateFields = ['progress = $2'];
        const values = [uploadId, progress];
        let paramIndex = 3;

        if (statusMessage) {
            updateFields.push(`status_message = $${paramIndex++}`);
            values.push(statusMessage);
        }

        await db.query(`
            UPDATE file_uploads 
            SET ${updateFields.join(', ')}
            WHERE id = $1
        `, values);
    }

    async cleanupTempFile(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Error cleaning up temp file:', error.message);
        }
    }
}

module.exports = new UploadService();
