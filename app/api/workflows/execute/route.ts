import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";
import { createExecutorRegistry } from "@/lib/workflow/executors";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { workflowId: string; input?: unknown };
    if (!body.workflowId) return NextResponse.json({ error: "workflowId is required." }, { status: 400 });

    const workflow = await db.workflow.findFirst({
      where: { id: body.workflowId, userId: session.user.id },
    });
    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

    const execution = await db.execution.create({
      data: {
        userId: session.user.id,
        workflowId: workflow.id,
        ...(body.input !== undefined
          ? { input: body.input as Prisma.InputJsonValue }
          : {}),
      },
    });

    try {
      const definition: WorkflowDefinition = {
        nodes: workflow.nodes as WorkflowDefinition["nodes"],
        connections: workflow.connections as WorkflowDefinition["connections"],
      };
      const context = await executeWorkflow(
        definition,
        body.input ?? null,
        createExecutorRegistry(session.user.id),
      );
      const updated = await db.execution.update({
        where: { id: execution.id },
        data: {
          status: "SUCCESS",
          output: context.results as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, execution: updated, context });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow execution failed.";
      const updated = await db.execution.update({
        where: { id: execution.id },
        data: { status: "FAILED", error: message, finishedAt: new Date() },
      });
      return NextResponse.json({ ok: false, execution: updated, error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Workflow execution failed.",
    }, { status: 500 });
  }
}
