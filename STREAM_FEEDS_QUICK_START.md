# Stream Activity Feeds - Quick Start Guide

## ✅ Implementation Complete!

Phase 1 (MVP) of Stream Activity Feeds integration is now complete.

## What's Working

1. **Stream Feeds Client** - Initialized and ready
2. **Collections** - Feed items sync to Stream Collections automatically
3. **Analytics Tracking** - Engagement events logged (ready for Stream API)
4. **Feed Sync** - New feed items automatically sync to Stream

## Verification Steps

### 1. Check Server Startup Logs

When you start the API server, you should see:

```
✅ Environment Variables Status:
   STREAM_API_KEY: ✓ Loaded
   STREAM_API_SECRET: ✓ Loaded
   STREAM_FEEDS_API_KEY: ✓ Loaded
   STREAM_FEEDS_API_SECRET: ✓ Loaded
...
✅ Stream Activity Feeds client initialized
```

If you see:
```
⚠️  Stream Activity Feeds not enabled (check API keys)
```
Check that `STREAM_API_KEY` and `STREAM_API_SECRET` are set in `apps/api/.env`

### 2. Test Feed Seeding

```bash
curl -X POST http://localhost:3001/api/feed/seed
```

Expected response:
```json
{
  "success": true,
  "message": "Feed seeded successfully",
  "stats": {
    "created": 25,
    "updated": 0,
    "skipped": 0,
    "total": 25
  }
}
```

### 3. Check Stream Dashboard

1. Go to [Stream Dashboard](https://dashboard.getstream.io/)
2. Select your app
3. Navigate to **Collections**
4. You should see collections:
   - `feed_item`
   - `product`
   - `article`
   - `destination`

### 4. Test Interaction Tracking

When users interact with feed items (view, click, save, like), check server logs for:

```
[Stream Analytics] Engagement: user=dev_user, item=..., action=click
[Stream Analytics] Impression: user=dev_user, item=...
```

## Troubleshooting

### "Stream Activity Feeds client not initialized"

**Solution:**
1. Verify `STREAM_API_KEY` and `STREAM_API_SECRET` in `apps/api/.env`
2. Restart the server
3. Check startup logs

### "Error upserting collection"

**Solution:**
1. Collections are auto-created on first upsert
2. Check Stream Dashboard → Collections
3. Verify API key has write permissions

### Analytics not showing in Stream Dashboard

**Note:** Analytics tracking is currently logging to console. To enable Stream Analytics:
1. Check your Stream plan (may require paid tier)
2. Update `apps/api/src/services/stream/analytics.ts` with correct API methods
3. See Stream documentation for Analytics API

## Next Steps

- **Phase 2:** Enable full Stream Analytics (when API confirmed)
- **Phase 3:** Add follow graph (users follow topics/destinations)
- **Phase 4:** Enable personalization (requires paid plan)

See `STREAM_ACTIVITY_FEEDS_INTEGRATION_PLAN.md` for full roadmap.

