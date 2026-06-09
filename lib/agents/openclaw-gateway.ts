import WebSocket from "ws";
import { randomUUID } from "node:crypto";

type GatewayFrame =
  | { type: "event"; event: string; payload?: Record<string, unknown> }
  | { type: "res"; id: string; ok: boolean; payload?: unknown; error?: unknown };

type ChatPayload = {
  runId?: string;
  state?: string;
  deltaText?: string;
  errorMessage?: string;
  message?: {
    content?: Array<{ type?: string; text?: string }>;
  };
};

export type OpenClawGatewayOptions = {
  url: string;
  token: string;
  agentId?: string;
  timeoutMs?: number;
};

export class OpenClawGateway {
  private ws: WebSocket | null = null;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  constructor(private readonly opts: OpenClawGatewayOptions) {}

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      ws.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))));

      ws.on("message", (raw) => {
        let frame: GatewayFrame;
        try {
          frame = JSON.parse(raw.toString()) as GatewayFrame;
        } catch {
          return;
        }

        if (frame.type === "event" && frame.event === "connect.challenge") {
          this.request("connect", {
            minProtocol: 4,
            maxProtocol: 4,
            client: {
              id: "gateway-client",
              version: "1.0.0",
              platform: process.platform,
              mode: "backend",
            },
            role: "operator",
            scopes: ["operator.read", "operator.write"],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: this.opts.token },
            locale: "en-US",
            userAgent: "lemorax-aries/1.0.0",
          })
            .then(() => {
              if (settled) return;
              settled = true;
              resolve();
            })
            .catch(fail);
          return;
        }

        if (frame.type === "res") {
          const pending = this.pending.get(frame.id);
          if (!pending) return;
          this.pending.delete(frame.id);
          if (frame.ok) pending.resolve(frame.payload);
          else pending.reject(new Error(formatGatewayError(frame.error)));
        }
      });

      ws.on("close", (code, reason) => {
        const err = new Error(`Gateway closed (${code}): ${reason.toString()}`);
        this.pending.forEach((pending) => pending.reject(err));
        this.pending.clear();
        if (!settled) fail(err);
      });
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Gateway not connected"));
    }

    const id = randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  async *streamChat(params: {
    sessionKey: string;
    message: string;
    agentId?: string;
    timeoutMs?: number;
  }): AsyncGenerator<{ type: "chunk"; content: string } | { type: "done" } | { type: "error"; message: string }> {
    const runId = randomUUID();
    const agentId = params.agentId ?? this.opts.agentId ?? "main";
    const timeoutMs = params.timeoutMs ?? this.opts.timeoutMs ?? 45_000;
    const ws = this.ws;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      yield { type: "error", message: "Gateway not connected" };
      return;
    }

    const queue: Array<
      { type: "chunk"; content: string } | { type: "done" } | { type: "error"; message: string }
    > = [];
    let notify: (() => void) | null = null;
    let finished = false;
    let sawDelta = false;

    const push = (
      event: { type: "chunk"; content: string } | { type: "done" } | { type: "error"; message: string }
    ) => {
      queue.push(event);
      notify?.();
    };

    const onMessage = (raw: WebSocket.RawData) => {
      let frame: GatewayFrame;
      try {
        frame = JSON.parse(raw.toString()) as GatewayFrame;
      } catch {
        return;
      }

      if (frame.type !== "event" || frame.event !== "chat") return;
      const payload = frame.payload as ChatPayload | undefined;
      if (!payload || payload.runId !== runId) return;

      if (payload.state === "delta" && payload.deltaText) {
        sawDelta = true;
        push({ type: "chunk", content: payload.deltaText });
      }

      if (payload.state === "final" || payload.state === "error" || payload.state === "aborted") {
        ws.off("message", onMessage);
        finished = true;

        if (payload.state === "error" || payload.state === "aborted") {
          let text = "";
          if (payload.message?.content) {
            for (const block of payload.message.content) {
              if (block?.type === "text" && block.text) text += block.text;
            }
          }
          push({
            type: "error",
            message: payload.errorMessage || text || "OpenClaw agent run failed",
          });
          return;
        }

        if (!sawDelta && payload.message?.content) {
          let finalText = "";
          for (const block of payload.message.content) {
            if (block?.type === "text" && block.text) finalText += block.text;
          }
          if (finalText) push({ type: "chunk", content: finalText });
        }

        push({ type: "done" });
      }
    };

    ws.on("message", onMessage);

    try {
      await this.request("chat.send", {
        sessionKey: params.sessionKey,
        agentId,
        message: params.message,
        idempotencyKey: runId,
        timeoutMs,
      });
    } catch (err) {
      ws.off("message", onMessage);
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
      return;
    }

    const deadline = Date.now() + timeoutMs;
    while (!finished || queue.length > 0) {
      if (queue.length === 0) {
        if (Date.now() > deadline) {
          ws.off("message", onMessage);
          yield { type: "error", message: "OpenClaw response timed out" };
          return;
        }
        await new Promise<void>((resolve) => {
          notify = resolve;
          setTimeout(resolve, 250);
        });
        notify = null;
        continue;
      }

      const event = queue.shift()!;
      yield event;
      if (event.type === "done" || event.type === "error") return;
    }
  }
}

function formatGatewayError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return JSON.stringify(error);
}
