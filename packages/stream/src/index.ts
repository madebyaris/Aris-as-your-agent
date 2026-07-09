/**
 * Normalized stream events for the Aris Studio UI.
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
  | { type: "agent_id"; agentId: string }
  | { type: "run_id"; runId: string }
  | { type: "error"; message: string }
  | { type: "done"; ok: boolean; proofLabel?: string }

export type StreamEmitter = (event: ArisStreamEvent) => void
