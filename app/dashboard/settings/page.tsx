"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [plan, setPlan] = useState("free");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [cancelledDate, setCancelledDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/credits")
      .then(res => res.json())
      .then(data => {
        setPlan(data.plan);
        setRenewalDate(data.renewalDate);
        setCancelledDate(data.cancelledDate);
        setLoading(false);
      });
  }, []);

  async function cancelSubscription() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCancelledDate(data.endDate);
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
    }
    setCancelLoading(false);
  }

  function getPlanName() {
    if (plan === "pro") return "Pro — 12€/Monat";
    if (plan === "unlimited") return "Unlimited — 29€/Monat";
    return "Kostenlos";
  }

  function getPlanColor() {
    if (plan === "unlimited") return "#7C3AED";
    if (plan === "pro") return "#E8500A";
    return "#6B6860";
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
        .title { font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:700; margin-bottom:2rem; }
        .card { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:1rem; }
        .card-title { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--gray); margin-bottom:1rem; }
        .plan-badge { display:inline-block; padding:0.35rem 0.85rem; border-radius:100px; font-size:0.85rem; font-weight:600; margin-bottom:1rem; }
        .renewal-info { font-size:0.85rem; color:var(--gray); margin-bottom:1rem; padding:0.75rem 1rem; background:rgba(255,255,255,0.04); border-radius:8px; }
        .renewal-info strong { color:#F5F2ED; }
        .cancelled-info { font-size:0.85rem; color:#FEBC2E; margin-bottom:1rem; padding:0.75rem 1rem; background:rgba(254,188,46,0.1); border:0.5px solid rgba(254,188,46,0.3); border-radius:8px; }
        .cancelled-info strong { color:#FEBC2E; }
        .cancel-btn { background:transparent; border:0.5px solid rgba(255,95,87,0.4); color:#FF5F57; padding:0.75rem 1.5rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.9rem; cursor:pointer; transition:all 0.2s; width:100%; margin-top:1rem; }
        .cancel-btn:hover { background:rgba(255,95,87,0.1); }
        .cancel-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .back-link { color:var(--gray); text-decoration:none; font-size:0.9rem; display:inline-block; margin-top:1.5rem; }
        .back-link:hover { color:#F5F2ED; }
        .modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal { background:#1A1A18; border:0.5px solid rgba(255,255,255,0.12); border-radius:16px; padding:2rem; max-width:400px; width:90%; }
        .modal-title { font-family:'Syne',sans-serif; font-size:1.3rem; font-weight:700; margin-bottom:0.75rem; }
        .modal-text { color:var(--gray); font-size:0.9rem; line-height:1.6; margin-bottom:1.5rem; }
        .modal-btns { display:flex; gap:0.75rem; }
        .modal-cancel { flex:1; background:transparent; border:0.5px solid var(--border); color:#F5F2ED; padding:0.75rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.9rem; cursor:pointer; }
        .modal-confirm { flex:1; background:#FF5F57; border:none; color:white; padding:0.75rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:500; cursor:pointer; }
        .modal-confirm:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Abo kündigen?</div>
            <p className="modal-text">
              Bist du sicher dass du dein Abo kündigen möchtest? Du behältst deinen Zugang bis zum Ende der aktuellen Abrechnungsperiode.
            </p>
            <div className="modal-btns">
              <button className="modal-cancel" onClick={() => setShowModal(false)}>
                Abbrechen
              </button>
              <button className="modal-confirm" onClick={cancelSubscription} disabled={cancelLoading}>
                {cancelLoading ? "Wird gekündigt..." : "Ja, kündigen"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar">
        <a href="/" className="logo">Kod<span>werk</span></a>
      </div>

      <div className="main">
        <div className="title">Einstellungen</div>

        {loading ? (
          <div style={{color: "#6B6860"}}>Lädt...</div>
        ) : (
          <>
            <div className="card">
              <div className="card-title">Aktueller Plan</div>
              <div className="plan-badge" style={{background: getPlanColor(), color: "white"}}>
                {getPlanName()}
              </div>

              {cancelledDate && (
                <div className="cancelled-info">
                  ⚠️ Dein Abo wurde gekündigt. Du hast bis zum <strong>{cancelledDate}</strong> noch Zugriff.
                </div>
              )}

              {renewalDate && plan !== "free" && !cancelledDate && (
                <div className="renewal-info">
                  Nächste Verlängerung: <strong>{renewalDate}</strong>
                </div>
              )}
              
              {plan !== "free" && !cancelledDate && (
                <>
                  <p style={{fontSize: "0.85rem", color: "#6B6860", marginBottom: "0.5rem"}}>
                    Dein Abo verlängert sich automatisch monatlich und kann jederzeit gekündigt werden.
                  </p>
                  <button className="cancel-btn" onClick={() => setShowModal(true)}>
                    Abo kündigen
                  </button>
                </>
              )}

              {plan === "free" && !cancelledDate && (
                <p style={{fontSize: "0.85rem", color: "#6B6860"}}>
                  Du bist auf dem kostenlosen Plan. <a href="/dashboard" style={{color: "#E8500A"}}>Upgrade jetzt!</a>
                </p>
              )}
            </div>

            <a href="/dashboard" className="back-link">← Zurück zum Dashboard</a>
          </>
        )}
      </div>
    </main>
  );
}