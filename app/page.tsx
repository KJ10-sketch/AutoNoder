import Link from "next/link";
import { Activity, Bot, CreditCard, History, LayoutDashboard, Plus, Settings, Workflow } from "lucide-react";

const workflows = [
  { name: "Customer Lead Enrichment", status: "Active", runs: "248", updated: "12 min ago" },
  { name: "Weekly AI Content Pipeline", status: "Draft", runs: "31", updated: "Yesterday" },
  { name: "Support Ticket Classifier", status: "Active", runs: "1,204", updated: "2 days ago" },
  { name: "Invoice Notification", status: "Paused", runs: "87", updated: "4 days ago" },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Auto<span>Noder</span></div>
        <nav className="nav">
          <button className="nav-item active"><LayoutDashboard size={17}/><span>Dashboard</span></button>
          <Link className="nav-item" href="/workflows"><Workflow size={17}/><span>Workflows</span></Link>
          <button className="nav-item"><History size={17}/><span>Executions</span></button>
          <button className="nav-item"><Bot size={17}/><span>AI & Agents</span></button>
          <button className="nav-item"><CreditCard size={17}/><span>Billing</span></button>
          <button className="nav-item"><Settings size={17}/><span>Settings</span></button>
        </nav>
        <div className="sidebar-footer">Automation infrastructure for modern teams.</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>Workspace</h1>
          <div className="topbar-actions"><button className="btn ghost"><Activity size={16}/></button><Link className="btn primary" href="/workflows/new"><Plus size={16}/> New workflow</Link></div>
        </header>

        <section className="content">
          <div className="hero">
            <div><h2>Build automations that run themselves.</h2><p>Design workflows visually, connect services, execute with AI, and inspect every run.</p></div>
            <Link className="btn primary" href="/workflows/new">Create workflow</Link>
          </div>

          <div className="stats">
            <div className="stat"><div className="stat-label">Total workflows</div><div className="stat-value">12</div></div>
            <div className="stat"><div className="stat-label">Executions this month</div><div className="stat-value">3,842</div></div>
            <div className="stat"><div className="stat-label">Successful runs</div><div className="stat-value">98.7%</div></div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Recent workflows</h3><Link className="badge" href="/workflows">View all</Link></div>
            <div className="list">{workflows.map((workflow) => (
              <div className="list-row" key={workflow.name}>
                <div><strong>{workflow.name}</strong><br/><small>Updated {workflow.updated}</small></div>
                <div><span className="badge">{workflow.status}</span> <small>{workflow.runs} runs</small></div>
              </div>
            ))}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
