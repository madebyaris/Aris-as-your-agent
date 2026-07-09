import { createFileRoute } from '@tanstack/react-router'

/** @deprecated Use POST /api/agent — kept for older clients. */
export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text()
        const origin = new URL(request.url).origin
        return fetch(`${origin}/api/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
      },
    },
  },
})
