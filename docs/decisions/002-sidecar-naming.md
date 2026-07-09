# ADR 002 — Sidecar naming (`.aris-workspace`)

## Status

Accepted — 2026-07-10

## Context

Generic names (`.aris`, `workspace`, `workspaces`) collide with user folders and cause data loss risk.

## Decision

- App data home: `~/.aris/` (settings, registries; secrets moved — see ADR 004)
- Default project parent: `~/aris-workspace/`
- Per-project sidecar: `{workspace}/.aris-workspace/` with schema marker in `aris.json`
- Refuse to overwrite an unrecognized `.aris-workspace/`
- Auto-append sidecar to project `.gitignore` on create

## Consequences

Distinctive names; safer open-existing flow; sidecar stays out of git by default.
