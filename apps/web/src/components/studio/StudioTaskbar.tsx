import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  Circle,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Square,
  StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import { cancelAgentRunFn, getSettings, listProjects } from '#/server/aris'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { useStudioRun } from './studio-run-context'

type StudioTaskbarProps = {
  onOpenCommand: () => void
}

export function StudioTaskbar({ onOpenCommand }: StudioTaskbarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { activeRun, clearRun } = useStudioRun()
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const projects = projectsQuery.data?.projects ?? []
  const currentProject = projects.find((project) => pathname.includes(project.id))
  const inProject = Boolean(currentProject)

  async function stopActiveRun() {
    if (!activeRun) return
    try {
      await cancelAgentRunFn({ data: { runKey: activeRun.runKey } })
      clearRun(activeRun.runKey)
      toast.message('Stopped agent run')
    } catch {
      toast.error('Could not stop the run')
    }
  }

  function openMasterChat() {
    toast.message('Master chat is next', {
      description: 'Control-plane chat for projects, credentials, and status.',
    })
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      data-slot="studio-taskbar"
    >
      <div className="pointer-events-auto grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/90">
        <div className="flex min-w-0 items-center gap-1.5 pl-1.5">
          {inProject && currentProject ? (
            <>
              <Link
                to="/studio/$projectId"
                params={{ projectId: currentProject.id }}
                className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted/60"
                title={currentProject.workspacePath}
              >
                <FolderKanban className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{currentProject.name}</span>
              </Link>
              <span className="hidden text-muted-foreground/40 sm:inline">·</span>
              <span className="hidden truncate font-mono text-[10px] text-muted-foreground sm:inline">
                {currentProject.workspacePath.split('/').slice(-2).join('/')}
              </span>
            </>
          ) : (
            <Link
              to="/studio"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <LayoutGrid className="size-3.5" />
              <span className="font-medium">Workspace</span>
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={openMasterChat}
          aria-label="Open Master chat"
          title="Master chat"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full border border-foreground/10',
            'bg-foreground text-background shadow-md',
            'transition-[transform,box-shadow] duration-150 ease-out',
            'hover:scale-105 hover:shadow-lg active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <Bot className="size-5" />
        </button>

        <div className="flex shrink-0 items-center justify-end gap-1 pr-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-muted-foreground"
                aria-label="Quick menu"
              >
                <MoreHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top" sideOffset={8}>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Quick
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void navigate({ to: '/studio' })}>
                <Plus className="size-4" />
                New project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void navigate({ to: '/notes' })}>
                <StickyNote className="size-4" />
                Notes
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigate({ to: '/servers' })}>
                <Server className="size-4" />
                Servers
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigate({ to: '/accounts' })}>
                <KeyRound className="size-4" />
                Accounts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onOpenCommand}>
                <Search className="size-4" />
                Command palette
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘K</span>
              </DropdownMenuItem>
              {inProject && currentProject ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() =>
                      void navigate({
                        to: '/studio/$projectId',
                        params: { projectId: currentProject.id },
                      })
                    }
                  >
                    <MessageSquare className="size-4" />
                    Open project workspace
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeRun ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/8 px-2.5 text-amber-950 dark:text-amber-100"
              onClick={() => void stopActiveRun()}
            >
              <Square className="size-3 fill-current" />
              <span className="hidden max-w-28 truncate sm:inline">{activeRun.label}</span>
              <span className="sm:hidden">Stop</span>
            </Button>
          ) : (
            <Link
              to="/accounts"
              className={cn(
                'hidden h-8 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground md:flex',
              )}
              title="Model and connection"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  settingsQuery.data?.hasApiKey ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )}
              />
              <span className="max-w-28 truncate font-medium">
                {settingsQuery.data?.defaultModel ?? 'No model'}
              </span>
            </Link>
          )}
          {!activeRun && inProject ? (
            <span className="hidden items-center gap-1 px-1 text-[10px] text-muted-foreground lg:flex">
              <Circle className="size-1.5 fill-current opacity-40" />
              Idle
            </span>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
