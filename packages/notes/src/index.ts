import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { ARIS_HOME, ensureArisHome } from "@aris/workspace"

export const NOTES_REGISTRY_PATH = join(ARIS_HOME, "notes.json")

/**
 * private — only the user sees this note in the UI; never injected into agent context.
 * agent — Aris can read this note when working on the linked project or server task.
 */
export type NoteVisibility = "private" | "agent"

export type ArisNote = {
  id: string
  projectId?: string
  serverId?: string
  title: string
  body: string
  visibility: NoteVisibility
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export type NotesRegistry = {
  notes: ArisNote[]
}

export async function readNotesRegistry(): Promise<NotesRegistry> {
  try {
    const raw = await readFile(NOTES_REGISTRY_PATH, "utf8")
    return JSON.parse(raw) as NotesRegistry
  } catch {
    return { notes: [] }
  }
}

export async function writeNotesRegistry(registry: NotesRegistry) {
  await ensureArisHome()
  await writeFile(NOTES_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8")
}

export async function createNote(input: {
  title: string
  body: string
  visibility: NoteVisibility
  projectId?: string
  serverId?: string
  tags?: string[]
}): Promise<ArisNote> {
  const registry = await readNotesRegistry()
  const now = new Date().toISOString()
  const note: ArisNote = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    visibility: input.visibility,
    projectId: input.projectId,
    serverId: input.serverId,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
  registry.notes.push(note)
  await writeNotesRegistry(registry)
  return note
}

export async function updateNote(
  noteId: string,
  patch: Partial<Pick<ArisNote, "title" | "body" | "visibility" | "tags">>,
): Promise<ArisNote | null> {
  const registry = await readNotesRegistry()
  const index = registry.notes.findIndex((n) => n.id === noteId)
  if (index === -1) return null
  registry.notes[index] = {
    ...registry.notes[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await writeNotesRegistry(registry)
  return registry.notes[index]
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const registry = await readNotesRegistry()
  const before = registry.notes.length
  registry.notes = registry.notes.filter((n) => n.id !== noteId)
  if (registry.notes.length === before) return false
  await writeNotesRegistry(registry)
  return true
}

/** Notes the agent is allowed to see for a project or server context. */
export async function listAgentVisibleNotes(filter: {
  projectId?: string
  serverId?: string
}): Promise<ArisNote[]> {
  const registry = await readNotesRegistry()
  return registry.notes.filter((note) => {
    if (note.visibility !== "agent") return false
    if (filter.projectId && note.projectId === filter.projectId) return true
    if (filter.serverId && note.serverId === filter.serverId) return true
    return false
  })
}

export function formatNotesForAgentContext(notes: ArisNote[]): string {
  if (notes.length === 0) return ""
  return [
    "## User notes (agent-visible)",
    ...notes.map(
      (n) => `### ${n.title}\n${n.body}`,
    ),
  ].join("\n\n")
}
