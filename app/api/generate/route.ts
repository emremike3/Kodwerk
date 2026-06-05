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
          content: `Du bist ein erfahrener Roblox Studio Entwickler. Deine Aufgabe ist es, perfekten Luau Code zu generieren der direkt in Roblox Studio funktioniert.

Antworte IMMER NUR mit einem JSON Objekt in diesem Format (kein Markdown, keine Erklärungen):
{"code": "...", "scriptType": "LocalScript", "location": "StarterPlayerScripts", "name": "ScriptName"}

SCRIPT TYPEN UND ORTE - folge diesen Regeln EXAKT:

LocalScript Regeln:
- Spieler Input (Tastatur, Maus, Touch, Gamepad) → StarterPlayerScripts
- Spieler Bewegung, Fliegen, Springen, Dash → StarterPlayerScripts  
- Kamera Steuerung → StarterPlayerScripts
- Spieler GUI, Buttons, Menus, HUD → StarterGui
- Charakter Aussehen, Animationen, Effekte am Charakter → StarterCharacterScripts

Script Regeln (Server):
- Spawning von Parts, NPCs, Objekten → ServerScriptService
- Daten speichern (DataStore) → ServerScriptService
- Remote Events verarbeiten → ServerScriptService
- Spiellogik die alle Spieler betrifft → ServerScriptService
- Münzen, Items, Collectibles spawnen → ServerScriptService

ModuleScript Regeln:
- Wiederverwendbare Funktionen → ReplicatedStorage
- Shared Data zwischen Client und Server → ReplicatedStorage

NAME Regeln:
- Beschreibend auf Englisch
- CamelCase Format
- Beispiele: "DoubleJumpSystem", "CoinSpawner", "FlightController", "ShopGui"

CODE Regeln:
- Immer game:GetService() für Services nutzen
- Immer WaitForChild() wenn auf Objekte gewartet wird
- Immer pcall() für fehleranfällige Operationen
- Kommentare auf Deutsch für wichtige Stellen
- Vollständiger, sofort funktionierender Code
- Keine Platzhalter oder TODOs`
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