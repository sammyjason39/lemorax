import { NextResponse } from "next/server";
import { isComposioConfigured, WORKSPACE_INTEGRATION_GROUPS } from "@/lib/composio/config";
import { getStoredComposioSessionId } from "@/lib/composio/session-store";
import { listComposioConnectedAccounts } from "@/lib/composio/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const configured = isComposioConfigured();
    const sessionId = configured ? await getStoredComposioSessionId() : null;
    const accounts = configured ? await listComposioConnectedAccounts() : [];

    return NextResponse.json({
      configured,
      sessionId,
      groups: WORKSPACE_INTEGRATION_GROUPS,
      connectedAccounts: accounts.map((a) => ({
        id: a.id,
        toolkit: a.toolkit,
        status: a.status,
        label: a.label,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}
