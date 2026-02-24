/**
 * UI Schema Parser
 * Safely parses assistant message content to extract UI schemas
 * Handles JSON parsing errors gracefully
 */

export interface ParsedContent {
  text?: string;
  ui?: any;
}

/**
 * Parses Purchase Link patterns from text and converts them to button actions
 * Supports formats like:
 * - "**Purchase Link:** <url>"
 * - "Purchase Link: <url>"
 * - "Purchase: <url>"
 */
function parsePurchaseLinks(text: string): { cleanedText: string; purchaseButtons: Array<{ label: string; url: string }> } {
  const purchaseButtons: Array<{ label: string; url: string }> = [];
  let cleanedText = text;

  // Pattern 1: **Purchase Link:** <url> or Purchase Link: <url>
  const purchaseLinkPattern = /(\*\*)?Purchase\s+Link:?\s*\*?\s*<?(https?:\/\/[^\s>]+|www\.[^\s>]+|[^\s>]+\.[a-z]{2,})>?/gi;
  const purchasePattern = /(\*\*)?Purchase:?\s*\*?\s*<?(https?:\/\/[^\s>]+|www\.[^\s>]+|[^\s>]+\.[a-z]{2,})>?/gi;

  // Extract Purchase Link patterns
  let match: RegExpExecArray | null;
  while ((match = purchaseLinkPattern.exec(text)) !== null) {
    const m = match as RegExpExecArray;
    const url = m[2] || m[3];
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      purchaseButtons.push({ label: 'Purchase', url: fullUrl });
      // Remove the line containing this pattern
      const lines = cleanedText.split('\n');
      cleanedText = lines
        .filter(line => !line.includes(m[0]))
        .join('\n');
    }
  }

  // Extract Purchase patterns (without "Link")
  while ((match = purchasePattern.exec(text)) !== null) {
    const m = match as RegExpExecArray;
    const url = m[2] || m[3];
    if (url && !purchaseButtons.some(btn => btn.url.includes(url))) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      purchaseButtons.push({ label: 'Purchase', url: fullUrl });
      // Remove the line containing this pattern
      const lines = cleanedText.split('\n');
      cleanedText = lines
        .filter(line => !line.includes(m[0]))
        .join('\n');
    }
  }

  return { cleanedText: cleanedText.trim(), purchaseButtons };
}

/**
 * Safely parses assistant message content to extract UI schema
 * @param content - The raw message content (may be JSON or plain text)
 * @returns Parsed content with text and optional UI, or null if parsing fails completely
 */
export function safeParseAssistantContent(content: string): ParsedContent | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { text: '' };
  }

  // Try to parse as complete JSON first
  try {
    const parsed = JSON.parse(trimmed);
    
    // If it's an object with a "ui" field, extract it
    if (parsed && typeof parsed === 'object' && parsed.ui) {
      return {
        text: parsed.text || parsed.reply || '',
        ui: parsed.ui,
      };
    }
    
    // If it's valid JSON but no UI, return as text
    return { text: trimmed };
  } catch (e) {
    // Not valid JSON, try to find JSON embedded in text
    try {
      // Look for JSON object patterns (starting with { and containing "ui")
      const jsonMatch = trimmed.match(/\{[\s\S]*?"ui"[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && parsed.ui) {
          // Extract text before/after the JSON
          const textBefore = trimmed.substring(0, trimmed.indexOf(jsonMatch[0])).trim();
          const textAfter = trimmed.substring(trimmed.indexOf(jsonMatch[0]) + jsonMatch[0].length).trim();
          const combinedText = [textBefore, textAfter].filter(Boolean).join(' ').trim();
          
          return {
            text: parsed.text || parsed.reply || combinedText || 'Here\'s what I found:',
            ui: parsed.ui,
          };
        }
      }
    } catch (e2) {
      // JSON extraction failed, fall through to plain text
    }
    
    // Fallback: parse Purchase Links from plain text
    const { cleanedText, purchaseButtons } = parsePurchaseLinks(trimmed);
    
    // If we found purchase links, create a simple UI with buttons
    if (purchaseButtons.length > 0) {
      return {
        text: cleanedText,
        ui: {
          id: 'purchase-links',
          type: 'panel',
          title: 'Purchase Options',
          actions: purchaseButtons.map(btn => ({
            label: btn.label,
            url: btn.url,
            action: 'open_url',
          })),
        },
      };
    }
    
    // No purchase links found, return as plain text
    return { text: cleanedText };
  }
}

/**
 * Validates if a parsed UI object has the expected structure
 */
export function isValidUISchema(ui: any): boolean {
  if (!ui || typeof ui !== 'object') {
    return false;
  }
  
  // Must have an id and type
  if (!ui.id || !ui.type) {
    return false;
  }
  
  // Type should be one of the known types
  const validTypes = ['cards', 'trip_planner', 'trip_profile', 'list', 'form'];
  if (!validTypes.includes(ui.type)) {
    return false;
  }
  
  return true;
}

