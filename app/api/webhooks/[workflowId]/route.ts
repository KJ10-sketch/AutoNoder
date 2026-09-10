import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";

function webhookConfig(nodes: unknown) {
  if (!Array.isArray(nodes)) return null;
  const node = nodes.find((item) => item && typeof item === "object" && (item as any).type === "webhook") as any;
  return node?.config && typeof node.config === "object" ? node.config as Record<string, unknown> : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const workflow = await db.workflow.findUnique({ where: { id: workflowId } });

    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    if (workflow.status !== "ACTIVE") return NextResponse.json({ error: "Workflow is not active." }, { status: 409 });

    const config = webhookConfig(workflow.nodes);
    const configuredSecret = typeof config?.secret === "string" && config.secret.trim() ? config.secret : undefined;
    if (configuredSecret) {
      const suppliedSecret = request.headers.get("x-autonoder-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (suppliedSecret !== configuredSecret) return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });

    const contentType = request.headers.get("content-type") ?? "";
    let input: unknown = null;
    if (contentType.includes("application/json")) input = await request.json();
    else input = await request.text();

    const event = await inngest.send({
      name: "autonoder/workflow.execute",
      data: { workflowId: workflow.id, userId: workflow.userId, input, trigger: "webhook" },
    });

    return NextResponse.json({ ok: true, workflowId: workflow.id, eventIds: event.ids }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to trigger workflow." }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, status: true, nodes: true },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  const config = webhookConfig(workflow.nodes);
  return NextResponse.json({
    workflowId: workflow.id,
    name: workflow.name,
    status: workflow.status,
    method: "POST",
    endpoint: `/api/webhooks/${workflow.id}`,
    authentication: typeof config?.secret === "string" && config.secret ? "x-autonoder-secret or Bearer token" : "none",
  });
}
