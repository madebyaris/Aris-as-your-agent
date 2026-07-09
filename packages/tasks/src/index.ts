import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import type { TaskPriority } from "@aris/core"
import { getSidecarPath } from "@aris/projects"

export type BoardColumn =
  | "backlog"
  | "research"
  | "plan"
  | "build"
  | "review"
  | "done"

export const BOARD_COLUMNS: BoardColumn[] = [
  "backlog",
  "research",
  "plan",
  "build",
  "review",
  "done",
]

export type ProofLabel = "verified" | "implemented-but-unverified" | "blocked"

export type BoardTask = {
  id: string
  title: string
  description: string
  priority: TaskPriority
  column: BoardColumn
  agentRunId?: string
  artifacts: string[]
  proofLabel?: ProofLabel
  createdAt: string
  updatedAt: string
}

export type TasksStore = {
  version: 1
  tasks: BoardTask[]
}

function tasksPath(workspacePath: string) {
  return join(getSidecarPath(workspacePath), "tasks.json")
}

export async function readTasksStore(workspacePath: string): Promise<TasksStore> {
  try {
    const raw = await readFile(tasksPath(workspacePath), "utf8")
    return JSON.parse(raw) as TasksStore
  } catch {
    return { version: 1, tasks: [] }
  }
}

export async function writeTasksStore(workspacePath: string, store: TasksStore) {
  await mkdir(getSidecarPath(workspacePath), { recursive: true })
  await writeFile(tasksPath(workspacePath), JSON.stringify(store, null, 2), "utf8")
}

export async function createBoardTask(
  workspacePath: string,
  input: {
    title: string
    description?: string
    priority?: TaskPriority
    column?: BoardColumn
  },
): Promise<BoardTask> {
  const store = await readTasksStore(workspacePath)
  const now = new Date().toISOString()
  const task: BoardTask = {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? "",
    priority: input.priority ?? "P1",
    column: input.column ?? "backlog",
    artifacts: [],
    createdAt: now,
    updatedAt: now,
  }
  store.tasks.push(task)
  await writeTasksStore(workspacePath, store)
  return task
}

export async function updateBoardTask(
  workspacePath: string,
  taskId: string,
  patch: Partial<
    Pick<
      BoardTask,
      | "title"
      | "description"
      | "priority"
      | "column"
      | "agentRunId"
      | "artifacts"
      | "proofLabel"
    >
  >,
): Promise<BoardTask | null> {
  const store = await readTasksStore(workspacePath)
  const index = store.tasks.findIndex((t) => t.id === taskId)
  if (index === -1) return null

  if (patch.column === "done") {
    const current = store.tasks[index]
    const proof = patch.proofLabel ?? current.proofLabel
    if (proof !== "verified" && proof !== "implemented-but-unverified") {
      throw new Error("Cannot move to Done without a proof label from Review.")
    }
  }

  store.tasks[index] = {
    ...store.tasks[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await writeTasksStore(workspacePath, store)
  return store.tasks[index]
}

export async function createTasksFromPlan(
  workspacePath: string,
  items: Array<{ title: string; description?: string; priority?: TaskPriority }>,
): Promise<BoardTask[]> {
  const created: BoardTask[] = []
  for (const item of items) {
    created.push(
      await createBoardTask(workspacePath, {
        title: item.title,
        description: item.description,
        priority: item.priority ?? "P1",
        column: "backlog",
      }),
    )
  }
  return created
}

/** @deprecated scaffold helper — prefer createBoardTask */
export function createTask(
  title: string,
  options: {
    priority?: TaskPriority
    description?: string
    dependsOn?: string[]
    phase?: string
  } = {},
) {
  return {
    id: randomUUID(),
    title,
    description: options.description ?? "",
    priority: options.priority ?? "P1",
    phase: options.phase ?? "build",
    status: "pending" as const,
    dependsOn: options.dependsOn,
  }
}

/** @deprecated */
export function createDefaultTaskGraph(userPrompt: string) {
  return {
    tasks: [
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
    ],
  }
}

export function sortByPriority<T extends { priority: TaskPriority }>(tasks: T[]): T[] {
  const order: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2 }
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority])
}

export function phasePrompt(column: BoardColumn, task: BoardTask): string | null {
  switch (column) {
    case "research":
      return [
        `You are in the RESEARCH phase for task: ${task.title}`,
        task.description,
        "Write findings to specs/active/" + task.id + "/research.md",
        "Cover competitors, patterns worth copying, assets needed, and recommended stack.",
        "Do not write application code yet.",
      ].join("\n")
    case "plan":
      return [
        `You are in the PLAN phase for task: ${task.title}`,
        task.description,
        "Write a concise plan to specs/active/" + task.id + "/plan.md",
        "Include architecture, file touch list, and P0/P1/P2 breakdown.",
        "Do not implement yet.",
      ].join("\n")
    case "build":
      return [
        `You are in the BUILD phase for task: ${task.title}`,
        task.description,
        "Implement the plan with minimal focused diffs in this workspace.",
        "Follow existing conventions. Prefer small vertical slices.",
      ].join("\n")
    case "review":
      return [
        `You are in the REVIEW / VERIFY phase for task: ${task.title}`,
        "Inspect the workspace changes for this task.",
        "Respond with a final line exactly one of:",
        "PROOF: verified",
        "PROOF: implemented-but-unverified",
        "PROOF: blocked",
        "Explain briefly why.",
      ].join("\n")
    default:
      return null
  }
}

export function sdkModeForColumn(column: BoardColumn): "plan" | "agent" | undefined {
  if (column === "research" || column === "plan" || column === "review") return "plan"
  if (column === "build") return "agent"
  return undefined
}
