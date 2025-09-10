const SessionService = require('../services/sessionService');

// ========================================
// SESSION AUTHENTICATION MIDDLEWARE
// ========================================
const sessionAuth = async (req, res, next) => {
    try {
        // Get session ID from cookie or Authorization header
        let sessionId = null;
        
        // Check cookie first
        if (req.cookies && req.cookies.sessionId) {
            sessionId = req.cookies.sessionId;
        }
        
        // Check Authorization header as fallback
        if (!sessionId && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                sessionId = authHeader.substring(7);
            }
        }
        
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'No session found'
            });
        }
        
        // Validate session
        const sessionData = await SessionService.validateSession(sessionId);
        
        if (!sessionData) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }
        
        // Add user data to request
        req.user = sessionData.user;
        req.sessionId = sessionData.sessionId;
        
        next();
        
    } catch (error) {
        console.error('Session auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

// ========================================
// OPTIONAL SESSION AUTHENTICATION
// ========================================
const optionalSessionAuth = async (req, res, next) => {
    try {
        // Get session ID from cookie or Authorization header
        let sessionId = null;
        
        // Check cookie first
        if (req.cookies && req.cookies.sessionId) {
            sessionId = req.cookies.sessionId;
        }
        
        // Check Authorization header as fallback
        if (!sessionId && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                sessionId = authHeader.substring(7);
            }
        }
        
        if (sessionId) {
            // Validate session
            const sessionData = await SessionService.validateSession(sessionId);
            
            if (sessionData) {
                // Add user data to request
                req.user = sessionData.user;
                req.sessionId = sessionData.sessionId;
            }
        }
        
        next();
        
    } catch (error) {
        console.error('Optional session auth error:', error);
        // Don't fail for optional auth
        next();
    }
};

// ========================================
// ROLE-BASED ACCESS CONTROL
// ========================================
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

// ========================================
// ADMIN ONLY ACCESS
// ========================================
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    
    next();
};

// ========================================
// BRAND ACCESS (Admin, Brand Admin, Brand User)
// ========================================
const requireBrandAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    const allowedRoles = ['admin', 'brand_admin', 'brand_user'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Brand access required'
        });
    }
    
    next();
};

// ========================================
// RETAILER ACCESS (Admin, Retailer Admin, Retailer User)
// ========================================
const requireRetailerAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    const allowedRoles = ['admin', 'retailer_admin', 'retailer_user'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Retailer access required'
        });
    }
    
    next();
};

module.exports = {
    sessionAuth,
    optionalSessionAuth,
    requireRole,
    requireAdmin,
    requireBrandAccess,
    requireRetailerAccess
};
