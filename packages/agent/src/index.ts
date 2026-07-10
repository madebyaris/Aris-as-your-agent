import { Agent, Cursor } from "@cursor/sdk"
import type { SDKCustomTool } from "@cursor/sdk"
import type { StreamEmitter } from "@aris/stream"
import {
  ARIS_MASTER_DIR,
  ensureMasterDir,
} from "@aris/workspace"
import {
  defaultModelForProvider,
  resolveArisModelId,
  type ArisProvider,
} from "./models"
import {
  cancelOpenRouterRun,
  listOpenRouterModels,
  resolveProviderEnvFallback,
  streamOpenRouterResponse,
  validateOpenRouterApiKey,
} from "./openrouter"
import {
  buildMasterPrompt,
  createMasterCustomTools,
  type MasterToolsContext,
} from "./master-tools"

export {
  ARIS_DEFAULT_MODEL,
  ARIS_DEFAULT_OPENROUTER_MODEL,
  ARIS_DEFAULT_PROVIDER,
  ARIS_OPENROUTER_PREFERRED_MODELS,
  ARIS_PREFERRED_MODELS,
  defaultModelForProvider,
  isPreferredModelId,
  labelForModelId,
  preferredModelRank,
  preferredModelsForProvider,
  resolveArisModelId,
  sortModelsForArisPicker,
  type ArisPreferredModel,
  type ArisProvider,
  type ListedModel,
} from "./models"

export {
  buildMasterPrompt,
  createMasterCustomTools,
  masterCreateProjectPayload,
  masterCreateScratchPayload,
  masterListAgentNotesForProject,
  masterListNotesPayload,
  masterListProjectsPayload,
  masterListServersPayload,
  masterOpenProjectPayload,
  masterProjectSummaryPayload,
  masterStatusPayload,
  MASTER_SYSTEM_PREFIX,
  type MasterToolsContext,
} from "./master-tools"

export type CreateArisAgentOptions = {
  apiKey: string
  workspacePath: string
  model?: string
  agentId?: string
  /** Load .cursor/ skills, agents, rules from workspace when present. */
  loadProjectConfig?: boolean
  /** Local-only Cursor custom tools (ADR 008 Master). */
  customTools?: Record<string, SDKCustomTool>
  name?: string
}

const ARIS_SYSTEM_PREFIX = [
  "You are Aris, a senior full-stack developer with 12+ years of experience.",
  "You build with React, TypeScript, TanStack, and pragmatic architecture (not Next.js unless the project already uses it).",
  "Before coding: research competitors, identify patterns worth copying, list required assets.",
  "Break work into prioritized tasks (P0 first). Prefer minimal focused diffs.",
  "Explain tradeoffs clearly. Ask clarifying questions when scope is ambiguous.",
  "Software never finishes — continue existing projects; do not restart unless asked.",
].join("\n")

export async function validateApiKey(
  apiKey: string,
  provider: ArisProvider = "cursor",
) {
  if (provider === "openrouter") {
    return validateOpenRouterApiKey(apiKey)
  }
  return Cursor.me({ apiKey })
}

export async function listModels(
  apiKey: string,
  provider: ArisProvider = "cursor",
) {
  if (provider === "openrouter") {
    return listOpenRouterModels(apiKey)
  }
  return Cursor.models.list({ apiKey })
}

export async function createOrResumeAgent(options: CreateArisAgentOptions) {
  const modelId = resolveArisModelId(options.model, "cursor")
  const local = {
    cwd: options.workspacePath,
    ...(options.loadProjectConfig !== false
      ? { settingSources: ["project" as const] }
      : {}),
    ...(options.customTools ? { customTools: options.customTools } : {}),
  }

  if (options.agentId) {
    try {
      return await Agent.resume(options.agentId, {
        apiKey: options.apiKey,
        model: { id: modelId },
        local,
      })
    } catch {
      // Fall through to create if resume fails (expired / missing store).
    }
  }

  return Agent.create({
    apiKey: options.apiKey,
    name: options.name ?? "Aris",
    model: { id: modelId },
    local,
  })
}

export function buildArisPrompt(
  userMessage: string,
  workspacePath: string,
  extras?: { agentNotes?: string; projectMode?: string; phaseHint?: string },
) {
  return [
    ARIS_SYSTEM_PREFIX,
    "",
    `Workspace: ${workspacePath}`,
    extras?.projectMode
      ? `Project mode: ${extras.projectMode} (software never finishes — enhance, don't restart unless asked)`
      : "",
    extras?.phaseHint ? `\nPhase instructions:\n${extras.phaseHint}` : "",
    extras?.agentNotes ? `\n${extras.agentNotes}` : "",
    "",
    "User request:",
    userMessage,
  ]
    .filter(Boolean)
    .join("\n")
}

type ActiveRun = {
  cancel: () => Promise<void>
}

const activeRuns = new Map<string, ActiveRun>()

export function cancelRun(runKey: string) {
  if (cancelOpenRouterRun(runKey)) return true
  const run = activeRuns.get(runKey)
  if (run) {
    void run.cancel()
    activeRuns.delete(runKey)
    return true
  }
  return false
}

/**
 * Stream an agent response with token-level deltas when available.
 * Routes by `provider` (ADR 014): Cursor = full harness; OpenRouter = lite.
 */
export async function streamArisResponse(options: {
  apiKey?: string
  provider?: ArisProvider
  workspacePath: string
  userMessage: string
  model?: string
  projectMode?: string
  agentNotes?: string
  agentId?: string
  phaseHint?: string
  mode?: "plan" | "agent"
  runKey?: string
  force?: boolean
  emit: StreamEmitter
  onAgentId?: (agentId: string) => void | Promise<void>
}): Promise<{ agentId?: string; proofLabel?: string }> {
  const {
    workspacePath,
    userMessage,
    model,
    projectMode,
    agentNotes,
    agentId,
    phaseHint,
    mode,
    runKey = "default",
    force,
    emit,
    onAgentId,
  } = options

  const provider: ArisProvider = options.provider ?? "cursor"
  const apiKey =
    options.apiKey?.trim() || resolveProviderEnvFallback(provider)

  if (!apiKey) {
    const hint =
      provider === "openrouter"
        ? "OPENROUTER_API_KEY is required. Add an OpenRouter account in Studio → Accounts."
        : "CURSOR_API_KEY is required. Add a Cursor account in Studio → Accounts."
    emit({ type: "error", message: hint })
    emit({ type: "done", ok: false })
    return {}
  }

  const prompt = buildArisPrompt(userMessage, workspacePath, {
    agentNotes,
    projectMode,
    phaseHint,
  })

  if (provider === "openrouter") {
    const result = await streamOpenRouterResponse({
      apiKey,
      prompt,
      model: model ?? defaultModelForProvider("openrouter"),
      runKey,
      emit,
    })
    return { proofLabel: result.proofLabel }
  }

  let agent: Awaited<ReturnType<typeof createOrResumeAgent>> | undefined
  let proofLabel: string | undefined

  try {
    await validateApiKey(apiKey, "cursor")
    agent = await createOrResumeAgent({
      apiKey,
      workspacePath,
      model,
      agentId,
    })

    const resolvedId = (agent as { agentId?: string }).agentId ?? agentId
    if (resolvedId) {
      emit({ type: "agent_id", agentId: resolvedId })
      await onAgentId?.(resolvedId)
    }

    const run = await agent.send(prompt, {
      ...(mode ? { mode } : {}),
      ...(force ? { local: { force: true } } : {}),
      onDelta: ({ update }) => {
        if (update.type === "text-delta" && "text" in update && update.text) {
          emit({ type: "assistant_delta", text: String(update.text) })
          const match = String(update.text).match(
            /PROOF:\s*(verified|implemented-but-unverified|blocked)/i,
          )
          if (match) proofLabel = match[1].toLowerCase()
        } else if (update.type === "thinking-delta" && "text" in update && update.text) {
          emit({ type: "thinking", text: String(update.text) })
        } else if (update.type === "tool-call-started") {
          emit({
            type: "tool_call",
            callId: "callId" in update ? String(update.callId ?? "") : undefined,
            name: "name" in update ? String(update.name ?? "tool") : "tool",
            status: "started",
            args: "args" in update ? update.args : undefined,
          })
        } else if (update.type === "tool-call-completed") {
          emit({
            type: "tool_call",
            callId: "callId" in update ? String(update.callId ?? "") : undefined,
            name: "name" in update ? String(update.name ?? "tool") : "tool",
            status: "completed",
          })
        }
      },
    })

    emit({ type: "run_id", runId: run.id })
    activeRuns.set(runKey, {
      cancel: () => run.cancel(),
    })

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "tool_use") {
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
    activeRuns.delete(runKey)

    if (result.status === "error") {
      emit({ type: "error", message: `Agent run failed: ${result.id}` })
      emit({ type: "done", ok: false })
      return { agentId: resolvedId }
    }

    if (result.status === "cancelled") {
      emit({ type: "status", status: "cancelled", message: "Run cancelled." })
      emit({ type: "done", ok: false })
      return { agentId: resolvedId }
    }

    emit({ type: "done", ok: true, proofLabel })
    return { agentId: resolvedId, proofLabel }
  } catch (error) {
    activeRuns.delete(runKey)
    const message = error instanceof Error ? error.message : String(error)
    emit({ type: "error", message })
    emit({ type: "done", ok: false })
    return {}
  } finally {
    await agent?.[Symbol.asyncDispose]?.()
  }
}

/**
 * Master control-plane stream (ADR 008). Cursor + customTools only.
 * OpenRouter is rejected — tools require the local Cursor harness.
 */
export async function streamMasterResponse(options: {
  apiKey?: string
  provider?: ArisProvider
  userMessage: string
  model?: string
  agentId?: string
  runKey?: string
  force?: boolean
  toolsContext?: MasterToolsContext
  emit: StreamEmitter
  onAgentId?: (agentId: string) => void | Promise<void>
}): Promise<{ agentId?: string }> {
  const {
    userMessage,
    model,
    agentId,
    runKey = "master:chat",
    force,
    toolsContext,
    emit,
    onAgentId,
  } = options

  const provider: ArisProvider = options.provider ?? "cursor"
  if (provider !== "cursor") {
    emit({
      type: "error",
      message:
        "Master requires a Cursor account for control-plane tools. Switch the active account in Studio → Accounts.",
    })
    emit({ type: "done", ok: false })
    return {}
  }

  const apiKey =
    options.apiKey?.trim() || resolveProviderEnvFallback("cursor")
  if (!apiKey) {
    emit({
      type: "error",
      message:
        "CURSOR_API_KEY is required for Master. Add a Cursor account in Studio → Accounts.",
    })
    emit({ type: "done", ok: false })
    return {}
  }

  await ensureMasterDir()
  const customTools = createMasterCustomTools(toolsContext)
  const prompt = buildMasterPrompt(userMessage, {
    activeRunLabel: toolsContext?.activeRunLabel,
  })

  let agent: Awaited<ReturnType<typeof createOrResumeAgent>> | undefined

  try {
    await validateApiKey(apiKey, "cursor")
    agent = await createOrResumeAgent({
      apiKey,
      workspacePath: ARIS_MASTER_DIR,
      model,
      agentId,
      loadProjectConfig: false,
      customTools,
      name: "Aris Master",
    })

    const resolvedId = (agent as { agentId?: string }).agentId ?? agentId
    if (resolvedId) {
      emit({ type: "agent_id", agentId: resolvedId })
      await onAgentId?.(resolvedId)
    }

    const run = await agent.send(prompt, {
      ...(force ? { local: { force: true, customTools } } : { local: { customTools } }),
      onDelta: ({ update }) => {
        if (update.type === "text-delta" && "text" in update && update.text) {
          emit({ type: "assistant_delta", text: String(update.text) })
        } else if (update.type === "thinking-delta" && "text" in update && update.text) {
          emit({ type: "thinking", text: String(update.text) })
        } else if (update.type === "tool-call-started") {
          emit({
            type: "tool_call",
            callId: "callId" in update ? String(update.callId ?? "") : undefined,
            name: "name" in update ? String(update.name ?? "tool") : "tool",
            status: "started",
            args: "args" in update ? update.args : undefined,
          })
        } else if (update.type === "tool-call-completed") {
          const name =
            "name" in update ? String(update.name ?? "tool") : "tool"
          emit({
            type: "tool_call",
            callId: "callId" in update ? String(update.callId ?? "") : undefined,
            name,
            status: "completed",
          })
          // Surface navigation hints from tool results when present
          const resultText =
            "result" in update && update.result != null
              ? String(update.result)
              : ""
          const nav = resultText.match(/NAVIGATE_PROJECT:([a-f0-9-]+)/i)
          if (nav) {
            emit({
              type: "status",
              status: "navigate_project",
              message: nav[1],
            })
          }
        }
      },
    })

    emit({ type: "run_id", runId: run.id })
    activeRuns.set(runKey, {
      cancel: () => run.cancel(),
    })

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "tool_use") {
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
    activeRuns.delete(runKey)

    if (result.status === "error") {
      emit({ type: "error", message: `Master run failed: ${result.id}` })
      emit({ type: "done", ok: false })
      return { agentId: resolvedId }
    }

    if (result.status === "cancelled") {
      emit({ type: "status", status: "cancelled", message: "Run cancelled." })
      emit({ type: "done", ok: false })
      return { agentId: resolvedId }
    }

    emit({ type: "done", ok: true })
    return { agentId: resolvedId }
  } catch (error) {
    activeRuns.delete(runKey)
    const message = error instanceof Error ? error.message : String(error)
    emit({ type: "error", message })
    emit({ type: "done", ok: false })
    return {}
  } finally {
    await agent?.[Symbol.asyncDispose]?.()
  }
}
