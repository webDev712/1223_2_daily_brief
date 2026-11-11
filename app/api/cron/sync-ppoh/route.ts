import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { syncAllCompanies } from "@/lib/smrtSync.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request, secret: string): boolean {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseSyncOptions(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDates = searchParams.get("dates");
  const rawDaysBack = searchParams.get("daysBack");

  let dates: string[] | undefined;
  if (rawDates !== null && rawDates.trim() !== "") {
    dates = rawDates.split(",").map(s => s.trim()).filter(Boolean);
    if (!dates.length || dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
      throw Object.assign(new Error("Invalid dates parameter; expected YYYY-MM-DD,YYYY-MM-DD"), { status: 400 });
    }
  }

  let daysBack: number | undefined;
  if (rawDaysBack !== null && rawDaysBack.trim() !== "") {
    const parsed = Number(rawDaysBack);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 14) {
      throw Object.assign(new Error("Invalid daysBack parameter; expected integer 0..14"), { status: 400 });
    }
    daysBack = parsed;
  }

  return { dates, daysBack };
}

async function handleSync(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let options: { dates?: string[]; daysBack?: number };
  try {
    options = parseSyncOptions(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid parameters";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const results = await syncAllCompanies(pool, options);
    const allOk = results.every(r => r.ok);
    return NextResponse.json(
      { ok: allOk, syncedAt: new Date().toISOString(), results },
      { status: allOk ? 200 : 500 }
    );
  } catch (err) {
    console.error("SMRT cron sync error:", err);
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
