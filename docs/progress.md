# Aris Studio v1 — Progress

Living milestone tracker. Update at the end of every milestone with honest proof labels.

**Labels:** `pending` · `in progress` · `verified` · `implemented but unverified` · `blocked`

| Milestone | Status | Date | Evidence / notes |
|-----------|--------|------|------------------|
| M0 — docs/ | verified | 2026-07-10 | docs/ created; PRD + task-list moved; progress/architecture/ui + 3 ADRs |
| M1 — shadcn + Studio shell | verified | 2026-07-10 | shadcn components + OKLCH teal tokens; `_studio` sidebar layout; routes `/studio`, `/notes`, `/servers`, `/accounts`; `pnpm --filter web build` OK |
| M2 — Accounts | verified | 2026-07-10 | accounts migration in `@aris/workspace`; Accounts page with validate + model picker; typecheck OK |
| M3 — Folder projects | verified | 2026-07-10 | `~/aris-workspace` + `.aris-workspace` sidecar; create/open/scratch; create/open dialogs in Studio |
| M4 — Agent + Chat | implemented but unverified | 2026-07-10 | `/api/agent` SSE, resume, onDelta, cancel; StudioChat UI. Live Cursor API smoke not run in this session (needs user key) |
| M5 — Board | implemented but unverified | 2026-07-10 | dnd-kit board, phase runner, promote-to-board. Live phase run not smoke-tested with API key |
| M6 — Notes + Servers | verified | 2026-07-10 | Studio pages + unit test for private-note exclusion; servers registry UI (exec still Phase 2) |
| M7 — Polish + verify | verified | 2026-07-10 | Landing rewrite; vitest 4/4 pass; web build + typecheck pass; demo fake-key seed removed |
| Post-M7 — secrets root + taskbar | verified | 2026-07-10 | `~/aris-secrets/servers` + ADR 004; StudioTaskbar + run context. Evidence: typecheck + vitest 6/6; browser: taskbar + quick menu on `/studio`, servers route loads |

## Blockers

- End-to-end agent chat/board runs need a real `CURSOR_API_KEY` in Accounts — mark M4/M5 `verified` after manual smoke.

## How to update

After each milestone:

1. Set status to a proof label (never claim `verified` without a named check).
2. Add date + evidence (command, screenshot path, or “manual smoke: …”).
3. Sync relevant rows in [task-list.md](./task-list.md).
