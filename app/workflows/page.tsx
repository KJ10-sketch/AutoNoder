"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Plus, Search, Workflow } from "lucide-react";

type WorkflowRecord = { id: string; name: string; description: string | null; status: string; updatedAt: string; executions: { id: string }[] };

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/workflows")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load workflows.");
        setWorkflows(data.workflows);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load workflows."))
      .finally(() => setBusy(false));
  }, []);

  const filtered = useMemo(() => workflows.filter((workflow) => `${workflow.name} ${workflow.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [workflows, query]);

  return (
    <div className="app-shell">
      <aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav"><Link className="nav-item" href="/"><Workflow size={17}/><span>Dashboard</span></Link><Link className="nav-item active" href="/workflows"><Workflow size={17}/><span>Workflows</span></Link><Link className="nav-item" href="/executions"><span>Executions</span></Link><Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link></nav><div className="sidebar-footer">Visual workflow automation</div></aside>
      <main className="main"><header className="topbar"><h1>Workflows</h1><Link className="btn primary" href="/workflows/new"><Plus size={16}/> New workflow</Link></header>
        <section className="content"><div className="hero"><div><h2>Your automations</h2><p>Create, manage, and inspect workflow definitions.</p></div><div style={{width:300}}><div style={{position:"relative"}}><Search size={16} style={{position:"absolute",left:10,top:10,color:"var(--muted)"}}/><input className="search" style={{paddingLeft:34}} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows" /></div></div></div>
          <div className="card">
            {busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : message ? <div className="empty">{message}<br/><Link className="btn ghost" href="/sign-in" style={{marginTop:12}}>Sign in</Link></div> : filtered.length === 0 ? <div className="empty">No workflows found. <Link href="/workflows/new" style={{color:"var(--accent-2)"}}>Create your first one.</Link></div> : <div className="list">{filtered.map((workflow) => <Link href={`/workflows/${workflow.id}`} className="list-row" key={workflow.id}><div><strong>{workflow.name}</strong><br/><small>{workflow.description || "No description"} · Updated {new Date(workflow.updatedAt).toLocaleString()}</small></div><div style={{display:"flex",alignItems:"center",gap:10}}><span className="badge">{workflow.status}</span><small>{workflow.executions.length} executions</small><ArrowRight size={16}/></div></Link>)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
