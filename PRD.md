# PRD: Aris-as-your-agent

> **Product:** A local-first developer agent that lets anyone experience working with a senior full-stack engineer (Aris).
>
> **Author:** [Aris Setiawan](https://madebyaris.com) · [github.com/madebyaris](https://github.com/madebyaris)
>
> **Status:** Scaffold / Phase 0 — see [task-list.md](./task-list.md) for implementation progress.

---

## 1. Problem

Most AI coding tools jump straight to code. A senior developer does not. They research competitors, clarify scope, prepare assets, break work into prioritized tasks, delegate, and only then build.

**Aris-as-your-agent** productizes that workflow: research-first, task-driven, locally built — powered by the Cursor SDK.

---

## 2. Vision

> *"Imagine if I'm your all-around developer — battle-tested with 13 years of experience and companies across the globe."*

Users open a lightweight web app, paste a Cursor API key, and describe what they want — e.g. *"Build me a website about specialty coffee."* Aris:

1. Researches the domain (competitors, patterns, assets needed)
2. Writes a brief and prioritized task list
3. Delegates to subagents where appropriate
4. Builds locally in an isolated session workspace
5. Streams progress live (thinking, tool calls, edits)
6. Shows a live preview of the result

No cloud VM required for v1. No git worktree required. Worktrees are an optional power-user feature.

---

## 3. Goals

| Goal | Metric |
|------|--------|
| Feel like a senior dev | Research phase runs before any code for every new request |
| Lightweight stack | TanStack + Vite; no Next.js |
| Local-first | `@cursor/sdk` `local: { cwd }` — build on user's machine |
| Portable work | `PRD.md` + `task-list.md` let anyone continue on desktop or elsewhere |
| Composable architecture | TanStack-style headless packages; UI is a thin adapter |
| Extensible later | GitHub Issues, Trello, Notion as optional connectors (not v1) |

---

## 4. Non-Goals (v1)

- Cloud agent runtime / auto-PR to remote repos
- Git worktrees (optional stub only)
- GitHub / Trello / Notion connectors
- Kanban board UI (Phase 2)
- Multi-user auth / hosted SaaS
- Mobile app

---

## 5. Target Users

| User | Need |
|------|------|
| **Founders / PMs** | See how a senior dev approaches a vague idea |
| **Junior devs** | Learn research → plan → build workflow |
| **Aris's clients** | Experience his process before hiring |
| **Aris himself** | Continue sessions across machines via `task-list.md` |

---

## 6. Architecture Principles (TanStack-style)

1. **Headless core** — `@aris/core` has zero UI dependencies
2. **Framework-agnostic packages** — logic in `packages/`, UI in `apps/web`
3. **Progressive adoption** — use only the packages you need
4. **Explicit server boundary** — Cursor SDK runs only in TanStack Start server routes/functions
5. **Escape hatches** — raw `@cursor/sdk` always reachable via `@aris/agent`

### Monorepo layout

```
aris-as-your-agent/
├── PRD.md                    ← this file
├── task-list.md              ← living implementation checklist
├── packages/
│   ├── core/                 @aris/core      — pipeline, phases, priority
│   ├── agent/                @aris/agent     — Cursor SDK wrapper (local default)
│   ├── workspace/            @aris/workspace — session folders (~/.aris/sessions/)
│   ├── stream/               @aris/stream    — SDKMessage → typed UI events
│   ├── research/             @aris/research  — research phase (stub → full)
│   └── tasks/                @aris/tasks     — task graph, priority (stub → full)
├── apps/
│   └── web/                  TanStack Start + Vite (NOT Next.js)
└── .cursor/                  Aris persona — skills, agents, rules
```

### Tech stack

| Layer | Choice |
|-------|--------|
| Web framework | **TanStack Start** (Vite, server routes, server functions) |
| Routing | TanStack Router |
| Server state | TanStack Query |
| Live stream UI | TanStack Store |
| Long lists | TanStack Virtual |
| Forms | TanStack Form |
| Styling | Tailwind CSS v4 |
| Agent engine | `@cursor/sdk` — `local: { cwd }` |
| Package manager | pnpm workspaces |
| Node | ≥ 22.13 |

---

## 7. Core User Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Onboarding │ ──► │  Chat / Prompt   │ ──► │  Research phase │
│  (API key)  │     │  "Build me X"    │     │  (streamed)     │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                      ┌──────────────────┐     ┌──────▼────────┐
                      │  Live preview    │ ◄── │  Build phase  │
                      │  (iframe)        │     │  (local SDK)  │
                      └──────────────────┘     └───────────────┘
```

### Session workspace

- Default: `~/.aris/sessions/{uuid}/` — isolated folder per session
- Optional: user-provided existing project path as `cwd`
- Optional (later): git worktree for branch isolation

### Minimum SDK config

```typescript
Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2.5" },
  local: {
    cwd: workspacePath,
    settingSources: ["project"], // load .cursor/ from Aris repo when relevant
  },
});
```

---

## 8. Aris Pipeline Phases

Ported from [spec-kit-command-cursor](https://github.com/madebyaris/spec-kit-command-cursor):

| Phase | Name | Output | Skip allowed? |
|-------|------|--------|---------------|
| 0 | **Intake** | Normalized user prompt | No |
| 1 | **Research** | `research.md` — competitors, patterns, assets | **Never** |
| 2 | **Brief** | `feature-brief.md` — scope, constraints | No |
| 3 | **Plan** | `plan.md` — architecture, stack | No (can be lite) |
| 4 | **Tasks** | `tasks.md` + prioritized graph | No |
| 5 | **Delegate** | Subagent assignments | Optional |
| 6 | **Build** | Code in session workspace | No |
| 7 | **Verify** | Smoke check, preview URL | No |

**Rule:** Phase 1 (Research) always runs, even for trivial prompts.

---

## 9. Aris Persona (Senior Developer)

Injected via `.cursor/skills/senior-developer/SKILL.md` and system prompt in `@aris/agent`:

- Ask clarifying questions before large changes
- Research competitors and borrow good patterns explicitly
- Prefer minimal, focused diffs
- Explain tradeoffs in plain language
- Follow existing project conventions
- Write tests for non-trivial logic
- Never ship without understanding context first

### Subagents (from spec-kit, adapted)

| Agent | Role |
|-------|------|
| `aris-researcher` | Competitor scan, asset checklist |
| `aris-planner` | Architecture, task breakdown |
| `aris-implementer` | Code generation (background) |
| `aris-reviewer` | Quality gate before "done" |

---

## 10. Web App (apps/web)

### Routes (planned)

| Route | Purpose |
|-------|---------|
| `/` | Landing + onboarding (API key) |
| `/chat` | Main chat interface |
| `/chat/$sessionId` | Resumed session |
| `/api/chat` | SSE — stream agent events (server route) |
| `/api/health` | Health check |

### Server functions (planned)

| Function | Purpose |
|----------|---------|
| `createSession` | New session + workspace folder |
| `saveApiKey` | Persist to `~/.aris/settings.json` |
| `getSession` | Session metadata |
| `listModels` | `Cursor.models.list()` |

### UI panels

| Panel | Library |
|-------|---------|
| Chat messages | TanStack Virtual |
| Streaming text | TanStack Store |
| Tasks / phases | TanStack Query |
| Preview | `<iframe>` → session Vite dev server |
| API key form | TanStack Form |

---

## 11. Data & Storage

| Data | Location |
|------|----------|
| API key | `~/.aris/settings.json` (local only, never commit) |
| Session workspaces | `~/.aris/sessions/{id}/` |
| Agent persistence | Cursor SDK SQLite (automatic) |
| Spec outputs | `specs/active/{session-id}/` in workspace |
| Project docs | `PRD.md`, `task-list.md` in repo (version controlled) |

---

## 12. Security (v1 — local demo)

- API key stored server-side only (never sent to browser after save)
- SDK runs in Node server process, not client
- No public deployment without auth + per-user storage
- Sandbox off by default (local dev tool); document risks

---

## 13. Phased Roadmap

### Phase 0 — Scaffold ✅ (this PR)

- [x] Monorepo + TanStack Start app
- [x] Headless packages (stubs with types)
- [x] PRD.md + task-list.md
- [x] Basic Aris landing UI
- [x] `.cursor/skills/senior-developer`

### Phase 1 — MVP

- [ ] API key onboarding + session create
- [ ] SSE chat route wired to `@aris/agent`
- [ ] Research-first pipeline (Phase 1 always runs)
- [ ] Stream assistant text + tool calls to UI
- [ ] Session workspace scaffold (Vite template)
- [ ] Preview iframe

### Phase 2 — Task board + polish

- [ ] Kanban UI (`@aris/tasks`)
- [ ] Phase progress indicator
- [ ] Subagent delegation visible in UI
- [ ] Session resume across restarts

### Phase 3 — Connectors

- [ ] `@aris/connector-github` — Issues as intake
- [ ] `@aris/connector-trello`
- [ ] `@aris/connector-notion`

### Phase 4 — Power features

- [ ] Optional git worktree (`@aris/workspace`)
- [ ] CLI (`apps/cli`) aligned with native-cli-ai
- [ ] Cloud runtime option

---

## 14. Success Criteria

**Phase 1 done when:**

1. User can paste API key, send *"Build me a website about coffee"*
2. Research streams before any file is created
3. Task list appears with priorities
4. Agent builds in `~/.aris/sessions/{id}/`
5. Preview loads in iframe
6. `task-list.md` reflects completed work for handoff

---

## 15. References

- [Cursor SDK TypeScript docs](https://cursor.com/docs/api/sdk/typescript)
- [cursor/cookbook](https://github.com/cursor/cookbook) — app-builder (local SSE pattern)
- [spec-kit-command-cursor](https://github.com/madebyaris/spec-kit-command-cursor) — SDD workflow
- [TanStack Start](https://tanstack.com/start/latest)
- [madebyaris.com](https://madebyaris.com)

---

*Last updated: 2026-07-06 — Phase 0 scaffold*
