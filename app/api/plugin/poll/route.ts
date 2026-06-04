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

  const pendingRaw = await redis.get(`pending:${userId}`);
  
  console.log("pendingRaw:", pendingRaw, "type:", typeof pendingRaw);
  
  if (pendingRaw) {
    await redis.del(`pending:${userId}`);
    
    let pendingData = pendingRaw;
    if (typeof pendingRaw === "string") {
      try {
        pendingData = JSON.parse(pendingRaw);
      } catch {
        pendingData = { code: pendingRaw, name: "KodwerkScript", scriptType: "LocalScript", location: "StarterPlayerScripts" };
      }
    }
    
    return NextResponse.json(pendingData);
  }

  return NextResponse.json({ code: null });
}