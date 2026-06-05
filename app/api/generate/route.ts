import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
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
          content: `Du bist ein erfahrener Roblox Studio Entwickler. Generiere IMMER funktionierenden Luau Code.

Antworte NUR mit JSON (kein Markdown):
{"code": "...", "scriptType": "LocalScript", "location": "StarterPlayerScripts", "name": "ScriptName"}

ORTE:
- Tastatur/Maus/Input/Bewegung/Springen/Fliegen → StarterPlayerScripts (LocalScript)
- Charakter Aussehen/Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus → StarterGui (LocalScript)
- Spawning/DataStore/Server Logik → ServerScriptService (Script)
- Shared Funktionen → ReplicatedStorage (ModuleScript)

WICHTIGE ROBLOX REGELN:
- NIEMALS direkt auf Character zugreifen ohne CharacterAdded:Wait()
- Für RootPart: local rootPart = character:WaitForChild("HumanoidRootPart")
- Für Velocity: rootPart.AssemblyLinearVelocity statt rootPart.Velocity
- IMMER game:GetService() benutzen
- IMMER WaitForChild() benutzen

BEISPIEL Doppelsprung:
local UIS = game:GetService("UserInputService")
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
local rootPart = character:WaitForChild("HumanoidRootPart")
local canDoubleJump = false
local hasDoubleJumped = false
humanoid.StateChanged:Connect(function(_, new)
    if new == Enum.HumanoidStateType.Freefall then
        canDoubleJump = true
        hasDoubleJumped = false
    elseif new == Enum.HumanoidStateType.Landed then
        canDoubleJump = false
        hasDoubleJumped = false
    end
end)
UIS.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == Enum.KeyCode.Space and canDoubleJump and not hasDoubleJumped then
        hasDoubleJumped = true
        rootPart.AssemblyLinearVelocity = Vector3.new(rootPart.AssemblyLinearVelocity.X, 50, rootPart.AssemblyLinearVelocity.Z)
    end
end)`
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

  let parsed = { code: "", scriptType: "LocalScript", location: "StarterPlayerScripts", name: "KodwerkScript" };
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
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