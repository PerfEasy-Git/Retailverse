# File Upload System - Complete Implementation

## 📁 Overview

Complete file upload system for Excel data import with validation, processing, progress tracking, and error handling.

---

## 🔧 File Upload Service Implementation

### Upload Service
```javascript
// src/services/uploadService.js
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const { db } = require('../database/connection');
const { auditLogger } = require('../utils/logger');

class UploadService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
        this.allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        this.setupMulter();
    }

    setupMulter() {
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                const uploadPath = path.join(this.uploadDir, 'temp');
                await fs.mkdir(uploadPath, { recursive: true });
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
            }
        });

        this.upload = multer({
            storage,
            limits: {
                fileSize: this.maxFileSize
            },
            fileFilter: (req, file, cb) => {
                if (this.allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type. Only Excel files are allowed.'), false);
                }
            }
        });
    }

    async validateExcelFile(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
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

    async processExcelFile(filePath, uploadId, adminUserId) {
        try {
            // Update upload status to processing
            await this.updateUploadStatus(uploadId, 'processing', null, new Date());

            const workbook = XLSX.readFile(filePath);
            let totalProcessed = 0;
            const processingResults = {};

            // Process each sheet
            const sheets = ['RETAILER_INFO', 'RETAILER_PRODUCT_MAPPING', 'RETAILER_LOCATION', 'PRODUCT_INFO'];
            
            for (const sheetName of sheets) {
                const result = await this.processSheet(workbook, sheetName, adminUserId);
                processingResults[sheetName] = result;
                totalProcessed += result.processed;
            }

            // Update upload status to completed
            await this.updateUploadStatus(uploadId, 'completed', null, new Date(), totalProcessed);

            // Log successful processing
            await auditLogger.log({
                user_id: adminUserId,
                action: 'file_upload_completed',
                resource_type: 'upload',
                resource_id: uploadId,
                new_values: { totalProcessed, processingResults }
            });

            return {
                success: true,
                totalProcessed,
                processingResults
            };

        } catch (error) {
            // Update upload status to failed
            await this.updateUploadStatus(uploadId, 'failed', error.message, new Date());

            // Log failed processing
            await auditLogger.log({
                user_id: adminUserId,
                action: 'file_upload_failed',
                resource_type: 'upload',
                resource_id: uploadId,
                new_values: { error: error.message }
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async processSheet(workbook, sheetName, adminUserId) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(workbook, { header: 1 });
        const dataRows = jsonData.slice(1);

        let processed = 0;
        const errors = [];

        try {
            switch (sheetName) {
                case 'RETAILER_INFO':
                    processed = await this.processRetailerInfo(dataRows, adminUserId);
                    break;
                case 'RETAILER_PRODUCT_MAPPING':
                    processed = await this.processRetailerProductMapping(dataRows, adminUserId);
                    break;
                case 'RETAILER_LOCATION':
                    processed = await this.processRetailerLocation(dataRows, adminUserId);
                    break;
                case 'PRODUCT_INFO':
                    processed = await this.processProductInfo(dataRows, adminUserId);
                    break;
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
        
        for (const row of dataRows) {
            try {
                // Create retailer user first
                const userResult = await db.query(`
                    INSERT INTO users (email, password, role, company_type, first_name, last_name, is_active, email_verified)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    `${row[0].toLowerCase().replace('_', '')}@retailverse.com`,
                    await bcrypt.hash('defaultpassword123', 12),
                    'retailer_admin',
                    'retailer',
                    row[1].split(' ')[0] || 'Retailer',
                    row[1].split(' ').slice(1).join(' ') || 'User',
                    true,
                    true
                ]);

                const userId = userResult.rows[0].id;

                // Create retailer record
                await db.query(`
                    INSERT INTO retailers (user_id, retailer_name, retailer_category, retailer_format, 
                                         retailer_sale_model, outlet_count, city_count, state_count, 
                                         purchase_model, credit_days, logo_url, store_images)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    userId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], 
                    row[8], row[9], row[10], JSON.stringify([row[11], row[12], row[13], row[14]])
                ]);

                processed++;
            } catch (error) {
                console.error(`Error processing retailer ${row[1]}:`, error.message);
            }
        }

        return processed;
    }

    async processProductInfo(dataRows, adminUserId) {
        let processed = 0;
        
        for (const row of dataRows) {
            try {
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
                `, [row[1], row[0], row[4], row[2], row[3], row[5], row[6], row[7], row[8]]);

                processed++;
            } catch (error) {
                console.error(`Error processing product ${row[0]}:`, error.message);
            }
        }

        return processed;
    }

    async processRetailerLocation(dataRows, adminUserId) {
        let processed = 0;
        
        for (const row of dataRows) {
            try {
                // Get retailer ID by retailer_id
                const retailerResult = await db.query(`
                    SELECT id FROM retailers r
                    JOIN users u ON r.user_id = u.id
                    WHERE u.email LIKE $1
                `, [`%${row[0].toLowerCase().replace('_', '')}%`]);

                if (retailerResult.rows.length > 0) {
                    const retailerId = retailerResult.rows[0].id;
                    
                    await db.query(`
                        INSERT INTO retailer_locations (retailer_id, city, state)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (retailer_id, city, state) DO NOTHING
                    `, [retailerId, row[1], row[2]]);

                    processed++;
                }
            } catch (error) {
                console.error(`Error processing location for ${row[0]}:`, error.message);
            }
        }

        return processed;
    }

    async processRetailerProductMapping(dataRows, adminUserId) {
        let processed = 0;
        
        for (const row of dataRows) {
            try {
                // Get retailer ID
                const retailerResult = await db.query(`
                    SELECT id FROM retailers r
                    JOIN users u ON r.user_id = u.id
                    WHERE u.email LIKE $1
                `, [`%${row[0].toLowerCase().replace('_', '')}%`]);

                // Get product ID
                const productResult = await db.query(`
                    SELECT id FROM products WHERE product_id = $1
                `, [row[1]]);

                if (retailerResult.rows.length > 0 && productResult.rows.length > 0) {
                    const retailerId = retailerResult.rows[0].id;
                    const productId = productResult.rows[0].id;
                    
                    await db.query(`
                        INSERT INTO retailer_product_mappings (retailer_id, product_id, avg_selling_price, annual_sale, retailer_margin)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (retailer_id, product_id) DO UPDATE SET
                            avg_selling_price = EXCLUDED.avg_selling_price,
                            annual_sale = EXCLUDED.annual_sale,
                            retailer_margin = EXCLUDED.retailer_margin
                    `, [retailerId, productId, row[2], row[3], row[4]]);

                    processed++;
                }
            } catch (error) {
                console.error(`Error processing mapping for ${row[0]}-${row[1]}:`, error.message);
            }
        }

        return processed;
    }

    async updateUploadStatus(uploadId, status, errorMessage = null, processingStartedAt = null, recordsProcessed = 0) {
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

        if (status === 'completed' || status === 'failed') {
            updateFields.push(`processing_completed_at = NOW()`);
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
```

---

## 🔧 File Upload API Routes

### Upload Routes
```javascript
// src/routes/uploads.js
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Upload Excel file
router.post('/excel', 
    authenticate,
    requireRole(['admin']),
    uploadService.upload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            // Validate file
            const validation = await uploadService.validateExcelFile(req.file.path);
            if (!validation.isValid) {
                await uploadService.cleanupTempFile(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            // Create upload record
            const uploadResult = await db.query(`
                INSERT INTO file_uploads (admin_user_id, filename, file_path, upload_type, status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [req.user.id, req.file.originalname, req.file.path, 'retailer_data', 'pending']);

            const uploadId = uploadResult.rows[0].id;

            // Start processing in background
            uploadService.processExcelFile(req.file.path, uploadId, req.user.id)
                .catch(error => {
                    console.error('Background processing error:', error);
                });

            res.json({
                success: true,
                message: 'File uploaded successfully',
                data: {
                    upload_id: uploadId,
                    filename: req.file.originalname,
                    status: 'processing',
                    validation_results: validation.validationResults
                }
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                error: 'File upload failed'
            });
        }
    }
);

// Get upload status
router.get('/status/:uploadId',
    authenticate,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, filename, status, records_processed, error_message, 
                       created_at, processing_started_at, processing_completed_at
                FROM file_uploads 
                WHERE id = $1 AND admin_user_id = $2
            `, [req.params.uploadId, req.user.id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Upload not found'
                });
            }

            const upload = result.rows[0];
            res.json({
                success: true,
                data: {
                    upload_id: upload.id,
                    filename: upload.filename,
                    status: upload.status,
                    records_processed: upload.records_processed,
                    error_message: upload.error_message,
                    created_at: upload.created_at,
                    processing_started_at: upload.processing_started_at,
                    processing_completed_at: upload.processing_completed_at
                }
            });

        } catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get upload status'
            });
        }
    }
);

// Get upload history
router.get('/history',
    authenticate,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await db.query(`
                SELECT id, filename, status, records_processed, error_message, created_at
                FROM file_uploads 
                WHERE admin_user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `, [req.user.id, limit, offset]);

            const countResult = await db.query(`
                SELECT COUNT(*) as total FROM file_uploads WHERE admin_user_id = $1
            `, [req.user.id]);

            res.json({
                success: true,
                data: {
                    uploads: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('History error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get upload history'
            });
        }
    }
);

module.exports = router;
```

---

## 🎨 Frontend File Upload Component

### File Upload Component
```jsx
// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import { uploadFile, getUploadStatus } from '../services/uploadService';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadId, setUploadId] = useState(null);
    const [status, setStatus] = useState(null);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Validate file type
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
                alert('Please select an Excel file (.xlsx or .xls)');
                return;
            }

            // Validate file size (10MB limit)
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }

            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await uploadFile(formData);
            
            if (response.success) {
                setUploadId(response.data.upload_id);
                setStatus('processing');
                
                // Start polling for status updates
                pollUploadStatus(response.data.upload_id);
            } else {
                alert('Upload failed: ' + response.error);
                setUploading(false);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            setUploading(false);
        }
    };

    const pollUploadStatus = async (uploadId) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await getUploadStatus(uploadId);
                
                if (response.success) {
                    const uploadStatus = response.data.status;
                    setStatus(uploadStatus);

                    if (uploadStatus === 'completed') {
                        setProgress(100);
                        setUploading(false);
                        clearInterval(pollInterval);
                        alert('File processed successfully!');
                    } else if (uploadStatus === 'failed') {
                        setUploading(false);
                        clearInterval(pollInterval);
                        alert('Processing failed: ' + response.data.error_message);
                    } else if (uploadStatus === 'processing') {
                        setProgress(50); // Show processing progress
                    }
                }
            } catch (error) {
                console.error('Status check error:', error);
                clearInterval(pollInterval);
                setUploading(false);
            }
        }, 2000); // Poll every 2 seconds
    };

    const resetUpload = () => {
        setFile(null);
        setUploading(false);
        setUploadId(null);
        setStatus(null);
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Upload Excel File</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Excel File
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {file && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                            <strong>Selected File:</strong> {file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                )}

                {uploading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Processing...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        {status && (
                            <p className="text-sm text-gray-600">
                                Status: <span className="font-medium">{status}</span>
                            </p>
                        )}
                    </div>
                )}

                <div className="flex space-x-4">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    
                    <button
                        onClick={resetUpload}
                        disabled={uploading}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">File Requirements:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• File format: Excel (.xlsx or .xls)</li>
                    <li>• Maximum size: 10MB</li>
                    <li>• Required sheets: RETAILER_INFO, RETAILER_PRODUCT_MAPPING, RETAILER_LOCATION, PRODUCT_INFO</li>
                    <li>• All required columns must be present</li>
                    <li>• Data must be in the correct format</li>
                </ul>
            </div>
        </div>
    );
};

export default FileUpload;
```

---

## 🔧 Upload Service API

### Upload Service API
```javascript
// src/services/uploadService.js (Frontend)
import api from './api';

export const uploadFile = async (formData) => {
    try {
        const response = await api.post('/uploads/excel', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Upload failed');
    }
};

export const getUploadStatus = async (uploadId) => {
    try {
        const response = await api.get(`/uploads/status/${uploadId}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to get upload status');
    }
};

export const getUploadHistory = async (page = 1, limit = 20) => {
    try {
        const response = await api.get(`/uploads/history?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to get upload history');
    }
};
```

---

## 🧪 File Upload Testing

### Upload Service Tests
```javascript
// tests/services/uploadService.test.js
const uploadService = require('../../src/services/uploadService');
const fs = require('fs');
const path = require('path');

describe('UploadService', () => {
    test('should validate Excel file structure', async () => {
        const testFile = path.join(__dirname, '../fixtures/valid_retailer_data.xlsx');
        const validation = await uploadService.validateExcelFile(testFile);
        
        expect(validation.isValid).toBe(true);
        expect(validation.totalSheets).toBe(4);
    });

    test('should reject invalid file structure', async () => {
        const testFile = path.join(__dirname, '../fixtures/invalid_structure.xlsx');
        const validation = await uploadService.validateExcelFile(testFile);
        
        expect(validation.isValid).toBe(false);
        expect(validation.error).toContain('Missing required sheets');
    });

    test('should process valid Excel file', async () => {
        const testFile = path.join(__dirname, '../fixtures/valid_retailer_data.xlsx');
        const result = await uploadService.processExcelFile(testFile, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.totalProcessed).toBeGreaterThan(0);
    });
});
```

---

**File upload system is now complete with validation, processing, progress tracking, and error handling.**
