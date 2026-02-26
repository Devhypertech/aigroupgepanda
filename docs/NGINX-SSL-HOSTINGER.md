# Nginx + SSL for Hostinger (502 fix)

502 Bad Gateway means nginx is running but cannot reach your app (Docker containers). Fix in two steps: (1) ensure containers are running and listening, (2) point nginx at the correct upstream.

---

## ⚠️ Common mistake: wrong domain → wrong port

| Symptom | Cause | Fix |
|--------|--------|-----|
| **apiai.gepanda.com** shows the **login page** (frontend) | nginx is proxying the API domain to the **frontend** (3000) instead of the **API** (3002) | In the **apiai.gepanda.com** server block use `proxy_pass http://127.0.0.1:3002;` (no trailing slash) |
| Login with correct credentials returns **"Route not found"** | The frontend’s server calls `https://apiai.gepanda.com/api/auth/login` but that request hits the **frontend** (wrong proxy), which has no such route; the API’s 404 JSON is shown | Same: proxy **apiai.gepanda.com** to **port 3002** only |

**Rule:**  
- **aiplatform.gepanda.com** → `proxy_pass http://127.0.0.1:3000;` (frontend)  
- **apiai.gepanda.com** → `proxy_pass http://127.0.0.1:3002;` (API)

Use **no trailing slash** after the port (e.g. `http://127.0.0.1:3002;` not `http://127.0.0.1:3002/;`) so the path (e.g. `/api/auth/login`) is forwarded correctly.

---

## 1. Check containers and ports on the server

SSH into the server where Docker runs and run:

```bash
docker ps
```

You should see something like:

- `gepanda-web` → port `0.0.0.0:3000->3000/tcp`
- `gepanda-api` → port `0.0.0.0:3002->3001/tcp` (or 3001->3001)

If containers are not running, start them:

```bash
cd /var/www/aigroupgepanda
docker compose -f docker-compose.hostinger-with-db-pull.yml up -d
# If web is in same folder with a separate compose:
docker compose -f docker-compose.hostinger-web-only.yml up -d
```

Test locally on the server:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/
```

You should get `200` or `304`. If you get "Connection refused", the app is not listening on that port.

---

## 2. Nginx config: proxy to the correct ports

Nginx must `proxy_pass` to the same host/port where the containers are listening. Usually that is `127.0.0.1` (localhost).

### Frontend: aiplatform.gepanda.com → port 3000

Create or edit a server block, e.g. `/etc/nginx/sites-available/aiplatform.gepanda.com`:

```nginx
server {
    listen 80;
    server_name aiplatform.gepanda.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aiplatform.gepanda.com;

    # SSL (use your cert paths; often from certbot)
    ssl_certificate     /etc/letsencrypt/live/aiplatform.gepanda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aiplatform.gepanda.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

### Backend: apiai.gepanda.com → port 3002

Create or edit e.g. `/etc/nginx/sites-available/apiai.gepanda.com`:

```nginx
server {
    listen 80;
    server_name apiai.gepanda.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name apiai.gepanda.com;

    ssl_certificate     /etc/letsencrypt/live/apiai.gepanda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apiai.gepanda.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Important:**
- Use **no trailing slash**: `proxy_pass http://127.0.0.1:3002;` (not `...3002/`) so `/api/auth/login` is sent to the API as-is.
- If your API container maps to port **3001** on the host, use `proxy_pass http://127.0.0.1:3001;` instead of `3002`.

---

## 3. Enable sites and reload nginx

```bash
sudo ln -sf /etc/nginx/sites-available/aiplatform.gepanda.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/apiai.gepanda.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Checklist

| Check | Command / action |
|-------|------------------|
| Web container running | `docker ps` → gepanda-web, port 3000 |
| API container running | `docker ps` → gepanda-api, port 3002 (or 3001) |
| Web responds on server | `curl -I http://127.0.0.1:3000` → 200/304 |
| API responds on server | `curl -I http://127.0.0.1:3002` → 200 |
| Nginx proxy_pass | Frontend → `127.0.0.1:3000`, API → `127.0.0.1:3002` (or 3001) |
| SSL paths | Match your cert paths (e.g. certbot) |
| Reload nginx | `sudo nginx -t && sudo systemctl reload nginx` |

Once containers are up and nginx proxies to the correct ports, 502 should be resolved.
