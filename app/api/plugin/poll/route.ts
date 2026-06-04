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

  const pendingCode = await redis.get<{code: string, name: string, scriptType: string}>(`pending:${userId}`);
  
  if (pendingCode) {
    await redis.del(`pending:${userId}`);
    return NextResponse.json({ code: pendingCode.code, name: pendingCode.name, scriptType: pendingCode.scriptType });
  }

  return NextResponse.json({ code: null });
}