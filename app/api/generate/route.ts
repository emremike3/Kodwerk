import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const FREE_LIMIT = 5;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const key = `credits:${userId}:${today}`;
  const used = (await redis.get<number>(key)) || 0;
  
  if (used >= FREE_LIMIT) {
    return NextResponse.json({ error: "Tageslimit erreicht! Upgrade auf Pro für mehr Anfragen." }, { status: 429 });
  }

  const { prompt } = await req.json();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Du bist ein Roblox Studio Experte. Antworte NUR mit einem JSON Objekt ohne Markdown:\n{\"code\": \"...\", \"scriptType\": \"LocalScript\", \"location\": \"StarterPlayerScripts\", \"name\": \"ScriptName\"}\n\nscriptType kann sein: LocalScript, Script, ModuleScript\nlocation kann sein: StarterPlayerScripts, StarterCharacterScripts, ServerScriptService, ReplicatedStorage, StarterGui\nname soll beschreibend sein auf Englisch.\nNur reinen Luau Code im code Feld, kein Markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    }),
  });

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  
  console.log("RAW RESPONSE:", raw);

  let parsed = { code: "", scriptType: "LocalScript", location: "StarterPlayerScripts", name: "KodwerkScript" };
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
    console.log("PARSED OK:", JSON.stringify(parsed));
  } catch(e) {
    console.log("PARSE FEHLER:", e);
    parsed.code = raw;
  }

  await redis.set(key, used + 1, { ex: 86400 });
  
  const pendingData = {
    code: parsed.code,
    name: parsed.name || "KodwerkScript",
    scriptType: parsed.scriptType || "LocalScript",
    location: parsed.location || "StarterPlayerScripts"
  };
  
  console.log("PENDING DATA:", JSON.stringify(pendingData));
  
  await redis.set(`pending:${userId}`, JSON.stringify(pendingData), { ex: 300 });
  
  console.log("PENDING GESPEICHERT!");

  return NextResponse.json({ code: parsed.code, remaining: FREE_LIMIT - used - 1 });
}