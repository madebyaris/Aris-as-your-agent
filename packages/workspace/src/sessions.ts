import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { ensureArisHome, SESSIONS_REGISTRY_PATH, TRANSCRIPTS_DIR } from "./paths.js"

export { SESSIONS_REGISTRY_PATH, TRANSCRIPTS_DIR } from "./paths.js"

export type WorkSessionStatus = "active" | "paused" | "done"

export type WorkSession = {
  id: string
  projectId?: string
  workspacePath: string
  status: WorkSessionStatus
  cursorAgentId?: string
  title?: string
  createdAt: string
  updatedAt: string
}

export type SessionsRegistry = {
  sessions: WorkSession[]
}

export type TranscriptMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  at: string
}

async function ensureTranscriptsDir() {
  await ensureArisHome()
  await mkdir(TRANSCRIPTS_DIR, { recursive: true })
}

export async function readSessionsRegistry(): Promise<SessionsRegistry> {
  try {
    const raw = await readFile(SESSIONS_REGISTRY_PATH, "utf8")
    return JSON.parse(raw) as SessionsRegistry
  } catch {
    return { sessions: [] }
  }
}

export async function writeSessionsRegistry(registry: SessionsRegistry) {
  await ensureArisHome()
  await writeFile(SESSIONS_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8")
}

export async function getSession(sessionId: string): Promise<WorkSession | null> {
  const registry = await readSessionsRegistry()
  return registry.sessions.find((s) => s.id === sessionId) ?? null
}

/**
 * Prefer the last active session for a project. Continuity depends on this,
 * not on minting a fresh UUID every page load.
 */
export async function getResumableSession(
  projectId: string,
): Promise<WorkSession | null> {
  const registry = await readSessionsRegistry()
  const forProject = registry.sessions
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    forProject.find((s) => s.status === "active") ??
    forProject.find((s) => s.status === "paused") ??
    null
  )
}

export async function createWorkSession(input: {
  workspacePath: string
  projectId?: string
  title?: string
  cursorAgentId?: string
}): Promise<WorkSession> {
  const registry = await readSessionsRegistry()
  const now = new Date().toISOString()
  const session: WorkSession = {
    id: randomUUID(),
    projectId: input.projectId,
    workspacePath: input.workspacePath,
    status: "active",
    cursorAgentId: input.cursorAgentId,
    title: input.title,
    createdAt: now,
    updatedAt: now,
  }
  registry.sessions.push(session)
  await writeSessionsRegistry(registry)
  await ensureTranscriptsDir()
  return session
}

/**
 * Resume last active session for a project, or create one.
 */
export async function resumeOrCreateSession(input: {
  workspacePath: string
  projectId?: string
  title?: string
}): Promise<{ session: WorkSession; resumed: boolean }> {
  if (input.projectId) {
    const existing = await getResumableSession(input.projectId)
    if (existing) {
      const updated = await touchWorkSession(existing.id, {
        status: "active",
        workspacePath: input.workspacePath,
      })
      return { session: updated!, resumed: true }
    }
  }
  const session = await createWorkSession(input)
  return { session, resumed: false }
}

export async function touchWorkSession(
  sessionId: string,
  patch: Partial<
    Pick<WorkSession, "status" | "cursorAgentId" | "title" | "workspacePath">
  >,
): Promise<WorkSession | null> {
  const registry = await readSessionsRegistry()
  const index = registry.sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) return null
  registry.sessions[index] = {
    ...registry.sessions[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await writeSessionsRegistry(registry)
  return registry.sessions[index]
}

export function transcriptPath(sessionId: string) {
  return join(TRANSCRIPTS_DIR, `${sessionId}.jsonl`)
}

export async function appendTranscript(
  sessionId: string,
  messages: Array<Omit<TranscriptMessage, "id" | "at"> & { id?: string; at?: string }>,
) {
  await ensureTranscriptsDir()
  const lines = messages.map((m) =>
    JSON.stringify({
      id: m.id ?? randomUUID(),
      role: m.role,
      content: m.content,
      at: m.at ?? new Date().toISOString(),
    } satisfies TranscriptMessage),
  )
  await appendFile(transcriptPath(sessionId), `${lines.join("\n")}\n`, "utf8")
}

export async function getTranscript(sessionId: string): Promise<TranscriptMessage[]> {
  try {
    const raw = await readFile(transcriptPath(sessionId), "utf8")
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TranscriptMessage)
  } catch {
    return []
  }
}

/** Last N messages for prompt assembly (user + assistant turns). */
export function formatTranscriptForPrompt(
  messages: TranscriptMessage[],
  limit = 10,
): string {
  if (messages.length === 0) return ""
  const slice = messages.slice(-limit)
  return [
    "## Recent conversation",
    ...slice.map((m) => `### ${m.role}\n${m.content}`),
  ].join("\n\n")
}
