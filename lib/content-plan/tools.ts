import { createItem, getItem, moveItemStatus, updateItem } from "@/lib/content-plan/store";
import {
  BRAND_SCOPES,
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  type BrandScope,
  type ContentFormat,
  type ContentStatus,
} from "@/lib/content-plan/types";

const SOCA_AGENT = "soca-social";

export type ContentPlanToolName =
  | "create_content_idea"
  | "update_content_script"
  | "move_content_status";

export type ContentPlanToolResult = {
  ok: boolean;
  tool: ContentPlanToolName;
  message: string;
  itemId?: string;
};

export async function createContentIdea(args: {
  title: string;
  brand_scope?: string;
  format?: string;
  script_md?: string;
  notes?: string;
}): Promise<ContentPlanToolResult> {
  const format = CONTENT_FORMATS.includes(args.format as ContentFormat)
    ? (args.format as ContentFormat)
    : "reel";
  const brand_scope = BRAND_SCOPES.includes(args.brand_scope as BrandScope)
    ? (args.brand_scope as BrandScope)
    : "company";
  const item = await createItem({
    title: args.title,
    brand_scope,
    format,
    script_md: args.script_md,
    notes: args.notes,
    created_by: SOCA_AGENT,
    assigned_agent: SOCA_AGENT,
    last_touched_by: SOCA_AGENT,
  });
  return {
    ok: true,
    tool: "create_content_idea",
    message: `Kartu dibuat di Backlog (${item.brand_scope}): "${item.title}" (${item.id})`,
    itemId: item.id,
  };
}

export async function updateContentScript(args: {
  item_id: string;
  script_md?: string;
  title?: string;
  notes?: string;
}): Promise<ContentPlanToolResult> {
  const existing = await getItem(args.item_id);
  if (!existing) {
    return { ok: false, tool: "update_content_script", message: `Item tidak ditemukan: ${args.item_id}` };
  }
  const item = await updateItem(args.item_id, {
    ...(args.script_md !== undefined ? { script_md: args.script_md } : {}),
    ...(args.title !== undefined ? { title: args.title } : {}),
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
    last_touched_by: SOCA_AGENT,
    assigned_agent: SOCA_AGENT,
  });
  return {
    ok: true,
    tool: "update_content_script",
    message: `Script diperbarui untuk "${item.title}"`,
    itemId: item.id,
  };
}

export async function moveContentStatus(args: {
  item_id: string;
  status: string;
}): Promise<ContentPlanToolResult> {
  if (args.status === "published") {
    return {
      ok: false,
      tool: "move_content_status",
      message: "Soca tidak boleh memindahkan ke Published — minta user Publish Demo",
    };
  }
  if (!CONTENT_STATUSES.includes(args.status as ContentStatus)) {
    return {
      ok: false,
      tool: "move_content_status",
      message: `Status tidak valid: ${args.status}`,
    };
  }
  const item = await moveItemStatus(args.item_id, args.status as ContentStatus, SOCA_AGENT);
  return {
    ok: true,
    tool: "move_content_status",
    message: `"${item.title}" → ${args.status}`,
    itemId: item.id,
  };
}

export async function executeContentPlanTool(
  name: ContentPlanToolName,
  args: Record<string, unknown>
): Promise<ContentPlanToolResult> {
  switch (name) {
    case "create_content_idea":
      return createContentIdea({
        title: String(args.title || ""),
        brand_scope: args.brand_scope ? String(args.brand_scope) : undefined,
        format: args.format ? String(args.format) : undefined,
        script_md: args.script_md ? String(args.script_md) : undefined,
        notes: args.notes ? String(args.notes) : undefined,
      });
    case "update_content_script":
      return updateContentScript({
        item_id: String(args.item_id || ""),
        script_md: args.script_md !== undefined ? String(args.script_md) : undefined,
        title: args.title !== undefined ? String(args.title) : undefined,
        notes: args.notes !== undefined ? String(args.notes) : undefined,
      });
    case "move_content_status":
      return moveContentStatus({
        item_id: String(args.item_id || ""),
        status: String(args.status || ""),
      });
    default:
      return { ok: false, tool: name, message: "Tool tidak dikenal" };
  }
}
