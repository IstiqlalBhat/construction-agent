// Extract and validate JSON from LLM responses

import { z } from 'zod';

/**
 * Extract JSON from LLM response text, handling markdown code blocks
 */
export function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

  // Try to find JSON object or array in the text
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  return cleaned;
}

/**
 * Parse LLM response as JSON with optional Zod validation
 */
export function parseResponse<T>(
  text: string,
  schema?: z.ZodType<T>
): T | null {
  if (!text) return null;

  try {
    const json = JSON.parse(extractJSON(text));

    if (schema) {
      const result = schema.safeParse(json);
      if (result.success) {
        return result.data;
      }
      console.warn('[AI] Schema validation failed:', result.error.issues.slice(0, 3));
      // Return raw parsed JSON even if schema fails (best effort)
      return json as T;
    }

    return json as T;
  } catch {
    console.warn('[AI] JSON parse failed:', text.slice(0, 200));
    return null;
  }
}

// ─── Zod Schemas for LLM Responses ───

export const ScopeDetectionSchema = z.object({
  trades: z.array(z.object({
    division: z.number(),
    name: z.string(),
    reasoning: z.string().optional(),
    scopeItems: z.array(z.string()),
  })),
});

export const BidLevelingSchema = z.object({
  analyses: z.array(z.object({
    companyName: z.string(),
    notes: z.string(),
  })),
});

export const BidEvaluationSchema = z.object({
  shouldBid: z.boolean(),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()),
});

export const BidScopeSchema = z.object({
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  qualifications: z.array(z.string()),
});

export type ScopeDetectionResult = z.infer<typeof ScopeDetectionSchema>;
export type BidLevelingResult = z.infer<typeof BidLevelingSchema>;
export type BidEvaluationResult = z.infer<typeof BidEvaluationSchema>;
export type BidScopeResult = z.infer<typeof BidScopeSchema>;
