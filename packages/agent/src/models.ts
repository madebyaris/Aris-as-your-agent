/**
 * Models Aris Studio prefers for day-to-day work.
 * Catalogs still come from each provider’s list API — these are pinned for UX + defaults.
 *
 * Cursor IDs must match Cursor API; OpenRouter IDs are `vendor/model` slugs.
 */

export type ArisProvider = "cursor" | "openrouter"

export const ARIS_DEFAULT_PROVIDER: ArisProvider = "cursor"
export const ARIS_DEFAULT_MODEL = "composer-2.5"
export const ARIS_DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4"

export const ARIS_PREFERRED_MODELS = [
  {
    id: "composer-2.5",
    label: "Composer 2.5",
    role: "default" as const,
    blurb: "Primary coding / agent runs (board + project chat).",
    provider: "cursor" as const,
  },
  {
    id: "grok-4.5",
    label: "Cursor Grok 4.5",
    role: "reasoning" as const,
    blurb: "Heavier reasoning / research when you switch the default.",
    provider: "cursor" as const,
  },
] as const

export const ARIS_OPENROUTER_PREFERRED_MODELS = [
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    role: "default" as const,
    blurb: "Strong coding via OpenRouter (lite harness).",
    provider: "openrouter" as const,
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    role: "coding" as const,
    blurb: "OpenAI coding alternate on OpenRouter.",
    provider: "openrouter" as const,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    role: "reasoning" as const,
    blurb: "Long-context / research via OpenRouter.",
    provider: "openrouter" as const,
  },
] as const

export type ArisPreferredModel =
  | (typeof ARIS_PREFERRED_MODELS)[number]
  | (typeof ARIS_OPENROUTER_PREFERRED_MODELS)[number]

export function preferredModelsForProvider(provider: ArisProvider) {
  return provider === "openrouter" ? ARIS_OPENROUTER_PREFERRED_MODELS : ARIS_PREFERRED_MODELS
}

export function defaultModelForProvider(provider: ArisProvider): string {
  return provider === "openrouter" ? ARIS_DEFAULT_OPENROUTER_MODEL : ARIS_DEFAULT_MODEL
}

export function isPreferredModelId(id: string, provider: ArisProvider = "cursor"): boolean {
  const lower = id.toLowerCase()
  return preferredModelsForProvider(provider).some(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
}

export function preferredModelRank(id: string, provider: ArisProvider = "cursor"): number {
  const lower = id.toLowerCase()
  const idx = preferredModelsForProvider(provider).findIndex(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
  return idx === -1 ? 1000 : idx
}

export function resolveArisModelId(
  explicit?: string,
  provider: ArisProvider = "cursor",
): string {
  if (explicit?.trim()) return explicit.trim()
  if (provider === "openrouter") {
    return process.env.OPENROUTER_MODEL?.trim() || ARIS_DEFAULT_OPENROUTER_MODEL
  }
  return process.env.CURSOR_MODEL?.trim() || ARIS_DEFAULT_MODEL
}

export type ListedModel = { id: string; displayName?: string }

/** Prefer pinned IDs at the top; keep the rest alphabetical. */
export function sortModelsForArisPicker(
  models: ListedModel[],
  provider: ArisProvider = "cursor",
): ListedModel[] {
  return [...models].sort((a, b) => {
    const ra = preferredModelRank(a.id, provider)
    const rb = preferredModelRank(b.id, provider)
    if (ra !== rb) return ra - rb
    return (a.displayName ?? a.id).localeCompare(b.displayName ?? b.id)
  })
}

export function labelForModelId(
  id: string,
  provider: ArisProvider = "cursor",
): string | undefined {
  const lower = id.toLowerCase()
  const hit = preferredModelsForProvider(provider).find(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
  return hit?.label
}
