import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStaticPath from "ffmpeg-static";
import type { LocalCodexImageGenerator } from "./providers/localCodex";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SERVER_ROOT = resolve(REPO_ROOT, "apps/server");

export interface AppConfig {
  openRouterApiKey?: string;
  openAiCompatibleBaseUrl?: string;
  openAiCompatibleApiKey?: string;
  adminSettingsToken?: string;
  publicAssetBaseUrl?: string;
  ffmpegPath: string;
  storageDir: string;
  presetsDir: string;
  module01CharacterExportDir: string;
  port: number;
  localCodexImageGenerator?: LocalCodexImageGenerator;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const configEnv = env === process.env ? { ...readDotEnvFile(), ...env } : env;
  return {
    openRouterApiKey: configEnv.OPENROUTER_API_KEY,
    openAiCompatibleBaseUrl: configEnv.OPENAI_COMPATIBLE_BASE_URL,
    openAiCompatibleApiKey: configEnv.OPENAI_COMPATIBLE_API_KEY,
    adminSettingsToken: configEnv.ADMIN_SETTINGS_TOKEN,
    publicAssetBaseUrl: configEnv.PUBLIC_ASSET_BASE_URL,
    ffmpegPath: configEnv.FFMPEG_PATH ?? resolveDefaultFfmpegPath(),
    storageDir: resolveStorageDir(configEnv.STORAGE_DIR),
    presetsDir: resolvePresetsDir(configEnv.PRESETS_DIR),
    module01CharacterExportDir: resolve(configEnv.MODULE01_CHARACTER_EXPORT_DIR ?? resolveDefaultModule01CharacterExportDir()),
    port: Number(configEnv.PORT ?? 8787)
  };
}

export function resolveDefaultFfmpegPath(): string {
  return ffmpegStaticPath ?? "ffmpeg";
}

export function resolveDefaultModule01CharacterExportDir(): string {
  return resolve(REPO_ROOT, "Export", "Character_2D");
}

export function resolveDefaultStorageDir(): string {
  return resolve(SERVER_ROOT, "storage");
}

export function resolveDefaultPresetsDir(): string {
  return resolve(REPO_ROOT, "presets");
}

function resolveStorageDir(value: string | undefined): string {
  return value?.trim()
    ? resolve(SERVER_ROOT, value.trim())
    : resolveDefaultStorageDir();
}

function resolvePresetsDir(value: string | undefined): string {
  return value?.trim()
    ? resolve(REPO_ROOT, value.trim())
    : resolveDefaultPresetsDir();
}

function readDotEnvFile(): NodeJS.ProcessEnv {
  const path = resolve(REPO_ROOT, ".env");
  if (!existsSync(path)) {
    return {};
  }
  const values: NodeJS.ProcessEnv = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = stripEnvQuotes(value);
  }
  return values;
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
