const { db } = require('../database/connection');
const crypto = require('crypto');

class SessionService {
    // ========================================
    // CREATE SESSION
    // ========================================
    static async createSession(userId, req) {
        try {
            // Generate unique session ID
            const sessionId = crypto.randomBytes(32).toString('hex');
            
            // Set session expiry (24 hours from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            // Get client info
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent') || '';
            
            // Insert session into database
            const result = await db.query(`
                INSERT INTO sessions (session_id, user_id, expires_at, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [sessionId, userId, expiresAt, ipAddress, userAgent]);
            
            return result.rows[0];
            
        } catch (error) {
            console.error('Create session error:', error);
            throw error;
        }
    }
    
    // ========================================
    // VALIDATE SESSION
    // ========================================
    static async validateSession(sessionId) {
        try {
            console.log('🔍 SessionService.validateSession called with sessionId:', sessionId);
            
            const result = await db.query(`
                SELECT 
                    s.*,
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.role,
                    u.company_id,
                    u.company_type,
                    u.is_active as user_active
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_id = $1 
                AND s.is_active = true 
                AND s.expires_at > CURRENT_TIMESTAMP
                AND u.is_active = true
            `, [sessionId]);
            
            console.log('📊 Session query result:', result.rows.length, 'rows found');
            
            if (result.rows.length === 0) {
                console.log('❌ No valid session found for sessionId:', sessionId);
                return null;
            }
            
            const session = result.rows[0];
            
            // Update session timestamp
            await this.updateSessionTimestamp(sessionId);
            
            const userData = {
                id: session.user_id,
                email: session.email,
                first_name: session.first_name,
                last_name: session.last_name,
                role: session.role,
                company_id: session.company_id,
                company_type: session.company_type
            };
            
            console.log('✅ Session validated successfully - User:', userData);
            
            return {
                sessionId: session.session_id,
                user: userData
            };
            
        } catch (error) {
            console.error('Validate session error:', error);
            throw error;
        }
    }
    
    // ========================================
    // UPDATE SESSION TIMESTAMP
    // ========================================
    static async updateSessionTimestamp(sessionId) {
        try {
            await db.query(`
                UPDATE sessions 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE session_id = $1 AND is_active = true
            `, [sessionId]);
        } catch (error) {
            console.error('Update session timestamp error:', error);
            // Don't throw error for timestamp update failures
        }
    }
    
    // ========================================
    // DESTROY SESSION
    // ========================================
    static async destroySession(sessionId) {
        try {
            await db.query(`
                UPDATE sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = $1
            `, [sessionId]);
        } catch (error) {
            console.error('Destroy session error:', error);
            throw error;
        }
    }
    
    // ========================================
    // DESTROY ALL USER SESSIONS
    // ========================================
    static async destroyAllUserSessions(userId) {
        try {
            await db.query(`
                UPDATE sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND is_active = true
            `, [userId]);
        } catch (error) {
            console.error('Destroy all user sessions error:', error);
            throw error;
        }
    }
    
    // ========================================
    // CLEANUP EXPIRED SESSIONS
    // ========================================
    static async cleanupExpiredSessions() {
        try {
            const result = await db.query(`
                UPDATE sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE expires_at <= CURRENT_TIMESTAMP AND is_active = true
                RETURNING COUNT(*)
            `);
            
            console.log(`Cleaned up ${result.rows.length} expired sessions`);
            return result.rows.length;
        } catch (error) {
            console.error('Cleanup expired sessions error:', error);
            throw error;
        }
    }
    
    // ========================================
    // GET USER SESSIONS
    // ========================================
    static async getUserSessions(userId) {
        try {
            const result = await db.query(`
                SELECT 
                    session_id,
                    created_at,
                    updated_at,
                    expires_at,
                    ip_address,
                    user_agent,
                    is_active
                FROM sessions
                WHERE user_id = $1
                ORDER BY updated_at DESC
            `, [userId]);
            
            return result.rows;
        } catch (error) {
            console.error('Get user sessions error:', error);
            throw error;
        }
    }
    
    // ========================================
    // EXTEND SESSION
    // ========================================
    static async extendSession(sessionId, hours = 24) {
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + hours);
            
            await db.query(`
                UPDATE sessions 
                SET expires_at = $1, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = $2 AND is_active = true
            `, [expiresAt, sessionId]);
        } catch (error) {
            console.error('Extend session error:', error);
            throw error;
        }
    }
}

module.exports = SessionService;
