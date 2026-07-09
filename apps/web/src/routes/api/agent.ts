import { createFileRoute } from '@tanstack/react-router'
import { streamArisResponse } from '@aris/agent'
import {
  formatNotesForAgentContext,
  listAgentVisibleNotes,
} from '@aris/notes'
import { getProject, touchProject, appendChatLine } from '@aris/projects'
import {
  phasePrompt,
  readTasksStore,
  sdkModeForColumn,
  updateBoardTask,
  type BoardColumn,
  type ProofLabel,
} from '@aris/tasks'
import { getActiveApiKey, readSettings } from '@aris/workspace'

export const Route = createFileRoute('/api/agent')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          projectId?: string
          message?: string
          taskId?: string
          column?: BoardColumn
          force?: boolean
        }

        if (!body.projectId || !body.message?.trim()) {
          return Response.json(
            { error: 'projectId and message are required.' },
            { status: 400 },
          )
        }

        const settings = await readSettings()
        const apiKey = getActiveApiKey(settings)
        const project = await getProject(body.projectId)
        if (!project) {
          return Response.json({ error: 'Project not found.' }, { status: 404 })
        }

        let phaseHint: string | undefined
        let mode: 'plan' | 'agent' | undefined
        if (body.taskId && body.column) {
          const store = await readTasksStore(project.workspacePath)
          const task = store.tasks.find((t) => t.id === body.taskId)
          if (task) {
            phaseHint = phasePrompt(body.column, task) ?? undefined
            mode = sdkModeForColumn(body.column)
          }
        }

        const notes = await listAgentVisibleNotes({ projectId: project.id })
        const agentNotes = formatNotesForAgentContext(notes)
        const runKey = body.taskId
          ? `${project.id}:${body.taskId}`
          : `${project.id}:chat`

        await appendChatLine(project.workspacePath, {
          role: 'user',
          content: body.message.trim(),
          taskId: body.taskId,
          at: new Date().toISOString(),
        })

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            const send = (event: string, data: unknown) => {
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              )
            }

            let assistantText = ''

            try {
              const result = await streamArisResponse({
                apiKey,
                workspacePath: project.workspacePath,
                userMessage: body.message!.trim(),
                model: settings.defaultModel,
                projectMode: project.mode,
                agentNotes,
                agentId: project.cursorAgentId,
                phaseHint,
                mode,
                runKey,
                force: body.force,
                emit: (event) => {
                  if (event.type === 'assistant_delta') {
                    assistantText += event.text
                  }
                  send(event.type, event)
                },
                onAgentId: async (agentId) => {
                  if (agentId !== project.cursorAgentId) {
                    await touchProject(project.id, { cursorAgentId: agentId })
                  }
                },
              })

              if (assistantText) {
                await appendChatLine(project.workspacePath, {
                  role: 'assistant',
                  content: assistantText,
                  taskId: body.taskId,
                  at: new Date().toISOString(),
                })
              }

              if (body.taskId && body.column === 'review' && result.proofLabel) {
                await updateBoardTask(project.workspacePath, body.taskId, {
                  proofLabel: result.proofLabel as ProofLabel,
                })
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Agent stream failed.'
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
