const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');
const userService = require('../services/userService');

const router = express.Router();

// ========================================
// GET CURRENT USER PROFILE
// ========================================
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, email, role, first_name, last_name, phone, company_id, company_type, 
                   is_active, email_verified, created_at, updated_at
            FROM users WHERE id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
});

// ========================================
// UPDATE USER PROFILE
// ========================================
router.put('/profile',
    [
        body('first_name').notEmpty().trim(),
        body('last_name').notEmpty().trim(),
        body('phone').optional().isMobilePhone()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { first_name, last_name, phone } = req.body;
            
            const result = await db.query(`
                UPDATE users 
                SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
                WHERE id = $4
                RETURNING id, email, role, first_name, last_name, phone, company_id, company_type
            `, [first_name, last_name, phone, req.user.id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Log profile update
            await auditLogger.log({
                user_id: req.user.id,
                action: 'profile_updated',
                resource_type: 'user',
                resource_id: req.user.id,
                new_values: { first_name, last_name, phone },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }
);

// ========================================
// CHANGE PASSWORD
// ========================================
router.put('/change-password',
    [
        body('current_password').notEmpty(),
        body('new_password').isLength({ min: 6 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { current_password, new_password } = req.body;

            // Get user with password
            const result = await db.query(
                'SELECT id, password FROM users WHERE id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = result.rows[0];

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 12);

            // Update password
            await db.query(
                'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
                [hashedNewPassword, req.user.id]
            );

            // Log password change
            await auditLogger.log({
                user_id: req.user.id,
                action: 'password_changed',
                resource_type: 'user',
                resource_id: req.user.id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change password'
            });
        }
    }
);

// ========================================
// GET COMPANY USERS (for admins)
// ========================================
router.get('/company-users',
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    async (req, res) => {
        try {
            let query = `
                SELECT id, email, role, first_name, last_name, phone, is_active, 
                       email_verified, created_at, updated_at
                FROM users 
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            // Admin can see all users, others can only see their company users
            if (req.user.role !== 'admin') {
                query += ` AND company_id = $${paramIndex++}`;
                params.push(req.user.company_id);
            }

            query += ` AND id != $${paramIndex++}`;
            params.push(req.user.id);

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get company users error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company users'
            });
        }
    }
);

// ========================================
// UPDATE USER STATUS (for admins)
// ========================================
router.put('/:userId/status',
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    [
        body('is_active').isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { is_active } = req.body;
            const { userId } = req.params;

            // Check if updater has permission
            const targetUserResult = await db.query(
                'SELECT id, email, role, company_id, is_active FROM users WHERE id = $1',
                [userId]
            );

            if (targetUserResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const targetUser = targetUserResult.rows[0];

            // Check permissions
            if (req.user.role !== 'admin' && 
                (req.user.company_id !== targetUser.company_id || 
                 !['brand_admin', 'retailer_admin'].includes(req.user.role))) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions'
                });
            }

            // Update user status
            await db.query(
                'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
                [is_active, userId]
            );

            // Log status update
            await auditLogger.log({
                user_id: req.user.id,
                action: 'user_status_updated',
                resource_type: 'user',
                resource_id: userId,
                old_values: { is_active: targetUser.is_active },
                new_values: { is_active },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'User status updated successfully'
            });
        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update user status'
            });
        }
    }
);

// ========================================
// DELETE USER (for admins)
// ========================================
router.delete('/:userId',
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Check if deleter has permission
            const targetUserResult = await db.query(
                'SELECT id, email, role, company_id FROM users WHERE id = $1',
                [userId]
            );

            if (targetUserResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const targetUser = targetUserResult.rows[0];

            // Check permissions
            if (req.user.role !== 'admin' && 
                (req.user.company_id !== targetUser.company_id || 
                 !['brand_admin', 'retailer_admin'].includes(req.user.role))) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions'
                });
            }

            // Check if user has child users
            const childUsersResult = await db.query(
                'SELECT COUNT(*) as count FROM users WHERE parent_user_id = $1',
                [userId]
            );

            if (parseInt(childUsersResult.rows[0].count) > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete user with child users'
                });
            }

            // Soft delete user (deactivate)
            await db.query(
                'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
                [userId]
            );

            // Log user deletion
            await auditLogger.log({
                user_id: req.user.id,
                action: 'user_deleted',
                resource_type: 'user',
                resource_id: userId,
                old_values: { email: targetUser.email, role: targetUser.role },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete user'
            });
        }
    }
);

// ========================================
// GET ALL USERS (ADMIN ONLY)
// ========================================
router.get('/',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, role, company_type, search } = req.query;
            const filters = { role, company_type, search };
            
            const result = await userService.getAllUsers(parseInt(page), parseInt(limit), filters);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get users'
            });
        }
    }
);

// ========================================
// UPDATE USER (ADMIN ONLY)
// ========================================
router.put('/:userId',
    requireRole(['admin']),
    [
        body('first_name').optional().isLength({ min: 1, max: 100 }),
        body('last_name').optional().isLength({ min: 1, max: 100 }),
        body('phone').optional().isLength({ min: 10, max: 20 }),
        body('is_active').optional().isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const updateData = req.body;
            
            const user = await userService.updateUser(parseInt(userId), updateData);
            
            res.json({
                success: true,
                message: 'User updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update user'
            });
        }
    }
);

// ========================================
// DELETE USER (ADMIN ONLY)
// ========================================
router.delete('/:userId',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { userId } = req.params;
            
            const user = await userService.deleteUser(parseInt(userId));
            
            res.json({
                success: true,
                message: 'User deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete user'
            });
        }
    }
);

// ========================================
// SEND USER INVITATION
// ========================================
router.post('/invite',
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    [
        body('email').isEmail().normalizeEmail(),
        body('role').isIn(['brand_admin', 'brand_user', 'retailer_admin', 'retailer_user']),
        body('firstName').optional().isLength({ min: 1, max: 100 }),
        body('lastName').optional().isLength({ min: 1, max: 100 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { email, role, firstName, lastName } = req.body;
            
            const result = await userService.inviteUser({
                email,
                role,
                firstName,
                lastName,
                invitedBy: req.user.id
            });
            
            res.json({
                success: true,
                message: 'Invitation sent successfully',
                data: result
            });
        } catch (error) {
            console.error('Send invitation error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send invitation'
            });
        }
    }
);

// ========================================
// GET INVITATION STATUS
// ========================================
router.get('/invitations/status/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const invitation = await userService.findInvitationByToken(token);
        
        if (!invitation) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired invitation'
            });
        }
        
        res.json({
            success: true,
            data: {
                email: invitation.email,
                role: invitation.role,
                company_type: invitation.company_type,
                expires_at: invitation.expires_at
            }
        });
    } catch (error) {
        console.error('Get invitation status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get invitation status'
        });
    }
});

// ========================================
// ACCEPT INVITATION
// ========================================
router.post('/invitations/accept/:token',
    [
        body('password').isLength({ min: 6 }),
        body('firstName').isLength({ min: 1, max: 100 }),
        body('lastName').isLength({ min: 1, max: 100 }),
        body('phone').optional().isLength({ min: 10, max: 20 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { token } = req.params;
            const { password, firstName, lastName, phone } = req.body;
            
            const result = await userService.acceptInvitation(token, {
                password,
                firstName,
                lastName,
                phone
            });
            
            res.json({
                success: true,
                message: 'Invitation accepted successfully',
                data: result
            });
        } catch (error) {
            console.error('Accept invitation error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to accept invitation'
            });
        }
    }
);

module.exports = router;
