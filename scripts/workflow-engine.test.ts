import assert from "node:assert/strict";
import { executeWorkflow, topologicalSort } from "../lib/workflow/engine";
import type { WorkflowDefinition } from "../lib/workflow/types";

async function main() {
  const definition: WorkflowDefinition = {
    nodes: [
      { id: "trigger", type: "webhook", config: {} },
      { id: "http", type: "http", config: {} },
      { id: "ai", type: "ai", config: {} },
    ],
    connections: [
      { source: "trigger", target: "http" },
      { source: "http", target: "ai" },
    ],
  };

  const ordered = topologicalSort(definition).map((node) => node.id);
  assert.deepEqual(ordered, ["trigger", "http", "ai"]);

  const executed = await executeWorkflow(
    definition,
    { hello: "world" },
    {
      webhook: { execute: async (_node, context) => ({ output: context.input }) },
      http: { execute: async (_node, context) => ({ output: { upstream: context.input } }) },
      ai: { execute: async (_node, context) => ({ output: { final: context.results.http } }) },
    },
  );

  assert.deepEqual(executed.results.trigger, { hello: "world" });
  assert.deepEqual(executed.results.http, { upstream: { hello: "world" } });
  assert.deepEqual(executed.results.ai, { final: { upstream: { hello: "world" } } });

  assert.throws(
    () => topologicalSort({ nodes: [{ id: "a", type: "webhook", config: {} }], connections: [{ source: "a", target: "missing" }] }),
    /Invalid workflow connection/,
  );

  assert.throws(
    () => topologicalSort({
      nodes: [
        { id: "a", type: "webhook", config: {} },
        { id: "b", type: "http", config: {} },
      ],
      connections: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    }),
    /cycle/i,
  );

  console.log("AutoNoder workflow engine smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
