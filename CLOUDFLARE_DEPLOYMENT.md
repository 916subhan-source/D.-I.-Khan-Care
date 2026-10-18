# ☁️ Cloudflare Deployment Guide — D.I. Khan Doctor Appointment System

This guide outlines how to deploy the **D.I. Khan Doctor Appointment & Clinical Management System** to Cloudflare.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │            Cloudflare Edge              │
                      │                                         │
  End Users ─────────►│  Cloudflare Pages (React + Vite SPA)    │
                      │  https://dikhan-doctor-appointment...   │
                      │                                         │
                      │  API Requests (/api/v1/*)               │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │         FastAPI Backend Engine          │
                      │                                         │
                      │  • Option A: Cloudflare Tunnel          │
                      │    (Secure tunnel from your server/VPS) │
                      │                                         │
                      │  • Option B: Cloud PaaS (Docker/Render) │
                      │    (With Cloudflare DNS & SSL proxy)    │
                      └─────────────────────────────────────────┘
```

---

## Part 1: Deploy Frontend to Cloudflare Pages

The frontend build is optimized with code-splitting (`vendor`, `icons`, `index`) and includes `public/_redirects` (`/* /index.html 200`) so SPA route reloads (`/doctor`, `/assistant`, `/admin`) never 404.

### Option A: Using the 1-Click Script (Recommended)
Double-click `deploy_cloudflare.bat` in your project folder, or run:
```powershell
.\deploy_cloudflare.bat
```
It will:
1. Build the production frontend.
2. Open your browser to log into your Cloudflare account (if not already logged in).
3. Deploy the site to **Cloudflare Pages** and output your live `*.pages.dev` URL.

### Option B: Using Wrangler CLI Directly
1. **Log in to Cloudflare:**
   ```bash
   npx wrangler login
   ```
   *(A browser tab will open asking you to authorize Wrangler)*

2. **Deploy the production folder:**
   ```bash
   npx wrangler pages deploy frontend/dist --project-name=dikhan-doctor-appointment
   ```

### Option C: Using Cloudflare API Token (Headless / CI/CD)
If deploying in a terminal without a web browser:
```powershell
$env:CLOUDFLARE_API_TOKEN="your_token_here"
$env:CLOUDFLARE_ACCOUNT_ID="your_account_id_here"
npx wrangler pages deploy frontend/dist --project-name=dikhan-doctor-appointment
```

### Option D: Git-Connected Cloudflare Pages Dashboard
1. Push your repository to GitHub / GitLab.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Compute (Workers & Pages)** > **Create** > **Pages** > **Connect to Git**.
3. Select your repository and set:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy**.

---

## Part 2: Backend Deployment with Cloudflare

Because FastAPI is an asynchronous Python runtime with native C-extensions (`aiosqlite`, `asyncpg`, `argon2-cffi`), it runs on a host and connects to Cloudflare via either **Cloudflare Tunnel** or **Container Hosting**.

### Option 1: Cloudflare Tunnel (Free, Zero Open Ports)
Keep your backend running locally or on any cheap VPS/server without opening firewall ports or buying a public IP:
1. Install `cloudflared`:
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Authenticate:
   ```bash
   cloudflared tunnel login
   ```
3. Run the backend:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   ```
4. Expose through Cloudflare:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:8000
   ```
   Cloudflare gives you a secure `https://*.trycloudflare.com` or custom domain URL.

### Option 2: Docker / Cloud PaaS (Render / Railway / Fly.io)
1. Use the pre-configured [Dockerfile](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/Dockerfile) and [docker-compose.yml](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/docker-compose.yml).
2. Set environment variables from [.env.production.example](file:///c:/Users/Admin/Downloads/Docter%20Appointment%20system/.env.production.example):
   - `DATABASE_URL` (PostgreSQL or SQLite persistent volume)
   - `JWT_SECRET_KEY`
   - `CORS_ORIGINS` (your Cloudflare Pages domain, e.g. `https://dikhan-doctor-appointment.pages.dev`)
3. In `frontend/.env.production`, set:
   ```
   VITE_API_BASE=https://your-backend-url/api/v1
   ```

---

## Verification Checklist

- [x] Production build generated with custom chunking (`vendor`, `icons`, `app`).
- [x] Cloudflare SPA rewrite rule added (`frontend/public/_redirects`).
- [x] Dynamic API base client configured with `/api/v1` default.
- [x] Cloudflare `wrangler.toml` configured.
- [x] Automated deployment script created (`deploy_cloudflare.bat`).
