import { createServerFn } from '@tanstack/react-start'
import {
  createSessionWorkspace,
  readSettings,
  writeSettings,
} from '@aris/workspace'
import { validateApiKey } from '@aris/agent'
import { createDefaultTaskGraph } from '@aris/tasks'

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
