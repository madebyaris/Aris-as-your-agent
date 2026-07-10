import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import {
  cancelAgentRunFn,
  createBoardTaskFn,
  getProjectFn,
  listBoardTasksFn,
  moveBoardTaskFn,
} from '#/server/aris'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useDefaultLayout } from 'react-resizable-panels'
import { StudioChat } from '@/components/studio/StudioChat'
import { useStudioRun } from '@/components/studio/studio-run-context'
import { useIsMobile } from '@/hooks/use-mobile'
import type { BoardColumn, BoardTask, ProofLabel } from '@aris/tasks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Columns2,
  Folder,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Plus,
  Square,
} from 'lucide-react'
import type { ArisStreamEvent } from '@aris/stream'
import { cn } from '@/lib/utils'

const VIEWS = ['board', 'chat', 'split'] as const
type ProjectView = (typeof VIEWS)[number]

type ProjectSearch = {
  view?: ProjectView
}

export const Route = createFileRoute('/_studio/studio/$projectId')({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    const view = search.view
    if (view === 'chat' || view === 'split' || view === 'board') {
      return { view }
    }
    return {}
  },
  component: ProjectWorkspacePage,
})

const COLUMN_LABELS: Record<BoardColumn, string> = {
  backlog: 'Backlog',
  research: 'Research',
  plan: 'Plan',
  build: 'Build',
  review: 'Review',
  done: 'Done',
}

const COLUMN_EMPTY: Record<BoardColumn, string> = {
  backlog: 'Capture work here before it enters the pipeline.',
  research: 'Drop here to start research.',
  plan: 'Drop here to shape a plan.',
  build: 'Drop here to begin implementation.',
  review: 'Drop here to verify with proof.',
  done: 'Completed work lands here.',
}

const BOARD_COLUMNS = [
  'backlog',
  'research',
  'plan',
  'build',
  'review',
  'done',
] as const satisfies readonly BoardColumn[]

function ProjectWorkspacePage() {
  const { projectId } = Route.useParams()
  const { view: requestedView } = Route.useSearch()
  const navigate = Route.useNavigate()
  const isMobile = useIsMobile()
  const resolvedView: ProjectView = requestedView ?? 'board'
  const view: ProjectView =
    isMobile && resolvedView === 'split' ? 'board' : resolvedView

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `aris-project-split-${projectId}`,
    panelIds: ['board', 'chat'],
  })

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectFn({ data: { projectId } }),
  })

  const project = projectQuery.data

  function setView(next: ProjectView) {
    void navigate({
      search: (prev) => ({ ...prev, view: next }),
      replace: true,
    })
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="h-[88px] animate-pulse border-b bg-muted/30" />
        <div className="flex flex-1 gap-3 bg-muted/20 p-4">
          {[0, 1, 2, 3].map((column) => (
            <div key={column} className="h-80 w-64 shrink-0 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button asChild variant="outline">
          <Link to="/studio">Back to projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-[52px] shrink-0 items-center gap-2 border-b px-3 py-2 sm:px-4">
        <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
          <Link to="/studio" aria-label="Back to projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/35">
          <Folder className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold tracking-tight" title={project.workspacePath}>
              {project.name}
            </h1>
            <Badge variant="outline" className="h-5 shrink-0 font-normal text-[10px]">
              {project.mode}
            </Badge>
            {project.isScratch ? (
              <Badge variant="secondary" className="h-5 shrink-0 font-normal text-[10px]">
                Scratch
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 hidden truncate font-mono text-[10px] text-muted-foreground xl:block">
            {project.workspacePath}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Workspace view"
          className="flex shrink-0 items-center rounded-lg border bg-muted/40 p-0.5"
        >
          {(
            [
              { id: 'board' as const, label: 'Board', icon: LayoutGrid, hideOnMobile: false },
              { id: 'chat' as const, label: 'Chat', icon: MessageSquare, hideOnMobile: false },
              { id: 'split' as const, label: 'Split', icon: Columns2, hideOnMobile: true },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                item.hideOnMobile && 'hidden md:inline-flex',
                view === item.id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="size-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <BoardPanel projectId={projectId} workspacePath={project.workspacePath} />
      ) : null}
      {view === 'chat' ? <StudioChat projectId={projectId} compactHeader /> : null}
      {view === 'split' ? (
        <div className="flex min-h-0 flex-1">
          <ResizablePanelGroup
            id={`project-split-${projectId}`}
            orientation="horizontal"
            className="min-h-0 flex-1"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <ResizablePanel id="board" defaultSize="58%" minSize="36%" className="min-h-0 min-w-0">
              <BoardPanel projectId={projectId} workspacePath={project.workspacePath} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="chat"
              defaultSize="42%"
              minSize="28%"
              collapsible
              collapsedSize="0%"
              className="min-h-0 min-w-0"
            >
              <StudioChat projectId={projectId} compactHeader showSideBorder />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : null}
    </div>
  )
}

function BoardPanel({
  projectId,
  workspacePath,
}: {
  projectId: string
  workspacePath: string
}) {
  const queryClient = useQueryClient()
  const { setActiveRun, clearRun } = useStudioRun()
  const tasksQuery = useQuery({
    queryKey: ['board', projectId],
    queryFn: () => listBoardTasksFn({ data: { projectId } }),
  })
  const [title, setTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<BoardTask | null>(null)
  const [runLog, setRunLog] = useState('')
  const [running, setRunning] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const tasks = tasksQuery.data?.tasks ?? []
  const byColumn = useMemo(() => {
    const map = Object.fromEntries(BOARD_COLUMNS.map((c) => [c, [] as BoardTask[]])) as Record<
      BoardColumn,
      BoardTask[]
    >
    for (const t of tasks) map[t.column].push(t)
    return map
  }, [tasks])

  const createMutation = useMutation({
    mutationFn: () =>
      createBoardTaskFn({ data: { projectId, title: title.trim(), column: 'backlog' } }),
    onSuccess: async () => {
      setTitle('')
      await queryClient.invalidateQueries({ queryKey: ['board', projectId] })
    },
  })

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const taskId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId || !BOARD_COLUMNS.includes(overId as BoardColumn)) return
    const column = overId as BoardColumn
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.column === column) return

    try {
      await moveBoardTaskFn({
        data: {
          projectId,
          taskId,
          column,
          proofLabel: task.proofLabel,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['board', projectId] })
      if (['research', 'plan', 'build', 'review'].includes(column)) {
        void runPhase({ ...task, column }, column)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Move failed')
    }
  }

  async function runPhase(task: BoardTask, column: BoardColumn) {
    setSelected(task)
    setRunning(true)
    setRunLog('')
    const runKey = `${projectId}:${task.id}`
    setActiveRun({
      runKey,
      label: `${column}: ${task.title}`,
      projectId,
    })
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          taskId: task.id,
          column,
          message: `Run ${column} for: ${task.title}`,
        }),
      })
      if (!response.ok || !response.body) throw new Error('Failed to start agent')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let proof: ProofLabel | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          let eventName = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7)
            if (line.startsWith('data: ')) dataLine = line.slice(6)
          }
          if (!dataLine) continue
          const payload = JSON.parse(dataLine) as ArisStreamEvent
          if (eventName === 'assistant_delta' && payload.type === 'assistant_delta') {
            setRunLog((s) => s + payload.text)
          }
          if (eventName === 'tool_call' && payload.type === 'tool_call') {
            setRunLog((s) => s + `\n[${payload.name} ${payload.status}]\n`)
          }
          if (eventName === 'done' && payload.type === 'done' && payload.proofLabel) {
            proof = payload.proofLabel as ProofLabel
          }
          if (eventName === 'error' && payload.type === 'error') {
            toast.error(payload.message)
          }
        }
      }

      if (column === 'review' && proof) {
        await moveBoardTaskFn({
          data: { projectId, taskId: task.id, column: 'review', proofLabel: proof },
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['board', projectId] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
      clearRun(runKey)
      void cancelAgentRunFn({ data: { runKey } })
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId) ?? null
  const activeWorkCount =
    byColumn.research.length + byColumn.plan.length + byColumn.build.length + byColumn.review.length

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
      <div className="flex min-h-13 shrink-0 flex-col gap-3 border-b bg-background px-4 py-2.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CircleDot className="size-3.5" />
            {tasks.length} tasks
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {byColumn.done.length} complete
          </span>
          {activeWorkCount > 0 ? (
            <Badge variant="secondary" className="h-5 font-normal">
              {activeWorkCount} in progress
            </Badge>
          ) : null}
          <span className="hidden text-[11px] text-muted-foreground/80 lg:inline">
            Moving into Research–Review starts a run
          </span>
        </div>
        <form
          className="flex flex-1 gap-2 sm:ml-auto sm:max-w-md"
          onSubmit={(event) => {
            event.preventDefault()
            if (title.trim()) createMutation.mutate()
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task to backlog"
            className="h-8 flex-1 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={!title.trim() || createMutation.isPending}
          >
            <Plus className="size-3.5" />
            Add task
          </Button>
        </form>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3 sm:p-4">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumnView
              key={column}
              column={column}
              tasks={byColumn[column]}
              onOpen={(t) => setSelected(t)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <Card className="w-64 rotate-1 opacity-95 shadow-lg">
              <CardHeader className="p-3">
                <CardTitle className="text-sm">{activeTask.title}</CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              {selected ? (
                <>
                  <Badge variant="secondary" className="font-normal">
                    {COLUMN_LABELS[selected.column]}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {selected.priority}
                  </Badge>
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center gap-2 border-b px-4 py-3">
            {selected && ['research', 'plan', 'build', 'review'].includes(selected.column) ? (
              <Button
                size="sm"
                disabled={running}
                onClick={() => selected && void runPhase(selected, selected.column)}
              >
                {running ? <Loader2 className="size-4 animate-spin" /> : null}
                Run {selected.column}
              </Button>
            ) : null}
            {running ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  const runKey = `${projectId}:${selected?.id}`
                  clearRun(runKey)
                  void cancelAgentRunFn({ data: { runKey } })
                }}
              >
                <Square className="size-3" />
                Stop
              </Button>
            ) : null}
            <code className="ml-auto max-w-52 truncate font-mono text-[10px] text-muted-foreground">
              {workspacePath}
            </code>
          </div>
          <ScrollArea className="flex-1 bg-muted/20 p-4">
            <div className="min-h-40 rounded-lg border bg-background p-3">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Run output
              </p>
              <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-5 text-muted-foreground">
                {runLog || 'Run this phase to see agent output and tool activity.'}
              </pre>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function BoardColumnView({
  column,
  tasks,
  onOpen,
}: {
  column: BoardColumn
  tasks: BoardTask[]
  onOpen: (t: BoardTask) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column })
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[360px] w-[272px] shrink-0 flex-col rounded-xl border bg-muted/35 transition-colors ${
        isOver ? 'border-foreground/30 bg-muted/65 ring-2 ring-ring/15' : ''
      }`}
    >
      <div className="flex h-10 items-center justify-between px-3">
        <span className="text-xs font-semibold text-foreground/80">
          {COLUMN_LABELS[column]}
        </span>
        <span className="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-xs">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tasks.length === 0 ? (
          <div className="flex min-h-24 flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 px-4 text-center text-[11px] leading-5 text-muted-foreground/70">
            {COLUMN_EMPTY[column]}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpen(task)} />
          ))
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, onOpen }: { task: BoardTask; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab gap-0 rounded-lg py-0 shadow-xs transition-[box-shadow,opacity] hover:shadow-sm active:cursor-grabbing ${isDragging ? 'opacity-35' : ''}`}
      {...listeners}
      {...attributes}
      onClick={onOpen}
    >
      <CardHeader className="space-y-2 p-3">
        <CardTitle className="text-[13px] leading-5 font-medium">{task.title}</CardTitle>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{task.priority}</span>
          {task.proofLabel ? (
            <Badge
              variant="outline"
              className="ml-auto h-5 gap-1 font-normal text-[9px]"
            >
              <span
                className={
                  task.proofLabel === 'verified'
                    ? 'size-1.5 rounded-full bg-status-success'
                    : 'size-1.5 rounded-full bg-status-warning'
                }
              />
              {task.proofLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      {task.description ? (
        <CardContent className="line-clamp-3 px-3 pb-3 pt-0 text-xs leading-5 text-muted-foreground">
          {task.description}
        </CardContent>
      ) : null}
    </Card>
  )
}
