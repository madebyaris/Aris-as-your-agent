import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  listProjects,
  listServers,
  registerServerFn,
  updateServerProjectsFn,
} from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ChevronDown, Globe2, Plus, Server, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_studio/servers')({
  component: ServersPage,
})

function ServersPage() {
  const queryClient = useQueryClient()
  const serversQuery = useQuery({ queryKey: ['servers'], queryFn: listServers })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })

  const projects = projectsQuery.data?.projects ?? []
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  )

  const [label, setLabel] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('root')
  const [authType, setAuthType] = useState<'password' | 'private_key'>('password')
  const [secret, setSecret] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const registerMutation = useMutation({
    mutationFn: () =>
      registerServerFn({
        data: {
          label,
          host,
          username,
          authType,
          secret,
          projectIds: selectedProjectIds,
        },
      }),
    onSuccess: async () => {
      setLabel('')
      setHost('')
      setAuthType('password')
      setSecret('')
      setSelectedProjectIds([])
      setRegisterOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['servers'] })
      toast.success('Server registered')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Register failed'),
  })

  const updateProjectsMutation = useMutation({
    mutationFn: (input: { serverId: string; projectIds: string[] }) =>
      updateServerProjectsFn({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servers'] })
      toast.success('Project access updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })

  return (
    <div className="mx-auto flex w-full max-w-[1050px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Infrastructure</p>
          <h1 className="text-2xl font-semibold tracking-tight">Servers</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Register SSH targets once, then expose each target only to the projects that need
            it.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus className="size-4" />
          Register server
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-3.5" />
          Mutations require backup and pre-change notes
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span>
          Credentials stay in{' '}
          <code className="font-mono text-[11px] text-foreground">
            ~/aris-secrets/servers/
          </code>
        </span>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <h2 className="text-sm font-semibold">Registered targets</h2>
          <span className="text-xs text-muted-foreground">
            {serversQuery.data?.servers.length ?? 0} total
          </span>
        </div>
        {(serversQuery.data?.servers.length ?? 0) === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl border bg-muted/40">
              <Server className="size-4.5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">No servers registered</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Add a target when a project needs deployment or remote operations context.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="size-3.5" />
              Register first server
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {(serversQuery.data?.servers ?? []).map((server) => {
              const ids = server.projectIds ?? []
              return (
                <details key={server.id} className="group">
                  <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/45 [&::-webkit-details-marker]:hidden">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs">
                      <Server className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium">{server.label}</h3>
                        <Badge variant="outline" className="h-5 gap-1.5 font-normal">
                          <span className="size-1.5 rounded-full bg-status-warning" />
                          configured
                        </Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {server.username}@{server.host}:{server.port}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {ids.length === 0 ? (
                        <Badge variant="secondary" className="font-normal">
                          <Globe2 className="size-3" />
                          All projects
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          {ids.length} {ids.length === 1 ? 'project' : 'projects'}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t bg-muted/20 px-4 py-4 sm:pl-16">
                    <div className="max-w-xl">
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold">Project access</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          No selection means every project can use this target.
                        </p>
                      </div>
                      {projects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Create a project before restricting access.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {projects.map((project) => {
                            const checked = ids.includes(project.id)
                            return (
                              <label
                                key={project.id}
                                className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-background px-3 py-2.5 text-sm hover:bg-muted/35"
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={updateProjectsMutation.isPending}
                                  onCheckedChange={() => {
                                    const next = checked
                                      ? ids.filter((id) => id !== project.id)
                                      : [...ids, project.id]
                                    updateProjectsMutation.mutate({
                                      serverId: server.id,
                                      projectIds: next,
                                    })
                                  }}
                                />
                                <span className="truncate">{projectNameById[project.id]}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </section>

      <Sheet open={registerOpen} onOpenChange={setRegisterOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Register server</SheetTitle>
            <SheetDescription>
              Store a target locally and define which projects can see it.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="server-label">Label</Label>
                <Input
                  id="server-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Production VPS"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-host">Host or IP</Label>
                <Input
                  id="server-host"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder="203.0.113.10"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-user">Username</Label>
                <Input
                  id="server-user"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Authentication</Label>
              <Select
                value={authType}
                onValueChange={(value) =>
                  setAuthType(value as 'password' | 'private_key')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="private_key">Private key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-secret">
                {authType === 'private_key' ? 'Private key' : 'Password'}
              </Label>
              {authType === 'private_key' ? (
                <Textarea
                  id="server-secret"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  rows={7}
                  className="resize-none font-mono text-xs"
                />
              ) : (
                <Input
                  id="server-secret"
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                />
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Stored locally with restricted file permissions.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Project access</Label>
              {projects.length === 0 ? (
                <div className="rounded-md border bg-muted/30 px-3 py-3 text-xs leading-5 text-muted-foreground">
                  No projects yet. This target will be visible to all projects.
                </div>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1.5">
                  {projects.map((project) => {
                    const checked = selectedProjectIds.includes(project.id)
                    return (
                      <label
                        key={project.id}
                        className="flex cursor-pointer items-start gap-2.5 rounded px-2 py-2 hover:bg-muted/45"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleProject(project.id)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{project.name}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {project.workspacePath}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedProjectIds.length === 0
                  ? 'Visible to all projects.'
                  : `Visible to ${selectedProjectIds.length} selected project${selectedProjectIds.length === 1 ? '' : 's'}.`}
              </p>
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="ghost" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !label.trim() || !host.trim() || !secret.trim() || registerMutation.isPending
              }
              onClick={() => registerMutation.mutate()}
            >
              Register server
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
