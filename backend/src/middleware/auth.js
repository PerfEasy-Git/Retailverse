const jwt = require('jsonwebtoken');
const { db } = require('../database/connection');

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists and is active
        const result = await db.query(
            'SELECT id, email, role, company_id, company_type, first_name, last_name, is_active FROM users WHERE id = $1',
            [decoded.user_id]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Add user info to request
        req.user = result.rows[0];
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
