"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Bot, Clock3, Database, Globe, Mail, Play, Save, Webhook, Zap } from "lucide-react";

const initialNodes: Node[] = [
  { id: "trigger", type: "default", position: { x: 120, y: 180 }, data: { label: "Webhook Trigger" } },
  { id: "ai", type: "default", position: { x: 410, y: 180 }, data: { label: "AI Transform" } },
  { id: "http", type: "default", position: { x: 700, y: 180 }, data: { label: "HTTP Request" } },
  { id: "email", type: "default", position: { x: 980, y: 180 }, data: { label: "Send Email" } },
];

const initialEdges: Edge[] = [
  { id: "e-trigger-ai", source: "trigger", target: "ai", animated: true },
  { id: "e-ai-http", source: "ai", target: "http", animated: true },
  { id: "e-http-email", source: "http", target: "email", animated: true },
];

const palette = [
  { label: "Webhook", detail: "Start from an incoming request", icon: Webhook },
  { label: "Schedule", detail: "Run on a recurring schedule", icon: Clock3 },
  { label: "AI Transform", detail: "Generate or transform data", icon: Bot },
  { label: "HTTP Request", detail: "Call an external API", icon: Globe },
  { label: "Database", detail: "Read or write application data", icon: Database },
  { label: "Send Email", detail: "Deliver a notification", icon: Mail },
];

export default function NewWorkflowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saved, setSaved] = useState(false);

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: true }, current)), [setEdges]);
  const nodeTypes = useMemo(() => ({}), []);

  return (
    <div className="app-shell"><aside className="sidebar"><div className="brand">Auto<span>Noder</span></div><nav className="nav"><Link className="nav-item" href="/"><ArrowLeft size={17}/><span>Back to dashboard</span></Link><Link className="nav-item active" href="/workflows"><Zap size={17}/><span>Workflow editor</span></Link></nav><div className="sidebar-footer">Nodes become executable steps in the workflow engine.</div></aside>
      <main className="main"><header className="topbar"><div><h1>Untitled workflow</h1><small style={{color:"var(--muted)"}}>Visual automation builder</small></div><div className="topbar-actions"><button className="btn ghost" onClick={() => setSaved(true)}><Save size={16}/> {saved ? "Saved" : "Save"}</button><button className="btn primary"><Play size={15}/> Test run</button></div></header>
        <div className="builder"><aside className="builder-sidebar"><div className="builder-title"><h2>Add a node</h2><span className="badge">6 core nodes</span></div><input className="search" placeholder="Search nodes" /><div className="node-list">{palette.map(({label,detail,icon:Icon})=><button className="node-palette" key={label} onClick={()=>setNodes((current)=>[...current,{id:`${label}-${current.length}`,position:{x:140+current.length*30,y:330+current.length*20},data:{label},type:"default"}])}><span className="node-icon"><Icon size={15}/></span><span style={{textAlign:"left"}}><strong>{label}</strong><small>{detail}</small></span></button>)}</div></aside>
          <section className="builder-main"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView className="canvas"><Background /><Controls /><MiniMap /></ReactFlow></section></div>
      </main></div>
  );
}
