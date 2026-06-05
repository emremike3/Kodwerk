import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Redis } from "@upstash/redis";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const PRICES = {
  pro: "price_1TeuJd4yqMqf0RwmClZdGo3w",
  unlimited: "price_1TeuKH4yqMqf0RwmqcNsU9ts",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { plan } = await req.json();
  const priceId = PRICES[plan as keyof typeof PRICES];
  
  if (!priceId) {
    return NextResponse.json({ error: "Ungültiger Plan" }, { status: 400 });
  }

  const customerId = await redis.get<string>(`stripe_customer:${userId}`);

  // Wenn User bereits ein Abo hat → wechseln
  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0] as any;
      const currentPriceId = sub.items?.data?.[0]?.price?.id;

      if (currentPriceId === priceId) {
        return NextResponse.json({ error: "Du bist bereits auf diesem Plan" }, { status: 400 });
      }

      // Plan wechseln
      await stripe.subscriptions.update(sub.id, {
        items: [{
          id: sub.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: "always_invoice",
      });

      await redis.set(`plan:${userId}`, plan);
      await redis.del(`cancelled:${userId}`);

      return NextResponse.json({ success: true, switched: true });
    }
  }

  // Kein Abo → neues Checkout erstellen
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    customer: customerId || undefined,
    metadata: { userId, plan },
  });

  return NextResponse.json({ url: session.url });
}