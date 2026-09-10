"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { addEdge, Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Bot, CheckCircle2, Clock3, Database, Globe, Loader2, Mail, Pause, Play, Save, Settings2, Trash2, Webhook, Zap } from "lucide-react";

type AppNode = Node<{ label: string; type: string; config: Record<string, unknown> }>;
type WorkflowRecord = { id: string; name: string; status: string; nodes: unknown; connections: unknown };

const starterNodes: AppNode[] = [
  { id: "trigger", type: "default", position: { x: 120, y: 180 }, data: { label: "Webhook Trigger", type: "webhook", config: {} } },
  { id: "ai", type: "default", position: { x: 410, y: 180 }, data: { label: "AI Transform", type: "ai", config: { provider: "openai", prompt: "Summarize the incoming workflow data." } } },
  { id: "http", type: "default", position: { x: 700, y: 180 }, data: { label: "HTTP Request", type: "http", config: { method: "GET", url: "https://example.com" } } },
  { id: "email", type: "default", position: { x: 980, y: 180 }, data: { label: "Send Email", type: "email", config: { to: "" } } },
];

const starterEdges: Edge[] = [
  { id: "e-trigger-ai", source: "trigger", target: "ai", animated: true },
  { id: "e-ai-http", source: "ai", target: "http", animated: true },
  { id: "e-http-email", source: "http", target: "email", animated: true },
];

const palette = [
  { label: "Webhook", detail: "Start from an incoming request", type: "webhook", icon: Webhook },
  { label: "Schedule", detail: "Run on an interval", type: "schedule", icon: Clock3 },
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
      id: String(node.id ?? `node-${index}`), type: "default",
      position: node.position ?? { x: 120 + index * 250, y: 180 },
      data: { label: String(node.name ?? node.type ?? "Node"), type: String(node.type ?? "webhook"), config: node.config ?? {} },
    })),
    edges: workflowEdges.map((edge: any, index) => ({ id: String(edge.id ?? `edge-${index}`), source: String(edge.source), target: String(edge.target), animated: true })),
  };
}

function toDefinition(nodes: AppNode[], edges: Edge[]) {
  return { nodes: nodes.map((node) => ({ id: node.id, type: node.data.type, name: node.data.label, config: node.data.config, position: node.position })), connections: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })) };
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

export function WorkflowBuilder({ existingWorkflow }: { existingWorkflow?: WorkflowRecord }) {
  const parsed = existingWorkflow ? fromDefinition(existingWorkflow.nodes, existingWorkflow.connections) : { nodes: starterNodes, edges: starterEdges };
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges);
  const [workflowId, setWorkflowId] = useState(existingWorkflow?.id ?? null);
  const [name, setName] = useState(existingWorkflow?.name ?? "My first automation");
  const [status, setStatus] = useState(existingWorkflow?.status ?? "DRAFT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "run" | "status" | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: true }, current)), [setEdges]);

  function patchSelected(patch: Partial<AppNode["data"]>) {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...patch, config: patch.config ?? node.data.config } } : node));
  }
  function updateConfig(key: string, value: unknown) {
    if (!selected) return;
    patchSelected({ config: { ...selected.data.config, [key]: value } });
  }
  async function ensureSaved(): Promise<string> {
    const definition = toDefinition(nodes, edges);
    let id = workflowId;
    const response = await fetch(id ? `/api/workflows/${id}` : "/api/workflows", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, status: id ? status : "DRAFT", ...definition }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save workflow.");
    id = data.workflow.id; setWorkflowId(id); setStatus(data.workflow.status); return id;
  }
  async function saveWorkflow() {
    setBusy("save"); setMessage("");
    try { await ensureSaved(); setMessage("Workflow saved successfully."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save workflow."); } finally { setBusy(null); }
  }
  async function testRun() {
    setBusy("run"); setMessage(""); setResult(null);
    try {
      const id = await ensureSaved();
      const response = await fetch("/api/workflows/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: id, input: { source: "manual-test", timestamp: new Date().toISOString() } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Workflow execution failed.");
      setResult(data.context?.results ?? data.execution?.output ?? null); setMessage("Test run completed successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Workflow execution failed."); } finally { setBusy(null); }
  }
  async function toggleActive() {
    setBusy("status"); setMessage("");
    try {
      const id = await ensureSaved(); const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const response = await fetch(`/api/workflows/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to change workflow status.");
      setStatus(data.workflow.status); setMessage(data.workflow.status === "ACTIVE" ? "Workflow activated." : "Workflow paused.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to change workflow status."); } finally { setBusy(null); }
  }
  function addNode(type: string, label: string) {
    const config = type === "http" ? { method: "GET", url: "https://example.com" } : type === "schedule" ? { intervalMinutes: 5 } : type === "ai" ? { provider: "openai", model: "gpt-4.1-mini", prompt: "Transform the incoming data." } : type === "database" ? { operation: "read" } : {};
    const node = { id: `${type}-${Date.now()}`, position: { x: 160 + nodes.length * 30, y: 320 + (nodes.length % 5) * 80 }, data: { label, type, config }, type: "default" } as AppNode;
    setNodes((current) => [...current, node]); setSelectedId(node.id);
  }

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav">
      <Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Dashboard</span></Link>
      <Link className="nav-item active" href="/workflows"><Zap size={17}/><span>Workflows</span></Link>
      <Link className="nav-item" href="/executions"><Clock3 size={17}/><span>Executions</span></Link>
      <Link className="nav-item" href="/settings/credentials"><span>Credentials</span></Link>
    </nav><div className="sidebar-footer">Build once. Execute reliably. Inspect every run.</div></aside>
    <main className="main">
      <header className="topbar"><div className="workflow-name-wrap"><input className="workflow-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Workflow name" /><small style={{color:"var(--muted)"}}>Visual automation builder</small></div><div className="topbar-actions"><span className="badge">{status}</span><button className="btn ghost" onClick={saveWorkflow} disabled={busy !== null}>{busy === "save" ? <Loader2 className="spin" size={15}/> : <Save size={16}/>} Save</button><button className="btn ghost" onClick={toggleActive} disabled={busy !== null}>{busy === "status" ? <Loader2 className="spin" size={15}/> : status === "ACTIVE" ? <Pause size={15}/> : <Play size={15}/>} {status === "ACTIVE" ? "Pause" : "Activate"}</button><button className="btn primary" onClick={testRun} disabled={busy !== null}>{busy === "run" ? <Loader2 className="spin" size={15}/> : <Play size={15}/>} Test run</button></div></header>
      {message && <div className="builder-toast">{message.includes("successfully") || message.includes("activated") ? <CheckCircle2 size={15}/> : null}{message}</div>}
      <div className="builder">
        <aside className="builder-sidebar"><div className="builder-title"><h2>Add a node</h2><span className="badge">{palette.length} core nodes</span></div><input className="search" placeholder="Search nodes"/><div className="node-list">{palette.map(({ label, detail, type, icon: Icon }) => <button className="node-palette" key={label} onClick={() => addNode(type, label)}><span className="node-icon"><Icon size={15}/></span><span style={{textAlign:"left"}}><strong>{label}</strong><small>{detail}</small></span></button>)}</div>{workflowId && status === "ACTIVE" && <div className="card" style={{marginTop:18}}><div className="card-head"><h3>Webhook</h3><span className="badge">Live</span></div><p style={{color:"var(--muted)",fontSize:11,lineHeight:1.5}}>POST requests to this URL to trigger the active workflow.</p><code style={{display:"block",wordBreak:"break-all",fontSize:10,color:"#c7d0dd"}}>/api/webhooks/{workflowId}</code></div>}{result && <div className="run-result"><strong>Latest output</strong><pre>{JSON.stringify(result, null, 2)}</pre></div>}</aside>
        <section className="builder-main"><ReactFlow nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} fitView className="canvas"><Background/><Controls/><MiniMap/></ReactFlow></section>
        <aside className="inspector"><div className="builder-title"><h2>Node settings</h2><Settings2 size={17}/></div>{!selected && <div className="empty-inspector"><Settings2 size={28}/><p>Select a node on the canvas to edit its configuration.</p></div>}{selected && <div className="inspector-form"><Field label="Node name" value={selected.data.label} onChange={(value) => patchSelected({ label: value })}/><div className="node-type">Type: <strong>{selected.data.type}</strong></div>
          {selected.data.type === "webhook" && <><Field label="Method" value={String(selected.data.config.method ?? "POST")} onChange={(value) => updateConfig("method", value.toUpperCase())}/><Field label="Path" value={String(selected.data.config.path ?? selected.id)} onChange={(value) => updateConfig("path", value)}/></>}
          {selected.data.type === "schedule" && <Field label="Interval (minutes)" type="number" value={Number(selected.data.config.intervalMinutes ?? 5)} onChange={(value) => updateConfig("intervalMinutes", Math.max(1, Number(value) || 1))}/>} 
          {selected.data.type === "ai" && <><label className="field"><span>Provider</span><select value={String(selected.data.config.provider ?? "openai")} onChange={(e) => updateConfig("provider", e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="google">Gemini</option></select></label><Field label="Model" value={String(selected.data.config.model ?? "gpt-4.1-mini")} onChange={(value) => updateConfig("model", value)}/><label className="field"><span>Prompt</span><textarea value={String(selected.data.config.prompt ?? "")} onChange={(e) => updateConfig("prompt", e.target.value)}/></label></>}
          {selected.data.type === "http" && <><label className="field"><span>Method</span><select value={String(selected.data.config.method ?? "GET")} onChange={(e) => updateConfig("method", e.target.value)}>{["GET","POST","PUT","PATCH","DELETE"].map((method) => <option key={method}>{method}</option>)}</select></label><Field label="URL" value={String(selected.data.config.url ?? "")} onChange={(value) => updateConfig("url", value)} placeholder="https://api.example.com"/><label className="field"><span>Body JSON</span><textarea value={typeof selected.data.config.body === "string" ? String(selected.data.config.body) : JSON.stringify(selected.data.config.body ?? {}, null, 2)} onChange={(e) => { try { updateConfig("body", JSON.parse(e.target.value)); } catch { updateConfig("body", e.target.value); } }}/></label></>}
          {selected.data.type === "database" && <><label className="field"><span>Operation</span><select value={String(selected.data.config.operation ?? "read")} onChange={(e) => updateConfig("operation", e.target.value)}><option value="read">Read</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option></select></label><Field label="Model / collection" value={String(selected.data.config.model ?? "")} onChange={(value) => updateConfig("model", value)}/></>}
          {selected.data.type === "email" && <><Field label="To" value={String(selected.data.config.to ?? "")} onChange={(value) => updateConfig("to", value)} placeholder="name@example.com"/><Field label="Subject" value={String(selected.data.config.subject ?? "AutoNoder notification")} onChange={(value) => updateConfig("subject", value)}/><label className="field"><span>Message</span><textarea value={String(selected.data.config.message ?? "")} onChange={(e) => updateConfig("message", e.target.value)}/></label></>}
          <button className="btn danger" onClick={() => { setNodes((current) => current.filter((node) => node.id !== selected.id)); setEdges((current) => current.filter((edge) => edge.source !== selected.id && edge.target !== selected.id)); setSelectedId(null); }}><Trash2 size={15}/> Delete node</button>
        </div>}</aside>
      </div>
    </main>
  </div>;
}
