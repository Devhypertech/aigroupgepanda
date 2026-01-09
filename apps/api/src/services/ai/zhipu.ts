// Zhipu AI GLM-4.6 Flash integration
// ZHIPU_API_KEY is validated at startup in index.ts, so it should always be defined here
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY!;
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
  // ZHIPU_API_KEY is validated at startup, so this should never happen
  // But we keep the check for type safety and runtime safety
  if (!ZHIPU_API_KEY) {
    console.error('ZHIPU_API_KEY not set - this should not happen as it is validated at startup');
    throw new Error('ZHIPU_API_KEY is not configured. Please set it in your environment variables.');
  }

  try {
    // Add timeout to fetch request (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      } as ZhipuChatRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu API error:', response.status, errorText);
      throw new Error(`Zhipu API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error calling Zhipu AI:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Zhipu API request timed out after 30 seconds');
    }
    throw error;
  }
}

