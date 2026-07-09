# ADR 001 — Folder per project

## Status

Accepted — 2026-07-10

## Context

Cursor SDK local agents need a real filesystem `cwd`. Browser File System Access API cannot supply that to a Node server process.

## Decision

Every Aris project is a directory on disk. The registry stores a pointer (`workspacePath`). Agent runs always use that path as `cwd`.

## Consequences

- Create = mkdir under parent or `~/aris-workspace/{slug}`
- Open = validate absolute path and register
- Sessions are runs inside the project folder, not orphan dirs
