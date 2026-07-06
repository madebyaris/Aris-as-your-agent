import { createFileRoute } from '@tanstack/react-router'
import { streamArisResponse } from '@aris/agent'
import { readSettings } from '@aris/workspace'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          sessionId?: string
          message?: string
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

        const { getSessionWorkspacePath } = await import('@aris/workspace')
        const workspacePath = await getSessionWorkspacePath(body.sessionId)

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

            try {
              await streamArisResponse({
                apiKey,
                workspacePath,
                userMessage: body.message!.trim(),
                model: settings.defaultModel,
                emit: (event) => send(event.type, event),
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
