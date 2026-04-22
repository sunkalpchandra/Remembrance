#!/usr/bin/env sh
# deploy.sh
#
# Boots the Docker stack (nginx + web + backend) and obtains TLS certs for the given domain
# using certbot's webroot method. Intended to be run from the repository root.
#
# Usage:
#   ./deploy.sh [--domain example.com] [--email you@example.com] [--staging]
#
# Example:
#   ./deploy.sh --domain app.reteena.org --email ops@reteena.org
#
# The script will:
#  - create required docker/nginx directories if missing
#  - start nginx so the ACME challenge can be served
#  - run certbot (in a container) to obtain certs and store them under ./docker/nginx/ssl
#  - reload nginx so it picks up the new certificates
#  - bring up the full stack (web + backend + nginx + certbot renewal loop)
#
# Notes:
#  - Make sure DNS for the domain points to this host before requesting certificates.
#  - For production replace staging mode with live (don't pass --staging).
#  - This script uses `docker` + `docker compose` (v2). Adjust commands if you use a different CLI.

set -eu

# Defaults
DOMAIN="app.reteena.org"
EMAIL=""
STAGING=0
COMPOSE_CMD="docker compose" # change to `docker-compose` if required

print_usage() {
  cat <<EOF
Usage: $0 [--domain DOMAIN] [--email EMAIL] [--staging] [--help]

  --domain DOMAIN    Domain to obtain certificate for (default: ${DOMAIN})
  --email EMAIL      Contact email for certbot registration (optional).
                     If omitted the script will register without email (not recommended).
  --staging          Use Let's Encrypt staging environment (for testing only).
  --help             Show this help message.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --email)
      EMAIL="$2"
      shift 2
      ;;
    --staging)
      STAGING=1
      shift 1
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      print_usage
      exit 1
      ;;
  esac
done

echo "Deploy script starting"
echo "  Domain: ${DOMAIN}"
if [ -n "$EMAIL" ]; then
  echo "  Email: ${EMAIL}"
else
  echo "  Email: (none) — certbot will register without email if issuing certs."
fi
if [ "$STAGING" -eq 1 ]; then
  echo "  Using LetsEncrypt STAGING environment (no real certs)"
fi

# Check docker is available
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker CLI not found in PATH. Install Docker and try again." >&2
  exit 2
fi

# Ensure docker compose available (docker compose plugin)
if ! $COMPOSE_CMD version >/dev/null 2>&1; then
  echo "ERROR: docker compose not available as: ${COMPOSE_CMD}" >&2
  echo "If your environment uses 'docker-compose' (v1), set COMPOSE_CMD accordingly in this script." >&2
  exit 2
fi

# Ensure the docker/nginx directories exist
mkdir -p ./docker/nginx/www
mkdir -p ./docker/nginx/ssl
mkdir -p ./docker/nginx/conf.d
mkdir -p ./docker/nginx/log

# Ensure nginx site conf exists - warn if missing but continue (user may manage confs differently)
if [ ! -f "./docker/nginx/conf.d/app.reteena.org.conf" ]; then
  echo "WARNING: expected nginx config at ./docker/nginx/conf.d/app.reteena.org.conf not found."
  echo "Please ensure an nginx site config exists that serves /.well-known/acme-challenge/ from /var/www/certbot"
fi

# Helper: check if cert already exists
CERT_PATH="./docker/nginx/ssl/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  echo "Certificate already exists at ${CERT_PATH}. Skipping initial issuance."
  HAVE_CERT=1
else
  HAVE_CERT=0
fi

# Start nginx first (it will serve ACME challenges from the mounted webroot)
echo "Starting nginx container..."
$COMPOSE_CMD up -d nginx

# Wait for nginx to be reachable on port 80 (simple retry loop)
echo "Waiting for nginx to bind port 80 on localhost..."
TRIES=0
MAX_TRIES=12
SLEEP_SECS=2
while [ $TRIES -lt $MAX_TRIES ]; do
  # We check if port 80 is open on localhost by attempting to fetch /.well-known/acme-challenge/
  if command -v curl >/dev/null 2>&1; then
    if curl -sS --max-time 2 "http://127.0.0.1/.well-known/acme-challenge/" >/dev/null 2>&1; then
      echo "nginx is responding locally (HTTP 200/301/etc)."
      break
    fi
  else
    # fallback to checking docker container state
    if docker ps --filter "name=nginx" --format '{{.Names}}' | grep -q nginx; then
      break
    fi
  fi
  TRIES=$((TRIES + 1))
  echo "  waiting... ($TRIES/$MAX_TRIES)"
  sleep $SLEEP_SECS
done

if [ $TRIES -eq $MAX_TRIES ]; then
  echo "WARNING: nginx may not be ready. Continuing but cert issuance may fail."
fi

# If cert does not exist, request it using certbot (container)
if [ "$HAVE_CERT" -eq 0 ]; then
  echo "Requesting certificate for ${DOMAIN} using certbot (webroot)."
  # Build certbot args
  CERTBOT_ARGS="certonly --webroot -w /var/www/certbot -d ${DOMAIN} --agree-tos --no-eff-email"
  if [ "$STAGING" -eq 1 ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --staging"
  fi

  if [ -n "$EMAIL" ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --email ${EMAIL}"
  else
    # register without email (not recommended); certbot needs --register-unsafely-without-email
    CERTBOT_ARGS="$CERTBOT_ARGS --register-unsafely-without-email"
  fi

  echo "Running certbot container to obtain cert..."
  docker run --rm \
    -v "$PWD/docker/nginx/www:/var/www/certbot" \
    -v "$PWD/docker/nginx/ssl:/etc/letsencrypt" \
    certbot/certbot ${CERTBOT_ARGS}

  # Check if cert obtained
  if [ -f "$CERT_PATH" ]; then
    echo "Certificate successfully obtained: ${CERT_PATH}"
  else
    echo "ERROR: certificate issuance failed. Inspect certbot output above." >&2
    echo "You can run the certbot command manually (ensure DNS points to this host):" >&2
    echo "docker run --rm -v \"\$PWD/docker/nginx/www:/var/www/certbot\" -v \"\$PWD/docker/nginx/ssl:/etc/letsencrypt\" certbot/certbot ${CERTBOT_ARGS}" >&2
    exit 3
  fi
else
  echo "Skipping issuance; certificate already present."
fi

# Reload nginx to pick up the new certificates
echo "Reloading nginx to pick up TLS certificates..."
# Prefer docker compose exec to send reload to the running nginx container
if docker ps --format '{{.Names}}' | grep -q "remembrance_nginx\|nginx"; then
  # try to reload via docker compose exec (works if compose v2)
  set +e
  $COMPOSE_CMD exec nginx nginx -s reload >/dev/null 2>&1 || docker exec $(docker ps --format '{{.Names}}' | grep -E 'remembrance_nginx|nginx' | head -n1) nginx -s reload >/dev/null 2>&1 || true
  set -e
else
  echo "nginx container not found running; skipping reload."
fi

# Bring up the full stack (build images if necessary)
echo "Bringing up full stack (web + backend + nginx + certbot renewal)..."
$COMPOSE_CMD up -d --build

echo "Deployment complete."
echo "  - Web (Next.js) should be proxied by nginx at https://${DOMAIN}"
echo "  - Backend should be reachable (proxied under /backend/ per nginx config)"
echo ""
echo "To monitor logs:"
echo "  $COMPOSE_CMD logs -f web"
echo "  $COMPOSE_CMD logs -f backend"
echo "  $COMPOSE_CMD logs -f nginx"
echo ""
echo "To renew certificates manually (containerized):"
echo "  docker run --rm -v \"\$PWD/docker/nginx/www:/var/www/certbot\" -v \"\$PWD/docker/nginx/ssl:/etc/letsencrypt\" certbot/certbot renew --webroot -w /var/www/certbot && $COMPOSE_CMD exec nginx nginx -s reload"
