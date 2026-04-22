# Docker deployment guide for Remembrance (frontend + backend + certbot)
This file describes how to dockerize the Next.js frontend and the backend service, put an Nginx reverse-proxy in front of them, and obtain HTTPS certificates for the domain `app.reteena.org` using Certbot (Let's Encrypt).

High-level architecture
- `web` - Next.js app (frontend). Built into a production image that runs `next start`.
- `backend` - your server process (the project has `package.json` with `server` script; adapt as required).
- `nginx` - reverse proxy that:
  - serves ACME (Let's Encrypt) HTTP challenges from `/.well-known/acme-challenge/`
  - proxies traffic to `web` (port 3000) and `backend` (port 4000)
  - uses certificates stored under `/etc/letsencrypt/live/app.reteena.org/`

Important notes before you begin
- Replace `app.reteena.org` with your real domain if different.
- Replace `you@example.com` with your email when requesting certs.
- This guide assumes you control the DNS for `app.reteena.org` and have an A/AAAA record pointing to the host where you will run Docker.
- Commands shown use `docker compose` (v2+). If you use `docker-compose` (v1), adapt accordingly.

Suggested file layout (create a `docker/` directory at the project root)
- `docker/docker-compose.yml`
- `docker/nginx/Dockerfile` (optional; we can use official nginx image)
- `docker/nginx/conf.d/app.reteena.org.conf`
- `docker/nginx/www/` (webroot for certbot ACME challenge)
- `docker/init-letsencrypt.sh`
- `docker/web.Dockerfile`
- `docker/backend.Dockerfile`

Example `docker-compose.yml`
```remembrance/docker/docker-compose.yml#L1-200
version: '3.8'

services:
  nginx:
    image: nginx:stable-alpine
    container_name: remembrance_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/www:/var/www/certbot:rw
      - ./nginx/ssl:/etc/letsencrypt:rw
      - ./nginx/log:/var/log/nginx
    depends_on:
      - web
      - backend
    restart: unless-stopped

  web:
    build:
      context: ..
      dockerfile: docker/web.Dockerfile
    image: remembrance_web:latest
    container_name: remembrance_web
    environment:
      - NODE_ENV=production
      # Add other env vars required by Next.js (e.g., NEXT_PUBLIC_*)
    expose:
      - "3000"
    restart: unless-stopped

  backend:
    build:
      context: ..
      dockerfile: docker/backend.Dockerfile
    image: remembrance_backend:latest
    container_name: remembrance_backend
    environment:
      # Add backend-specific env vars here
      - NODE_ENV=production
    expose:
      - "4000"
    restart: unless-stopped
```

Example `web.Dockerfile` (Next.js production)
```remembrance/docker/web.Dockerfile#L1-200
# Use Node official image (or use bun image if you prefer)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only what is necessary for install/build
COPY package.json package-lock.json* bun.lockb* ./
COPY . .

# Install dependencies (use npm/yarn/pnpm/bun as appropriate)
RUN npm ci --production=false

# Build Next.js production
RUN npm run build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Copy built output and package.json for runtime dependencies
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose port that next start listens on
EXPOSE 3000

CMD ["npm", "run", "start"]
```

Example `backend.Dockerfile` (adjust to your backend)
```remembrance/docker/backend.Dockerfile#L1-200
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend ./backend
# install deps (if backend uses bun, adapt accordingly)
RUN npm ci --production

# Expose backend port (example 4000)
EXPOSE 4000

# Change to the command your backend expects. package.json has "server": "bun backend/index.ts"
# If using node: replace with proper node command or use bun image.
CMD ["node", "backend/index.js"]
```

Nginx configuration for `app.reteena.org`
- This file will direct HTTP ACME requests to the webroot and proxy other requests to the appropriate services.
```remembrance/docker/nginx/conf.d/app.reteena.org.conf#L1-200
server {
    listen 80;
    server_name app.reteena.org;

    # Serve ACME challenge files from webroot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name app.reteena.org;

    ssl_certificate /etc/letsencrypt/live/app.reteena.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.reteena.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # ACME challenge (still required)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to Next.js web
    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Example: if backend is mounted at /backend
    location /backend/ {
        proxy_pass http://backend:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Helper script to obtain certs (init-letsencrypt.sh)
- This script will:
  1. Start nginx to respond to ACME challenges
  2. Run certbot in a container to request certificates using the `webroot` plugin
  3. Reload nginx
```remembrance/docker/init-letsencrypt.sh#L1-200
#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 email@example.com"
  exit 1
fi

domains=(app.reteena.org)
email="$1"
rsa_key_size=4096

# Ensure necessary directories exist
mkdir -p ./nginx/www
mkdir -p ./nginx/ssl

# Start nginx so certbot can complete challenge
docker compose up -d nginx

# Request certs using certbot container and webroot
docker run --rm \
  -v "$PWD/nginx/www:/var/www/certbot" \
  -v "$PWD/nginx/ssl:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --register-unsafely-without-email \
  --agree-tos \
  -d ${domains[0]}

# Reload nginx to pick up new certificates
docker compose exec nginx nginx -s reload

echo "Certificates obtained and nginx reloaded."
```

Obtain certificates (example)
1. Open port 80 on the host and point DNS for `app.reteena.org` to the host.
2. Run:
```bash
# From the repository root
cd docker
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh you@example.com
```
3. After successful issuance, `./nginx/ssl/live/app.reteena.org/` will contain the certs and Nginx will serve HTTPS.

Bring the full stack up
- After certs exist:
```bash
# From the repository root
docker compose up -d --build
```
- Check logs:
```bash
docker compose logs -f nginx
docker compose logs -f web
docker compose logs -f backend
```

Automatic renewal
- Certificates from Let's Encrypt need renewal every ~90 days.
- You can set up a cron job on the host to run certbot renew (if using system certbot) or run a containerized renewer:
```bash
# simple cron script (run daily)
docker run --rm -v "$PWD/docker/nginx/ssl:/etc/letsencrypt" -v "$PWD/docker/nginx/www:/var/www/certbot" certbot/certbot renew --webroot --webroot-path=/var/www/certbot && docker compose exec nginx nginx -s reload
```
- Alternatively, use a dedicated companion image like `nginx-proxy` + `acme-companion`, or use Traefik which automates ACME.

Environment variables
- Add any Next.js `NEXT_PUBLIC_*` variables into the `web` service `environment` or use `.env.production` and COPY into image.
- For backend, add secrets and runtime envs via compose environment or secrets.

Security considerations
- Do not commit private keys to source control. The `nginx/ssl` directory should be in `.gitignore`.
- Ensure your backend does not expose internal admin endpoints without authentication.
- Consider setting up a firewall to only allow ports 80 and 443 publicly.

Troubleshooting
- ACME challenge fails: ensure `app.reteena.org` DNS points to the host and port 80 is reachable.
- Nginx can't find certs after issuance: ensure the volume mapping points to the same host directory where certs were written (e.g., `./nginx/ssl`).
- Next.js build fails in Docker: try building locally `npm run build` and adapt Dockerfile to include necessary build steps and environment variables.

Optional improvements
- Use a multi-stage Dockerfile with `pnpm` or `bun` if your project relies on those.
- Use a process manager (PM2) for the backend if needed.
- Use Traefik as the reverse proxy to handle ACME automatically (less manual scripting).
- Use Docker secrets or an external secrets manager for sensitive environment variables.

If you'd like, I can:
- Provide finished `docker-compose.yml`, Nginx config, `Dockerfile`s, and the init script filled with exact paths and commands tailored to your project's backend (bun or node), and produce them as files in the repo.
- Convert the backend `server` script to a proper Docker entrypoint if you tell me how you currently run it (for example `bun backend/index.ts` vs `node backend/index.js`).