import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptCredential } from "@/lib/security/credentials";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(80),
  data: z.record(z.string(), z.string()).refine((value) => Object.keys(value).length > 0, { message: "Credential data cannot be empty." }),
});

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const credentials = await db.credential.findMany({ where: { userId: user.id }, select: { id: true, name: true, provider: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = createSchema.parse(await request.json());
    const credential = await db.credential.create({ data: { userId: user.id, name: payload.name, provider: payload.provider, encryptedData: encryptCredential(payload.data) }, select: { id: true, name: true, provider: true, createdAt: true, updatedAt: true } });
    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid credential payload.", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save credential." }, { status: 500 });
  }
}
