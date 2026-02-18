# Feed Ingestion v1 Implementation

## Summary
Implemented feed ingestion system with RSS feeds and manual curated items, with automatic deduplication and cron-based scheduling.

## Database Changes

### FeedItem Model Updates (`prisma/schema.prisma`)
- Added `externalId` field (String, nullable) for deduplication
- Added unique constraints:
  - `@@unique([source, externalId])` - Primary deduplication method
  - `@@unique([source, title])` - Fallback deduplication method
- Added index on `source` for faster lookups

## Ingestion Sources

### 1. RSS Feeds (`apps/api/src/feed/ingest/rssIngest.ts`)

**Configured Sources:**
- TechCrunch (filtered for AI/travel keywords)
- TravelPulse
- Lonely Planet

**Features:**
- Parses RSS/Atom feeds
- Extracts images from media:content, enclosure, or HTML content
- Extracts tags from categories and keyword matching
- Filters items by keywords (for TechCrunch)
- Uses feed item link/guid as `externalId` for deduplication

**Configuration:**
Edit `RSS_SOURCES` array in `rssIngest.ts` to add/remove feeds.

### 2. Manual Curated Items (`apps/api/src/feed/ingest/manualSeed.ts`)

**Sources:**
- Travel deals (JSON file)
- YouTube shorts (JSON file)

**File Location:**
`apps/api/data/manualFeedItems.json`

**Structure:**
```json
{
  "deals": [
    {
      "title": "...",
      "description": "...",
      "mediaUrl": "...",
      "affiliateUrl": "...",
      "tags": ["..."],
      "affiliateValue": 0.9,
      "externalId": "deal_..."
    }
  ],
  "youtubeShorts": [
    {
      "title": "...",
      "description": "...",
      "videoId": "youtube_video_id",
      "tags": ["..."],
      "externalId": "youtube_..."
    }
  ]
}
```

## Deduplication Logic

### Strategy (`apps/api/src/feed/ingest/normalize.ts`)

1. **Primary:** Try `(source + externalId)` unique constraint
2. **Fallback:** Try `(source + title)` unique constraint
3. **Manual fallback:** Query by source + title if constraints don't exist yet

### Behavior:
- **If item exists:** Update with latest data
- **If item is new:** Create new record
- **If duplicate:** Skip and log warning

## Cron Job (`apps/api/src/feed/cron.ts`)

### Configuration:
- **Default interval:** 45 minutes
- **Configurable via env:** `FEED_INGESTION_INTERVAL_MINUTES` (30-60 min range)
- **Run on startup:** Enabled by default (disable with `FEED_INGESTION_RUN_ON_STARTUP=false`)

### Schedule:
- Runs automatically on server startup
- Repeats every N minutes (default: 45)
- Prevents concurrent runs (locks while running)

## Usage

### 1. Setup Manual Items File

Create `apps/api/data/manualFeedItems.json`:
```bash
cp apps/api/data/manualFeedItems.example.json apps/api/data/manualFeedItems.json
# Edit with your curated items
```

### 2. Environment Variables

Add to `apps/api/.env`:
```env
# Optional: Customize ingestion interval (30-60 minutes)
FEED_INGESTION_INTERVAL_MINUTES=45

# Optional: Disable initial run on startup
FEED_INGESTION_RUN_ON_STARTUP=true
```

### 3. Run Migration

```bash
cd apps/api
npm run db:generate
npm run db:migrate -- --name add_external_id_and_deduplication
```

### 4. Manual Ingestion (for testing)

```typescript
import { ingestRssFeeds, ingestManualItems } from './feed/ingest';

// Run RSS ingestion
const rssResult = await ingestRssFeeds();
console.log(rssResult);

// Run manual ingestion
const manualResult = await ingestManualItems();
console.log(manualResult);
```

## API Endpoints

No new endpoints - ingestion runs automatically via cron.

## Monitoring

Check server logs for ingestion status:
```
[Feed Cron] Starting feed ingestion...
[RSS Ingest] Fetching TechCrunch from https://techcrunch.com/feed/
[RSS Ingest] Fetched 15 items from TechCrunch
[Normalize] Processed 45 items: 30 created, 10 updated, 5 skipped
[Feed Cron] Ingestion completed in 5234ms
```

## Files Created

1. `apps/api/src/feed/ingest/types.ts` - Type definitions
2. `apps/api/src/feed/ingest/rssIngest.ts` - RSS feed ingestion
3. `apps/api/src/feed/ingest/manualSeed.ts` - Manual curated items ingestion
4. `apps/api/src/feed/ingest/normalize.ts` - Normalization and deduplication
5. `apps/api/src/feed/ingest/index.ts` - Module exports
6. `apps/api/src/feed/cron.ts` - Cron job scheduler
7. `apps/api/data/manualFeedItems.example.json` - Example manual items file

## Files Modified

1. `prisma/schema.prisma` - Added externalId and unique constraints
2. `apps/api/src/index.ts` - Start cron job on server startup
3. `apps/api/src/feed/repository.ts` - Added externalId to seed data
4. `apps/api/src/feed/seed.ts` - Made source optional

## Dependencies Added

- `rss-parser` - RSS/Atom feed parsing
- `node-cron` - Cron job scheduling

## Next Steps

1. **Add more RSS sources** - Edit `RSS_SOURCES` in `rssIngest.ts`
2. **Curate manual items** - Create and populate `manualFeedItems.json`
3. **Monitor ingestion** - Check logs for errors and performance
4. **Adjust interval** - Tune `FEED_INGESTION_INTERVAL_MINUTES` based on needs
5. **Add error alerts** - Set up monitoring for failed ingestions
6. **Enhance deduplication** - Add fuzzy matching for similar titles if needed

