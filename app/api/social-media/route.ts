import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, listPosts } from "@/lib/social-media/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const limitParam = Number(req.nextUrl.searchParams.get("postsLimit"));
    const postsLimit = Math.min(Math.max(Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20, 12), 48);
    const [data, allPosts] = await Promise.all([getDashboardData(), listPosts(undefined, postsLimit)]);

    return NextResponse.json(
      { ...data, posts: allPosts },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
