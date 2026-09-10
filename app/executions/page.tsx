"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, History, Loader2, RefreshCw, XCircle } from "lucide-react";

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
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const loadExecutions = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setBusy(true);
    try {
      const response = await fetch("/api/executions?limit=50", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load executions.");
      setExecutions(data.executions);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load executions.");
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadExecutions(); }, [loadExecutions]);
  useEffect(() => {
    const timer = window.setInterval(() => { void loadExecutions(true); }, 8000);
    return () => window.clearInterval(timer);
  }, [loadExecutions]);

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav">
      <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
      <Link className="nav-item" href="/workflows"><Clock3 size={17}/><span>Workflows</span></Link>
      <Link className="nav-item active" href="/executions"><History size={17}/><span>Executions</span></Link>
      <Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link>
    </nav><div className="sidebar-footer">Inspect every workflow run, result, and failure.</div></aside>
    <main className="main"><header className="topbar"><h1>Execution history</h1><div className="topbar-actions"><button className="btn ghost" onClick={() => void loadExecutions(true)} disabled={refreshing}>{refreshing ? <Loader2 className="spin" size={15}/> : <RefreshCw size={15}/>} Refresh</button><Link className="btn ghost" href="/workflows/new">New workflow</Link></div></header>
      <section className="content"><div className="hero"><div><h2>Runs</h2><p>Every persisted workflow execution is listed here.</p></div></div><div className="card">
        {busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : message ? <div className="empty">{message}<br/><Link className="btn ghost" href="/sign-in" style={{marginTop:12}}>Sign in</Link></div> : executions.length === 0 ? <div className="empty">No executions yet. Run a workflow from the visual builder.</div> : <div className="list">{executions.map((execution) => <div className="list-row" key={execution.id}>
          <div><strong>{execution.workflow.name}</strong><br/><small>{new Date(execution.startedAt).toLocaleString()}{execution.finishedAt ? ` · finished ${new Date(execution.finishedAt).toLocaleTimeString()}` : " · running"}</small>{execution.error && <small style={{display:"block",color:"var(--danger)",marginTop:5}}>{execution.error}</small>}</div>
          <div style={{display:"flex",alignItems:"center",gap:9}}>{execution.status === "SUCCESS" ? <CheckCircle2 size={16} className="execution-status-success"/> : execution.status === "FAILED" ? <XCircle size={16} className="execution-status-failed"/> : <Loader2 size={16} className="execution-status-running spin"/>}<span className={`badge execution-status-${execution.status.toLowerCase()}`}>{execution.status}</span></div>
        </div>)}</div>}
      </div></section>
    </main>
  </div>;
}
