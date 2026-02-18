/**
 * Feed Zod Schemas
 * Validation schemas for FeedItem and API responses
 */

import { z } from 'zod';

/**
 * FeedItem type enum
 */
export const FeedItemTypeSchema = z.enum([
  'deal',
  'article',
  'video',
  'destination',
  'product',
  'weather',
  'insight',
]);

/**
 * FeedItem category enum
 */
export const FeedItemCategorySchema = z.enum([
  'travel',
  'deals',
  'news',
  'entertainment',
  'lifestyle',
  'tech',
  'food',
  'adventure',
]);

/**
 * FeedItem Zod schema
 */
export const FeedItemSchema = z.object({
  id: z.string().cuid(),
  type: FeedItemTypeSchema,
  category: FeedItemCategorySchema.nullable(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  mediaUrl: z.string().url().nullable(),
  source: z.string().nullable(),
  affiliateUrl: z.string().url().nullable(),
  tagsJson: z.array(z.string()).nullable(),
  score: z.number().min(0).max(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Feed response DTO
 */
export const FeedResponseSchema = z.object({
  items: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
});

/**
 * Feed query params schema
 */
export const FeedQuerySchema = z.object({
  category: FeedItemCategorySchema.optional(),
  type: FeedItemTypeSchema.optional(),
  tagFilter: z.string().optional(), // Filter by tag in tagsJson array
  lens: z.enum(['traveler', 'founder', 'investor']).optional(), // Filter by lens
  interests: z.string().optional(), // Comma-separated list of interests
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(50).optional().default(20),
});

export type FeedItemType = z.infer<typeof FeedItemTypeSchema>;
export type FeedItemCategory = z.infer<typeof FeedItemCategorySchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

