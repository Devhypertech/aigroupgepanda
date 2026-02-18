/**
 * Products API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { searchProducts, productToFeedItem } from '../commerce/products.js';
import { searchGoogleShopping } from '../services/serpapiShopping.js';
import { dobaSearch } from '../services/doba.js';
import { searchProducts as unifiedSearch, extractProductQuery } from '../services/productSearch.js';
import { unifiedProductSearch } from '../services/productSearch/unifiedSearch.js';
import { detectProductIntent } from '../services/productSearch/intentDetection.js';

const router = Router();

// Request validation schema
const searchProductsSchema = z.object({
  q: z.string().optional().default(''),
  limit: z.number().int().positive().max(50).optional().default(20),
  source: z.enum(['google_shopping', 'amazon', 'doba']).optional(),
  sources: z.array(z.enum(['google_shopping', 'amazon', 'doba'])).optional(),
  page: z.number().int().positive().optional().default(1),
  country: z.string().optional(),
  language: z.string().optional(),
  location: z.string().optional(),
});

/**
 * GET /api/products/search
 * Search products by query
 * 
 * Query params:
 * - q or query: Search query (required for google_shopping and doba, optional for default)
 * - limit: Max results (default: 20, max: 50)
 * - source: Product source ('google_shopping', 'doba', or default)
 * - page: Page number for pagination (default: 1, for google_shopping and doba)
 * - country: Country code for Google Shopping (e.g., "US", "GB")
 * - language: Language code for Google Shopping (e.g., "en", "es")
 * - location: Location string for Google Shopping (e.g., "United States")
 * 
 * Examples:
 * - Default search: GET /api/products/search?q=travel+adapter
 * - Google Shopping: GET /api/products/search?query=laptop&source=google_shopping&page=1
 * - Doba search: GET /api/products/search?query=travel+gear&source=doba&page=1
 * - Google Shopping with location: GET /api/products/search?query=phone&source=google_shopping&country=US&location=New+York
 */
/**
 * GET /api/products/search
 * Unified product search across all sources
 * 
 * Query params:
 * - q or query: Search query
 * - limit: Max results (default: 20, max: 50)
 * - source: Single source ('google_shopping', 'amazon', 'doba')
 * - sources: Multiple sources (comma-separated)
 * - page: Page number
 * - country, language, location: For Google Shopping/Amazon
 */
router.get('/search', async (req, res) => {
  try {
    // Parse sources array if provided
    let parsedSources: ('google_shopping' | 'amazon' | 'doba')[] | undefined;
    if (req.query.sources) {
      parsedSources = String(req.query.sources).split(',').map(s => s.trim()) as any;
    } else if (req.query.source) {
      parsedSources = [req.query.source as any];
    }

    // Validate query params
    const validationResult = searchProductsSchema.safeParse({
      q: req.query.query || req.query.q || '',
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      source: req.query.source,
      sources: parsedSources,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      country: req.query.country,
      language: req.query.language,
      location: req.query.location,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: validationResult.error.issues,
      });
    }

    const { q, limit, source, sources, page, country, language, location } = validationResult.data;

    // If multiple sources or unified search requested, use unified search
    if (sources && sources.length > 1) {
      const products = await unifiedSearch(q, {
        sources: sources,
        limit,
        page,
        country,
        language,
        location,
      });

      return res.json({
        items: products,
        count: products.length,
        query: q,
        sources: sources,
        page,
      });
    }

    // Single source search (backward compatibility)
    if (source === 'google_shopping') {
      // Google Shopping search via SerpAPI
      if (!q || q.trim() === '') {
        return res.status(400).json({
          error: 'Query parameter is required for Google Shopping search',
        });
      }

      const googleProducts = await searchGoogleShopping(q, {
        country: req.query.country as string | undefined,
        language: req.query.language as string | undefined,
        location: req.query.location as string | undefined,
        page,
      });

      // Limit results
      const items = googleProducts.slice(0, limit);

      return res.json({
        items,
        count: items.length,
        query: q,
        source: 'google_shopping',
        page,
      });
    } else if (source === 'amazon') {
      // Amazon search via unified search
      if (!q || q.trim() === '') {
        return res.status(400).json({
          error: 'Query parameter is required for Amazon search',
        });
      }

      const amazonProducts = await unifiedSearch(q, {
        sources: ['amazon' as const],
        limit,
        page,
        country,
        language,
        location,
      });

      return res.json({
        items: amazonProducts,
        count: amazonProducts.length,
        query: q,
        source: 'amazon',
        page,
      });
    } else if (source === 'doba') {
      // Doba product search
      if (!q || q.trim() === '') {
        return res.status(400).json({
          error: 'Query parameter is required for Doba search',
        });
      }

      const dobaProducts = await dobaSearch(q, {
        page,
        limit,
      });

      return res.json({
        items: dobaProducts,
        count: dobaProducts.length,
        query: q,
        source: 'doba',
        page,
      });
    } else {
      // Default: existing product search
      const products = searchProducts(q, limit);

      // Convert to FeedItem format
      const items = products.map(productToFeedItem);

      return res.json({
        items,
        count: items.length,
        query: q,
      });
    }
  } catch (error) {
    console.error('[Products] Error searching products:', error);
    res.status(500).json({
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/products/search
 * Unified product search with intent detection
 * 
 * Body:
 * - query: Search query (user text or search box input)
 * - category: Optional category filter
 * 
 * Returns top 10 normalized products
 */
router.post('/search', async (req, res) => {
  try {
    const searchSchema = z.object({
      query: z.string().min(1, 'Query is required'),
      category: z.string().optional(),
    });

    const validationResult = searchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { query, category } = validationResult.data;

    // Detect intent (product name, category, budget)
    const intent = detectProductIntent(query);
    console.log('[Products] Detected intent:', intent);

    // Use provided category or detected category
    const searchCategory = category || intent.category;

    // Search all APIs in parallel
    const products = await unifiedProductSearch(query, {
      category: searchCategory,
      budget: intent.budget,
    });

    // Return top 10 products
    const topProducts = products.slice(0, 10);

    res.json({
      products: topProducts,
      count: topProducts.length,
      query,
      intent: {
        productName: intent.productName,
        category: searchCategory,
        budget: intent.budget,
      },
    });
  } catch (error) {
    console.error('[Products] Error in POST /search:', error);
    res.status(500).json({
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

