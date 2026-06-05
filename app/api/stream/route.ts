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

const SYSTEM_PROMPT = `Du bist ein erfahrener Roblox Studio Entwickler namens Kodwerk AI. Generiere funktionierenden Luau Code.

Wenn du Code generierst, antworte in diesem Format:
1. Kurze Erklärung was du machst (1-2 Sätze auf Deutsch)
2. Dann den Code in einem JSON Block:
<kodwerk>
{"code": "...", "scriptType": "LocalScript", "location": "StarterPlayerScripts", "name": "ScriptName"}
</kodwerk>

ORTE REGELN:
- Input/Bewegung/Springen/Fliegen → StarterPlayerScripts (LocalScript)
- Charakter Aussehen/Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus → StarterGui (LocalScript)
- Spawning/Server Logik/Münzen → ServerScriptService (Script)
- Shared Funktionen → ReplicatedStorage (ModuleScript)

WICHTIGE ROBLOX REGELN:
- NIEMALS BodyVelocity, BodyGyro benutzen - DEPRECATED!
- Für Velocity: rootPart.AssemblyLinearVelocity
- IMMER game:GetService() benutzen
- IMMER WaitForChild() benutzen
- Character: player.Character or player.CharacterAdded:Wait()
- Vollständiger funktionierender Code ohne TODOs`;

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
    max_tokens: 4096,
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

      // Extract and save code
      const match = fullText.match(/<kodwerk>([\s\S]*?)<\/kodwerk>/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          parsed.code = parsed.code.replace(/\\n/g, "\n");
          
          await redis.set(`pending:${userId}`, {
            code: parsed.code,
            name: parsed.name || "KodwerkScript",
            scriptType: parsed.scriptType || "LocalScript",
            location: parsed.location || "StarterPlayerScripts"
          }, { ex: 300 });

          if (key) {
            const used = (await redis.get<number>(key)) || 0;
            await redis.set(key, used + 1, { ex: plan === "pro" ? 2592000 : 86400 });
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, code: parsed.code })}\n\n`));
        } catch {
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