"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, History, Loader2, XCircle } from "lucide-react";

interface Execution {
  id: string;
  status: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  workflow: { name: string };
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/executions?limit=50")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load executions.");
        setExecutions(data.executions);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load executions."))
      .finally(() => setBusy(false));
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Auto<span>Noder</span></div>
        <nav className="nav">
          <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
          <Link className="nav-item" href="/workflows"><Clock3 size={17}/><span>Workflows</span></Link>
          <Link className="nav-item active" href="/executions"><History size={17}/><span>Executions</span></Link>
        </nav>
        <div className="sidebar-footer">Inspect every workflow run, result, and failure.</div>
      </aside>
      <main className="main">
        <header className="topbar"><h1>Execution history</h1><Link className="btn ghost" href="/workflows/new">New workflow</Link></header>
        <section className="content">
          <div className="hero"><div><h2>Runs</h2><p>Every persisted workflow execution is listed here.</p></div></div>
          <div className="card">
            {busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : message ? <div className="empty">{message}<br/><Link className="btn ghost" href="/sign-in" style={{marginTop:12}}>Sign in</Link></div> : executions.length === 0 ? <div className="empty">No executions yet. Run a workflow from the visual builder.</div> : <div className="list">
              {executions.map((execution) => (
                <div className="list-row" key={execution.id}>
                  <div><strong>{execution.workflow.name}</strong><br/><small>{new Date(execution.startedAt).toLocaleString()}</small></div>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    {execution.status === "SUCCESS" ? <CheckCircle2 size={16} className="execution-status-success"/> : execution.status === "FAILED" ? <XCircle size={16} className="execution-status-failed"/> : null}
                    <span className={`badge execution-status-${execution.status.toLowerCase()}`}>{execution.status}</span>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        </section>
      </main>
    </div>
  );
}
