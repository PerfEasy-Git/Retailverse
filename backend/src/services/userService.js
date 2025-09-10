const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../database/connection');
const emailService = require('./emailService');

class UserService {
    // ========================================
    // USER CREATION METHODS
    // ========================================

    async createUser(userData) {
        try {
            const { email, password, role, companyName, firstName, lastName, phone, parentUserId } = userData;
            
            // Check if user already exists
            const existingUser = await this.findUserByEmail(email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Determine company_id and company_type based on role
            let companyId = null;
            let companyType = null;
            
            if (parentUserId) {
                const parentUser = await this.findUserById(parentUserId);
                if (parentUser) {
                    companyId = parentUser.company_id;
                    companyType = parentUser.company_type;
                }
            }

            // Create user
            const result = await db.query(`
                INSERT INTO users (email, password, role, company_id, company_type, parent_user_id, 
                                 first_name, last_name, phone, is_active, email_verified)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, email, role, first_name, last_name, company_id, company_type
            `, [email, hashedPassword, role, companyId, companyType, parentUserId, 
                firstName, lastName, phone, true, false]);

            const user = result.rows[0];

            // Send welcome email
            await emailService.sendWelcomeEmail({
                email: user.email,
                firstName: user.first_name,
                role: user.role,
                companyName: companyName || 'RetailVerse'
            });

            return { success: true, user };
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    // ========================================
    // INVITATION WORKFLOW METHODS
    // ========================================

    async inviteUser(invitationData) {
        try {
            const { email, role, firstName, lastName, invitedBy } = invitationData;
            
            // Check if user already exists
            const existingUser = await this.findUserByEmail(email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Check if invitation already exists
            const existingInvitation = await this.findInvitationByEmail(email);
            if (existingInvitation) {
                throw new Error('Invitation already sent to this email');
            }

            // Get inviter's company info
            const inviter = await this.findUserById(invitedBy);
            if (!inviter) {
                throw new Error('Inviter not found');
            }

            // Generate invitation token
            const invitationToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Create invitation
            const result = await db.query(`
                INSERT INTO user_invitations (invited_by, email, role, company_id, company_type, 
                                            invitation_token, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, invitation_token, expires_at
            `, [invitedBy, email, role, inviter.company_id, inviter.company_type, 
                invitationToken, expiresAt]);

            const invitation = result.rows[0];

            // Send invitation email
            await emailService.sendInvitationEmail({
                email: email,
                firstName: firstName || 'User',
                role: role,
                companyName: inviter.company_type === 'brand' ? 'Brand Company' : 'Retailer Company',
                invitationToken: invitationToken
            });

            return { success: true, invitation };
        } catch (error) {
            throw new Error(`Invitation failed: ${error.message}`);
        }
    }

    async acceptInvitation(token, userData) {
        try {
            // Get invitation
            const invitationResult = await db.query(`
                SELECT * FROM user_invitations 
                WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW()
            `, [token]);

            if (invitationResult.rows.length === 0) {
                throw new Error('Invalid or expired invitation');
            }

            const invitation = invitationResult.rows[0];

            // Create user
            const user = await this.createUser({
                ...userData,
                role: invitation.role,
                company_id: invitation.company_id,
                company_type: invitation.company_type,
                sendWelcomeEmail: false
            });

            // Update invitation status
            await db.query(`
                UPDATE user_invitations 
                SET status = 'accepted', accepted_at = NOW()
                WHERE id = $1
            `, [invitation.id]);

            return user;
        } catch (error) {
            throw new Error(`Accept invitation failed: ${error.message}`);
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    async findUserByEmail(email) {
        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Find user by email failed: ${error.message}`);
        }
    }

    async findUserById(id) {
        try {
            const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Find user by ID failed: ${error.message}`);
        }
    }

    async findInvitationByEmail(email) {
        try {
            const result = await db.query(`
                SELECT * FROM user_invitations 
                WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
            `, [email]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Find invitation by email failed: ${error.message}`);
        }
    }

    async findInvitationByToken(token) {
        try {
            const result = await db.query(`
                SELECT * FROM user_invitations 
                WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW()
            `, [token]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Find invitation by token failed: ${error.message}`);
        }
    }

    async getAllUsers(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const values = [];
            let paramIndex = 1;

            if (filters.role) {
                whereClause += ` AND role = $${paramIndex++}`;
                values.push(filters.role);
            }

            if (filters.company_type) {
                whereClause += ` AND company_type = $${paramIndex++}`;
                values.push(filters.company_type);
            }

            if (filters.search) {
                whereClause += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
                values.push(`%${filters.search}%`);
                paramIndex++;
            }

            const result = await db.query(`
                SELECT id, email, role, first_name, last_name, company_type, 
                       is_active, email_verified, created_at
                FROM users 
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            const countResult = await db.query(`
                SELECT COUNT(*) as total FROM users ${whereClause}
            `, values);

            return {
                users: result.rows,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(countResult.rows[0].total / limit),
                    total_items: parseInt(countResult.rows[0].total),
                    items_per_page: limit
                }
            };
        } catch (error) {
            throw new Error(`Get all users failed: ${error.message}`);
        }
    }

    async updateUser(userId, updateData) {
        try {
            const allowedFields = ['first_name', 'last_name', 'phone', 'is_active'];
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = $${paramIndex++}`);
                    values.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(userId);

            const result = await db.query(`
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex}
                RETURNING id, email, role, first_name, last_name, company_type, is_active
            `, values);

            return result.rows[0];
        } catch (error) {
            throw new Error(`Update user failed: ${error.message}`);
        }
    }

    async deleteUser(userId) {
        try {
            const result = await db.query(`
                UPDATE users 
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
                RETURNING id, email
            `, [userId]);

            return result.rows[0];
        } catch (error) {
            throw new Error(`Delete user failed: ${error.message}`);
        }
    }

    async resetPassword(email) {
        try {
            // Get user
            const userResult = await db.query(
                'SELECT id, email, first_name FROM users WHERE email = $1',
                [email]
            );

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Generate reset token
            const resetToken = require('crypto').randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Update user with reset token
            await db.query(`
                UPDATE users 
                SET reset_token = $1, reset_token_expiry = $2
                WHERE id = $3
            `, [resetToken, resetTokenExpiry, user.id]);

            // Send reset email
            await emailService.sendPasswordResetEmail(email, resetToken);

            return { success: true, message: 'Password reset email sent' };
        } catch (error) {
            throw new Error(`Password reset failed: ${error.message}`);
        }
    }

    async updatePassword(token, newPassword) {
        try {
            // Get user by reset token
            const userResult = await db.query(`
                SELECT id FROM users 
                WHERE reset_token = $1 AND reset_token_expiry > NOW()
            `, [token]);

            if (userResult.rows.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const user = userResult.rows[0];

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password and clear reset token
            await db.query(`
                UPDATE users 
                SET password = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW()
                WHERE id = $2
            `, [hashedPassword, user.id]);

            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            throw new Error(`Update password failed: ${error.message}`);
        }
    }
}

module.exports = new UserService();
