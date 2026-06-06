import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
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

const SYSTEM_PROMPT = `Du bist ein erfahrener Roblox Studio Entwickler namens Kodwerk AI. Du kannst zwei Arten von Aufgaben erledigen:

1. SCRIPTS schreiben die im Spiel laufen
2. OBJEKTE direkt in Studio bauen (sichtbar ohne Playtest)

Antworte immer mit einer kurzen Erklärung auf Deutsch, dann dem JSON Block.

FORMAT FÜR SCRIPTS (Spiellogik, Systeme, GUI):
<kodwerk>
[
  {"type": "script", "code": "...", "scriptType": "LocalScript", "location": "StarterPlayerScripts", "name": "ScriptName"}
]
</kodwerk>

FORMAT FÜR OBJEKTE (Bauen, Spawnen von sichtbaren Teilen):
<kodwerk>
[
  {
    "type": "build",
    "name": "Diamond",
    "shape": "Block",
    "size": [2, 2, 2],
    "position": [0, 5, 0],
    "color": [0.2, 0.8, 1],
    "material": "Neon",
    "anchored": true,
    "transparency": 0.3,
    "count": 10,
    "spread": 50
  }
]
</kodwerk>

REGELN FÜR OBJEKTE:
- shape kann sein: Block, Sphere, Cylinder, Wedge
- material kann sein: Neon, SmoothPlastic, Metal, Wood, Grass, Sand, Ice, Glass
- color ist RGB von 0-1
- count = wie viele Objekte spawnen
- spread = wie weit sie verteilt werden (in Studs)
- position = Startposition [x, y, z]
- Für Münzen: Cylinder, gelb, Metal
- Für Diamanten: Block, hellblau, Neon, transparency 0.2
- Für Kristalle: Block, lila, Neon
- Für Bäume: mehrere Objekte (Stamm + Krone)

GEMISCHTE ANTWORTEN MÖGLICH:
<kodwerk>
[
  {"type": "build", "name": "Coin", ...},
  {"type": "script", "code": "...", "scriptType": "Script", "location": "ServerScriptService", "name": "CoinCollector"}
]
</kodwerk>

SCRIPT REGELN:
- NIEMALS BodyVelocity, BodyGyro benutzen - DEPRECATED!
- Für Velocity: rootPart.AssemblyLinearVelocity
- IMMER game:GetService() benutzen
- IMMER WaitForChild() benutzen
- Character: player.Character or player.CharacterAdded:Wait()
- Vollständiger funktionierender Code ohne TODOs

SCRIPT ORTE:
- Input/Bewegung/Springen/Fliegen → StarterPlayerScripts (LocalScript)
- Charakter Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus → StarterGui (LocalScript)
- Spawning/Server Logik → ServerScriptService (Script)
- Shared Funktionen → ReplicatedStorage (ModuleScript)`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Nicht eingeloggt", { status: 401 });
  }

  const plan = await redis.get<string>(`plan:${userId}`);
  
  let key = "";
  if (plan === "pro") {
    const month = new Date().toISOString().substring(0, 7);
    key = `credits:${userId}:${month}`;
    const used = (await redis.get<number>(key)) || 0;
    if (used >= PRO_LIMIT) {
      return new Response("Monatslimit erreicht!", { status: 429 });
    }
  } else if (plan !== "unlimited") {
    const today = new Date().toISOString().split("T")[0];
    key = `credits:${userId}:${today}`;
    const used = (await redis.get<number>(key)) || 0;
    if (used >= FREE_LIMIT) {
      return new Response("Tageslimit erreicht!", { status: 429 });
    }
  }

  const { prompt, history = [] } = await req.json();

  const messages = [
    ...history,
    { role: "user" as const, content: prompt }
  ];

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const text = chunk.delta.text;
          fullText += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }

      const match = fullText.match(/<kodwerk>([\s\S]*?)<\/kodwerk>/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          const items = Array.isArray(parsed) ? parsed : [parsed];
          
          const processedItems = items.map((item: any) => {
            if (item.type === "build") {
              return {
                type: "build",
                name: item.name || "Part",
                shape: item.shape || "Block",
                size: item.size || [2, 2, 2],
                position: item.position || [0, 5, 0],
                color: item.color || [1, 1, 1],
                material: item.material || "SmoothPlastic",
                anchored: item.anchored !== false,
                transparency: item.transparency || 0,
                count: item.count || 1,
                spread: item.spread || 0,
              };
            } else {
              return {
                type: "script",
                code: (item.code || "").replace(/\\n/g, "\n"),
                name: item.name || "KodwerkScript",
                scriptType: item.scriptType || "LocalScript",
                location: item.location || "StarterPlayerScripts"
              };
            }
          });

          await redis.set(`pending:${userId}`, processedItems, { ex: 300 });

          if (key) {
            const used = (await redis.get<number>(key)) || 0;
            await redis.set(key, used + 1, { ex: plan === "pro" ? 2592000 : 86400 });
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, items: processedItems })}\n\n`));
        } catch (e) {
          console.error("Parse error:", e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        }
      } else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        }
      
      controller.close();
    }
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}