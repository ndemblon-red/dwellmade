import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type ImageEventPayload =
  | {
      type: "image_generation.partial_image";
      b64_json: string;
      partial_image_index: number;
      created_at: number;
    }
  | {
      type: "image_generation.completed";
      b64_json: string;
      created_at: number;
    };

export class GenerationLimitError extends Error {
  status: number;
  code: "limit_reached" | "upgrade_required";
  kind: "anonymous" | "paid" | "free";
  used: number;
  limit: number;
  constructor(payload: {
    status: number;
    code: "limit_reached" | "upgrade_required";
    kind: "anonymous" | "paid" | "free";
    used: number;
    limit: number;
  }) {
    super(payload.code);
    this.name = "GenerationLimitError";
    this.status = payload.status;
    this.code = payload.code;
    this.kind = payload.kind;
    this.used = payload.used;
    this.limit = payload.limit;
  }
}

export async function streamImage(
  endpoint: string,
  body: unknown,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  init?: { headers?: Record<string, string> },
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    if (res.status === 402) {
      try {
        const parsed = JSON.parse(text);
        throw new GenerationLimitError({
          status: 402,
          code: parsed.error,
          kind: parsed.kind,
          used: parsed.used ?? 0,
          limit: parsed.limit ?? 0,
        });
      } catch (e) {
        if (e instanceof GenerationLimitError) throw e;
      }
    }
    throw new Error(`Generation failed: ${res.status} ${text}`);
  }

  let sawCompleted = false;
  const parser = createParser({
    onEvent(event) {
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      )
        return;
      let payload: ImageEventPayload;
      try {
        payload = JSON.parse(event.data) as ImageEventPayload;
      } catch {
        return;
      }
      const isFinal = event.event === "image_generation.completed";
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
}
