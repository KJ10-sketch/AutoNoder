import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 100);

    const executions = await db.execution.findMany({
      where: { userId: session.user.id, ...(workflowId ? { workflowId } : {}) },
      orderBy: { startedAt: "desc" },
      take: Number.isFinite(limit) && limit > 0 ? limit : 25,
      include: { workflow: { select: { name: true } } },
    });

    return NextResponse.json({ executions });
  } catch {
    return NextResponse.json({ error: "Unable to load executions." }, { status: 500 });
  }
}
