import {
  access,
  appendFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises"
import { join, basename, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import {
  ARIS_HOME,
  ARIS_WORKSPACE_ROOT,
  ensureArisHome,
  pushRecentPath,
} from "@aris/workspace"

export const PROJECTS_REGISTRY_PATH = join(ARIS_HOME, "projects.json")
export const SIDECAR_DIRNAME = ".aris-workspace"
export const SIDECAR_SCHEMA = "aris-workspace/v1" as const

/** Greenfield = new build. Continue = enhance an existing codebase over time. */
export type ProjectMode = "greenfield" | "continue"

export type ArisProject = {
  id: string
  name: string
  description?: string
  /** Local path to the project repo or workspace folder. */
  workspacePath: string
  mode: ProjectMode
  createdAt: string
  updatedAt: string
  lastSessionId?: string
  /** Cursor SDK agent id for Agent.resume continuity. */
  cursorAgentId?: string
  /** Feature tags for ongoing enhancement (e.g. "auth", "billing"). */
  features?: string[]
  isScratch?: boolean
}

export type ProjectsRegistry = {
  projects: ArisProject[]
}

export type SidecarMeta = {
  schema: typeof SIDECAR_SCHEMA
  projectId: string
  cursorAgentId?: string
  createdAt: string
  updatedAt: string
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "project"
  )
}

export function getSidecarPath(workspacePath: string) {
  return join(workspacePath, SIDECAR_DIRNAME)
}

export function getSidecarMetaPath(workspacePath: string) {
  return join(getSidecarPath(workspacePath), "aris.json")
}

export async function readProjectsRegistry(): Promise<ProjectsRegistry> {
  try {
    const raw = await readFile(PROJECTS_REGISTRY_PATH, "utf8")
    return JSON.parse(raw) as ProjectsRegistry
  } catch {
    return { projects: [] }
  }
}

export async function writeProjectsRegistry(registry: ProjectsRegistry) {
  await ensureArisHome()
  await writeFile(PROJECTS_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8")
}

async function ensureGitignoreSidecar(workspacePath: string) {
  const gitignorePath = join(workspacePath, ".gitignore")
  const line = SIDECAR_DIRNAME
  try {
    const existing = await readFile(gitignorePath, "utf8")
    if (!existing.split("\n").some((l) => l.trim() === line)) {
      await appendFile(gitignorePath, `\n${line}\n`, "utf8")
    }
  } catch {
    await writeFile(gitignorePath, `${line}\n`, "utf8")
  }
}

export async function writeSidecarMeta(
  workspacePath: string,
  meta: SidecarMeta,
): Promise<void> {
  const dir = getSidecarPath(workspacePath)
  await mkdir(dir, { recursive: true })
  await writeFile(getSidecarMetaPath(workspacePath), JSON.stringify(meta, null, 2), "utf8")
  await ensureGitignoreSidecar(workspacePath)
}

export async function readSidecarMeta(
  workspacePath: string,
): Promise<SidecarMeta | null> {
  try {
    const raw = await readFile(getSidecarMetaPath(workspacePath), "utf8")
    const meta = JSON.parse(raw) as SidecarMeta
    if (meta.schema !== SIDECAR_SCHEMA) return null
    return meta
  } catch {
    return null
  }
}

async function pathExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function createProject(input: {
  name: string
  workspacePath: string
  mode?: ProjectMode
  description?: string
  isScratch?: boolean
}): Promise<ArisProject> {
  const registry = await readProjectsRegistry()
  const now = new Date().toISOString()
  const project: ArisProject = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    workspacePath: resolve(input.workspacePath),
    mode: input.mode ?? "continue",
    createdAt: now,
    updatedAt: now,
    features: [],
    isScratch: input.isScratch,
  }
  await mkdir(project.workspacePath, { recursive: true })
  await mkdir(join(project.workspacePath, "specs", "active"), { recursive: true })
  await writeSidecarMeta(project.workspacePath, {
    schema: SIDECAR_SCHEMA,
    projectId: project.id,
    createdAt: now,
    updatedAt: now,
  })
  await writeFile(
    join(getSidecarPath(project.workspacePath), "tasks.json"),
    JSON.stringify({ version: 1, tasks: [] }, null, 2),
    "utf8",
  )
  await writeFile(join(getSidecarPath(project.workspacePath), "chat.jsonl"), "", "utf8")

  registry.projects.push(project)
  await writeProjectsRegistry(registry)
  await pushRecentPath(project.workspacePath)
  return project
}

/** Create a new folder under parent (default ~/aris-workspace) and register it. */
export async function createProjectInFolder(input: {
  name: string
  parentDir?: string
  description?: string
}): Promise<ArisProject> {
  await ensureArisHome()
  const parent = resolve(input.parentDir?.trim() || ARIS_WORKSPACE_ROOT)
  await mkdir(parent, { recursive: true })
  let slug = slugify(input.name)
  let workspacePath = join(parent, slug)
  let n = 2
  while (await pathExists(workspacePath)) {
    workspacePath = join(parent, `${slug}-${n}`)
    n += 1
  }
  return createProject({
    name: input.name,
    workspacePath,
    mode: "greenfield",
    description: input.description,
  })
}

/**
 * Open an existing folder as a continue project.
 * Refuses unrecognized .aris-workspace sidecars.
 */
export async function openProjectFromPath(path: string): Promise<ArisProject> {
  const workspacePath = resolve(path.trim())
  if (!(await pathExists(workspacePath))) {
    throw new Error(`Path does not exist: ${workspacePath}`)
  }

  const existingMeta = await readSidecarMeta(workspacePath)
  const registry = await readProjectsRegistry()
  const already = registry.projects.find((p) => p.workspacePath === workspacePath)
  if (already) {
    await pushRecentPath(workspacePath)
    return already
  }

  if ((await pathExists(getSidecarPath(workspacePath))) && !existingMeta) {
    throw new Error(
      `Found ${SIDECAR_DIRNAME} but it is not a recognized Aris sidecar. Refusing to overwrite.`,
    )
  }

  if (existingMeta) {
    const byId = registry.projects.find((p) => p.id === existingMeta.projectId)
    if (byId) {
      await pushRecentPath(workspacePath)
      return byId
    }
  }

  const name = basename(workspacePath)
  return createProject({
    name,
    workspacePath,
    mode: "continue",
  })
}

export async function createScratchProject(): Promise<ArisProject> {
  await ensureArisHome()
  const id = randomUUID().slice(0, 8)
  return createProject({
    name: `Scratch ${id}`,
    workspacePath: join(ARIS_WORKSPACE_ROOT, `scratch-${id}`),
    mode: "greenfield",
    isScratch: true,
  })
}

export async function getProject(projectId: string): Promise<ArisProject | null> {
  const registry = await readProjectsRegistry()
  return registry.projects.find((p) => p.id === projectId) ?? null
}

export async function touchProject(
  projectId: string,
  patch: Partial<
    Pick<
      ArisProject,
      "lastSessionId" | "features" | "description" | "name" | "cursorAgentId" | "isScratch"
    >
  >,
): Promise<ArisProject | null> {
  const registry = await readProjectsRegistry()
  const index = registry.projects.findIndex((p) => p.id === projectId)
  if (index === -1) return null
  registry.projects[index] = {
    ...registry.projects[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await writeProjectsRegistry(registry)

  const project = registry.projects[index]
  const meta = (await readSidecarMeta(project.workspacePath)) ?? {
    schema: SIDECAR_SCHEMA,
    projectId: project.id,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
  await writeSidecarMeta(project.workspacePath, {
    ...meta,
    cursorAgentId: project.cursorAgentId ?? meta.cursorAgentId,
    updatedAt: project.updatedAt,
  })
  return project
}

export function isContinuationProject(project: ArisProject) {
  return project.mode === "continue"
}

export type ChatHistoryEntry = {
  role: string
  content: string
  id?: string
  taskId?: string
  at?: string
}

export async function appendChatLine(
  workspacePath: string,
  entry: ChatHistoryEntry,
) {
  const file = join(getSidecarPath(workspacePath), "chat.jsonl")
  await mkdir(getSidecarPath(workspacePath), { recursive: true })
  await appendFile(file, `${JSON.stringify(entry)}\n`, "utf8")
}

export async function readChatHistory(workspacePath: string): Promise<ChatHistoryEntry[]> {
  try {
    const raw = await readFile(join(getSidecarPath(workspacePath), "chat.jsonl"), "utf8")
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ChatHistoryEntry)
  } catch {
    return []
  }
}
