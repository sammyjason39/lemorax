import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { generateSQLQuery, streamFinalAnswer } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    // Step 1: Generate SQL
    const { sql_query, explanation, initial_analysis } = await generateSQLQuery(message);

    // Step 2: Run SQL
    const sb = createServerSupabaseClient();
    const { data: queryResult, error: sqlError } = await sb.rpc("execute_ai_query", {
      query_text: sql_query,
    }).single();

    let resultData: unknown = queryResult;
    if (sqlError) {
      // Fallback: try direct query if RPC not available
      const { data, error } = await (sb as any).from("finance").select("count(*)").limit(1);
      resultData = { note: "SQL execution via RPC failed", sql_query, error: sqlError.message };
    }

    // Step 3: Stream final answer
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // First send metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "meta", sql_query, explanation, initial_analysis, queryResult: resultData })}\n\n`
          )
        );

        // Stream the answer
        try {
          for await (const chunk of streamFinalAnswer(message, resultData, sql_query)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`));
          }
        } catch (e) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Gagal mendapatkan jawaban AI" })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
