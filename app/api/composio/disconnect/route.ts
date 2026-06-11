import { NextRequest, NextResponse } from "next/server";
import { isComposioConfigured, isAllowedToolkit } from "@/lib/composio/config";
import { disconnectComposioToolkit } from "@/lib/composio/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "Composio belum dikonfigurasi. Set COMPOSIO_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as { toolkit?: string };
    const slug = body.toolkit?.trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "toolkit wajib diisi" }, { status: 400 });
    }
    if (!isAllowedToolkit(slug)) {
      return NextResponse.json({ error: `Toolkit '${slug}' tidak didukung` }, { status: 400 });
    }

    const removed = await disconnectComposioToolkit(slug);
    return NextResponse.json({ ok: true, toolkit: slug, removedAccountIds: removed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memutus koneksi" },
      { status: 500 }
    );
  }
}
