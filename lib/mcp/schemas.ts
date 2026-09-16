import { z } from "zod";

export const describeSchemaInput = z.object({}).passthrough();

export const queryBusinessDataInput = z.object({
  sql_query: z.string().describe("Read-only SELECT query against business tables"),
  explanation: z.string().optional().describe("Short human-readable reason for this query"),
});

export const businessOverviewInput = z
  .object({
    periode_start: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("Start month (YYYY-MM). Defaults to current month."),
    periode_end: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("End month (YYYY-MM). Defaults to current month."),
    cabang: z.array(z.string()).optional().describe("Filter by branch names"),
  })
  .passthrough();

export const listContentItemsInput = z
  .object({
    status: z
      .enum(["backlog", "scripting", "review", "scheduled", "published"])
      .optional()
      .describe("Filter by Kanban status"),
    limit: z.number().int().min(1).max(100).optional().describe("Max items (default 25)"),
  })
  .passthrough();

export const createContentIdeaInput = z.object({
  title: z.string().min(1).max(200).describe("Short card title"),
  format: z.enum(["reel", "carousel", "image", "story"]).describe("Content format"),
  notes: z.string().max(2000).optional().describe("Internal notes / angle / idea summary"),
  hook: z.string().max(500).optional().describe("Opening hook for Reels/carousel"),
  hashtags: z.array(z.string()).optional().describe("Suggested hashtags"),
  source_agent: z.string().max(60).optional().describe("Name of the agent creating this idea"),
});

export const moveContentStatusInput = z.object({
  item_id: z.string().min(1).describe("Content plan item ID"),
  new_status: z
    .enum(["backlog", "scripting", "review", "scheduled"])
    .describe("Target status — 'published' is user-only and will be rejected"),
  scheduled_at: z.string().datetime().optional().describe("ISO timestamp when scheduling"),
});