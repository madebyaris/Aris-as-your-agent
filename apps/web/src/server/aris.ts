import { createServerFn } from '@tanstack/react-start'
import {
  ARIS_WORKSPACE_ROOT,
  BOARD_COLUMNS,
  appendChatLine,
  beginServerTaskSafely,
  cancelRun,
  createBoardTask,
  createNote,
  createProjectInFolder,
  createScratchProject,
  createSessionWorkspace,
  createServerTaskPlan,
  createTasksFromPlan,
  defaultModelForProvider,
  deleteNote,
  getActiveAccount,
  getActiveApiKey,
  getProject,
  getServer,
  join,
  labelForModelId,
  listAgentVisibleNotes,
  listModels,
  listServersForProject,
  mkdir,
  openProjectFromPath,
  phasePrompt,
  preferredModelsForProvider,
  readChatHistory,
  readMasterChatHistory,
  readNotesRegistry,
  readProjectsRegistry,
  readServersRegistry,
  readSettings,
  readTasksStore,
  registerServer,
  removeAccount,
  sdkModeForColumn,
  setActiveAccount,
  sortModelsForArisPicker,
  touchProject,
  updateBoardTask,
  updateNote,
  updateServerProjects,
  upsertAccount,
  validateApiKey,
  writeSettings,
} from './aris.server'
import type { ProjectMode } from '@aris/projects'
import type { NoteVisibility } from '@aris/notes'
import type { ServerAuthType } from '@aris/server'
import type { BoardColumn, ProofLabel } from '@aris/tasks'
import type { TaskPriority } from '@aris/core'
import type { ArisProvider } from '@aris/workspace'

export const getHealth = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    ok: true,
    service: 'aris-studio',
    runtime: 'local',
    timestamp: new Date().toISOString(),
  }
})

export const getLandingState = createServerFn({ method: 'GET' }).handler(async () => {
  const settings = await readSettings()
  return {
    hasApiKey: Boolean(getActiveApiKey(settings)),
    lastProjectId: settings.lastProjectId,
  }
})

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const settings = await readSettings()
  const active = getActiveAccount(settings)
  const provider = active?.provider ?? settings.defaultProvider ?? 'cursor'
  return {
    hasApiKey: Boolean(active?.apiKey ?? getActiveApiKey(settings)),
    defaultModel: settings.defaultModel ?? defaultModelForProvider(provider),
    defaultProvider: provider,
    activeAccountId: settings.activeAccountId,
    activeProvider: provider,
    accounts: (settings.accounts ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      provider: a.provider,
      createdAt: a.createdAt,
      keyHint: a.apiKey.slice(0, 8) + '…',
    })),
    recentProjectPaths: settings.recentProjectPaths ?? [],
    lastProjectId: settings.lastProjectId,
    workspaceRoot: ARIS_WORKSPACE_ROOT,
  }
})

export const saveApiKey = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      apiKey: string
      label?: string
      defaultModel?: string
      provider?: ArisProvider
    }) => data,
  )
  .handler(async ({ data }) => {
    const apiKey = data.apiKey.trim()
    if (!apiKey) throw new Error('API key is required.')
    const provider = data.provider ?? 'cursor'
    await validateApiKey(apiKey, provider)
    await upsertAccount({
      label: data.label?.trim() || 'Default',
      apiKey,
      provider,
      makeActive: true,
    })
    if (data.defaultModel) {
      const settings = await readSettings()
      await writeSettings({
        ...settings,
        defaultModel: data.defaultModel,
        defaultProvider: provider,
      })
    }
    return { ok: true }
  })

export const addAccountFn = createServerFn({ method: 'POST' })
  .validator((data: { label: string; apiKey: string; provider?: ArisProvider }) => data)
  .handler(async ({ data }) => {
    const provider = data.provider ?? 'cursor'
    await validateApiKey(data.apiKey.trim(), provider)
    return upsertAccount({
      label: data.label.trim() || 'Account',
      apiKey: data.apiKey.trim(),
      provider,
      makeActive: true,
    })
  })

export const setActiveAccountFn = createServerFn({ method: 'POST' })
  .validator((data: { accountId: string }) => data)
  .handler(async ({ data }) => setActiveAccount(data.accountId))

export const removeAccountFn = createServerFn({ method: 'POST' })
  .validator((data: { accountId: string }) => data)
  .handler(async ({ data }) => removeAccount(data.accountId))

export const setDefaultModelFn = createServerFn({ method: 'POST' })
  .validator((data: { model: string; provider?: ArisProvider }) => data)
  .handler(async ({ data }) => {
    const settings = await readSettings()
    const active = getActiveAccount(settings)
    const provider = data.provider ?? active?.provider ?? settings.defaultProvider ?? 'cursor'
    await writeSettings({
      ...settings,
      defaultModel: data.model,
      defaultProvider: provider,
    })
    return { ok: true }
  })

export const listModelsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const settings = await readSettings()
  const active = getActiveAccount(settings)
  const provider = active?.provider ?? settings.defaultProvider ?? 'cursor'
  const preferred = preferredModelsForProvider(provider)
  const apiKey = active?.apiKey
  if (!apiKey) {
    return {
      provider,
      models: preferred.map((m) => ({
        id: m.id,
        displayName: m.label,
        preferred: true as const,
      })),
      preferredIds: preferred.map((m) => m.id),
      defaultModel: defaultModelForProvider(provider),
    }
  }
  const models = await listModels(apiKey, provider)
  const mapped = models.map((m) => ({
    id: m.id,
    displayName:
      labelForModelId(m.id, provider) ??
      (m as { displayName?: string }).displayName ??
      m.id,
  }))
  return {
    provider,
    models: sortModelsForArisPicker(mapped, provider),
    preferredIds: preferred.map((m) => m.id),
    defaultModel: settings.defaultModel ?? defaultModelForProvider(provider),
  }
})

export const createSession = createServerFn({ method: 'POST' })
  .validator((data: { projectId?: string }) => data ?? {})
  .handler(async ({ data }) => {
    if (data?.projectId) {
      const project = await getProject(data.projectId)
      if (!project) throw new Error('Project not found.')
      const { randomUUID } = await import('node:crypto')
      const sessionId = randomUUID()
      await mkdir(join(project.workspacePath, 'specs', 'active'), { recursive: true })
      await touchProject(project.id, { lastSessionId: sessionId })
      return {
        sessionId,
        path: project.workspacePath,
        projectId: project.id,
        projectName: project.name,
        projectMode: project.mode,
        createdAt: new Date().toISOString(),
      }
    }

    const workspace = await createSessionWorkspace()
    return {
      ...workspace,
      projectId: undefined,
      projectName: undefined,
      projectMode: undefined,
    }
  })

export const listProjects = createServerFn({ method: 'GET' }).handler(async () => {
  return readProjectsRegistry()
})

export const createProjectFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      parentDir?: string
      description?: string
      mode?: ProjectMode
      workspacePath?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    if (data.workspacePath) {
      return openProjectFromPath(data.workspacePath)
    }
    return createProjectInFolder({
      name: data.name,
      parentDir: data.parentDir,
      description: data.description,
    })
  })

export const openProjectFn = createServerFn({ method: 'POST' })
  .validator((data: { path: string }) => data)
  .handler(async ({ data }) => openProjectFromPath(data.path))

export const createScratchFn = createServerFn({ method: 'POST' }).handler(async () => {
  return createScratchProject()
})

export const getProjectFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }) => getProject(data.projectId))

export const setLastProjectFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const settings = await readSettings()
    await writeSettings({ ...settings, lastProjectId: data.projectId })
    return { ok: true }
  })

export const getChatHistoryFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) return { messages: [] }
    return { messages: await readChatHistory(project.workspacePath) }
  })

export const getMasterHistoryFn = createServerFn({ method: 'GET' }).handler(async () => {
  return { messages: await readMasterChatHistory() }
})

export const appendChatFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      projectId: string
      entry: { role: string; content: string; id?: string }
    }) => data,
  )
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) throw new Error('Project not found.')
    await appendChatLine(project.workspacePath, {
      ...data.entry,
      at: new Date().toISOString(),
    })
    return { ok: true }
  })

export const listBoardTasksFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) return { tasks: [], columns: BOARD_COLUMNS }
    const store = await readTasksStore(project.workspacePath)
    return { tasks: store.tasks, columns: BOARD_COLUMNS }
  })

export const createBoardTaskFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      projectId: string
      title: string
      description?: string
      priority?: TaskPriority
      column?: BoardColumn
    }) => data,
  )
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) throw new Error('Project not found.')
    return createBoardTask(project.workspacePath, data)
  })

export const moveBoardTaskFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      projectId: string
      taskId: string
      column: BoardColumn
      proofLabel?: ProofLabel
    }) => data,
  )
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) throw new Error('Project not found.')
    return updateBoardTask(project.workspacePath, data.taskId, {
      column: data.column,
      proofLabel: data.proofLabel,
    })
  })

export const promotePlanFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      projectId: string
      items: Array<{ title: string; description?: string; priority?: TaskPriority }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) throw new Error('Project not found.')
    return createTasksFromPlan(project.workspacePath, data.items)
  })

export const getPhaseRunContextFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId: string; taskId: string; column: BoardColumn }) => data)
  .handler(async ({ data }) => {
    const project = await getProject(data.projectId)
    if (!project) throw new Error('Project not found.')
    const store = await readTasksStore(project.workspacePath)
    const task = store.tasks.find((t) => t.id === data.taskId)
    if (!task) throw new Error('Task not found.')
    return {
      phaseHint: phasePrompt(data.column, task),
      mode: sdkModeForColumn(data.column),
      task,
    }
  })

export const cancelAgentRunFn = createServerFn({ method: 'POST' })
  .validator((data: { runKey: string }) => data)
  .handler(async ({ data }) => ({ ok: cancelRun(data.runKey) }))

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

export const listServers = createServerFn({ method: 'GET' }).handler(async () => {
  return readServersRegistry()
})

export const listServersForProjectFn = createServerFn({ method: 'POST' })
  .validator((data: { projectId?: string }) => data ?? {})
  .handler(async ({ data }) => ({
    servers: await listServersForProject(data?.projectId),
  }))

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
      projectIds?: string[]
    }) => data,
  )
  .handler(async ({ data }) => registerServer(data))

export const updateServerProjectsFn = createServerFn({ method: 'POST' })
  .validator((data: { serverId: string; projectIds: string[] }) => data)
  .handler(async ({ data }) =>
    updateServerProjects(data.serverId, data.projectIds),
  )

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
