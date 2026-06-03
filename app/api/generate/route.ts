import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { prompt } = await req.json();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Du bist ein Roblox Luau Experte. Generiere nur den Luau Code ohne Erklärungen.\n\nAnfrage: ${prompt}`
          }]
        }]
      }),
    });

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));
    
    const code = data.candidates?.[0]?.content?.parts?.[0]?.text || "Fehler beim Generieren";
    return NextResponse.json({ code });
    
  } catch (err) {
    console.error("API Fehler:", err);
    return NextResponse.json({ code: "Fehler: " + err });
  }
}