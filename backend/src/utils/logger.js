const winston = require('winston');
const { db } = require('../database/connection');

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
