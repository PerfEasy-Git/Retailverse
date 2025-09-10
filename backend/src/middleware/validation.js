const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// Common validation rules
const emailValidation = body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required');

const passwordValidation = body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters');

const phoneValidation = body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required');

const roleValidation = body('role')
    .isIn(['admin', 'brand_admin', 'brand_user', 'retailer_admin', 'retailer_user'])
    .withMessage('Invalid role');

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        });
    }

    next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    // Check file type
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type. Only Excel files are allowed.'
        });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'File size exceeds 10MB limit'
        });
    }

    next();
};

module.exports = {
    validateRequest,
    emailValidation,
    passwordValidation,
    phoneValidation,
    roleValidation,
    sanitizeInput,
    validateFileUpload
};
