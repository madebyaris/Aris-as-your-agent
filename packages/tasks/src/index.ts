import { randomUUID } from "node:crypto"
import type { ArisTask, PipelineEmitter, TaskPriority } from "@aris/core"

export type TaskGraph = {
  tasks: ArisTask[]
}

export function createTask(
  title: string,
  options: {
    priority?: TaskPriority
    description?: string
    dependsOn?: string[]
    phase?: ArisTask["phase"]
  } = {},
): ArisTask {
  return {
    id: randomUUID(),
    title,
    description: options.description ?? "",
    priority: options.priority ?? "P1",
    phase: options.phase ?? "build",
    status: "pending",
    dependsOn: options.dependsOn,
  }
}

/** Default scaffold tasks after research — replace with agent-generated tasks in Phase 1. */
export function createDefaultTaskGraph(userPrompt: string, emit?: PipelineEmitter): TaskGraph {
  const tasks: ArisTask[] = [
    createTask("Complete research brief", {
      priority: "P0",
      description: "Competitors, patterns, assets",
      phase: "research",
    }),
    createTask("Scaffold project", {
      priority: "P0",
      description: `Initial structure for: ${userPrompt.slice(0, 60)}`,
    }),
    createTask("Build core pages", { priority: "P0" }),
    createTask("Polish UI and responsive layout", { priority: "P1" }),
    createTask("Add tests for critical paths", { priority: "P2" }),
  ]

  for (const task of tasks) {
    emit?.({ type: "task_created", task })
  }

  return { tasks }
}

export function sortByPriority(tasks: ArisTask[]): ArisTask[] {
  const order: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2 }
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority])
}
