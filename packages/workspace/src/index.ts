import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import {
  ARIS_SESSIONS_DIR,
  ARIS_SETTINGS_PATH,
  ensureArisHome,
} from "./paths.js"

export {
  ARIS_HOME,
  ARIS_SESSIONS_DIR,
  ARIS_SETTINGS_PATH,
  SESSIONS_REGISTRY_PATH,
  TRANSCRIPTS_DIR,
  ensureArisHome,
} from "./paths.js"

export type ArisSettings = {
  cursorApiKey?: string
  defaultModel?: string
}

export type SessionWorkspace = {
  sessionId: string
  path: string
  createdAt: string
}

export async function readSettings(): Promise<ArisSettings> {
  try {
    const raw = await readFile(ARIS_SETTINGS_PATH, "utf8")
    return JSON.parse(raw) as ArisSettings
  } catch {
    return {}
  }
}

export async function writeSettings(settings: ArisSettings) {
  await ensureArisHome()
  await writeFile(ARIS_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8")
}

/**
 * Create an isolated session workspace under ~/.aris/sessions/{id}/.
 * Git worktrees are optional and not used here — see createWorktreeWorkspace (Phase 4).
 */
export async function createSessionWorkspace(sessionId = randomUUID()): Promise<SessionWorkspace> {
  await ensureArisHome()
  const path = join(ARIS_SESSIONS_DIR, sessionId)
  await mkdir(path, { recursive: true })
  await mkdir(join(path, "specs", "active"), { recursive: true })
  await mkdir(join(path, ".aris"), { recursive: true })

  return {
    sessionId,
    path,
    createdAt: new Date().toISOString(),
  }
}

export async function getSessionWorkspacePath(sessionId: string) {
  return join(ARIS_SESSIONS_DIR, sessionId)
}

export * from "./sessions.js"
export * from "./project-state.js"
