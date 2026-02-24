/**
 * Tracking Agent
 * Handles order status queries and shipment tracking
 */

import { getOrderStatus, getOrderTracking } from '../orderTracking.js';
import { generateChatResponse } from '../../chat/respond.js';

export interface TrackingContext {
  orderId?: string;
}

export const trackingAgent = {
  async handle(
    message: string,
    context: TrackingContext | undefined,
    recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
    userId?: string,
    sessionId?: string
  ): Promise<{ text: string; ui?: any | null }> {
    // Extract order ID from message or context
    const orderId = context?.orderId || extractOrderId(message);

    if (!orderId) {
      return {
        text: 'I can help you track your order. Please provide your order ID or tracking number.',
        ui: null,
      };
    }

    try {
      // Get order status
      const status = await getOrderStatus(orderId);
      
      if (!status) {
        return {
          text: `I couldn't find an order with ID "${orderId}". Please check your order number and try again.`,
          ui: null,
        };
      }

      // Get tracking information
      const tracking = await getOrderTracking(orderId);

      // Format response
      const statusText = formatStatus(status.status);
      let responseText = `Your order ${orderId} is currently **${statusText}**.`;

      if (tracking) {
        responseText += `\n\n📦 **Tracking Information:**\n`;
        responseText += `- Carrier: ${tracking.carrier}\n`;
        responseText += `- Tracking Number: ${tracking.number}\n`;
        if (tracking.url) {
          responseText += `- [Track Package](${tracking.url})`;
        }
      }

      // Generate AI response with context
      const aiResponse = await generateChatResponse(
        `User is asking about order ${orderId}. Status: ${status.status}. ${tracking ? `Tracking: ${tracking.carrier} ${tracking.number}` : ''}. Provide a helpful update.`,
        recentMessages,
        false
      );

      return {
        text: aiResponse.text || responseText,
        ui: aiResponse.ui || null,
      };
    } catch (error) {
      console.error('[Tracking Agent] Error:', error);
      return {
        text: 'I encountered an error while checking your order status. Please try again later.',
        ui: null,
      };
    }
  },
};

// Helper functions
function extractOrderId(message: string): string | undefined {
  const patterns = [
    /(?:order|tracking)\s*(?:id|number|#)?:?\s*([A-Z0-9\-]+)/i,
    /#([A-Z0-9\-]+)/,
    /order[_-]?([A-Z0-9]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return statusMap[status.toLowerCase()] || status;
}

