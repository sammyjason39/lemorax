import { NextResponse } from "next/server";
import { getAiSettings, toPublicSettings, updateAiSettings } from "@/lib/ai/settings-store";
import type { AiSettingsUpdate } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getAiSettings();
    return NextResponse.json(toPublicSettings(settings), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat pengaturan AI" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as AiSettingsUpdate;
    const patch: AiSettingsUpdate = {};

    if (typeof body.ollamaBaseUrl === "string") patch.ollamaBaseUrl = body.ollamaBaseUrl;
    if (body.ollamaModel !== undefined) patch.ollamaModel = body.ollamaModel;
    if (body.fallbackApiBaseUrl !== undefined) patch.fallbackApiBaseUrl = body.fallbackApiBaseUrl;
    if (body.fallbackModel !== undefined) patch.fallbackModel = body.fallbackModel;
    if (typeof body.fallbackApiKey === "string" && body.fallbackApiKey.trim()) {
      patch.fallbackApiKey = body.fallbackApiKey;
    }

    const settings = await updateAiSettings(patch);
    return NextResponse.json(toPublicSettings(settings));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan AI" },
      { status: 500 }
    );
  }
}
