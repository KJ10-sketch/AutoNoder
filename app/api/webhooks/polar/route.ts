import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_SKEW_SECONDS = 5 * 60;

function verifyStandardWebhook(rawBody: string, id: string | null, timestamp: string | null, signature: string | null, secret: string) {
  if (!id || !timestamp || !signature) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > MAX_SKEW_SECONDS) return false;

  const keyValue = secret.replace(/^whsec_/, "");
  const key = Buffer.from(keyValue, "base64");
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");
  const variants = signature.split(" ").map((part) => part.split(",")[1]).filter(Boolean);

  return variants.some((value) => {
    const actual = Buffer.from(value, "base64");
    const target = Buffer.from(expected, "base64");
    return actual.length === target.length && timingSafeEqual(actual, target);
  });
}

function readNestedString(value: unknown, ...keys: string[]): string | undefined {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Polar webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const valid = verifyStandardWebhook(
    rawBody,
    request.headers.get("webhook-id"),
    request.headers.get("webhook-timestamp"),
    request.headers.get("webhook-signature"),
    secret,
  );
  if (!valid) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = typeof payload.type === "string" ? payload.type : typeof payload.event === "string" ? payload.event : "";
    const data = (payload.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, unknown>;

    const userId = readNestedString(data, "metadata", "autonoder_user_id")
      ?? readNestedString(data, "customer", "external_id")
      ?? readNestedString(data, "customer", "external_customer_id");
    if (!userId) return NextResponse.json({ ok: true, ignored: "missing external user id" });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true, ignored: "unknown user" });

    const customerId = readNestedString(data, "customer", "id");
    const subscriptionId = readNestedString(data, "subscription", "id") ?? (typeof data.id === "string" && event.startsWith("subscription.") ? data.id : undefined);
    const productId = readNestedString(data, "product", "id") ?? readNestedString(data, "subscription", "product", "id");

    const status = event.startsWith("subscription.")
      ? (readNestedString(data, "subscription", "status") ?? event.replace("subscription.", ""))
      : user.subscriptionStatus;

    await db.user.update({
      where: { id: user.id },
      data: {
        ...(customerId ? { polarCustomerId: customerId } : {}),
        ...(subscriptionId ? { polarSubscriptionId: subscriptionId } : {}),
        ...(productId ? { subscriptionProductId: productId } : {}),
        ...(status ? { subscriptionStatus: status } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process Polar webhook." }, { status: 400 });
  }
}
