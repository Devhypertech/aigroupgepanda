/**
 * Product Search Service
 * Unified product search interface
 */

import { searchShopping, type Product } from './serpApiShopping.js';

/**
 * Search for products
 * @param query Search query string
 * @returns Array of Product objects
 */
export async function searchProducts(query: string): Promise<Product[]> {
  return searchShopping(query);
}

// Re-export Product type
export type { Product };

