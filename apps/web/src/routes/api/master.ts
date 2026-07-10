import { createFileRoute } from '@tanstack/react-router'
import { streamMasterResponse } from '@aris/agent'
import {
  appendMasterChatLine,
  getActiveAccount,
  readSettings,
  setMasterAgentId,
} from '@aris/workspace'

export const Route = createFileRoute('/api/master')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          message?: string
          force?: boolean
          activeRunLabel?: string | null
        }

        if (!body.message?.trim()) {
          return Response.json({ error: 'message is required.' }, { status: 400 })
        }

        const settings = await readSettings()
        const account = getActiveAccount(settings)
        const provider = account?.provider ?? settings.defaultProvider ?? 'cursor'
        const apiKey =
          account?.apiKey ??
          (provider === 'openrouter'
            ? process.env.OPENROUTER_API_KEY
            : process.env.CURSOR_API_KEY)

        const runKey = 'master:chat'
        const userText = body.message.trim()

        await appendMasterChatLine({
          role: 'user',
          content: userText,
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
              await streamMasterResponse({
                apiKey,
                provider,
                userMessage: userText,
                model: settings.defaultModel,
                agentId: settings.masterAgentId,
                runKey,
                force: body.force,
                toolsContext: {
                  activeRunLabel: body.activeRunLabel ?? null,
                },
                emit: (event) => {
                  if (event.type === 'assistant_delta') {
                    assistantText += event.text
                  }
                  send(event.type, event)
                },
                onAgentId: async (agentId) => {
                  if (agentId !== settings.masterAgentId) {
                    await setMasterAgentId(agentId)
                  }
                },
              })

              if (assistantText) {
                await appendMasterChatLine({
                  role: 'assistant',
                  content: assistantText,
                  at: new Date().toISOString(),
                })
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Master stream failed.'
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
