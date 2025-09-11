const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const jwtManager = require('../utils/jwt');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');
const { sessionAuth } = require('../middleware/sessionAuth');
const UserService = require('../services/userService');
const SessionService = require('../services/sessionService');
const AuditService = require('../services/auditService');

const router = express.Router();

// Track request frequency for RCA
let requestCount = 0;
let lastRequestTime = Date.now();

// ========================================
// REGISTER USER
// ========================================
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('role').isIn(['brand', 'retailer']),
        body('firstName').notEmpty().trim(),
        body('lastName').notEmpty().trim(),
        body('phone').optional().isMobilePhone()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { email, password, role, firstName, lastName, phone, companyName } = req.body;
            
            // Convert frontend role to backend role
            const backendRole = role === 'brand' ? 'brand_admin' : 'retailer_admin';

            // Check if user already exists
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'User with this email already exists'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const result = await db.query(`
                INSERT INTO users (email, password, role, first_name, last_name, phone, is_active, email_verified)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, email, role, first_name, last_name, company_id, company_type
            `, [email, hashedPassword, backendRole, firstName, lastName, phone, true, false]);

            const user = result.rows[0];

            // Create brand/retailer record for brand/retailer users
            let companyId = null;
            if (backendRole === 'brand_admin') {
                console.log('🏢 Creating brand for user:', user.id, 'with name:', companyName || `${firstName} ${lastName}`);
                
                const brandResult = await db.query(`
                    INSERT INTO brands (user_id, brand_name, first_name, last_name, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    RETURNING id
                `, [user.id, companyName || `${firstName} ${lastName}`, firstName, lastName]);
                
                companyId = brandResult.rows[0].id;
                console.log('✅ Brand created with ID:', companyId);
                
                // Update user with company_id and company_type
                await db.query(`
                    UPDATE users 
                    SET company_id = $1, company_type = $2
                    WHERE id = $3
                `, [companyId, 'brand', user.id]);
                
                user.company_id = companyId;
                user.company_type = 'brand';
            } else if (backendRole === 'retailer_admin') {
                const retailerResult = await db.query(`
                    INSERT INTO retailers (user_id, retailer_name, first_name, last_name, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    RETURNING id
                `, [user.id, companyName || `${firstName} ${lastName}`, firstName, lastName]);
                
                companyId = retailerResult.rows[0].id;
                
                // Update user with company_id and company_type
                await db.query(`
                    UPDATE users 
                    SET company_id = $1, company_type = $2
                    WHERE id = $3
                `, [companyId, 'retailer', user.id]);
                
                user.company_id = companyId;
                user.company_type = 'retailer';
            }

            // Create database session
            const session = await SessionService.createSession(user.id, req);

            // Log registration
            await auditLogger.log({
                user_id: user.id,
                action: 'user_registered',
                resource_type: 'user',
                resource_id: user.id,
                new_values: { email: user.email, role: user.role },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            // Set session cookie
            res.cookie('sessionId', session.session_id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Changed from 'strict' to 'lax' for cross-origin requests
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        company_id: user.company_id,
                        company_type: user.company_type
                    },
                    sessionId: session.session_id
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed'
            });
        }
    }
);

// ========================================
// LOGIN USER
// ========================================
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user
            const result = await db.query(
                'SELECT id, email, password, role, first_name, last_name, company_id, company_type, is_active FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const user = result.rows[0];

            // Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            // Create database session
            const session = await SessionService.createSession(user.id, req);

            // Log login
            await auditLogger.log({
                user_id: user.id,
                action: 'user_login',
                resource_type: 'auth',
                resource_id: user.id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            // Set session cookie
            res.cookie('sessionId', session.session_id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Changed from 'strict' to 'lax' for cross-origin requests
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        company_id: user.company_id,
                        company_type: user.company_type
                    },
                    sessionId: session.session_id
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed'
            });
        }
    }
);

// ========================================
// FORGOT PASSWORD
// ========================================
router.post('/forgot-password',
    [
        body('email').isEmail().normalizeEmail()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { email } = req.body;

            // Find user
            const result = await db.query(
                'SELECT id, email, first_name FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                // Don't reveal if email exists
                return res.json({
                    success: true,
                    message: 'If the email exists, a password reset link has been sent'
                });
            }

            const user = result.rows[0];

            // Use UserService to handle password reset
            await UserService.resetPassword(email);

            // Log password reset request
            await AuditService.logAction(
                user.id,
                'password_reset_requested',
                'auth',
                user.id,
                null,
                { email },
                req
            );

            res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                error: 'Password reset request failed'
            });
        }
    }
);

// ========================================
// RESET PASSWORD
// ========================================
router.post('/reset-password',
    [
        body('token').notEmpty(),
        body('password').isLength({ min: 6 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { token, password } = req.body;

            // Find user with valid reset token
            const result = await db.query(
                'SELECT id, email, reset_token_expiry FROM users WHERE reset_token = $1',
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired reset token'
                });
            }

            const user = result.rows[0];

            // Check if token is expired
            if (new Date() > user.reset_token_expiry) {
                return res.status(400).json({
                    success: false,
                    error: 'Reset token has expired'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Update password and clear reset token
            await db.query(
                'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
                [hashedPassword, user.id]
            );

            // Log password reset
            await auditLogger.log({
                user_id: user.id,
                action: 'password_reset_completed',
                resource_type: 'auth',
                resource_id: user.id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                error: 'Password reset failed'
            });
        }
    }
);

// ========================================
// VERIFY EMAIL
// ========================================
router.post('/verify-email',
    [
        body('token').notEmpty()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { token } = req.body;

            // Find user with verification token
            const result = await db.query(
                'SELECT id, email FROM users WHERE reset_token = $1 AND email_verified = false',
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired verification token'
                });
            }

            const user = result.rows[0];

            // Mark email as verified
            await db.query(
                'UPDATE users SET email_verified = true, reset_token = NULL, reset_token_expiry = NULL WHERE id = $1',
                [user.id]
            );

            // Log email verification
            await auditLogger.log({
                user_id: user.id,
                action: 'email_verified',
                resource_type: 'user',
                resource_id: user.id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Email verified successfully'
            });

        } catch (error) {
            console.error('Email verification error:', error);
            res.status(500).json({
                success: false,
                error: 'Email verification failed'
            });
        }
    }
);

// ========================================
// LOGOUT USER
// ========================================
router.post('/logout', sessionAuth, async (req, res) => {
    try {
        // Destroy session
        await SessionService.destroySession(req.sessionId);

        // Clear session cookie
        res.clearCookie('sessionId');

        // Log logout
        await auditLogger.log({
            user_id: req.user.id,
            action: 'user_logout',
            resource_type: 'auth',
            resource_id: req.user.id,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// ========================================
// GET CURRENT USER
// ========================================
router.get('/me', sessionAuth, async (req, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    
    try {
        console.log(`🔍 [${requestId}] /auth/me called at ${timestamp}`);
        console.log(`🔍 [${requestId}] Request headers:`, req.headers);
        console.log(`🔍 [${requestId}] Request IP:`, req.ip);
        console.log(`🔍 [${requestId}] User-Agent:`, req.get('User-Agent'));
        console.log(`🔍 [${requestId}] User ID:`, req.user?.id, 'Role:', req.user?.role);
        console.log(`🔍 [${requestId}] User object:`, JSON.stringify(req.user, null, 2));
        
        const response = {
            success: true,
            data: {
                user: req.user
            }
        };
        
        console.log(`📤 [${requestId}] Sending response:`, JSON.stringify(response, null, 2));
        res.json(response);
        
        console.log(`✅ [${requestId}] /auth/me response sent successfully at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`❌ [${requestId}] Get current user error:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});

module.exports = router;