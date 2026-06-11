import { NextResponse } from "next/server";
import { getVaultGraph } from "@/lib/vault/graph";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const graph = await getVaultGraph();
    return NextResponse.json(graph, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
