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
  const pendingCode = userId ? await redis.get<string>(`pending:${userId}`) : null;

  return NextResponse.json({ 
    token: token.substring(0, 10) + "...",
    userId,
    hasPending: !!pendingCode,
    code: pendingCode ? JSON.parse(pendingCode).code : null
  });
}