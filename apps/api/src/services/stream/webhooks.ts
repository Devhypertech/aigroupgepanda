import type { Express } from 'express';
import { streamServerClient, AI_COMPANION_USER_ID } from './streamClient.js';
import { processMessage } from '../../agent/index.js';
import { validateAndEnforceAiOnlyMembership } from './channelValidator.js';

// Track which messages AI has already responded to (deduplication)
const processedMessageIds = new Set<string>();
// Clean up old message IDs periodically (keep last 1000)
const MAX_PROCESSED_MESSAGES = 1000;

export function setupStreamWebhooks(app: Express) {
  // Webhook endpoint for Stream Chat events
  app.post('/api/stream/webhook', async (req, res) => {
    try {
      const event = req.body;

      // Verify webhook signature (in production, verify with Stream secret)
      // For MVP, we'll skip verification

      console.log('[Webhook] Received event:', {
        type: event.type,
        hasMessage: !!event.message,
        hasChannel: !!event.channel,
        timestamp: new Date().toISOString(),
      });

      // Handle message.new event - trigger AI automatically for all human messages
      // NOTE: Frontend now calls /api/chat/respond for UI widgets, so webhook is backup only
      // Skip webhook processing for companion channels to avoid duplicate AI responses
      // Companion channels use the new chat API with UI widgets
      if (event.type === 'message.new') {
        const message = event.message;
        const channel = event.channel;

        // Skip if message is from AI Companion
        if (message.user?.id === AI_COMPANION_USER_ID) {
          return res.json({ received: true });
        }

        // Skip if message is a system message
        if (message.type === 'system' || message.user?.id === 'system') {
          return res.json({ received: true });
        }

        // Extract channel ID (could be channel.id or channel.cid)
        const channelId = channel?.id || channel?.cid?.split(':')[1] || '';
        if (!channelId) {
          console.warn('Could not extract channel ID from webhook event');
          return res.json({ received: true });
        }

        // Skip companion channels - they use the new /api/chat/respond endpoint
        if (channelId.startsWith('ai-') || channelId.startsWith('ai_user_')) {
          console.log(`[Webhook] Skipping companion channel ${channelId} - using new chat API`);
          return res.json({ received: true });
        }

        // Deduplicate: Check if we already processed this message
        if (processedMessageIds.has(message.id)) {
          console.log(`[Webhook] Message ${message.id} already processed, skipping`);
          return res.json({ received: true });
        }

        // Mark as processing
        processedMessageIds.add(message.id);
        
        // Clean up old message IDs if needed
        if (processedMessageIds.size > MAX_PROCESSED_MESSAGES) {
          const idsArray = Array.from(processedMessageIds);
          processedMessageIds.clear();
          // Keep last 500
          idsArray.slice(-500).forEach(id => processedMessageIds.add(id));
        }

        // ALWAYS enforce AI-only channel membership
        const userId = message.user?.id || '';
        if (userId && channelId.startsWith(`ai_user_${userId}`)) {
          await validateAndEnforceAiOnlyMembership(channelId, userId);
        }

        // Check if message has text content (skip empty messages)
        const messageText = (message.text || '').trim();
        if (!messageText) {
          processedMessageIds.delete(message.id); // Allow retry for empty messages
          return res.json({ received: true });
        }

        // Get recent messages for context
        const channelType = channel?.cid?.split(':')[0] || 'messaging';
        const channelInstance = streamServerClient.channel(channelType, channelId);
        let recentMessages: any[] = [];
        try {
          const messagesResponse = await channelInstance.query({
            messages: { limit: 10 },
          });
          recentMessages = messagesResponse.messages || [];
        } catch (error) {
          console.error('[Webhook] Error fetching recent messages:', error);
          // Continue without recent messages context
        }

        console.log('[Webhook] ✅ Processing human message:', {
          messageId: message.id,
          userId: message.user?.id,
          username: message.user?.name,
          channelId,
          textPreview: messageText.substring(0, 50),
          textLength: messageText.length,
        });

        // Recent messages already fetched above for duplicate check, reuse them for context

        // Process message with agent
        // Agent handles memory loading, trip context, and all orchestration internally
        const agentResponse = await processMessage({
          userId: message.user?.id || '',
          channelId,
          messageText,
          recentMessages: recentMessages.map((msg: any) => ({
            text: msg.text || '',
            userId: msg.user?.id || '',
            username: msg.user?.name || '',
            kind: msg.user?.id === AI_COMPANION_USER_ID ? 'AI' : 'USER',
          })),
        });

        // Post assistant reply back to same channel
        try {
          await channelInstance.sendMessage({
            text: agentResponse.text,
            user_id: AI_COMPANION_USER_ID,
          });

          console.log(`[Webhook] AI reply posted to channel ${channelId}:`, {
            messageId: message.id,
            responseLength: agentResponse.text.length,
            intent: agentResponse.intent,
          });
        } catch (error) {
          console.error('[Webhook] Error posting AI message to Stream:', error);
          // Remove from processed set so it can be retried
          processedMessageIds.delete(message.id);
          // Don't throw - webhook was acknowledged, just log the error
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling Stream webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
}

