# ENGINEERING.md — How Aris Builds and Continues Software

> This is the engineering contract for Aris-as-your-agent.
> Product philosophy: **software never finishes**. Continuity is the product.
> If runtime behavior and this doc disagree, **runtime is wrong** — fix the code.

---

## 0. The diagnosis (what was fundamentally wrong)

Before Phase Continuity, Aris marketed “continue projects” but the live path was:

```
new UUID session → single message → static system prompt (+ optional notes) → dispose agent
```

That is **chat**, not **engineering**. A senior developer does not wake up Monday and ask the same question again. They open yesterday’s state.

| Failure | Why it broke continuity |
|---------|-------------------------|
| Ephemeral sessions | Every page load minted a new `sessionId`; `lastSessionId` was write-only |
| No transcript | Messages lived only in React memory; refresh erased the thread |
| Specs write-only | Research stubs (if any) were never re-read into the next prompt |
| Pipeline bypassed | `@aris/core` / research / tasks existed but were never on `api/chat` |
| No project state file | There was no `STATE.md` / `.aris/state.json` for “where we left off” |
| Notes unbound | Notes could be created without `projectId`, so agent context drifted |

Fixes below are the **minimum continuous engineering loop**. Features (preview iframe, SSH, subagents) come after this loop is real.

---

## 1. How a senior engineer actually works

Aris models this loop — not “one-shot app builder”:

```
INTAKE → RESEARCH → BRIEF → PLAN → TASKS → BUILD → VERIFY → HAND OFF
                                              ↑_______________|
                                    (software never finishes)
```

On **every return** to a project, an engineer:

1. **Reads state** — open goal, last decisions, blocked items
2. **Reads history** — last session transcript / PR comments / notes
3. **Reads artifacts** — specs, tasks, acceptance criteria
4. **Chooses next P0** — smallest valuable slice
5. **Builds with minimal diffs** — stay in the existing architecture
6. **Writes state back** — so the next session (human or agent) can continue

If step 1–3 or 6 are missing, you are guessing. Guessing does not scale.

---

## 2. Continuity primitives (sources of truth)

### 2.1 Indexes live under `~/.aris/` (machine-local)

| Path | Role |
|------|------|
| `settings.json` | API key, default model |
| `projects.json` | Living project registry |
| `notes.json` | Private + agent notes |
| `sessions.json` | Durable work sessions |
| `transcripts/{sessionId}.jsonl` | Message / tool history |
| `servers.json` + `secrets/` | SSH targets (secrets never in registry) |

### 2.2 Project memory lives **inside the workspace**

Every project workspace owns its own handoff so the repo is portable:

```
{workspace}/.aris/
  state.json          # machine-readable rolling state
  STATE.md            # human-readable handoff (read on Monday)
  decisions.jsonl     # decision log (append-only)
specs/active/
  {featureSlug}/
    research.md
    feature-brief.md
    plan.md
    tasks.md
```

**Rule:** `~/.aris` indexes *where* projects are. Workspace `.aris/` + `specs/` hold *what* is true about the product.

### 2.3 Canonical `state.json` shape

```json
{
  "version": 1,
  "currentGoal": "Add specialty coffee hero section",
  "projectMode": "continue",
  "openTasks": [
    { "id": "t1", "title": "Hero layout", "priority": "P0", "status": "pending" }
  ],
  "decisions": [
    { "id": "d1", "summary": "Warm earth tones only", "at": "2026-07-08T..." }
  ],
  "openQuestions": [],
  "lastSessionId": "...",
  "lastVerifiedAt": null,
  "updatedAt": "..."
}
```

---

## 3. Session model (not disposable UUIDs)

A **WorkSession** is a durable record:

| Field | Meaning |
|-------|---------|
| `id` | Stable session id |
| `projectId?` | Linked living project |
| `workspacePath` | Where code / state lives |
| `status` | `active` \| `paused` \| `done` |
| `cursorAgentId?` | SDK resume handle (when available) |
| `createdAt` / `updatedAt` | — |

### Resume rules

1. Selecting a project → **resume** last `active` session for that project (or create one).
2. Never mint a throwaway UUID that is dropped after navigate away.
3. Chat UI hydrates from `transcripts/{sessionId}.jsonl`.
4. After each successful run → append transcript + update `.aris/state.json` + `STATE.md`.

Greenfield sessions still create `~/.aris/sessions/{id}/` workspaces; promoting them to a registered project is a later step — but they still get a session registry row + transcript.

---

## 4. Prompt assembly (what Aris must see)

`buildArisPrompt()` always receives, in order:

1. Persona / system norms (research-first, minimal diffs)
2. Project mode (`continue` default)
3. **Continuity block** — goal, open tasks, recent decisions, open questions (`state.json` + `STATE.md`)
4. **Agent-visible notes** only (`visibility: agent`, scoped to project)
5. **Recent transcript** (last N turns — never private notes)
6. User request

Private notes must **never** appear in this assembly.

---

## 5. Pipeline vs chat

Chat is the **UI**. The pipeline is the **engineering process**.

For v1 continuity slice:

- Always load continuity context before `agent.send`
- Always persist transcript + state after the stream
- Run / refresh research artifact when none exists for the active feature slug
- Full eight-phase orchestration can remain incremental — **state + transcript first**

Skipping research by default is a product bug. Skipping state load/write is an architecture bug.

---

## 6. Notes discipline

| Visibility | Who sees it | Injected into agent? |
|------------|-------------|----------------------|
| `private` | User UI only | **Never** |
| `agent` | User + Aris | Yes, when linked |

Every note intended for a living product **must** set `projectId` (or `serverId` for SSH work). Unbound agent notes are discarded from continuity context.

---

## 7. Server work (future, but norms are fixed)

Before any SSH mutation:

1. Pre-change note on disk
2. Backup manifesto / snapshot under `~/.aris/backups/servers/`
3. Then mutate
4. On failure, prefer rollback path

Documented in `.cursor/skills/server-safety/SKILL.md`. Continuity for servers uses the same state + decision log patterns.

---

## 8. Definition of done for “continue works”

You can claim continuity when **all** of these pass:

- [ ] Open `/chat`, pick an existing project → **same** session id as last active (or explicit resume)
- [ ] Refresh browser → prior messages reload from transcript
- [ ] Second message’s prompt includes prior state / open tasks
- [ ] After a turn, `{workspace}/.aris/state.json` and `STATE.md` are updated
- [ ] Private notes never appear in prompt assembly tests
- [ ] `lastSessionId` on the project points at a real session that can be loaded

Until then, “software never finishes” is copy, not engineering.

---

## 9. How to continue *this* repo (meta)

When you pick up Aris-as-your-agent itself:

1. Read `PRD.md` (product)
2. Read **this file** (engineering contract)
3. Read `task-list.md` (what’s checked)
4. Run `pnpm typecheck` / `pnpm dev`
5. Prefer the smallest slice that strengthens the continuity loop

Do not add connectors (Trello/Notion/GitHub Issues) or heavy UI chrome before the continuity loop above is green.
