import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkflowBuilder } from "@/components/workflow-builder";

export default async function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { id } = await params;
  const workflow = await db.workflow.findFirst({ where: { id, userId: session.user.id } });
  if (!workflow) notFound();

  return <WorkflowBuilder existingWorkflow={{ id: workflow.id, name: workflow.name, status: workflow.status, nodes: workflow.nodes, connections: workflow.connections }} />;
}
