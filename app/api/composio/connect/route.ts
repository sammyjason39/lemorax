import { NextRequest, NextResponse } from "next/server";
import { isComposioConfigured, isAllowedToolkit } from "@/lib/composio/config";
import { authorizeComposioToolkit, getComposioCallbackUrl } from "@/lib/composio/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "Composio belum dikonfigurasi. Set COMPOSIO_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as { toolkit?: string; returnPath?: string };
    const slug = body.toolkit?.trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "toolkit wajib diisi" }, { status: 400 });
    }

    if (!isAllowedToolkit(slug)) {
      return NextResponse.json({ error: `Toolkit '${slug}' tidak didukung` }, { status: 400 });
    }

    const callbackUrl = body.returnPath
      ? getComposioCallbackUrl(body.returnPath)
      : undefined;

    const { redirectUrl, connectionRequestId } = await authorizeComposioToolkit(slug, callbackUrl);
    return NextResponse.json({ redirectUrl, connectionRequestId, toolkit: slug });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat link koneksi" },
      { status: 500 }
    );
  }
}
