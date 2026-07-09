import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import {
  ARIS_HOME,
  ARIS_SECRETS_ROOT,
  ensureArisHome,
} from "@aris/workspace"
import { createNote } from "@aris/notes"

export const SERVERS_REGISTRY_PATH = join(ARIS_HOME, "servers.json")
/** Current secrets location — collision-safe dedicated root. */
export const SERVER_SECRETS_DIR = join(ARIS_SECRETS_ROOT, "servers")
/** Legacy path used before ADR 004. Migrated on first access. */
export const LEGACY_SERVER_SECRETS_DIR = join(ARIS_HOME, "secrets", "servers")
export const SERVER_BACKUPS_DIR = join(ARIS_HOME, "backups", "servers")

export type ServerAuthType = "password" | "private_key"

/** Credential metadata — secrets stored separately under ~/aris-secrets/servers/ */
export type ServerTarget = {
  id: string
  label: string
  host: string
  port: number
  username: string
  authType: ServerAuthType
  /** Filename under SERVER_SECRETS_DIR (encrypted at rest in Phase 2). */
  secretRef: string
  createdAt: string
  updatedAt: string
  /** Optional tags: production, staging, wordpress, etc. */
  tags?: string[]
  /**
   * Projects that can see this server.
   * Empty / undefined = visible to all projects (legacy).
   */
  projectIds?: string[]
}

export type ServersRegistry = {
  servers: ServerTarget[]
}

export type ServerBackupRecord = {
  id: string
  serverId: string
  taskId: string
  label: string
  createdAt: string
  /** Local folder with manifest + captured artifacts for rollback. */
  backupPath: string
  /** Human-readable pre-change state summary. */
  preChangeNotes: string
  rollbackHint?: string
  status: "ready" | "restored" | "failed"
}

export type ServerTaskPhase =
  | "connect"
  | "document"
  | "backup"
  | "execute"
  | "verify"
  | "rollback"

export const SERVER_TASK_PHASES: ServerTaskPhase[] = [
  "connect",
  "document",
  "backup",
  "execute",
  "verify",
  "rollback",
]

export type ServerTaskPlan = {
  taskId: string
  serverId: string
  description: string
  phases: ServerTaskPhase[]
  backupRequired: true
}

async function pathExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure secrets dir exists and migrate any legacy files from
 * `~/.aris/secrets/servers/` → `~/aris-secrets/servers/`.
 */
export async function ensureServerSecretsDir() {
  await ensureArisHome()
  await mkdir(SERVER_SECRETS_DIR, { recursive: true, mode: 0o700 })

  if (!(await pathExists(LEGACY_SERVER_SECRETS_DIR))) return

  const registry = await readServersRegistry()
  for (const server of registry.servers) {
    const nextPath = join(SERVER_SECRETS_DIR, server.secretRef)
    const legacyPath = join(LEGACY_SERVER_SECRETS_DIR, server.secretRef)
    if (await pathExists(nextPath)) continue
    if (!(await pathExists(legacyPath))) continue
    await copyFile(legacyPath, nextPath)
  }
}

/** Resolve the on-disk secret path, preferring the new root with legacy fallback. */
export async function resolveServerSecretPath(secretRef: string): Promise<string> {
  await ensureServerSecretsDir()
  const nextPath = join(SERVER_SECRETS_DIR, secretRef)
  if (await pathExists(nextPath)) return nextPath
  const legacyPath = join(LEGACY_SERVER_SECRETS_DIR, secretRef)
  if (await pathExists(legacyPath)) {
    await copyFile(legacyPath, nextPath)
    return nextPath
  }
  return nextPath
}

export async function readServersRegistry(): Promise<ServersRegistry> {
  try {
    const raw = await readFile(SERVERS_REGISTRY_PATH, "utf8")
    return JSON.parse(raw) as ServersRegistry
  } catch {
    return { servers: [] }
  }
}

export async function writeServersRegistry(registry: ServersRegistry) {
  await ensureServerSecretsDir()
  await writeFile(SERVERS_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8")
}

export async function registerServer(input: {
  label: string
  host: string
  port?: number
  username: string
  authType: ServerAuthType
  secret: string
  tags?: string[]
  /** Projects that can see this server. Empty = all projects. */
  projectIds?: string[]
}): Promise<ServerTarget> {
  await ensureServerSecretsDir()

  const id = randomUUID()
  const secretRef = `${id}.secret`
  const secretPath = join(SERVER_SECRETS_DIR, secretRef)

  // Phase 2: encrypt at rest. Scaffold stores locally only — never commit.
  await writeFile(secretPath, input.secret, { mode: 0o600 })

  const now = new Date().toISOString()
  const server: ServerTarget = {
    id,
    label: input.label,
    host: input.host,
    port: input.port ?? 22,
    username: input.username,
    authType: input.authType,
    secretRef,
    tags: input.tags ?? [],
    projectIds: input.projectIds ?? [],
    createdAt: now,
    updatedAt: now,
  }

  const registry = await readServersRegistry()
  registry.servers.push(server)
  await writeServersRegistry(registry)
  return server
}

export async function getServer(serverId: string): Promise<ServerTarget | null> {
  const registry = await readServersRegistry()
  return registry.servers.find((s) => s.id === serverId) ?? null
}

/** True if the server is visible to the given project (or globally when unscoped). */
export function serverVisibleToProject(
  server: ServerTarget,
  projectId: string | undefined,
): boolean {
  const ids = server.projectIds ?? []
  if (ids.length === 0) return true
  if (!projectId) return false
  return ids.includes(projectId)
}

export async function listServersForProject(
  projectId?: string,
): Promise<ServerTarget[]> {
  const registry = await readServersRegistry()
  if (!projectId) return registry.servers
  return registry.servers.filter((s) => serverVisibleToProject(s, projectId))
}

export async function updateServerProjects(
  serverId: string,
  projectIds: string[],
): Promise<ServerTarget | null> {
  const registry = await readServersRegistry()
  const index = registry.servers.findIndex((s) => s.id === serverId)
  if (index === -1) return null
  registry.servers[index] = {
    ...registry.servers[index],
    projectIds,
    updatedAt: new Date().toISOString(),
  }
  await writeServersRegistry(registry)
  return registry.servers[index]
}

export function createServerTaskPlan(
  serverId: string,
  description: string,
): ServerTaskPlan {
  return {
    taskId: randomUUID(),
    serverId,
    description,
    phases: [...SERVER_TASK_PHASES],
    backupRequired: true,
  }
}

/**
 * Mandatory pre-flight for every server task:
 * 1. Write a pre-change note (agent-visible by default for audit trail)
 * 2. Create a backup record placeholder (real SSH capture in Phase 2)
 */
export async function beginServerTaskSafely(input: {
  plan: ServerTaskPlan
  server: ServerTarget
  preChangeNotes: string
}): Promise<ServerBackupRecord> {
  await mkdir(join(SERVER_BACKUPS_DIR, input.server.id), { recursive: true })

  const backupId = randomUUID()
  const backupPath = join(SERVER_BACKUPS_DIR, input.server.id, backupId)
  await mkdir(backupPath, { recursive: true })

  const manifest = {
    serverId: input.server.id,
    taskId: input.plan.taskId,
    host: input.server.host,
    createdAt: new Date().toISOString(),
    preChangeNotes: input.preChangeNotes,
    description: input.plan.description,
  }
  await writeFile(
    join(backupPath, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  )

  await createNote({
    title: `Pre-change: ${input.plan.description.slice(0, 60)}`,
    body: input.preChangeNotes,
    visibility: "agent",
    serverId: input.server.id,
    tags: ["server", "backup", "pre-change"],
  })

  const record: ServerBackupRecord = {
    id: backupId,
    serverId: input.server.id,
    taskId: input.plan.taskId,
    label: input.plan.description,
    createdAt: manifest.createdAt,
    backupPath,
    preChangeNotes: input.preChangeNotes,
    rollbackHint: "Restore from backupPath/manifest.json — full SSH rollback in Phase 2",
    status: "ready",
  }

  const backupsPath = join(backupPath, "..", "index.json")
  let index: ServerBackupRecord[] = []
  try {
    index = JSON.parse(await readFile(backupsPath, "utf8")) as ServerBackupRecord[]
  } catch {
    /* first backup */
  }
  index.push(record)
  await writeFile(backupsPath, JSON.stringify(index, null, 2), "utf8")

  return record
}

/** Gate: server mutations must not run until backup is ready. */
export function assertBackupBeforeExecute(
  backup: ServerBackupRecord | null,
): asserts backup is ServerBackupRecord {
  if (!backup || backup.status !== "ready") {
    throw new Error(
      "Server task blocked: backup and pre-change notes are required before any change.",
    )
  }
}
