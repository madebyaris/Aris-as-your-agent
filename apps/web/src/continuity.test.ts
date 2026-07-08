import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  formatTranscriptForPrompt,
  loadProjectContinuityContext,
  recordSessionHandoff,
  writeProjectState,
  emptyProjectState,
} from '@aris/workspace'
import { formatNotesForAgentContext, type ArisNote } from '@aris/notes'
import { buildArisPrompt } from '@aris/agent'

describe('continuity fundamentals', () => {
  it('writes STATE.md handoff and loads it into prompt context', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aris-cont-'))
    try {
      await writeProjectState(dir, {
        ...emptyProjectState('continue'),
        currentGoal: 'Add hero section',
        openTasks: [
          {
            id: 't1',
            title: 'Hero layout',
            priority: 'P0',
            status: 'pending',
          },
        ],
      })

      await recordSessionHandoff({
        workspacePath: dir,
        sessionId: 'sess-1',
        goalFromUser: 'Polish the hero CTAs',
        assistantSummary: 'Outlined CTA hierarchy',
      })

      const md = await readFile(join(dir, '.aris', 'STATE.md'), 'utf8')
      expect(md).toContain('Polish the hero CTAs')
      expect(md).toContain('Outlined CTA hierarchy')

      const continuity = await loadProjectContinuityContext(dir)
      expect(continuity.promptBlock).toContain('Project continuity')
      expect(continuity.promptBlock).toContain('Hero layout')

      const prompt = buildArisPrompt('Continue the CTA work', dir, {
        projectMode: 'continue',
        continuity: continuity.promptBlock,
        transcript: formatTranscriptForPrompt([
          {
            id: '1',
            role: 'user',
            content: 'Add hero section',
            at: new Date().toISOString(),
          },
        ]),
      })

      expect(prompt).toContain('Continue the CTA work')
      expect(prompt).toContain('Hero layout')
      expect(prompt).toContain('Recent conversation')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('never formats private notes into agent context', () => {
    const notes: ArisNote[] = [
      {
        id: '1',
        title: 'Secret preference',
        body: 'salary number',
        visibility: 'private',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        title: 'Brand',
        body: 'Warm earth tones',
        visibility: 'agent',
        projectId: 'p1',
        createdAt: '',
        updatedAt: '',
      },
    ]

    const agentOnly = notes.filter((n) => n.visibility === 'agent')
    const block = formatNotesForAgentContext(agentOnly)
    expect(block).toContain('Warm earth tones')
    expect(block).not.toContain('salary number')
  })
})
