import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const credential = await db.credential.findFirst({ where: { id, userId: user.id } });
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });
  await db.credential.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
