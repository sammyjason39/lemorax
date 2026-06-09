import type { AgentCard, Message } from "@a2a-js/sdk";
import {
  AgentExecutor,
  DefaultExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
  RequestContext,
  type ExecutionEventBus,
} from "@a2a-js/sdk/server";
import { v4 as uuidv4 } from "uuid";
import type { StaffAgent } from "@/lib/staff-agents/types";
import { collectStaffAgentReply } from "@/lib/staff-agents/llm";
import { listMessages } from "@/lib/staff-agents/store";

function getBaseUrl(): string {
  return (
    process.env.ARIES_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000"
  );
}

export function buildAgentCard(agent: StaffAgent): AgentCard {
  const base = getBaseUrl();
  return {
    name: agent.name,
    description: agent.description,
    protocolVersion: "0.3.0",
    version: "1.0.0",
    url: `${base}/api/staff-agents/${agent.id}/a2a/jsonrpc`,
    skills: agent.skills.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
    })),
    capabilities: { pushNotifications: false },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    additionalInterfaces: [
      {
        url: `${base}/api/staff-agents/${agent.id}/a2a/jsonrpc`,
        transport: "JSONRPC",
      },
    ],
  };
}

class StaffAgentExecutor implements AgentExecutor {
  constructor(private readonly agent: StaffAgent) {}

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const userText =
      requestContext.userMessage.parts
        ?.map((p) => ("text" in p ? p.text : ""))
        .join("")
        .trim() || "";

    const dmConvId = `dm-${this.agent.id}`;
    const history = await listMessages(dmConvId);

    const reply = await collectStaffAgentReply(this.agent, userText, history);

    const responseMessage: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "agent",
      parts: [{ kind: "text", text: reply }],
      contextId: requestContext.contextId,
    };

    eventBus.publish(responseMessage);
    eventBus.finished();
  }

  cancelTask = async (): Promise<void> => {};
}

const handlerCache = new Map<string, DefaultRequestHandler>();

export function getStaffA2AHandler(agent: StaffAgent): DefaultRequestHandler {
  const cached = handlerCache.get(agent.id);
  if (cached) return cached;

  const card = buildAgentCard(agent);
  const handler = new DefaultRequestHandler(card, new InMemoryTaskStore(), new StaffAgentExecutor(agent));
  handlerCache.set(agent.id, handler);
  return handler;
}

export function invalidateStaffA2AHandler(agentId: string) {
  handlerCache.delete(agentId);
}

export async function sendViaA2A(agent: StaffAgent, text: string, contextId?: string): Promise<string> {
  const handler = getStaffA2AHandler(agent);
  const message: Message = {
    kind: "message",
    messageId: uuidv4(),
    role: "user",
    parts: [{ kind: "text", text }],
    contextId: contextId ?? uuidv4(),
  };

  const bus = new DefaultExecutionEventBus();
  const result = await handler.sendMessage({ message });

  if (result.kind === "message") {
    return result.parts?.map((p) => ("text" in p ? p.text : "")).join("") || "";
  }

  void bus;
  return "Agent mengembalikan task — cek dashboard untuk detail.";
}
