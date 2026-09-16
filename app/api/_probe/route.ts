import { NextResponse } from "next/server";
import https from "https";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await new Promise((resolve) => {
    const req = https.request({ hostname: "api.apify.com", path: "/v2/wiki", method: "GET", family: 4, timeout: 20000 }, (res) => {
      let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve({ ok: true, status: res.statusCode }));
    });
    req.on("error", (e: Error) => resolve({ ok: false, err: e.message }));
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.end();
  });
  return NextResponse.json(result);
}
