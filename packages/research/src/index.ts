import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { PipelineEmitter } from "@aris/core"

export type ResearchInput = {
  sessionId: string
  workspacePath: string
  userPrompt: string
  emit: PipelineEmitter
}

export type ResearchOutput = {
  markdown: string
  outputPath: string
}

/**
 * Phase 1 — always runs. Writes specs/active/{sessionId}/research.md.
 * Full implementation uses agent + web search in Phase 1.
 */
export async function runResearchPhase(input: ResearchInput): Promise<ResearchOutput> {
  const outputDir = join(input.workspacePath, "specs", "active", input.sessionId)
  const outputPath = join(outputDir, "research.md")

  const markdown = `# Research: ${input.userPrompt.slice(0, 80)}

## Status
Scaffold — Phase 1 will populate competitor analysis, patterns, and assets.

## User request
${input.userPrompt}

## Next steps
- [ ] Competitor / reference scan
- [ ] Patterns to adopt
- [ ] Asset checklist (copy, imagery, brand)
- [ ] Recommended stack
`

  await writeFile(outputPath, markdown, "utf8")

  input.emit({ type: "phase_start", phase: "research" })
  input.emit({
    type: "assistant_delta",
    text: `Research brief saved to \`${outputPath}\`\n`,
  })
  input.emit({ type: "phase_complete", phase: "research" })

  return { markdown, outputPath }
}
