import { inngest } from "./client";
import { db } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow/engine";
import type { WorkflowDefinition } from "@/lib/workflow/types";
import { createExecutorRegistry } from "@/lib/workflow/executors";

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
        const workflow = await db.workflow.findFirst({
          where: { id: event.data.workflowId, userId: event.data.userId },
        });
        if (!workflow) throw new Error("Workflow not found.");

        const definition: WorkflowDefinition = {
          nodes: workflow.nodes as WorkflowDefinition["nodes"],
          connections: workflow.connections as WorkflowDefinition["connections"],
        };
        return executeWorkflow(
          definition,
          event.data.input ?? null,
          createExecutorRegistry(event.data.userId),
        );
      });

      await step.run("mark-success", async () => {
        await db.execution.update({
          where: { id: execution.id },
          data: {
            status: "SUCCESS",
            output: result.results,
            finishedAt: new Date(),
          },
        });
      });

      return { executionId: execution.id, status: "SUCCESS" };
    } catch (error) {
      await step.run("mark-failed", async () => {
        await db.execution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
            finishedAt: new Date(),
          },
        });
      });
      throw error;
    }
  }
);
