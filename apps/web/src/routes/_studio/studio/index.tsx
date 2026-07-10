import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createProjectFn,
  createScratchFn,
  getSettings,
  listProjects,
  openProjectFn,
  setLastProjectFn,
} from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Clock3,
  Folder,
  FolderOpen,
  KeyRound,
  Plus,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_studio/studio/')({
  component: StudioHomePage,
})

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function formatUpdatedAt(value: string) {
  const diff = new Date(value).getTime() - Date.now()
  const minute = 60_000
  const hour = minute * 60
  const day = hour * 24
  if (Math.abs(diff) < hour) return relativeTime.format(Math.round(diff / minute), 'minute')
  if (Math.abs(diff) < day) return relativeTime.format(Math.round(diff / hour), 'hour')
  return relativeTime.format(Math.round(diff / day), 'day')
}

function StudioHomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })

  const [name, setName] = useState('')
  const [parentDir, setParentDir] = useState('')
  const [openPath, setOpenPath] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: () =>
      createProjectFn({
        data: {
          name: name.trim(),
          parentDir: parentDir.trim() || undefined,
        },
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await setLastProjectFn({ data: { projectId: project.id } })
      setCreateOpen(false)
      setName('')
      toast.success(`Created ${project.name}`)
      void navigate({ to: '/studio/$projectId', params: { projectId: project.id } })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Create failed'),
  })

  const openMutation = useMutation({
    mutationFn: () => openProjectFn({ data: { path: openPath.trim() } }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await setLastProjectFn({ data: { projectId: project.id } })
      setOpenOpen(false)
      toast.success(`Opened ${project.name}`)
      void navigate({ to: '/studio/$projectId', params: { projectId: project.id } })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Open failed'),
  })

  const scratchMutation = useMutation({
    mutationFn: () => createScratchFn(),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      void navigate({ to: '/studio/$projectId', params: { projectId: project.id } })
    },
  })

  if (settingsQuery.data && !settingsQuery.data.hasApiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-xs">
          <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl border bg-muted/50">
            <KeyRound className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Connect a provider to begin</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add a Cursor account for the full local harness, or OpenRouter for lite chat. Keys stay
            in local settings on this machine.
          </p>
          <Button asChild className="mt-6">
            <Link to="/accounts">
              Configure account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            You can add more accounts and choose a model later.
          </p>
        </div>
      </div>
    )
  }

  const projects = projectsQuery.data?.projects ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Local workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">Continue your work</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Every project maps to a folder on this machine. Open one to continue its board,
            chat, and context.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenOpen(true)}>
            <FolderOpen className="size-4" />
            Open folder
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New project
          </Button>
        </div>
      </div>

      <Sheet open={openOpen} onOpenChange={setOpenOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Open existing project</SheetTitle>
            <SheetDescription>
              Enter an absolute folder path. Aris adds a local{' '}
              <code className="font-mono text-xs">.aris-workspace</code> sidecar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label htmlFor="open-path">Path</Label>
              <Input
                id="open-path"
                value={openPath}
                onChange={(e) => setOpenPath(e.target.value)}
                placeholder="/Users/you/code/my-app"
                className="font-mono text-xs"
              />
            </div>
            {(settingsQuery.data?.recentProjectPaths?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-1">
                {settingsQuery.data!.recentProjectPaths!.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="xs"
                    variant="secondary"
                    className="max-w-full truncate font-mono text-[10px]"
                    onClick={() => setOpenPath(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="ghost" onClick={() => setOpenOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!openPath.trim() || openMutation.isPending}
              onClick={() => openMutation.mutate()}
            >
              Open
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Create project</SheetTitle>
            <SheetDescription>
              Create a folder with an Aris sidecar, ready for board and chat history.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Specialty Coffee Site"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent directory (optional)</Label>
              <Input
                id="parent"
                value={parentDir}
                onChange={(e) => setParentDir(e.target.value)}
                placeholder={settingsQuery.data?.workspaceRoot}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="flex h-12 items-center justify-between border-b px-4">
            <div>
              <h2 className="text-sm font-semibold">Recent projects</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          {projectsQuery.isLoading ? (
            <div className="space-y-0 divide-y">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex h-[76px] items-center gap-3 px-4">
                  <div className="size-9 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-64 max-w-full animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl border bg-muted/40">
                <Folder className="size-4.5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">No projects yet</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Create a new folder or open an existing codebase. Its context stays local.
              </p>
              <Button className="mt-5" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Create first project
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to="/studio/$projectId"
                  params={{ projectId: project.id }}
                  className="group flex min-h-[76px] items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-muted/45"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs group-hover:text-foreground">
                    <Folder className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{project.name}</h3>
                      {project.isScratch ? (
                        <Badge variant="outline" className="h-5 font-normal">
                          scratch
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {project.workspacePath}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
                    <Badge variant="secondary" className="font-normal">
                      {project.mode}
                    </Badge>
                    <span className="flex w-24 items-center gap-1.5">
                      <Clock3 className="size-3" />
                      {formatUpdatedAt(project.updatedAt)}
                    </span>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Start something</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose where the work lives.</p>
            </div>
            <div className="divide-y">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="group flex w-full items-start gap-3 p-4 text-left hover:bg-muted/45"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">New project</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Create a local folder and workspace.
                  </span>
                </span>
                <ArrowRight className="mt-2 size-3.5 text-muted-foreground/40 group-hover:text-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setOpenOpen(true)}
                className="group flex w-full items-start gap-3 p-4 text-left hover:bg-muted/45"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <FolderOpen className="size-4" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Open folder</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Continue an existing codebase.
                  </span>
                </span>
                <ArrowRight className="mt-2 size-3.5 text-muted-foreground/40 group-hover:text-foreground" />
              </button>
              <button
                type="button"
                disabled={scratchMutation.isPending}
                onClick={() => scratchMutation.mutate()}
                className="group flex w-full items-start gap-3 p-4 text-left hover:bg-muted/45 disabled:opacity-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Sparkles className="size-4" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Scratch project</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Explore without choosing a folder.
                  </span>
                </span>
                <ArrowRight className="mt-2 size-3.5 text-muted-foreground/40 group-hover:text-foreground" />
              </button>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-status-success" />
              Local workspace ready
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              New projects are created under
            </p>
            <code className="mt-1 block truncate font-mono text-[11px]">
              {settingsQuery.data?.workspaceRoot}
            </code>
          </section>
        </aside>
      </div>
    </div>
  )
}
