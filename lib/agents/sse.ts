import type { AgentChatEvent } from "@/lib/agents/types";

export function encodeAgentSSE(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export function agentEventsToResponse(events: AsyncGenerator<AgentChatEvent>): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encodeAgentSSE(event));
        }
      } catch (err) {
        controller.enqueue(
          encodeAgentSSE({
            type: "error",
            message: err instanceof Error ? err.message : "Agent run failed",
          })
        );
      }
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
