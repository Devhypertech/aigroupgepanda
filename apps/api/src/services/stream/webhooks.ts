import type { Express } from 'express';
import { streamServerClient, AI_COMPANION_USER_ID } from './streamClient';
import { generateAIReply } from '../ai/orchestrator';
import { getTripContext } from '../../services/tripContext/memoryStorage';
import { getOrCreateRoom } from '../../db/rooms';
import { RoomTemplate } from '@gepanda/shared';

// Per-room AI cooldown: roomId -> last AI response timestamp (ms)
const roomAiCooldown = new Map<string, number>();
const AI_COOLDOWN_MS = 10000; // 10 seconds

export function setupStreamWebhooks(app: Express) {
  // Webhook endpoint for Stream Chat events
  app.post('/api/stream/webhook', async (req, res) => {
    try {
      const event = req.body;

      // Verify webhook signature (in production, verify with Stream secret)
      // For MVP, we'll skip verification

      console.log('Stream webhook event:', event.type);

      // Handle message.new event - trigger AI automatically for all human messages
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

        // Check if message has text content (skip empty messages)
        const messageText = (message.text || '').trim();
        if (!messageText) {
          return res.json({ received: true });
        }

        // Check cooldown to prevent spam
        const lastAiResponse = roomAiCooldown.get(channelId);
        const now = Date.now();

        if (lastAiResponse && (now - lastAiResponse) < AI_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((AI_COOLDOWN_MS - (now - lastAiResponse)) / 1000);
          console.log(`[Webhook] AI cooldown active for channel ${channelId}, ${remainingSeconds}s remaining`);
          return res.json({ received: true });
        }

        // Get recent messages to check if AI already responded and to get context
        const channelType = channel?.cid?.split(':')[0] || 'messaging';
        const channelInstance = streamServerClient.channel(channelType, channelId);
        const messagesResponse = await channelInstance.query({
          messages: { limit: 10 },
        });
        const recentMessages = messagesResponse.messages || [];
        
        // Check if AI already replied to the most recent message
        // If the most recent message (before current) is from AI, skip (AI already responded)
        if (recentMessages.length > 0) {
          const mostRecentMessage = recentMessages[0];
          // If the most recent message is from AI and it's not the current message, skip
          if (mostRecentMessage.id !== message.id && mostRecentMessage.user?.id === AI_COMPANION_USER_ID) {
            console.log('[Webhook] AI already responded to the most recent message, skipping');
            return res.json({ received: true });
          }
        }

        console.log('[Webhook] Auto-triggering AI response for human message:', {
          messageId: message.id,
          userId: message.user?.id,
          username: message.user?.name,
          textPreview: messageText.substring(0, 50),
        });

        // Recent messages already fetched above for duplicate check, reuse them for context

        // Extract room ID from channel ID (remove "room-" prefix if present)
        const roomId = channelId.startsWith('room-') ? channelId.replace('room-', '') : channelId;

        // Get room template from DB (if available)
        let roomTemplate = RoomTemplate.TRAVEL_PLANNING;
        try {
          const room = await getOrCreateRoom(roomId, RoomTemplate.TRAVEL_PLANNING);
          roomTemplate = room.template as RoomTemplate;
        } catch (error) {
          console.warn('Could not get room template, using default');
        }

        // Get trip context if available
        let tripContext: any = undefined;
        try {
          const contextRecord = getTripContext(roomId);
          tripContext = contextRecord?.data || undefined;
        } catch (error) {
          console.warn('Could not get trip context');
        }

        // Generate AI reply
        const aiReply = await generateAIReply({
          roomId,
          roomTemplate,
          triggeringMessage: {
            id: message.id,
            text: messageText, // Use full message text (no prefix stripping needed)
            userId: message.user?.id || '',
            username: message.user?.name || '',
          },
          recentMessages: recentMessages.map((msg: any) => ({
            id: msg.id,
            text: msg.text || '',
            userId: msg.user?.id || '',
            username: msg.user?.name || '',
            kind: msg.user?.id === AI_COMPANION_USER_ID ? 'AI' : 'USER',
          })),
          tripContext,
        });

        // Send AI reply as the AI Companion user
        await channelInstance.sendMessage({
          text: aiReply.replyText,
          user_id: AI_COMPANION_USER_ID,
        });

        // Set cooldown
        roomAiCooldown.set(channelId, now);
        console.log(`[Webhook] AI reply sent in channel ${channelId}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling Stream webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
}

