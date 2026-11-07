import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import type { AssetKind, AssetLibraryExport, AssetRecord, AssetRecordFile } from "@ai-game-workbench/core";

interface AssetLibraryIndex {
  records: AssetRecord[];
}

export interface AssetLibraryQuery {
  query?: string;
  kind?: string;
  tag?: string;
  favorite?: boolean;
}

export interface CreateAssetRecordInput {
  kind?: string;
  title?: string;
  characterId?: string;
  files?: AssetRecordFile[];
  prompt?: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  workflow?: string;
  tags?: string[] | string;
  favorite?: boolean;
}

export interface PatchAssetRecordInput {
  kind?: string;
  title?: string;
  characterId?: string;
  files?: AssetRecordFile[];
  prompt?: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  workflow?: string;
  tags?: string[] | string;
  favorite?: boolean;
}

const ASSET_KINDS = new Set<AssetKind>([
  "character",
  "portrait",
  "expression",
  "pose",
  "pixel",
  "background",
  "prop",
  "sprite-sheet",
  "transparent-frame",
  "live2d-texture",
  "live2d-model",
  "other"
]);

export async function listAssetRecords(storageDir: string, query: AssetLibraryQuery = {}): Promise<AssetRecord[]> {
  const index = await readAssetLibraryIndex(storageDir);
  const search = query.query?.trim().toLowerCase();
  const kind = normalizeAssetKind(query.kind);
  const tag = query.tag?.trim().toLowerCase();
  return index.records
    .filter((record) => !kind || record.kind === kind)
    .filter((record) => query.favorite === undefined || record.favorite === query.favorite)
    .filter((record) => !tag || record.tags.some((value) => value.toLowerCase() === tag))
    .filter((record) => {
      if (!search) {
        return true;
      }
      const haystack = [
        record.title,
        record.characterId,
        record.prompt,
        record.negativePrompt,
        record.provider,
        record.model,
        record.workflow,
        ...record.tags,
        ...record.files.flatMap((file) => [file.label, file.fileName, file.localUrl, file.publicUrl])
      ].filter(Boolean).join("\n").toLowerCase();
      return haystack.includes(search);
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getAssetRecord(storageDir: string, assetId: string): Promise<AssetRecord | null> {
  const index = await readAssetLibraryIndex(storageDir);
  return index.records.find((record) => record.id === assetId) ?? null;
}

export async function createAssetRecord(storageDir: string, input: CreateAssetRecordInput): Promise<AssetRecord> {
  const now = new Date().toISOString();
  const record: AssetRecord = {
    id: randomUUID(),
    kind: normalizeAssetKind(input.kind) ?? "other",
    title: sanitizeText(input.title) || "Untitled asset",
    characterId: sanitizeText(input.characterId),
    files: sanitizeFiles(input.files),
    prompt: sanitizeText(input.prompt),
    negativePrompt: sanitizeText(input.negativePrompt),
    provider: sanitizeText(input.provider),
    model: sanitizeText(input.model),
    workflow: sanitizeText(input.workflow),
    tags: sanitizeTags(input.tags),
    favorite: Boolean(input.favorite),
    createdAt: now,
    updatedAt: now
  };
  const index = await readAssetLibraryIndex(storageDir);
  index.records = [record, ...index.records];
  await writeAssetLibraryIndex(storageDir, index);
  return record;
}

export async function patchAssetRecord(storageDir: string, assetId: string, input: PatchAssetRecordInput): Promise<AssetRecord | null> {
  const index = await readAssetLibraryIndex(storageDir);
  const recordIndex = index.records.findIndex((record) => record.id === assetId);
  if (recordIndex < 0) {
    return null;
  }
  const existing = index.records[recordIndex];
  if (!existing) {
    return null;
  }
  const patched: AssetRecord = {
    ...existing,
    kind: input.kind === undefined ? existing.kind : normalizeAssetKind(input.kind) ?? existing.kind,
    title: input.title === undefined ? existing.title : sanitizeText(input.title) || existing.title,
    characterId: input.characterId === undefined ? existing.characterId : sanitizeText(input.characterId),
    files: input.files === undefined ? existing.files : sanitizeFiles(input.files),
    prompt: input.prompt === undefined ? existing.prompt : sanitizeText(input.prompt),
    negativePrompt: input.negativePrompt === undefined ? existing.negativePrompt : sanitizeText(input.negativePrompt),
    provider: input.provider === undefined ? existing.provider : sanitizeText(input.provider),
    model: input.model === undefined ? existing.model : sanitizeText(input.model),
    workflow: input.workflow === undefined ? existing.workflow : sanitizeText(input.workflow),
    tags: input.tags === undefined ? existing.tags : sanitizeTags(input.tags),
    favorite: input.favorite === undefined ? existing.favorite : Boolean(input.favorite),
    updatedAt: new Date().toISOString()
  };
  index.records[recordIndex] = patched;
  await writeAssetLibraryIndex(storageDir, index);
  return patched;
}

export async function deleteAssetRecord(storageDir: string, assetId: string): Promise<AssetRecord | null> {
  const index = await readAssetLibraryIndex(storageDir);
  const record = index.records.find((item) => item.id === assetId) ?? null;
  if (!record) {
    return null;
  }
  index.records = index.records.filter((item) => item.id !== assetId);
  await writeAssetLibraryIndex(storageDir, index);
  return record;
}

export async function exportAssetRecords(storageDir: string, assetIds: string[] | undefined): Promise<AssetLibraryExport> {
  const index = await readAssetLibraryIndex(storageDir);
  const selected = assetIds?.length
    ? index.records.filter((record) => assetIds.includes(record.id))
    : index.records;
  const exportId = `asset-library-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const exportRootPath = join(storageDir, "asset_exports", exportId);
  const filesRoot = join(exportRootPath, "files");
  await mkdir(filesRoot, { recursive: true });

  const exportedRecords: AssetRecord[] = [];
  for (const record of selected) {
    const exportedFiles: AssetRecordFile[] = [];
    for (const file of record.files) {
      const sourcePath = resolveStoredFilePath(storageDir, file);
      if (!sourcePath || !existsSync(sourcePath)) {
        exportedFiles.push(file);
        continue;
      }
      const targetName = `${record.id}-${basename(sourcePath)}`;
      await copyFile(sourcePath, join(filesRoot, targetName));
      exportedFiles.push({
        ...file,
        localPath: join(filesRoot, targetName),
        localUrl: `files/${targetName}`,
        publicUrl: undefined
      });
    }
    exportedRecords.push({ ...record, files: exportedFiles });
  }

  const manifestPath = join(exportRootPath, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify({
    exportId,
    createdAt: new Date().toISOString(),
    assetCount: exportedRecords.length,
    records: exportedRecords
  }, null, 2)}\n`, "utf8");

  return {
    exportId,
    createdAt: new Date().toISOString(),
    assetCount: exportedRecords.length,
    exportRootPath,
    manifestPath
  };
}

export async function listLooseStorageAssets(storageDir: string): Promise<AssetRecord[]> {
  const assetDir = join(storageDir, "assets");
  try {
    const files = await readdir(assetDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name !== "index.json")
      .filter((entry) => isMediaFileName(entry.name))
      .map((entry) => ({
        id: `loose-${entry.name}`,
        kind: inferKindFromFileName(entry.name),
        title: entry.name,
        files: [{
          fileName: entry.name,
          localPath: join(assetDir, entry.name),
          localUrl: `/assets/${entry.name}`
        }],
        tags: ["unindexed"],
        favorite: false,
        createdAt: new Date(0).toISOString()
      }));
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function normalizeAssetKind(value: string | undefined): AssetKind | undefined {
  const normalized = value?.trim() as AssetKind | undefined;
  return normalized && ASSET_KINDS.has(normalized) ? normalized : undefined;
}

function resolveStoredFilePath(storageDir: string, file: AssetRecordFile): string | undefined {
  const localPath = file.localPath?.trim();
  if (localPath && localPath.startsWith(storageDir)) {
    return localPath;
  }
  const localUrl = file.localUrl?.trim();
  if (!localUrl?.startsWith("/")) {
    return undefined;
  }
  const pathname = localUrl.split("?")[0] ?? localUrl;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "assets" && segments[1]) {
    return join(storageDir, "assets", ...segments.slice(1));
  }
  if (segments[0] === "characters" && segments[1]) {
    return join(storageDir, "characters", ...segments.slice(1));
  }
  if (segments[0] === "module02" && segments[1] === "characters" && segments[2]) {
    return join(storageDir, "characters_pixel", ...segments.slice(2));
  }
  if (segments[0] === "live2d" && segments[1]) {
    return join(storageDir, "live2d", ...segments.slice(1));
  }
  return undefined;
}

async function readAssetLibraryIndex(storageDir: string): Promise<AssetLibraryIndex> {
  try {
    const parsed = JSON.parse(await readFile(resolveIndexPath(storageDir), "utf8")) as Partial<AssetLibraryIndex>;
    return {
      records: Array.isArray(parsed.records) ? parsed.records.map(normalizeExistingRecord).filter(isAssetRecord) : []
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { records: [] };
    }
    throw error;
  }
}

async function writeAssetLibraryIndex(storageDir: string, index: AssetLibraryIndex): Promise<void> {
  const path = resolveIndexPath(storageDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function normalizeExistingRecord(value: unknown): AssetRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<AssetRecord>;
  const id = sanitizeText(input.id);
  if (!id) {
    return null;
  }
  const createdAt = sanitizeText(input.createdAt) || new Date().toISOString();
  return {
    id,
    kind: normalizeAssetKind(input.kind) ?? "other",
    title: sanitizeText(input.title) || "Untitled asset",
    characterId: sanitizeText(input.characterId),
    files: sanitizeFiles(input.files),
    prompt: sanitizeText(input.prompt),
    negativePrompt: sanitizeText(input.negativePrompt),
    provider: sanitizeText(input.provider),
    model: sanitizeText(input.model),
    workflow: sanitizeText(input.workflow),
    tags: sanitizeTags(input.tags),
    favorite: Boolean(input.favorite),
    createdAt,
    updatedAt: sanitizeText(input.updatedAt) || createdAt
  };
}

function sanitizeFiles(files: unknown): AssetRecordFile[] {
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

function sanitizeTags(tags: string[] | string | undefined): string[] {
  const values = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",") : [];
  return [...new Set(values.map((tag) => tag.trim()).filter(Boolean))];
}

function sanitizeText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function isAssetRecord(value: AssetRecord | null): value is AssetRecord {
  return value !== null;
}

function resolveIndexPath(storageDir: string): string {
  return join(storageDir, "asset_library", "index.json");
}

function isMediaFileName(fileName: string): boolean {
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".json"].includes(extname(fileName).toLowerCase());
}

function inferKindFromFileName(fileName: string): AssetKind {
  const lower = fileName.toLowerCase();
  if (lower.includes("sprite")) {
    return "sprite-sheet";
  }
  if (lower.includes("live2d") || lower.endsWith(".json")) {
    return "live2d-model";
  }
  return "other";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
