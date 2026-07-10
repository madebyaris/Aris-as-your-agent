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
import { useSidebar } from '@/components/ui/sidebar'
import { useStudioRun } from './studio-run-context'

type StudioTaskbarProps = {
  onOpenCommand: () => void
}

export function StudioTaskbar({ onOpenCommand }: StudioTaskbarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { state: sidebarState, isMobile } = useSidebar()
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

  const insetLeft =
    isMobile || sidebarState === 'collapsed'
      ? undefined
      : 'calc(var(--sidebar-width) + 0.75rem)'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-6"
      data-slot="studio-taskbar"
      style={insetLeft ? { paddingLeft: insetLeft } : undefined}
    >
      <div className="pointer-events-none relative w-full max-w-3xl">
        {/* Soft fade only under the pill — never across the sidebar */}
        <div
          aria-hidden
          className="absolute inset-x-4 -bottom-2 h-20 rounded-[2rem] bg-gradient-to-t from-background/90 via-background/40 to-transparent"
        />
        <div
          className={cn(
            'aris-glass pointer-events-auto relative grid w-full',
            'grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[1.45rem] p-1.5',
            'ring-1 ring-inset ring-[color:var(--glass-border)]',
          )}
        >
        {/* Soft specular rim — macOS dock feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
        />

        <div className="flex min-w-0 items-center gap-1.5 pl-1.5">
          {inProject && currentProject ? (
            <>
              <Link
                to="/studio/$projectId"
                params={{ projectId: currentProject.id }}
                className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors hover:bg-foreground/6"
                title={currentProject.workspacePath}
              >
                <FolderKanban className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium tracking-tight">{currentProject.name}</span>
              </Link>
              <span className="hidden text-muted-foreground/35 sm:inline">·</span>
              <span className="hidden truncate font-mono text-[10px] text-muted-foreground/80 sm:inline">
                {currentProject.workspacePath.split('/').slice(-2).join('/')}
              </span>
            </>
          ) : (
            <Link
              to="/studio"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <LayoutGrid className="size-3.5" />
              <span className="font-medium tracking-tight">Workspace</span>
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={openMasterChat}
          aria-label="Open Master chat"
          title="Master chat"
          className={cn(
            'relative z-10 -my-1 flex size-12 shrink-0 items-center justify-center rounded-full',
            'bg-foreground text-background',
            'shadow-[0_1px_2px_oklch(0_0_0/0.12),0_8px_20px_oklch(0.2_0.02_70/0.28),inset_0_1px_0_oklch(1_0_0/0.22)]',
            'ring-2 ring-[color:var(--glass-border)]',
            'transition-[transform,box-shadow] duration-200 ease-out',
            'hover:scale-[1.06] hover:shadow-[0_2px_4px_oklch(0_0_0/0.14),0_12px_28px_oklch(0.2_0.02_70/0.34),inset_0_1px_0_oklch(1_0_0/0.28)]',
            'active:scale-[0.96]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          )}
        >
          <Bot className="size-5" />
        </button>

        <div className="flex shrink-0 items-center justify-end gap-0.5 pr-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-2.5 text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                aria-label="Quick menu"
              >
                <MoreHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="aris-glass aris-glass-strong w-56 rounded-xl border-[color:var(--glass-border-outer)]"
              side="top"
              sideOffset={10}
            >
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
              className="h-8 gap-1.5 rounded-full border-amber-500/35 bg-amber-500/12 px-2.5 text-amber-950 backdrop-blur-sm dark:text-amber-100"
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
                'hidden h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] text-muted-foreground',
                'transition-colors hover:bg-foreground/6 hover:text-foreground md:flex',
              )}
              title="Model and connection"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full shadow-[0_0_0_2px_oklch(1_0_0/0.35)]',
                  settingsQuery.data?.hasApiKey ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )}
              />
              <span className="max-w-28 truncate font-medium tracking-tight">
                {settingsQuery.data?.defaultModel ?? 'No model'}
              </span>
            </Link>
          )}
          {!activeRun && inProject ? (
            <span className="hidden items-center gap-1 px-1 text-[10px] text-muted-foreground/70 lg:flex">
              <Circle className="size-1.5 fill-current opacity-40" />
              Idle
            </span>
          ) : null}
          <ThemeToggle />
        </div>
        </div>
      </div>
    </div>
  )
}
