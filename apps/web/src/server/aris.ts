import { createServerFn } from '@tanstack/react-start'
import {
  createSessionWorkspace,
  readSettings,
  writeSettings,
} from '@aris/workspace'
import { validateApiKey } from '@aris/agent'
import { createDefaultTaskGraph } from '@aris/tasks'
import {
  createProject,
  readProjectsRegistry,
  type ProjectMode,
} from '@aris/projects'
import {
  createNote,
  listAgentVisibleNotes,
  readNotesRegistry,
  updateNote,
  deleteNote,
  type NoteVisibility,
} from '@aris/notes'
import {
  beginServerTaskSafely,
  createServerTaskPlan,
  getServer,
  readServersRegistry,
  registerServer,
  type ServerAuthType,
} from '@aris/server'

export const getHealth = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    ok: true,
    service: 'aris-as-your-agent',
    runtime: 'local',
    timestamp: new Date().toISOString(),
  }
})

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const settings = await readSettings()
  return {
    hasApiKey: Boolean(settings.cursorApiKey?.trim()),
    defaultModel: settings.defaultModel ?? 'composer-2.5',
  }
})

export const saveApiKey = createServerFn({ method: 'POST' })
  .validator((data: { apiKey: string; defaultModel?: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = data.apiKey.trim()
    if (!apiKey) {
      throw new Error('API key is required.')
    }
    await validateApiKey(apiKey)
    const existing = await readSettings()
    await writeSettings({
      ...existing,
      cursorApiKey: apiKey,
      defaultModel: data.defaultModel ?? existing.defaultModel,
    })
    return { ok: true }
  })

export const createSession = createServerFn({ method: 'POST' }).handler(
  async () => {
    const workspace = await createSessionWorkspace()
    return workspace
  },
)

export const bootstrapSessionTasks = createServerFn({ method: 'POST' })
  .validator((data: { prompt: string }) => data)
  .handler(async ({ data }) => {
    return createDefaultTaskGraph(data.prompt)
  })

// --- Projects (living products) ---

export const listProjects = createServerFn({ method: 'GET' }).handler(async () => {
  return readProjectsRegistry()
})

export const createProjectFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      workspacePath: string
      mode?: ProjectMode
      description?: string
    }) => data,
  )
  .handler(async ({ data }) => createProject(data))

// --- Notes (private vs agent) ---

export const listNotes = createServerFn({ method: 'GET' }).handler(async () => {
  return readNotesRegistry()
})

export const createNoteFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      title: string
      body: string
      visibility: NoteVisibility
      projectId?: string
      serverId?: string
    }) => data,
  )
  .handler(async ({ data }) => createNote(data))

export const updateNoteFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      noteId: string
      title?: string
      body?: string
      visibility?: NoteVisibility
    }) => data,
  )
  .handler(async ({ data }) => {
    const { noteId, ...patch } = data
    return updateNote(noteId, patch)
  })

export const deleteNoteFn = createServerFn({ method: 'POST' })
  .validator((data: { noteId: string }) => data)
  .handler(async ({ data }) => deleteNote(data.noteId))

export const getAgentNotesForContext = createServerFn({ method: 'POST' })
  .validator((data: { projectId?: string; serverId?: string }) => data)
  .handler(async ({ data }) => listAgentVisibleNotes(data))

// --- Servers (SSH) ---

export const listServers = createServerFn({ method: 'GET' }).handler(async () => {
  return readServersRegistry()
})

export const registerServerFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      label: string
      host: string
      port?: number
      username: string
      authType: ServerAuthType
      secret: string
      tags?: string[]
    }) => data,
  )
  .handler(async ({ data }) => registerServer(data))

export const beginServerTaskFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      serverId: string
      description: string
      preChangeNotes: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const server = await getServer(data.serverId)
    if (!server) throw new Error('Server not found.')
    const plan = createServerTaskPlan(data.serverId, data.description)
    return beginServerTaskSafely({
      plan,
      server,
      preChangeNotes: data.preChangeNotes,
    })
  })
