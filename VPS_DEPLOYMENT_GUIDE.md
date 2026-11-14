# 🚀 VPS Deployment Guide for D.I. Khan Care

This guide explains how to host your **Frontend (React)**, **Backend (FastAPI)**, and **Database (SQLite + Redis)** completely on your Hostinger VPS (`76.13.18.85`) connected to **`dikhancare.io`**.

---

## 📋 Architecture Overview

- **Server:** Hostinger Ubuntu VPS (`76.13.18.85`)
- **Domain:** `dikhancare.io` (and `www.dikhancare.io`)
- **Web Server & SSL:** Nginx with free Let's Encrypt SSL certificate (HTTPS)
- **Application Engine:** Docker & Docker Compose
  - **`dikhan_care_app`:** Single container hosting both the built React SPA and Python FastAPI backend on port 8000
  - **`dikhan_care_redis`:** Redis 7 container for live token locking, rate limiting & cache
  - **Database:** `dikhan_care.db` persisted locally in `./backend/dikhan_care.db`
  - **WhatsApp API:** Connected to your existing Evolution API at `http://76.13.18.85:32768`

---

## ⚡ Quick 1-Command Setup on VPS

1. Open your Hostinger VPS Terminal (via browser in Hostinger Panel, or via SSH):
   ```bash
   ssh root@76.13.18.85
   ```

2. Clone your GitHub repository (or navigate to existing folder):
   ```bash
   cd /var/www || cd ~
   git clone https://github.com/916subhan-source/D.-I.-Khan-Care.git dikhan-care
   cd dikhan-care
   ```

3. Make the automated deployment script executable and run it:
   ```bash
   chmod +x deploy_vps.sh
   ./deploy_vps.sh
   ```

The script will automatically:
1. Install Docker, Docker Compose, Nginx, and Certbot.
2. Open ports 80, 443, and 22 in the firewall.
3. Configure Nginx to forward requests to the Docker container.
4. Issue a free SSL certificate for `https://dikhancare.io`.
5. Build and launch all application services with auto-restart enabled.

---

## 🔄 How to Deploy Updates in the Future

Whenever you make code changes and push to GitHub, update your VPS in seconds:

```bash
cd dikhan-care
git pull origin main
docker compose up -d --build
```
