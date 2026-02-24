/**
 * eSIM Agent
 * Handles eSIM package recommendations based on travel destination
 */

import { generateChatResponse } from '../../chat/respond.js';

export interface ESIMContext {
  country?: string;
  duration?: number;
  dataAmount?: string;
}

// Mock eSIM packages (replace with real API integration)
const ESIM_PACKAGES: Record<string, Array<{
  id: string;
  name: string;
  country: string;
  data: string;
  duration: string;
  price: number;
  currency: string;
  provider: string;
}>> = {
  'united states': [
    { id: 'esim-us-1', name: 'US Basic', country: 'United States', data: '5GB', duration: '7 days', price: 9.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-us-2', name: 'US Standard', country: 'United States', data: '10GB', duration: '15 days', price: 19.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-us-3', name: 'US Premium', country: 'United States', data: '20GB', duration: '30 days', price: 34.99, currency: 'USD', provider: 'Airalo' },
  ],
  'japan': [
    { id: 'esim-jp-1', name: 'Japan Basic', country: 'Japan', data: '3GB', duration: '7 days', price: 7.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-jp-2', name: 'Japan Standard', country: 'Japan', data: '10GB', duration: '15 days', price: 19.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-jp-3', name: 'Japan Premium', country: 'Japan', data: '20GB', duration: '30 days', price: 34.99, currency: 'USD', provider: 'Airalo' },
  ],
  'europe': [
    { id: 'esim-eu-1', name: 'Europe Basic', country: 'Europe', data: '5GB', duration: '7 days', price: 9.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-eu-2', name: 'Europe Standard', country: 'Europe', data: '10GB', duration: '15 days', price: 19.99, currency: 'USD', provider: 'Airalo' },
    { id: 'esim-eu-3', name: 'Europe Premium', country: 'Europe', data: '20GB', duration: '30 days', price: 34.99, currency: 'USD', provider: 'Airalo' },
  ],
};

export const esimAgent = {
  async handle(
    message: string,
    context: ESIMContext | undefined,
    recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
    userId?: string,
    sessionId?: string
  ): Promise<{ text: string; ui?: any | null }> {
    // Extract country from message or context
    const country = context?.country || extractCountry(message);
    const duration = context?.duration || extractDuration(message);
    const dataAmount = context?.dataAmount || extractDataAmount(message);

    if (!country) {
      return {
        text: 'I can help you find the perfect eSIM package. Which country are you traveling to?',
        ui: null,
      };
    }

    // Find matching packages
    const countryLower = country.toLowerCase();
    let packages = ESIM_PACKAGES[countryLower] || [];

    // If no exact match, try to find by partial match
    if (packages.length === 0) {
      for (const [key, pkgList] of Object.entries(ESIM_PACKAGES)) {
        if (countryLower.includes(key) || key.includes(countryLower)) {
          packages = pkgList;
          break;
        }
      }
    }

    // Filter by duration if specified
    if (duration) {
      packages = packages.filter(pkg => {
        const pkgDuration = parseInt(pkg.duration);
        return pkgDuration >= duration;
      });
    }

    // Filter by data amount if specified
    if (dataAmount) {
      packages = packages.filter(pkg => {
        const pkgData = parseInt(pkg.data);
        const requestedData = parseInt(dataAmount);
        return pkgData >= requestedData;
      });
    }

    if (packages.length === 0) {
      return {
        text: `I couldn't find eSIM packages for ${country}. Please check the country name or try a different destination.`,
        ui: null,
      };
    }

    // Generate AI response with package recommendations
    const packageList = packages.map(pkg => 
      `- ${pkg.name}: ${pkg.data} for ${pkg.duration} - ${pkg.currency} ${pkg.price} (${pkg.provider})`
    ).join('\n');

    const aiResponse = await generateChatResponse(
      `User is looking for eSIM packages for ${country}. Found packages:\n${packageList}\n\nProvide helpful eSIM recommendations.`,
      recentMessages,
      true // Enable UI mode
    );

    // Enhance UI with package cards
    if (!aiResponse.ui) {
      aiResponse.ui = {
        type: 'cards',
        cards: packages.slice(0, 5).map(pkg => ({
          id: pkg.id,
          title: pkg.name,
          subtitle: `${pkg.data} for ${pkg.duration}`,
          description: `${pkg.currency} ${pkg.price} - ${pkg.provider}`,
          actions: [
            { label: 'View Details', action: 'view_details', value: pkg.id },
            { label: 'Purchase', action: 'purchase', value: pkg.id },
          ],
          metadata: {
            country: pkg.country,
            data: pkg.data,
            duration: pkg.duration,
            price: pkg.price.toString(),
            currency: pkg.currency,
            provider: pkg.provider,
          },
        })),
      } as any;
    }

    return {
      text: aiResponse.text || `I found ${packages.length} eSIM packages for ${country}. Here are some recommendations:`,
      ui: aiResponse.ui,
    };
  },
};

// Helper functions
function extractCountry(message: string): string | undefined {
  const patterns = [
    /(?:for|in|to|traveling to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
    /(?:country|destination):\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      return match[1].trim();
    }
  }
  return undefined;
}

function extractDuration(message: string): number | undefined {
  const patterns = [
    /(?:for|duration|lasting)\s+(\d+)\s*(?:days?|weeks?|months?)/i,
    /(\d+)\s*(?:day|week|month)\s*(?:package|plan)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return undefined;
}

function extractDataAmount(message: string): string | undefined {
  const patterns = [
    /(\d+)\s*(?:GB|MB|gb|mb)/i,
    /(?:data|internet)\s+of\s+(\d+)\s*(?:GB|MB|gb|mb)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

