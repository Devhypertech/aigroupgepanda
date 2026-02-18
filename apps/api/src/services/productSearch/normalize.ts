/**
 * Product Normalization Service
 * Normalizes products from different sources into a unified format
 */

export interface NormalizedProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  source: string;
  url: string;
  rating?: number;
  shipping?: string;
  availability?: string;
  currency?: string;
  merchant?: string;
}

/**
 * Normalize product from SerpAPI Google Shopping format
 */
export function normalizeSerpApiProduct(item: any, index: number): NormalizedProduct {
  let price = 0;
  let currency = 'USD';

  if (item.price) {
    const priceStr = String(item.price);
    const priceMatch = priceStr.match(/([\d,]+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    const currencyMatch = priceStr.match(/[^\d,.\s]+/);
    if (currencyMatch) {
      const currencyStr = currencyMatch[0].toUpperCase();
      if (currencyStr === '$' || currencyStr.includes('USD')) {
        currency = 'USD';
      } else if (currencyStr === '€' || currencyStr.includes('EUR')) {
        currency = 'EUR';
      } else if (currencyStr === '£' || currencyStr.includes('GBP')) {
        currency = 'GBP';
      } else {
        currency = currencyStr;
      }
    }
  }

  return {
    id: item.product_id || `serpapi_${index}_${Date.now()}`,
    title: item.title || 'Untitled Product',
    price,
    currency,
    image: item.thumbnail || item.image || 'https://via.placeholder.com/300',
    source: 'serpapi',
    url: item.link || item.product_link || '#',
    rating: item.rating ? parseFloat(String(item.rating)) : undefined,
    shipping: item.shipping || undefined,
    availability: item.availability || (item.in_stock ? 'in stock' : undefined),
    merchant: item.source || item.seller || undefined,
  };
}

/**
 * Normalize product from Doba format
 */
export function normalizeDobaProduct(item: any, index: number): NormalizedProduct {
  let price = 0;
  let currency = 'USD';

  if (item.price) {
    const priceStr = String(item.price);
    const priceMatch = priceStr.match(/([\d,]+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    currency = item.currency || 'USD';
  }

  return {
    id: item.id || `doba_${index}_${Date.now()}`,
    title: item.title || 'Untitled Product',
    price,
    currency,
    image: item.image || 'https://via.placeholder.com/300',
    source: 'doba',
    url: item.url || '#',
    rating: item.rating ? parseFloat(String(item.rating)) : undefined,
    shipping: item.shipping || undefined,
    availability: item.availability || (item.in_stock ? 'in stock' : undefined),
    merchant: item.merchant || undefined,
  };
}

/**
 * Normalize product from Google Shopping API format (if different from SerpAPI)
 */
export function normalizeGoogleShoppingProduct(item: any, index: number): NormalizedProduct {
  // Similar to SerpAPI but might have different field names
  return normalizeSerpApiProduct(item, index);
}

/**
 * Filter products by budget if specified
 */
export function filterByBudget(
  products: NormalizedProduct[],
  budget?: { min?: number; max?: number; currency?: string }
): NormalizedProduct[] {
  if (!budget || (!budget.min && !budget.max)) {
    return products;
  }

  return products.filter(product => {
    // Convert product price to budget currency if needed
    // For simplicity, assume USD for now
    const productPrice = product.price || 0;

    if (budget.min && productPrice < budget.min) {
      return false;
    }

    if (budget.max && productPrice > budget.max) {
      return false;
    }

    return true;
  });
}

