# Step-by-step: Deploy Gepanda API to Hostinger Docker

This guide walks you through deploying the **API** (Node.js) to Hostinger using Docker. The **web app** (Next.js) is usually deployed separately (e.g. Vercel or another Hostinger container).

**Quick reference**

- Compose (API only): `docker-compose.hostinger.yml`
- Compose (API + Postgres): `docker-compose.hostinger-with-db.yml` **(use this file at repo root, not `infra/docker-compose.yml`)**
- Env template: `apps/api/.env.hostinger.example`
- Raw compose URL for API + DB (replace `USER`, `REPO`, `BRANCH`):  
  `https://raw.githubusercontent.com/USER/REPO/BRANCH/docker-compose.hostinger-with-db.yml`

---

## Prerequisites

- **Hostinger VPS** with Docker (KVM 2 or higher; use the [Docker VPS template](https://support.hostinger.com/en/articles/8306612-how-to-use-the-docker-vps-template) if available).
- **GitHub (or GitLab) repo** with this project. For private repos, you’ll need [deploy keys](https://www.hostinger.com/support/how-to-deploy-from-private-github-repository-on-hostinger-docker-manager/).
- **Stream Chat** account: [getstream.io](https://getstream.io) – you need `STREAM_API_KEY` and `STREAM_API_SECRET`.
- **PostgreSQL** – either:
  - **Option A:** Hostinger managed database, or any external Postgres (you’ll set `DATABASE_URL`), or  
  - **Option B:** Postgres running on the same VPS via Docker Compose (see Step 4).

---

## Step 1: Push your code and note the repo URL

1. Commit and push your project (including `Dockerfile`, `docker-compose.hostinger.yml`, and any compose file you use).
2. Note:
   - **Repo URL:** e.g. `https://github.com/your-username/your-repo`
   - **Raw compose URL** (if using “Compose from URL”):  
     `https://raw.githubusercontent.com/your-username/your-repo/main/docker-compose.hostinger.yml`  
     (replace `main` with your default branch if different.)

---

## Step 2: Prepare the database

**Full guide:** [Create a database from scratch on Hostinger VPS](HOSTINGER-DATABASE.md) (Docker or native PostgreSQL).

### Option A – Hostinger or external PostgreSQL

1. Create a PostgreSQL database (Hostinger panel or your provider).
2. Note:
   - Host
   - Port (usually `5432`)
   - Database name
   - User and password
3. Build the connection string:
   ```text
   postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
   ```
   Use this as `DATABASE_URL` in Step 5.

### Option B – Postgres on the same VPS (Docker)

1. Use the compose file that includes Postgres: `docker-compose.hostinger-with-db.yml`.
2. Set a strong `POSTGRES_PASSWORD` in Hostinger environment variables (see Step 5).
3. That compose file sets `DATABASE_URL` for the API to point at the `postgres` service.

---

## Step 3: Open Hostinger Docker Manager

1. Log in to [hPanel](https://hpanel.hostinger.com) (or your VPS dashboard).
2. Open your **VPS**.
3. Go to **Docker** (or **Docker Manager**).
4. Choose one:
   - **“Compose from URL”** – paste the **URL** to your compose file (see Step 4A), or  
   - **“Compose manually”** – use the form or YAML editor to paste the **compose YAML** (see Step 4B).

---

## Where to paste what (Docker Manager)

| What | Where to put it |
|------|------------------|
| **Dockerfile** | You **do not** paste it in Docker Manager. It stays in your repo. Hostinger uses it when building from your compose (because the compose has `build: context: .`). |
| **Docker Compose** | **Compose from URL:** paste the **link** (e.g. raw GitHub URL) in the **URL field**. **Compose manually:** paste the **full YAML** of `docker-compose.hostinger-with-db.yml` in the form’s YAML area or **YAML Editor** (if you see “Edit” → “YAML Editor” for a project). |
| **Environment variables** | In Docker Manager, open your project → **Environment variables** (or container settings) and add each variable (e.g. `DATABASE_URL`, `STREAM_API_KEY`). |

---

## Step 4: Deploy with Docker Compose

### 4A. If using “Compose from URL”

1. Click **Compose from URL** in Docker Manager.
2. In the **URL field**, paste the **link** to your compose file (not the file contents), e.g.:  
   `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docker-compose.hostinger-with-db.yml`  
   (Replace `YOUR_USERNAME`, `YOUR_REPO`, and `main` if your default branch is different.)
3. Click **Deploy** / **Run**.  
   Hostinger will fetch the compose, clone your repo for the build, use the **Dockerfile** from the repo to build the API image, and start the containers.

### 4B. If using “Compose manually”

1. Click **Compose manually** in Docker Manager.
2. You’ll see either a **form** (project name, container name, image, ports, env, etc.) or a **YAML editor**.
   - **If there is a YAML editor / “Edit YAML” / text area for compose:**  
     Open `docker-compose.hostinger-with-db.yml` in your repo, copy **all** of its contents, and **paste** them into that YAML area.
   - **If it’s form-only:**  
     Fill in the form for each service (postgres + api). For the API service you must set **build context** (or “repository”) to your repo so Hostinger can run `docker build` using your **Dockerfile** (the Dockerfile is not pasted anywhere; it’s in the repo).
3. If Hostinger asks for **build context** or **repository URL**, enter your repo URL and branch so it can build from the project root (where the Dockerfile is).
4. Click **Deploy** to start the stack.

### If you use “Deploy on Hostinger” button

1. In your README (or any page), use the button link with your compose URL:  
   `https://www.hostinger.com/docker-hosting?compose_url=YOUR_RAW_COMPOSE_URL`
2. Opening that link can pre-fill the compose URL in Hostinger for you.

---

## Step 5: Set environment variables in Hostinger

In the Docker Manager (or the service/container settings), find **Environment variables** and add at least:

| Variable          | Required | Example / notes |
|-------------------|----------|-----------------|
| `NODE_ENV`        | Yes      | `production`    |
| `PORT`            | No       | `3001` (default) |
| `DATABASE_URL`    | Yes      | `postgresql://USER:PASSWORD@HOST:5432/DB?schema=public` |
| `STREAM_API_KEY`  | Yes      | From GetStream dashboard |
| `STREAM_API_SECRET` | Yes    | From GetStream dashboard |
| `JWT_SECRET`      | Yes      | Long random string (e.g. 32+ chars) |
| `WEB_APP_URL`     | Yes      | Frontend URL, e.g. `https://yourdomain.com` |
| `API_URL`         | Recommended | Public API URL, e.g. `https://api.yourdomain.com` |

Optional (enable features as needed):

- `STREAM_FEEDS_API_KEY`, `STREAM_FEEDS_API_SECRET`
- `ZHIPU_API_KEY`
- `CROSSMINT_API_KEY`, `CROSSMINT_PROJECT_ID`
- `SERPAPI_API_KEY`, `DOBA_PUBLIC_KEY`, `DOBA_PRIVATE_KEY`
- `RYE_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `WEATHER_API_KEY`
- `ADMIN_EMAILS`, `WEB_URL`

Full list and examples: `apps/api/.env.hostinger.example`.

After changing env vars, **redeploy or restart** the API container so it picks them up.

---

## Step 6: Port and domain (optional)

- **Port:** The compose file maps host port `3001` to container port `3001`.  
  - Access the API at: `http://YOUR_VPS_IP:3001`  
  - If Hostinger or your firewall only allows 80/443, configure a reverse proxy (e.g. Nginx) to forward to `3001`, or change the host port in the compose (e.g. `"80:3001"`).
- **Domain:** Point a subdomain (e.g. `api.yourdomain.com`) to the VPS IP and, if needed, put Nginx (or Hostinger’s proxy) in front with SSL.

---

## Step 7: Run database migrations

The API uses Prisma. Migrations must be applied against your production DB.

**Option 1 – From your machine (recommended)**

1. Set `DATABASE_URL` to your production DB (same as in Hostinger).
2. From the project root:
   ```bash
   cd apps/api
   npx prisma migrate deploy --schema=../../prisma/schema.prisma
   ```
   (Adjust `schema` path if your `schema.prisma` is elsewhere.)

**Option 2 – One-off inside the API container**

1. In Hostinger, open a shell for the running API container (if available).
2. From `/app/apps/api` (or the path where the app runs):
   ```bash
   npx prisma migrate deploy --schema=../../prisma/schema.prisma
   ```
   Exit the shell. Restart the container if required by your setup.

---

## Step 8: Check that the API is running

1. **Health endpoint:**  
   Open in a browser or with curl:
   ```text
   http://YOUR_VPS_IP:3001/api/healthz
   ```
   You should get JSON with `server: "ok"` and, once DB and env are correct, `db: "ok"` and Stream keys reported.

2. **Logs:**  
   In Docker Manager, open the **api** container logs. You should see startup messages and no fatal errors.

3. **Frontend:**  
   In your web app, set `NEXT_PUBLIC_API_URL` (or equivalent) to `http://YOUR_VPS_IP:3001` (or your API domain). If you use a different domain, ensure CORS is correct (`WEB_APP_URL` must match the frontend origin).

---

## Step 9: Web app (frontend) configuration

The Docker setup in this guide runs **only the API**. For the Next.js web app:

1. Deploy it elsewhere (e.g. Vercel, or another Docker service on Hostinger) and set:
   - `NEXT_PUBLIC_API_URL` = your API URL (e.g. `https://api.yourdomain.com`)
   - `NEXT_PUBLIC_STREAM_API_KEY` = same Stream key as the API
   - `NEXTAUTH_URL` = web app URL
   - `NEXTAUTH_SECRET` = strong random secret
   - Google OAuth (if used): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
2. Ensure the API’s `WEB_APP_URL` matches the web app’s origin (scheme + domain + port if non-default).

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Hostinger uses `infra/docker-compose.yml` (Postgres only, no API) | Use the **root** compose URL: `.../docker-compose.hostinger-with-db.yml`, not a URL that resolves to `infra/docker-compose.yml`. |
| `port 5432: address already in use` | Something on the VPS already uses 5432. Use `docker-compose.hostinger-with-db.yml` (it maps host **5433**→5432). Or stop the other service using 5432. |
| Build fails | Ensure Docker Manager has access to the repo and builds from repo root where `Dockerfile` and `package.json` are. Check build logs for `npm install` / `npm run build` errors. |
| Container exits immediately | Check container logs. Often missing `DATABASE_URL`, wrong `PORT`, or crash on startup (e.g. Prisma, env). |
| 502 / connection refused | Confirm container is running and port mapping is `3001:3001` (or your chosen host port). Check firewall and reverse proxy. |
| Health check fails | Call `http://localhost:3001/api/healthz` from inside the container (or from the host to the mapped port). Fix any missing env (e.g. DB, Stream). |
| CORS errors from browser | Set `WEB_APP_URL` exactly to the frontend origin (e.g. `https://yourdomain.com` with no trailing slash). |
| DB connection errors | Verify `DATABASE_URL` (user, password, host, port, database name). If DB is on the same compose, use service name as host (e.g. `postgres`). |

---

## Summary checklist

- [ ] Repo pushed with `Dockerfile`, `docker-compose.hostinger.yml` (and optionally `docker-compose.hostinger-with-db.yml`).
- [ ] Database created (managed or Postgres container); `DATABASE_URL` known.
- [ ] Docker Manager: Compose from URL or Compose manually started.
- [ ] Environment variables set in Hostinger (at least `DATABASE_URL`, `STREAM_*`, `JWT_SECRET`, `WEB_APP_URL`).
- [ ] Migrations run against production DB (`prisma migrate deploy`).
- [ ] `GET /api/healthz` returns 200 and healthy status.
- [ ] Web app configured with `NEXT_PUBLIC_API_URL` and CORS (`WEB_APP_URL`) matches frontend.

For a full list of API env vars, see **`apps/api/.env.hostinger.example`**.
