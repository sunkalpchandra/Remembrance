#!/usr/bin/env bash
# deploy.sh — deploy Remembrance to rememb.org
#
# Run on the server:   bash deploy.sh
#
# First-time checklist (do once before running this script):
#   1. Install bun:    curl -fsSL https://bun.sh/install | bash
#   2. Install PM2:    bun add -g pm2
#   3. Install nginx:  sudo apt install -y nginx certbot python3-certbot-nginx
#   4. Point DNS:      rememb.org → your server IP
#   5. Copy .env:      fill in .env with all required keys
#   6. Download model: bash deploy.sh --setup-model  (one-time Leopard model fetch)

set -euo pipefail

DOMAIN="rememb.org"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXT_PORT=3000
BACKEND_PORT=5001
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
CERTBOT_WEBROOT="/var/www/certbot"
LOG_DIR="/var/log/remembrance"

# ---------------------------------------------------------------------------- #
# Helpers
# ---------------------------------------------------------------------------- #
log()  { echo -e "\033[1;32m[deploy]\033[0m $*"; }
warn() { echo -e "\033[1;33m[deploy]\033[0m $*"; }
die()  { echo -e "\033[1;31m[deploy]\033[0m $*" >&2; exit 1; }

require() {
  command -v "$1" &>/dev/null || die "'$1' is not installed. See checklist above."
}

# ---------------------------------------------------------------------------- #
# One-time Leopard model download
# ---------------------------------------------------------------------------- #
if [[ "${1:-}" == "--setup-model" ]]; then
  log "Downloading Picovoice Leopard English model to public/leopard_params.pv …"
  MODEL_URL="https://github.com/Picovoice/leopard/raw/master/lib/common/leopard_params.pv"
  curl -fL --progress-bar -o "${APP_DIR}/public/leopard_params.pv" "$MODEL_URL" \
    || die "Failed to download Leopard model. Download manually from https://github.com/Picovoice/leopard/tree/master/lib/common and place it at public/leopard_params.pv"
  log "Model saved to public/leopard_params.pv"
  exit 0
fi

# ---------------------------------------------------------------------------- #
# Preflight
# ---------------------------------------------------------------------------- #
require bun
require pm2
require nginx

[[ -f "${APP_DIR}/.env" ]] || die ".env file not found at ${APP_DIR}/.env — copy and fill in .env.production"

[[ -f "${APP_DIR}/public/leopard_params.pv" ]] \
  || warn "public/leopard_params.pv not found — run 'bash deploy.sh --setup-model' before this step for speech-to-text to work"

log "Deploying from: ${APP_DIR}"
log "Domain:         ${DOMAIN}"
cd "${APP_DIR}"

# ---------------------------------------------------------------------------- #
# Swap — ensure at least 4 GB of swap exists
# ---------------------------------------------------------------------------- #
SWAPFILE="/swapfile"
if ! swapon --show | grep -q "${SWAPFILE}"; then
  log "Setting up 4 GB swapfile at ${SWAPFILE} …"
  sudo fallocate -l 4G "${SWAPFILE}"
  sudo chmod 600 "${SWAPFILE}"
  sudo mkswap "${SWAPFILE}"
  sudo swapon "${SWAPFILE}"
  grep -qF "${SWAPFILE}" /etc/fstab \
    || echo "${SWAPFILE} none swap sw 0 0" | sudo tee -a /etc/fstab
  sudo sysctl -w vm.swappiness=60
  log "Swap active: $(free -h | awk '/Swap/{print $2}')"
else
  log "Swap already active — skipping"
fi

# ---------------------------------------------------------------------------- #
# Dependencies + build
# ---------------------------------------------------------------------------- #
log "Installing dependencies …"
bun install --frozen-lockfile

log "Building Next.js …"
bun run build

# ---------------------------------------------------------------------------- #
# Log directory
# ---------------------------------------------------------------------------- #
mkdir -p "${LOG_DIR}"

# ---------------------------------------------------------------------------- #
# PM2 — start / reload processes
# ---------------------------------------------------------------------------- #
log "Starting / reloading PM2 processes …"

# Next.js frontend
pm2 describe remembrance-frontend &>/dev/null \
  && pm2 reload remembrance-frontend --update-env \
  || pm2 start bun \
      --name remembrance-frontend \
      --log "${LOG_DIR}/frontend.log" \
      --time \
      -- run start

# Koa backend
pm2 describe remembrance-backend &>/dev/null \
  && pm2 reload remembrance-backend --update-env \
  || pm2 start bun \
      --name remembrance-backend \
      --log "${LOG_DIR}/backend.log" \
      --time \
      -- backend/index.ts

pm2 save
log "PM2 status:"
pm2 list

# ---------------------------------------------------------------------------- #
# Nginx config
# ---------------------------------------------------------------------------- #
log "Installing nginx config …"

sudo mkdir -p "${CERTBOT_WEBROOT}"
sudo cp "${APP_DIR}/docker/nginx/remembrance.conf" "${NGINX_CONF}"
sudo ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}" 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

log "Testing nginx config …"
sudo nginx -t || die "nginx config test failed — check ${NGINX_CONF}"

sudo nginx -s reload
log "nginx reloaded"

# ---------------------------------------------------------------------------- #
# SSL — obtain cert if not yet issued
# ---------------------------------------------------------------------------- #
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [[ ! -f "${CERT_PATH}" ]]; then
  log "Obtaining Let's Encrypt certificate for ${DOMAIN} …"
  sudo certbot certonly \
    --webroot -w "${CERTBOT_WEBROOT}" \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "mesuclub@gmail.com" \
    || warn "certbot failed — you may need to run it manually: sudo certbot --nginx -d ${DOMAIN}"

  sudo nginx -s reload
else
  log "SSL certificate already present — skipping certbot"
fi

# ---------------------------------------------------------------------------- #
# Done
# ---------------------------------------------------------------------------- #
log ""
log "✓ Deployment complete → https://${DOMAIN}"
log ""
log "Useful commands:"
log "  pm2 logs remembrance-frontend   # Next.js logs"
log "  pm2 logs remembrance-backend    # Koa logs"
log "  pm2 restart all                 # restart both"
log "  sudo nginx -s reload            # reload nginx"
log "  sudo certbot renew              # renew SSL cert"
