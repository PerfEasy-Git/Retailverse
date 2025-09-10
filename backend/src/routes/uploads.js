const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateFileUpload } = require('../middleware/validation');
const uploadService = require('../services/uploadService');
const AuditService = require('../services/auditService');

const router = express.Router();

// Test route to verify uploads router is working
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Uploads router is working' });
});

// ========================================
// MULTER CONFIGURATION
// ========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/temp');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel files are allowed.'), false);
        }
    }
});

// ========================================
// UPLOAD EXCEL FILE
// ========================================
router.post('/excel',
    requireRole(['admin']),
    upload.single('file'),
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

// ========================================
// GET UPLOAD STATUS
// ========================================
router.get('/status/:uploadId',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, filename, status, records_processed, error_message, 
                       created_at, processing_started_at, processing_completed_at,
                       progress, status_message, processing_results
                FROM file_uploads 
                WHERE id = $1 AND admin_user_id = $2
            `, [req.params.uploadId, req.user.id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Upload not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
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

// ========================================
// GET UPLOAD HISTORY
// ========================================
router.get('/history',
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

// ========================================
// GET UPLOAD HISTORY
// ========================================
router.get('/history',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, filename, status, records_processed, 
                       created_at, processing_completed_at, error_message
                FROM file_uploads 
                WHERE admin_user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 50
            `, [req.user.id]);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('History fetch error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch upload history'
            });
        }
    }
);

// ========================================
// DOWNLOAD EXCEL TEMPLATE
// ========================================
router.get('/template',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const templatePath = path.join(__dirname, '../templates/retailer-data-template.xlsx');
            console.log('🔍 Template download requested');
            console.log('📁 Template path:', templatePath);
            console.log('📁 __dirname:', __dirname);
            console.log('📁 File exists:', fs.existsSync(templatePath));
            
            if (!fs.existsSync(templatePath)) {
                console.log('❌ Template file not found at:', templatePath);
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }

            console.log('✅ Template file found, starting download');
            res.download(templatePath, 'retailer-data-template.xlsx');
        } catch (error) {
            console.error('❌ Template download error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to download template'
            });
        }
    }
);

module.exports = router;
