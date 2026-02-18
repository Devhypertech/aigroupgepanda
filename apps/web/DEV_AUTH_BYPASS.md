# Development Auth Bypass

## Overview
The `DEV_BYPASS_AUTH` feature allows bypassing authentication in local development to speed up testing and development workflows.

## Security

### Production Safety
**This bypass CANNOT be enabled in production**, even if `DEV_BYPASS_AUTH=true` is set. The middleware checks `NODE_ENV === 'production'` and will always require authentication in production environments.

### Development Only
The bypass only works when:
1. `NODE_ENV !== 'production'` (development or test environments)
2. `DEV_BYPASS_AUTH=true` is set in `.env.local`

## Usage

### Enable Bypass
Add to `apps/web/.env.local`:
```env
DEV_BYPASS_AUTH=true
```

### Disable Bypass
Remove the line or set to `false`:
```env
DEV_BYPASS_AUTH=false
```

## Behavior

When enabled:
- All routes (including `/feed` and `/chat`) are accessible without authentication
- No redirects to `/login`
- Console log shows: `[Middleware] DEV_BYPASS_AUTH enabled - allowing {path} without auth`

When disabled or in production:
- Normal authentication flow applies
- Protected routes redirect to `/login` if not authenticated

## Implementation Details

The bypass check happens in `apps/web/middleware.ts`:

```typescript
function isDevAuthBypassEnabled(): boolean {
  // Never allow bypass in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // Only allow bypass if explicitly enabled
  return process.env.DEV_BYPASS_AUTH === 'true';
}
```

## Notes

- The bypass applies to **all routes**, not just `/feed` and `/chat`
- This is intentional for development convenience
- Always test with authentication enabled before deploying
- Never commit `.env.local` with `DEV_BYPASS_AUTH=true` to version control

