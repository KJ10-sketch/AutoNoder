import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {
    database: "unknown",
    inngest: process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY ? "configured" : "not-configured",
    polar: process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID ? "configured" : "not-configured",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const ok = checks.database === "ok";
  return NextResponse.json({
    status: ok ? "ok" : "degraded",
    service: "AutoNoder",
    checks,
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
