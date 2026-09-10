import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeWorkflow, type ExecutorRegistry } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

const registry: ExecutorRegistry = {
  webhook: { async execute(_node, context) { return { output: context.input }; } },
  schedule: { async execute(_node, context) { return { output: context.input }; } },
  http: {
    async execute(node, context) {
      const url = getString(node.config.url);
      if (!url) throw new Error(`HTTP Request node ${node.id} is missing a URL.`);
      const method = getString(node.config.method)?.toUpperCase() ?? "GET";
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json", ...(typeof node.config.headers === "object" && node.config.headers ? node.config.headers as Record<string, string> : {}) },
        body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(node.config.body ?? context.results),
      });
      const text = await response.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch {}
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      return { output: { status: response.status, data }, metadata: { url } };
    },
  },
  ai: {
    async execute(node, context) {
      const provider = getString(node.config.provider) ?? "openai";
      const prompt = getString(node.config.prompt) ?? JSON.stringify(context.results);
      if (provider === "openai") {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: getString(node.config.model) ?? "gpt-4.1-mini", input: prompt }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message ?? "OpenAI request failed.");
        return { output: data, metadata: { provider } };
      }
      if (provider === "anthropic") {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: getString(node.config.model) ?? "claude-3-5-haiku-latest", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message ?? "Anthropic request failed.");
        return { output: data, metadata: { provider } };
      }
      throw new Error(`Unsupported AI provider: ${provider}`);
    },
  },
  database: { async execute(node) { return { output: { operation: getString(node.config.operation) ?? "read", message: "Database node is persistence-ready; configure the workflow operation before production execution." } }; } },
  email: { async execute(node) { return { output: { to: getString(node.config.to) ?? "", message: "Email node is integration-ready; connect an email provider credential for delivery." } }; } },
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { workflowId: string; input?: unknown };
    if (!body.workflowId) return NextResponse.json({ error: "workflowId is required." }, { status: 400 });

    const workflow = await db.workflow.findFirst({ where: { id: body.workflowId, userId: session.user.id } });
    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

    const execution = await db.execution.create({ data: { userId: session.user.id, workflowId: workflow.id, input: body.input ?? null } });
    try {
      const definition: WorkflowDefinition = { nodes: workflow.nodes as WorkflowDefinition["nodes"], connections: workflow.connections as WorkflowDefinition["connections"] };
      const context = await executeWorkflow(definition, body.input ?? null, registry);
      const updated = await db.execution.update({ where: { id: execution.id }, data: { status: "SUCCESS", output: context.results, finishedAt: new Date() } });
      return NextResponse.json({ ok: true, execution: updated, context });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow execution failed.";
      const updated = await db.execution.update({ where: { id: execution.id }, data: { status: "FAILED", error: message, finishedAt: new Date() } });
      return NextResponse.json({ ok: false, execution: updated, error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workflow execution failed." }, { status: 500 });
  }
}
