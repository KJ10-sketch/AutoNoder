import { NextResponse } from "next/server";
import { executeWorkflow } from "@/lib/workflow/engine";
import type { ExecutorRegistry } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";

const demoRegistry: ExecutorRegistry = {
  webhook: { async execute(_node, context) { return { output: context.input }; } },
  schedule: { async execute(_node, context) { return { output: context.input }; } },
  ai: { async execute(node, context) { return { output: { provider: node.config.provider ?? "demo", input: context.results, status: "adapter-ready" } }; } },
  http: { async execute(node) { return { output: { url: node.config.url ?? "", status: "adapter-ready" } }; } },
  database: { async execute(node) { return { output: { operation: node.config.operation ?? "read", status: "adapter-ready" } }; } },
  email: { async execute(node) { return { output: { to: node.config.to ?? "", status: "adapter-ready" } }; } },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workflow?: WorkflowDefinition; input?: unknown };
    if (!body.workflow || !Array.isArray(body.workflow.nodes) || !Array.isArray(body.workflow.connections)) {
      return NextResponse.json({ error: "A valid workflow definition is required." }, { status: 400 });
    }

    const context = await executeWorkflow(body.workflow, body.input ?? null, demoRegistry);
    return NextResponse.json({ ok: true, context });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workflow execution failed." }, { status: 500 });
  }
}
