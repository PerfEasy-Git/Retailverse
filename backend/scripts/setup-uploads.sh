#!/bin/bash

# Setup script for Excel upload functionality on Ubuntu production
# This script ensures proper directory structure and permissions

echo "🔧 Setting up Excel upload functionality for Ubuntu production..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DIR="$BACKEND_DIR/uploads"

echo "📁 Backend directory: $BACKEND_DIR"
echo "📁 Uploads directory: $UPLOADS_DIR"

# Create uploads directory structure
echo "📁 Creating uploads directory structure..."
mkdir -p "$UPLOADS_DIR/temp"
mkdir -p "$UPLOADS_DIR/processed"

# Set proper permissions
echo "🔐 Setting directory permissions..."
chmod 755 "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR/temp"
chmod 755 "$UPLOADS_DIR/processed"

# Set ownership (adjust user:group as needed for your setup)
# For PM2 or systemd services, you might need to adjust this
echo "👤 Setting directory ownership..."
if [ -n "$USER" ]; then
    chown -R "$USER:$USER" "$UPLOADS_DIR"
    echo "✅ Set ownership to $USER:$USER"
else
    echo "⚠️  USER environment variable not set, skipping ownership change"
fi

# Create a test file to verify permissions
echo "🧪 Testing file creation permissions..."
TEST_FILE="$UPLOADS_DIR/temp/test-permissions.txt"
if touch "$TEST_FILE" 2>/dev/null; then
    echo "✅ File creation test passed"
    rm -f "$TEST_FILE"
else
    echo "❌ File creation test failed - check permissions"
    exit 1
fi

# Check if Node.js can access the directory
echo "🔍 Verifying Node.js access..."
if node -e "const fs = require('fs'); fs.writeFileSync('$UPLOADS_DIR/temp/node-test.txt', 'test'); fs.unlinkSync('$UPLOADS_DIR/temp/node-test.txt'); console.log('✅ Node.js access verified');" 2>/dev/null; then
    echo "✅ Node.js can read/write to uploads directory"
else
    echo "❌ Node.js cannot access uploads directory"
    exit 1
fi

echo "🎉 Upload setup completed successfully!"
echo ""
echo "📋 Directory structure:"
echo "   $UPLOADS_DIR/"
echo "   ├── temp/          (temporary Excel files)"
echo "   └── processed/     (processed files - if needed)"
echo ""
echo "🔧 Next steps:"
echo "   1. Restart your Node.js application"
echo "   2. Test Excel upload functionality"
echo "   3. Monitor logs for any permission issues"
echo ""
echo "📝 Troubleshooting:"
echo "   - If uploads still fail, check your Node.js process user"
echo "   - Ensure the process has write access to the uploads directory"
echo "   - Check system logs: journalctl -u your-service-name"
