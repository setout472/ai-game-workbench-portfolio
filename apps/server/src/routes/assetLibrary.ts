import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config";
import {
  createAssetRecord,
  deleteAssetRecord,
  exportAssetRecords,
  getAssetRecord,
  listAssetRecords,
  listLooseStorageAssets,
  normalizeAssetKind,
  patchAssetRecord,
  type CreateAssetRecordInput,
  type PatchAssetRecordInput
} from "../storage/assetLibraryStore";

type AssetLibraryRouteConfig = Pick<AppConfig, "storageDir">;

export function registerAssetLibraryRoutes(app: FastifyInstance, config: AssetLibraryRouteConfig): void {
  app.get("/api/asset-library", async (request) => {
    const query = request.query as { q?: string; query?: string; kind?: string; tag?: string; favorite?: string; includeLoose?: string };
    const records = await listAssetRecords(config.storageDir, {
      query: query.q ?? query.query,
      kind: query.kind,
      tag: query.tag,
      favorite: query.favorite === undefined ? undefined : query.favorite === "true"
    });
    const looseRecords = query.includeLoose === "true" ? await listLooseStorageAssets(config.storageDir) : [];
    return { records: [...records, ...looseRecords] };
  });

  app.get("/api/asset-library/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId?: string };
    const record = assetId ? await getAssetRecord(config.storageDir, assetId) : null;
    if (!record) {
      return reply.code(404).send({ error: "asset record not found" });
    }
    return { record };
  });

  app.post("/api/asset-library/records", async (request, reply) => {
    const input = request.body as CreateAssetRecordInput;
    if (input.kind && !normalizeAssetKind(input.kind)) {
      return reply.code(400).send({ error: "unsupported asset kind" });
    }
    const record = await createAssetRecord(config.storageDir, input);
    return reply.code(201).send({ record });
  });

  app.post("/api/asset-library/import-upload", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "file is required" });
    }
    if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/") && file.mimetype !== "application/json") {
      return reply.code(400).send({ error: "only image, video, and json files are supported" });
    }
    const fields = file.fields as Record<string, { value?: unknown } | undefined>;
    const kind = readMultipartField(fields, "kind");
    if (kind && !normalizeAssetKind(kind)) {
      return reply.code(400).send({ error: "unsupported asset kind" });
    }
    const extension = getStoredExtension(file.filename, file.mimetype);
    const storedName = `${randomUUID()}${extension}`;
    const assetDir = join(config.storageDir, "assets");
    const localPath = join(assetDir, storedName);
    await mkdir(assetDir, { recursive: true });
    await writeFile(localPath, await file.toBuffer());
    const record = await createAssetRecord(config.storageDir, {
      kind,
      title: readMultipartField(fields, "title") ?? file.filename,
      characterId: readMultipartField(fields, "characterId"),
      prompt: readMultipartField(fields, "prompt"),
      negativePrompt: readMultipartField(fields, "negativePrompt"),
      provider: readMultipartField(fields, "provider"),
      model: readMultipartField(fields, "model"),
      workflow: readMultipartField(fields, "workflow"),
      tags: readMultipartField(fields, "tags"),
      files: [{
        label: "source",
        fileName: file.filename,
        localPath,
        localUrl: `/assets/${storedName}`,
        mimeType: file.mimetype
      }]
    });
    return reply.code(201).send({ record });
  });

  app.patch("/api/asset-library/records/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId?: string };
    if (!assetId) {
      return reply.code(400).send({ error: "asset id is required" });
    }
    const input = request.body as PatchAssetRecordInput;
    if (input.kind && !normalizeAssetKind(input.kind)) {
      return reply.code(400).send({ error: "unsupported asset kind" });
    }
    const record = await patchAssetRecord(config.storageDir, assetId, input);
    if (!record) {
      return reply.code(404).send({ error: "asset record not found" });
    }
    return { record };
  });

  app.delete("/api/asset-library/records/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId?: string };
    if (!assetId) {
      return reply.code(400).send({ error: "asset id is required" });
    }
    const record = await deleteAssetRecord(config.storageDir, assetId);
    if (!record) {
      return reply.code(404).send({ error: "asset record not found" });
    }
    return { record };
  });

  app.post("/api/asset-library/export", async (request) => {
    const input = request.body as { assetIds?: string[] } | undefined;
    const exported = await exportAssetRecords(config.storageDir, input?.assetIds);
    return { export: exported };
  });
}

function readMultipartField(fields: Record<string, { value?: unknown } | undefined>, key: string): string | undefined {
  const value = fields[key]?.value;
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getStoredExtension(filename: string, mimeType: string): string {
  const extension = extname(filename).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".json"].includes(extension)) {
    return extension;
  }
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  if (mimeType.startsWith("video/")) {
    return ".mp4";
  }
  if (mimeType === "application/json") {
    return ".json";
  }
  return ".png";
}
