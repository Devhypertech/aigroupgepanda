/**
 * Link Extractor and UI Widget Generator
 * Extracts URLs from text and converts them into structured UI widgets
 */

export interface ExtractedLink {
  url: string;
  label?: string;
  context?: string; // Text around the link for context
}

export interface ProductCard {
  title: string;
  subtitle?: string;
  description?: string;
  actions: Array<{
    label: string;
    url: string;
    action?: string;
  }>;
}

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): ExtractedLink[] {
  const urls: ExtractedLink[] = [];
  
  // Pattern to match URLs (http/https/www or domain patterns)
  const urlPattern = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s\)]*)/gi;
  
  const matches = text.matchAll(urlPattern);
  
  for (const match of matches) {
    const url = match[0];
    const index = match.index || 0;
    
    // Normalize URL
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }
    
    // Extract context (50 chars before and after)
    const contextStart = Math.max(0, index - 50);
    const contextEnd = Math.min(text.length, index + url.length + 50);
    const context = text.substring(contextStart, contextEnd).trim();
    
    // Try to extract label from context (look for patterns like "Purchase Link:", "Buy:", etc.)
    let label: string | undefined;
    const labelPatterns = [
      /(?:purchase\s+link|buy|shop|get|order|check\s+out):\s*/i,
      /\*\*(.*?)\*\*:\s*<?https?/i,
      /\[(.*?)\]\(https?/i,
    ];
    
    for (const pattern of labelPatterns) {
      const labelMatch = context.match(pattern);
      if (labelMatch) {
        label = labelMatch[1] || 'Purchase';
        break;
      }
    }
    
    urls.push({
      url: normalizedUrl,
      label: label || 'Open Link',
      context,
    });
  }
  
  return urls;
}

/**
 * Extract product cards from text with "Purchase Link:" patterns
 * Looks for patterns like:
 * - "**Product Name**\nPurchase Link: <url>"
 * - "Product Name\nPurchase Link: <url>"
 * - "Product Name - Description\nPurchase Link: <url>"
 * - "1. Product Name\n   Purchase Link: <url>"
 */
export function extractProductCards(text: string): ProductCard[] {
  const cards: ProductCard[] = [];
  
  // Split text into lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentCard: Partial<ProductCard> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains a purchase link
    const purchaseLinkMatch = line.match(/(?:purchase\s+link|buy|shop|order|check\s+out|purchase):\s*(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,})/i);
    
    if (purchaseLinkMatch) {
      const url = purchaseLinkMatch[1];
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Extract title from before the purchase link
      const titlePart = line.substring(0, purchaseLinkMatch.index).trim();
      
      // If we have a current card, add the action
      if (currentCard && currentCard.title) {
        if (!currentCard.actions) {
          currentCard.actions = [];
        }
        currentCard.actions.push({
          label: 'Purchase',
          url: normalizedUrl,
          action: 'open_url',
        });
        
        // Finalize the card
        cards.push(currentCard as ProductCard);
        currentCard = null;
      } else if (titlePart) {
        // Create a new card from the purchase link line
        const cleanTitle = titlePart.replace(/[*:]/g, '').replace(/^\d+\.\s*/, '').trim();
        cards.push({
          title: cleanTitle || 'Product',
          actions: [{
            label: 'Purchase',
            url: normalizedUrl,
            action: 'open_url',
          }],
        });
      } else {
        // No title found, check previous line
        if (i > 0) {
          const prevLine = lines[i - 1];
          const cleanTitle = prevLine.replace(/[*:]/g, '').replace(/^\d+\.\s*/, '').trim();
          cards.push({
            title: cleanTitle || 'Product',
            actions: [{
              label: 'Purchase',
              url: normalizedUrl,
              action: 'open_url',
            }],
          });
        }
      }
    } else {
      // Check if this looks like a product title (bold text, numbered list, or standalone line)
      const boldMatch = line.match(/\*\*(.+?)\*\*/);
      const numberedMatch = line.match(/^\d+\.\s*(.+)/);
      const isTitle = boldMatch || numberedMatch || (line.length < 100 && !line.includes('http') && !line.match(/^[a-z]/));
      
      if (isTitle && !currentCard) {
        // Start a new card
        const title = boldMatch ? boldMatch[1] : (numberedMatch ? numberedMatch[1] : line);
        currentCard = {
          title: title.trim(),
        };
      } else if (currentCard && !line.includes('http') && !line.match(/^(purchase|buy|shop|order)/i)) {
        // Add description or subtitle
        if (!currentCard.subtitle && line.length < 150 && !line.match(/^[-•]/)) {
          currentCard.subtitle = line;
        } else if (!currentCard.description && line.length > 50) {
          currentCard.description = line;
        }
      }
    }
  }
  
  // If we have a pending card without actions, discard it
  if (currentCard && currentCard.actions && currentCard.actions.length > 0) {
    cards.push(currentCard as ProductCard);
  }
  
  return cards;
}

/**
 * Extract product recommendations from text
 * Always tries to extract product cards, regardless of query type
 * This allows post-processing of any AI response that contains purchase links
 */
export function extractProductRecommendations(text: string): ProductCard[] {
  // Try to extract product cards using the purchase link pattern
  const cards = extractProductCards(text);
  
  // If cards found, return them
  if (cards.length > 0) {
    return cards;
  }
  
  // If no cards found but URLs exist, create cards from URLs
  const urls = extractUrls(text);
  if (urls.length > 0) {
    // Group URLs by context to create cards
    const urlGroups = new Map<string, ExtractedLink[]>();
    
    for (const link of urls) {
      // Extract a key from context (first few words before URL)
      const contextKey = link.context?.split(/\s+/).slice(0, 5).join(' ').replace(/https?:\/\//gi, '').trim() || 'Product';
      // Use a simplified key for grouping
      const groupKey = contextKey.substring(0, 30);
      if (!urlGroups.has(groupKey)) {
        urlGroups.set(groupKey, []);
      }
      urlGroups.get(groupKey)!.push(link);
    }
    
    // Create cards from URL groups
    for (const [groupKey, links] of urlGroups.entries()) {
      // Extract a better title from the first link's context
      const firstLink = links[0];
      let title = 'Product';
      
      // Try to extract product name from context
      if (firstLink.context) {
        // Look for patterns like "Product Name:" or "**Product**"
        const titleMatch = firstLink.context.match(/(?:^|\n)(\*\*)?([A-Z][^:\n*]{5,40})(\*\*)?(?:\s*:|\s*$)/);
        if (titleMatch) {
          title = titleMatch[2].trim();
        } else {
          // Use first few words of context
          const words = firstLink.context.split(/\s+/).filter(w => w.length > 3 && !w.match(/^https?/));
          if (words.length > 0) {
            title = words.slice(0, 4).join(' ');
          }
        }
      }
      
      cards.push({
        title: title.length > 50 ? title.substring(0, 50) + '...' : title,
        actions: links.map(link => ({
          label: link.label || 'Purchase',
          url: link.url,
          action: 'open_url',
        })),
      });
    }
  }
  
  return cards;
}

/**
 * Clean text by removing Purchase Link lines
 */
export function cleanPurchaseLinks(text: string): string {
  // Remove lines containing "Purchase Link:", "Buy:", etc.
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const lowerLine = line.toLowerCase().trim();
    return !lowerLine.match(/^(purchase\s+link|buy|shop|order|check\s+out):/i);
  });
  
  return cleanedLines.join('\n').trim();
}
