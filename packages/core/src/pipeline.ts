export type PipelinePhase =
  | "intake"
  | "research"
  | "brief"
  | "plan"
  | "tasks"
  | "delegate"
  | "build"
  | "verify"

/** Where work happens — local codebase vs remote SSH server. */
export type WorkSurface = "local" | "server"

export type ProjectMode = "greenfield" | "continue"

export const PIPELINE_PHASES: PipelinePhase[] = [
  "intake",
  "research",
  "brief",
  "plan",
  "tasks",
  "delegate",
  "build",
  "verify",
]

export type TaskPriority = "P0" | "P1" | "P2"

export type ArisTask = {
  id: string
  title: string
  description: string
  priority: TaskPriority
  phase: PipelinePhase
  status: "pending" | "in_progress" | "done" | "blocked"
  dependsOn?: string[]
}

export type PipelineContext = {
  sessionId: string
  projectId?: string
  workspacePath: string
  userPrompt: string
  phase: PipelinePhase
  tasks: ArisTask[]
  /** continue = enhance existing project; greenfield = new build */
  projectMode: ProjectMode
  workSurface: WorkSurface
  serverId?: string
}

export type PipelineEvent =
  | { type: "phase_start"; phase: PipelinePhase }
  | { type: "phase_complete"; phase: PipelinePhase }
  | { type: "task_created"; task: ArisTask }
  | { type: "assistant_delta"; text: string }
  | { type: "error"; message: string }

export type PipelineEmitter = (event: PipelineEvent) => void

export type PipelineOptions = {
  sessionId: string
  workspacePath: string
  userPrompt: string
  emit: PipelineEmitter
  projectId?: string
  projectMode?: ProjectMode
  workSurface?: WorkSurface
  serverId?: string
  /** When true, skip research (not recommended — Aris always researches by default). */
  skipResearch?: boolean
}

/**
 * Headless orchestrator for the Aris workflow.
 * Phase 1 (research) always runs unless explicitly skipped.
 */
export async function createPipeline(options: PipelineOptions) {
  const ctx: PipelineContext = {
    sessionId: options.sessionId,
    projectId: options.projectId,
    workspacePath: options.workspacePath,
    userPrompt: options.userPrompt,
    phase: "intake",
    tasks: [],
    projectMode: options.projectMode ?? "continue",
    workSurface: options.workSurface ?? "local",
    serverId: options.serverId,
  }

  async function runPhase(phase: PipelinePhase) {
    ctx.phase = phase
    options.emit({ type: "phase_start", phase })

  if (phase === "research" && options.skipResearch) {
      options.emit({ type: "phase_complete", phase })
      return
    }

    // Phase implementations live in @aris/research, @aris/tasks, @aris/agent.
    // This stub advances phases for scaffold; wire real logic in Phase 1.
    if (phase === "research") {
      options.emit({
        type: "assistant_delta",
        text: `[Research phase] Analyzing: "${options.userPrompt.slice(0, 80)}..."\n`,
      })
    }

    options.emit({ type: "phase_complete", phase })
  }

  return {
    context: ctx,
    async runThroughTasks() {
      for (const phase of PIPELINE_PHASES) {
        if (phase === "delegate" || phase === "build" || phase === "verify") {
          break
        }
        await runPhase(phase)
      }
      return ctx
    },
    async runAll() {
      for (const phase of PIPELINE_PHASES) {
        await runPhase(phase)
      }
      return ctx
    },
  }
}
