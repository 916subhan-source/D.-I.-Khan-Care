#!/usr/bin/env bash
# ==============================================================================
# Setup 2-Minute Auto-Update Cron for D.I. Khan Care (Hostinger VPS)
# ==============================================================================

set -e

echo "⚙️ Setting up 2-minute auto updater..."

# 1. Ensure log file exists
touch /var/log/dikhan_auto_update.log

# 2. Make updater executable
chmod +x /root/app/auto_update.sh

# 3. Ensure cron service is enabled and running
systemctl enable --now cron 2>/dev/null || systemctl enable --now crond 2>/dev/null || true

# 4. Install 2-minute cron job cleanly (using -l for list, removing duplicates)
(crontab -l 2>/dev/null | grep -v 'auto_update.sh' || true; echo "*/2 * * * * /root/app/auto_update.sh >> /var/log/dikhan_auto_update.log 2>&1") | crontab -

echo "✅ Crontab entry installed:"
crontab -l | grep 'auto_update.sh'

echo ""
echo "🚀 Running initial update now..."
/root/app/auto_update.sh
