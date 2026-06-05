import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    metadata: { userId, plan },
  });

  return NextResponse.json({ url: session.url });
}