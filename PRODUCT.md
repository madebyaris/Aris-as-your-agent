# Product

## Register

product

## Users

Aris Studio serves founders, product managers, junior developers, clients, and experienced developers who want a visible, controllable senior-engineering workflow. They use it on a desktop while actively working on local codebases, switching between project status, agent execution, notes, and infrastructure context.

Their primary job is to continue a living software project with confidence: understand what is happening, give direct instructions, run structured work through a board, and verify the result without losing project context.

## Product Purpose

Aris Studio is a local-first workspace around the Cursor SDK. It combines an executable kanban process with immediate chat, persistent folder-backed projects, notes, account configuration, and server context.

The long-term shape is **Master (control) vs Child (project execution)**. Mac app and mobile web are Studio clients; **Hermes** (e.g. WhatsApp) is an external commander that can drive both Master and project/Child work. Project execution may later run on a dedicated **workstation node** (including Windows 11). See [ADR 008](./docs/decisions/008-master-child-hermes-workstation.md).

Success means the product feels calmer and more trustworthy than a raw agent terminal while preserving expert-level control. A user should understand the current project, the next useful action, and what the agent is doing within seconds.

## Brand Personality

Calm, precise, experienced.

Aris speaks and behaves like a senior engineer: direct without being cold, opinionated without being theatrical, and transparent about what is verified versus assumed.

## Anti-references

- Generic admin templates made from repeated equal-sized cards.
- Marketing-dashboard hybrids with gradients, oversized metrics, or decorative glass.
- Chat-only AI products that hide tool activity and project state.
- Terminal clones that expose raw complexity without useful structure.
- Overly colorful kanban tools where status becomes visual noise.
- Forms that dominate an entire page when the user is usually browsing existing data.

## Design Principles

1. **Context before controls.** Always show which project, path, model, and execution state the user is acting on.
2. **The workflow stays visible.** Board phases, agent activity, and proof status should be understandable without reading a transcript.
3. **Progressive disclosure.** Browsing is calm and dense; forms and advanced controls appear only when requested.
4. **Expert confidence.** Prefer familiar developer-tool patterns, exact language, and predictable interactions over novelty.
5. **Local ownership is tangible.** Paths, project folders, privacy boundaries, and storage locations are presented clearly when relevant.

## Accessibility & Inclusion

- Target WCAG 2.2 AA contrast and keyboard operation.
- Never rely on color alone for phase, proof, visibility, or connection status.
- Honor reduced-motion preferences.
- Preserve legible density at 1280px and above, with structural mobile collapse.
- Maintain visible focus states and descriptive labels for icon-only controls.
