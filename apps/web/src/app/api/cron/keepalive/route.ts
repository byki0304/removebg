import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily keep-alive, triggered by Vercel Cron (03:00-04:00 KST) with a GitHub Actions backup.
 * Always reads from the database; writes a heartbeat only after 24h without any activity.
 * When CRON_SECRET is set, callers must send `Authorization: Bearer <CRON_SECRET>` (Vercel Cron does this automatically).
 * Without it the endpoint stays open, which is harmless: it performs at most one tiny write per day.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });

  const { data, error } = await admin.rpc("keepalive_check");
  if (error) {
    console.error("[keepalive] failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }
  console.log("[keepalive]", JSON.stringify(data));
  return NextResponse.json({ ok: true, ...(data as object) }, { headers: { "Cache-Control": "no-store" } });
}
