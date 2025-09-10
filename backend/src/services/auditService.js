const { db } = require('../database/connection');

class AuditService {
    static async logAction(userId, action, resourceType, resourceId, oldValues, newValues, req) {
        try {
            const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
            const userAgent = req?.get('User-Agent') || 'unknown';

            await db.query(`
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id,
                    old_values, new_values, ip_address, user_agent, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
                userId,
                action,
                resourceType,
                resourceId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress,
                userAgent
            ]);
        } catch (error) {
            console.error('Audit logging error:', error);
            // Don't throw error to avoid breaking main functionality
        }
    }

    static async getAuditLogs(filters = {}) {
        try {
            let query = `
                SELECT 
                    al.*,
                    u.email as user_email,
                    u.first_name,
                    u.last_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 0;

            if (filters.userId) {
                paramCount++;
                query += ` AND al.user_id = $${paramCount}`;
                params.push(filters.userId);
            }

            if (filters.action) {
                paramCount++;
                query += ` AND al.action ILIKE $${paramCount}`;
                params.push(`%${filters.action}%`);
            }

            if (filters.resourceType) {
                paramCount++;
                query += ` AND al.resource_type = $${paramCount}`;
                params.push(filters.resourceType);
            }

            if (filters.startDate) {
                paramCount++;
                query += ` AND al.created_at >= $${paramCount}`;
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                paramCount++;
                query += ` AND al.created_at <= $${paramCount}`;
                params.push(filters.endDate);
            }

            query += ` ORDER BY al.created_at DESC`;

            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Get audit logs error:', error);
            throw error;
        }
    }

    static async getAuditStats() {
        try {
            const result = await db.query(`
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as logs_24h,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as logs_7d
                FROM audit_logs
            `);

            return result.rows[0];
        } catch (error) {
            console.error('Get audit stats error:', error);
            throw error;
        }
    }
}

module.exports = AuditService;
