# Add UserSignals Model Migration

This document outlines the steps to add the `UserSignals` model to your database schema using Prisma migrations.

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
   Next, create a new migration file that captures the changes (adding the `UserSignals` model) and apply it to your database.
   Navigate to the `apps/api` directory and run:
   ```bash
   cd apps/api
   npm run db:migrate -- --name add_user_signals
   ```
   - `--name add_user_signals`: This gives your migration a descriptive name. You can choose any name relevant to your changes.
   - Prisma will detect the new `UserSignals` model in `schema.prisma` and generate the necessary SQL to create the `user_signals` table.
   - It will then prompt you to confirm applying the migration. Type `y` and press Enter.

## Verification

After successfully running the migration, you can verify the changes:

- **Check your database:** Connect to your PostgreSQL database and confirm that a new table named `user_signals` exists with the `id`, `userId`, `lastIntent`, `destinationsJson`, `updatedAt`, and `createdAt` columns.
- **Prisma Studio:** You can also use Prisma Studio to view your database:
   ```bash
   cd apps/api
   npm run db:studio
   ```
   This will open a web interface where you can browse your database tables, including the new `user_signals` table.

## Troubleshooting

- **`DATABASE_URL` not set:** Ensure your `.env` file in the `apps/api` directory (or the root if it's a monorepo setup) has a valid `DATABASE_URL` pointing to your PostgreSQL database.
- **Migration conflicts:** If you encounter conflicts, you might need to resolve them manually or reset your database (use `npm run db:reset` in `apps/api` for development, but be cautious in production).
- **`Property 'userSignals' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'`:** This error typically means the Prisma client has not been regenerated after adding the `UserSignals` model. Rerun `npm run db:generate`.

