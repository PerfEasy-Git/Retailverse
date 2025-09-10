# Deployment Guide - Production Ready Implementation

## 🚀 Overview

This guide provides step-by-step instructions for deploying the RetailVerse platform in a production environment.

---

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Software Requirements
- **Node.js**: v18.0.0+
- **PostgreSQL**: v15.0+
- **Nginx**: v1.18+ (for reverse proxy)
- **PM2**: For process management
- **Git**: For code deployment

---

## 🗄️ Database Setup

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE retailverse;
CREATE USER retailverse_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE retailverse TO retailverse_user;
\q
```

### 3. Run Database Migrations
```bash
# Navigate to backend directory
cd retailverse/backend

# Install dependencies
npm install

# Run database setup
npm run migrate

# Insert master data
psql -h localhost -U retailverse_user -d retailverse -f src/database/seed_data.sql
```

---

## 🔧 Backend Deployment

### 1. Environment Configuration
```bash
# Create environment file
cd retailverse/backend
cp .env.example .env

# Edit environment variables
nano .env
```

**Environment Variables**:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retailverse
DB_USER=retailverse_user
DB_PASSWORD=secure_password_here

# JWT
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# Server
PORT=1200
NODE_ENV=production

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 2. Install Dependencies
```bash
cd retailverse/backend
npm install --production
```

### 3. Build and Start with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'retailverse-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 🎨 Frontend Deployment

### 1. Build Frontend
```bash
cd retailverse/frontend
npm install
npm run build
```

### 2. Configure Nginx
```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/retailverse
```

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/retailverse/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:1200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /path/to/retailverse/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Site and Restart Nginx
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/retailverse /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔒 SSL Certificate Setup

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Auto-renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📁 File Structure Setup

### 1. Create Required Directories
```bash
# Create uploads directory
mkdir -p /path/to/retailverse/backend/uploads
chmod 755 /path/to/retailverse/backend/uploads

# Create logs directory
mkdir -p /path/to/retailverse/backend/logs
chmod 755 /path/to/retailverse/backend/logs
```

### 2. Set Permissions
```bash
# Set ownership
sudo chown -R www-data:www-data /path/to/retailverse/frontend/dist
sudo chown -R node:node /path/to/retailverse/backend

# Set permissions
sudo chmod -R 755 /path/to/retailverse/frontend/dist
sudo chmod -R 755 /path/to/retailverse/backend
```

---

## 🔧 Production Optimizations

### 1. Database Optimizations
```sql
-- Connect to database
psql -h localhost -U retailverse_user -d retailverse

-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

### 2. Node.js Optimizations
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable cluster mode in PM2
pm2 start ecosystem.config.js --instances max
```

### 3. Nginx Optimizations
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 📊 Monitoring Setup

### 1. PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View logs
pm2 logs retailverse-backend

# Monitor status
pm2 status
pm2 monit
```

### 2. Database Monitoring
```bash
# Install pgAdmin or use command line
psql -h localhost -U retailverse_user -d retailverse

# Check database size
SELECT pg_size_pretty(pg_database_size('retailverse'));

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. System Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop

# Monitor system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

---

## 🔄 Backup Strategy

### 1. Database Backup
```bash
# Create backup script
cat > backup_db.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U retailverse_user -d retailverse > $BACKUP_DIR/retailverse_$DATE.sql
gzip $BACKUP_DIR/retailverse_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "retailverse_*.sql.gz" -mtime +7 -delete
EOF

chmod +x backup_db.sh

# Add to crontab for daily backups
crontab -e
# Add this line:
0 2 * * * /path/to/backup_db.sh
```

### 2. File Backup
```bash
# Create file backup script
cat > backup_files.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
mkdir -p $BACKUP_DIR

tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /path/to/retailverse/backend/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup_files.sh
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U retailverse_user -d retailverse -c "SELECT 1;"

# Check firewall
sudo ufw status
```

#### 2. Application Issues
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs retailverse-backend

# Restart application
pm2 restart retailverse-backend
```

#### 3. Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Database created and configured
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] SSL certificate obtained
- [ ] Nginx configured
- [ ] File permissions set

### Post-Deployment
- [ ] Application starts successfully
- [ ] Database connections working
- [ ] File uploads working
- [ ] SSL certificate valid
- [ ] Monitoring setup
- [ ] Backup scripts configured
- [ ] Performance optimized

### Testing
- [ ] User registration/login
- [ ] File upload functionality
- [ ] FIT score calculation
- [ ] All API endpoints working
- [ ] Frontend loads correctly
- [ ] Mobile responsiveness

---

## 🔄 Update Procedure

### 1. Code Updates
```bash
# Pull latest code
cd /path/to/retailverse
git pull origin main

# Update backend
cd backend
npm install
pm2 restart retailverse-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### 2. Database Updates
```bash
# Run migrations
cd backend
npm run migrate

# Check for any new seed data
psql -h localhost -U retailverse_user -d retailverse -f src/database/seed_data.sql
```

---

**Production deployment is now complete! The system is ready for use.**
