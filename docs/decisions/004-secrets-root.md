# ADR 004 — Dedicated secrets root (`~/aris-secrets`)

## Status

Accepted — 2026-07-10

## Context

SSH credentials previously lived under `~/.aris/secrets/servers/`. That path is easy to confuse with app metadata, and a dedicated visible root makes backup/exclude policies clearer (same collision-safety idea as `~/aris-workspace`).

## Decision

- Secrets root: `~/aris-secrets/`
- SSH credentials: `~/aris-secrets/servers/{uuid}.secret` (mode 0600; directory 0700)
- Metadata stays in `~/.aris/servers.json` (`secretRef` only — never the secret body)
- On first access, migrate any files from legacy `~/.aris/secrets/servers/` into the new root (copy; prefer new path thereafter)
- Backups remain under `~/.aris/backups/servers/` until a later ADR moves them

## Consequences

Clearer mental model (metadata vs secrets); safer gitignore/exclude habits; one-time silent migration for existing installs.
