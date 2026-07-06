import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

export const ARIS_HOME = join(homedir(), ".aris")
export const ARIS_SESSIONS_DIR = join(ARIS_HOME, "sessions")
export const ARIS_SETTINGS_PATH = join(ARIS_HOME, "settings.json")

export type ArisSettings = {
  cursorApiKey?: string
  defaultModel?: string
}

export type SessionWorkspace = {
  sessionId: string
  path: string
  createdAt: string
}

export async function ensureArisHome() {
  await mkdir(ARIS_HOME, { recursive: true })
  await mkdir(ARIS_SESSIONS_DIR, { recursive: true })
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

  return {
    sessionId,
    path,
    createdAt: new Date().toISOString(),
  }
}

export async function getSessionWorkspacePath(sessionId: string) {
  return join(ARIS_SESSIONS_DIR, sessionId)
}
