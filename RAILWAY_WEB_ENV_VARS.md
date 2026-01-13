# Railway Web App Environment Variables

## Required Environment Variables for @gepanda/web

You need to set the following environment variables in your Railway **@gepanda/web** service:

### 1. `NEXT_PUBLIC_STREAM_API_KEY` (Required)
- **Description**: Stream Chat API key for the frontend
- **Value**: Your Stream Chat API key (same as backend)
- **Example**: `t42e5mmyf6zb`
- **Why**: Required for Stream Chat functionality. Without this, chat will not work.

### 2. `NEXT_PUBLIC_API_URL` (Recommended)
- **Description**: URL of your backend API service
- **Value**: Your Railway API service URL (e.g., `https://your-api-service.railway.app`)
- **Example**: `https://gepanda-api-production.up.railway.app`
- **Why**: Allows the frontend to communicate with the backend API. If not set, defaults to `http://localhost:3001` (which won't work in production).

### 3. `PORT` (Automatic)
- **Description**: Port for the Next.js server
- **Value**: Automatically set by Railway
- **Why**: Railway automatically sets this. Your start script uses `$PORT`.

## How to Set Environment Variables in Railway

1. Go to your Railway dashboard
2. Select the **@gepanda/web** service
3. Go to the **Variables** tab
4. Click **+ New Variable**
5. Add each variable:
   - **Name**: `NEXT_PUBLIC_STREAM_API_KEY`
   - **Value**: Your Stream Chat API key
6. Repeat for `NEXT_PUBLIC_API_URL` with your API service URL

## Important Notes

- **`NEXT_PUBLIC_*` prefix**: These variables are exposed to the browser. Only use this prefix for variables that are safe to expose publicly.
- **API URL**: Make sure to use your Railway API service URL, not `localhost`
- **Rebuild Required**: After adding environment variables, Railway will automatically rebuild and redeploy your service.

## Example Configuration

```
NEXT_PUBLIC_STREAM_API_KEY=t42e5mmyf6zb
NEXT_PUBLIC_API_URL=https://gepanda-api-production.up.railway.app
```

## Finding Your API Service URL

1. Go to your Railway dashboard
2. Select your **@gepanda/api** service
3. Go to the **Settings** tab
4. Find your **Public Domain** or **Custom Domain**
5. Use that URL for `NEXT_PUBLIC_API_URL`

