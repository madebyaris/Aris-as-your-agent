import { mkdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export const ARIS_HOME = join(homedir(), ".aris")
export const ARIS_SESSIONS_DIR = join(ARIS_HOME, "sessions")
export const ARIS_SETTINGS_PATH = join(ARIS_HOME, "settings.json")
export const SESSIONS_REGISTRY_PATH = join(ARIS_HOME, "sessions.json")
export const TRANSCRIPTS_DIR = join(ARIS_HOME, "transcripts")

export async function ensureArisHome() {
  await mkdir(ARIS_HOME, { recursive: true })
  await mkdir(ARIS_SESSIONS_DIR, { recursive: true })
}
