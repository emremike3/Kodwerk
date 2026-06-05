"use client";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(3);
  const [plan, setPlan] = useState("free");
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState("");

  useEffect(() => {
    fetch("/api/credits")
      .then(res => res.json())
      .then(data => {
        setRemaining(data.remaining);
        setPlan(data.plan);
      });
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
        setPlan(data.plan);
      }
    } catch (err) {
      console.error("fehler", err);
    }
    
    setLoading(false);
  }

  async function checkout(planName: string) {
    setCheckoutLoading(planName);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.switched) {
        setPlan(planName);
        window.location.reload();
      }
    } catch (err) {
      console.error("checkout fehler", err);
    }
    setCheckoutLoading("");
  }

  function getCreditsText() {
    if (plan === "unlimited") return "Unbegrenzte Anfragen verfügbar ∞";
    if (plan === "pro") return `${remaining} von 1.000 Pro Anfragen diesen Monat verfügbar`;
    return `${remaining} von 3 kostenlosen Anfragen heute verfügbar`;
  }

  function getPlanBadge() {
    if (plan === "unlimited") return <span style={{background:"#7C3AED", color:"white", padding:"0.2rem 0.6rem", borderRadius:"100px", fontSize:"0.75rem", fontWeight:600}}>UNLIMITED</span>;
    if (plan === "pro") return <span style={{background:"#E8500A", color:"white", padding:"0.2rem 0.6rem", borderRadius:"100px", fontSize:"0.75rem", fontWeight:600}}>PRO</span>;
    return null;
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
        .plugin-link { color:var(--gray); text-decoration:none; font-size:0.85rem; transition:color 0.2s; }
        .plugin-link:hover { color:#F5F2ED; }
        .upgrade-box { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-top:2rem; display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap; }
        .upgrade-text { font-size:0.9rem; color:var(--gray); }
        .upgrade-text strong { color:#F5F2ED; }
        .upgrade-btns { display:flex; gap:0.75rem; }
        .btn-pro { background:var(--orange); color:white; border:none; padding:0.6rem 1.25rem; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:0.85rem; font-weight:500; cursor:pointer; transition:background 0.2s; }
        .btn-pro:hover { background:#FF6B2B; }
        .btn-pro:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-unlimited { background:#7C3AED; color:white; border:none; padding:0.6rem 1.25rem; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:0.85rem; font-weight:500; cursor:pointer; transition:background 0.2s; }
        .btn-unlimited:hover { background:#6D28D9; }
        .btn-unlimited:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo">Kod<span>werk</span></a>
        <div style={{display:"flex", alignItems:"center", gap:"1rem"}}>
          {getPlanBadge()}
          <a href="/dashboard/token" className="plugin-link">🔌 Plugin verbinden</a>
          <a href="/dashboard/settings" className="plugin-link">⚙️ Einstellungen</a>
          <UserButton />
        </div>
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
        <button className="send-btn" onClick={generateCode} disabled={loading || (plan === "free" && remaining === 0)}>
          {loading ? "Generiert..." : "Code generieren ⚡"}
        </button>
        
        {error && <div className="error">{error}</div>}
        
        <p className="credits">{getCreditsText()}</p>

        {plan === "free" && (
          <div className="upgrade-box">
            <div className="upgrade-text">
              <strong>Mehr Anfragen?</strong> Upgrade auf Pro oder Unlimited!
            </div>
            <div className="upgrade-btns">
              <button className="btn-pro" onClick={() => checkout("pro")} disabled={checkoutLoading === "pro"}>
                {checkoutLoading === "pro" ? "Lädt..." : "Pro — 12€/Monat"}
              </button>
              <button className="btn-unlimited" onClick={() => checkout("unlimited")} disabled={checkoutLoading === "unlimited"}>
                {checkoutLoading === "unlimited" ? "Lädt..." : "Unlimited — 29€/Monat"}
              </button>
            </div>
          </div>
        )}

        {plan === "pro" && (
          <div className="upgrade-box">
            <div className="upgrade-text">
              <strong>Willst du noch mehr?</strong> Upgrade auf Unlimited!
            </div>
            <div className="upgrade-btns">
              <button className="btn-unlimited" onClick={() => checkout("unlimited")} disabled={checkoutLoading === "unlimited"}>
                {checkoutLoading === "unlimited" ? "Lädt..." : "Unlimited — 29€/Monat"}
              </button>
            </div>
          </div>
        )}

        {plan === "unlimited" && (
          <div className="upgrade-box">
            <div className="upgrade-text">
              <strong>Plan wechseln?</strong> Wechsle zu Pro.
            </div>
            <div className="upgrade-btns">
              <button className="btn-pro" onClick={() => checkout("pro")} disabled={checkoutLoading === "pro"}>
                {checkoutLoading === "pro" ? "Lädt..." : "Pro — 12€/Monat"}
              </button>
            </div>
          </div>
        )}

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