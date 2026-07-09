import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  cancelAgentRunFn,
  getChatHistoryFn,
  getSettings,
  promotePlanFn,
} from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { ArisStreamEvent } from '@aris/stream'
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Code2,
  ListPlus,
  Loader2,
  MessageSquare,
  Search,
  Square,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStudioRun } from './studio-run-context'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

const STARTER_PROMPTS = [
  { icon: Search, label: 'Audit this project', prompt: 'Audit this project and identify the highest-impact next improvement.' },
  { icon: Code2, label: 'Build a feature', prompt: 'Help me shape and build a new feature for this project.' },
  { icon: CheckCircle2, label: 'Review current work', prompt: 'Review the current work and verify what is actually complete.' },
] as const

export function StudioChat({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const { setActiveRun, clearRun } = useStudioRun()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState('')
  const [activity, setActivity] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const historyQuery = useQuery({
    queryKey: ['chat', projectId],
    queryFn: () => getChatHistoryFn({ data: { projectId } }),
  })

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
  }, [messages, streaming])

  const promoteMutation = useMutation({
    mutationFn: (text: string) => {
      const lines = text
        .split('\n')
        .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
        .filter((l) => l.length > 8)
        .slice(0, 12)
        .map((title) => ({ title }))
      return promotePlanFn({ data: { projectId, items: lines } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', projectId] })
      toast.success('Promoted lines to backlog')
    },
  })

  async function sendMessage(message: string) {
    if (!message.trim() || isStreaming) return
    setIsStreaming(true)
    setStreaming('')
    setActivity([])
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: message.trim() },
    ])
    setInput('')

    const runKey = `${projectId}:chat`
    setActiveRun({ runKey, label: 'Chat', projectId })
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: message.trim() }),
      })
      if (!response.ok || !response.body) throw new Error('Failed to connect')

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
            setActivity((a) => [...a, `${payload.name} (${payload.status})`])
          }
          if (eventName === 'error' && payload.type === 'error') {
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
            }
            setStreaming('')
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['chat', projectId] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chat failed')
    } finally {
      setIsStreaming(false)
      clearRun(runKey)
      void cancelAgentRunFn({ data: { runKey } })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/15">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-status-success" />
          <span>Ready</span>
          <span className="text-border">/</span>
          <Badge variant="outline" className="h-5 font-mono text-[10px] font-normal">
            {settingsQuery.data?.defaultModel ?? 'composer-2.5'}
          </Badge>
        </div>
        {isStreaming ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              const runKey = `${projectId}:chat`
              clearRun(runKey)
              void cancelAgentRunFn({ data: { runKey } })
            }}
          >
            <Square className="size-3" />
            Stop
          </Button>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
          {messages.length === 0 && !streaming ? (
            <div className="my-auto py-10">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl border bg-background shadow-xs">
                  <MessageSquare className="size-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">What should we work on?</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Give Aris a direct instruction, ask for an audit, or shape a plan before
                  adding it to the board.
                </p>
              </div>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => void sendMessage(starter.prompt)}
                    className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-3 text-left text-xs font-medium shadow-xs hover:bg-muted/45"
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
              className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border/70 py-5 last:border-0"
            >
              <div
                className={
                  msg.role === 'user'
                    ? 'flex size-7 items-center justify-center rounded-lg border bg-muted'
                    : 'flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground'
                }
              >
                {msg.role === 'user' ? (
                  <UserRound className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex h-5 items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    {msg.role === 'user' ? 'You' : 'Aris'}
                  </span>
                {msg.role === 'assistant' ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground"
                    onClick={() => promoteMutation.mutate(msg.content)}
                  >
                    <ListPlus className="size-3" />
                    Add to board
                  </Button>
                ) : null}
              </div>
                <div
                  className={
                    msg.role === 'user'
                      ? 'rounded-lg bg-muted/65 px-3.5 py-3 text-sm leading-6'
                      : 'text-sm leading-6'
                  }
                >
                  <pre className="m-0 whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            </article>
          ))}
          {streaming ? (
            <article className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-3.5" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium">Aris</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Working
                  </span>
                </div>
                <pre className="m-0 whitespace-pre-wrap font-sans text-sm leading-6">
                  {streaming}
                </pre>
              </div>
            </article>
          ) : null}
          {activity.length > 0 ? (
            <details className="mb-3 rounded-lg border bg-background">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
                {activity.length} tool {activity.length === 1 ? 'event' : 'events'}
              </summary>
              <ul className="space-y-1 border-t px-3 py-2 font-mono text-[10px] text-muted-foreground">
                {activity.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form
        className="shrink-0 border-t bg-background px-3 py-3 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault()
          void sendMessage(input)
        }}
      >
        <div className="mx-auto max-w-3xl rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/25">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Aris to research, plan, build, or review…"
            rows={2}
            disabled={isStreaming}
            className="min-h-20 resize-none border-0 bg-transparent px-3.5 py-3 text-sm shadow-none focus-visible:ring-0"
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
              <span className="mx-1.5">·</span>
              <kbd className="font-mono">Shift Enter</kbd> new line
            </span>
            <Button
              type="submit"
              size="icon-sm"
              disabled={isStreaming || !input.trim()}
              aria-label="Send message"
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
