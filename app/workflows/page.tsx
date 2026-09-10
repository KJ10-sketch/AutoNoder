import Link from "next/link";
import { ArrowRight, Plus, Search, Workflow } from "lucide-react";

const workflows = [
  { name: "Customer Lead Enrichment", description: "Webhook → CRM lookup → AI enrichment → notification", status: "Active", runs: 248 },
  { name: "Weekly AI Content Pipeline", description: "Schedule → generate → review → publish", status: "Draft", runs: 31 },
  { name: "Support Ticket Classifier", description: "Inbox → AI classify → route → update ticket", status: "Active", runs: 1204 },
  { name: "Invoice Notification", description: "New invoice → condition → email customer", status: "Paused", runs: 87 },
];

export default function WorkflowsPage() {
  return (
    <div className="app-shell"><aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav"><Link className="nav-item" href="/"><Workflow size={17}/><span>Dashboard</span></Link><Link className="nav-item active" href="/workflows"><Workflow size={17}/><span>Workflows</span></Link></nav><div className="sidebar-footer">Visual workflow automation</div></aside>
      <main className="main"><header className="topbar"><h1>Workflows</h1><Link className="btn primary" href="/workflows/new"><Plus size={16}/> New workflow</Link></header>
        <section className="content"><div className="hero"><div><h2>Your automations</h2><p>Create, manage, and inspect workflow definitions.</p></div><div style={{width:300}}><div style={{position:"relative"}}><Search size={16} style={{position:"absolute",left:10,top:10,color:"var(--muted)"}}/><input className="search" style={{paddingLeft:34}} placeholder="Search workflows" /></div></div></div>
          <div className="workflow-grid">{workflows.map((workflow)=><Link href="/workflows/new" className="card" key={workflow.name}><div className="card-head"><h3>{workflow.name}</h3><span className="badge">{workflow.status}</span></div><p style={{color:"var(--muted)",fontSize:12,lineHeight:1.6}}>{workflow.description}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18}}><small style={{color:"var(--muted)"}}>{workflow.runs} executions</small><ArrowRight size={16}/></div></Link>)}</div>
        </section></main></div>
  );
}
