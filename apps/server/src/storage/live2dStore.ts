import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AssetRecordFile, Live2DModelRecord } from "@ai-game-workbench/core";

interface Live2DIndex {
  models: Live2DModelRecord[];
}

export interface CreateLive2DModelInput {
  name?: string;
  rootPath?: string;
  modelJsonUrl?: string;
  previewImageUrl?: string;
  textures?: AssetRecordFile[];
  notes?: string;
}

export async function listLive2DModels(storageDir: string): Promise<Live2DModelRecord[]> {
  return (await readLive2DIndex(storageDir)).models.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createLive2DModel(storageDir: string, input: CreateLive2DModelInput): Promise<Live2DModelRecord> {
  const now = new Date().toISOString();
  const model: Live2DModelRecord = {
    id: randomUUID(),
    name: sanitizeText(input.name) || "Live2D model",
    rootPath: sanitizeText(input.rootPath),
    modelJsonUrl: sanitizeText(input.modelJsonUrl),
    previewImageUrl: sanitizeText(input.previewImageUrl),
    textures: sanitizeTextures(input.textures),
    notes: sanitizeText(input.notes),
    createdAt: now,
    updatedAt: now
  };
  const index = await readLive2DIndex(storageDir);
  index.models = [model, ...index.models];
  await writeLive2DIndex(storageDir, index);
  return model;
}

export async function patchLive2DModel(storageDir: string, modelId: string, input: CreateLive2DModelInput): Promise<Live2DModelRecord | null> {
  const index = await readLive2DIndex(storageDir);
  const modelIndex = index.models.findIndex((model) => model.id === modelId);
  if (modelIndex < 0) {
    return null;
  }
  const existing = index.models[modelIndex];
  if (!existing) {
    return null;
  }
  const patched: Live2DModelRecord = {
    ...existing,
    name: input.name === undefined ? existing.name : sanitizeText(input.name) || existing.name,
    rootPath: input.rootPath === undefined ? existing.rootPath : sanitizeText(input.rootPath),
    modelJsonUrl: input.modelJsonUrl === undefined ? existing.modelJsonUrl : sanitizeText(input.modelJsonUrl),
    previewImageUrl: input.previewImageUrl === undefined ? existing.previewImageUrl : sanitizeText(input.previewImageUrl),
    textures: input.textures === undefined ? existing.textures : sanitizeTextures(input.textures),
    notes: input.notes === undefined ? existing.notes : sanitizeText(input.notes),
    updatedAt: new Date().toISOString()
  };
  index.models[modelIndex] = patched;
  await writeLive2DIndex(storageDir, index);
  return patched;
}

async function readLive2DIndex(storageDir: string): Promise<Live2DIndex> {
  try {
    const parsed = JSON.parse(await readFile(resolveIndexPath(storageDir), "utf8")) as Partial<Live2DIndex>;
    return {
      models: Array.isArray(parsed.models) ? parsed.models.map(normalizeModel).filter(isLive2DModelRecord) : []
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { models: [] };
    }
    throw error;
  }
}

async function writeLive2DIndex(storageDir: string, index: Live2DIndex): Promise<void> {
  const path = resolveIndexPath(storageDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function normalizeModel(value: unknown): Live2DModelRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<Live2DModelRecord>;
  const id = sanitizeText(input.id);
  if (!id) {
    return null;
  }
  const createdAt = sanitizeText(input.createdAt) || new Date().toISOString();
  return {
    id,
    name: sanitizeText(input.name) || "Live2D model",
    rootPath: sanitizeText(input.rootPath),
    modelJsonUrl: sanitizeText(input.modelJsonUrl),
    previewImageUrl: sanitizeText(input.previewImageUrl),
    textures: sanitizeTextures(input.textures),
    notes: sanitizeText(input.notes),
    createdAt,
    updatedAt: sanitizeText(input.updatedAt) || createdAt
  };
}

function sanitizeTextures(files: unknown): AssetRecordFile[] {
  if (!Array.isArray(files)) {
    return [];
  }
  return files.flatMap((file) => {
      if (!file || typeof file !== "object") {
        return [];
      }
      const input = file as AssetRecordFile;
      const sanitized: AssetRecordFile = {
        label: sanitizeText(input.label),
        fileName: sanitizeText(input.fileName),
        localPath: sanitizeText(input.localPath),
        localUrl: sanitizeText(input.localUrl),
        publicUrl: sanitizeText(input.publicUrl),
        mimeType: sanitizeText(input.mimeType)
      };
      return sanitized.localPath || sanitized.localUrl || sanitized.publicUrl ? [sanitized] : [];
    });
}

function sanitizeText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function isLive2DModelRecord(value: Live2DModelRecord | null): value is Live2DModelRecord {
  return value !== null;
}

function resolveIndexPath(storageDir: string): string {
  return join(storageDir, "live2d", "index.json");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
