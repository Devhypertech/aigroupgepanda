# Stream Activity Feeds Setup Guide

## Environment Variables

Add the following to your `apps/api/.env` file:

### Option 1: Use Same Stream App (Recommended for MVP)

If Stream Chat and Activity Feeds are in the same Stream app, you can reuse the same keys:

```env
# Stream Chat & Activity Feeds (same app)
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
```

The Stream Feeds client will automatically use these keys.

### Option 2: Separate Stream Apps

If you have separate Stream apps for Chat and Feeds:

```env
# Stream Chat
STREAM_API_KEY=your_chat_api_key
STREAM_API_SECRET=your_chat_api_secret

# Stream Activity Feeds (separate app)
STREAM_FEEDS_API_KEY=your_feeds_api_key
STREAM_FEEDS_API_SECRET=your_feeds_api_secret
```

## Getting Your Stream API Keys

1. **If you already have Stream Chat set up:**
   - Go to [Stream Dashboard](https://dashboard.getstream.io/)
   - Select your app
   - Go to "API Keys" section
   - Copy the "Key" and "Secret"

2. **If you need to create a new Stream app:**
   - Go to [Stream Dashboard](https://dashboard.getstream.io/)
   - Click "Create App"
   - Choose "Activity Feeds" or "Full Stack" (includes both Chat and Feeds)
   - Copy the API Key and Secret

## Stream App Configuration

### Enable Activity Feeds

1. In Stream Dashboard, go to your app
2. Navigate to "Activity Feeds" section
3. Enable "Activity Feeds" if not already enabled

### Create Collections (Optional but Recommended)

Collections are used to store structured content metadata:

1. Go to "Collections" in Stream Dashboard
2. Create the following collections:
   - `feed_item` - General feed items
   - `product` - Travel products/deals
   - `destination` - Travel destinations
   - `article` - Travel articles

**Note:** Collections are automatically created when you first upsert data, but you can pre-create them in the dashboard for better organization.

## Testing the Integration

After setting up environment variables:

1. **Start the API server:**
   ```bash
   npm run dev --workspace=@gepanda/api
   ```

2. **Check startup logs:**
   You should see:
   ```
   ✅ Stream Activity Feeds client initialized
   ```

   If you see:
   ```
   ⚠️  Stream Activity Feeds not enabled (check API keys)
   ```
   Check your environment variables.

3. **Seed feed items:**
   ```bash
   curl -X POST http://localhost:3001/api/feed/seed
   ```

4. **Check Stream Dashboard:**
   - Go to "Collections" → You should see items in `feed_item`, `product`, etc.
   - Go to "Analytics" → You should see engagement events when users interact

## Troubleshooting

### "Stream Activity Feeds client not initialized"

**Possible causes:**
- Missing `STREAM_API_KEY` or `STREAM_API_SECRET`
- Invalid API keys
- Activity Feeds not enabled in Stream Dashboard

**Solution:**
1. Verify environment variables are set
2. Check API keys in Stream Dashboard
3. Ensure Activity Feeds is enabled in your Stream app

### "Error upserting collection"

**Possible causes:**
- Collection doesn't exist (will be auto-created)
- Invalid data format
- API key doesn't have permissions

**Solution:**
1. Check Stream Dashboard → Collections
2. Verify API key has write permissions
3. Check server logs for specific error messages

### Analytics not tracking

**Possible causes:**
- Analytics not enabled in Stream plan
- Invalid user IDs
- Network issues

**Solution:**
1. Check Stream Dashboard → Analytics (may require paid plan)
2. Verify user IDs are valid strings
3. Check server logs for errors

## Next Steps

Once setup is complete:

1. **Phase 1 Complete:** Real-time updates are enabled
2. **Phase 2:** Analytics tracking is active
3. **Phase 3:** Add follow graph (optional)
4. **Phase 4:** Enable personalization (requires paid plan)

See `STREAM_ACTIVITY_FEEDS_INTEGRATION_PLAN.md` for full integration roadmap.

