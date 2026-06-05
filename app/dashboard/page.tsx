"use client";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  code?: string;
  isStreaming?: boolean;
}

interface Project {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(3);
  const [plan, setPlan] = useState("free");
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then(res => res.json())
      .then(data => {
        setRemaining(data.remaining);
        setPlan(data.plan);
      });

    const saved = localStorage.getItem("kodwerk_projects");
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects(parsed);
      if (parsed.length > 0) {
        setActiveProjectId(parsed[0].id);
        setMessages(parsed[0].messages);
      }
    } else {
      createNewProject();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveProjects(updatedProjects: Project[]) {
    setProjects(updatedProjects);
    localStorage.setItem("kodwerk_projects", JSON.stringify(updatedProjects));
  }

  function createNewProject() {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Projekt ${projects.length + 1}`,
      messages: [],
      createdAt: Date.now(),
    };
    const updated = [newProject, ...projects];
    saveProjects(updated);
    setActiveProjectId(newProject.id);
    setMessages([]);
  }

  function switchProject(projectId: string) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProjectId(projectId);
      setMessages(project.messages);
    }
  }

  function updateProjectMessages(projectId: string, newMessages: Message[]) {
    const updated = projects.map(p => 
      p.id === projectId ? { ...p, messages: newMessages, name: newMessages[0]?.content.slice(0, 30) || p.name } : p
    );
    saveProjects(updated);
  }

  async function sendMessage() {
    if (!prompt.trim() || loading) return;
    
    const userMessage: Message = { role: "user", content: prompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setPrompt("");
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", content: "", isStreaming: true };
    const messagesWithAssistant = [...newMessages, assistantMessage];
    setMessages(messagesWithAssistant);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history }),
      });

      if (res.status === 429) {
        const errorMsg: Message = { role: "assistant", content: "❌ Tageslimit erreicht! Upgrade auf Pro für mehr Anfragen." };
        const final = [...newMessages, errorMsg];
        setMessages(final);
        if (activeProjectId) updateProjectMessages(activeProjectId, final);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let finalCode = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullContent += data.text;
                setMessages(prev => prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: fullContent, isStreaming: true } : m
                ));
              }
              if (data.done) {
                finalCode = data.code || "";
                const creditsRes = await fetch("/api/credits");
                const creditsData = await creditsRes.json();
                setRemaining(creditsData.remaining);
                setPlan(creditsData.plan);
              }
            } catch {}
          }
        }
      }

      const finalMessages = [...newMessages, { 
        role: "assistant" as const, 
        content: fullContent, 
        code: finalCode,
        isStreaming: false 
      }];
      setMessages(finalMessages);
      if (activeProjectId) updateProjectMessages(activeProjectId, finalMessages);

    } catch (err) {
      console.error(err);
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
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setCheckoutLoading("");
  }

  function getCreditsText() {
    if (plan === "unlimited") return "∞ Unlimited";
    if (plan === "pro") return `${remaining}/1000 Pro`;
    return `${remaining}/3 heute`;
  }

  function getPlanBadge() {
    if (plan === "unlimited") return <span style={{background:"#7C3AED", color:"white", padding:"0.15rem 0.5rem", borderRadius:"100px", fontSize:"0.7rem", fontWeight:600}}>UNLIMITED</span>;
    if (plan === "pro") return <span style={{background:"#E8500A", color:"white", padding:"0.15rem 0.5rem", borderRadius:"100px", fontSize:"0.7rem", fontWeight:600}}>PRO</span>;
    return null;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0E0E0E",
      color: "#F5F2ED",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500&display=swap');
        :root { --orange: #E8500A; --card-bg: #1A1A18; --border: rgba(255,255,255,0.08); --gray: #6B6860; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.5rem; border-bottom:0.5px solid var(--border); flex-shrink:0; background:#0E0E0E; z-index:10; }
        .logo { font-family:'Syne',sans-serif; font-weight:800; font-size:1.1rem; color:#F5F2ED; text-decoration:none; }
        .logo span { color:var(--orange); }
        .topbar-right { display:flex; align-items:center; gap:0.75rem; }
        .topbar-link { color:var(--gray); text-decoration:none; font-size:0.8rem; transition:color 0.2s; }
        .topbar-link:hover { color:#F5F2ED; }
        .credits-badge { font-size:0.75rem; color:var(--gray); background:var(--card-bg); padding:0.25rem 0.6rem; border-radius:100px; border:0.5px solid var(--border); }

        .body { display:flex; flex:1; overflow:hidden; }
        
        .sidebar { width:240px; border-right:0.5px solid var(--border); display:flex; flex-direction:column; flex-shrink:0; background:#0A0A0A; }
        .sidebar-header { padding:1rem; border-bottom:0.5px solid var(--border); }
        .new-project-btn { width:100%; background:var(--orange); color:white; border:none; padding:0.6rem 1rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.85rem; font-weight:500; cursor:pointer; transition:background 0.2s; text-align:left; display:flex; align-items:center; gap:0.5rem; }
        .new-project-btn:hover { background:#FF6B2B; }
        .projects-list { flex:1; overflow-y:auto; padding:0.5rem; }
        .project-item { padding:0.6rem 0.75rem; border-radius:8px; cursor:pointer; font-size:0.85rem; color:var(--gray); transition:all 0.15s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .project-item:hover { background:rgba(255,255,255,0.05); color:#F5F2ED; }
        .project-item.active { background:rgba(232,80,10,0.1); color:#F5F2ED; border:0.5px solid rgba(232,80,10,0.2); }
        
        .upgrade-sidebar { padding:1rem; border-top:0.5px solid var(--border); }
        .upgrade-sidebar-btn { width:100%; background:transparent; border:0.5px solid var(--border); color:var(--gray); padding:0.5rem; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.78rem; cursor:pointer; transition:all 0.2s; margin-bottom:0.5rem; }
        .upgrade-sidebar-btn:hover { border-color:var(--orange); color:#F5F2ED; }
        .upgrade-sidebar-btn.purple:hover { border-color:#7C3AED; }

        .chat-area { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .messages { flex:1; overflow-y:auto; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; }
        .messages::-webkit-scrollbar { width:4px; }
        .messages::-webkit-scrollbar-track { background:transparent; }
        .messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }

        .message { display:flex; gap:0.75rem; max-width:800px; margin:0 auto; width:100%; }
        .message.user { flex-direction:row-reverse; }
        .avatar { width:32px; height:32px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; }
        .avatar.ai { background:rgba(232,80,10,0.2); color:var(--orange); border:0.5px solid rgba(232,80,10,0.3); }
        .avatar.user-av { background:rgba(255,255,255,0.1); color:#F5F2ED; }
        .message-content { flex:1; }
        .message.user .message-content { display:flex; justify-content:flex-end; }
        .user-bubble { background:rgba(255,255,255,0.08); padding:0.75rem 1rem; border-radius:12px 12px 2px 12px; font-size:0.9rem; line-height:1.6; max-width:80%; }
        .ai-text { font-size:0.9rem; line-height:1.7; color:#D4D0C8; }
        .ai-text pre { background:rgba(0,0,0,0.4); border-radius:8px; padding:1rem; font-family:'Courier New',monospace; font-size:0.78rem; line-height:1.7; color:#A8C7A0; overflow-x:auto; margin-top:0.75rem; border:0.5px solid var(--border); }
        
        .thinking { display:flex; align-items:center; gap:0.5rem; color:var(--gray); font-size:0.85rem; }
        .thinking-dots { display:flex; gap:3px; }
        .thinking-dot { width:5px; height:5px; border-radius:50%; background:var(--orange); animation:bounce 1.2s infinite; }
        .thinking-dot:nth-child(2) { animation-delay:0.2s; }
        .thinking-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }

        .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2rem; }
        .empty-title { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:700; margin-bottom:0.5rem; }
        .empty-sub { color:var(--gray); font-size:0.9rem; margin-bottom:2rem; }
        .suggestions { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; max-width:500px; }
        .suggestion { background:var(--card-bg); border:0.5px solid var(--border); border-radius:10px; padding:0.75rem 1rem; font-size:0.85rem; color:var(--gray); cursor:pointer; text-align:left; transition:all 0.2s; }
        .suggestion:hover { border-color:rgba(232,80,10,0.3); color:#F5F2ED; }

        .input-area { padding:1rem 2rem 1.5rem; flex-shrink:0; max-width:800px; margin:0 auto; width:100%; }
        .input-wrapper { background:var(--card-bg); border:0.5px solid var(--border); border-radius:12px; padding:0.75rem 1rem; display:flex; align-items:flex-end; gap:0.75rem; transition:border-color 0.2s; }
        .input-wrapper:focus-within { border-color:rgba(232,80,10,0.4); }
        .input-wrapper textarea { flex:1; background:transparent; border:none; color:#F5F2ED; font-family:'DM Sans',sans-serif; font-size:0.9rem; resize:none; outline:none; max-height:120px; line-height:1.5; }
        .send-btn { background:var(--orange); color:white; border:none; width:34px; height:34px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.2s; font-size:1rem; }
        .send-btn:hover { background:#FF6B2B; }
        .send-btn:disabled { background:#333; cursor:not-allowed; }
        .input-hint { font-size:0.72rem; color:var(--gray); margin-top:0.5rem; text-align:center; }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <a href="/" className="logo">Kod<span>werk</span></a>
        <div className="topbar-right">
          {getPlanBadge()}
          <span className="credits-badge">{getCreditsText()}</span>
          <a href="/dashboard/token" className="topbar-link">🔌 Plugin</a>
          <a href="/dashboard/settings" className="topbar-link">⚙️ Settings</a>
          <UserButton />
        </div>
      </div>

      <div className="body">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <button className="new-project-btn" onClick={createNewProject}>
              ✚ Neues Projekt
            </button>
          </div>
          <div className="projects-list">
            {projects.map(project => (
              <div
                key={project.id}
                className={`project-item ${activeProjectId === project.id ? "active" : ""}`}
                onClick={() => switchProject(project.id)}
              >
                {project.name}
              </div>
            ))}
          </div>
          
          {plan === "free" && (
            <div className="upgrade-sidebar">
              <button className="upgrade-sidebar-btn" onClick={() => checkout("pro")} disabled={checkoutLoading === "pro"}>
                ⚡ Pro — 12€/Monat
              </button>
              <button className="upgrade-sidebar-btn purple" onClick={() => checkout("unlimited")} disabled={checkoutLoading === "unlimited"}>
                ∞ Unlimited — 29€/Monat
              </button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Was soll dein Spiel können?</div>
              <div className="empty-sub">Beschreibe auf Deutsch — Kodwerk baut es für dich</div>
              <div className="suggestions">
                {[
                  "Erstelle ein Doppelsprung System",
                  "Spawne Münzen auf der Map",
                  "Erstelle ein Flugsystem mit E",
                  "Baue ein Shop GUI"
                ].map(s => (
                  <button key={s} className="suggestion" onClick={() => setPrompt(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role === "user" ? "user" : ""}`}>
                  <div className={`avatar ${msg.role === "user" ? "user-av" : "ai"}`}>
                    {msg.role === "user" ? "Du" : "KW"}
                  </div>
                  <div className="message-content">
                    {msg.role === "user" ? (
                      <div className="user-bubble">{msg.content}</div>
                    ) : (
                      <div className="ai-text">
                        {msg.isStreaming && msg.content === "" ? (
                          <div className="thinking">
                            <div className="thinking-dots">
                              <div className="thinking-dot"></div>
                              <div className="thinking-dot"></div>
                              <div className="thinking-dot"></div>
                            </div>
                            Kodwerk denkt nach...
                          </div>
                        ) : (
                          <>
                            {msg.content.split("<kodwerk>")[0]}
                            {msg.code && (
                              <pre>{msg.code}</pre>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                placeholder="Beschreibe was du bauen willst..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="send-btn" onClick={sendMessage} disabled={loading || !prompt.trim()}>
                ↑
              </button>
            </div>
            <div className="input-hint">Enter zum Senden · Shift+Enter für neue Zeile</div>
          </div>
        </div>
      </div>
    </div>
  );
}