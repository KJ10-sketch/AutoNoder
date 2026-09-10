import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).optional(),
  nodes: z.array(z.unknown()).optional(),
  connections: z.array(z.unknown()).optional(),
});

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const workflow = await db.workflow.findFirst({ where: { id, userId: user.id } });
    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load workflow." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());
    const existing = await db.workflow.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

    const data: Prisma.WorkflowUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.nodes !== undefined) data.nodes = payload.nodes as Prisma.InputJsonValue;
    if (payload.connections !== undefined) data.connections = payload.connections as Prisma.InputJsonValue;

    const workflow = await db.workflow.update({ where: { id }, data });
    return NextResponse.json({ workflow });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid workflow payload.", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update workflow." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.workflow.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    await db.workflow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to delete workflow." }, { status: 500 });
  }
}
