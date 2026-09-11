import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topologicalSort } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";

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

function validateActivatableWorkflow(nodes: unknown, connections: unknown) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("An active workflow must contain at least one node.");
  }
  if (!Array.isArray(connections)) {
    throw new Error("Workflow connections must be an array.");
  }

  const normalizedNodes = nodes.map((node, index) => {
    if (!node || typeof node !== "object") throw new Error(`Workflow node ${index + 1} is invalid.`);
    const value = node as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : "";
    const type = typeof value.type === "string" ? value.type : "";
    const name = typeof value.name === "string" ? value.name : type;
    if (!id || !type) throw new Error(`Workflow node ${index + 1} must have an id and type.`);
    return { id, type, name, config: value.config && typeof value.config === "object" ? value.config as Record<string, unknown> : {} };
  });

  const normalizedConnections = connections.map((connection, index) => {
    if (!connection || typeof connection !== "object") throw new Error(`Workflow connection ${index + 1} is invalid.`);
    const value = connection as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : `connection-${index}`;
    const source = typeof value.source === "string" ? value.source : "";
    const target = typeof value.target === "string" ? value.target : "";
    if (!source || !target) throw new Error(`Workflow connection ${index + 1} must have source and target.`);
    return { id, source, target };
  });

  topologicalSort({ nodes: normalizedNodes, connections: normalizedConnections } as WorkflowDefinition);
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

    const nextNodes = payload.nodes ?? existing.nodes;
    const nextConnections = payload.connections ?? existing.connections;
    if (payload.status === "ACTIVE") validateActivatableWorkflow(nextNodes, nextConnections);

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update workflow." }, { status: 400 });
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
