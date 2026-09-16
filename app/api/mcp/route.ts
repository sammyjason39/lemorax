import type { NextRequest } from "next/server";
import { isMcpAuthorized, MCP_SCHEMA_HINT } from "@/lib/mcp/shared";
import { mcpTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";

const PROTOCOL_VERSION = "2025-06-18";

type JsonRpcId = string | number | null;

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

export async function GET() {
  return Response.json({
    name: "lemorax-airin",
    title: "Lemorax AIRIN Business Data",
    version: "1.0.0",
    protocol: "MCP (Streamable HTTP, stateless JSON-RPC)",
    endpoint: "/api/mcp",
    auth: "Bearer AIRIN_MCP_TOKEN",
    hint:
      "POST JSON-RPC 2.0 messages here. Tools: " +
      mcpTools.map((t) => t.name).join(", "),
  });
}

export async function POST(req: NextRequest) {
  if (!isMcpAuthorized(req)) {
    return Response.json(
      rpcError(null, ERR_INVALID_REQUEST, "Unauthorized — set Authorization: Bearer <AIRIN_MCP_TOKEN>"),
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="lemorax-mcp"' },
      }
    );
  }

  const accept = req.headers.get("accept") || "";
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) {
    return Response.json(
      rpcError(null, ERR_INVALID_REQUEST, "Accept must include application/json"),
      { status: 406 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(rpcError(null, ERR_PARSE, "Invalid JSON"), { status: 400 });
  }

  const messages: unknown[] = Array.isArray(body) ? body : [body];
  const responses: unknown[] = [];

  for (const msg of messages) {
    const response = await handleMessage(msg);
    if (response !== null) responses.push(response);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }

  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

async function handleMessage(msg: unknown): Promise<unknown | null> {
  const m = msg as JsonRpcMessage;

  if (!m || typeof m !== "object" || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
    const id = m && typeof m === "object" && "id" in m ? (m.id as JsonRpcId) : null;
    return rpcError(id, ERR_INVALID_REQUEST, "Not a valid JSON-RPC 2.0 request");
  }

  const id = m.id ?? null;
  const isNotification = m.id === undefined || m.id === null;

  try {
    switch (m.method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: "lemorax-airin",
            title: "Lemorax AIRIN Business Data",
            version: "1.0.0",
          },
          instructions:
            "MCP server for the Lemorax (AIRIN) business dashboard. " +
            "Query business data (sales, finance, HR, KPI, CRM, marketing, social media) and manage the Instagram content plan Kanban. " +
            `Constraints: ${MCP_SCHEMA_HINT.notes.join(" ")}`,
        });

      case "notifications/initialized":
        return null;

      case "ping":
        return rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, {
          tools: mcpTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });

      case "tools/call": {
        const params = m.params || {};
        const toolName = typeof params.name === "string" ? params.name : "";
        const tool = mcpTools.find((t) => t.name === toolName);
        if (!tool) {
          return rpcError(id, ERR_INVALID_PARAMS, `Unknown tool: ${toolName || "(missing)"}`);
        }
        const result = await tool.handler(params.arguments ?? {});
        return rpcResult(id, result);
      }

      case "resources/list":
        return rpcResult(id, { resources: [] });

      case "prompts/list":
        return rpcResult(id, { prompts: [] });

      default:
        if (isNotification) return null;
        return rpcError(id, ERR_METHOD_NOT_FOUND, `Method not found: ${m.method}`);
    }
  } catch (e) {
    if (isNotification) return null;
    return rpcError(id, ERR_INTERNAL, e instanceof Error ? e.message : "Internal error");
  }
}