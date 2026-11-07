import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ComfyUiJob } from "@ai-game-workbench/core";

const jobs = new Map<string, ComfyUiJob>();

export function registerComfyUiRoutes(app: FastifyInstance): void {
  app.get("/api/comfyui/status", async (request, reply) => {
    const { baseUrl } = request.query as { baseUrl?: string };
    const normalized = normalizeComfyBaseUrl(baseUrl);
    if (!normalized) {
      return {
        configured: false,
        ok: false,
        message: "ComfyUI base URL is not configured."
      };
    }
    try {
      const response = await fetch(`${normalized}/system_stats`);
      if (!response.ok) {
        return reply.code(502).send({ configured: true, ok: false, status: response.status });
      }
      return {
        configured: true,
        ok: true,
        baseUrl: normalized,
        system: await response.json()
      };
    } catch (error: unknown) {
      return reply.code(502).send({
        configured: true,
        ok: false,
        error: error instanceof Error ? error.message : "ComfyUI connection failed"
      });
    }
  });

  app.post("/api/comfyui/jobs", async (request, reply) => {
    const input = request.body as { baseUrl?: string; workflow?: unknown; prompt?: unknown; clientId?: string };
    const baseUrl = normalizeComfyBaseUrl(input.baseUrl);
    if (!baseUrl) {
      return reply.code(400).send({ error: "ComfyUI base URL is required" });
    }
    const workflow = input.workflow ?? input.prompt;
    if (!workflow || typeof workflow !== "object") {
      return reply.code(400).send({ error: "ComfyUI workflow prompt JSON is required" });
    }
    const clientId = input.clientId?.trim() || randomUUID();
    try {
      const response = await fetch(`${baseUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          prompt: workflow
        })
      });
      const providerResponse = await safeJson(response);
      if (!response.ok) {
        return reply.code(502).send({ error: "ComfyUI rejected the workflow", status: response.status, providerResponse });
      }
      const promptId = readPromptId(providerResponse);
      if (!promptId) {
        return reply.code(502).send({ error: "ComfyUI did not return a prompt id", providerResponse });
      }
      const now = new Date().toISOString();
      const job: ComfyUiJob = {
        promptId,
        clientId,
        status: "queued",
        createdAt: now,
        updatedAt: now,
        workflow: "comfyui",
        providerResponse
      };
      jobs.set(promptId, job);
      return reply.code(201).send({ job });
    } catch (error: unknown) {
      return reply.code(502).send({
        error: error instanceof Error ? error.message : "ComfyUI request failed"
      });
    }
  });

  app.get("/api/comfyui/jobs/:promptId/status", async (request, reply) => {
    const { promptId } = request.params as { promptId?: string };
    const { baseUrl } = request.query as { baseUrl?: string };
    const normalized = normalizeComfyBaseUrl(baseUrl);
    if (!promptId) {
      return reply.code(400).send({ error: "prompt id is required" });
    }
    if (!normalized) {
      const existing = jobs.get(promptId);
      return existing
        ? { job: existing }
        : reply.code(400).send({ error: "ComfyUI base URL is required" });
    }
    try {
      const response = await fetch(`${normalized}/history/${encodeURIComponent(promptId)}`);
      const providerResponse = await safeJson(response);
      if (!response.ok) {
        return reply.code(502).send({ error: "ComfyUI history request failed", status: response.status, providerResponse });
      }
      const existing = jobs.get(promptId);
      const now = new Date().toISOString();
      const hasHistory = providerResponse && typeof providerResponse === "object" && promptId in providerResponse;
      const job: ComfyUiJob = {
        promptId,
        clientId: existing?.clientId ?? "",
        status: hasHistory ? "completed" : existing?.status ?? "running",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        workflow: existing?.workflow ?? "comfyui",
        providerResponse
      };
      jobs.set(promptId, job);
      return { job };
    } catch (error: unknown) {
      return reply.code(502).send({
        error: error instanceof Error ? error.message : "ComfyUI history request failed"
      });
    }
  });
}

function normalizeComfyBaseUrl(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return undefined;
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function readPromptId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const promptId = (value as { prompt_id?: unknown }).prompt_id;
  return typeof promptId === "string" ? promptId : undefined;
}
