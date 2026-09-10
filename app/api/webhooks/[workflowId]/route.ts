import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const workflow = await db.workflow.findUnique({ where: { id: workflowId } });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    if (workflow.status !== "ACTIVE") {
      return NextResponse.json({ error: "Workflow is not active." }, { status: 409 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let input: unknown = null;

    if (contentType.includes("application/json")) {
      input = await request.json();
    } else {
      input = await request.text();
    }

    const event = await inngest.send({
      name: "autonoder/workflow.execute",
      data: {
        workflowId: workflow.id,
        userId: workflow.userId,
        input,
        trigger: "webhook",
      },
    });

    return NextResponse.json({
      ok: true,
      workflowId: workflow.id,
      eventIds: event.ids,
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to trigger workflow.",
    }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, status: true },
  });

  if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

  return NextResponse.json({
    workflowId: workflow.id,
    name: workflow.name,
    status: workflow.status,
    method: "POST",
    endpoint: `/api/webhooks/${workflow.id}`,
  });
}
