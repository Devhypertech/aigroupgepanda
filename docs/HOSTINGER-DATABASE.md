# Create a PostgreSQL database from scratch on Hostinger VPS

You have two options: **Docker** (easiest, recommended) or **native install** (PostgreSQL directly on the VPS).

---

## Option A: Database with Docker (recommended)

This uses the same VPS as your API. No separate install; the compose file creates the database and user.

### 1. Use the compose file that includes Postgres

In Hostinger Docker Manager, use **`docker-compose.hostinger-with-db.yml`** (not the API-only one).

- **Compose from URL:**  
  `https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/docker-compose.hostinger-with-db.yml`
- Or paste the file contents in **Compose manually**.

### 2. Set the Postgres password

In Hostinger **Environment variables** for the stack, add:

| Variable | Value |
|----------|--------|
| `POSTGRES_PASSWORD` | A strong password (e.g. 20+ random characters) |

The compose file creates:

- **User:** `gepanda`
- **Database:** `gepanda`
- **Connection string for the API:**  
  `postgresql://gepanda:YOUR_POSTGRES_PASSWORD@postgres:5432/gepanda?schema=public`

The API service in the same compose already gets this `DATABASE_URL`. You do **not** need to set `DATABASE_URL` yourself when using `docker-compose.hostinger-with-db.yml` unless you want to override it.

### 3. Deploy

Deploy the stack. Postgres will start first; when it’s healthy, the API will start and connect to it.

**Result:** Database exists on the VPS inside the `postgres` container. Data is stored in a Docker volume (`postgres_data`), so it survives container restarts.

---

## Option B: Native PostgreSQL on the VPS

Use this if you want PostgreSQL installed directly on the server (no Docker for the DB). Your API can run in Docker and connect to `host.docker.internal:5432` or the VPS IP.

### 1. Connect to the VPS

```bash
ssh root@YOUR_VPS_IP
```

(Use the IP and user from Hostinger hPanel → VPS.)

### 2. Install PostgreSQL

On **Ubuntu 22.04+**:

```bash
# Add PostgreSQL repo (optional, for latest version)
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Install
sudo apt update
sudo apt-get -y install postgresql postgresql-contrib
```

Or from Ubuntu’s default repo:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Check it’s running:

```bash
sudo systemctl status postgresql
sudo pg_isready
```

### 3. Create a database and user

Replace `gepanda` and `YourSecurePassword` with the username and password you want.

```bash
sudo -u postgres psql
```

In the `psql` prompt:

```sql
-- Create user with password
CREATE USER gepanda WITH PASSWORD 'YourSecurePassword';

-- Create database owned by that user
CREATE DATABASE gepanda OWNER gepanda;

-- Allow the user to create objects (e.g. Prisma migrations)
GRANT ALL PRIVILEGES ON DATABASE gepanda TO gepanda;
ALTER USER gepanda WITH CREATEDB;

-- Optional: for Prisma and schema public
\c gepanda
GRANT ALL ON SCHEMA public TO gepanda;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gepanda;

\q
```

### 4. Allow local connections (same server)

If the API runs on the **same VPS** (e.g. in Docker), it must be able to connect to `localhost:5432`. By default PostgreSQL allows local connections. Ensure `pg_hba.conf` has a line like:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
```

If you need to edit it:

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

(Use your actual version number; check with `ls /etc/postgresql/`.) Add or keep:

```
host    gepanda         gepanda         127.0.0.1/32            scram-sha-256
```

Then restart:

```bash
sudo systemctl restart postgresql
```

### 5. Connection string for the API

When the API runs on the **same VPS** (e.g. Docker with `network_mode: host` or extra_hosts), use:

```
postgresql://gepanda:YourSecurePassword@localhost:5432/gepanda?schema=public
```

When the API runs in Docker with default networking, **“localhost” inside the container is the container, not the host.** So you must either:
- Use **Option A** (Postgres in Docker) so the API connects to the `postgres` service, or
- Run the API with `network_mode: host` so it can use `localhost:5432`, or
- Use the host’s IP from inside Docker (e.g. `172.17.0.1` on default bridge, or `host.docker.internal` if available).

### 6. Allow remote connections (optional)

Only if you need to connect from your **local machine** (e.g. Prisma Studio, migrations):

1. Edit `postgresql.conf`:
   ```bash
   sudo nano /etc/postgresql/14/main/postgresql.conf
   ```
   Set:
   ```
   listen_addresses = '*'
   ```

2. In `pg_hba.conf`, add (replace `YOUR_IP` with your IP or `0.0.0.0/0` for any; less secure):
   ```
   host    gepanda         gepanda         YOUR_IP/32             scram-sha-256
   ```

3. Open port 5432 in the Hostinger firewall (and any VPS firewall).

4. Restart:
   ```bash
   sudo systemctl restart postgresql
   ```

**Security:** Prefer running migrations from your machine over SSH (e.g. SSH tunnel) instead of exposing 5432 to the internet.

---

## Run Prisma migrations

After the database exists (Option A or B), apply your schema:

From your **local machine** (with `DATABASE_URL` pointing at the production DB):

```bash
cd apps/api
npx prisma migrate deploy --schema=../../prisma/schema.prisma
```

Or from **inside the API container** on the VPS (if it has network access to the DB):

```bash
# In Hostinger, open a shell for the API container, then:
cd /app/apps/api
npx prisma migrate deploy --schema=../../prisma/schema.prisma
```

---

## Summary

| Goal | Use |
|-----|-----|
| Easiest, DB on same VPS as API in Docker | **Option A** – `docker-compose.hostinger-with-db.yml` + `POSTGRES_PASSWORD` |
| PostgreSQL installed on the OS, API elsewhere or custom setup | **Option B** – native install, then create user/database and set `DATABASE_URL` |

Your Gepanda API expects a **PostgreSQL** connection string in `DATABASE_URL`; both options provide that.
