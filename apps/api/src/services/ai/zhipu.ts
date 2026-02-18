// Zhipu AI GLM-4.6 Flash integration
// Note: GLM-4.6 Flash uses model identifier 'glm-4-flash' in the API
// ZHIPU_API_KEY is optional - AI features will gracefully degrade if not set
// IMPORTANT: Check process.env.ZHIPU_API_KEY exactly (no typos)
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export interface ZhipuMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ZhipuChatRequest {
  model: string;
  messages: ZhipuMessage[];
  temperature?: number;
  max_tokens?: number;
}

export async function callZhipuAI(messages: ZhipuMessage[]): Promise<string> {
  const logPrefix = '[ZHIPU_AI]';
  const requestStartTime = Date.now();
  
  // ZHIPU_API_KEY is optional - gracefully handle if not set
  if (!ZHIPU_API_KEY) {
    console.warn(`${logPrefix} ⚠️  ZHIPU_API_KEY not set - AI features will not work`);
    return "I'm here to help! However, AI features are not currently available. Please configure ZHIPU_API_KEY to enable AI responses.";
  }

  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} Calling Zhipu AI API`);
  console.log(`${logPrefix} URL: ${ZHIPU_API_URL}`);
  console.log(`${logPrefix} Model: glm-4-flash`);
  console.log(`${logPrefix} Messages count: ${messages.length}`);
  console.log(`${logPrefix} API Key: ${ZHIPU_API_KEY ? `${ZHIPU_API_KEY.substring(0, 10)}...` : 'MISSING'}`);
  
  try {
    // Add timeout to fetch request (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const requestBody = {
      model: 'glm-4-flash',
      messages,
      temperature: 0.7,
      max_tokens: 2000, // Increased for JSON responses with UI widgets
    } as ZhipuChatRequest;
    
    console.log(`${logPrefix} Request body:`, JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map(m => ({ role: m.role, contentLength: m.content.length })),
    }, null, 2));

    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - requestStartTime;
    console.log(`${logPrefix} Response received (${responseTime}ms):`);
    console.log(`${logPrefix} Status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix} Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} ❌ API Error Response:`);
      console.error(`${logPrefix} Status: ${response.status}`);
      console.error(`${logPrefix} Body:`, errorText);
      
      // Try to parse error JSON
      let errorDetails: any = {};
      try {
        errorDetails = JSON.parse(errorText);
        console.error(`${logPrefix} Parsed error:`, JSON.stringify(errorDetails, null, 2));
      } catch {
        console.error(`${logPrefix} Error body is not JSON`);
      }
      
      throw new Error(`Zhipu API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as any;
    console.log(`${logPrefix} ✅ Response parsed successfully`);
    console.log(`${logPrefix} Response structure:`, {
      hasChoices: !!data.choices,
      choicesCount: data.choices?.length || 0,
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content,
      contentLength: data.choices?.[0]?.message?.content?.length || 0,
    });
    
    const content = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    console.log(`${logPrefix} Content preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    console.log(`${logPrefix} ========================================`);
    
    return content;
  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    console.error(`${logPrefix} ❌ ERROR calling Zhipu AI (${responseTime}ms):`);
    console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error) {
      console.error(`${logPrefix} Error stack:`);
      console.error(error.stack);
      
      if (error.name === 'AbortError') {
        console.error(`${logPrefix} ⏱️  Request timed out after 30 seconds`);
        throw new Error('Zhipu API request timed out after 30 seconds');
      }
      
      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        console.error(`${logPrefix} 🌐 Network error - cannot reach Zhipu API`);
      }
    }
    
    console.error(`${logPrefix} ========================================`);
    throw error;
  }
}

