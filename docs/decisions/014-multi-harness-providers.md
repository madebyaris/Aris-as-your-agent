# ADR 014 — Multi-harness providers (Cursor + OpenRouter)

## Status

Accepted — 2026-07-10

## Context

Aris Studio today runs agents only through `@cursor/sdk` (`local: { cwd }`). That is the strongest harness we have: tools, MCP, Composer, resume, project settings.

Users also want other model routes — cost, availability, experimentation — without abandoning Cursor. OpenRouter is the first alternate: many models behind one key, but **no** Cursor local agent runtime. Pretending parity would lie; shipping a labeled weaker path is honest and improvable.

## Decision

### 1. Provider enum (extensible)

Accounts carry an explicit provider:

| `provider` | Role |
|------------|------|
| `cursor` | **Full harness** — default when a Cursor account exists |
| `openrouter` | **Lite harness** — chat/stream (+ tools later via AI SDK) |

Future providers (Anthropic/OpenAI direct, etc.) reuse the same seam.

### 2. Capability matrix (v1)

| Capability | Cursor | OpenRouter |
|------------|--------|------------|
| Text / SSE stream | Yes | Yes |
| Local tools / MCP / Composer | Yes | No |
| `Agent.resume` / durable agent id | Yes | No (stateless turns) |
| Model catalog | `Cursor.models.list()` | OpenRouter `/api/v1/models` |
| Key validation | `Cursor.me` | `GET /api/v1/auth/key` |

UI must label OpenRouter as a chat harness that we will strengthen over time.

### 3. Model IDs are provider-scoped

Settings store:

- `defaultProvider?: 'cursor' | 'openrouter'`
- `defaultModel?: string` (interpreted in the context of `defaultProvider` / active account provider)

Do not treat a bare model string as globally unique across providers.

### 4. Secrets

Same node-local rules as [ADR 013](./013-node-local-data.md): keys live in `~/.aris/settings.json` (and later Keychain/DPAPI per ADR 010). Never sync. Env fallbacks: `CURSOR_API_KEY`, `OPENROUTER_API_KEY` only when no matching account is active.

### 5. Runtime seam

`@aris/agent` routes `validateApiKey` / `listModels` / `streamArisResponse` by `provider`. Shared prompt builder + SSE event contract (`@aris/stream`). Cursor path unchanged.

## Consequences

- Accounts UI: provider select + badges; model picker loads for the **active** account’s provider.
- Preferred models: [ADR 009](./009-preferred-models.md) remains Cursor-only; OpenRouter has its own short preferred list without hiding the catalog.
- Board/chat runs on OpenRouter emit a one-time `status: openrouter-lite` so the UI can show the weaker harness.
- Improving OpenRouter (tools, MCP bridge, workspace file tools) is follow-on work — not blocked by this ADR.
