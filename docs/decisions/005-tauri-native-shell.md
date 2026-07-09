# ADR 005 — Native shell via Tauri (next step)

## Status

Accepted — 2026-07-10  
**Not started** — implement after Master chat / core agent loop; do not block current web work.

## Context

Aris Studio is local-first (folder projects, `~/aris-secrets`, Cursor SDK with real `cwd`). A browser tab at `localhost` fights that product shape: Dock/menu bar, OS folder dialogs, Keychain, and “is the server running?” friction.

Options considered:

| Option | Fit |
|--------|-----|
| Stay web-only | Fine for building features; weak as the long-term home |
| Electron shell | Familiar Node story; heavier binary and Chromium tax |
| **Tauri shell** | Thin native host, smaller footprint, good Mac feel; keep React UI |
| SwiftUI rewrite | Throws away TanStack + `@aris/*` — too expensive |

## Decision

- **Next native packaging step: Tauri** wrapping the existing `apps/web` UI.
- Keep the current TanStack Start + `@aris/*` packages as the app logic / local backend; Tauri is a **distribution and OS-integration shell**, not a rewrite.
- Primary target first: **macOS**. Other platforms only if needed later.
- Defer Keychain, menu-bar Master chat shortcut, and native folder pickers until the shell exists — they are consequences of this ADR, not prerequisites.

## Non-goals (for this ADR)

- Rewriting the UI in Rust or Swift
- Dropping the web/dev server workflow for day-to-day feature work
- Shipping notarized releases in the same milestone as Master chat

## Consequences

- Monorepo will gain a Tauri app (e.g. `apps/desktop` or similar) that loads or embeds the Studio UI and talks to the local Node/server process.
- Signing, notarization, and auto-update become release concerns once packaging starts.
- PRD “later: native folder dialog” aligns with this path (see also architecture notes).
