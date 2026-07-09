import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createNoteFn,
  createProjectFn,
  listNotes,
  listProjects,
  listServers,
  registerServerFn,
} from '#/server/aris'

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const notesQuery = useQuery({ queryKey: ['notes'], queryFn: listNotes })
  const serversQuery = useQuery({ queryKey: ['servers'], queryFn: listServers })

  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteVisibility, setNoteVisibility] = useState<'private' | 'agent'>('agent')
  const [serverLabel, setServerLabel] = useState('')
  const [serverHost, setServerHost] = useState('')
  const [serverUser, setServerUser] = useState('root')
  const [serverSecret, setServerSecret] = useState('')

  const createProjectMutation = useMutation({
    mutationFn: () =>
      createProjectFn({
        data: {
          name: projectName,
          workspacePath: projectPath,
          mode: 'continue',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setProjectName('')
      setProjectPath('')
    },
  })

  const createNoteMutation = useMutation({
    mutationFn: () =>
      createNoteFn({
        data: {
          title: noteTitle,
          body: noteBody,
          visibility: noteVisibility,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setNoteTitle('')
      setNoteBody('')
    },
  })

  const registerServerMutation = useMutation({
    mutationFn: () =>
      registerServerFn({
        data: {
          label: serverLabel,
          host: serverHost,
          username: serverUser,
          authType: 'password',
          secret: serverSecret,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      setServerLabel('')
      setServerHost('')
      setServerSecret('')
    },
  })

  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="island-kicker mb-1">Living products</p>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
            Projects, notes & servers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
            Software never finishes. Continue features on existing projects, save notes
            (private or agent-readable), and register SSH servers — always backup before
            server changes.
          </p>
        </div>
        <Link
          to="/chat"
          className="rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white no-underline"
        >
          Open chat →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="island-shell rounded-2xl p-5">
          <h2 className="mb-3 text-lg font-semibold">Projects</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {projectsQuery.data?.projects.map((p) => (
              <li key={p.id} className="rounded-lg bg-white/60 p-3">
                <strong>{p.name}</strong>
                <div className="text-xs text-[var(--sea-ink-soft)]">{p.workspacePath}</div>
                <div className="text-xs">mode: {p.mode}</div>
              </li>
            )) ?? <li className="text-sm text-[var(--sea-ink-soft)]">No projects yet.</li>}
          </ul>
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="/path/to/existing/repo"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <button
              type="button"
              className="w-full rounded-full bg-[var(--lagoon-deep)] py-2 text-sm font-semibold text-white"
              onClick={() => createProjectMutation.mutate()}
            >
              Register project (continue)
            </button>
          </div>
        </section>

        <section className="island-shell rounded-2xl p-5">
          <h2 className="mb-3 text-lg font-semibold">Notes</h2>
          <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {notesQuery.data?.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-white/60 p-3">
                <strong>{n.title}</strong>
                <span className="ml-2 rounded bg-black/5 px-2 py-0.5 text-xs">
                  {n.visibility}
                </span>
                <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{n.body}</p>
              </li>
            )) ?? <li className="text-sm text-[var(--sea-ink-soft)]">No notes yet.</li>}
          </ul>
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Note body"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={noteVisibility}
              onChange={(e) =>
                setNoteVisibility(e.target.value as 'private' | 'agent')
              }
            >
              <option value="private">Private — only you</option>
              <option value="agent">Agent can read</option>
            </select>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--lagoon-deep)] py-2 text-sm font-semibold text-white"
              onClick={() => createNoteMutation.mutate()}
            >
              Save note
            </button>
          </div>
        </section>

        <section className="island-shell rounded-2xl p-5">
          <h2 className="mb-3 text-lg font-semibold">Servers (SSH)</h2>
          <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">
            Credentials stored in <code>~/aris-secrets/servers/</code>. Every task
            requires backup + pre-change note before changes.
          </p>
          <ul className="mb-4 space-y-2 text-sm">
            {serversQuery.data?.servers.map((s) => (
              <li key={s.id} className="rounded-lg bg-white/60 p-3">
                <strong>{s.label}</strong>
                <div className="text-xs">
                  {s.username}@{s.host}:{s.port}
                </div>
              </li>
            )) ?? <li className="text-sm text-[var(--sea-ink-soft)]">No servers yet.</li>}
          </ul>
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Label (e.g. Production VPS)"
              value={serverLabel}
              onChange={(e) => setServerLabel(e.target.value)}
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Host / IP"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Username"
              value={serverUser}
              onChange={(e) => setServerUser(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Password or paste private key"
              value={serverSecret}
              onChange={(e) => setServerSecret(e.target.value)}
            />
            <button
              type="button"
              className="w-full rounded-full bg-[var(--lagoon-deep)] py-2 text-sm font-semibold text-white"
              onClick={() => registerServerMutation.mutate()}
            >
              Register server
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
