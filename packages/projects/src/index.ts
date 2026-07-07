import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { ARIS_HOME, ensureArisHome } from "@aris/workspace"

export const PROJECTS_REGISTRY_PATH = join(ARIS_HOME, "projects.json")

/** Greenfield = new build. Continue = enhance an existing codebase over time. */
export type ProjectMode = "greenfield" | "continue"

export type ArisProject = {
  id: string
  name: string
  description?: string
  /** Local path to the project repo or session workspace. */
  workspacePath: string
  mode: ProjectMode
  createdAt: string
  updatedAt: string
  lastSessionId?: string
  /** Feature tags for ongoing enhancement (e.g. "auth", "billing"). */
  features?: string[]
}

export type ProjectsRegistry = {
  projects: ArisProject[]
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

export async function createProject(input: {
  name: string
  workspacePath: string
  mode?: ProjectMode
  description?: string
}): Promise<ArisProject> {
  const registry = await readProjectsRegistry()
  const now = new Date().toISOString()
  const project: ArisProject = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    workspacePath: input.workspacePath,
    mode: input.mode ?? "continue",
    createdAt: now,
    updatedAt: now,
    features: [],
  }
  registry.projects.push(project)
  await writeProjectsRegistry(registry)
  await mkdir(join(input.workspacePath, "specs", "active"), { recursive: true })
  return project
}

export async function getProject(projectId: string): Promise<ArisProject | null> {
  const registry = await readProjectsRegistry()
  return registry.projects.find((p) => p.id === projectId) ?? null
}

export async function touchProject(
  projectId: string,
  patch: Partial<Pick<ArisProject, "lastSessionId" | "features" | "description" | "name">>,
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
  return registry.projects[index]
}

/**
 * Philosophy: software never finishes — every session continues a living project.
 */
export function isContinuationProject(project: ArisProject) {
  return project.mode === "continue"
}
