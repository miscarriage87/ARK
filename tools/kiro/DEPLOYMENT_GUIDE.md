# 🚀 ARK Digital Calendar - Deployment Guide

Comprehensive guide for deploying the ARK Digital Calendar application in various environments.

## 📋 Pre-Deployment Checklist

### ✅ System Validation

Before deployment, ensure all systems are functioning correctly:

```bash
# 1. Run comprehensive diagnostics
cd backend-node
node run-diagnostics.js --save --verbose

# 2. Execute all test suites
npm test

cd ../frontend
npm test

# 3. Run PWA validation tests
node test-install-prompt.cjs
node test-sw-registration.cjs
node test-offline-sync.cjs

# 4. Execute end-to-end integration tests
cd ../backend-node
node e2e-integration-test.js
```

### 📊 Expected Test Results

- **Backend Tests**: 35+ tests should pass (85%+ success rate)
- **Frontend Tests**: 39+ tests should pass (91%+ success rate)
- **PWA Tests**: All tests should pass (100%)
- **Diagnostics**: Status should be "healthy" or "issues" (not "critical")

## 🏠 Local Development Deployment

### Quick Start
```bash
# Simple one-click start
SIMPLE-START.bat
```

### Manual Start
```bash
# Install dependencies
cd backend-node
npm install

cd ../frontend
npm install

# Start backend server
cd ../backend-node
node server.js

# Frontend is served by backend at http://localhost:8000/app
```

### Environment Configuration
Create `backend-node/.env`:
```env
PORT=8000
OPENAI_API_KEY=your-openai-api-key-here
ENABLE_AI_GENERATION=true
NODE_ENV=development
```

## 🌐 Production Deployment

### 1. Server Preparation

#### System Requirements
- **OS**: Windows Server 2019+, Ubuntu 20.04+, or CentOS 8+
- **Node.js**: v18 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 1GB minimum, 5GB recommended
- **Network**: HTTPS capability required for PWA features

#### Install Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx certbot

# CentOS/RHEL
sudo yum install nodejs npm nginx certbot

# Windows Server
# Install Node.js from nodejs.org
# Install IIS or use Node.js directly
```

### 2. Application Setup

```bash
# Clone/copy application files
git clone <repository-url> ark-calendar
cd ark-calendar/tools/kiro

# Install production dependencies
cd backend-node
npm install --production

cd ../frontend
npm install --production

# Build frontend assets (if needed)
npm run build
```

### 3. Environment Configuration

Create production `.env` file:
```env
PORT=3000
NODE_ENV=production
OPENAI_API_KEY=your-production-openai-key
ENABLE_AI_GENERATION=true
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### 4. Process Management

#### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ark-calendar',
    script: 'server.js',
    cwd: './backend-node',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Using systemd (Linux)
```bash
# Create service file
sudo tee /etc/systemd/system/ark-calendar.service << EOF
[Unit]
Description=ARK Digital Calendar
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/ark-calendar/tools/kiro/backend-node
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable ark-calendar
sudo systemctl start ark-calendar
sudo systemctl status ark-calendar
```

### 5. Reverse Proxy Configuration

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers for PWA
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # PWA specific headers
    location /manifest.json {
        add_header Cache-Control "public, max-age=86400";
        add_header Content-Type "application/manifest+json";
        proxy_pass http://localhost:3000;
    }

    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        proxy_pass http://localhost:3000;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        add_header Cache-Control "public, max-age=31536000";
        proxy_pass http://localhost:3000;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend-node/package*.json ./
RUN npm install --production

# Copy application code
COPY backend-node/ ./
COPY frontend/public/ ./public/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  ark-calendar:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENABLE_AI_GENERATION=true
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - ark-calendar
    restart: unless-stopped
```

### Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f ark-calendar

# Scale if needed
docker-compose up -d --scale ark-calendar=3
```

## ☁️ Cloud Deployment

### AWS Deployment

#### Using Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init ark-calendar --platform node.js

# Create environment
eb create production

# Deploy
eb deploy
```

#### Using ECS with Fargate
```yaml
# task-definition.json
{
  "family": "ark-calendar",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ark-calendar",
      "image": "your-account.dkr.ecr.region.amazonaws.com/ark-calendar:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ark-calendar",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Azure Deployment

#### Using App Service
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and create resource group
az login
az group create --name ark-calendar-rg --location eastus

# Create App Service plan
az appservice plan create --name ark-calendar-plan --resource-group ark-calendar-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group ark-calendar-rg --plan ark-calendar-plan --name ark-calendar-app --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set --resource-group ark-calendar-rg --name ark-calendar-app --settings NODE_ENV=production PORT=3000

# Deploy code
az webapp deployment source config-zip --resource-group ark-calendar-rg --name ark-calendar-app --src deployment.zip
```

### Google Cloud Platform

#### Using Cloud Run
```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT-ID/ark-calendar

# Deploy to Cloud Run
gcloud run deploy ark-calendar \
  --image gcr.io/PROJECT-ID/ark-calendar \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/health

# Comprehensive diagnostics
curl https://yourdomain.com/api/diagnostics

# PWA functionality
curl https://yourdomain.com/manifest.json
curl https://yourdomain.com/sw.js
```

### Log Management

#### PM2 Logs
```bash
# View logs
pm2 logs ark-calendar

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

#### Docker Logs
```bash
# View logs
docker-compose logs -f ark-calendar

# Log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Performance Monitoring

```bash
# Monitor system resources
htop
iostat -x 1
netstat -tuln

# Application metrics
curl https://yourdomain.com/api/diagnostics | jq '.performance'

# Database/cache monitoring
du -sh data/
ls -la data/cache/
```

### Backup Strategy

```bash
# Backup user data
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Backup configuration
cp .env .env.backup.$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/ark-calendar"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/ark-calendar-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  /path/to/ark-calendar/

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check port availability
netstat -tuln | grep :3000

# Check logs
pm2 logs ark-calendar
# or
journalctl -u ark-calendar -f

# Run diagnostics
node run-diagnostics.js --verbose
```

#### PWA Not Installing
```bash
# Check HTTPS
curl -I https://yourdomain.com

# Validate manifest
curl https://yourdomain.com/manifest.json | jq .

# Test service worker
curl https://yourdomain.com/sw.js
```

#### Performance Issues
```bash
# Check system resources
free -h
df -h
top

# Application diagnostics
curl https://yourdomain.com/api/diagnostics | jq '.performance'

# Database optimization
# Clean old cache files
find data/cache -mtime +7 -delete
```

### Recovery Procedures

#### Service Recovery
```bash
# Restart application
pm2 restart ark-calendar
# or
sudo systemctl restart ark-calendar

# Full system restart
sudo reboot
```

#### Data Recovery
```bash
# Restore from backup
tar -xzf backup-20241222.tar.gz
cp -r backup/data/* data/

# Reset to defaults
rm -rf data/cache/*
node server.js --reset-cache
```

## 📈 Scaling Considerations

### Horizontal Scaling

```bash
# PM2 cluster mode
pm2 start ecosystem.config.js --env production -i max

# Docker scaling
docker-compose up -d --scale ark-calendar=3

# Load balancer configuration (nginx)
upstream ark-calendar {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}
```

### Vertical Scaling

```bash
# Increase PM2 memory limit
pm2 start server.js --max-memory-restart 1G

# Docker resource limits
services:
  ark-calendar:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 🔒 Security Hardening

### Application Security
```bash
# Update dependencies
npm audit fix

# Security headers (already implemented)
# - CORS configuration
# - Input validation
# - Error handling
# - Secure API key handling
```

### Server Security
```bash
# Firewall configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### SSL/TLS Configuration
```bash
# Strong SSL configuration in nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_dhparam /etc/nginx/dhparam.pem;
```

---

## 📞 Support

For deployment issues:

1. **Run diagnostics**: `node run-diagnostics.js --save --verbose`
2. **Check logs**: Application and system logs
3. **Verify configuration**: Environment variables and settings
4. **Test connectivity**: Network and service availability
5. **Review documentation**: API and user guides

**Emergency Recovery**: Use backup restoration procedures and service restart commands.

---

**Ready for production deployment!** 🚀

This guide covers all major deployment scenarios. Choose the method that best fits your infrastructure and requirements.