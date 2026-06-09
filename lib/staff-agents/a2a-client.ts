/**
 * A2A client wrapper using @a2a-js/sdk ClientFactory.
 * Use to call staff agents from scripts or external services.
 */
import { ClientFactory } from "@a2a-js/sdk/client";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "@a2a-js/sdk";

function getBaseUrl(): string {
  return (
    process.env.ARIES_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000"
  );
}

export async function sendStaffAgentA2AMessage(
  agentId: string,
  text: string
): Promise<string> {
  const base = getBaseUrl();
  const factory = new ClientFactory();
  const client = await factory.createFromUrl(`${base}/api/staff-agents/${agentId}`, "/card");

  const response = await client.sendMessage({
    message: {
      kind: "message",
      messageId: uuidv4(),
      role: "user",
      parts: [{ kind: "text", text }],
    },
  });

  if (response.kind === "message") {
    const msg = response as Message;
    return msg.parts?.map((p) => ("text" in p ? p.text : "")).join("") || "";
  }

  return `[Task ${response.id}] state: ${response.status?.state ?? "unknown"}`;
}
