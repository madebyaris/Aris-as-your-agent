import { describe, expect, it } from 'vitest'
import { formatNotesForAgentContext, type ArisNote } from '@aris/notes'
import { sortByPriority, BOARD_COLUMNS } from '@aris/tasks'
import { migrateSettingsForTest } from './settings-migrate'

// Inline the visibility filter logic under test via formatNotesForAgentContext
function listAgentVisible(
  notes: ArisNote[],
  filter: { projectId?: string; serverId?: string },
) {
  return notes.filter((note) => {
    if (note.visibility !== 'agent') return false
    if (!note.projectId && !note.serverId) return true
    if (filter.projectId && note.projectId === filter.projectId) return true
    if (filter.serverId && note.serverId === filter.serverId) return true
    return false
  })
}

describe('note visibility', () => {
  const notes: ArisNote[] = [
    {
      id: '1',
      title: 'Secret',
      body: 'never inject',
      visibility: 'private',
      projectId: 'p1',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      title: 'Brand',
      body: 'warm tones',
      visibility: 'agent',
      projectId: 'p1',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      title: 'Global tip',
      body: 'prefer pnpm',
      visibility: 'agent',
      createdAt: '',
      updatedAt: '',
    },
  ]

  it('excludes private notes from agent context', () => {
    const visible = listAgentVisible(notes, { projectId: 'p1' })
    expect(visible.map((n) => n.id)).toEqual(['2', '3'])
    const formatted = formatNotesForAgentContext(visible)
    expect(formatted).toContain('warm tones')
    expect(formatted).not.toContain('never inject')
  })
})

describe('board columns', () => {
  it('has pipeline columns in order', () => {
    expect(BOARD_COLUMNS).toEqual([
      'backlog',
      'research',
      'plan',
      'build',
      'review',
      'done',
    ])
  })

  it('sorts by priority', () => {
    const sorted = sortByPriority([
      { priority: 'P2' as const },
      { priority: 'P0' as const },
      { priority: 'P1' as const },
    ])
    expect(sorted.map((t) => t.priority)).toEqual(['P0', 'P1', 'P2'])
  })
})

describe('settings migration', () => {
  it('migrates legacy cursorApiKey into accounts', () => {
    const next = migrateSettingsForTest({ cursorApiKey: 'cursor_test_key' })
    expect(next.accounts?.length).toBe(1)
    expect(next.accounts?.[0]?.apiKey).toBe('cursor_test_key')
    expect(next.activeAccountId).toBeTruthy()
  })
})

describe('server project visibility', () => {
  it('treats empty projectIds as global', async () => {
    const { serverVisibleToProject } = await import('@aris/server')
    expect(
      serverVisibleToProject(
        {
          id: 's1',
          label: 'x',
          host: '1.1.1.1',
          port: 22,
          username: 'root',
          authType: 'password',
          secretRef: 'x',
          createdAt: '',
          updatedAt: '',
          projectIds: [],
        },
        'p1',
      ),
    ).toBe(true)
  })

  it('scopes to selected projects', async () => {
    const { serverVisibleToProject } = await import('@aris/server')
    const server = {
      id: 's1',
      label: 'x',
      host: '1.1.1.1',
      port: 22,
      username: 'root',
      authType: 'password' as const,
      secretRef: 'x',
      createdAt: '',
      updatedAt: '',
      projectIds: ['p1'],
    }
    expect(serverVisibleToProject(server, 'p1')).toBe(true)
    expect(serverVisibleToProject(server, 'p2')).toBe(false)
  })
})
