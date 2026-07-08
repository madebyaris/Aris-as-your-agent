import { createFileRoute } from '@tanstack/react-router'
import { streamArisResponse } from '@aris/agent'
import {
  formatNotesForAgentContext,
  listAgentVisibleNotes,
} from '@aris/notes'
import { getProject, touchProject } from '@aris/projects'
import {
  appendTranscript,
  formatTranscriptForPrompt,
  getSession,
  getTranscript,
  loadProjectContinuityContext,
  recordSessionHandoff,
  readSettings,
  touchWorkSession,
} from '@aris/workspace'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          sessionId?: string
          message?: string
          projectId?: string
        }

        if (!body.sessionId || !body.message?.trim()) {
          return Response.json(
            { error: 'sessionId and message are required.' },
            { status: 400 },
          )
        }

        const settings = await readSettings()
        const apiKey =
          settings.cursorApiKey?.trim() ?? process.env.CURSOR_API_KEY?.trim()

        const existingSession = await getSession(body.sessionId)
        const { getSessionWorkspacePath } = await import('@aris/workspace')
        let workspacePath: string =
          existingSession?.workspacePath ??
          (await getSessionWorkspacePath(body.sessionId))
        let projectMode: 'greenfield' | 'continue' = existingSession?.projectId
          ? 'continue'
          : 'greenfield'
        let agentNotes: string | undefined

        if (body.projectId) {
          const project = await getProject(body.projectId)
          if (project) {
            workspacePath = project.workspacePath
            projectMode = project.mode
            await touchProject(project.id, { lastSessionId: body.sessionId })
            const notes = await listAgentVisibleNotes({ projectId: project.id })
            agentNotes = formatNotesForAgentContext(notes)
          }
        }

        const continuity = await loadProjectContinuityContext(workspacePath)
        const priorTranscript = await getTranscript(body.sessionId)
        const transcriptBlock = formatTranscriptForPrompt(priorTranscript)

        await touchWorkSession(body.sessionId, {
          status: 'active',
          workspacePath,
        })

        const userMessage = body.message.trim()
        const sessionId = body.sessionId

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            const send = (event: string, data: unknown) => {
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                ),
              )
            }

            let assistantText = ''

            try {
              await streamArisResponse({
                apiKey,
                workspacePath,
                userMessage,
                model: settings.defaultModel,
                projectMode,
                agentNotes,
                continuity: continuity.promptBlock,
                transcript: transcriptBlock,
                emit: (event) => {
                  if (event.type === 'assistant_delta') {
                    assistantText += event.text
                  }
                  send(event.type, event)
                },
              })

              await appendTranscript(sessionId, [
                { role: 'user', content: userMessage },
                ...(assistantText
                  ? [{ role: 'assistant' as const, content: assistantText }]
                  : []),
              ])

              await recordSessionHandoff({
                workspacePath,
                sessionId,
                projectMode,
                goalFromUser: userMessage,
                assistantSummary: assistantText
                  ? assistantText.slice(0, 280)
                  : undefined,
              })
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Chat stream failed.'
              send('error', { message })
              send('done', { ok: false })
            } finally {
              controller.close()
            }
          },
        })

        return new Response(stream, {
          headers: {
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'Content-Type': 'text/event-stream; charset=utf-8',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
