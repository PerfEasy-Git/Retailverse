require('dotenv').config();
const app = require('./src/app');
const { db } = require('./src/database/connection');

const PORT = process.env.PORT || 1200;

// ========================================
// START SERVER
// ========================================
const startServer = async () => {
    try {
        // Test database connection
        await db.query('SELECT NOW()');
        console.log('✅ Database connected successfully');

        // Start server
        app.listen(PORT, () => {
            console.log('🚀 RetailVerse API Server Started');
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
            console.log('=====================================');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

// ========================================
// UNHANDLED ERRORS
// ========================================
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();