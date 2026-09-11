import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const POLAR_API = "https://api.polar.sh/v1";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const productId = process.env.POLAR_PRODUCT_ID;
    if (!accessToken || !productId) {
      return NextResponse.json({ error: "Polar billing is not configured." }, { status: 503 });
    }

    const body = (await request.json().catch(() => ({}))) as { returnUrl?: string };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const returnUrl = typeof body.returnUrl === "string" && body.returnUrl.startsWith(appUrl)
      ? body.returnUrl
      : `${appUrl}/billing?checkout=success`;

    const response = await fetch(`${POLAR_API}/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        external_customer_id: session.user.id,
        success_url: returnUrl,
        return_url: `${appUrl}/billing`,
        metadata: { autonoder_user_id: session.user.id },
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail ?? data?.message ?? "Polar checkout creation failed." }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
    }

    return NextResponse.json({ url: data.url, checkoutId: data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create checkout." }, { status: 500 });
  }
}
