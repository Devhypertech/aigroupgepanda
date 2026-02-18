# Chat & API Checklist

**Chat will not work with only the web app.** You must run the **API server** (port 3001) as well. Run `npm run dev` (both) or `npm run dev:api` in one terminal and `npm run dev:web` in another.

---

## 1. Restart the backend (API server)

After changing environment variables or Stream/Zhipu config, **restart the API** so it reloads env and re-initializes services.

**From repo root:**
```bash
# Run both API (port 3001) and web (port 3000)
npm run dev
```

**Or API only:**
```bash
npm run dev:api
```

**Or from apps/api:**
```bash
cd apps/api && npm run dev
```

Confirm in the terminal:
- `Server listening on port 3001` (or your `PORT`)
- `Stream API: ✅ Configured`
- `Zhipu AI: ✅ Configured` (optional but needed for AI replies)

---

## 2. Environment variables

### API (`apps/api/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `STREAM_API_KEY` | **Yes** | Stream Chat API key (chat init fails without it) |
| `STREAM_API_SECRET` | **Yes** | Stream Chat secret (server-side token creation) |
| `ZHIPU_API_KEY` | For AI | Zhipu AI key (AI replies; optional, degrades gracefully) |
| `DATABASE_URL` | For DB | Prisma connection (many features need it) |
| `JWT_SECRET` | For auth | NextAuth / JWT (defaults to dev secret if unset) |

**Optional:** `STREAM_FEEDS_*`, `RYE_API_KEY`, `TRAVELPAYOUTS_*`, `WEATHER_*`, `ADMIN_EMAILS`, etc.

**Quick check:** After starting the API, open:
- **GET** `http://localhost:3001/api/healthz`  
  Response includes `checks.streamKeys`, `checks.zhipuKey`, `checks.db`.

### Web (`apps/web/.env.local` or `.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_STREAM_API_KEY` | **Yes** | Same Stream API key as backend (client-side init) |
| `NEXT_PUBLIC_API_URL` | Optional | Defaults to `http://localhost:3001` (used for error messages; fetches use same-origin proxy) |

Copy `STREAM_API_KEY` from the API `.env` into `NEXT_PUBLIC_STREAM_API_KEY` for the web app.

---

## 3. Valid API token in chat initialization

Chat init uses a **valid Stream token** obtained from your API (not a hardcoded token):

1. **Frontend** calls `POST /api/stream/token` with `{ userId, username }` (same-origin via Next.js rewrite to API).
2. **API** (`apps/api/src/routes/stream.ts`) uses `streamServerClient.createToken(userId)` (requires `STREAM_API_KEY` + `STREAM_API_SECRET`).
3. **Frontend** calls `client.connectUser({ id, name }, token)` with that token.

If the token is missing or invalid, Stream will reject `connectUser`. Ensure:
- API is running and env vars are set (see §1 and §2).
- `POST /api/stream/token` returns `{ token, userId }` (test with Postman below).

---

## 4. `client.disconnectUser()` handling in chat client

The chat page uses **Stream Chat’s `disconnectUser()`** (there is no `client.disconnect()` in this app). Handling is consistent and safe:

- **On user change (logout/login):** Init effect cleanup runs → `disconnectUser()` is called (fire-and-forget), channel listeners removed, refs cleared, then new init runs for the new user.
- **On unmount:** A separate effect cleanup runs → if `currentClient.userID === currentUserId`, `disconnectUser()` is called; refs are cleared.
- **Before connecting as a different user:** Inside init, if `streamClient.userID` is set and different from `userId`, we `await streamClient.disconnectUser()` and clear channel refs before fetching a new token and calling `connectUser()`.

All `disconnectUser()` calls use `.catch()` so cleanup never throws. No changes required for normal operation.

---

## 5. Test endpoints in Postman

**Do not open these URLs in the browser.** The browser sends **GET** requests; these endpoints accept **POST** only. If you open them in the browser you'll see "Cannot GET ..." or a 405 message. Use Postman (or the app's `/dev` page) to send **POST** requests.

Base URL: `http://localhost:3001` (or your API URL).

### Health check
- **GET** `http://localhost:3001/api/healthz`  
  - Expect `200`, body with `ok`, `checks.server`, `checks.db`, `checks.streamKeys`, `checks.zhipuKey`.

### Stream token (required for chat)
- **Method:** POST  
- **URL:** `http://localhost:3001/api/stream/token`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
  ```json
  { "userId": "test_user_1", "username": "Test User" }
  ```
- **Expected:** `200`, body like `{ "token": "...", "userId": "test_user_1" }`.  
  If `STREAM_API_KEY` / `STREAM_API_SECRET` are missing or wrong, you get `500`.

### Companion channel (required for chat)
- **Method:** POST  
- **URL:** `http://localhost:3001/api/companion/channel`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
  ```json
  { "userId": "test_user_1" }
  ```
- **Expected:** `200`, body like `{ "channelId": "ai-test_user_1" }`.

If both token and companion channel return 200, the chat page should be able to connect (assuming the web app is running and `NEXT_PUBLIC_STREAM_API_KEY` is set).

---

## Quick reference

| Step | Action |
|------|--------|
| 1 | Restart API after env changes: `npm run dev` or `npm run dev:api` |
| 2 | Set `STREAM_API_KEY` + `STREAM_API_SECRET` in `apps/api/.env`; set `NEXT_PUBLIC_STREAM_API_KEY` in web; optionally `ZHIPU_API_KEY` for AI |
| 3 | Token comes from `POST /api/stream/token`; no hardcoded token |
| 4 | `disconnectUser()` is used correctly on cleanup and user change |
| 5 | Verify with Postman: GET healthz, POST stream/token, POST companion/channel |
