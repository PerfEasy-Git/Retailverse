const express = require('express');
const { db } = require('../database/connection');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// ========================================
// GET SYSTEM STATISTICS
// ========================================
router.get('/stats',
    requireRole(['admin']),
    async (req, res) => {
        try {
            // Get counts for all entities
            const [
                usersCount,
                brandsCount,
                retailersCount,
                productsCount,
                uploadsCount,
                invitationsCount
            ] = await Promise.all([
                db.query('SELECT COUNT(*) as count FROM users'),
                db.query('SELECT COUNT(*) as count FROM brands'),
                db.query('SELECT COUNT(*) as count FROM retailers'),
                db.query('SELECT COUNT(*) as count FROM products'),
                db.query('SELECT COUNT(*) as count FROM file_uploads'),
                db.query('SELECT COUNT(*) as count FROM user_invitations')
            ]);

            // Get recent activity
            const recentUsers = await db.query(`
                SELECT id, email, role, first_name, last_name, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 5
            `);

            const recentUploads = await db.query(`
                SELECT id, filename, status, records_processed, created_at
                FROM file_uploads
                ORDER BY created_at DESC
                LIMIT 5
            `);

            res.json({
                success: true,
                data: {
                    statistics: {
                        total_users: parseInt(usersCount.rows[0].count),
                        total_brands: parseInt(brandsCount.rows[0].count),
                        total_retailers: parseInt(retailersCount.rows[0].count),
                        total_products: parseInt(productsCount.rows[0].count),
                        total_uploads: parseInt(uploadsCount.rows[0].count),
                        total_invitations: parseInt(invitationsCount.rows[0].count)
                    },
                    recent_activity: {
                        recent_users: recentUsers.rows,
                        recent_uploads: recentUploads.rows
                    }
                }
            });

        } catch (error) {
            console.error('Get admin stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get system statistics'
            });
        }
    }
);

// ========================================
// GET ANALYTICS DATA
// ========================================
router.get('/analytics',
    requireRole(['admin']),
    async (req, res) => {
        try {
            // Get user growth over time
            const userGrowth = await db.query(`
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as new_users
                FROM users
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
            `);

            // Get role distribution
            const roleDistribution = await db.query(`
                SELECT role, COUNT(*) as count
                FROM users
                GROUP BY role
            `);

            // Get company type distribution
            const companyDistribution = await db.query(`
                SELECT company_type, COUNT(*) as count
                FROM users
                WHERE company_type IS NOT NULL
                GROUP BY company_type
            `);

            // Get recent activity
            const recentActivity = await db.query(`
                SELECT 
                    al.action,
                    al.resource_type,
                    al.created_at,
                    u.email as user_email
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    userGrowth: userGrowth.rows,
                    roleDistribution: roleDistribution.rows,
                    companyDistribution: companyDistribution.rows,
                    recentActivity: recentActivity.rows
                }
            });

        } catch (error) {
            console.error('Analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics data'
            });
        }
    }
);

// ========================================
// GET ALL USERS (ADMIN ONLY)
// ========================================
router.get('/users',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, role, is_active } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone,
                       u.is_active, u.email_verified, u.created_at, u.updated_at,
                       b.brand_name, r.retailer_name
                FROM users u
                LEFT JOIN brands b ON u.company_id = b.id AND u.company_type = 'brand'
                LEFT JOIN retailers r ON u.company_id = r.id AND u.company_type = 'retailer'
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (role) {
                query += ` AND u.role = $${paramIndex++}`;
                params.push(role);
            }

            if (is_active !== undefined) {
                query += ` AND u.is_active = $${paramIndex++}`;
                params.push(is_active === 'true');
            }

            query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
            const countParams = [];
            let countParamIndex = 1;

            if (role) {
                countQuery += ` AND role = $${countParamIndex++}`;
                countParams.push(role);
            }

            if (is_active !== undefined) {
                countQuery += ` AND is_active = $${countParamIndex++}`;
                countParams.push(is_active === 'true');
            }

            const countResult = await db.query(countQuery, countParams);

            res.json({
                success: true,
                data: {
                    users: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get users'
            });
        }
    }
);

// ========================================
// GET AUDIT LOGS
// ========================================
router.get('/audit-logs',
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, user_id, action, start_date, end_date } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT al.*, u.email, u.first_name, u.last_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (user_id) {
                query += ` AND al.user_id = $${paramIndex++}`;
                params.push(user_id);
            }

            if (action) {
                query += ` AND al.action = $${paramIndex++}`;
                params.push(action);
            }

            if (start_date) {
                query += ` AND al.created_at >= $${paramIndex++}`;
                params.push(start_date);
            }

            if (end_date) {
                query += ` AND al.created_at <= $${paramIndex++}`;
                params.push(end_date);
            }

            query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
            const countParams = [];
            let countParamIndex = 1;

            if (user_id) {
                countQuery += ` AND user_id = $${countParamIndex++}`;
                countParams.push(user_id);
            }

            if (action) {
                countQuery += ` AND action = $${countParamIndex++}`;
                countParams.push(action);
            }

            if (start_date) {
                countQuery += ` AND created_at >= $${countParamIndex++}`;
                countParams.push(start_date);
            }

            if (end_date) {
                countQuery += ` AND created_at <= $${countParamIndex++}`;
                countParams.push(end_date);
            }

            const countResult = await db.query(countQuery, countParams);

            res.json({
                success: true,
                data: {
                    audit_logs: result.rows,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(countResult.rows[0].total / limit),
                        total_items: parseInt(countResult.rows[0].total),
                        items_per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get audit logs'
            });
        }
    }
);

module.exports = router;
