# Aris Studio v1 — Progress

Living milestone tracker. Update at the end of every milestone with honest proof labels.

**Labels:** `pending` · `in progress` · `verified` · `implemented but unverified` · `blocked`

| Milestone | Status | Date | Evidence / notes |
|-----------|--------|------|------------------|
| M0 — docs/ | verified | 2026-07-10 | docs/ created; PRD + task-list moved; progress/architecture/ui + 3 ADRs |
| M1 — shadcn + Studio shell | verified | 2026-07-10 | shadcn components + OKLCH teal tokens; `_studio` sidebar layout; routes `/studio`, `/notes`, `/servers`, `/accounts`; `pnpm --filter web build` OK |
| M2 — Accounts | verified | 2026-07-10 | Multi-provider accounts (Cursor + OpenRouter); migrate + Accounts UI; typecheck + vitest OK |
| M3 — Folder projects | verified | 2026-07-10 | `~/aris-workspace` + `.aris-workspace` sidecar; create/open/scratch; create/open dialogs in Studio |
| M4 — Agent + Chat | implemented but unverified | 2026-07-10 | `/api/agent` SSE, resume, onDelta, cancel; StudioChat UI. Live Cursor API smoke not run in this session (needs user key) |
| M5 — Board | implemented but unverified | 2026-07-10 | dnd-kit board, phase runner, promote-to-board. Live phase run not smoke-tested with API key |
| M6 — Notes + Servers | verified | 2026-07-10 | Studio pages + unit test for private-note exclusion; servers registry UI (exec still Phase 2) |
| M7 — Polish + verify | verified | 2026-07-10 | Landing rewrite; vitest 4/4 pass; web build + typecheck pass; demo fake-key seed removed |
| Post-M7 — secrets root + taskbar | verified | 2026-07-10 | `~/aris-secrets/servers` + ADR 004; StudioTaskbar + run context. Evidence: typecheck + vitest 6/6; browser: taskbar + quick menu on `/studio`, servers route loads |
| Planned — Tauri native shell | pending | 2026-07-10 | [ADR 005](./decisions/005-tauri-native-shell.md) accepted: wrap `apps/web` after Master chat / core loop |
| Planned — local memory ranking | pending | 2026-07-10 | [ADR 006](./decisions/006-local-memory-ranking.md): BM25 + logic weights; no external LLM re-ranker |
| Planned — MCP registry | pending | 2026-07-10 | [ADR 007](./decisions/007-mcp-registry.md): manual + tool-add + login; Aris-owned secrets/OAuth |
| Planned — Master/Child + Hermes + workstation | pending | 2026-07-10 | [ADR 008](./decisions/008-master-child-hermes-workstation.md): dual agents; Hermes→Master + Child; Win11 node later |
| Preferred models | verified | 2026-07-10 | [ADR 009](./decisions/009-preferred-models.md) Cursor prefs; OpenRouter preferred list in [ADR 014](./decisions/014-multi-harness-providers.md) |
| Multi-harness providers | verified | 2026-07-10 | [ADR 014](./decisions/014-multi-harness-providers.md): provider router in `@aris/agent`; OpenRouter lite stream |
| Planned — Studio unlock + Command auth | pending | 2026-07-10 | [ADR 010](./decisions/010-studio-unlock-and-command-auth.md): password/biometric unlock; Hermes device tokens; Master/Child ACL |
| Planned — Always-on node | pending | 2026-07-10 | [ADR 011](./decisions/011-always-on-node.md): daemon for local/workstation; UI optional; after ADR 010 |
| Planned — Cloudflare remote / phone | pending | 2026-07-10 | [ADR 012](./decisions/012-cloudflare-zero-trust-remote.md): Zero Trust + Tunnel → `agent.madebyaris.com` |
| Planned — Node-local data | pending | 2026-07-10 | [ADR 013](./decisions/013-node-local-data.md): decentralized SoT; secrets never sync; optional non-secret sync |

## Blockers

- End-to-end agent chat/board runs need a real Cursor or OpenRouter key in Accounts — mark M4/M5 `verified` after manual smoke.

## How to update

After each milestone:

1. Set status to a proof label (never claim `verified` without a named check).
2. Add date + evidence (command, screenshot path, or “manual smoke: …”).
3. Sync relevant rows in [task-list.md](./task-list.md).
