import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  try {
    const customerId = await redis.get<string>(`stripe_customer:${userId}`);
    
    if (!customerId) {
      return NextResponse.json({ error: "Kein Abo gefunden" }, { status: 400 });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "Kein aktives Abo" }, { status: 400 });
    }

    const sub = subscriptions.data[0] as any;
    
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    const endTimestamp = sub.items?.data?.[0]?.current_period_end || sub.cancel_at;
    const endDate = new Date(endTimestamp * 1000).toLocaleDateString("de-DE");
    await redis.set(`cancelled:${userId}`, endDate);

    return NextResponse.json({ success: true, endDate });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fehler beim Kündigen" }, { status: 500 });
  }
}