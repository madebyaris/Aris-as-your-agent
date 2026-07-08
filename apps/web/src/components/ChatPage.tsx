import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createSession,
  getSettings,
  listProjects,
  saveApiKey,
} from '#/server/aris'
import type { ArisStreamEvent } from '@aris/stream'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ChatStoreState = {
  messages: ChatMessage[]
  streamingText: string
  activity: string[]
  isStreaming: boolean
}

function createChatStore() {
  return new Store<ChatStoreState>({
    messages: [],
    streamingText: '',
    activity: [],
    isStreaming: false,
  })
}

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string>('')
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const storeRef = useRef(createChatStore())
  const store = storeRef.current

  const state = useStore(store, (s) => s)

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects(),
    enabled: settingsQuery.data?.hasApiKey === true,
  })

  const [resumed, setResumed] = useState(false)

  const sessionMutation = useMutation({
    mutationFn: async (selectedProjectId?: string) => {
      const session = await createSession({
        data: selectedProjectId ? { projectId: selectedProjectId } : {},
      })
      setSessionId(session.sessionId)
      setWorkspacePath(session.path)
      setProjectName(session.projectName ?? null)
      setResumed(Boolean(session.resumed))
      if (session.projectId) setProjectId(session.projectId)

      const hydrated =
        session.transcript?.map((m) => ({
          id: m.id,
          role: m.role as ChatMessage['role'],
          content: m.content,
        })) ?? []

      store.setState((s) => ({
        ...s,
        messages: hydrated,
        streamingText: '',
        activity: [],
        isStreaming: false,
      }))

      return session
    },
  })

  const saveKeyMutation = useMutation({
    mutationFn: (apiKey: string) => saveApiKey({ data: { apiKey } }),
    onSuccess: () => settingsQuery.refetch(),
  })

  useEffect(() => {
    if (settingsQuery.data?.hasApiKey && !sessionId && !sessionMutation.isPending) {
      sessionMutation.mutate(projectId || undefined)
    }
  }, [settingsQuery.data?.hasApiKey, sessionId, sessionMutation, projectId])

  async function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId)
    setSessionId(null)
    setWorkspacePath(null)
    setProjectName(null)
    store.setState((s) => ({
      ...s,
      messages: [],
      streamingText: '',
      activity: [],
      isStreaming: false,
    }))
  }

  async function sendMessage(message: string) {
    if (!sessionId || !message.trim() || state.isStreaming) return

    store.setState((s) => ({
      ...s,
      isStreaming: true,
      streamingText: '',
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: 'user', content: message.trim() },
      ],
    }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: message.trim(),
        ...(projectId ? { projectId } : {}),
      }),
    })

    if (!response.ok || !response.body) {
      store.setState((s) => ({
        ...s,
        isStreaming: false,
        messages: [
          ...s.messages,
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Failed to connect to Aris.',
          },
        ],
      }))
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantText = ''

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
          assistantText += payload.text
          store.setState((s) => ({ ...s, streamingText: assistantText }))
        }

        if (eventName === 'tool_call' && payload.type === 'tool_call') {
          store.setState((s) => ({
            ...s,
            activity: [...s.activity, `${payload.name} (${payload.status})`],
          }))
        }

        if (eventName === 'done') {
          store.setState((s) => ({
            ...s,
            isStreaming: false,
            streamingText: '',
            messages: assistantText
              ? [
                  ...s.messages,
                  {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: assistantText,
                  },
                ]
              : s.messages,
          }))
        }
      }
    }
  }

  const needsKey = settingsQuery.isSuccess && !settingsQuery.data.hasApiKey

  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="island-kicker mb-1">Aris · local agent</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
            Chat with your senior developer
          </h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/60 px-4 py-2 text-sm font-medium text-[var(--sea-ink)] no-underline"
        >
          ← Home
        </Link>
      </div>

      {needsKey ? (
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--sea-ink)]">
            Connect Cursor API key
          </h2>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            Stored locally at <code>~/.aris/settings.json</code>. Never committed to git.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="cursor_..."
              className="flex-1 rounded-xl border border-[rgba(23,58,64,0.15)] bg-white/80 px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              disabled={saveKeyMutation.isPending}
              onClick={() => saveKeyMutation.mutate(apiKeyInput)}
              className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save key
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="island-shell flex min-h-[480px] flex-col rounded-2xl p-4">
          <div className="mb-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {state.messages.length === 0 ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                {resumed
                  ? 'Resumed session — prior turns load from the durable transcript.'
                  : 'Try: "Build me a website about specialty coffee" — Aris writes .aris/STATE.md after each turn so work can continue later.'}
              </p>
            ) : null}
            {state.messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === 'user'
                    ? 'ml-8 rounded-2xl bg-[rgba(79,184,178,0.16)] px-4 py-3 text-sm'
                    : 'mr-8 rounded-2xl bg-white/70 px-4 py-3 text-sm'
                }
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                  {msg.role}
                </p>
                <pre className="m-0 whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            ))}
            {state.streamingText ? (
              <div className="mr-8 rounded-2xl bg-white/70 px-4 py-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                  aris · streaming
                </p>
                <pre className="m-0 whitespace-pre-wrap font-sans">
                  {state.streamingText}
                </pre>
              </div>
            ) : null}
          </div>

          <form
            className="mt-2 flex gap-2 border-t border-[rgba(23,58,64,0.08)] pt-3"
            onSubmit={(e) => {
              e.preventDefault()
              const value = input
              setInput('')
              void sendMessage(value)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={needsKey || state.isStreaming || !sessionId}
              placeholder={
                needsKey
                  ? 'Add API key first'
                  : 'Describe what you want to build…'
              }
              className="flex-1 rounded-xl border border-[rgba(23,58,64,0.15)] bg-white/80 px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={needsKey || state.isStreaming || !sessionId}
              className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="island-shell rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">Project</h2>
            <select
              className="mb-2 w-full rounded-lg border border-[rgba(23,58,64,0.15)] bg-white/80 px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => void handleProjectChange(e.target.value)}
              disabled={needsKey || state.isStreaming}
            >
              <option value="">New session (greenfield)</option>
              {projectsQuery.data?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.mode})
                </option>
              ))}
            </select>
            <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
              Continue mode uses the project workspace and injects agent-visible notes.
            </p>
          </section>

          <section className="island-shell rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">Session</h2>
            <p className="m-0 break-all text-xs text-[var(--sea-ink-soft)]">
              {sessionId ?? 'Creating session…'}
            </p>
            {resumed ? (
              <p className="mt-2 text-xs font-medium text-[var(--lagoon-deep)]">
                Resumed · durable continuity
              </p>
            ) : null}
            {projectName ? (
              <p className="mt-2 text-xs font-medium text-[var(--sea-ink)]">{projectName}</p>
            ) : null}
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              Workspace:{' '}
              <code className="break-all">{workspacePath ?? `~/.aris/sessions/{id}/`}</code>
            </p>
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              Handoff: <code>.aris/STATE.md</code>
            </p>
          </section>

          <section className="island-shell rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">Activity</h2>
            {state.activity.length === 0 ? (
              <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Tool calls appear here.</p>
            ) : (
              <ul className="m-0 list-disc space-y-1 pl-4 text-xs text-[var(--sea-ink-soft)]">
                {state.activity.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="island-shell rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">Preview</h2>
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[rgba(23,58,64,0.2)] bg-white/40 text-xs text-[var(--sea-ink-soft)]">
              Phase 1: live preview iframe
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
