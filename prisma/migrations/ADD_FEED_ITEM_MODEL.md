# Add FeedItem Model Migration

This document outlines the steps to add the `FeedItem` model to your database schema using Prisma migrations.

## Steps

1. **Generate Prisma Client:**
   First, ensure your Prisma client is up-to-date with the latest schema changes.
   Navigate to the `apps/api` directory and run:
   ```bash
   cd apps/api
   npm run db:generate
   ```
   This command generates the Prisma client based on your `prisma/schema.prisma` file.

2. **Create and Apply Migration:**
   Next, create a new migration file that captures the changes (adding the `FeedItem` model) and apply it to your database.
   Navigate to the `apps/api` directory and run:
   ```bash
   cd apps/api
   npm run db:migrate -- --name add_feed_item_model
   ```
   - `--name add_feed_item_model`: This gives your migration a descriptive name. You can choose any name relevant to your changes.
   - Prisma will detect the new `FeedItem` model in `schema.prisma` and generate the necessary SQL to create the `feed_items` table.
   - It will then prompt you to confirm applying the migration. Type `y` and press Enter.

## Verification

After successfully running the migration, you can verify the changes:

- **Check your database:** Connect to your PostgreSQL database and confirm that a new table named `feed_items` exists with the following columns:
  - `id` (cuid)
  - `type` (String)
  - `category` (String, nullable)
  - `title` (String)
  - `description` (Text)
  - `mediaUrl` (String, nullable)
  - `source` (String, nullable)
  - `affiliateUrl` (String, nullable)
  - `tagsJson` (Json, nullable)
  - `score` (Float, default 0.0)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)
- **Prisma Studio:** You can also use Prisma Studio to view your database:
   ```bash
   cd apps/api
   npm run db:studio
   ```
   This will open a web interface where you can browse your database tables, including the new `feed_items` table.

## Troubleshooting

- **`DATABASE_URL` not set:** Ensure your `.env` file in the `apps/api` directory (or the root if it's a monorepo setup) has a valid `DATABASE_URL` pointing to your PostgreSQL database.
- **Migration conflicts:** If you encounter conflicts, you might need to resolve them manually or reset your database (use `npm run db:reset` in `apps/api` for development, but be cautious in production).
- **`Property 'feedItem' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'`:** This error typically means the Prisma client has not been regenerated after adding the `FeedItem` model. Rerun `npm run db:generate`.

## Seed Data

After migration, the feed items will be automatically seeded on server startup. You can verify this by checking the server logs for:
```
[Feed] Seeded X feed items
```

