import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const FREE_LIMIT = 3;
const PRO_LIMIT = 1000;

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ remaining: 0, plan: "free" });
  }

  const plan = await redis.get<string>(`plan:${userId}`);
  const cancelledDate = await redis.get<string>(`cancelled:${userId}`);
  let renewalDate = null;

  if (plan === "pro" || plan === "unlimited") {
    const customerId = await redis.get<string>(`stripe_customer:${userId}`);
    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
        });
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0] as any;
          const renewalTimestamp = sub.items?.data?.[0]?.current_period_end || sub.cancel_at;
          renewalDate = new Date(renewalTimestamp * 1000).toLocaleDateString("de-DE");
        }
      } catch {
        // ignore
      }
    }
  }

  if (plan === "unlimited") {
    return NextResponse.json({ remaining: -1, plan: "unlimited", renewalDate, cancelledDate });
  }

  if (plan === "pro") {
    const month = new Date().toISOString().substring(0, 7);
    const key = `credits:${userId}:${month}`;
    const used = (await redis.get<number>(key)) || 0;
    return NextResponse.json({ remaining: PRO_LIMIT - used, plan: "pro", renewalDate, cancelledDate });
  }

  const today = new Date().toISOString().split("T")[0];
  const key = `credits:${userId}:${today}`;
  const used = (await redis.get<number>(key)) || 0;
  return NextResponse.json({ remaining: FREE_LIMIT - used, plan: "free", renewalDate: null, cancelledDate: null });
}