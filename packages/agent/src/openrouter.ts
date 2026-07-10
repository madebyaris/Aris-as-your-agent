import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"
import type { StreamEmitter } from "@aris/stream"
import {
  defaultModelForProvider,
  resolveArisModelId,
  sortModelsForArisPicker,
  type ArisProvider,
  type ListedModel,
} from "./models"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export async function validateOpenRouterApiKey(apiKey: string) {
  const res = await fetch(`${OPENROUTER_BASE}/auth/key`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      body.trim() || `OpenRouter key validation failed (${res.status}).`,
    )
  }
  return res.json()
}

export async function listOpenRouterModels(apiKey: string): Promise<ListedModel[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(body.trim() || `OpenRouter models list failed (${res.status}).`)
  }
  const json = (await res.json()) as {
    data?: Array<{ id: string; name?: string }>
  }
  const models = (json.data ?? []).map((m) => ({
    id: m.id,
    displayName: m.name ?? m.id,
  }))
  return sortModelsForArisPicker(models, "openrouter")
}

type ActiveRun = {
  cancel: () => Promise<void>
}

const openRouterRuns = new Map<string, ActiveRun>()

export function cancelOpenRouterRun(runKey: string) {
  const run = openRouterRuns.get(runKey)
  if (run) {
    void run.cancel()
    openRouterRuns.delete(runKey)
    return true
  }
  return false
}

/**
 * Lite harness: text stream only (no Cursor tools / MCP / resume).
 */
export async function streamOpenRouterResponse(options: {
  apiKey: string
  prompt: string
  model?: string
  runKey?: string
  emit: StreamEmitter
}): Promise<{ proofLabel?: string }> {
  const {
    apiKey,
    prompt,
    model,
    runKey = "default",
    emit,
  } = options

  const modelId = resolveArisModelId(model, "openrouter")
  const openrouter = createOpenRouter({
    apiKey,
    compatibility: "strict",
  })

  emit({
    type: "status",
    status: "openrouter-lite",
    message:
      "OpenRouter lite harness — chat/stream only (no Cursor tools/MCP yet).",
  })

  const abort = new AbortController()
  openRouterRuns.set(runKey, {
    cancel: async () => {
      abort.abort()
    },
  })

  let proofLabel: string | undefined

  try {
    const result = streamText({
      model: openrouter(modelId),
      prompt,
      abortSignal: abort.signal,
      onError: ({ error }) => {
        const message = error instanceof Error ? error.message : String(error)
        emit({ type: "error", message })
      },
    })

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        const text = part.text
        if (text) {
          emit({ type: "assistant_delta", text })
          const match = text.match(
            /PROOF:\s*(verified|implemented-but-unverified|blocked)/i,
          )
          if (match) proofLabel = match[1].toLowerCase()
        }
      } else if (part.type === "reasoning-delta") {
        const text = "text" in part ? String(part.text ?? "") : ""
        if (text) emit({ type: "thinking", text })
      } else if (part.type === "error") {
        const message =
          part.error instanceof Error
            ? part.error.message
            : String(part.error ?? "OpenRouter stream error")
        emit({ type: "error", message })
        emit({ type: "done", ok: false })
        return {}
      }
    }

    openRouterRuns.delete(runKey)
    emit({ type: "done", ok: true, proofLabel })
    return { proofLabel }
  } catch (error) {
    openRouterRuns.delete(runKey)
    if (abort.signal.aborted) {
      emit({ type: "status", status: "cancelled", message: "Run cancelled." })
      emit({ type: "done", ok: false })
      return {}
    }
    const message = error instanceof Error ? error.message : String(error)
    emit({ type: "error", message })
    emit({ type: "done", ok: false })
    return {}
  }
}

export function resolveProviderEnvFallback(
  provider: ArisProvider,
): string | undefined {
  if (provider === "openrouter") {
    return process.env.OPENROUTER_API_KEY?.trim()
  }
  return process.env.CURSOR_API_KEY?.trim()
}

export { defaultModelForProvider }
