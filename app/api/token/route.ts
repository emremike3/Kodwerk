import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  let token = await redis.get<string>(`token:${userId}`);
  
  if (!token) {
    token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    await redis.set(`token:${userId}`, token);
    await redis.set(`token_to_user:${token}`, userId);
  } else {
    // Sicherstellen dass token_to_user auch existiert
    await redis.set(`token_to_user:${token}`, userId);
  }

  return NextResponse.json({ token });
}