import { db } from "@/lib/db";
import { decryptCredential } from "@/lib/security/credentials";
import type { ExecutorRegistry } from "./engine";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function getCredential(userId: string, credentialId: unknown): Promise<Record<string, string> | null> {
  const id = asString(credentialId);
  if (!id) return null;
  const credential = await db.credential.findFirst({ where: { id, userId } });
  if (!credential) throw new Error("Configured credential was not found.");
  return decryptCredential<Record<string, string>>(credential.encryptedData);
}

function resolvePrompt(prompt: string, context: { input: unknown; results: Record<string, unknown> }): string {
  return prompt
    .replace(/{{\s*input\s*}}/g, JSON.stringify(context.input))
    .replace(/{{\s*results\s*}}/g, JSON.stringify(context.results));
}

export function createExecutorRegistry(userId: string): ExecutorRegistry {
  return {
    webhook: { async execute(_node, context) { return { output: context.input }; } },
    schedule: { async execute(_node, context) { return { output: context.input }; } },
    http: {
      async execute(node, context) {
        const url = asString(node.config.url);
        if (!url) throw new Error(`HTTP Request node ${node.id} is missing a URL.`);
        const method = asString(node.config.method)?.toUpperCase() ?? "GET";
        const credential = await getCredential(userId, node.config.credentialId);
        const configuredHeaders = typeof node.config.headers === "object" && node.config.headers ? (node.config.headers as Record<string, string>) : {};
        let credentialHeaders: Record<string, string> = {};
        if (credential?.headers) {
          try { credentialHeaders = JSON.parse(credential.headers) as Record<string, string>; } catch { throw new Error("HTTP credential headers must be valid JSON."); }
        }
        const response = await fetch(url, {
          method,
          headers: { "content-type": "application/json", ...configuredHeaders, ...credentialHeaders },
          body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(node.config.body ?? context.results),
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
        const rawPrompt = asString(node.config.prompt) ?? JSON.stringify(context.results);
        const prompt = resolvePrompt(rawPrompt, context);
        const credential = await getCredential(userId, node.config.credentialId);
        if (provider === "openai") {
          const apiKey = credential?.apiKey ?? process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error("OpenAI credential/API key is not configured.");
          const model = asString(node.config.model) ?? "gpt-4.1-mini";
          const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: prompt }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "OpenAI request failed.");
          return { output: data, metadata: { provider, model } };
        }
        if (provider === "anthropic") {
          const apiKey = credential?.apiKey ?? process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error("Anthropic credential/API key is not configured.");
          const model = asString(node.config.model) ?? "claude-3-5-haiku-latest";
          const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "Anthropic request failed.");
          return { output: data, metadata: { provider, model } };
        }
        if (provider === "google") {
          const apiKey = credential?.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (!apiKey) throw new Error("Gemini credential/API key is not configured.");
          const model = asString(node.config.model) ?? "gemini-2.5-flash";
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "Gemini request failed.");
          return { output: data, metadata: { provider, model } };
        }
        throw new Error(`Unsupported AI provider: ${provider}`);
      },
    },
    database: {
      async execute(node, context) {
        const operation = asString(node.config.operation) ?? "read";
        return { output: { operation, input: context.input, message: "Database execution requires a configured external database credential and adapter." } };
      },
    },
    email: {
      async execute(node, context) {
        const to = asString(node.config.to);
        if (!to) throw new Error("Email node requires a recipient address.");
        return { output: { to, subject: asString(node.config.subject) ?? "AutoNoder notification", message: asString(node.config.message) ?? JSON.stringify(context.results) }, metadata: { delivered: false, reason: "No email provider credential configured." } };
      },
    },
  };
}
