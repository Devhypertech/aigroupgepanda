/**
 * Feed Ingestion Cron Job
 * Runs RSS and manual ingestion every 30-60 minutes
 */

import cron from 'node-cron';
import { ingestRssFeeds } from './ingest/rssIngest.js';
import { ingestManualItems } from './ingest/manualSeed.js';

let isRunning = false;

/**
 * Run all feed ingestion tasks
 */
async function runIngestion(): Promise<void> {
  if (isRunning) {
    console.log('[Feed Cron] Ingestion already running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('[Feed Cron] Starting feed ingestion...');

    // Run RSS ingestion
    const rssResult = await ingestRssFeeds();
    console.log('[Feed Cron] RSS ingestion completed:', {
      itemsProcessed: rssResult.itemsProcessed,
      itemsCreated: rssResult.itemsCreated,
      itemsUpdated: rssResult.itemsUpdated,
      errors: rssResult.errors.length,
    });

    // Run manual ingestion
    const manualResult = await ingestManualItems();
    console.log('[Feed Cron] Manual ingestion completed:', {
      itemsProcessed: manualResult.itemsProcessed,
      itemsCreated: manualResult.itemsCreated,
      itemsUpdated: manualResult.itemsUpdated,
      errors: manualResult.errors.length,
    });

    const duration = Date.now() - startTime;
    console.log(`[Feed Cron] Ingestion completed in ${duration}ms`);
  } catch (error) {
    console.error('[Feed Cron] Error during ingestion:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start feed ingestion cron job
 * Runs every 45 minutes by default (configurable via env var)
 */
export function startFeedCron(): void {
  // Get interval from env var (default: 45 minutes)
  const intervalMinutes = parseInt(process.env.FEED_INGESTION_INTERVAL_MINUTES || '45', 10);
  
  // Validate interval (must be between 30 and 60 minutes)
  const validInterval = Math.max(30, Math.min(60, intervalMinutes));
  
  // Convert to cron expression (every N minutes)
  // Cron format: "*/N * * * *" means every N minutes
  const cronExpression = `*/${validInterval} * * * *`;

  console.log(`[Feed Cron] Starting feed ingestion cron job (every ${validInterval} minutes)`);

  // Run immediately on startup (optional)
  if (process.env.FEED_INGESTION_RUN_ON_STARTUP !== 'false') {
    console.log('[Feed Cron] Running initial ingestion on startup...');
    runIngestion().catch(error => {
      console.error('[Feed Cron] Error in initial ingestion:', error);
    });
  }

  // Schedule recurring job
  cron.schedule(cronExpression, () => {
    runIngestion().catch(error => {
      console.error('[Feed Cron] Error in scheduled ingestion:', error);
    });
  });

  console.log(`[Feed Cron] Cron job scheduled with expression: ${cronExpression}`);
}

/**
 * Stop feed ingestion cron job (for testing/cleanup)
 */
export function stopFeedCron(): void {
  // Cron jobs are managed by node-cron, this is a placeholder
  // In production, you might want to track the task and stop it
  console.log('[Feed Cron] Stopping feed ingestion cron job');
}

