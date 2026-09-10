import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const workflowSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).optional(),
  nodes: z.array(z.unknown()),
  connections: z.array(z.unknown()),
});

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function GET() {
  try {
    const user = await requireUser();
    const workflows = await db.workflow.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ workflows });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load workflows." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = workflowSchema.parse(await request.json());
    const workflow = await db.workflow.create({ data: { ...payload, status: payload.status ?? "DRAFT", userId: user.id } });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid workflow payload.", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Unable to create workflow." }, { status: 500 });
  }
}
