import { describe, expect, it } from 'vitest'
import {
  masterListNotesPayload,
  masterListServersPayload,
  MASTER_SYSTEM_PREFIX,
} from '@aris/agent'
import { createNote, readNotesRegistry, writeNotesRegistry } from '@aris/notes'
import { readServersRegistry, registerServer, writeServersRegistry } from '@aris/server'

describe('master tools privacy', () => {
  it('excludes private notes from master list payload', async () => {
    const before = await readNotesRegistry()
    try {
      await writeNotesRegistry({ notes: [] })
      await createNote({
        title: 'Secret',
        body: 'never show',
        visibility: 'private',
      })
      await createNote({
        title: 'Visible',
        body: 'ok for agent',
        visibility: 'agent',
      })
      const listed = await masterListNotesPayload()
      expect(listed.some((n) => n.title === 'Secret')).toBe(false)
      expect(listed.some((n) => n.title === 'Visible')).toBe(true)
      expect(listed.every((n) => !('body' in n))).toBe(true)
    } finally {
      await writeNotesRegistry(before)
    }
  })

  it('lists servers without secret fields', async () => {
    const before = await readServersRegistry()
    try {
      await writeServersRegistry({ servers: [] })
      await registerServer({
        label: 'Demo box',
        host: '10.0.0.1',
        username: 'deploy',
        authType: 'password',
        secret: 'super-secret-password',
        projectIds: [],
      })
      const listed = await masterListServersPayload()
      expect(listed).toHaveLength(1)
      expect(listed[0]?.host).toBe('10.0.0.1')
      expect(JSON.stringify(listed)).not.toContain('super-secret-password')
      expect(listed[0]).not.toHaveProperty('secretRef')
    } finally {
      await writeServersRegistry(before)
    }
  })

  it('master prompt forbids secret exfiltration', () => {
    expect(MASTER_SYSTEM_PREFIX).toMatch(/Never request, print, or invent SSH/i)
    expect(MASTER_SYSTEM_PREFIX).toMatch(/Private notes are invisible/i)
  })
})
