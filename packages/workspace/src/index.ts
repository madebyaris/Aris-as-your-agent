import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

/** Keep in sync with `@aris/agent` `ARIS_DEFAULT_MODEL` (Composer 2.5). */
export const ARIS_DEFAULT_MODEL = "composer-2.5"

export const ARIS_HOME = join(homedir(), ".aris")
export const ARIS_SESSIONS_DIR = join(ARIS_HOME, "sessions")
export const ARIS_SETTINGS_PATH = join(ARIS_HOME, "settings.json")
/** Default parent for new project folders (collision-safe, visible). */
export const ARIS_WORKSPACE_ROOT = join(homedir(), "aris-workspace")
/**
 * Dedicated secrets root (collision-safe, visible).
 * SSH credentials live under `{ARIS_SECRETS_ROOT}/servers/`.
 * Metadata stays in `~/.aris/servers.json`.
 */
export const ARIS_SECRETS_ROOT = join(homedir(), "aris-secrets")

export type ArisAccount = {
  id: string
  label: string
  apiKey: string
  createdAt: string
}

export type ArisSettings = {
  /** @deprecated Prefer accounts + activeAccountId */
  cursorApiKey?: string
  defaultModel?: string
  accounts?: ArisAccount[]
  activeAccountId?: string
  recentProjectPaths?: string[]
  lastProjectId?: string
}

export type SessionWorkspace = {
  sessionId: string
  path: string
  createdAt: string
}

export async function ensureArisHome() {
  await mkdir(ARIS_HOME, { recursive: true })
  await mkdir(ARIS_SESSIONS_DIR, { recursive: true })
  await mkdir(ARIS_WORKSPACE_ROOT, { recursive: true })
  await mkdir(join(ARIS_SECRETS_ROOT, "servers"), { recursive: true, mode: 0o700 })
}

function migrateSettings(raw: ArisSettings): ArisSettings {
  const accounts = [...(raw.accounts ?? [])]
  if (raw.cursorApiKey?.trim() && accounts.length === 0) {
    const id = randomUUID()
    accounts.push({
      id,
      label: "Default",
      apiKey: raw.cursorApiKey.trim(),
      createdAt: new Date().toISOString(),
    })
    return {
      ...raw,
      accounts,
      activeAccountId: raw.activeAccountId ?? id,
      defaultModel: raw.defaultModel ?? ARIS_DEFAULT_MODEL,
    }
  }
  return {
    ...raw,
    accounts,
    defaultModel: raw.defaultModel ?? ARIS_DEFAULT_MODEL,
  }
}

export async function readSettings(): Promise<ArisSettings> {
  try {
    const raw = await readFile(ARIS_SETTINGS_PATH, "utf8")
    return migrateSettings(JSON.parse(raw) as ArisSettings)
  } catch {
    return { accounts: [], defaultModel: ARIS_DEFAULT_MODEL }
  }
}

export async function writeSettings(settings: ArisSettings) {
  await ensureArisHome()
  await writeFile(ARIS_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8")
}

export function getActiveApiKey(settings: ArisSettings): string | undefined {
  const migrated = migrateSettings(settings)
  if (migrated.activeAccountId) {
    const account = migrated.accounts?.find((a) => a.id === migrated.activeAccountId)
    if (account?.apiKey) return account.apiKey
  }
  return migrated.accounts?.[0]?.apiKey ?? migrated.cursorApiKey?.trim()
}

export async function upsertAccount(input: {
  label: string
  apiKey: string
  id?: string
  makeActive?: boolean
}): Promise<ArisSettings> {
  const settings = await readSettings()
  const accounts = [...(settings.accounts ?? [])]
  const now = new Date().toISOString()
  if (input.id) {
    const idx = accounts.findIndex((a) => a.id === input.id)
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        label: input.label,
        apiKey: input.apiKey,
      }
    }
  } else {
    accounts.push({
      id: randomUUID(),
      label: input.label,
      apiKey: input.apiKey,
      createdAt: now,
    })
  }
  const activeAccountId =
    input.makeActive === false
      ? settings.activeAccountId ?? accounts[0]?.id
      : (input.id ?? accounts[accounts.length - 1]?.id)
  const next: ArisSettings = {
    ...settings,
    accounts,
    activeAccountId,
    cursorApiKey: undefined,
  }
  await writeSettings(next)
  return next
}

export async function setActiveAccount(accountId: string): Promise<ArisSettings> {
  const settings = await readSettings()
  if (!settings.accounts?.some((a) => a.id === accountId)) {
    throw new Error("Account not found.")
  }
  const next = { ...settings, activeAccountId: accountId }
  await writeSettings(next)
  return next
}

export async function removeAccount(accountId: string): Promise<ArisSettings> {
  const settings = await readSettings()
  const accounts = (settings.accounts ?? []).filter((a) => a.id !== accountId)
  const next: ArisSettings = {
    ...settings,
    accounts,
    activeAccountId:
      settings.activeAccountId === accountId ? accounts[0]?.id : settings.activeAccountId,
  }
  await writeSettings(next)
  return next
}

export async function pushRecentPath(path: string) {
  const settings = await readSettings()
  const recent = [path, ...(settings.recentProjectPaths ?? []).filter((p) => p !== path)].slice(
    0,
    12,
  )
  await writeSettings({ ...settings, recentProjectPaths: recent })
}

/**
 * Create an isolated session workspace under ~/.aris/sessions/{id}/.
 * Prefer project folders under ~/aris-workspace for Studio v1.
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
