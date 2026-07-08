import { Agent, Cursor } from "@cursor/sdk"
import type { StreamEmitter } from "@aris/stream"
import { emitPlaceholderResponse } from "@aris/stream"

export type CreateArisAgentOptions = {
  apiKey: string
  workspacePath: string
  model?: string
  /** Load .cursor/ skills, agents, rules from workspace when present. */
  loadProjectConfig?: boolean
}

const ARIS_SYSTEM_PREFIX = [
  "You are Aris, a senior full-stack developer with 12+ years of experience.",
  "You build with Next.js, React, TypeScript, and pragmatic architecture.",
  "Before coding: research competitors, identify patterns worth copying, list required assets.",
  "Break work into prioritized tasks (P0 first). Prefer minimal focused diffs.",
  "Explain tradeoffs clearly. Ask clarifying questions when scope is ambiguous.",
].join("\n")

export async function validateApiKey(apiKey: string) {
  await Cursor.me({ apiKey })
}

export async function createArisAgent(options: CreateArisAgentOptions) {
  return Agent.create({
    apiKey: options.apiKey,
    name: "Aris",
    model: { id: options.model ?? process.env.CURSOR_MODEL ?? "composer-2.5" },
    local: {
      cwd: options.workspacePath,
      ...(options.loadProjectConfig !== false
        ? { settingSources: ["project" as const] }
        : {}),
    },
  })
}

export function buildArisPrompt(
  userMessage: string,
  workspacePath: string,
  extras?: {
    agentNotes?: string
    projectMode?: string
    continuity?: string
    transcript?: string
  },
) {
  return [
    ARIS_SYSTEM_PREFIX,
    "",
    `Workspace: ${workspacePath}`,
    extras?.projectMode
      ? `Project mode: ${extras.projectMode} (software never finishes — enhance, don't restart unless asked)`
      : "",
    extras?.continuity ? `\n${extras.continuity}` : "",
    extras?.agentNotes ? `\n${extras.agentNotes}` : "",
    extras?.transcript ? `\n${extras.transcript}` : "",
    "",
    "User request:",
    userMessage,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Stream an agent response. Uses real SDK when CURSOR_API_KEY is set and valid;
 * falls back to placeholder in scaffold mode.
 */
export async function streamArisResponse(options: {
  apiKey?: string
  workspacePath: string
  userMessage: string
  model?: string
  projectMode?: string
  agentNotes?: string
  continuity?: string
  transcript?: string
  emit: StreamEmitter
}) {
  const {
    apiKey,
    workspacePath,
    userMessage,
    model,
    projectMode,
    agentNotes,
    continuity,
    transcript,
    emit,
  } = options

  if (!apiKey?.trim()) {
    emit({ type: "error", message: "CURSOR_API_KEY is required." })
    emit({ type: "done", ok: false })
    return
  }

  let agent: Awaited<ReturnType<typeof createArisAgent>> | undefined

  try {
    await validateApiKey(apiKey)
    agent = await createArisAgent({ apiKey, workspacePath, model })
    const run = await agent.send(
      buildArisPrompt(userMessage, workspacePath, {
        agentNotes,
        projectMode,
        continuity,
        transcript,
      }),
    )

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            emit({ type: "assistant_delta", text: block.text })
          } else if (block.type === "tool_use") {
            emit({
              type: "tool_call",
              callId: block.id,
              name: block.name,
              status: "requested",
              args: block.input,
            })
          }
        }
      } else if (event.type === "thinking") {
        const thinking = event as { text?: string; message?: { text?: string } }
        const text = thinking.text ?? thinking.message?.text ?? ""
        if (text) emit({ type: "thinking", text })
      }
    }

    const result = await run.wait()
    if (result.status === "error") {
      emit({ type: "error", message: `Agent run failed: ${result.id}` })
      emit({ type: "done", ok: false })
      return
    }

    emit({ type: "done", ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Graceful fallback when SDK can't run in this environment (e.g. missing binary)
    if (message.includes("CURSOR_API_KEY") || message.includes("401")) {
      emit({ type: "error", message })
      emit({ type: "done", ok: false })
      return
    }

    emit({
      type: "status",
      status: "fallback",
      message: `SDK unavailable (${message}). Showing scaffold response.`,
    })
    emitPlaceholderResponse(userMessage, emit)
  } finally {
    await agent?.[Symbol.asyncDispose]?.()
  }
}
