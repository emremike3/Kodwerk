import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Anthropic from "@anthropic-ai/sdk";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FREE_LIMIT = 3;
const PRO_LIMIT = 1000;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const plan = await redis.get<string>(`plan:${userId}`);
  
  let remaining = 0;
  let key = "";

  if (plan === "unlimited") {
    remaining = -1;
  } else if (plan === "pro") {
    const month = new Date().toISOString().substring(0, 7);
    key = `credits:${userId}:${month}`;
    const used = (await redis.get<number>(key)) || 0;
    if (used >= PRO_LIMIT) {
      return NextResponse.json({ error: "Monatslimit erreicht! Upgrade auf Unlimited für unbegrenzte Anfragen." }, { status: 429 });
    }
    remaining = PRO_LIMIT - used - 1;
  } else {
    const today = new Date().toISOString().split("T")[0];
    key = `credits:${userId}:${today}`;
    const used = (await redis.get<number>(key)) || 0;
    if (used >= FREE_LIMIT) {
      return NextResponse.json({ error: "Tageslimit erreicht! Upgrade auf Pro für mehr Anfragen." }, { status: 429 });
    }
    remaining = FREE_LIMIT - used - 1;
  }

  const { prompt } = await req.json();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Du bist ein erfahrener Roblox Studio Entwickler. Generiere einfachen, funktionierenden Luau Code.

Antworte NUR mit JSON (kein Markdown, keine Erklärungen):
{"code": "...", "scriptType": "LocalScript", "location": "StarterPlayerScripts", "name": "ScriptName"}

ORTE REGELN:
- Input/Bewegung/Springen/Fliegen/Dash → StarterPlayerScripts (LocalScript)
- Charakter Aussehen/Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus/HUD → StarterGui (LocalScript)
- Spawning/DataStore/Server Logik/Münzen → ServerScriptService (Script)
- Shared Funktionen → ReplicatedStorage (ModuleScript)

WICHTIGE ROBLOX REGELN:
- NIEMALS BodyVelocity, BodyGyro, BodyPosition benutzen - DEPRECATED!
- Für Fliegen: LinearVelocity mit Attachment benutzen ODER einfach rootPart.CFrame setzen
- Für Velocity: rootPart.AssemblyLinearVelocity
- IMMER game:GetService() benutzen
- IMMER WaitForChild() benutzen
- Character: player.Character or player.CharacterAdded:Wait()
- EINFACHEN Code generieren - keine unnötigen Effekte außer wenn explizit gefragt
- Vollständiger funktionierender Code

Aufgabe: ${prompt}`
      }
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";

  let parsed = { code: "", scriptType: "LocalScript", location: "StarterPlayerScripts", name: "KodwerkScript" };
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
    parsed.code = parsed.code.replace(/\\n/g, "\n");
  } catch {
    parsed.code = raw;
  }

  if (key) {
    const used = (await redis.get<number>(key)) || 0;
    await redis.set(key, used + 1, { ex: plan === "pro" ? 2592000 : 86400 });
  }

  const pendingData = {
    code: parsed.code,
    name: parsed.name || "KodwerkScript",
    scriptType: parsed.scriptType || "LocalScript",
    location: parsed.location || "StarterPlayerScripts"
  };

  await redis.set(`pending:${userId}`, pendingData, { ex: 300 });

  return NextResponse.json({ code: parsed.code, remaining, plan: plan || "free" });
}