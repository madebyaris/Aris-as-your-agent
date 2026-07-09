# ADR 003 — shadcn over island theme

## Status

Accepted — 2026-07-10

## Context

Scaffold used a marketing “island” visual language. Product is an agent studio (kanban + chat), not a landing page.

## Decision

Adopt shadcn/ui dashboard shell (Sidebar, dense tokens, dark-first) with teal brand accent. Retire island chrome inside Studio routes.

## Consequences

- Init shadcn in `apps/web`
- AI Elements for chat surfaces
- Landing page stays minimal; Studio is the product
