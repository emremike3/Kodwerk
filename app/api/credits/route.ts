import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

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

  if (plan === "unlimited") {
    return NextResponse.json({ remaining: -1, plan: "unlimited" });
  }

  if (plan === "pro") {
    const month = new Date().toISOString().substring(0, 7);
    const key = `credits:${userId}:${month}`;
    const used = (await redis.get<number>(key)) || 0;
    return NextResponse.json({ remaining: PRO_LIMIT - used, plan: "pro" });
  }

  const today = new Date().toISOString().split("T")[0];
  const key = `credits:${userId}:${today}`;
  const used = (await redis.get<number>(key)) || 0;
  return NextResponse.json({ remaining: FREE_LIMIT - used, plan: "free" });
}