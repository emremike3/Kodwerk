"use client";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <main style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0E0E0E",
      color: "#F5F2ED",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --orange: #E8500A;
          --orange-light: #FF6B2B;
          --black: #0E0E0E;
          --white: #F5F2ED;
          --gray: #6B6860;
          --card-bg: #1A1A18;
          --border: rgba(255,255,255,0.08);
        }
        html { scroll-behavior: smooth; }
        .nav { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2.5rem; border-bottom:0.5px solid var(--border); position:sticky; top:0; background:rgba(14,14,14,0.92); backdrop-filter:blur(12px); z-index:100; }
        .logo { font-family:'Syne',sans-serif; font-weight:800; font-size:1.35rem; letter-spacing:-0.03em; color:var(--white); }
        .logo span { color:var(--orange); }
        .nav-links { display:flex; gap:2rem; list-style:none; align-items:center; }
        .nav-links a { color:var(--gray); text-decoration:none; font-size:0.9rem; transition:color 0.2s; }
        .nav-links a:hover { color:var(--white); }
        .nav-cta { background:var(--orange) !important; color:var(--white) !important; padding:0.5rem 1.25rem; border-radius:6px; font-weight:500; }
        .nav-cta:hover { background:var(--orange-light) !important; }
        .nav-dashboard { color:var(--white) !important; font-weight:500; }
        .hero { padding:7rem 2.5rem 5rem; max-width:900px; margin:0 auto; text-align:center; }
        .badge { display:inline-flex; align-items:center; gap:6px; background:rgba(232,80,10,0.12); border:0.5px solid rgba(232,80,10,0.35); color:var(--orange-light); font-size:0.78rem; font-weight:500; padding:0.35rem 0.85rem; border-radius:100px; margin-bottom:2rem; }
        .badge-dot { width:6px; height:6px; background:var(--orange); border-radius:50%; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        h1 { font-family:'Syne',sans-serif; font-size:clamp(2.8rem,6vw,5rem); font-weight:800; line-height:1.05; letter-spacing:-0.04em; margin-bottom:1.5rem; }
        h1 em { font-style:normal; color:var(--orange); }
        .hero-sub { font-size:1.1rem; color:var(--gray); line-height:1.65; max-width:560px; margin:0 auto 2.5rem; }
        .hero-sub strong { color:var(--white); font-weight:500; }
        .cta-group { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
        .btn-primary { background:var(--orange); color:var(--white); border:none; padding:0.85rem 2rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:500; cursor:pointer; transition:background 0.2s,transform 0.15s; }
        .btn-primary:hover { background:var(--orange-light); transform:translateY(-1px); }
        .btn-secondary { background:transparent; color:var(--white); border:0.5px solid var(--border); padding:0.85rem 2rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:500; cursor:pointer; transition:border-color 0.2s,transform 0.15s; }
        .btn-secondary:hover { border-color:rgba(255,255,255,0.25); transform:translateY(-1px); }
        .demo-wrap { max-width:780px; margin:5rem auto 0; padding:0 2.5rem; }
        .demo-box { background:var(--card-bg); border:0.5px solid var(--border); border-radius:14px; overflow:hidden; }
        .demo-topbar { display:flex; align-items:center; gap:8px; padding:0.75rem 1rem; border-bottom:0.5px solid var(--border); }
        .dot { width:10px; height:10px; border-radius:50%; }
        .dot-red { background:#FF5F57; }
        .dot-yellow { background:#FEBC2E; }
        .dot-green { background:#28C840; }
        .demo-label { font-size:0.75rem; color:var(--gray); margin-left:auto; font-family:monospace; }
        .demo-body { display:grid; grid-template-columns:1fr 1fr; }
        .demo-input-side { padding:1.25rem; border-right:0.5px solid var(--border); }
        .demo-output-side { padding:1.25rem; }
        .demo-section-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--gray); margin-bottom:0.75rem; }
        .demo-prompt { background:rgba(255,255,255,0.04); border:0.5px solid var(--border); border-radius:8px; padding:0.85rem 1rem; font-size:0.9rem; color:var(--white); line-height:1.5; margin-bottom:0.75rem; }
        .demo-prompt-hint { font-size:0.75rem; color:var(--gray); }
        .code-block { background:rgba(0,0,0,0.3); border-radius:8px; padding:1rem; font-family:'Courier New',monospace; font-size:0.78rem; line-height:1.7; color:#A8C7A0; }
        .code-keyword { color:#C792EA; }
        .code-func { color:#82AAFF; }
        .code-comment { color:#546E7A; }
        .code-num { color:#F78C6C; }
        .features { max-width:900px; margin:6rem auto; padding:0 2.5rem; }
        .section-label { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; color:var(--orange); margin-bottom:1rem; font-weight:500; }
        .section-title { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3.5vw,2.6rem); font-weight:700; letter-spacing:-0.03em; margin-bottom:3rem; line-height:1.15; }
        .features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; }
        .feature-card { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; transition:border-color 0.2s; }
        .feature-card:hover { border-color:rgba(232,80,10,0.3); }
        .feature-icon { width:38px; height:38px; background:rgba(232,80,10,0.12); border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:1rem; font-size:18px; }
        .feature-title { font-family:'Syne',sans-serif; font-size:1rem; font-weight:700; margin-bottom:0.5rem; }
        .feature-desc { font-size:0.875rem; color:var(--gray); line-height:1.6; }
        .pricing { max-width:1000px; margin:0 auto 6rem; padding:0 2.5rem; }
        .pricing-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-top:3rem; }
        .pricing-card { background:var(--card-bg); border:0.5px solid var(--border); border-radius:14px; padding:2rem; position:relative; }
        .pricing-card.featured { border-color:var(--orange); }
        .pricing-badge { position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--orange); color:var(--white); font-size:0.7rem; font-weight:500; padding:0.25rem 0.75rem; border-radius:100px; white-space:nowrap; }
        .plan-name { font-family:'Syne',sans-serif; font-size:1rem; font-weight:700; margin-bottom:0.5rem; }
        .plan-price { font-family:'Syne',sans-serif; font-size:2.2rem; font-weight:800; letter-spacing:-0.04em; margin-bottom:0.25rem; }
        .plan-price span { font-size:1rem; font-weight:400; color:var(--gray); }
        .plan-desc { font-size:0.8rem; color:var(--gray); margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:0.5px solid var(--border); }
        .plan-features { list-style:none; display:flex; flex-direction:column; gap:0.65rem; margin-bottom:1.5rem; }
        .plan-features li { font-size:0.85rem; color:var(--gray); display:flex; align-items:center; gap:8px; }
        .plan-features li::before { content:'✓'; color:var(--orange); font-weight:700; font-size:0.8rem; }
        .plan-btn { width:100%; padding:0.75rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .plan-btn-outline { background:transparent; border:0.5px solid var(--border); color:var(--white); }
        .plan-btn-filled { background:var(--orange); border:none; color:var(--white); }
        .plan-btn-filled:hover { background:var(--orange-light); }
        footer { border-top:0.5px solid var(--border); padding:2rem 2.5rem; display:flex; align-items:center; justify-content:space-between; max-width:900px; margin:0 auto; }
        footer p { font-size:0.8rem; color:var(--gray); }
      `}</style>

      <nav className="nav">
        <div className="logo">Kod<span>werk</span></div>
        <ul className="nav-links">
          <li><a href="#funktionen">Funktionen</a></li>
          <li><a href="#preise">Preise</a></li>
          <li><a href="#">Discord</a></li>
          {isSignedIn ? (
            <>
              <li><a href="/dashboard" className="nav-dashboard">Dashboard</a></li>
              <li><UserButton /></li>
            </>
          ) : (
            <li><a href="/sign-in" className="nav-cta">Kostenlos starten</a></li>
          )}
        </ul>
      </nav>

      <section>
        <div className="hero">
          <div className="badge">
            <div className="badge-dot"></div>
            Das erste KI-Tool für deutsche Roblox-Entwickler
          </div>
          <h1>Erstelle Roblox-Spiele —<br /><em>ohne Code zu lernen</em></h1>
          <p className="hero-sub">
            Beschreibe einfach auf <strong>Deutsch</strong>, was dein Spiel können soll.<br />
            Kodwerk schreibt den Code — du machst das Spiel.
          </p>
          <div className="cta-group">
            <a href={isSignedIn ? "/dashboard" : "/sign-in"}>
              <button className="btn-primary">
                {isSignedIn ? "Zum Dashboard →" : "Jetzt kostenlos starten"}
              </button>
            </a>
            <a href="#funktionen"><button className="btn-secondary">Mehr erfahren →</button></a>
          </div>
        </div>

        <div className="demo-wrap">
          <div className="demo-box">
            <div className="demo-topbar">
              <div className="dot dot-red"></div>
              <div className="dot dot-yellow"></div>
              <div className="dot dot-green"></div>
              <span className="demo-label">kodwerk.de — Live Demo</span>
            </div>
            <div className="demo-body">
              <div className="demo-input-side">
                <div className="demo-section-label">Deine Anfrage</div>
                <div className="demo-prompt">
                  &quot;Erstelle ein Sprungsystem bei dem der Spieler doppelt springen kann und nach dem zweiten Sprung kurz leuchtet.&quot;
                </div>
                <div className="demo-prompt-hint">↑ Einfach auf Deutsch beschreiben</div>
              </div>
              <div className="demo-output-side">
                <div className="demo-section-label">Generierter Luau Code</div>
                <div className="code-block">
                  <span className="code-keyword">local</span> player = game.Players.LocalPlayer<br />
                  <span className="code-keyword">local</span> char = player.Character<br />
                  <span className="code-keyword">local</span> jumps = <span className="code-num">0</span><br />
                  <br />
                  <span className="code-keyword">local function</span> <span className="code-func">onJump</span>()<br />
                  &nbsp;&nbsp;<span className="code-keyword">if</span> jumps &lt; <span className="code-num">2</span> <span className="code-keyword">then</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;jumps = jumps + <span className="code-num">1</span><br />
                  &nbsp;&nbsp;<span className="code-keyword">end</span><br />
                  <span className="code-keyword">end</span><br />
                  <span className="code-comment">-- direkt in Studio eingefügt ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="funktionen">
        <div className="section-label">Funktionen</div>
        <div className="section-title">Alles was du brauchst,<br />um loszulegen</div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <div className="feature-title">Auf Deutsch beschreiben</div>
            <p className="feature-desc">Kein Englisch nötig. Erkläre dein Spielkonzept auf Deutsch — Kodwerk versteht dich.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <div className="feature-title">Auto-Sync mit Studio</div>
            <p className="feature-desc">Der generierte Code landet automatisch im richtigen Modul in deinem Roblox Studio Projekt.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🐛</div>
            <div className="feature-title">Fehler finden & fixen</div>
            <p className="feature-desc">Kodwerk liest deine Studio-Konsole mit und hilft dir, Bugs schnell aufzuspüren und zu lösen.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">↩️</div>
            <div className="feature-title">Versionshistorie</div>
            <p className="feature-desc">Jede Anfrage wird gespeichert. Spring jederzeit zu einer früheren Version zurück.</p>
          </div>
        </div>
      </section>

      <section className="pricing" id="preise">
        <div className="section-label">Preise</div>
        <div className="section-title">Einfach & fair</div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="plan-name">Kostenlos</div>
            <div className="plan-price">0€ <span>/ Monat</span></div>
            <div className="plan-desc">Perfekt zum Ausprobieren</div>
            <ul className="plan-features">
              <li>3 Anfragen pro Tag</li>
              <li>Auto-Sync mit Studio</li>
              <li>Deutsche Oberfläche</li>
              <li>Community Support</li>
            </ul>
            <a href="/sign-in"><button className="plan-btn plan-btn-outline">Kostenlos starten</button></a>
          </div>
          <div className="pricing-card featured">
            <div className="pricing-badge">BELIEBT</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">12€ <span>/ Monat</span></div>
            <div className="plan-desc">Für aktive Entwickler</div>
            <ul className="plan-features">
              <li>1.000 Anfragen pro Monat</li>
              <li>Auto-Sync mit Studio</li>
              <li>Prioritäts-Support</li>
              <li>Früher Zugang zu Features</li>
            </ul>
            <a href="/sign-in"><button className="plan-btn plan-btn-filled">Pro werden</button></a>
          </div>
          <div className="pricing-card">
            <div className="plan-name">Unlimited</div>
            <div className="plan-price">29€ <span>/ Monat</span></div>
            <div className="plan-desc">Für ernsthafte Entwickler</div>
            <ul className="plan-features">
              <li>Unbegrenzte Anfragen</li>
              <li>Auto-Sync mit Studio</li>
              <li>Prioritäts-Support</li>
              <li>Früher Zugang zu Features</li>
            </ul>
            <a href="/sign-in"><button className="plan-btn plan-btn-outline">Unlimited werden</button></a>
          </div>
        </div>
      </section>

      <footer>
        <div className="logo">Kod<span style={{color: "var(--orange)"}}>werk</span></div>
        <p>© 2026 Kodwerk. Für die deutsche Roblox-Community.</p>
      </footer>

    </main>
  );
}