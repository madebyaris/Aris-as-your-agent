import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  cancelAgentRunFn,
  getMasterHistoryFn,
  getSettings,
} from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { ArisStreamEvent } from '@aris/stream'
import {
  ArrowUp,
  Bot,
  FolderKanban,
  LayoutList,
  Loader2,
  Square,
  UserRound,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStudioRun } from './studio-run-context'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ToolActivity = {
  id: string
  name: string
  status: string
}

const STARTERS = [
  {
    icon: LayoutList,
    label: 'Studio status',
    prompt: 'What is the current Studio status? List my projects briefly.',
  },
  {
    icon: FolderKanban,
    label: 'List projects',
    prompt: 'List all registered projects with paths and modes.',
  },
  {
    icon: Wrench,
    label: 'What can you do?',
    prompt: 'What Master tools can you use, and when should I use project Chat instead?',
  },
] as const

const RUN_KEY = 'master:chat'

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="aris-prose text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function MasterChat() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeRun, setActiveRun, clearRun } = useStudioRun()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState('')
  const [activity, setActivity] = useState<ToolActivity[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const historyQuery = useQuery({
    queryKey: ['master-chat'],
    queryFn: getMasterHistoryFn,
  })

  const provider = settingsQuery.data?.activeProvider ?? settingsQuery.data?.defaultProvider
  const cursorReady =
    settingsQuery.data?.hasApiKey === true && (provider === 'cursor' || !provider)

  useEffect(() => {
    const entries = historyQuery.data?.messages
    if (!entries) return
    setMessages(
      entries.map((m: { id?: string; role?: string; content?: string }, i: number) => ({
        id: String(m.id ?? i),
        role: (m.role as ChatMessage['role']) ?? 'assistant',
        content: String(m.content ?? ''),
      })),
    )
  }, [historyQuery.data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, activity])

  const status: 'idle' | 'working' | 'error' = streamError
    ? 'error'
    : isStreaming || activeRun?.runKey === RUN_KEY
      ? 'working'
      : 'idle'

  function maybeNavigateFromText(text: string) {
    const match = text.match(/NAVIGATE_PROJECT:([a-f0-9-]+)/i)
    if (!match) return
    const projectId = match[1]
    void navigate({
      to: '/studio/$projectId',
      params: { projectId },
      search: { view: 'board' },
    })
    toast.success('Opening project')
  }

  async function sendMessage(message: string) {
    if (!message.trim() || isStreaming) return
    if (!cursorReady) {
      toast.error('Master needs an active Cursor account')
      return
    }

    setIsStreaming(true)
    setStreamError(false)
    setStreaming('')
    setActivity([])
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: message.trim() },
    ])
    setInput('')
    setActiveRun({ runKey: RUN_KEY, label: 'Master' })

    try {
      const response = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          activeRunLabel:
            activeRun && activeRun.runKey !== RUN_KEY ? activeRun.label : null,
        }),
      })
      if (!response.ok || !response.body) throw new Error('Failed to connect to Master')

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
            setStreaming(assistantText)
          }
          if (eventName === 'tool_call' && payload.type === 'tool_call') {
            setActivity((a) => {
              const existing = a.findIndex(
                (item) => item.name === payload.name && item.status !== 'completed',
              )
              const next: ToolActivity = {
                id: `${payload.name}-${a.length}`,
                name: payload.name,
                status: payload.status,
              }
              if (existing >= 0) {
                const copy = [...a]
                copy[existing] = { ...copy[existing], status: payload.status }
                return copy
              }
              return [...a, next]
            })
          }
          if (eventName === 'status' && payload.type === 'status') {
            if (payload.status === 'navigate_project' && payload.message) {
              void navigate({
                to: '/studio/$projectId',
                params: { projectId: payload.message },
                search: { view: 'board' },
              })
              toast.success('Opening project')
            }
          }
          if (eventName === 'error' && payload.type === 'error') {
            setStreamError(true)
            toast.error(payload.message)
          }
          if (eventName === 'done') {
            if (assistantText) {
              setMessages((m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: assistantText,
                },
              ])
              maybeNavigateFromText(assistantText)
            }
            setStreaming('')
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['master-chat'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    } catch (e) {
      setStreamError(true)
      toast.error(e instanceof Error ? e.message : 'Master chat failed')
    } finally {
      setIsStreaming(false)
      clearRun(RUN_KEY)
      void cancelAgentRunFn({ data: { runKey: RUN_KEY } })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              'size-1.5 rounded-full',
              status === 'working' && 'bg-status-warning animate-pulse',
              status === 'error' && 'bg-destructive',
              status === 'idle' && 'bg-muted-foreground/35',
            )}
          />
          <span>
            {status === 'working' ? 'Working' : status === 'error' ? 'Error' : 'Idle'}
          </span>
          <span className="text-border">/</span>
          <Badge variant="outline" className="h-5 font-mono text-[10px] font-normal">
            {settingsQuery.data?.defaultModel ?? 'composer-2.5'}
          </Badge>
          {!cursorReady ? (
            <Badge variant="secondary" className="h-5 font-normal text-[10px]">
              Cursor required
            </Badge>
          ) : null}
        </div>
        {isStreaming ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              clearRun(RUN_KEY)
              void cancelAgentRunFn({ data: { runKey: RUN_KEY } })
              setIsStreaming(false)
            }}
          >
            <Square className="size-3" />
            Stop
          </Button>
        ) : null}
      </div>

      {!cursorReady ? (
        <div className="border-b bg-amber-500/10 px-4 py-2.5 text-xs leading-5 text-amber-950 dark:text-amber-100">
          Master needs an active <strong>Cursor</strong> account for control-plane tools. OpenRouter
          is lite/chat-only and cannot run Master tools.
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <div className="flex min-h-full flex-col px-4 py-4">
          {messages.length === 0 && !streaming ? (
            <div className="my-auto py-6">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-xl border bg-background shadow-xs">
                  <Bot className="size-4.5" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">Master control plane</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
                  Ask about projects, status, notes, and servers. Project code work stays in Board
                  and Chat.
                </p>
              </div>
              <div className="mx-auto mt-5 grid max-w-md gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    disabled={!cursorReady}
                    onClick={() => void sendMessage(starter.prompt)}
                    className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5 text-left text-xs font-medium shadow-xs hover:bg-muted/45 disabled:opacity-50"
                  >
                    <starter.icon className="size-3.5 text-muted-foreground" />
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg) => (
            <article
              key={msg.id}
              className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border/70 py-4 last:border-0"
            >
              <div
                className={
                  msg.role === 'user'
                    ? 'flex size-7 items-center justify-center rounded-lg border bg-muted'
                    : 'flex size-7 items-center justify-center rounded-lg bg-foreground text-background'
                }
              >
                {msg.role === 'user' ? (
                  <UserRound className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 text-xs font-medium">
                  {msg.role === 'user' ? 'You' : 'Master'}
                </div>
                {msg.role === 'user' ? (
                  <div className="rounded-lg bg-muted/65 px-3 py-2.5 text-sm leading-6">
                    <pre className="m-0 whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                ) : (
                  <MarkdownBody content={msg.content} />
                )}
              </div>
            </article>
          ))}

          {streaming ? (
            <article className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="size-3.5" />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium">Master</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Working
                  </span>
                </div>
                <MarkdownBody content={streaming} />
              </div>
            </article>
          ) : null}

          {activity.length > 0 ? (
            <details open={isStreaming} className="mb-3 rounded-lg border bg-background">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <Wrench className="size-3.5" />
                {activity.length} tool {activity.length === 1 ? 'event' : 'events'}
              </summary>
              <ul className="space-y-1.5 border-t px-3 py-2">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 font-mono text-[10px]"
                  >
                    <span className="truncate font-medium text-foreground/80">{item.name}</span>
                    <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1.5 font-normal text-[9px]">
                      {item.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form
        className="shrink-0 border-t px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void sendMessage(input)
        }}
      >
        <div className="rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/25">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Master about projects, status, notes…"
            rows={2}
            disabled={isStreaming || !cursorReady}
            className="min-h-16 resize-none border-0 bg-transparent px-3.5 py-3 text-sm shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage(input)
              }
            }}
          />
          <div className="flex items-center justify-between border-t px-2.5 py-2">
            <span className="text-[10px] text-muted-foreground">
              <kbd className="font-mono">Enter</kbd> send
            </span>
            <Button
              type="submit"
              size="icon-sm"
              disabled={isStreaming || !cursorReady || !input.trim()}
              aria-label="Send to Master"
              className="rounded-lg"
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
