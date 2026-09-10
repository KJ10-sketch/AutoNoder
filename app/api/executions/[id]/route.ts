import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const execution = await db.execution.findFirst({
      where: { id, userId: session.user.id },
      include: { workflow: { select: { id: true, name: true } } },
    });
    if (!execution) return NextResponse.json({ error: "Execution not found." }, { status: 404 });

    return NextResponse.json({ execution });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load execution." },
      { status: 500 },
    );
  }
}
