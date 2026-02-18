/**
 * Product Context Service
 * Persists and retrieves product search results for chat conversations
 */

import { prisma } from '../db/client.js';

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  merchant: string;
  url: string;
  source: string;
}

/**
 * Save product search results to database
 */
export async function saveProductContext(
  conversationId: string,
  userId: string,
  query: string,
  products: Product[]
): Promise<void> {
  if (!prisma) {
    console.warn('[ProductContext] Prisma not available, skipping product context save');
    return;
  }

  try {
    await (prisma as any).chatContextProduct.create({
      data: {
        conversationId,
        userId,
        query,
        productsJson: products,
      },
    });
    console.log(`[ProductContext] Saved ${products.length} products for conversation ${conversationId}`);
  } catch (error) {
    console.error('[ProductContext] Error saving product context:', error);
    // Don't throw - allow chat to continue even if persistence fails
  }
}

/**
 * Get the latest product search results for a conversation
 */
export async function getLatestProductContext(
  conversationId: string
): Promise<{ products: Product[]; query: string } | null> {
  if (!prisma) {
    console.warn('[ProductContext] Prisma not available, returning null');
    return null;
  }

  try {
    const context = await (prisma as any).chatContextProduct.findFirst({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!context) {
      return null;
    }

    return {
      products: context.productsJson as Product[],
      query: context.query,
    };
  } catch (error) {
    console.error('[ProductContext] Error getting product context:', error);
    return null;
  }
}

/**
 * Find a product by ID from the latest search results
 */
export async function findProductById(
  conversationId: string,
  productId: string
): Promise<Product | null> {
  try {
    const context = await getLatestProductContext(conversationId);
    
    if (!context) {
      return null;
    }

    const product = context.products.find((p: Product) => p.id === productId);
    return product || null;
  } catch (error) {
    console.error('[ProductContext] Error finding product by ID:', error);
    return null;
  }
}
