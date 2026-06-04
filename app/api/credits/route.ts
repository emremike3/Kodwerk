import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const FREE_LIMIT = 5;

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ remaining: 0 });
  }

  const today = new Date().toISOString().split("T")[0];
  const key = `credits:${userId}:${today}`;
  const used = (await redis.get<number>(key)) || 0;

  return NextResponse.json({ remaining: FREE_LIMIT - used });
}