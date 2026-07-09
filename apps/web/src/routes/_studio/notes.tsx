import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { createNoteFn, listNotes, listProjects } from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Eye, FileLock2, NotebookPen, Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_studio/notes')({
  component: NotesPage,
})

function NotesPage() {
  const queryClient = useQueryClient()
  const notesQuery = useQuery({ queryKey: ['notes'], queryFn: listNotes })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const projects = projectsQuery.data?.projects ?? []
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  )

  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'agent'>('agent')
  const [projectId, setProjectId] = useState<string>('none')

  const createMutation = useMutation({
    mutationFn: () =>
      createNoteFn({
        data: {
          title,
          body,
          visibility,
          projectId: projectId === 'none' ? undefined : projectId,
        },
      }),
    onSuccess: async () => {
      setTitle('')
      setBody('')
      setComposerOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note saved')
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-[1050px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Project context</p>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Keep decisions and preferences close to the work. You control what Aris can read.
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="size-4" />
          New note
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Eye className="size-3.5" />
          Agent notes are included in matching project prompts
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span className="flex items-center gap-2">
          <FileLock2 className="size-3.5" />
          Private notes never leave this screen
        </span>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <h2 className="text-sm font-semibold">Saved notes</h2>
          <span className="text-xs text-muted-foreground">
            {notesQuery.data?.notes.length ?? 0} total
          </span>
        </div>
        {(notesQuery.data?.notes.length ?? 0) === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl border bg-muted/40">
              <NotebookPen className="size-4.5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">No context saved yet</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Capture a decision, requirement, or preference for yourself or the agent.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setComposerOpen(true)}>
              <Plus className="size-3.5" />
              Write a note
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {(notesQuery.data?.notes ?? []).map((note) => (
              <article key={note.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{note.title}</h3>
                      <Badge
                        variant={note.visibility === 'private' ? 'outline' : 'secondary'}
                        className="h-5 gap-1.5 font-normal"
                      >
                        {note.visibility === 'private' ? (
                          <FileLock2 className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                        {note.visibility === 'private' ? 'Private' : 'Agent can read'}
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {note.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {note.projectId
                        ? projectNameById[note.projectId] ?? 'Unknown project'
                        : 'Global'}
                    </span>
                    <span>·</span>
                    <time>{new Date(note.updatedAt).toLocaleDateString()}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>New note</SheetTitle>
            <SheetDescription>
              Add durable context, then choose whether Aris can use it.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Deployment constraints"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-body">Note</Label>
              <Textarea
                id="note-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                placeholder="What should you or Aris remember?"
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as 'private' | 'agent')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent can read</SelectItem>
                  <SelectItem value="private">Private, only you</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {visibility === 'agent'
                  ? 'Included when Aris works in the selected project.'
                  : 'Stored locally and never added to agent prompts.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || !body.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save note
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
