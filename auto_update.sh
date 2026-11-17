#!/usr/bin/env bash
# ==============================================================================
# D.I. Khan Care - VPS Bulletproof Auto-Update Script (Runs every 2 mins via cron)
# Domain: dikhancare.io | VPS: 76.13.18.85
# ==============================================================================

set -u

# Locate application directory
APP_DIR=""
for candidate in "$HOME/app" "/root/app" "/var/www/dikhan-care" "/var/www/html" "$(pwd)"; do
    if [ -f "$candidate/docker-compose.yml" ]; then
        APP_DIR="$candidate"
        break
    fi
done

if [ -z "$APP_DIR" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Application directory not found."
    exit 1
fi

cd "$APP_DIR" || exit 1

# Check for git updates
git fetch origin main > /dev/null 2>&1 || exit 0

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 New changes detected ($LOCAL_HASH -> $REMOTE_HASH). Updating..."
    
    # 1. Preserve live sqlite database so new assistants, patients, and bookings are NEVER lost
    if [ -f backend/dikhan_care.db ]; then
        cp -f backend/dikhan_care.db /tmp/dikhan_care_live.db 2>/dev/null || true
        cp -f backend/dikhan_care.db backend/dikhan_care.db.bak_$(date +%s) 2>/dev/null || true
    fi

    # 2. Reset codebase to latest commit
    git reset --hard origin/main
    
    # 3. Restore live production database immediately
    if [ -f /tmp/dikhan_care_live.db ]; then
        cp -f /tmp/dikhan_care_live.db backend/dikhan_care.db
    fi

    # 4. Tell git never to overwrite or touch the live database during updates
    git update-index --skip-worktree backend/dikhan_care.db 2>/dev/null || true

    # Rebuild and restart application containers
    docker compose up -d --build
    
    # Prune dangling build images to save VPS disk space
    docker image prune -f > /dev/null 2>&1 || true

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Successfully updated to commit $REMOTE_HASH!"
fi
