# User Management System - Complete Implementation

## 👥 Overview

Complete user management system with invitation workflow, role-based access control, and user administration.

---

## 🔧 User Management Service

### User Service Implementation
```javascript
// src/services/userService.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../database/connection');
const emailService = require('./emailService');
const { auditLogger } = require('../utils/logger');

class UserService {
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

            // Log user creation
            await auditLogger.log({
                user_id: parentUserId || user.id,
                action: 'user_created',
                resource_type: 'user',
                resource_id: user.id,
                new_values: { email: user.email, role: user.role }
            });

            return { success: true, user };
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

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

            // Create invitation record
            const result = await db.query(`
                INSERT INTO user_invitations (invited_by, email, role, company_id, company_type, 
                                            invitation_token, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [invitedBy, email, role, inviter.company_id, inviter.company_type, 
                invitationToken, expiresAt]);

            const invitationId = result.rows[0].id;

            // Send invitation email
            await emailService.sendUserInvitation({
                email,
                role,
                companyName: inviter.company_name || 'RetailVerse',
                inviterName: `${inviter.first_name} ${inviter.last_name}`,
                invitationToken
            });

            // Log invitation
            await auditLogger.log({
                user_id: invitedBy,
                action: 'user_invited',
                resource_type: 'invitation',
                resource_id: invitationId,
                new_values: { email, role }
            });

            return { success: true, invitationId };
        } catch (error) {
            throw new Error(`User invitation failed: ${error.message}`);
        }
    }

    async acceptInvitation(invitationToken, password) {
        try {
            // Find invitation
            const invitation = await this.findInvitationByToken(invitationToken);
            if (!invitation) {
                throw new Error('Invalid invitation token');
            }

            if (invitation.status !== 'pending') {
                throw new Error('Invitation has already been used or expired');
            }

            if (new Date() > invitation.expires_at) {
                throw new Error('Invitation has expired');
            }

            // Create user
            const userData = {
                email: invitation.email,
                password,
                role: invitation.role,
                companyName: invitation.company_name,
                firstName: invitation.first_name || 'User',
                lastName: invitation.last_name || 'Name',
                parentUserId: invitation.invited_by
            };

            const userResult = await this.createUser(userData);

            // Update invitation status
            await db.query(`
                UPDATE user_invitations 
                SET status = 'accepted', accepted_at = NOW()
                WHERE id = $1
            `, [invitation.id]);

            // Log invitation acceptance
            await auditLogger.log({
                user_id: userResult.user.id,
                action: 'invitation_accepted',
                resource_type: 'invitation',
                resource_id: invitation.id,
                new_values: { email: invitation.email }
            });

            return { success: true, user: userResult.user };
        } catch (error) {
            throw new Error(`Invitation acceptance failed: ${error.message}`);
        }
    }

    async getCompanyUsers(companyId, userId) {
        try {
            // Check if user has permission to view company users
            const user = await this.findUserById(userId);
            if (!user || (user.company_id !== companyId && user.role !== 'admin')) {
                throw new Error('Insufficient permissions');
            }

            const result = await db.query(`
                SELECT id, email, role, first_name, last_name, phone, is_active, 
                       email_verified, created_at, updated_at
                FROM users 
                WHERE company_id = $1 AND id != $2
                ORDER BY created_at DESC
            `, [companyId, userId]);

            return { success: true, users: result.rows };
        } catch (error) {
            throw new Error(`Failed to get company users: ${error.message}`);
        }
    }

    async updateUserStatus(userId, status, updatedBy) {
        try {
            // Check if updater has permission
            const updater = await this.findUserById(updatedBy);
            const targetUser = await this.findUserById(userId);
            
            if (!updater || !targetUser) {
                throw new Error('User not found');
            }

            // Check permissions
            if (updater.role !== 'admin' && 
                (updater.company_id !== targetUser.company_id || 
                 !['brand_admin', 'retailer_admin'].includes(updater.role))) {
                throw new Error('Insufficient permissions');
            }

            // Update user status
            await db.query(`
                UPDATE users 
                SET is_active = $1, updated_at = NOW()
                WHERE id = $2
            `, [status, userId]);

            // Log status update
            await auditLogger.log({
                user_id: updatedBy,
                action: 'user_status_updated',
                resource_type: 'user',
                resource_id: userId,
                old_values: { is_active: targetUser.is_active },
                new_values: { is_active: status }
            });

            return { success: true };
        } catch (error) {
            throw new Error(`Failed to update user status: ${error.message}`);
        }
    }

    async updateUserProfile(userId, profileData) {
        try {
            const { first_name, last_name, phone } = profileData;
            
            const result = await db.query(`
                UPDATE users 
                SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
                WHERE id = $4
                RETURNING id, email, role, first_name, last_name, phone, company_id, company_type
            `, [first_name, last_name, phone, userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            // Log profile update
            await auditLogger.log({
                user_id: userId,
                action: 'profile_updated',
                resource_type: 'user',
                resource_id: userId,
                new_values: { first_name, last_name, phone }
            });

            return { success: true, user: result.rows[0] };
        } catch (error) {
            throw new Error(`Failed to update profile: ${error.message}`);
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get user with password
            const result = await db.query(`
                SELECT id, password FROM users WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            await db.query(`
                UPDATE users 
                SET password = $1, updated_at = NOW()
                WHERE id = $2
            `, [hashedNewPassword, userId]);

            // Log password change
            await auditLogger.log({
                user_id: userId,
                action: 'password_changed',
                resource_type: 'user',
                resource_id: userId
            });

            return { success: true };
        } catch (error) {
            throw new Error(`Failed to change password: ${error.message}`);
        }
    }

    async deleteUser(userId, deletedBy) {
        try {
            // Check if deleter has permission
            const deleter = await this.findUserById(deletedBy);
            const targetUser = await this.findUserById(userId);
            
            if (!deleter || !targetUser) {
                throw new Error('User not found');
            }

            // Check permissions
            if (deleter.role !== 'admin' && 
                (deleter.company_id !== targetUser.company_id || 
                 !['brand_admin', 'retailer_admin'].includes(deleter.role))) {
                throw new Error('Insufficient permissions');
            }

            // Check if user has child users
            const childUsers = await db.query(`
                SELECT COUNT(*) as count FROM users WHERE parent_user_id = $1
            `, [userId]);

            if (parseInt(childUsers.rows[0].count) > 0) {
                throw new Error('Cannot delete user with child users');
            }

            // Soft delete user (deactivate)
            await db.query(`
                UPDATE users 
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
            `, [userId]);

            // Log user deletion
            await auditLogger.log({
                user_id: deletedBy,
                action: 'user_deleted',
                resource_type: 'user',
                resource_id: userId,
                old_values: { email: targetUser.email, role: targetUser.role }
            });

            return { success: true };
        } catch (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    async findUserByEmail(email) {
        const result = await db.query(`
            SELECT id, email, password, role, company_id, company_type, parent_user_id,
                   first_name, last_name, phone, is_active, email_verified, created_at, updated_at
            FROM users WHERE email = $1
        `, [email]);
        return result.rows[0] || null;
    }

    async findUserById(id) {
        const result = await db.query(`
            SELECT id, email, role, company_id, company_type, parent_user_id,
                   first_name, last_name, phone, is_active, email_verified, created_at, updated_at
            FROM users WHERE id = $1
        `, [id]);
        return result.rows[0] || null;
    }

    async findInvitationByEmail(email) {
        const result = await db.query(`
            SELECT * FROM user_invitations WHERE email = $1 AND status = 'pending'
        `, [email]);
        return result.rows[0] || null;
    }

    async findInvitationByToken(token) {
        const result = await db.query(`
            SELECT ui.*, u.first_name, u.last_name, u.company_name
            FROM user_invitations ui
            JOIN users u ON ui.invited_by = u.id
            WHERE ui.invitation_token = $1
        `, [token]);
        return result.rows[0] || null;
    }

    async getInvitationStatus(token) {
        const invitation = await this.findInvitationByToken(token);
        if (!invitation) {
            return { valid: false, error: 'Invalid invitation token' };
        }

        if (invitation.status !== 'pending') {
            return { valid: false, error: 'Invitation has already been used' };
        }

        if (new Date() > invitation.expires_at) {
            return { valid: false, error: 'Invitation has expired' };
        }

        return { 
            valid: true, 
            invitation: {
                email: invitation.email,
                role: invitation.role,
                company_name: invitation.company_name,
                inviter_name: `${invitation.first_name} ${invitation.last_name}`,
                expires_at: invitation.expires_at
            }
        };
    }
}

module.exports = new UserService();
```

---

## 🔧 User Management API Routes

### User Routes
```javascript
// src/routes/users.js
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const userService = require('../services/userService');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await userService.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update user profile
router.put('/profile', 
    authenticate,
    [
        body('first_name').notEmpty().trim(),
        body('last_name').notEmpty().trim(),
        body('phone').optional().isMobilePhone()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const result = await userService.updateUserProfile(req.user.id, req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Change password
router.put('/change-password',
    authenticate,
    [
        body('current_password').notEmpty(),
        body('new_password').isLength({ min: 6 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { current_password, new_password } = req.body;
            const result = await userService.changePassword(req.user.id, current_password, new_password);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get company users (for admins)
router.get('/company-users',
    authenticate,
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    async (req, res) => {
        try {
            const result = await userService.getCompanyUsers(req.user.company_id, req.user.id);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update user status (for admins)
router.put('/:userId/status',
    authenticate,
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    [
        body('is_active').isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { is_active } = req.body;
            const result = await userService.updateUserStatus(req.params.userId, is_active, req.user.id);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Delete user (for admins)
router.delete('/:userId',
    authenticate,
    requireRole(['brand_admin', 'retailer_admin', 'admin']),
    async (req, res) => {
        try {
            const result = await userService.deleteUser(req.params.userId, req.user.id);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
```

### Invitation Routes
```javascript
// src/routes/invitations.js
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const userService = require('../services/userService');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Send user invitation
router.post('/send',
    authenticate,
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
            const invitationData = {
                ...req.body,
                invitedBy: req.user.id
            };
            
            const result = await userService.inviteUser(invitationData);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get invitation status
router.get('/status/:token', async (req, res) => {
    try {
        const result = await userService.getInvitationStatus(req.params.token);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Accept invitation
router.post('/accept/:token',
    [
        body('password').isLength({ min: 6 })
    ],
    validateRequest,
    async (req, res) => {
        try {
            const result = await userService.acceptInvitation(req.params.token, req.body.password);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
```

---

## 🎨 Frontend User Management Components

### User Management Component
```jsx
// src/components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { getCompanyUsers, updateUserStatus, deleteUser, inviteUser } from '../services/userService';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role: 'brand_user',
        first_name: '',
        last_name: ''
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await getCompanyUsers();
            if (response.success) {
                setUsers(response.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteUser = async (e) => {
        e.preventDefault();
        try {
            const response = await inviteUser(inviteForm);
            if (response.success) {
                alert('Invitation sent successfully!');
                setShowInviteForm(false);
                setInviteForm({ email: '', role: 'brand_user', first_name: '', last_name: '' });
                loadUsers();
            }
        } catch (error) {
            alert('Failed to send invitation: ' + error.message);
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            const response = await updateUserStatus(userId, !currentStatus);
            if (response.success) {
                loadUsers();
            }
        } catch (error) {
            alert('Failed to update user status: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
            try {
                const response = await deleteUser(userId);
                if (response.success) {
                    loadUsers();
                }
            } catch (error) {
                alert('Failed to delete user: ' + error.message);
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">User Management</h2>
                <button
                    onClick={() => setShowInviteForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Invite User
                </button>
            </div>

            {showInviteForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
                        <form onSubmit={handleInviteUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="brand_user">Brand User</option>
                                    <option value="retailer_user">Retailer User</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteForm.first_name}
                                        onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteForm.last_name}
                                        onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Send Invitation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteForm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {users.map((user) => (
                        <li key={user.id} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user.first_name} {user.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                        <div className="text-sm text-gray-500">
                                            Role: {user.role.replace('_', ' ').toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    
                                    <button
                                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                        className={`px-3 py-1 text-xs rounded-md ${
                                            user.is_active
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UserManagement;
```

### Accept Invitation Component
```jsx
// src/components/AcceptInvitation.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvitationStatus, acceptInvitation } from '../services/userService';

const AcceptInvitation = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [invitation, setInvitation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            const response = await getInvitationStatus(token);
            if (response.valid) {
                setInvitation(response.invitation);
            } else {
                setError(response.error);
            }
        } catch (error) {
            setError('Failed to load invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvitation = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            const response = await acceptInvitation(token, password);
            if (response.success) {
                alert('Account created successfully! You can now login.');
                navigate('/login');
            }
        } catch (error) {
            setError(error.message);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-red-600">Invalid Invitation</h2>
                        <p className="mt-2 text-gray-600">{error}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Accept Invitation
                    </h2>
                    <div className="mt-4 text-center">
                        <p className="text-gray-600">
                            You've been invited to join <strong>{invitation.company_name}</strong> as a{' '}
                            <strong>{invitation.role.replace('_', ' ').toUpperCase()}</strong>
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Email: {invitation.email}
                        </p>
                    </div>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleAcceptInvitation}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-center">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Accept Invitation
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvitation;
```

---

## 🔧 User Service API (Frontend)

### User Service API
```javascript
// src/services/userService.js (Frontend)
import api from './api';

export const getCompanyUsers = async () => {
    try {
        const response = await api.get('/users/company-users');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to get company users');
    }
};

export const updateUserStatus = async (userId, isActive) => {
    try {
        const response = await api.put(`/users/${userId}/status`, { is_active: isActive });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to update user status');
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to delete user');
    }
};

export const inviteUser = async (invitationData) => {
    try {
        const response = await api.post('/invitations/send', invitationData);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to send invitation');
    }
};

export const getInvitationStatus = async (token) => {
    try {
        const response = await api.get(`/invitations/status/${token}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to get invitation status');
    }
};

export const acceptInvitation = async (token, password) => {
    try {
        const response = await api.post(`/invitations/accept/${token}`, { password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to accept invitation');
    }
};

export const updateProfile = async (profileData) => {
    try {
        const response = await api.put('/users/profile', profileData);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
};

export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await api.put('/users/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to change password');
    }
};
```

---

## 🧪 User Management Testing

### User Service Tests
```javascript
// tests/services/userService.test.js
const userService = require('../../src/services/userService');

describe('UserService', () => {
    test('should create user successfully', async () => {
        const userData = {
            email: 'test@example.com',
            password: 'password123',
            role: 'brand_user',
            companyName: 'Test Company',
            firstName: 'John',
            lastName: 'Doe'
        };

        const result = await userService.createUser(userData);
        expect(result.success).toBe(true);
        expect(result.user.email).toBe(userData.email);
    });

    test('should send user invitation', async () => {
        const invitationData = {
            email: 'newuser@example.com',
            role: 'brand_user',
            firstName: 'Jane',
            lastName: 'Smith',
            invitedBy: 1
        };

        const result = await userService.inviteUser(invitationData);
        expect(result.success).toBe(true);
        expect(result.invitationId).toBeDefined();
    });

    test('should accept invitation', async () => {
        const result = await userService.acceptInvitation('valid_token', 'password123');
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
    });

    test('should update user status', async () => {
        const result = await userService.updateUserStatus(1, false, 2);
        expect(result.success).toBe(true);
    });
});
```

---

**User management system is now complete with invitation workflow, role-based access control, and comprehensive user administration.**
