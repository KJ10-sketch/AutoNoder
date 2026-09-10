export type WorkflowNodeType =
  | "webhook"
  | "schedule"
  | "ai"
  | "http"
  | "database"
  | "email";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface ExecutionContext {
  input: unknown;
  results: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface NodeExecutionResult {
  output: unknown;
  metadata?: Record<string, unknown>;
}
