import type {
  ExecutionContext,
  NodeExecutionResult,
  WorkflowDefinition,
  WorkflowNode,
} from "./types";

export interface NodeExecutor {
  execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
}

export type ExecutorRegistry = Partial<Record<WorkflowNode["type"], NodeExecutor>>;

export function topologicalSort(definition: WorkflowDefinition): WorkflowNode[] {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const byId = new Map(definition.nodes.map((node) => [node.id, node]));

  for (const node of definition.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const connection of definition.connections) {
    if (!byId.has(connection.source) || !byId.has(connection.target)) {
      throw new Error(`Invalid workflow connection: ${connection.source} -> ${connection.target}`);
    }
    outgoing.get(connection.source)!.push(connection.target);
    incoming.set(connection.target, (incoming.get(connection.target) ?? 0) + 1);
  }

  const ready = definition.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  const ordered: WorkflowNode[] = [];

  while (ready.length) {
    const id = ready.shift()!;
    ordered.push(byId.get(id)!);
    for (const target of outgoing.get(id) ?? []) {
      const next = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, next);
      if (next === 0) ready.push(target);
    }
  }

  if (ordered.length !== definition.nodes.length) {
    throw new Error("Workflow contains a cycle. Workflow definitions must be acyclic.");
  }

  return ordered;
}

export async function executeWorkflow(
  definition: WorkflowDefinition,
  input: unknown,
  registry: ExecutorRegistry,
): Promise<ExecutionContext> {
  const context: ExecutionContext = { input, results: {}, metadata: {} };
  const orderedNodes = topologicalSort(definition);

  for (const node of orderedNodes) {
    const executor = registry[node.type];
    if (!executor) throw new Error(`No executor registered for node type: ${node.type}`);
    const result = await executor.execute(node, context);
    context.results[node.id] = result.output;
    if (result.metadata) context.metadata[node.id] = result.metadata;
  }

  return context;
}
