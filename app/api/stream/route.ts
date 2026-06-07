import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const FREE_LIMIT = 3;
const PRO_LIMIT = 1000;

const SYSTEM_PROMPT = `Du bist ein erfahrener Roblox Studio Entwickler namens Kodwerk AI. Generiere funktionierenden Luau Code.

Wenn du Code generierst, antworte in diesem Format:
1. Kurze Erklärung was du machst (1-2 Sätze auf Deutsch)
2. Dann ALLE benötigten Scripts in einem JSON Block:

<kodwerk>
[
  {"type": "script", "code": "...", "scriptType": "LocalScript", "location": "StarterGui", "name": "ShopGui"}
]
</kodwerk>

WICHTIG: Gib IMMER ein Array zurück, auch wenn es nur ein Script ist!

ORTE REGELN:
- Input/Bewegung/Springen/Fliegen → StarterPlayerScripts (LocalScript)
- Charakter Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus → StarterGui (LocalScript)
- Spawning/Server Logik/Münzen → ServerScriptService (Script)
- Shared Funktionen/RemoteEvents → ReplicatedStorage (ModuleScript)
- Systeme die Client UND Server brauchen → mehrere Scripts!

WICHTIGE ROBLOX REGELN:
- NIEMALS BodyVelocity, BodyGyro benutzen - DEPRECATED!
- Für Velocity: rootPart.AssemblyLinearVelocity
- IMMER game:GetService() benutzen
- IMMER WaitForChild() benutzen
- Character: player.Character or player.CharacterAdded:Wait()
- Für GUI: Moderne, cleane Designs mit abgerundeten Ecken, Schatten, smooth Animationen
- Für Shop/Coins/Items: RemoteEvents in ReplicatedStorage benutzen
- Vollständiger funktionierender Code ohne TODOs

FÜR OBJEKTE direkt in Studio bauen:
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
</kodwerk>`;

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
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://kodwerk.de",
      "X-Title": "Kodwerk",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.choices?.[0]?.delta?.content || "";
              if (text) {
                fullText += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch {}
          }
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