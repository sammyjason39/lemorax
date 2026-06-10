import { createServerSupabaseClient } from "@/lib/supabase";
import type {
  BrandScope,
  ContentFormat,
  ContentPlanBoard,
  ContentPlanItem,
  ContentStatus,
} from "@/lib/content-plan/types";
import { BRAND_SCOPE_LABELS, CONTENT_STATUSES } from "@/lib/content-plan/types";

export function newContentId(): string {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBoard(): ContentPlanBoard {
  return {
    backlog: [],
    scripting: [],
    review: [],
    scheduled: [],
    published: [],
  };
}

export async function listAllItems(scope?: BrandScope): Promise<ContentPlanItem[]> {
  const sb = createServerSupabaseClient();
  let q = sb.from("content_plan_items").select("*");
  if (scope) q = q.eq("brand_scope", scope);
  const { data, error } = await q
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ContentPlanItem[];
}

export async function getBoard(scope?: BrandScope): Promise<ContentPlanBoard> {
  const items = await listAllItems(scope);
  const board = emptyBoard();
  for (const item of items) {
    if (board[item.status]) board[item.status].push(item);
  }
  return board;
}

export async function getItem(id: string): Promise<ContentPlanItem | null> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("content_plan_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ContentPlanItem | null;
}

async function nextPosition(status: ContentStatus, brandScope: BrandScope): Promise<number> {
  const sb = createServerSupabaseClient();
  const { data } = await sb
    .from("content_plan_items")
    .select("position")
    .eq("status", status)
    .eq("brand_scope", brandScope)
    .order("position", { ascending: false })
    .limit(1);
  const top = data?.[0]?.position;
  return typeof top === "number" ? top + 1 : 0;
}

export async function createItem(input: {
  title: string;
  brand_scope?: BrandScope;
  format?: ContentFormat;
  status?: ContentStatus;
  script_md?: string;
  notes?: string;
  scheduled_at?: string | null;
  created_by?: string;
  assigned_agent?: string | null;
  last_touched_by?: string | null;
}): Promise<ContentPlanItem> {
  const status = input.status ?? "backlog";
  const brandScope = input.brand_scope ?? "company";
  const now = new Date().toISOString();
  const id = newContentId();
  const position = await nextPosition(status, brandScope);

  const row = {
    id,
    title: input.title.trim(),
    brand_scope: brandScope,
    status,
    format: input.format ?? "reel",
    script_md: input.script_md ?? "",
    notes: input.notes ?? "",
    scheduled_at: input.scheduled_at ?? null,
    published_at: null,
    publish_mode: null,
    assigned_agent: input.assigned_agent ?? null,
    created_by: input.created_by ?? "user",
    last_touched_by: input.last_touched_by ?? input.created_by ?? "user",
    position,
    created_at: now,
    updated_at: now,
  };

  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("content_plan_items").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data as ContentPlanItem;
}

export async function updateItem(
  id: string,
  patch: Partial<{
    title: string;
    status: ContentStatus;
    format: ContentFormat;
    script_md: string;
    notes: string;
    scheduled_at: string | null;
    published_at: string | null;
    publish_mode: string | null;
    position: number;
    brand_scope: BrandScope;
    assigned_agent: string | null;
    last_touched_by: string | null;
  }>
): Promise<ContentPlanItem> {
  const existing = await getItem(id);
  if (!existing) throw new Error(`Content plan item not found: ${id}`);

  const updates: Record<string, unknown> = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const scope = patch.brand_scope ?? existing.brand_scope ?? "company";

  if (patch.status && patch.status !== existing.status && patch.position === undefined) {
    updates.position = await nextPosition(patch.status, scope);
  }

  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("content_plan_items").update(updates).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as ContentPlanItem;
}

export async function moveItemStatus(
  id: string,
  status: ContentStatus,
  actor: string,
  options?: { allowPublished?: boolean }
): Promise<ContentPlanItem> {
  if (status === "published" && !options?.allowPublished) {
    throw new Error("Status published hanya via Publish Demo");
  }
  return updateItem(id, { status, last_touched_by: actor });
}

export async function publishDemo(id: string, actor = "user"): Promise<ContentPlanItem> {
  const item = await getItem(id);
  if (!item) throw new Error("Item tidak ditemukan");
  if (!["review", "scheduled"].includes(item.status)) {
    throw new Error("Publish demo hanya dari status Review atau Scheduled");
  }
  const now = new Date().toISOString();
  return updateItem(id, {
    status: "published",
    published_at: now,
    publish_mode: "demo",
    last_touched_by: actor,
  });
}

export async function deleteItem(id: string): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb.from("content_plan_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getContentPlanContextForAgent(): Promise<string> {
  try {
    const lines: string[] = ["## Content Plan Board"];
    for (const scope of ["personal", "company"] as BrandScope[]) {
      const board = await getBoard(scope);
      const total = Object.values(board).reduce((s, col) => s + col.length, 0);
      lines.push(`\n## ${BRAND_SCOPE_LABELS[scope]} (${total} kartu)`);
      for (const status of CONTENT_STATUSES) {
        const items = board[status];
        if (!items.length) continue;
        lines.push(`\n### ${status} (${items.length})`);
        for (const item of items.slice(0, 6)) {
          lines.push(
            `- [${item.id}] **${item.title}** (${item.format})` +
              (item.script_md ? ` — script: ${item.script_md.slice(0, 80)}…` : "")
          );
        }
      }
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}
