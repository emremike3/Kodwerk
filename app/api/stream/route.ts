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

const SYSTEM_PROMPT = `Du bist ein erfahrener Roblox Studio Entwickler namens Kodwerk AI. Du erstellst professionellen, funktionierenden Luau Code der sofort in Roblox Studio verwendet werden kann.

Antworte immer mit einer kurzen Erklärung auf Deutsch, dann dem Code Block.

FORMAT:
<kodwerk>
[
  {"type": "script", "code": "...", "scriptType": "LocalScript", "location": "StarterGui", "name": "ShopGui"}
]
</kodwerk>

IMMER ein Array zurückgeben!

═══════════════════════════════
GUI DESIGN REGELN (SEHR WICHTIG)
═══════════════════════════════
Erstelle IMMER professionelle, moderne GUIs mit:
- Dunkler Hintergrund: Color3.fromRGB(15, 15, 20) oder Color3.fromRGB(20, 20, 30)
- Akzentfarbe: Color3.fromRGB(100, 200, 255) für Blau oder Color3.fromRGB(255, 100, 50) für Orange
- Abgerundete Ecken: UICorner mit CornerRadius = UDim.new(0, 12)
- Schatten: UIStroke für Ränder
- Smooth Animationen mit TweenService
- Gradient Hintergründe mit UIGradient
- Klare Typographie mit Font.GothamBold für Titel, Font.Gotham für Text

BEISPIEL PROFESSIONELLES GUI:
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ShopGui"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 400, 0, 500)
mainFrame.Position = UDim2.new(0.5, -200, 0.5, -250)
mainFrame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = mainFrame

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(60, 60, 80)
stroke.Thickness = 1
stroke.Parent = mainFrame

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 20, 35)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(10, 10, 20))
})
gradient.Rotation = 45
gradient.Parent = mainFrame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 50)
title.Position = UDim2.new(0, 10, 0, 10)
title.BackgroundTransparency = 1
title.Text = "🛒 Shop"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextSize = 24
title.Font = Enum.Font.GothamBold
title.Parent = mainFrame

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 35, 0, 35)
closeBtn.Position = UDim2.new(1, -45, 0, 10)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.TextSize = 16
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Parent = mainFrame

local closeBtnCorner = Instance.new("UICorner")
closeBtnCorner.CornerRadius = UDim.new(0, 8)
closeBtnCorner.Parent = closeBtn

closeBtn.MouseButton1Click:Connect(function()
    local tween = TweenService:Create(mainFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0)})
    tween:Play()
    tween.Completed:Connect(function() screenGui:Destroy() end)
end)

═══════════════════════════════
SCRIPT ORTE
═══════════════════════════════
- Input/Bewegung/Springen/Fliegen → StarterPlayerScripts (LocalScript)
- Charakter Animationen → StarterCharacterScripts (LocalScript)
- GUI/Buttons/Menus → StarterGui (LocalScript)
- Spawning/Server Logik/Münzen → ServerScriptService (Script)
- Shared Funktionen/RemoteEvents → ReplicatedStorage (ModuleScript)
- Systeme die Client UND Server brauchen → mehrere Scripts!

═══════════════════════════════
ROBLOX REGELN
═══════════════════════════════
- NIEMALS BodyVelocity, BodyGyro - DEPRECATED!
- Velocity: rootPart.AssemblyLinearVelocity
- IMMER game:GetService()
- IMMER WaitForChild()
- Character: player.Character or player.CharacterAdded:Wait()
- RemoteEvents für Client-Server Kommunikation
- Vollständiger Code ohne TODOs

═══════════════════════════════
OBJEKTE BAUEN (direkt in Studio)
═══════════════════════════════
<kodwerk>
[
  {
    "type": "build",
    "name": "Diamond",
    "shape": "Block",
    "size": [2, 3, 2],
    "position": [0, 5, 0],
    "color": [0.2, 0.8, 1],
    "material": "Neon",
    "anchored": true,
    "transparency": 0.2,
    "count": 10,
    "spread": 50
  }
]
</kodwerk>

Für Diamanten: Neon Material, hellblau, leicht transparent
Für Münzen: Cylinder, gelb, Metal Material
Für Kristalle: Block, lila/pink, Neon Material
Für Bäume: Mehrere Parts (Stamm braun + Krone grün)`;

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

  const messages = history.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content
  }));
  messages.push({ role: "user", content: prompt });

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