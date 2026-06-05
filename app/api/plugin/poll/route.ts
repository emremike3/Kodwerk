import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  
  if (!token) {
    return NextResponse.json({ error: "Kein Token" }, { status: 401 });
  }

  const userId = await redis.get<string>(`token_to_user:${token}`);
  
  if (!userId) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  const pending = await redis.get(`pending:${userId}`);
  
  if (pending) {
    await redis.del(`pending:${userId}`);
    
    const scripts = Array.isArray(pending) ? pending : [pending];
    return NextResponse.json({ scripts });
  }

  return NextResponse.json({ scripts: null });
}