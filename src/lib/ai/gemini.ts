import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from './config';
import { extractJSON } from './response-parser';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export async function askGemini(
  prompt: string,
  systemPrompt?: string,
  params?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const ai = getGenAI();
  if (!ai) {
    console.warn('[Gemini] No API key configured');
    return '';
  }

  try {
    const model = ai.getGenerativeModel({
      model: AI_CONFIG.model,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: params?.maxTokens ?? 2000,
        temperature: params?.temperature ?? 0.3,
      },
    });

    return result.response.text();
  } catch (e) {
    console.error('[Gemini] Request failed:', e);
    return '';
  }
}

export async function askGeminiJSON<T>(
  prompt: string,
  systemPrompt?: string,
  params?: { temperature?: number; maxTokens?: number }
): Promise<T | null> {
  const response = await askGemini(
    prompt + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, no explanation — just raw JSON.',
    systemPrompt,
    params
  );

  if (!response) return null;

  try {
    return JSON.parse(extractJSON(response)) as T;
  } catch {
    console.error('[Gemini] JSON parse failed:', response.slice(0, 300));
    return null;
  }
}
