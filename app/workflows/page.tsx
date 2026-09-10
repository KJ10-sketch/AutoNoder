"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Loader2, Plus, Search, Workflow } from "lucide-react";

type WorkflowRecord = { id: string; name: string; description: string | null; status: string; updatedAt: string; executions: { id: string }[] };

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/workflows", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load workflows.");
      setWorkflows(data.workflows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load workflows.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => workflows.filter((workflow) => `${workflow.name} ${workflow.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [workflows, query]);

  async function duplicateWorkflow(id: string) {
    setDuplicating(id);
    setMessage("");
    try {
      const response = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to duplicate workflow.");
      setWorkflows((current) => [data.workflow, ...current]);
      setMessage("Workflow duplicated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to duplicate workflow.");
    } finally {
      setDuplicating(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav"><Link className="nav-item" href="/"><Workflow size={17}/><span>Dashboard</span></Link><Link className="nav-item active" href="/workflows"><Workflow size={17}/><span>Workflows</span></Link><Link className="nav-item" href="/executions"><span>Executions</span></Link><Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link></nav><div className="sidebar-footer">Visual workflow automation</div></aside>
      <main className="main"><header className="topbar"><h1>Workflows</h1><Link className="btn primary" href="/workflows/new"><Plus size={16}/> New workflow</Link></header>
        <section className="content"><div className="hero"><div><h2>Your automations</h2><p>Create, manage, duplicate, and inspect workflow definitions.</p></div><div style={{width:300}}><div style={{position:"relative"}}><Search size={16} style={{position:"absolute",left:10,top:10,color:"var(--muted)"}}/><input className="search" style={{paddingLeft:34}} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows" /></div></div></div>
          {message && <div className="builder-toast">{message}</div>}
          <div className="card">
            {busy ? <div className="empty"><Loader2 className="spin" size={18}/></div> : filtered.length === 0 ? <div className="empty">No workflows found. <Link href="/workflows/new" style={{color:"var(--accent-2)"}}>Create your first one.</Link></div> : <div className="list">{filtered.map((workflow) => <div className="list-row" key={workflow.id}><Link href={`/workflows/${workflow.id}`} style={{minWidth:0,flex:1}}><div><strong>{workflow.name}</strong><br/><small>{workflow.description || "No description"} · Updated {new Date(workflow.updatedAt).toLocaleString()}</small></div></Link><div style={{display:"flex",alignItems:"center",gap:10}}><span className="badge">{workflow.status}</span><small>{workflow.executions.length} executions</small><button className="btn ghost" onClick={() => void duplicateWorkflow(workflow.id)} disabled={duplicating !== null} title="Duplicate workflow">{duplicating === workflow.id ? <Loader2 className="spin" size={15}/> : <Copy size={15}/>}</button><ArrowRight size={16}/></div></div>)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
