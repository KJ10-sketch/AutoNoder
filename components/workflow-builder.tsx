"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { addEdge, Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Bot, CheckCircle2, Clock3, Database, Globe, Loader2, Mail, Play, Save, Webhook, Zap } from "lucide-react";

type AppNode = Node<{ label: string; type: string; config: Record<string, unknown> }>;

type WorkflowRecord = { id: string; name: string; status: string; nodes: unknown; connections: unknown };

const starterNodes: AppNode[] = [
  { id: "trigger", type: "default", position: { x: 120, y: 180 }, data: { label: "Webhook Trigger", type: "webhook", config: {} } },
  { id: "ai", type: "default", position: { x: 410, y: 180 }, data: { label: "AI Transform", type: "ai", config: { provider: "openai", prompt: "Summarize the incoming workflow data." } } },
  { id: "http", type: "default", position: { x: 700, y: 180 }, data: { label: "HTTP Request", type: "http", config: { method: "GET", url: "https://api.github.com/repos/KJ10-sketch/AutoNoder" } } },
  { id: "email", type: "default", position: { x: 980, y: 180 }, data: { label: "Send Email", type: "email", config: { to: "" } } },
];
const starterEdges: Edge[] = [
  { id: "e-trigger-ai", source: "trigger", target: "ai", animated: true },
  { id: "e-ai-http", source: "ai", target: "http", animated: true },
  { id: "e-http-email", source: "http", target: "email", animated: true },
];
const palette = [
  { label: "Webhook", detail: "Start from an incoming request", type: "webhook", icon: Webhook },
  { label: "Schedule", detail: "Run on a recurring schedule", type: "schedule", icon: Clock3 },
  { label: "AI Transform", detail: "Generate or transform data", type: "ai", icon: Bot },
  { label: "HTTP Request", detail: "Call an external API", type: "http", icon: Globe },
  { label: "Database", detail: "Read or write application data", type: "database", icon: Database },
  { label: "Send Email", detail: "Deliver a notification", type: "email", icon: Mail },
];

function fromDefinition(nodes: unknown, connections: unknown): { nodes: AppNode[]; edges: Edge[] } {
  const workflowNodes = Array.isArray(nodes) ? nodes : [];
  const workflowEdges = Array.isArray(connections) ? connections : [];
  return {
    nodes: workflowNodes.map((node: any, index) => ({
      id: String(node.id ?? `node-${index}`),
      type: "default",
      position: node.position ?? { x: 120 + index * 250, y: 180 },
      data: { label: String(node.name ?? node.type ?? "Node"), type: String(node.type ?? "webhook"), config: node.config ?? {} },
    })),
    edges: workflowEdges.map((edge: any, index) => ({ id: String(edge.id ?? `edge-${index}`), source: String(edge.source), target: String(edge.target), animated: true })),
  };
}

function toDefinition(nodes: AppNode[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => ({ id: node.id, type: node.data.type, name: node.data.label, config: node.data.config, position: node.position })),
    connections: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
  };
}

export function WorkflowBuilder({ existingWorkflow }: { existingWorkflow?: WorkflowRecord }) {
  const parsed = existingWorkflow ? fromDefinition(existingWorkflow.nodes, existingWorkflow.connections) : { nodes: starterNodes, edges: starterEdges };
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges);
  const [workflowId, setWorkflowId] = useState(existingWorkflow?.id ?? null);
  const [name, setName] = useState(existingWorkflow?.name ?? "My first automation");
  const [status, setStatus] = useState(existingWorkflow?.status ?? "DRAFT");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: true }, current)), [setEdges]);

  async function saveWorkflow() {
    setBusy("save"); setMessage("");
    try {
      const definition = toDefinition(nodes, edges);
      const response = await fetch(workflowId ? `/api/workflows/${workflowId}` : "/api/workflows", {
        method: workflowId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, status: "DRAFT", ...definition }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save workflow.");
      setWorkflowId(data.workflow.id); setStatus(data.workflow.status); setMessage("Workflow saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save workflow."); }
    finally { setBusy(null); }
  }

  async function testRun() {
    setBusy("run"); setMessage(""); setResult(null);
    try {
      let id = workflowId;
      const definition = toDefinition(nodes, edges);
      if (!id) {
        const saveResponse = await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, status: "DRAFT", ...definition }) });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(saveData.error || "Save before execution failed.");
        id = saveData.workflow.id; setWorkflowId(id);
      } else {
        const saveResponse = await fetch(`/api/workflows/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(definition) });
        if (!saveResponse.ok) { const saveData = await saveResponse.json(); throw new Error(saveData.error || "Unable to save changes."); }
      }
      const response = await fetch("/api/workflows/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: id, input: { source: "manual-test", timestamp: new Date().toISOString() } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Workflow execution failed.");
      setResult(data.context?.results ?? data.execution?.output ?? null); setStatus("SUCCESS"); setMessage("Test run completed successfully.");
    } catch (error) { setStatus("FAILED"); setMessage(error instanceof Error ? error.message : "Workflow execution failed."); }
    finally { setBusy(null); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Auto<span>Noder</span></div>
        <nav className="nav">
          <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
          <Link className="nav-item active" href="/workflows"><Zap size={17}/><span>Workflows</span></Link>
          <Link className="nav-item" href="/executions"><Clock3 size={17}/><span>Executions</span></Link>
          <Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link>
          <Link className="nav-item" href="/sign-in"><span>Sign in</span></Link>
        </nav>
        <div className="sidebar-footer">Build once. Execute reliably. Inspect every run.</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="workflow-name-wrap"><input className="workflow-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Workflow name" /><small style={{color:"var(--muted)"}}>Visual automation builder</small></div>
          <div className="topbar-actions"><span className="badge">{status}</span><button className="btn ghost" onClick={saveWorkflow} disabled={busy !== null}>{busy === "save" ? <Loader2 className="spin" size={15}/> : <Save size={16}/>} Save</button><button className="btn primary" onClick={testRun} disabled={busy !== null}>{busy === "run" ? <Loader2 className="spin" size={15}/> : <Play size={15}/>} Test run</button></div>
        </header>
        {message && <div className="builder-toast">{status === "SUCCESS" ? <CheckCircle2 size={15}/> : null}{message}</div>}
        <div className="builder">
          <aside className="builder-sidebar">
            <div className="builder-title"><h2>Add a node</h2><span className="badge">{palette.length} core nodes</span></div>
            <input className="search" placeholder="Search nodes" />
            <div className="node-list">{palette.map(({ label, detail, type, icon: Icon }) => <button className="node-palette" key={label} onClick={() => setNodes((current) => [...current, { id: `${type}-${Date.now()}`, position: { x: 160 + current.length * 30, y: 320 + (current.length % 5) * 80 }, data: { label, type, config: type === "http" ? { method: "GET", url: "https://example.com" } : {} }, type: "default" }])}><span className="node-icon"><Icon size={15}/></span><span style={{textAlign:"left"}}><strong>{label}</strong><small>{detail}</small></span></button>)}</div>
            {result && <div className="run-result"><strong>Latest output</strong><pre>{JSON.stringify(result, null, 2)}</pre></div>}
          </aside>
          <section className="builder-main"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView className="canvas"><Background/><Controls/><MiniMap/></ReactFlow></section>
        </div>
      </main>
    </div>
  );
}
