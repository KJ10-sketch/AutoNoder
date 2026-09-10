import { db } from "@/lib/db";
import { decryptCredential } from "@/lib/security/credentials";
import type { ExecutorRegistry } from "./engine";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function getCredential(userId: string, credentialId: unknown): Promise<Record<string, string> | null> {
  const id = asString(credentialId);
  if (!id) return null;

  const credential = await db.credential.findFirst({ where: { id, userId } });
  if (!credential) throw new Error("Configured credential was not found.");
  return decryptCredential<Record<string, string>>(credential.encryptedData);
}

export function createExecutorRegistry(userId: string): ExecutorRegistry {
  return {
    webhook: {
      async execute(_node, context) {
        return { output: context.input };
      },
    },
    schedule: {
      async execute(_node, context) {
        return { output: context.input };
      },
    },
    http: {
      async execute(node, context) {
        const url = asString(node.config.url);
        if (!url) throw new Error(`HTTP Request node ${node.id} is missing a URL.`);
        const method = asString(node.config.method)?.toUpperCase() ?? "GET";
        const credential = await getCredential(userId, node.config.credentialId);
        const configuredHeaders =
          typeof node.config.headers === "object" && node.config.headers
            ? (node.config.headers as Record<string, string>)
            : {};
        const credentialHeaders = credential?.headers ? JSON.parse(credential.headers) : {};

        const response = await fetch(url, {
          method,
          headers: {
            "content-type": "application/json",
            ...configuredHeaders,
            ...(typeof credentialHeaders === "object" && credentialHeaders ? credentialHeaders : {}),
          },
          body: method === "GET" || method === "HEAD"
            ? undefined
            : JSON.stringify(node.config.body ?? context.results),
        });
        const text = await response.text();
        let data: unknown = text;
        try { data = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
        return { output: { status: response.status, data }, metadata: { url, method } };
      },
    },
    ai: {
      async execute(node, context) {
        const provider = asString(node.config.provider) ?? "openai";
        const prompt = asString(node.config.prompt) ?? JSON.stringify(context.results);
        const credential = await getCredential(userId, node.config.credentialId);

        if (provider === "openai") {
          const apiKey = credential?.apiKey ?? process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error("OpenAI credential/API key is not configured.");
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: asString(node.config.model) ?? "gpt-4.1-mini",
              input: prompt,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "OpenAI request failed.");
          return { output: data, metadata: { provider, model: node.config.model ?? "gpt-4.1-mini" } };
        }

        if (provider === "anthropic") {
          const apiKey = credential?.apiKey ?? process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error("Anthropic credential/API key is not configured.");
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: asString(node.config.model) ?? "claude-3-5-haiku-latest",
              max_tokens: 1024,
              messages: [{ role: "user", content: prompt }],
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "Anthropic request failed.");
          return { output: data, metadata: { provider, model: node.config.model ?? "claude-3-5-haiku-latest" } };
        }

        throw new Error(`Unsupported AI provider: ${provider}`);
      },
    },
    database: {
      async execute(node) {
        return {
          output: {
            operation: asString(node.config.operation) ?? "read",
            message: "Database node is persistence-ready; configure the workflow operation before production execution.",
          },
        };
      },
    },
    email: {
      async execute(node) {
        return {
          output: {
            to: asString(node.config.to) ?? "",
            message: "Email node is integration-ready; connect an email provider credential for delivery.",
          },
        };
      },
    },
  };
}
