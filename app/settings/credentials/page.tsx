"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Plus, ShieldCheck } from "lucide-react";

type Credential = { id: string; name: string; provider: string; createdAt: string };

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setBusy(true);
    const response = await fetch("/api/credentials");
    const data = await response.json();
    if (response.ok) setCredentials(data.credentials);
    else setMessage(data.error || "Unable to load credentials.");
    setBusy(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provider, data: { apiKey: value } }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Unable to save credential.");
    else { setCredentials((current) => [data.credential, ...current]); setName(""); setValue(""); setMessage("Credential saved securely."); }
    setSaving(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Auto<span>Noder</span></div>
        <nav className="nav">
          <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
          <Link className="nav-item" href="/workflows"><KeyRound size={17}/><span>Workflows</span></Link>
          <Link className="nav-item active" href="/settings/credentials"><ShieldCheck size={17}/><span>Credentials</span></Link>
        </nav>
        <div className="sidebar-footer">Secrets are encrypted before they are persisted.</div>
      </aside>
      <main className="main">
        <header className="topbar"><h1>Credentials</h1><Link className="btn ghost" href="/workflows/new">Build workflow</Link></header>
        <section className="content">
          <div className="hero"><div><h2>Secure connections</h2><p>Store provider keys once and reference them from workflow nodes.</p></div></div>
          <div className="workflow-grid">
            <section className="card">
              <div className="card-head"><h3><Plus size={15}/> Add credential</h3></div>
              <form className="auth-form" onSubmit={submit}>
                <label>Name<input className="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="My OpenAI key" required /></label>
                <label>Provider<select className="search" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="google">Google AI</option><option value="custom">Custom API</option></select></label>
                <label>API key<input className="search" type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="sk-…" required /></label>
                <button className="btn primary auth-submit" disabled={saving}>{saving ? <><Loader2 className="spin" size={15}/> Saving…</> : "Save credential"}</button>
                {message && <div className="auth-error" style={{borderColor: "#324736", background: "#121d16", color: "#a9e7be"}}>{message}</div>}
              </form>
            </section>
            <section className="card">
              <div className="card-head"><h3>Stored credentials</h3><span className="badge">Secrets hidden</span></div>
              {busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : credentials.length === 0 ? <div className="empty">No credentials yet.</div> : <div className="list">{credentials.map((credential) => <div className="list-row" key={credential.id}><div><strong>{credential.name}</strong><br/><small>{credential.provider} · added {new Date(credential.createdAt).toLocaleDateString()}</small></div><span className="badge">Encrypted</span></div>)}</div>}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
