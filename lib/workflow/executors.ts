import { db } from "@/lib/db";
import { decryptCredential } from "@/lib/security/credentials";
import type { ExecutorRegistry } from "./engine";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPositiveInt(value: unknown, fallback: number, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
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

function validateHttpTarget(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("HTTP Request URL must use http or https.");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("HTTP Request cannot target localhost or local domains.");
  }
  if (/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname)) {
    throw new Error("HTTP Request cannot target private or link-local IP addresses.");
  }
  return parsed.toString();
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs / 1000}s.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createExecutorRegistry(userId: string): ExecutorRegistry {
  return {
    webhook: { async execute(_node, context) { return { output: context.input }; } },
    schedule: { async execute(_node, context) { return { output: context.input }; } },
    http: {
      async execute(node, context) {
        const rawUrl = asString(node.config.url);
        if (!rawUrl) throw new Error(`HTTP Request node ${node.id} is missing a URL.`);
        const url = validateHttpTarget(resolvePrompt(rawUrl, context));
        const method = asString(node.config.method)?.toUpperCase() ?? "GET";
        const credential = await getCredential(userId, node.config.credentialId);
        const configuredHeaders = typeof node.config.headers === "object" && node.config.headers ? (node.config.headers as Record<string, string>) : {};
        let credentialHeaders: Record<string, string> = {};
        if (credential?.headers) {
          try { credentialHeaders = JSON.parse(credential.headers) as Record<string, string>; } catch { throw new Error("HTTP credential headers must be valid JSON."); }
        }
        const response = await fetchWithTimeout(url, {
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
          const response = await fetchWithTimeout("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: prompt }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "OpenAI request failed.");
          return { output: data, metadata: { provider, model } };
        }
        if (provider === "anthropic") {
          const apiKey = credential?.apiKey ?? process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error("Anthropic credential/API key is not configured.");
          const model = asString(node.config.model) ?? "claude-3-5-haiku-latest";
          const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "Anthropic request failed.");
          return { output: data, metadata: { provider, model } };
        }
        if (provider === "google") {
          const apiKey = credential?.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (!apiKey) throw new Error("Gemini credential/API key is not configured.");
          const model = asString(node.config.model) ?? "gemini-2.5-flash";
          const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message ?? "Gemini request failed.");
          return { output: data, metadata: { provider, model } };
        }
        throw new Error(`Unsupported AI provider: ${provider}`);
      },
    },
    database: {
      async execute(node, context) {
        const operation = asString(node.config.operation) ?? "latestExecution";
        const workflowId = asString(node.config.workflowId);
        if (!workflowId) throw new Error("Database node requires a workflowId. Use {{input.workflowId}} by passing it from a trigger if appropriate.");

        switch (operation) {
          case "latestExecution": {
            const execution = await db.execution.findFirst({
              where: { workflowId, userId },
              orderBy: { startedAt: "desc" },
              select: { id: true, status: true, input: true, output: true, error: true, startedAt: true, finishedAt: true },
            });
            return { output: execution };
          }
          case "listExecutions": {
            const limit = asPositiveInt(node.config.limit, 20);
            const executions = await db.execution.findMany({
              where: { workflowId, userId },
              orderBy: { startedAt: "desc" },
              take: limit,
              select: { id: true, status: true, input: true, output: true, error: true, startedAt: true, finishedAt: true },
            });
            return { output: executions };
          }
          case "countExecutions": {
            const count = await db.execution.count({ where: { workflowId, userId } });
            return { output: { count } };
          }
          case "context":
            return { output: { input: context.input, results: context.results } };
          default:
            throw new Error(`Unsupported database operation: ${operation}`);
        }
      },
    },
    email: {
      async execute(node, context) {
        const credential = await getCredential(userId, node.config.credentialId);
        const apiKey = credential?.apiKey ?? process.env.RESEND_API_KEY;
        const from = asString(credential?.from) ?? process.env.EMAIL_FROM;
        const to = asString(node.config.to);
        if (!apiKey || !from || !to) throw new Error("Email delivery requires an email credential or RESEND_API_KEY + EMAIL_FROM, plus a recipient.");
        const response = await fetchWithTimeout("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [to], subject: resolvePrompt(asString(node.config.subject) ?? "AutoNoder notification", context), text: resolvePrompt(asString(node.config.message) ?? JSON.stringify(context.results), context) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message ?? "Email delivery failed.");
        return { output: data, metadata: { provider: "resend", to, delivered: true } };
      },
    },
  };
}
