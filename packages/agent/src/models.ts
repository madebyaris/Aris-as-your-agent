/**
 * Models Aris Studio prefers for day-to-day work.
 * Full catalog still comes from `Cursor.models.list()` — these are pinned for UX + defaults.
 *
 * IDs must match Cursor API; if Grok’s slug differs on an account, the picker
 * still surfaces whatever `list()` returns and we match by prefix.
 */
export const ARIS_DEFAULT_MODEL = "composer-2.5"

export const ARIS_PREFERRED_MODELS = [
  {
    id: "composer-2.5",
    label: "Composer 2.5",
    role: "default" as const,
    blurb: "Primary coding / agent runs (board + project chat).",
  },
  {
    id: "grok-4.5",
    label: "Cursor Grok 4.5",
    role: "reasoning" as const,
    blurb: "Heavier reasoning / research when you switch the default.",
  },
] as const

export type ArisPreferredModel = (typeof ARIS_PREFERRED_MODELS)[number]

export function isPreferredModelId(id: string): boolean {
  const lower = id.toLowerCase()
  return ARIS_PREFERRED_MODELS.some(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
}

export function preferredModelRank(id: string): number {
  const lower = id.toLowerCase()
  const idx = ARIS_PREFERRED_MODELS.findIndex(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
  return idx === -1 ? 1000 : idx
}

export function resolveArisModelId(explicit?: string): string {
  return explicit?.trim() || process.env.CURSOR_MODEL?.trim() || ARIS_DEFAULT_MODEL
}

export type ListedModel = { id: string; displayName?: string }

/** Prefer Composer 2.5 + Grok 4.5 at the top; keep the rest alphabetical. */
export function sortModelsForArisPicker(models: ListedModel[]): ListedModel[] {
  return [...models].sort((a, b) => {
    const ra = preferredModelRank(a.id)
    const rb = preferredModelRank(b.id)
    if (ra !== rb) return ra - rb
    return (a.displayName ?? a.id).localeCompare(b.displayName ?? b.id)
  })
}

export function labelForModelId(id: string): string | undefined {
  const lower = id.toLowerCase()
  const hit = ARIS_PREFERRED_MODELS.find(
    (m) => lower === m.id || lower.startsWith(`${m.id}-`) || lower.includes(m.id),
  )
  return hit?.label
}
