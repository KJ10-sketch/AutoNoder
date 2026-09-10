import { inngest } from "./client";
import { db } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow/engine";
import type { ExecutorRegistry } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";

const registry: ExecutorRegistry = {
  webhook: { async execute(_node, context) { return { output: context.input }; } },
  schedule: { async execute(_node, context) { return { output: context.input }; } },
  ai: { async execute(node, context) { return { output: { provider: node.config.provider ?? "adapter", input: context.results } }; } },
  http: { async execute(node) { return { output: { url: node.config.url ?? "", status: "adapter" } }; } },
  database: { async execute(node) { return { output: { operation: node.config.operation ?? "read", status: "adapter" } }; } },
  email: { async execute(node) { return { output: { to: node.config.to ?? "", status: "adapter" } }; } },
};

export const runWorkflow = inngest.createFunction(
  { id: "run-workflow", retries: 3 },
  { event: "autonoder/workflow.execute" },
  async ({ event, step }) => {
    const execution = await step.run("create-execution", async () =>
      db.execution.create({
        data: {
          userId: event.data.userId,
          workflowId: event.data.workflowId,
          input: event.data.input ?? null,
        },
      })
    );

    try {
      const result = await step.run("execute-workflow", async () => {
        const workflow = await db.workflow.findUnique({ where: { id: event.data.workflowId } });
        if (!workflow) throw new Error("Workflow not found.");
        const definition: WorkflowDefinition = {
          nodes: workflow.nodes as WorkflowDefinition["nodes"],
          connections: workflow.connections as WorkflowDefinition["connections"],
        };
        return executeWorkflow(definition, event.data.input ?? null, registry);
      });

      await step.run("mark-success", async () => {
        await db.execution.update({
          where: { id: execution.id },
          data: { status: "SUCCESS", output: result.results, finishedAt: new Date() },
        });
      });

      return { executionId: execution.id, status: "SUCCESS" };
    } catch (error) {
      await step.run("mark-failed", async () => {
        await db.execution.update({
          where: { id: execution.id },
          data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error", finishedAt: new Date() },
        });
      });
      throw error;
    }
  }
);
