/**
 * Product Search Intent Detection
 * Extracts product name, category, and budget from user input
 */

export interface ProductSearchIntent {
  productName: string;
  category?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

/**
 * Detect product search intent from user text
 */
export function detectProductIntent(text: string): ProductSearchIntent {
  const normalizedText = text.toLowerCase().trim();
  
  // Extract product name (main query)
  let productName = normalizedText;
  
  // Extract category keywords
  const categoryKeywords: Record<string, string[]> = {
    electronics: ['phone', 'laptop', 'tablet', 'headphones', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse'],
    clothing: ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'hat', 'socks', 'underwear'],
    home: ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'decor', 'kitchen'],
    sports: ['bike', 'bicycle', 'running', 'gym', 'fitness', 'yoga', 'tennis', 'basketball'],
    beauty: ['makeup', 'skincare', 'perfume', 'shampoo', 'soap', 'lotion'],
    books: ['book', 'novel', 'textbook', 'ebook'],
    toys: ['toy', 'game', 'puzzle', 'doll', 'lego'],
    automotive: ['car', 'tire', 'battery', 'oil', 'filter'],
  };
  
  let detectedCategory: string | undefined;
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalizedText.includes(keyword))) {
      detectedCategory = category;
      // Remove category keyword from product name if it's at the start
      const matchedKeyword = keywords.find(k => normalizedText.startsWith(k));
      if (matchedKeyword) {
        productName = normalizedText.replace(new RegExp(`^${matchedKeyword}\\s+`), '').trim();
      }
      break;
    }
  }
  
  // Extract budget information
  const budget: { min?: number; max?: number; currency?: string } = {};
  
  // Patterns for budget extraction
  const budgetPatterns = [
    // "$100 to $200", "$100-$200", "$100 - $200"
    /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|-|–|—)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    // "under $100", "below $100", "less than $100"
    /(?:under|below|less than|max|maximum)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    // "over $100", "above $100", "more than $100", "min $100"
    /(?:over|above|more than|min|minimum|at least)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    // "around $100", "about $100", "$100"
    /(?:around|about|approximately)?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  ];
  
  for (const pattern of budgetPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const parseAmount = (str: string) => parseFloat(str.replace(/,/g, ''));
      
      if (match[2]) {
        // Range: "$100 to $200"
        budget.min = parseAmount(match[1]);
        budget.max = parseAmount(match[2]);
      } else if (pattern.source.includes('under|below|less than|max')) {
        // Maximum: "under $100"
        budget.max = parseAmount(match[1]);
      } else if (pattern.source.includes('over|above|more than|min')) {
        // Minimum: "over $100"
        budget.min = parseAmount(match[1]);
      } else {
        // Approximate: "around $100"
        const amount = parseAmount(match[1]);
        budget.min = amount * 0.8; // 20% below
        budget.max = amount * 1.2; // 20% above
      }
      
      budget.currency = 'USD'; // Default to USD, could be extracted from text
      break;
    }
  }
  
  // Clean up product name - remove budget-related text
  if (budget.min || budget.max) {
    productName = productName
      .replace(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|-|–|—)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, '')
      .replace(/(?:under|below|less than|over|above|more than|around|about|approximately|min|max|minimum|maximum)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, '')
      .replace(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '')
      .trim();
  }
  
  return {
    productName: productName || normalizedText,
    category: detectedCategory,
    budget: Object.keys(budget).length > 0 ? budget : undefined,
  };
}

