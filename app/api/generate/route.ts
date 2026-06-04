import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { prompt } = await req.json();

  try {
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
            content: "Du bist ein Roblox Luau Experte. Generiere nur den Luau Code ohne Erklärungen, nur den reinen Code."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    const data = await response.json();
    const code = data.choices?.[0]?.message?.content || "Fehler beim Generieren";
    return NextResponse.json({ code });
    
  } catch (err) {
    console.error("API Fehler:", err);
    return NextResponse.json({ code: "Fehler: " + err });
  }
}