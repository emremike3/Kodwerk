"use client";
import { useEffect, useState } from "react";

export default function TokenPage() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/token")
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        .main { max-width:600px; margin:3rem auto; padding:0 2rem; }
        .title { font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:700; margin-bottom:0.5rem; }
        .subtitle { color:var(--gray); margin-bottom:2rem; line-height:1.6; }
        .token-box { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:1rem; }
        .token-label { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--gray); margin-bottom:0.75rem; }
        .token-value { font-family:'Courier New',monospace; font-size:0.9rem; color:#A8C7A0; word-break:break-all; margin-bottom:1rem; }
        .copy-btn { background:var(--orange); color:white; border:none; padding:0.85rem 2rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:500; cursor:pointer; width:100%; transition:background 0.2s; }
        .copy-btn:hover { background:#FF6B2B; }
        .back-link { color:var(--gray); text-decoration:none; font-size:0.9rem; display:inline-block; margin-top:1.5rem; }
        .back-link:hover { color:#F5F2ED; }
        .steps { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-top:1.5rem; }
        .step { display:flex; gap:1rem; margin-bottom:1rem; align-items:flex-start; }
        .step-num { background:var(--orange); color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0; }
        .step-text { font-size:0.875rem; color:var(--gray); line-height:1.5; }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo">Kod<span>werk</span></a>
      </div>

      <div className="main">
        <div className="title">Plugin verbinden</div>
        <p className="subtitle">Kopiere deinen persönlichen Token und füge ihn im Kodwerk Plugin in Roblox Studio ein.</p>
        
        <div className="token-box">
          <div className="token-label">Dein Plugin Token</div>
          <div className="token-value">{token || "Lädt..."}</div>
          <button className="copy-btn" onClick={copyToken}>
            {copied ? "Kopiert! ✓" : "Token kopieren 📋"}
          </button>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-text">Installiere das Kodwerk Plugin in Roblox Studio</div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-text">Klicke auf den Kodwerk Button in der Plugins Leiste</div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-text">Füge deinen Token ein und klicke auf Verbinden</div>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-text">Generiere Code auf kodwerk.de — er erscheint automatisch in Studio!</div>
          </div>
        </div>

        <a href="/dashboard" className="back-link">← Zurück zum Dashboard</a>
      </div>
    </main>
  );
}