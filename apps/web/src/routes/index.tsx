import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { getLandingState } from '#/server/aris'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const data = await getLandingState()
    if (data.hasApiKey) {
      if (data.lastProjectId) {
        throw redirect({
          to: '/studio/$projectId',
          params: { projectId: data.lastProjectId },
        })
      }
      throw redirect({ to: '/studio' })
    }
  },
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <img
          src="/aris-logo.png"
          alt="Aris Studio"
          width={56}
          height={56}
          className="size-14 rounded-xl border bg-background shadow-xs"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Aris Studio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance leading-[1.1]">
          Your senior developer, running locally.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Kanban that runs research → plan → build → review, plus immediate chat. One project =
          one folder.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-9 px-4">
          <Link to="/accounts">Connect API key</Link>
        </Button>
        <Button asChild variant="outline" className="h-9 px-4">
          <Link to="/studio">Open Studio</Link>
        </Button>
      </div>
    </main>
  )
}
