import type { OpenClawChatEvent, OpenClawChatInput, OpenClawClient } from "./types";
import { OpenClawGateway } from "./openclaw-gateway";
import { runOpenClawCli } from "./openclaw-cli";
import { buildOpenClawBusinessMessage } from "./openclaw-prompt";
import { retrieveVaultRAG } from "@/lib/vault/rag";

function getGatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789";
}

function getGatewayToken(): string | undefined {
  return process.env.OPENCLAW_GATEWAY_TOKEN;
}

function getDefaultAgentId(): string {
  return process.env.OPENCLAW_DEFAULT_AGENT || "main";
}

function resolveSessionKey(input: OpenClawChatInput): string {
  const agentId = input.agentId || getDefaultAgentId();
  const sessionPart = input.sessionId || "main";
  return `agent:${agentId}:${sessionPart}`;
}

async function* chatViaWebSocket(input: OpenClawChatInput): AsyncGenerator<OpenClawChatEvent> {
  const token = getGatewayToken();
  if (!token) {
    yield {
      type: "error",
      message: "OPENCLAW_GATEWAY_TOKEN not configured. Copy token from ~/.openclaw/openclaw.json",
    };
    return;
  }

  const gateway = new OpenClawGateway({
    url: getGatewayUrl(),
    token,
    agentId: input.agentId || getDefaultAgentId(),
  });

  try {
    await gateway.connect();
    yield { type: "message_start" };

    const vault = await retrieveVaultRAG(input.message).catch(() => ({
      context: "",
      noteCount: 0,
      chunkCount: 0,
      titles: [],
    }));

    for await (const event of gateway.streamChat({
      sessionKey: resolveSessionKey(input),
      message: buildOpenClawBusinessMessage(input.message, vault.context),
      agentId: input.agentId || getDefaultAgentId(),
    })) {
      if (event.type === "chunk") yield event;
      else if (event.type === "error") yield event;
      else if (event.type === "done") yield { type: "done" };
    }
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    gateway.close();
  }
}

async function* chatViaCli(input: OpenClawChatInput): AsyncGenerator<OpenClawChatEvent> {
  try {
    yield { type: "message_start" };
    const text = await runOpenClawCli(input);
    yield { type: "chunk", content: text };
    yield { type: "done" };
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function createOpenClawClient(): OpenClawClient {
  return {
    chat(input: OpenClawChatInput): AsyncGenerator<OpenClawChatEvent> {
      const mode = process.env.OPENCLAW_INTEGRATION_MODE || "ws";
      return mode === "cli" ? chatViaCli(input) : chatViaWebSocket(input);
    },
  };
}
