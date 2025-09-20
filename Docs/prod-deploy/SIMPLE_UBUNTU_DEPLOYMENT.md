

cd /home/retailverse/app
git pull origin main

pm2 stop retailverse

cd backend && npm install && cd ..
cd frontend && npm install && cd ..

cd frontend && npm run build && cd ..

pm2 start backend/server.js --name "retailverse"
pm2 save

curl https://retailverse.perfeasy.com/api/health

# Simple Ubuntu Deployment Guide

## 🎯 **What You Need**
- Ubuntu server with SSH access
- Domain name (optional)
- Your code in GitHub repository

## 🚀 **Step 1: Install Required Software on Ubuntu**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

## 🚀 **Step 2: Create Database**

**Note**: This deployment uses the existing PostgreSQL user `intelliscript` with password `Perfeasy1`.

```bash
# Switch to postgres user
sudo su - postgres

# Create database
psql -c "CREATE DATABASE retailverse;"

# Grant privileges to existing user
psql -c "GRANT ALL PRIVILEGES ON DATABASE retailverse TO intelliscript;"
psql -c "GRANT ALL PRIVILEGES ON SCHEMA public TO intelliscript;"

# Exit postgres user
exit
```

## 🚀 **Step 2.1: Setup Database Schema**

```bash
# Switch to postgres user
sudo su - postgres

# Connect to the database and run schema
psql -d retailverse -f /home/retailverse/app/backend/src/database/001_create_complete_schema.sql

# Exit postgres user
exit
```

## 🚀 **Step 3: Setup Application**

```bash
# Create app directory
sudo mkdir -p /home/retailverse/app
sudo chown retailverse:retailverse /home/retailverse/app

# Switch to retailverse user (or create if doesn't exist)
sudo adduser retailverse
sudo su - retailverse

# Go to app directory
cd /home/retailverse/app

# Clone your code
git clone https://github.com/PerfEasy-Git/Retailverse.git .

# Install dependencies
npm install
cd frontend && npm install && cd ..
```

## 🚀 **Step 4: Create Environment File**

```bash
# Create production environment file
nano .env.production
```

**Add this content:**
```env
NODE_ENV=production
PORT=1200
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retailverse
DB_USER=intelliscript
DB_PASSWORD=Perfeasy1
SESSION_SECRET=your_secret_key_here
FRONTEND_URL=http://your-domain.com
```

## 🚀 **Step 5: Build and Start Application**

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Start with PM2
pm2 start server.js --name "retailverse"
pm2 save
pm2 startup
```

## 🚀 **Step 6: Setup Nginx**

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/retailverse
```

**Add this content:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /home/retailverse/app/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:1200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/retailverse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🚀 **Step 7: Setup SSL (Optional)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## ✅ **Deployment Complete!**

Your application is now running at:
- **HTTP**: http://your-domain.com
- **HTTPS**: https://your-domain.com (if SSL setup)

## 🔄 **How to Update Your Code**

```bash
# SSH into server
ssh your-username@your-server-ip

# Switch to retailverse user
sudo su - retailverse

# Go to app directory
cd /home/retailverse/app

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Restart application
pm2 restart retailverse
```

## 🔧 **Useful Commands**

```bash
# Check application status
pm2 status

# View logs
pm2 logs retailverse

# Restart application
pm2 restart retailverse

# Check Nginx status
sudo systemctl status nginx

# Check if app is running
curl http://localhost:1200/health
```

## 🚨 **Troubleshooting**

**If application won't start:**
```bash
pm2 logs retailverse
```

**If Nginx gives 502 error:**
```bash
sudo systemctl status nginx
curl http://localhost:1200/health
```

**If database connection fails:**
```bash
sudo -u postgres psql -c "SELECT 1;"
```

---

**That's it! Simple and straightforward deployment.**
