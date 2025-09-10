# Security Implementation - Complete Guide

## 🔒 Overview

Comprehensive security implementation covering authentication, authorization, input validation, and protection against common vulnerabilities.

---

## 🔐 Authentication & Authorization

### JWT Token Management
```javascript
// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTManager {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.refreshSecret = process.env.JWT_REFRESH_SECRET;
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }

    generateAccessToken(payload) {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'retailverse',
            audience: 'retailverse-users'
        });
    }

    generateRefreshToken(payload) {
        return jwt.sign(payload, this.refreshSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: 'retailverse',
            audience: 'retailverse-users'
        });
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.secret, {
                issuer: 'retailverse',
                audience: 'retailverse-users'
            });
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshSecret, {
                issuer: 'retailverse',
                audience: 'retailverse-users'
            });
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    generateTokenPair(user) {
        const payload = {
            user_id: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            company_type: user.company_type
        };

        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }

    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateEmailVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = new JWTManager();
```

### Authentication Middleware
```javascript
// src/middleware/auth.js
const jwtManager = require('../utils/jwt');
const userService = require('../services/userService');
const { auditLogger } = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwtManager.verifyAccessToken(token);

        // Check if user still exists and is active
        const user = await userService.findUserById(decoded.user_id);
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            company_type: user.company_type
        };

        // Log authentication
        await auditLogger.log({
            user_id: user.id,
            action: 'authenticated',
            resource_type: 'auth',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }

        next();
    };
};

const requireCompanyAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Admin can access any company
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if user is accessing their own company
    const requestedCompanyId = req.params.companyId || req.body.company_id;
    if (requestedCompanyId && requestedCompanyId !== req.user.company_id) {
        return res.status(403).json({
            success: false,
            error: 'Access denied to this company'
        });
    }

    next();
};

module.exports = {
    authenticate,
    requireRole,
    requireCompanyAccess
};
```

---

## 🛡️ Input Validation & Sanitization

### Validation Middleware
```javascript
// src/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');
const { sanitizeBody, sanitizeParam, sanitizeQuery } = require('express-validator');

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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

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
                req.query[key] = req.body[key].trim();
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
```

### SQL Injection Prevention
```javascript
// src/database/queries.js
const { db } = require('./connection');

class DatabaseQueries {
    // Use parameterized queries to prevent SQL injection
    async findUserByEmail(email) {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    async findUserById(id) {
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async createUser(userData) {
        const { email, password, role, company_id, company_type, first_name, last_name, phone } = userData;
        
        const result = await db.query(`
            INSERT INTO users (email, password, role, company_id, company_type, first_name, last_name, phone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, email, role, first_name, last_name
        `, [email, password, role, company_id, company_type, first_name, last_name, phone]);
        
        return result.rows[0];
    }

    // Dynamic query building with proper escaping
    async searchUsers(filters) {
        let query = 'SELECT * FROM users WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (filters.role) {
            query += ` AND role = $${paramIndex++}`;
            params.push(filters.role);
        }

        if (filters.company_id) {
            query += ` AND company_id = $${paramIndex++}`;
            params.push(filters.company_id);
        }

        if (filters.is_active !== undefined) {
            query += ` AND is_active = $${paramIndex++}`;
            params.push(filters.is_active);
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new DatabaseQueries();
```

---

## 🔒 Rate Limiting & DDoS Protection

### Rate Limiting Middleware
```javascript
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

// Create Redis client for rate limiting
const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
});

// General rate limiter
const generalLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:general:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Authentication rate limiter (stricter)
const authLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// File upload rate limiter
const uploadLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:upload:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 uploads per hour
    message: {
        success: false,
        error: 'Too many file uploads, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:password-reset:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset requests per hour
    message: {
        success: false,
        error: 'Too many password reset attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    authLimiter,
    uploadLimiter,
    passwordResetLimiter
};
```

---

## 🛡️ Security Headers & CORS

### Security Headers Middleware
```javascript
// src/middleware/security.js
const helmet = require('helmet');
const cors = require('cors');

// Helmet configuration for security headers
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// CORS configuration
const corsConfig = cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
});

// Additional security headers
const additionalSecurityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
};

module.exports = {
    helmetConfig,
    corsConfig,
    additionalSecurityHeaders
};
```

---

## 🔐 Password Security

### Password Hashing & Validation
```javascript
// src/utils/password.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class PasswordManager {
    constructor() {
        this.saltRounds = 12;
    }

    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one character from each required type
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
        password += '0123456789'[Math.floor(Math.random() * 10)]; // number
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special character
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    validatePasswordStrength(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[@$!%*?&]/.test(password)) {
            errors.push('Password must contain at least one special character (@$!%*?&)');
        }
        
        // Check for common passwords
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ];
        
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateEmailVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = new PasswordManager();
```

---

## 🔍 Audit Logging & Monitoring

### Audit Logger
```javascript
// src/utils/logger.js
const { db } = require('../database/connection');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'retailverse-api' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class AuditLogger {
    async log(auditData) {
        try {
            const {
                user_id,
                action,
                resource_type,
                resource_id,
                old_values,
                new_values,
                ip_address,
                user_agent
            } = auditData;

            // Log to database
            await db.query(`
                INSERT INTO audit_logs (user_id, action, resource_type, resource_id, 
                                      old_values, new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [user_id, action, resource_type, resource_id, 
                old_values ? JSON.stringify(old_values) : null,
                new_values ? JSON.stringify(new_values) : null,
                ip_address, user_agent]);

            // Log to file
            logger.info('Audit log', {
                user_id,
                action,
                resource_type,
                resource_id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to log audit event', error);
        }
    }

    async getAuditLogs(filters = {}) {
        try {
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (filters.user_id) {
                query += ` AND user_id = $${paramIndex++}`;
                params.push(filters.user_id);
            }

            if (filters.action) {
                query += ` AND action = $${paramIndex++}`;
                params.push(filters.action);
            }

            if (filters.resource_type) {
                query += ` AND resource_type = $${paramIndex++}`;
                params.push(filters.resource_type);
            }

            if (filters.start_date) {
                query += ` AND created_at >= $${paramIndex++}`;
                params.push(filters.start_date);
            }

            if (filters.end_date) {
                query += ` AND created_at <= $${paramIndex++}`;
                params.push(filters.end_date);
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                query += ` LIMIT $${paramIndex++}`;
                params.push(filters.limit);
            }

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Failed to get audit logs', error);
            throw error;
        }
    }
}

module.exports = {
    logger,
    auditLogger: new AuditLogger()
};
```

---

## 🚨 Error Handling & Logging

### Error Handler Middleware
```javascript
// src/middleware/errorHandler.js
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message, statusCode: 400 };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
    }

    // Database connection errors
    if (err.code === 'ECONNREFUSED') {
        const message = 'Database connection failed';
        error = { message, statusCode: 500 };
    }

    // File upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File too large';
        error = { message, statusCode: 400 };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
```

---

## 🔧 Security Configuration

### Environment Variables
```env
# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password Security
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Rate Limiting
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# CORS
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Security Headers
HELMET_ENABLED=true
CORS_ENABLED=true

# File Upload Security
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls
UPLOAD_DIR=./uploads

# Session Security
SESSION_SECRET=your_session_secret_here
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=strict
```

### Security Middleware Setup
```javascript
// src/app.js
const express = require('express');
const { helmetConfig, corsConfig, additionalSecurityHeaders } = require('./middleware/security');
const { generalLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(additionalSecurityHeaders);

// Rate limiting
app.use(generalLimiter);

// Input sanitization
app.use(sanitizeInput);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes with specific rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/uploads', uploadLimiter);

// Error handling
app.use(errorHandler);

module.exports = app;
```

---

## 🧪 Security Testing

### Security Tests
```javascript
// tests/security/security.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Security Tests', () => {
    test('should prevent SQL injection', async () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: maliciousInput,
                password: 'password'
            });
        
        expect(response.status).toBe(400);
    });

    test('should prevent XSS attacks', async () => {
        const maliciousInput = '<script>alert("XSS")</script>';
        
        const response = await request(app)
            .post('/api/users/profile')
            .set('Authorization', 'Bearer valid_token')
            .send({
                first_name: maliciousInput,
                last_name: 'Doe'
            });
        
        expect(response.status).toBe(400);
    });

    test('should enforce rate limiting', async () => {
        const promises = [];
        
        // Make 10 requests quickly
        for (let i = 0; i < 10; i++) {
            promises.push(
                request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    })
            );
        }
        
        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate JWT tokens', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', 'Bearer invalid_token');
        
        expect(response.status).toBe(401);
    });

    test('should enforce CORS policy', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .set('Origin', 'http://malicious-site.com');
        
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
});
```

---

**Security implementation is now complete with comprehensive protection against common vulnerabilities, proper authentication, authorization, and monitoring.**
