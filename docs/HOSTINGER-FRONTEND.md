# Deploy Frontend (Next.js) on Hostinger

This guide deploys the **frontend only** when API + Postgres are already running on Hostinger. The web image is built in GitHub Actions; Hostinger only pulls and runs it—no build on the VPS.

**If you need the full stack (Postgres + API + Web) in one compose file**, see [Full stack option](#full-stack-option) at the bottom.

---

## Prerequisites

- Hostinger VPS with Docker (Docker Manager in hPanel).
- **API + Postgres already deployed and running** (e.g. via `docker-compose.hostinger-with-db-pull.yml`).
- GitHub repo with Actions enabled and **Read and write permissions** for workflows.

---

## Step 1: Build and push the Web image (GitHub Actions)

### 1.1 Set repository variables

In **GitHub → Your repo → Settings → Secrets and variables → Actions → Variables** add:

| Name | Value | Required |
|------|--------|----------|
| `NEXT_PUBLIC_API_URL` | Your **public** API URL. Examples: `https://api.yourdomain.com` or `http://YOUR_VPS_IP:3002` | **Yes** |
| `NEXT_PUBLIC_STREAM_API_KEY` | Your Stream Chat public API key (same as API/Stream dashboard) | **Yes** |

The browser calls the API using this URL, so it must be reachable from the internet (not `http://api:3001`).

### 1.2 Run the Web build workflow

1. Go to **Actions** → **Build and push Web image**.
2. Click **Run workflow** (or push to `staging` to trigger it).
3. Wait for the job to finish. It pushes `ghcr.io/YOUR_GITHUB_USER/gepanda-web:latest` to GitHub Container Registry.

### 1.3 Make the package visible (first time only)

- Go to **Packages** in your GitHub profile (or org). Find `gepanda-web`.
- Under **Package settings**, set visibility to **Public** (or add your Hostinger VPS / CI if you use private).

---

## Step 2: Deploy frontend only on Hostinger

### 2.1 Compose file (frontend only)

Use the **web-only** compose file (no Postgres, no API—they’re already running):

**Compose from URL:**

```
https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/docker-compose.hostinger-web-only.yml
```

Replace `YOUR_USER` and `YOUR_REPO` with your GitHub username and repo name.

Or copy the contents of `docker-compose.hostinger-web-only.yml` and paste into Hostinger **Compose manually**.

### 2.2 Set image name

In the compose file, replace `devhypertech` with your **GitHub username (lowercase)**:

- `ghcr.io/devhypertech/gepanda-web:latest` → `ghcr.io/YOUR_USER/gepanda-web:latest`

### 2.3 Environment variables in Hostinger

In Hostinger Docker Manager, set these for the **web** stack:

**Required:**

| Variable | Value |
|----------|--------|
| `NEXTAUTH_URL` | Public URL of your **web app**, e.g. `http://YOUR_VPS_IP:3000` or `https://app.yourdomain.com` |
| `NEXTAUTH_SECRET` | Random secret (e.g. `openssl rand -base64 32`) |

**Optional (Google login):**

| Variable | Value |
|----------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## Step 3: Deploy

1. In Hostinger Docker Manager, use **Compose from URL** with the web-only URL above (or paste the file).
2. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET` (and Google vars if needed).
3. Deploy / Start the stack.
4. Open port **3000** in the firewall if needed.

Access the app at `http://YOUR_VPS_IP:3000` (or your domain pointing to the VPS). The frontend will call your existing API using the URL you set when building the web image (`NEXT_PUBLIC_API_URL`).

---

## Ports summary (frontend only)

| Port on VPS | Service |
|-------------|---------|
| 3000 | Web (Next.js) |

Your existing API (e.g. 3002) and Postgres (e.g. 5433) stay as they are; this compose only runs the frontend.

---

## Changing the public API URL or Stream key

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_STREAM_API_KEY` are **baked into the web image** at build time. To change them:

1. Update the repo variable(s) in **Settings → Secrets and variables → Actions**.
2. Re-run the workflow **Build and push Web image**.
3. On Hostinger, restart the stack (or only the `web` service) so it pulls the new image.

---

## Troubleshooting

- **Web container exits:** Check Hostinger logs for the `gepanda-web` container. Ensure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set.
- **Login / API calls fail:** Ensure `NEXT_PUBLIC_API_URL` (used when building the web image) is the **public** URL the browser can reach (e.g. `http://VPS_IP:3002` or `https://api.yourdomain.com`).
- **CORS or callback errors:** Set `NEXTAUTH_URL` to the exact URL users use to open the app (including port, e.g. `http://YOUR_VPS_IP:3000`). If your API uses `WEB_APP_URL`, set that on the **API** stack to the same value.

---

## Full stack option

If you want to deploy **Postgres + API + Web** in a single compose file (e.g. on a new VPS), use:

- **Compose:** `docker-compose.hostinger-full.yml`
- **URL:** `https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/docker-compose.hostinger-full.yml`

Set all variables listed in that file (Postgres, API, and Web). Ports: 3000 (web), 3002 (API), 5433 (Postgres).

---

## Optional: reverse proxy (nginx) and HTTPS

To use a domain and HTTPS (e.g. `https://app.yourdomain.com`):

1. Point your domain’s A record to the VPS IP.
2. Install nginx (or Caddy) on the VPS and configure:
   - Proxy `https://app.yourdomain.com` → `http://127.0.0.1:3000` (web).
   - Proxy `https://api.yourdomain.com` → `http://127.0.0.1:3002` (API).
3. Use Let’s Encrypt (e.g. certbot) for SSL.
4. Set `NEXTAUTH_URL=https://app.yourdomain.com`, `WEB_APP_URL` and `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`, then rebuild the web image and set env on Hostinger as above.
