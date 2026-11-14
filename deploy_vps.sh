#!/usr/bin/env bash
set -e

# ==============================================================================
# D.I. Khan Care - VPS Automated Deployment Script
# Hosts Frontend, FastAPI Backend, SQLite DB & Redis on Ubuntu VPS with Nginx + SSL
# Domain: dikhancare.io
# ==============================================================================

echo "=========================================================="
echo "🚀 Starting D.I. Khan Care Production VPS Setup..."
echo "=========================================================="

# 1. Update OS packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx

# 2. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall rules (Ports 22, 80, 443)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# 4. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx for dikhancare.io..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/dikhancare.io
server {
    listen 80;
    listen [::]:80;
    server_name dikhancare.io www.dikhancare.io;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dikhancare.io /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 5. Create .env if not exists and launch Docker containers
echo "🏗️ Checking environment configuration..."
if [ ! -f .env ]; then
    echo "Creating .env configuration file..."
    cat << 'EOF' > .env
ENVIRONMENT=production
DEBUG=False
PORT=8000
SECRET_KEY=dikhan-production-secret-key-change-in-prod-2026
DATABASE_URL=sqlite+aiosqlite:////app/backend/dikhan_care.db
REDIS_URL=redis://redis:6379/0
REDIS_ENABLED=true
EVOLUTION_API_URL=http://76.13.18.85:32768
EVOLUTION_API_KEY=u8lzdSknWYziUvBemQX1hOBvTGGMSPkN
EVOLUTION_INSTANCE_NAME=D. I. khan Care
EOF
fi

echo "🏗️ Building and starting Docker application containers..."
docker compose down || true
docker compose up -d --build

# 6. Request SSL Certificate (Let's Encrypt HTTPS)
echo "🔒 Requesting Free SSL Certificate via Let's Encrypt Certbot..."
sudo certbot --nginx -d dikhancare.io -d www.dikhancare.io --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
    echo "⚠️ Certbot SSL request encountered a warning, continuing..."
}

echo "=========================================================="
echo "✅ D.I. Khan Care is now LIVE on your VPS!"
echo "🌐 Visit: https://dikhancare.io"
echo "=========================================================="
