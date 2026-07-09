import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Blocks,
  Bot,
  ChevronRight,
  Circle,
  FileText,
  FolderKanban,
  KeyRound,
  Laptop,
  Plus,
  Search,
  Server,
  Settings2,
  StickyNote,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useQuery } from '@tanstack/react-query'
import { listProjects, getSettings } from '#/server/aris'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { StudioRunProvider } from './studio-run-context'
import { StudioTaskbar } from './StudioTaskbar'

const nav = [
  { to: '/studio', label: 'Projects', icon: FolderKanban },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/accounts', label: 'Accounts', icon: KeyRound },
] as const

function getSection(pathname: string, projectName?: string) {
  if (pathname.startsWith('/notes')) return { label: 'Notes', icon: FileText }
  if (pathname.startsWith('/servers')) return { label: 'Servers', icon: Server }
  if (pathname.startsWith('/accounts')) return { label: 'Accounts', icon: Settings2 }
  if (projectName) return { label: projectName, icon: Blocks }
  return { label: 'Projects', icon: FolderKanban }
}

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [commandOpen, setCommandOpen] = useState(false)
  const projects = projectsQuery.data?.projects ?? []
  const currentProject = projects.find((project) => pathname.includes(project.id))
  const section = getSection(pathname, currentProject?.name)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function runCommand(action: () => void) {
    setCommandOpen(false)
    action()
  }

  return (
    <StudioRunProvider>
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
        <SidebarHeader className="h-14 justify-center px-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="data-[slot=sidebar-menu-button]:p-2!">
                <Link to="/studio">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold tracking-tight shadow-xs">
                    A
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold tracking-tight">Aris Studio</span>
                    <span className="truncate text-[11px] text-sidebar-foreground/55">
                      Local agent workspace
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-1 px-1">
          <SidebarGroup className="py-2">
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => {
                  const active =
                    item.to === '/studio'
                      ? pathname.startsWith('/studio')
                      : pathname.startsWith(item.to)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          'h-8.5 rounded-md text-sidebar-foreground/72 transition-colors',
                          active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                        )}
                      >
                        <Link to={item.to}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="min-h-0 flex-1 py-2">
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Recent projects
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.slice(0, 12).map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(project.id)}
                      tooltip={project.workspacePath}
                      className="h-8.5 rounded-md text-sidebar-foreground/68 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <Link to="/studio/$projectId" params={{ projectId: project.id }}>
                        <span className="flex size-4 items-center justify-center">
                          <Circle className="size-1.5 fill-current opacity-50" />
                        </span>
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {projects.length === 0 ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="h-8.5 text-sidebar-foreground/40">
                      <span className="text-xs">Projects appear here</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Account and model" className="h-10 rounded-md">
                <Link to="/accounts">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-background">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs font-medium">
                      {settingsQuery.data?.defaultModel ?? 'No model selected'}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-[10px] text-sidebar-foreground/50">
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          settingsQuery.data?.hasApiKey
                            ? 'bg-emerald-500'
                            : 'bg-sidebar-foreground/25',
                        )}
                      />
                      {settingsQuery.data?.hasApiKey ? 'Cursor connected' : 'Connect Cursor'}
                    </p>
                  </div>
                  <ChevronRight className="size-3.5 opacity-35" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/94 px-3 backdrop-blur-sm sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <section.icon className="hidden size-4 text-muted-foreground sm:block" />
            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="hidden text-muted-foreground sm:inline">Workspace</span>
              <ChevronRight className="hidden size-3 text-muted-foreground/60 sm:block" />
              <span className="truncate font-medium">{section.label}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="mx-auto hidden h-8 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/35 px-2.5 text-left text-xs text-muted-foreground shadow-xs transition-colors hover:bg-muted md:flex"
          >
            <Search className="size-3.5" />
            <span className="flex-1">Search projects and actions</span>
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Open command palette"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-4" />
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 px-3">
              <Link to="/studio">
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New project</span>
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-auto pb-20">{children}</main>
      </SidebarInset>

      <StudioTaskbar onOpenCommand={() => setCommandOpen(true)} />

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search projects, pages, and actions…" />
        <CommandList>
          <CommandEmpty>No matching project or action.</CommandEmpty>
          <CommandGroup heading="Go to">
            {nav.map((item) => (
              <CommandItem
                key={item.to}
                onSelect={() =>
                  runCommand(() => void navigate({ to: item.to }))
                }
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {projects.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.name} ${project.workspacePath}`}
                    onSelect={() =>
                      runCommand(() =>
                        void navigate({
                          to: '/studio/$projectId',
                          params: { projectId: project.id },
                        }),
                      )
                    }
                  >
                    <FolderKanban className="size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{project.name}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {project.workspacePath}
                      </p>
                    </div>
                    <ArrowUpRight className="size-3.5 opacity-40" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => void navigate({ to: '/studio' }))}>
              <Plus className="size-4" />
              <span>Create or open a project</span>
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => void navigate({ to: '/accounts' }))}>
              <Laptop className="size-4" />
              <span>Configure local agent</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Toaster />
    </SidebarProvider>
    </StudioRunProvider>
  )
}
