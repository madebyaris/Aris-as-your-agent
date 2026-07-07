/**
 * Normalized stream events for the Aris web UI.
 * Maps from @cursor/sdk SDKMessage in Phase 1.
 */
export type ArisStreamEvent =
  | { type: "assistant_delta"; text: string }
  | { type: "thinking"; id?: string; text: string }
  | {
      type: "tool_call"
      callId?: string
      name: string
      status: string
      args?: unknown
    }
  | { type: "phase"; phase: string; status: "start" | "complete" }
  | { type: "status"; status: string; message?: string }
  | { type: "error"; message: string }
  | { type: "done"; ok: boolean }

export type StreamEmitter = (event: ArisStreamEvent) => void

/** Stub mapper — replace with real SDKMessage handling in Phase 1. */
export function emitPlaceholderResponse(
  userMessage: string,
  emit: StreamEmitter,
) {
  emit({ type: "phase", phase: "research", status: "start" })
  emit({
    type: "assistant_delta",
    text: `Researching your request: "${userMessage}"\n\n`,
  })
  emit({
    type: "assistant_delta",
    text:
      "*(SDK not connected yet — Phase 1 will wire @cursor/sdk here.)*\n\n" +
      "As a senior developer, I would first:\n" +
      "1. Scan competitors and patterns\n" +
      "2. List assets needed (copy, images, brand direction)\n" +
      "3. Propose stack and prioritized tasks\n" +
      "4. Only then start building in your local session workspace.\n",
  })
  emit({ type: "phase", phase: "research", status: "complete" })
  emit({ type: "done", ok: true })
}
