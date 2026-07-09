# Aris Studio Design System

## Overview

Aris Studio uses a restrained, monochrome developer-workbench aesthetic. The interface should feel native to long working sessions: crisp, quiet, dense, and highly legible. Visual hierarchy comes from spacing, typography, borders, and surface contrast rather than decoration.

The memorable element is the **workflow rail**: project context and agent state remain visible while the user moves between Board and Chat.

**Brand mark:** astronaut silhouette (calm, geometric). Source: [`brand/aris-studio-logo.png`](./brand/aris-studio-logo.png); app uses `/aris-logo.png` and `/favicon.png`.

## Theme

- Primary scene: a developer or founder working on a 27-inch monitor for an extended session in normal office or home lighting.
- Light mode is the default for clarity and broad use; dark mode is a first-class equivalent for dim environments.
- Color strategy: restrained, warm-neutral black and white with semantic colors reserved for connection, warning, destructive actions, and verified status.
- No gradients, glass effects, decorative shadows, or tinted brand washes.

## Color

Use OKLCH tokens only.

- Background: near-white warm neutral, not pure white.
- Foreground: near-black warm neutral, not pure black.
- Sidebar: one subtle neutral step away from content.
- Muted surface: used for board canvas, hover, empty states, and secondary controls.
- Borders: hairline, low contrast, consistent across all surfaces.
- Primary: monochrome inverse action.
- Semantic green: connected / verified only.
- Semantic amber: unverified / attention only.
- Semantic red: destructive / failed only.

## Typography

- UI: Inter, with system fallback.
- Code and paths: Geist Mono.
- Base size: 14px.
- Page title: 20px, semibold, tight tracking.
- Section title: 14px, semibold.
- Labels: 12px, medium.
- Metadata: 11–12px.
- Avoid uppercase except compact category labels and keyboard hints.

## Layout

- Sidebar: 240–256px expanded, 48px collapsed.
- Top command bar: 52–56px.
- Content max width for settings and prose: 1120px.
- Board and chat use the full available workspace.
- Page gutters: 24px desktop, 16px small screens.
- Use rows, separators, and split panes before cards.
- Forms open in sheets or focused inline regions when browsing is the primary task.

## Components

### App shell

- Flat sidebar with logo, primary navigation, project list, and connection state.
- Top command bar includes current location, global command trigger, and create action.
- Floating taskbar (workflow rail) at the bottom: project context, quick menu, model/connection or Stop when a run is active, theme.
- Active navigation uses a quiet neutral fill plus weight, never a bright accent.

### Project overview

- Recent projects render as a high-signal list with name, path, mode, updated time, and action.
- New/open/scratch actions are grouped in one compact start panel.
- Empty state teaches the create versus open decision.

### Board

- Horizontal phase columns on a subtle canvas.
- Task cards are compact work objects with title, priority, proof, and optional description.
- Empty columns show a quiet instruction.
- Moving to an executable phase communicates that an agent run will begin.

### Chat

- Assistant messages read as document flow, not bubbles.
- User messages use a subtle contained surface.
- Composer is a focused bottom workbench with keyboard guidance and run state.
- Tool activity is compact and collapsible.
- Empty state provides task-relevant starter prompts.

### Settings, notes, servers

- Browse existing items as rows.
- Create/edit forms open in a right sheet.
- Page headers carry the main action.
- Empty states contain one direct next action.

## Motion

- 150–200ms transitions for hover, sidebar, sheets, and disclosure.
- Use ease-out-quart or similar.
- No decorative entrance sequences.
- Respect `prefers-reduced-motion`.

## Responsive behavior

- Sidebar becomes a sheet on mobile.
- Page headers stack actions below titles.
- Lists retain metadata but allow paths to truncate.
- Board remains horizontally scrollable.
- Settings split layouts collapse to one column.
