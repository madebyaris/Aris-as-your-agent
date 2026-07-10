import type { SDKCustomTool, SDKJsonValue } from '@cursor/sdk'
import {
  ARIS_MASTER_DIR,
  ARIS_WORKSPACE_ROOT,
  getActiveAccount,
  readSettings,
  writeSettings,
} from '@aris/workspace'
import {
  createProjectInFolder,
  createScratchProject,
  getProject,
  readChatHistory,
  readProjectsRegistry,
  touchProject,
} from '@aris/projects'
import { listAgentVisibleNotes, readNotesRegistry } from '@aris/notes'
import { readServersRegistry } from '@aris/server'
import { BOARD_COLUMNS, readTasksStore } from '@aris/tasks'

export type MasterToolsContext = {
  /** Optional label of an in-flight Studio run (from UI). */
  activeRunLabel?: string | null
}

function asString(value: SDKJsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function jsonResult(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Pure helpers — unit-tested without Cursor SDK. */
export async function masterStatusPayload(ctx: MasterToolsContext = {}) {
  const settings = await readSettings()
  const account = getActiveAccount(settings)
  const registry = await readProjectsRegistry()
  return {
    provider: account?.provider ?? settings.defaultProvider ?? 'cursor',
    model: settings.defaultModel ?? null,
    hasApiKey: Boolean(account?.apiKey),
    projectCount: registry.projects.length,
    workspaceRoot: ARIS_WORKSPACE_ROOT,
    masterCwd: ARIS_MASTER_DIR,
    lastProjectId: settings.lastProjectId ?? null,
    activeRun: ctx.activeRunLabel ?? null,
  }
}

export async function masterListProjectsPayload() {
  const registry = await readProjectsRegistry()
  return registry.projects.map((p) => ({
    id: p.id,
    name: p.name,
    workspacePath: p.workspacePath,
    mode: p.mode,
    isScratch: Boolean(p.isScratch),
    updatedAt: p.updatedAt,
  }))
}

export async function masterProjectSummaryPayload(projectId: string) {
  const project = await getProject(projectId)
  if (!project) {
    return { error: `Project not found: ${projectId}` }
  }
  const store = await readTasksStore(project.workspacePath)
  const columns = Object.fromEntries(
    BOARD_COLUMNS.map((column) => [
      column,
      store.tasks.filter((t) => t.column === column).length,
    ]),
  )
  const chat = await readChatHistory(project.workspacePath)
  const recentChat = chat.slice(-6).map((line) => ({
    role: line.role,
    content: String(line.content ?? '').slice(0, 240),
  }))
  return {
    id: project.id,
    name: project.name,
    workspacePath: project.workspacePath,
    mode: project.mode,
    columns,
    taskCount: store.tasks.length,
    recentChat,
  }
}

export async function masterListNotesPayload() {
  const registry = await readNotesRegistry()
  // Master may list agent-visible notes globally; never private.
  const notes = registry.notes.filter((n) => n.visibility === 'agent')
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    projectId: n.projectId ?? null,
    serverId: n.serverId ?? null,
    updatedAt: n.updatedAt,
    // Intentionally omit body in list — use summary tools later if needed
  }))
}

export async function masterListAgentNotesForProject(projectId?: string) {
  const notes = await listAgentVisibleNotes(
    projectId ? { projectId } : {},
  )
  // Global filter when no projectId: listAgentVisibleNotes only returns
  // global notes when filter has no match — so for Master overview use registry filter.
  if (!projectId) {
    return masterListNotesPayload()
  }
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    projectId: n.projectId ?? null,
    bodyPreview: n.body.slice(0, 280),
    updatedAt: n.updatedAt,
  }))
}

export async function masterListServersPayload() {
  const registry = await readServersRegistry()
  return registry.servers.map((s) => ({
    id: s.id,
    label: s.label,
    host: s.host,
    port: s.port,
    username: s.username,
    authType: s.authType,
    projectIds: s.projectIds ?? [],
    tags: s.tags ?? [],
    // Never include secretRef contents or credentials
  }))
}

export async function masterCreateScratchPayload() {
  const project = await createScratchProject()
  return {
    id: project.id,
    name: project.name,
    workspacePath: project.workspacePath,
    mode: project.mode,
    navigate: `NAVIGATE_PROJECT:${project.id}`,
  }
}

export async function masterCreateProjectPayload(input: {
  name: string
  parentDir?: string
}) {
  const project = await createProjectInFolder({
    name: input.name,
    parentDir: input.parentDir,
  })
  return {
    id: project.id,
    name: project.name,
    workspacePath: project.workspacePath,
    mode: project.mode,
    navigate: `NAVIGATE_PROJECT:${project.id}`,
  }
}

export async function masterOpenProjectPayload(projectId: string) {
  const project = await getProject(projectId)
  if (!project) {
    return { error: `Project not found: ${projectId}` }
  }
  const settings = await readSettings()
  await writeSettings({ ...settings, lastProjectId: project.id })
  await touchProject(project.id, {})
  return {
    id: project.id,
    name: project.name,
    workspacePath: project.workspacePath,
    navigate: `NAVIGATE_PROJECT:${project.id}`,
  }
}

/**
 * Cursor SDK customTools for the Master control-plane agent (ADR 008).
 * Local agents only — never pass to cloud.
 */
export function createMasterCustomTools(
  ctx: MasterToolsContext = {},
): Record<string, SDKCustomTool> {
  return {
    aris_status: {
      description:
        'Return Studio connection status: provider, model, project count, workspace root, and any active run.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async execute() {
        return jsonResult(await masterStatusPayload(ctx))
      },
    },
    aris_list_projects: {
      description: 'List registered Aris projects (id, name, path, mode, updatedAt).',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async execute() {
        return jsonResult(await masterListProjectsPayload())
      },
    },
    aris_project_summary: {
      description:
        'Summarize a project board (column counts) and a short recent chat tail. Requires projectId.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project UUID' },
        },
        required: ['projectId'],
        additionalProperties: false,
      },
      async execute(args) {
        const projectId = asString(args.projectId)
        if (!projectId) return jsonResult({ error: 'projectId is required' })
        return jsonResult(await masterProjectSummaryPayload(projectId))
      },
    },
    aris_list_notes: {
      description:
        'List agent-visible notes only (never private). Optional projectId scopes the list.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Optional project UUID' },
        },
        additionalProperties: false,
      },
      async execute(args) {
        const projectId = asString(args.projectId)
        return jsonResult(await masterListAgentNotesForProject(projectId))
      },
    },
    aris_list_servers: {
      description:
        'List registered SSH server metadata (label, host, user, project access). Never returns secrets.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async execute() {
        return jsonResult(await masterListServersPayload())
      },
    },
    aris_create_scratch: {
      description: 'Create a scratch project under ~/aris-workspace and return its id/path.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async execute() {
        return jsonResult(await masterCreateScratchPayload())
      },
    },
    aris_create_project: {
      description: 'Create a new named project folder and register it. Optional parentDir.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          parentDir: {
            type: 'string',
            description: 'Optional absolute parent directory',
          },
        },
        required: ['name'],
        additionalProperties: false,
      },
      async execute(args) {
        const name = asString(args.name)?.trim()
        if (!name) return jsonResult({ error: 'name is required' })
        const parentDir = asString(args.parentDir)
        return jsonResult(await masterCreateProjectPayload({ name, parentDir }))
      },
    },
    aris_open_project: {
      description:
        'Validate a project id, set it as last project, and return a NAVIGATE_PROJECT hint for the UI.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project UUID' },
        },
        required: ['projectId'],
        additionalProperties: false,
      },
      async execute(args) {
        const projectId = asString(args.projectId)
        if (!projectId) return jsonResult({ error: 'projectId is required' })
        return jsonResult(await masterOpenProjectPayload(projectId))
      },
    },
  }
}

export const MASTER_SYSTEM_PREFIX = [
  'You are Aris Master — the Studio control-plane agent.',
  'You help the user manage projects, accounts context, notes visibility, and server registry status.',
  'You do NOT edit product application source code. Project execution belongs to Child agents (Board / Chat inside a project).',
  'Prefer calling aris_* tools for facts (lists, status, summaries) instead of guessing paths or IDs.',
  'When the user should open a project workspace, call aris_open_project and include the navigate hint in your reply.',
  'Never request, print, or invent SSH passwords, private keys, or API secrets.',
  'Private notes are invisible to you — do not claim to have read them.',
].join('\n')

export function buildMasterPrompt(
  userMessage: string,
  extras?: { activeRunLabel?: string | null },
) {
  return [
    MASTER_SYSTEM_PREFIX,
    '',
    `Master cwd: ${ARIS_MASTER_DIR}`,
    `Default project parent: ${ARIS_WORKSPACE_ROOT}`,
    extras?.activeRunLabel ? `Active Studio run: ${extras.activeRunLabel}` : 'Active Studio run: none',
    '',
    'User request:',
    userMessage,
  ].join('\n')
}
