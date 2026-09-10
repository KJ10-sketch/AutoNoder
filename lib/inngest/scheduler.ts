import { inngest } from "./client";
import { db } from "@/lib/db";

type ScheduleConfig = {
  intervalMinutes?: number;
};

function getScheduleConfig(nodes: unknown[]): ScheduleConfig | null {
  for (const raw of nodes) {
    if (!raw || typeof raw !== "object") continue;
    const node = raw as { type?: string; config?: Record<string, unknown> };
    if (node.type !== "schedule") continue;

    const intervalMinutes = Number(node.config?.intervalMinutes ?? 0);
    if (Number.isFinite(intervalMinutes) && intervalMinutes >= 1) {
      return { intervalMinutes };
    }
  }
  return null;
}

export const dispatchScheduledWorkflows = inngest.createFunction(
  { id: "dispatch-scheduled-workflows", retries: 2 },
  { cron: "* * * * *" },
  async ({ step }) => {
    return step.run("dispatch-due-workflows", async () => {
      const now = Date.now();
      const workflows = await db.workflow.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, userId: true, nodes: true },
      });

      let dispatched = 0;
      for (const workflow of workflows) {
        const config = getScheduleConfig(workflow.nodes as unknown[]);
        if (!config) continue;

        const latestExecution = await db.execution.findFirst({
          where: { workflowId: workflow.id },
          orderBy: { startedAt: "desc" },
          select: { startedAt: true },
        });

        const lastRunAt = latestExecution?.startedAt.getTime() ?? 0;
        const intervalMs = config.intervalMinutes * 60_000;
        if (latestExecution && now - lastRunAt < intervalMs) continue;

        await inngest.send({
          name: "autonoder/workflow.execute",
          data: {
            workflowId: workflow.id,
            userId: workflow.userId,
            input: { trigger: "schedule", scheduledAt: new Date(now).toISOString() },
            trigger: "schedule",
          },
        });
        dispatched += 1;
      }

      return { dispatched };
    });
  },
);
