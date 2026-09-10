"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

type Execution = {
  id: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  workflow: { id: string; name: string };
};

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section className="card"><div className="card-head"><h3>{title}</h3></div><pre className="detail-json">{JSON.stringify(value ?? null, null, 2)}</pre></section>;
}

export default function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void params.then(({ id }) => fetch(`/api/executions/${id}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load execution.");
      setExecution(data.execution);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load execution.")).finally(() => setBusy(false)));
  }, [params]);

  return <div className="app-shell"><aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav"><Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link><Link className="nav-item" href="/workflows"><span>Workflows</span></Link><Link className="nav-item active" href="/executions"><Clock3 size={17}/><span>Executions</span></Link><Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link></nav><div className="sidebar-footer">Inspect the complete execution payload and outcome.</div></aside><main className="main"><header className="topbar"><h1>Execution detail</h1><Link className="btn ghost" href="/executions">Back to runs</Link></header><section className="content">{busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : message ? <div className="empty">{message}<br/><Link className="btn ghost" href="/sign-in" style={{marginTop:12}}>Sign in</Link></div> : execution ? <><div className="hero"><div><h2>{execution.workflow.name}</h2><p>{new Date(execution.startedAt).toLocaleString()} · <span className={`execution-status-${execution.status.toLowerCase()}`}>{execution.status}</span></p></div>{execution.status === "SUCCESS" ? <CheckCircle2 className="execution-status-success"/> : execution.status === "FAILED" ? <XCircle className="execution-status-failed"/> : null}</div>{execution.error && <div className="auth-error">{execution.error}</div>}<div className="workflow-grid"><JsonPanel title="Input" value={execution.input}/><JsonPanel title="Output" value={execution.output}/></div></> : null}</section></main></div>;
}
