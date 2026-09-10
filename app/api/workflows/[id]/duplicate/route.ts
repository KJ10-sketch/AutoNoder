import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const source = await db.workflow.findFirst({ where: { id, userId: session.user.id } });
    if (!source) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

    const workflow = await db.workflow.create({
      data: {
        userId: session.user.id,
        name: `${source.name} copy`,
        description: source.description,
        status: "DRAFT",
        nodes: source.nodes as Prisma.InputJsonValue,
        connections: source.connections as Prisma.InputJsonValue,
      },
      include: { executions: { select: { id: true } } },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to duplicate workflow." },
      { status: 500 },
    );
  }
}
