const express = require('express');
const crypto = require('crypto');
const { body } = require('express-validator');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { auditLogger } = require('../utils/logger');
const UserService = require('../services/userService');
const AuditService = require('../services/auditService');

const router = express.Router();

// ========================================
// SEND USER INVITATION
// ========================================
router.post('/send',
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    [
        body('email').isEmail().normalizeEmail(),
        body('role').isIn(['brand_user', 'retailer_user']),
        body('first_name').optional().trim(),
        body('last_name').optional().trim()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { email, role, first_name, last_name } = req.body;
            
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

            // Check if invitation already exists
            const existingInvitation = await db.query(
                'SELECT id FROM user_invitations WHERE email = $1 AND status = $2',
                [email, 'pending']
            );

            if (existingInvitation.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation already sent to this email'
                });
            }

            // Use UserService to send invitation
            const invitation = await UserService.inviteUser(
                req.user.id,
                email,
                role,
                req.user.company_id,
                req.user.company_type
            );

            // Log invitation
            await AuditService.logAction(
                req.user.id,
                'user_invited',
                'invitation',
                invitation.id,
                null,
                { email, role },
                req
            );

            res.status(201).json({
                success: true,
                message: 'Invitation sent successfully',
                data: {
                    invitation_id: invitation.id,
                    email,
                    role
                }
            });

        } catch (error) {
            console.error('Send invitation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send invitation'
            });
        }
    }
);

// ========================================
// GET INVITATION STATUS
// ========================================
router.get('/status/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.query(`
            SELECT ui.*, u.first_name, u.last_name
            FROM user_invitations ui
            JOIN users u ON ui.invited_by = u.id
            WHERE ui.invitation_token = $1
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid invitation token'
            });
        }

        const invitation = result.rows[0];

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Invitation has already been used'
            });
        }

        if (new Date() > invitation.expires_at) {
            return res.status(400).json({
                success: false,
                error: 'Invitation has expired'
            });
        }

        res.json({
            success: true,
            data: {
                email: invitation.email,
                role: invitation.role,
                company_name: invitation.company_name,
                inviter_name: `${invitation.first_name} ${invitation.last_name}`,
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
router.post('/accept/:token',
    [
        body('password').isLength({ min: 6 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            // Find invitation
            const invitationResult = await db.query(`
                SELECT ui.*, u.first_name, u.last_name
                FROM user_invitations ui
                JOIN users u ON ui.invited_by = u.id
                WHERE ui.invitation_token = $1
            `, [token]);

            if (invitationResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid invitation token'
                });
            }

            const invitation = invitationResult.rows[0];

            if (invitation.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation has already been used'
                });
            }

            if (new Date() > invitation.expires_at) {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation has expired'
                });
            }

            // Hash password
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const userResult = await db.query(`
                INSERT INTO users (email, password, role, company_id, company_type, parent_user_id, 
                                 first_name, last_name, is_active, email_verified)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, email, role, first_name, last_name, company_id, company_type
            `, [
                invitation.email, hashedPassword, invitation.role, 
                invitation.company_id, invitation.company_type, invitation.invited_by,
                invitation.first_name || 'User', invitation.last_name || 'Name',
                true, true
            ]);

            const user = userResult.rows[0];

            // Update invitation status
            await db.query(`
                UPDATE user_invitations 
                SET status = 'accepted', accepted_at = NOW()
                WHERE id = $1
            `, [invitation.id]);

            // Log invitation acceptance
            await auditLogger.log({
                user_id: user.id,
                action: 'invitation_accepted',
                resource_type: 'invitation',
                resource_id: invitation.id,
                new_values: { email: invitation.email },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        company_id: user.company_id,
                        company_type: user.company_type
                    }
                }
            });

        } catch (error) {
            console.error('Accept invitation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to accept invitation'
            });
        }
    }
);

module.exports = router;
