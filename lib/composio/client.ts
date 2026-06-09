import { Composio } from "@composio/core";
import {
  COMPOSIO_USER_ID,
  isComposioConfigured,
} from "@/lib/composio/config";
import {
  getStoredComposioSessionId,
  saveComposioSessionId,
} from "@/lib/composio/session-store";

let composioSingleton: Composio | null = null;

export function getComposioClient(): Composio {
  if (!isComposioConfigured()) {
    throw new Error("Composio belum dikonfigurasi. Set COMPOSIO_API_KEY di .env.local");
  }
  if (!composioSingleton) {
    composioSingleton = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return composioSingleton;
}

/** Get or create a Composio Tool Router session for Pak Anjas workspace */
export async function getComposioToolRouterSession() {
  const composio = getComposioClient();
  const storedId = await getStoredComposioSessionId();

  if (storedId) {
    try {
      return await composio.use(storedId);
    } catch {
      // Session expired — create fresh below
    }
  }

  const session = await composio.create(COMPOSIO_USER_ID);
  await saveComposioSessionId(session.sessionId);
  return session;
}

export async function authorizeComposioToolkit(
  toolkitSlug: string,
  callbackUrl?: string
) {
  const session = await getComposioToolRouterSession();
  const connectionRequest = await session.authorize(toolkitSlug, {
    callbackUrl: callbackUrl || getComposioCallbackUrl("/dashboard/workspace?composio=connected"),
  });
  return {
    redirectUrl: connectionRequest.redirectUrl,
    connectionRequestId: connectionRequest.id,
  };
}

export function getComposioCallbackUrl(
  returnPath = "/dashboard/workspace?composio=connected"
): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.ARIES_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return `${base}${path}`;
}

export async function listComposioConnectedAccounts() {
  const composio = getComposioClient();
  try {
    const result = await composio.connectedAccounts.list({
      userIds: [COMPOSIO_USER_ID],
      limit: 50,
    });
    return result.items ?? [];
  } catch {
    return [];
  }
}

/** OpenAI-compatible tool definitions from Tool Router session */
export async function getComposioOpenAiTools() {
  const session = await getComposioToolRouterSession();
  return session.tools();
}

/** Execute a Composio tool call via Tool Router session (not composio.tools.execute) */
export async function executeComposioToolCall(toolCall: {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}) {
  const session = await getComposioToolRouterSession();
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }

  const result = await session.execute(toolCall.function.name, args);

  return {
    tool_call_id: toolCall.id,
    role: "tool" as const,
    content: JSON.stringify(result.error ? { error: result.error } : result.data ?? result),
  };
}
