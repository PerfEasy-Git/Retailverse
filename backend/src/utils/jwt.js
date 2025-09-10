const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTManager {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.refreshSecret = process.env.JWT_REFRESH_SECRET;
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }

    generateAccessToken(payload) {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'retailverse',
            audience: 'retailverse-users'
        });
    }

    generateRefreshToken(payload) {
        return jwt.sign(payload, this.refreshSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: 'retailverse',
            audience: 'retailverse-users'
        });
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.secret, {
                issuer: 'retailverse',
                audience: 'retailverse-users'
            });
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshSecret, {
                issuer: 'retailverse',
                audience: 'retailverse-users'
            });
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    generateTokenPair(user) {
        const payload = {
            user_id: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            company_type: user.company_type
        };

        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }

    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateEmailVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = new JWTManager();
