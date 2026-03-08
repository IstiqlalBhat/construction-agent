// AI feature flags and configuration

export const AI_CONFIG = {
  // Feature flags - set to false to use deterministic fallbacks
  enabled: !!process.env.GEMINI_API_KEY,

  features: {
    scopeDetection: true,
    bidEvaluation: true,
    bidGeneration: true,
    bidLeveling: true,
    negotiation: true,
  },

  // Model configuration
  model: 'gemini-2.5-flash-preview-05-20',

  // Generation parameters per use case
  params: {
    scopeDetection: { temperature: 0.3, maxTokens: 4000 },
    bidEvaluation: { temperature: 0.3, maxTokens: 2000 },
    bidGeneration: { temperature: 0.4, maxTokens: 3000 },
    bidLeveling: { temperature: 0.3, maxTokens: 3000 },
    negotiationMessage: { temperature: 0.6, maxTokens: 1000 },
    negotiationResponse: { temperature: 0.5, maxTokens: 1500 },
  },

  // Guardrails
  guardrails: {
    maxDiscountPercent: 15,        // Max 15% discount from original bid
    escalationThreshold: 4,        // Force escalation after N rounds
    minMarginPercent: 8,           // Sub's minimum acceptable margin
    fallbackToDeterministic: true, // Use rule-based logic if LLM fails
  },
} as const;

export function isFeatureEnabled(feature: keyof typeof AI_CONFIG.features): boolean {
  return AI_CONFIG.enabled && AI_CONFIG.features[feature];
}
