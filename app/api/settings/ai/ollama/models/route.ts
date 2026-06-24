import { NextResponse } from "next/server";
import { listOllamaModels, pingOllama } from "@/lib/ai/ollama";
import { getAiSettings } from "@/lib/ai/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const baseUrl = searchParams.get("baseUrl")?.trim();
    const settings = await getAiSettings();
    const resolved = baseUrl || settings.ollamaBaseUrl;

    const [reachable, models] = await Promise.all([
      pingOllama(resolved),
      listOllamaModels(resolved).catch(() => [] as string[]),
    ]);

    return NextResponse.json({
      baseUrl: resolved,
      reachable,
      models,
    });
  } catch (err) {
    return NextResponse.json(
      {
        reachable: false,
        models: [] as string[],
        error: err instanceof Error ? err.message : "Gagal memuat model Ollama",
      },
      { status: 500 }
    );
  }
}
