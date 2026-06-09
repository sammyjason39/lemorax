import { NextRequest } from "next/server";
import { runStaffConversationChat } from "@/lib/staff-agents/chat";

export const runtime = "nodejs";

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message } = await req.json();
    if (!conversationId || !message?.trim()) {
      return Response.json({ error: "conversationId and message required" }, { status: 400 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of runStaffConversationChat(conversationId, message.trim())) {
            controller.enqueue(sse(event));
          }
        } catch (err) {
          controller.enqueue(
            sse({
              type: "error",
              message: err instanceof Error ? err.message : "Chat failed",
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
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
