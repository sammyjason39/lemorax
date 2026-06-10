import { Composio } from "@composio/core";
import type { NextRequest } from "next/server";
import { buildAppUrl } from "@/lib/app-url";
import {
  ALL_WORKSPACE_INTEGRATIONS,
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
  returnPath = "/dashboard/workspace?composio=connected",
  req?: NextRequest,
  requestOrigin?: string
): string {
  return buildAppUrl(returnPath, req, requestOrigin);
}

export type ComposioWorkspaceConnection = {
  id: string;
  toolkit: string;
  status: string;
  label: string | null;
};

const TOOLKIT_LABEL_TOOLS: Record<
  string,
  { tool: string; pick: (data: unknown) => string | null }
> = {
  gmail: {
    tool: "GMAIL_GET_PROFILE",
    pick: (data) => {
      const row = data as { emailAddress?: string } | null | undefined;
      return row?.emailAddress?.trim() || null;
    },
  },
  googlecalendar: {
    tool: "GOOGLECALENDAR_GET_CALENDAR",
    pick: (data) => {
      const row = data as { calendar_data?: { id?: string; summary?: string } } | null | undefined;
      return row?.calendar_data?.id?.trim() || row?.calendar_data?.summary?.trim() || null;
    },
  },
};

async function resolveToolkitAccountLabel(
  session: Awaited<ReturnType<typeof getComposioToolRouterSession>>,
  toolkitSlug: string
): Promise<string | null> {
  const resolver = TOOLKIT_LABEL_TOOLS[toolkitSlug];
  if (!resolver) return null;
  try {
    const result = await session.execute(resolver.tool, {});
    if (result.error) return null;
    return resolver.pick(result.data);
  } catch {
    return null;
  }
}

/** Active platform connections for the Tool Router session (OAuth binds here, not userIds). */
export async function listComposioConnectedAccounts(): Promise<ComposioWorkspaceConnection[]> {
  try {
    const session = await getComposioToolRouterSession();
    const slugs = ALL_WORKSPACE_INTEGRATIONS.map((i) => i.slug);
    const result = await session.toolkits({ toolkits: slugs, limit: 50 });

    const active = (result.items ?? []).filter((item) => {
      const status = item.connection?.connectedAccount?.status?.toUpperCase();
      return item.connection?.isActive === true || status === "ACTIVE";
    });

    const connections = await Promise.all(
      active.map(async (item) => {
        const toolkit = item.slug.toLowerCase();
        const status = item.connection?.connectedAccount?.status ?? "ACTIVE";
        const label = await resolveToolkitAccountLabel(session, toolkit);
        return {
          id: item.connection?.connectedAccount?.id ?? "",
          toolkit,
          status,
          label,
        };
      })
    );

    return connections;
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
