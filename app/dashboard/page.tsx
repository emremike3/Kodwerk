"use client";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(5);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/credits")
      .then(res => res.json())
      .then(data => setRemaining(data.remaining));
  }, []);

  async function generateCode() {
    if (!prompt.trim()) return;
    setLoading(true);
    setCode("");
    setError("");
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setCode(data.code);
        setRemaining(data.remaining);
      }
    } catch (err) {
      console.error("fehler", err);
    }
    
    setLoading(false);
  }

  return (
    <main style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0E0E0E",
      color: "#F5F2ED",
      minHeight: "100vh",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500&display=swap');
        :root { --orange: #E8500A; --card-bg: #1A1A18; --border: rgba(255,255,255,0.08); --gray: #6B6860; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:1rem 2rem; border-bottom:0.5px solid var(--border); }
        .logo { font-family:'Syne',sans-serif; font-weight:800; font-size:1.2rem; color:#F5F2ED; text-decoration:none; }
        .logo span { color:var(--orange); }
        .main { max-width:800px; margin:3rem auto; padding:0 2rem; }
        .title { font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:700; margin-bottom:0.5rem; }
        .subtitle { color:var(--gray); margin-bottom:2rem; }
        .input-box { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:1rem; }
        .input-box textarea { width:100%; background:transparent; border:none; color:#F5F2ED; font-family:'DM Sans',sans-serif; font-size:1rem; resize:none; outline:none; min-height:120px; }
        .send-btn { background:var(--orange); color:white; border:none; padding:0.85rem 2rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:500; cursor:pointer; width:100%; transition:background 0.2s; }
        .send-btn:hover { background:#FF6B2B; }
        .send-btn:disabled { background:#555; cursor:not-allowed; }
        .credits { font-size:0.8rem; color:var(--gray); text-align:center; margin-top:1rem; }
        .error { font-size:0.9rem; color:#FF5F57; text-align:center; margin-top:1rem; padding:1rem; background:rgba(255,95,87,0.1); border-radius:8px; }
        .code-output { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-top:2rem; }
        .code-label { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--gray); margin-bottom:1rem; }
        .code-output pre { font-family:'Courier New',monospace; font-size:0.85rem; line-height:1.7; color:#A8C7A0; white-space:pre-wrap; word-break:break-word; }
        .copy-btn { background:transparent; border:0.5px solid var(--border); color:#F5F2ED; padding:0.5rem 1rem; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:0.8rem; cursor:pointer; margin-top:1rem; }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo">Kod<span>werk</span></a>
        <UserButton />
      </div>

      <div className="main">
        <div className="title">Was soll dein Spiel können?</div>
        <p className="subtitle">Beschreibe es auf Deutsch — Kodwerk generiert den Luau Code.</p>
        <div className="input-box">
          <textarea 
            placeholder="z.B. Erstelle ein Sprungsystem..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <button className="send-btn" onClick={generateCode} disabled={loading || remaining === 0}>
          {loading ? "Generiert..." : "Code generieren ⚡"}
        </button>
        
        {error && <div className="error">{error}</div>}
        
        <p className="credits">
          {remaining} von 5 kostenlosen Anfragen heute verfügbar
        </p>

        {code && (
          <div className="code-output">
            <div className="code-label">Generierter Luau Code</div>
            <pre>{code}</pre>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(code)}>
              Code kopieren 📋
            </button>
          </div>
        )}
      </div>
    </main>
  );
}