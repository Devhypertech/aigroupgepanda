/**
 * Shopping Agent
 * Handles product search, comparison, and purchase flows
 */

import { searchProducts, extractProductQuery } from '../productSearch.js';
import { createCheckoutLink } from '../crossmint.js';
import { generateChatResponse } from '../../chat/respond.js';

export interface ShoppingContext {
  productQuery?: string;
  productUrl?: string;
  price?: number;
  currency?: string;
}

export const shoppingAgent = {
  async handle(
    message: string,
    context: ShoppingContext | undefined,
    recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
    userId?: string,
    sessionId?: string
  ): Promise<{ text: string; ui?: any | null }> {
    const lowerMessage = message.toLowerCase().trim();

    // Detect purchase intent
    const hasPurchaseIntent = /(?:proceed|buy|purchase|checkout|order|confirm)\s+(?:with|the|this|it)/i.test(message);

    // Extract product query from message or context
    const productQuery = context?.productQuery || extractProductQuery(message)?.query || message;

    // If purchase intent, handle checkout
    if (hasPurchaseIntent && context?.productUrl) {
      try {
        const checkoutLink = await createCheckoutLink({
          productUrl: context.productUrl,
          quantity: 1,
          currency: context.currency || 'USD',
          userId,
        });

        if (checkoutLink?.checkoutUrl) {
          return {
            text: `I've prepared a checkout link for you. Click the button below to complete your purchase.`,
            ui: {
              type: 'checkout_card',
              data: {
                title: context.productQuery || 'Product',
                price: context.price?.toString() || undefined,
                currency: context.currency || 'USD',
                checkoutUrl: checkoutLink.checkoutUrl,
                provider: 'crossmint',
              },
            } as any,
          };
        }
      } catch (error) {
        console.error('[Shopping Agent] ❌ Checkout error:', error);
        console.error('[Shopping Agent] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[Shopping Agent] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[Shopping Agent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Fall through to product search or general response
      }
    }

    // Search for products
    if (productQuery && productQuery.length > 2) {
      try {
        const products = await searchProducts(productQuery, {
          limit: 10,
          sources: ['google_shopping', 'doba'],
        });

        if (products.length > 0) {
          // Generate AI response with product cards
          const productList = products.slice(0, 6).map(p => 
            `- ${p.title}${p.price ? ` (${p.currency || 'USD'} ${p.price})` : ''}${p.merchant ? ` from ${p.merchant}` : ''}`
          ).join('\n');

          const aiResponse = await generateChatResponse(
            `User is looking for: ${productQuery}. I found these products:\n${productList}\n\nProvide a helpful response with product recommendations.`,
            recentMessages,
            true // Enable UI mode
          );

          // Enhance UI with product cards
          if (!aiResponse.ui) {
            aiResponse.ui = {
              type: 'cards',
              cards: products.slice(0, 6).map(product => ({
                id: product.id,
                title: product.title,
                subtitle: product.merchant || product.source,
                description: product.price ? `${product.currency || 'USD'} ${product.price}` : undefined,
                imageUrl: product.image,
                actions: [
                  { label: 'Compare', action: 'compare', value: product.id },
                  { label: 'Add to cart', action: 'add_to_cart', value: product.id },
                  { label: 'Buy now', action: 'buy_now', value: product.id, url: product.url },
                ],
                metadata: {
                  productId: product.id,
                  productUrl: product.url,
                  price: product.price?.toString(),
                  currency: product.currency,
                  source: product.source,
                },
              })),
            } as any;
          }

          return {
            text: aiResponse.text || `I found ${products.length} products for "${productQuery}". Here are some recommendations:`,
            ui: aiResponse.ui,
          };
        }
      } catch (error) {
        console.error('[Shopping Agent] ❌ Product search error:', error);
        console.error('[Shopping Agent] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[Shopping Agent] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[Shopping Agent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Fall through to general AI response
      }
    }

    // Fallback to general AI response
    const response = await generateChatResponse(message, recentMessages, false);
    return {
      text: response.text || 'I can help you find products. What are you looking for?',
      ui: response.ui || null,
    };
  },
};

