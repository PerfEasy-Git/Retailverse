const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const brandRoutes = require('./routes/brands');
const retailerRoutes = require('./routes/retailers');
const productRoutes = require('./routes/products');
const fitScoreRoutes = require('./routes/fitScores');
const uploadRoutes = require('./routes/uploads');
const invitationRoutes = require('./routes/invitations');
const adminRoutes = require('./routes/admin');
const discoveryRoutes = require('./routes/discovery');
const categoriesRoutes = require('./routes/categories');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { sessionAuth } = require('./middleware/sessionAuth');

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:1211',
            'http://localhost:1200',
            'http://localhost:1211'
        ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Cookie parser
app.use(cookieParser());

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Temporarily increased for testing
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting
app.use(generalLimiter);

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// REQUEST LOGGING MIDDLEWARE
// ========================================
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// ROUTES
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'RetailVerse API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', sessionAuth, userRoutes);
app.use('/api/brands', sessionAuth, brandRoutes);
app.use('/api/retailers', sessionAuth, retailerRoutes);
app.use('/api/products', sessionAuth, productRoutes);
app.use('/api/fit-scores', sessionAuth, fitScoreRoutes);
app.use('/api/uploads', sessionAuth, uploadRoutes);
app.use('/api/invitations', sessionAuth, invitationRoutes);
app.use('/api/admin', sessionAuth, adminRoutes);
app.use('/api/discovery', sessionAuth, discoveryRoutes);
app.use('/api/categories', categoriesRoutes);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================
app.use(errorHandler);

// ========================================
// 404 HANDLER
// ========================================
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = app;
