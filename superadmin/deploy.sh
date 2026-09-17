#!/usr/bin/env bash
# InventoryOS SuperAdmin — VPS deploy script.
# Run on the VPS as a user with sudo, from anywhere:
#   bash deploy.sh
#
# Idempotent: clones on first run, pulls on subsequent runs. Installs deps,
# builds the standalone Next.js app, (re)seeds the DB, installs the systemd
# service, reloads Caddy. Safe to re-run after every `git push`.
set -euo pipefail

APP_DIR="/var/www/inventoryos"
REPO_URL="https://github.com/sajidchowdhury/inventory_website.git"
SERVICE_NAME="inventoryos"
PORT=3001

echo "→ InventoryOS SuperAdmin deploy"

# 1. clone or pull
if [ -d "$APP_DIR/.git" ]; then
  echo "  pulling latest…"
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
else
  echo "  cloning fresh…"
  sudo mkdir -p "$APP_DIR"
  sudo chown -R "$USER":"$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR/superadmin"

# 2. install deps
echo "→ installing deps (bun)"
bun install --frozen-lockfile 2>/dev/null || bun install

# 3. env
echo "→ .env"
if [ ! -f .env ]; then
  cp .env.example .env
  # generate strong secrets if openssl is available
  if command -v openssl >/dev/null 2>&1; then
    AUTH_SECRET="$(openssl rand -hex 32)"
    CRON_SECRET="$(openssl rand -hex 32)"
    SSO_SECRET="$(openssl rand -hex 32)"
    sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$AUTH_SECRET|; s|^CRON_SECRET=.*|CRON_SECRET=$CRON_SECRET|; s|^SSO_SECRET=.*|SSO_SECRET=$SSO_SECRET|" .env
  fi
  echo "  ✓ .env created — edit $APP_DIR/superadmin/.env to add bKash/SMTP creds later"
else
  echo "  ✓ .env exists (kept)"
fi

# 4. database
echo "→ database"
bun run db:push
bun run db:seed
echo "  ✓ superadmin.db seeded (admin@inventoryos.xyz / admin123 — CHANGE THIS)"

# 5. build standalone
echo "→ building standalone"
bun run build

# 6. systemd service
echo "→ systemd service: $SERVICE_NAME"
sudo tee /etc/systemd/system/$SERVICE_NAME.service >/dev/null <<EOF
[Unit]
Description=InventoryOS SuperAdmin (Next.js standalone on :$PORT)
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR/superadmin
EnvironmentFile=$APP_DIR/superadmin/.env
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=$(which node) .next/standalone/server.js
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

# 7. caddy
echo "→ Caddy"
if [ -f Caddyfile.prod ]; then
  sudo cp Caddyfile.prod /etc/caddy/Caddyfile
  sudo systemctl reload caddy || sudo systemctl restart caddy
  echo "  ✓ Caddy reloaded (Caddyfile.prod installed)"
else
  echo "  ! Caddyfile.prod not found — configure Caddy manually (see DEPLOY.md)"
fi

# 8. wait + verify
echo "→ waiting for :$PORT to come up…"
for i in $(seq 1 15); do
  if curl -fsS -o /dev/null "http://localhost:$PORT/api/landing/root"; then
    echo "  ✓ :$PORT responding"
    break
  fi
  sleep 1
done

echo ""
echo "✅ Deployed."
echo "   Public root site: https://inventoryos.xyz"
echo "   Admin panel:      https://inventoryos.xyz/SuperAdmin"
echo "   Login:            admin@inventoryos.xyz / admin123  (CHANGE IMMEDIATELY)"
echo "   Logs:             sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "Next: set bKash / SMTP / SSO env vars in $APP_DIR/superadmin/.env, then:"
echo "   sudo systemctl restart $SERVICE_NAME"
