# ADR 009 — Preferred models (Composer 2.5 + Grok 4.5)

## Status

Accepted — 2026-07-10

## Context

Cursor exposes many models via `Cursor.models.list()`. For Aris Studio day-to-day work we want a short preferred set so Accounts and defaults stay calm, while still allowing the full catalog.

## Decision

| Model ID | Label | Role |
|----------|-------|------|
| `composer-2.5` | Composer 2.5 | **Default** for board + project chat / coding agents |
| `grok-4.5` | Cursor Grok 4.5 | Preferred alternate for heavier reasoning / research |

- Default in settings / agent create: `composer-2.5` (`ARIS_DEFAULT_MODEL`).
- Accounts picker sorts preferred IDs first (prefix match if Cursor returns variants).
- Override via Accounts or `CURSOR_MODEL` env.
- Exact Grok slug is confirmed against `list()` per account; UI still labels matches containing `grok-4.5`.

## Consequences

- `@aris/agent` exports `ARIS_PREFERRED_MODELS` + sort helpers.
- Other models remain selectable; we do not hide the catalog.
