/**
 * Deterministic Fallback for "Why This Matters"
 * Generates category-based explanations when AI fails
 */

export interface WhyContent {
  summary: string;
  why: string;
  impact: string;
  actions: {
    now: string;
    soon: string;
    later: string;
  };
}

/**
 * Generate deterministic "Why this matters" based on category and type
 */
export function generateDeterministicWhy(
  title: string,
  category?: string | null,
  type?: string | null,
  source?: string | null
): WhyContent {
  const cat = (category || '').toLowerCase();
  const itemType = (type || '').toLowerCase();
  
  // Category-based explanations
  let why = '';
  let impact = '';
  let actions = {
    now: '',
    soon: '',
    later: '',
  };
  
  if (cat.includes('deal') || cat.includes('discount')) {
    why = `This deal offers potential savings for your travel plans. ${title.includes('flight') || title.includes('hotel') ? 'Booking early or during sales can significantly reduce costs.' : 'Limited-time offers require quick action to secure the best prices.'}`;
    impact = 'Taking advantage of deals can help you travel more frequently or upgrade your experience within the same budget. Missing out means paying full price later.';
    actions = {
      now: 'If traveling within 7 days, check availability and book immediately if the deal fits your dates.',
      soon: 'If traveling in the next month, compare this deal with your planned dates and consider adjusting if savings are significant.',
      later: 'Bookmark this for future reference and set price alerts for similar deals.',
    };
  } else if (cat.includes('safety') || cat.includes('security') || cat.includes('warning')) {
    why = `Safety information is critical for travelers. ${title.includes('travel advisory') || title.includes('warning') ? 'Being aware of current conditions helps you make informed decisions.' : 'Understanding safety protocols ensures a secure travel experience.'}`;
    impact = 'Ignoring safety information can put you at risk. Staying informed helps you avoid dangerous situations and ensures compliance with local regulations.';
    actions = {
      now: 'If traveling soon, review current travel advisories and adjust plans if necessary. Register with your embassy.',
      soon: 'Monitor updates regularly and prepare contingency plans. Ensure travel insurance covers your destination.',
      later: 'Keep this information in mind when planning future trips to this region.',
    };
  } else if (cat.includes('visa') || cat.includes('entry') || cat.includes('document')) {
    why = `Entry requirements and visa information are essential for international travel. ${title.includes('visa') ? 'Understanding visa requirements prevents travel disruptions.' : 'Documentation requirements vary by destination and can change.'}`;
    impact = 'Missing or incorrect documentation can result in denied entry, wasted expenses, and disrupted travel plans. Proper preparation ensures smooth border crossings.';
    actions = {
      now: 'If traveling within 30 days, verify all documents are current and apply for visas immediately if needed.',
      soon: 'Check visa requirements for your destination and start the application process early (can take weeks).',
      later: 'Research visa requirements when planning your trip and note any changes in entry policies.',
    };
  } else if (cat.includes('weather') || cat.includes('climate')) {
    why = `Weather conditions significantly impact travel experiences. ${title.includes('forecast') ? 'Knowing what to expect helps you pack appropriately and plan activities.' : 'Climate information helps you choose the best time to visit.'}`;
    impact = 'Unexpected weather can disrupt flights, outdoor activities, and overall enjoyment. Being prepared ensures comfort and safety.';
    actions = {
      now: 'Check current weather forecasts and pack accordingly. Have backup plans for outdoor activities.',
      soon: 'Monitor weather trends for your travel dates and adjust packing lists based on forecasts.',
      later: 'Consider seasonal patterns when choosing travel dates to optimize weather conditions.',
    };
  } else if (cat.includes('destination') || cat.includes('place') || cat.includes('location')) {
    why = `Destination information helps you plan meaningful experiences. ${title.includes('guide') || title.includes('best') ? 'Knowing what to see and do maximizes your time.' : 'Understanding local culture and attractions enhances your visit.'}`;
    impact = 'Well-researched trips lead to better experiences and fewer disappointments. Good planning helps you discover hidden gems and avoid tourist traps.';
    actions = {
      now: 'If traveling soon, prioritize must-see attractions and make reservations for popular spots.',
      soon: 'Create a rough itinerary based on your interests and research local customs and etiquette.',
      later: 'Save this information for trip planning and build a wishlist of places to visit.',
    };
  } else if (cat.includes('news') || cat.includes('update') || cat.includes('announcement')) {
    why = `Travel news and updates keep you informed about changes that affect your plans. ${title.includes('policy') || title.includes('change') ? 'Regulations and policies evolve frequently.' : 'Staying current helps you adapt to new requirements.'}`;
    impact = 'Outdated information can lead to surprises at airports, hotels, or attractions. Current knowledge helps you navigate changes smoothly.';
    actions = {
      now: 'If traveling soon, verify this information applies to your specific situation and dates.',
      soon: 'Stay updated on changes and adjust plans accordingly. Subscribe to relevant travel alerts.',
      later: 'Keep this in mind for future planning and check for updates closer to your travel date.',
    };
  } else {
    // Default/general travel content
    why = `This travel information provides valuable insights for planning and decision-making. ${itemType === 'product' ? 'Understanding available products helps you choose what you need.' : 'Staying informed enhances your travel knowledge and preparedness.'}`;
    impact = 'Well-informed travelers make better decisions, avoid common pitfalls, and have more enjoyable experiences. Knowledge is your best travel companion.';
    actions = {
      now: 'If this applies to upcoming travel, take immediate action or note it for your trip.',
      soon: 'Consider how this information affects your upcoming plans and incorporate it into your preparation.',
      later: 'Save this for future reference and keep it in mind when planning your next trip.',
    };
  }
  
  // Generate summary from title and category
  const summary = `${title}${source ? ` (from ${source})` : ''}. ${cat ? `This ${cat} content` : 'This content'} provides important information for travelers.`;
  
  return {
    summary: summary.substring(0, 300),
    why: why.substring(0, 400),
    impact: impact.substring(0, 400),
    actions: {
      now: actions.now.substring(0, 200),
      soon: actions.soon.substring(0, 200),
      later: actions.later.substring(0, 200),
    },
  };
}

/**
 * Extract 2-3 key facts from feed item content
 */
export function extractKeyFacts(feedItem: {
  title: string;
  description: string;
  contentSnippet?: string | null;
  tagsJson?: any;
  category?: string | null;
}): string[] {
  const facts: string[] = [];
  
  // Extract from title (if it contains specific information)
  if (feedItem.title.length > 20 && feedItem.title.length < 100) {
    facts.push(feedItem.title);
  }
  
  // Extract from description (first sentence or key phrases)
  const desc = feedItem.description || '';
  const sentences = desc.split(/[.!?]\s+/).filter(s => s.length > 20 && s.length < 200);
  if (sentences.length > 0) {
    facts.push(sentences[0]);
  }
  
  // Extract from tags if available
  if (feedItem.tagsJson && Array.isArray(feedItem.tagsJson)) {
    const relevantTags = feedItem.tagsJson
      .filter((tag: any) => typeof tag === 'string' && tag.length > 3)
      .slice(0, 2)
      .map((tag: string) => `Related to: ${tag}`);
    facts.push(...relevantTags);
  }
  
  // Extract from content snippet if available
  if (feedItem.contentSnippet) {
    const snippetSentences = feedItem.contentSnippet.split(/[.!?]\s+/).filter(s => s.length > 30);
    if (snippetSentences.length > 0 && facts.length < 3) {
      facts.push(snippetSentences[0]);
    }
  }
  
  // Limit to 3 facts
  return facts.slice(0, 3);
}
