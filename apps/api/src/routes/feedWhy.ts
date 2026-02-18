/**
 * Feed Why This Matters Route
 * POST /api/feed/:id/why - Generate or retrieve "Why this matters" content
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { callZhipuAI, type ZhipuMessage } from '../services/ai/zhipu.js';
import { generateDeterministicWhy, extractKeyFacts } from '../chat/whyFallback.js';

const router = Router();

/**
 * POST /api/feed/:id/why
 * Generate or retrieve "Why this matters" content for a feed item
 * 
 * Returns cached content if exists, otherwise generates with AI and saves
 */
router.post('/:id/why', async (req, res) => {
  try {
    const { id } = req.params;

    if (!prisma) {
      return res.status(500).json({
        error: 'Database not available',
      });
    }

    // Look up FeedItem by id
    const feedItem = await (prisma as any).feedItem.findUnique({
      where: { id },
    }) as any;

    if (!feedItem) {
      return res.status(404).json({
        error: 'Feed item not found',
      });
    }

    // If whyThisMatters exists, return cached (support both old and new formats)
    if (feedItem.whyThisMatters) {
      const cached = feedItem.whyThisMatters as any;
      
      // Check if it's the new format (has summary, why, impact, actions)
      if (cached.summary && cached.why && cached.impact && cached.actions) {
        // Return structured UI format
        return res.json({
          text: cached.summary,
          ui: {
            type: 'panel',
            title: 'Why this matters',
            bullets: [
              cached.why,
              cached.impact,
            ],
            actions: [
              {
                label: 'Ask follow-up',
                action: 'ask_followup',
                payload: {
                  itemId: id,
                  topic: feedItem.title,
                },
              },
            ],
          },
          // Legacy format for backward compatibility
          summary: cached.summary,
          why: cached.why,
          impact: cached.impact,
          actions: cached.actions,
          cached: true,
        });
      }
      
      // Legacy format support (bullets + whatShouldIDo)
      const summary = cached.summary || feedItem.title || '';
      const why = cached.why || (cached.bullets && cached.bullets.length > 0 ? cached.bullets.join(' ') : '');
      const impact = cached.impact || '';
      
      return res.json({
        text: summary,
        ui: {
          type: 'panel',
          title: 'Why this matters',
          bullets: why ? [why, impact].filter(Boolean) : (cached.bullets || []),
          actions: [
            {
              label: 'Ask follow-up',
              action: 'ask_followup',
              payload: {
                itemId: id,
                topic: feedItem.title,
              },
            },
          ],
        },
        // Legacy format for backward compatibility
        summary,
        why,
        impact,
        actions: cached.actions || cached.whatShouldIDo || {
          now: '',
          soon: '',
          later: '',
        },
        whyThisMatters: cached.bullets || [],
        whatShouldIDo: cached.whatShouldIDo || cached.actions || {
          now: '',
          soon: '',
          later: '',
        },
        cached: true,
      });
    }

    // Extract key facts for context
    const keyFacts = extractKeyFacts({
      title: feedItem.title,
      description: feedItem.description,
      contentSnippet: feedItem.contentSnippet,
      tagsJson: feedItem.tagsJson,
      category: feedItem.category,
    });
    
    // Generate with AI - Enhanced prompt with all context
    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `You are a helpful travel assistant. Analyze travel content and provide meaningful, actionable insights.

CRITICAL: You must return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "summary": "A concise 2-3 sentence summary of what this content is about",
  "why": "A clear explanation of why this matters to travelers (2-3 sentences)",
  "impact": "The practical impact or implications for travelers (2-3 sentences)",
  "actions": {
    "now": "Specific actionable step for someone traveling now or in the next few days",
    "soon": "Specific actionable step for someone traveling in the next few weeks",
    "later": "Specific actionable step for someone planning future travel"
  }
}

Requirements:
- summary: Brief overview incorporating title, source, and category
- why: Explain the significance and relevance to travelers, referencing key facts
- impact: Describe practical implications and consequences
- actions: Provide specific, actionable steps (not generic advice)
- All fields must be non-empty strings
- Be specific and relevant to the content provided`,
      },
      {
        role: 'user',
        content: `Analyze this travel content and provide insights:

Title: ${feedItem.title}
Summary: ${feedItem.description.substring(0, 500)}
Source: ${feedItem.source || 'Unknown'}
Category: ${feedItem.category || 'general'}
Type: ${feedItem.type || 'article'}
${keyFacts.length > 0 ? `Key Facts:\n${keyFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}
${feedItem.contentSnippet ? `\nAdditional Content: ${feedItem.contentSnippet.substring(0, 500)}` : ''}
${feedItem.tagsJson ? `\nTags: ${Array.isArray(feedItem.tagsJson) ? feedItem.tagsJson.join(', ') : JSON.stringify(feedItem.tagsJson)}` : ''}

Provide a summary, explain why this matters (reference the key facts), describe the impact, and give specific actionable steps for travelers (now, soon, later). Return as JSON only.`,
      },
    ];

    console.log('[Feed Why] Generating AI content for item:', id, {
      title: feedItem.title.substring(0, 50),
      category: feedItem.category,
      hasContentSnippet: !!feedItem.contentSnippet,
      keyFactsCount: keyFacts.length,
    });
    
    let aiResponse: string;
    let aiError: Error | null = null;
    
    try {
      aiResponse = await callZhipuAI(messages);
    } catch (error) {
      // Log full error details server-side
      aiError = error instanceof Error ? error : new Error(String(error));
      console.error('[Feed Why] AI call failed:', {
        error: aiError.message,
        stack: aiError.stack,
        itemId: id,
        title: feedItem.title,
        category: feedItem.category,
        type: feedItem.type,
      });
      
      // Use fallback instead of throwing
      console.log('[Feed Why] Using deterministic fallback due to AI error');
      const fallbackContent = generateDeterministicWhy(
        feedItem.title,
        feedItem.category,
        feedItem.type,
        feedItem.source || undefined
      );
      
      // Save fallback to DB
      await (prisma as any).feedItem.update({
        where: { id },
        data: {
          whyThisMatters: fallbackContent as any,
          updatedAt: new Date(),
        },
      });
      
      // Return structured UI format
      return res.json({
        text: fallbackContent.summary,
        ui: {
          type: 'panel',
          title: 'Why this matters',
          bullets: [
            fallbackContent.why,
            fallbackContent.impact,
          ],
          actions: [
            {
              label: 'Ask follow-up',
              action: 'ask_followup',
              payload: {
                itemId: id,
                topic: feedItem.title,
              },
            },
          ],
        },
        // Legacy format for backward compatibility
        summary: fallbackContent.summary,
        why: fallbackContent.why,
        impact: fallbackContent.impact,
        actions: fallbackContent.actions,
        cached: false,
        fallback: true,
      });
    }

    // Parse AI response (may be wrapped in markdown code blocks)
    let parsed: any;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonString = aiResponse.trim();
      
      // Remove markdown code blocks
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON object if there's extra text
      const jsonMatch = jsonString.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      
      parsed = JSON.parse(jsonString);
      
      // Validate required fields
      if (!parsed.summary || !parsed.why || !parsed.impact || !parsed.actions) {
        throw new Error('Missing required fields in AI response');
      }
      
      if (!parsed.actions.now || !parsed.actions.soon || !parsed.actions.later) {
        throw new Error('Missing action fields in AI response');
      }
      
    } catch (parseError) {
      // Log full error details server-side
      const parseErr = parseError instanceof Error ? parseError : new Error(String(parseError));
      console.error('[Feed Why] Failed to parse AI response:', {
        error: parseErr.message,
        stack: parseErr.stack,
        itemId: id,
        title: feedItem.title,
        aiResponseLength: aiResponse.length,
        aiResponsePreview: aiResponse.substring(0, 1000),
        category: feedItem.category,
      });
      
      // Use deterministic fallback instead of text extraction
      console.log('[Feed Why] Using deterministic fallback due to parse error');
      const fallbackContent = generateDeterministicWhy(
        feedItem.title,
        feedItem.category,
        feedItem.type,
        feedItem.source || undefined
      );
      
      // Save fallback to DB
      await (prisma as any).feedItem.update({
        where: { id },
        data: {
          whyThisMatters: fallbackContent as any,
          updatedAt: new Date(),
        },
      });
      
      // Return structured UI format
      return res.json({
        text: fallbackContent.summary,
        ui: {
          type: 'panel',
          title: 'Why this matters',
          bullets: [
            fallbackContent.why,
            fallbackContent.impact,
          ],
          actions: [
            {
              label: 'Ask follow-up',
              action: 'ask_followup',
              payload: {
                itemId: id,
                topic: feedItem.title,
              },
            },
          ],
        },
        // Legacy format for backward compatibility
        summary: fallbackContent.summary,
        why: fallbackContent.why,
        impact: fallbackContent.impact,
        actions: fallbackContent.actions,
        cached: false,
        fallback: true,
      });
    }

    // Ensure structure is correct with validation
    const whyThisMatters = {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim().substring(0, 300)
        : feedItem.title || 'This content provides important travel information.',
      why: typeof parsed.why === 'string' && parsed.why.trim().length > 0
        ? parsed.why.trim().substring(0, 400)
        : 'This information is relevant and valuable for travelers.',
      impact: typeof parsed.impact === 'string' && parsed.impact.trim().length > 0
        ? parsed.impact.trim().substring(0, 400)
        : 'This can help travelers make informed decisions and improve their travel experience.',
      actions: {
        now: typeof parsed.actions?.now === 'string' && parsed.actions.now.trim().length > 0
          ? parsed.actions.now.trim().substring(0, 200)
          : 'Review this information if you\'re traveling in the next few days.',
        soon: typeof parsed.actions?.soon === 'string' && parsed.actions.soon.trim().length > 0
          ? parsed.actions.soon.trim().substring(0, 200)
          : 'Consider this for your upcoming travel plans in the next few weeks.',
        later: typeof parsed.actions?.later === 'string' && parsed.actions.later.trim().length > 0
          ? parsed.actions.later.trim().substring(0, 200)
          : 'Keep this in mind for future travel planning.',
      },
    };

    // Save back to DB
    await (prisma as any).feedItem.update({
      where: { id },
      data: {
        whyThisMatters: whyThisMatters as any,
        updatedAt: new Date(),
      } as any,
    });

    console.log('[Feed Why] Saved AI-generated content for item:', id);

    // Return structured UI format
    res.json({
      text: whyThisMatters.summary,
      ui: {
        type: 'panel',
        title: 'Why this matters',
        bullets: [
          whyThisMatters.why,
          whyThisMatters.impact,
        ],
        actions: [
          {
            label: 'Ask follow-up',
            action: 'ask_followup',
            payload: {
              itemId: id,
              topic: feedItem.title,
            },
          },
        ],
      },
      // Legacy format for backward compatibility
      summary: whyThisMatters.summary,
      why: whyThisMatters.why,
      impact: whyThisMatters.impact,
      actions: whyThisMatters.actions,
      whyThisMatters: [whyThisMatters.why], // Convert to array for legacy support
      whatShouldIDo: whyThisMatters.actions,
      cached: false,
    });
  } catch (error) {
    // Log full error details server-side
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Feed Why] Unexpected error:', {
      error: err.message,
      stack: err.stack,
      itemId: req.params.id,
      errorType: err.constructor.name,
      errorDetails: error,
    });
    
    // Try deterministic fallback as last resort
    try {
      const fallbackFeedItem = await (prisma as any)?.feedItem.findUnique({
        where: { id: req.params.id },
      }) as any;
      
      if (fallbackFeedItem) {
        const fallbackContent = generateDeterministicWhy(
          fallbackFeedItem.title,
          fallbackFeedItem.category,
          fallbackFeedItem.type,
          fallbackFeedItem.source || undefined
        );
        
        return res.json({
          text: fallbackContent.summary,
          ui: {
            type: 'panel',
            title: 'Why this matters',
            bullets: [
              fallbackContent.why,
              fallbackContent.impact,
            ],
            actions: [
              {
                label: 'Ask follow-up',
                action: 'ask_followup',
                payload: {
                  itemId: req.params.id,
                  topic: fallbackFeedItem.title,
                },
              },
            ],
          },
          // Legacy format
          summary: fallbackContent.summary,
          why: fallbackContent.why,
          impact: fallbackContent.impact,
          actions: fallbackContent.actions,
          cached: false,
          fallback: true,
        });
      }
    } catch (fallbackError) {
      console.error('[Feed Why] Fallback also failed:', fallbackError);
    }
    
    // Return user-friendly error message (full details logged above)
    res.status(500).json({
      error: 'Unable to generate insights at this time',
      message: 'Please try again later',
      // Don't expose internal error details to client
    });
  }
});

export default router;

