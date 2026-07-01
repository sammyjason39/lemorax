import { planAgentRun } from "@/lib/agents/planner";
import { queryBusinessData } from "@/lib/agents/query-business-data";
import type { AgentChatEvent, AgentChatHistoryMessage, AgentChatInput, AgentLastQuery } from "@/lib/agents/types";
import { generateSQLQuery, streamDirectAnswer, streamFinalAnswer } from "@/lib/openrouter";

function runId(): string {
  return `run_${Date.now().toString(36)}`;
}

type AgentRunContext = {
  history?: AgentChatHistoryMessage[];
  lastQuery?: AgentLastQuery;
};

async function* runQueryBusinessDataTool(
  message: string,
  ctx: AgentRunContext
): AsyncGenerator<AgentChatEvent> {
  yield { type: "tool_call", toolName: "query_business_data", input: { message } };

  const { sql_query, explanation, initial_analysis } = await generateSQLQuery(message, ctx.history);
  const result = await queryBusinessData({
    sql_query,
    explanation,
    source: "aries-agent",
  });

  const resultData = result.ok
    ? result.rows
    : { note: "SQL execution failed", sql_query, error: result.error };

  yield {
    type: "tool_result",
    toolName: "query_business_data",
    output: {
      ok: result.ok,
      row_count: result.ok ? result.row_count : 0,
      redacted: result.ok ? result.redacted : undefined,
    },
  };

  yield {
    type: "meta",
    source: "aries",
    sql_query: result.ok ? result.sql_query : sql_query,
    explanation,
    initial_analysis,
    queryResult: resultData,
  };

  for await (const chunk of streamFinalAnswer(
    message,
    resultData,
    result.ok ? result.sql_query : sql_query,
    ctx.history
  )) {
    yield { type: "chunk", content: chunk };
  }
}

async function* runDirectAnswerTool(
  message: string,
  ctx: AgentRunContext
): AsyncGenerator<AgentChatEvent> {
  yield { type: "tool_call", toolName: "direct_answer", input: { message } };
  yield { type: "tool_result", toolName: "direct_answer", output: { mode: "general" } };

  for await (const chunk of streamDirectAnswer(message, ctx.history)) {
    yield { type: "chunk", content: chunk };
  }
}

async function* runContinueDataAnswerTool(
  message: string,
  ctx: AgentRunContext
): AsyncGenerator<AgentChatEvent> {
  if (!ctx.lastQuery) {
    yield* runDirectAnswerTool(message, ctx);
    return;
  }

  yield { type: "tool_call", toolName: "continue_data_answer", input: { message } };
  yield {
    type: "tool_result",
    toolName: "continue_data_answer",
    output: { reusingQuery: true, sql: ctx.lastQuery.sqlQuery },
  };

  yield {
    type: "meta",
    source: "aries",
    sql_query: ctx.lastQuery.sqlQuery,
    queryResult: ctx.lastQuery.queryResult,
    note: "Melanjutkan analisis dari query sebelumnya",
  };

  for await (const chunk of streamFinalAnswer(
    message,
    ctx.lastQuery.queryResult,
    ctx.lastQuery.sqlQuery,
    ctx.history,
    { continue: true, originalQuestion: ctx.lastQuery.userQuestion }
  )) {
    yield { type: "chunk", content: chunk };
  }
}

/**
 * Custom ARIES agent loop — Qwen-backed, tool registry ready for future capabilities.
 */
export async function* runAriesAgent(input: AgentChatInput): AsyncGenerator<AgentChatEvent> {
  const message = input.message.trim();
  if (!message) {
    yield { type: "error", message: "Message required" };
    return;
  }

  const id = runId();
  const sessionId = input.sessionId ?? "default";
  const ctx: AgentRunContext = { history: input.history, lastQuery: input.lastQuery };

  yield { type: "message_start", runId: id, sessionId };

  const plan = planAgentRun(message, { history: input.history, lastQuery: input.lastQuery });
  yield {
    type: "meta",
    source: "aries",
    tools: plan.tools,
    note: plan.reason,
  };

  try {
    for (const tool of plan.tools) {
      if (tool === "query_business_data") {
        yield* runQueryBusinessDataTool(message, ctx);
      } else if (tool === "direct_answer") {
        yield* runDirectAnswerTool(message, ctx);
      } else if (tool === "continue_data_answer") {
        yield* runContinueDataAnswerTool(message, ctx);
      }
    }

    yield { type: "done", output: { runId: id, tools: plan.tools } };
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : "Agent run failed",
    };
  }
}
