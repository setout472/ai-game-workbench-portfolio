import {
  APIMART_PROVIDER_ID,
  LOCAL_CODEX_PROVIDER_ID,
  OPENROUTER_PROVIDER_ID
} from "@ai-game-workbench/core";
import type {
  AssetKind,
  AssetLibraryExport,
  AssetRecord,
  CharacterProfile,
  CharacterReferenceKind,
  CharacterResultRole,
  ComfyUiJob,
  Live2DModelRecord,
  PromptComposition,
  PromptTemplate,
  PromptTemplateType,
  ProjectState,
  ProviderModelCatalog,
  ProviderModelDefaults,
  ProviderModelPreset,
  ProviderSettings,
  SavedAnimationKeys
} from "@ai-game-workbench/core";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export interface RuntimeConfig {
  publicAssetBaseUrl: string | null;
  publicTunnelProvider: string | null;
  publicTunnelUrl: string | null;
}

export interface UploadedAsset {
  fileName: string;
  storedName: string;
  localPath: string;
  localUrl?: string;
  publicUrl: string;
}

export interface UploadedFrameVideo {
  fileName: string;
  jobId: string;
  localPath: string;
  localVideoUrl: string;
}

export interface CharacterFolder {
  id: string;
  name: string;
}

export interface CharacterAssetFile {
  fileName: string;
  url: string;
}

export interface CharacterAssets {
  baseTemplate: {
    characterReference?: CharacterAssetFile;
    output?: CharacterAssetFile;
  };
  baseCharacter: {
    directionBaseTemplate?: CharacterAssetFile;
    idleDirectionTemplate?: CharacterAssetFile;
    walkDirectionTemplate?: CharacterAssetFile;
    walkVideoInput?: CharacterAssetFile;
    walkVideoSource?: CharacterAssetFile;
    loopExport?: ProcessFourDirectionResult;
  };
  advancedCharacter?: {
    run?: AdvancedActionAssets;
    attack1?: AdvancedActionAssets;
    jump?: AdvancedActionAssets;
  };
}

export interface PixelCharacterFolder {
  id: string;
  name: string;
}

export interface PixelCharacterAssetFile {
  fileName: string;
  url: string;
}

export interface PixelCharacterFrameAsset {
  row: number;
  index: number;
  width?: number;
  height?: number;
  url: string;
}

export interface PixelCharacterAssets {
  baseTemplate: {
    characterReference?: PixelCharacterAssetFile;
    output?: PixelCharacterAssetFile;
  };
  walkTemplate: {
    output?: PixelCharacterAssetFile;
  };
  slices: {
    idle: {
      frames: PixelCharacterFrameAsset[];
    };
    walk: {
      frames: PixelCharacterFrameAsset[];
    };
  };
}

export interface PixelSpriteActionTemplate {
  id: "idle" | "walk";
  name: string;
  referenceImage: string;
  rows?: number;
  columns?: number;
  defaultFrameCount?: number;
  directionCount?: number;
  constraintPrompt: string;
}

export interface CreateSpriteSheetGenerationInput {
  actionId: "idle" | "walk";
  model: string;
  constraintPrompt?: string;
  customPrompt?: string;
  keyColor: string;
  characterReferenceDataUrl?: string;
  characterReferenceStoredName?: string;
  characterReferenceUrl?: string;
  pixelCharacterId?: string;
  seed?: number;
}

export interface SpriteSheetGenerationResult {
  fileName: string;
  storedName: string;
  localPath: string;
  spriteSheetUrl: string;
  localUrl: string;
  publicUrl: string;
  action: {
    id: string;
    name: string;
  };
  finalPrompt: string;
  providerResponse?: unknown;
}

export type PixelSpriteSliceKind = "idle" | "walk";

export interface ProcessSpriteSheetInput {
  storedName?: string;
  sourceUrl?: string;
  pixelCharacterId?: string;
  sliceKind: PixelSpriteSliceKind;
  rows: number;
  columns: number;
  keyColor: string;
  tolerance: number;
  centerFrames?: boolean;
  centerMode?: "frame" | "row";
  outputFrameWidth?: number;
  outputFrameHeight?: number;
  normalizeSubjectScale?: boolean;
  targetSubjectHeight?: number;
  directionLayout?: "grid" | "contact-2x2";
}

export interface ProcessedSpriteSheetFrame extends PixelCharacterFrameAsset {
  width: number;
  height: number;
}

export interface ProcessSpriteSheetResult {
  jobId: string;
  rows: number;
  columns: number;
  frameCount: number;
  frames: ProcessedSpriteSheetFrame[];
}

export interface AdvancedActionAssets {
  keyframe?: CharacterAssetFile;
  videoInput?: CharacterAssetFile;
  videoSource?: CharacterAssetFile;
  middleFrame?: CharacterAssetFile;
  export?: ProcessFourDirectionResult;
}

export interface CreateVideoGenerationInput {
  model: string;
  prompt: string;
  firstFrameUrl: string;
  lastFrameUrl?: string;
  referenceOnly?: boolean;
  inputReferenceUrls?: string[];
  durationSeconds?: number;
  resolution?: string;
}

export interface CreateFirstFrameGenerationInput {
  model: string;
  prompt: string;
  targetSize: number;
  keyColor: string;
  styleReferenceImageDataUrl?: string;
  referenceImageDataUrl?: string;
}

export interface CreateDirectionTemplateGenerationInput {
  templateKind: "idle" | "walk" | "run";
  model: string;
  prompt: string;
  targetSize: number;
  keyColor: string;
  characterTemplateImageDataUrl: string;
}

export interface CreateAdvancedActionMidframeGenerationInput {
  actionKind: "attack-1";
  model: string;
  prompt: string;
  targetSize: number;
  keyColor: string;
  startFrameImageDataUrl: string;
}

export interface VideoJobStatus {
  jobId: string;
  status: string;
  videoUrl?: string;
  localVideoUrl?: string;
  providerResponse?: unknown;
}

export interface ProcessFramesInput {
  jobId: string;
  frameCount: number;
  keyColor: string;
  tolerance: number;
}

export interface ProcessedFrame {
  index: number;
  url: string;
}

export interface ProcessFourDirectionInput {
  jobId: string;
  characterId: string;
  frameCount: number;
  keyColor: string;
  tolerance: number;
  minLoopFrames: number;
  maxLoopFrames: number;
  exportFrameSize: number;
  fps: number;
}

export type AdvancedActionKind = "run" | "attack-1" | "jump";

export interface PrepareAdvancedActionStartFrameInput {
  characterId: string;
  actionKind: Exclude<AdvancedActionKind, "run">;
  keyColor: string;
  scale?: number;
  tolerance?: number;
}

export interface ProcessAdvancedActionInput extends ProcessFourDirectionInput {
  actionKind: AdvancedActionKind;
  mode: "loop" | "oneshot";
}

export interface DirectionLoopInfo {
  startFrame: number;
  endFrame: number;
  frameCount: number;
  score: number;
}

export interface DirectionProcessingResult {
  key: "down" | "up" | "left" | "right";
  label: string;
  centeredFrames: ProcessedFrame[];
  loopFrames: ProcessedFrame[];
  transparentFrames: ProcessedFrame[];
  loop: DirectionLoopInfo;
}

export interface IdleDirectionProcessingFrame extends ProcessedFrame {
  key: "down" | "up" | "left" | "right";
  label: string;
}

export interface ProcessFramesResult {
  jobId: string;
  frameCount: number;
  frames: ProcessedFrame[];
}

export interface ProcessFourDirectionResult {
  jobId: string;
  frameCount: number;
  rawFrames: ProcessedFrame[];
  directions: DirectionProcessingResult[];
  spriteSheetUrl?: string;
  transparentZipUrl?: string;
  gifPreviewUrl?: string;
  idle?: {
    frames: IdleDirectionProcessingFrame[];
    spriteSheetUrl?: string;
  };
}

export interface ProcessIdleFourDirectionInput {
  characterId: string;
  keyColor: string;
  tolerance: number;
}

export interface ProcessIdleFourDirectionResult {
  frames: IdleDirectionProcessingFrame[];
  spriteSheetUrl?: string;
}

export interface CreateGodotExportInput {
  characterId: string;
  exportSize: 256 | 384 | 512 | 1024;
}

export interface GodotExportResult {
  characterId: string;
  exportSize: 256 | 384 | 512 | 1024;
  exportedActions: string[];
  animationCount: number;
  exportRootPath?: string;
  exportRootUrl: string;
  manifestUrl: string;
  importScriptUrl: string;
  zipUrl: string;
}

export interface GenerationRequestOptions {
  publicAssetBaseUrl?: string;
  characterId?: string;
  actionKind?: AdvancedActionKind;
  providerId?: string;
  providerApiKey?: string;
}

export interface UserApiProviderSettings {
  providerId: string;
  apiKeys: Record<string, string>;
}

export const USER_API_PROVIDER_SETTINGS_STORAGE_KEY = "ai-game-workbench.user-api-provider-settings.v1";
export const USER_API_PROVIDER_SETTINGS_UPDATED_EVENT = "ai-game-workbench.user-api-provider-settings-updated";
export const SELECTABLE_API_PROVIDER_IDS = [APIMART_PROVIDER_ID, OPENROUTER_PROVIDER_ID] as const;

export type OneClickJobStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type OneClickJobStatus = "running" | "completed" | "failed";

export interface OneClickCharacterJobStep {
  id: string;
  label: string;
  status: OneClickJobStepStatus;
  error?: string;
  resultUrl?: string;
}

export interface OneClickCharacterJob {
  jobId: string;
  characterId: string;
  status: OneClickJobStatus;
  currentStep: string;
  progressPercent: number;
  steps: OneClickCharacterJobStep[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOneClickCharacterJobInput {
  characterName: string;
  overwrite: boolean;
  publicAssetBaseUrl: string;
  referenceImageDataUrl: string;
  firstFrame: {
    model: string;
    prompt: string;
    targetSize: number;
    keyColor: string;
    style: string;
  };
  actions: {
    run: boolean;
    attack1: boolean;
    jump: boolean;
  };
}

export interface OpenRouterKeyStatus {
  configured: boolean;
  suffix?: string;
}

export interface ProviderSecretStatus {
  configured: boolean;
  suffix?: string;
}

export interface ProviderSettingsDocument {
  providers: ProviderSettings[];
  models: ProviderModelPreset[];
  defaults: ProviderModelDefaults;
}

export interface AdminProviderSettingsResponse {
  settings: ProviderSettingsDocument;
  secrets: Record<string, ProviderSecretStatus>;
}

export interface ProviderSecretPatch {
  apiKey?: string;
  clear?: boolean;
}

export interface SaveAdminProviderSettingsInput extends ProviderSettingsDocument {
  secrets?: Record<string, ProviderSecretPatch>;
}

export type Module01WorkflowConfig = Record<string, unknown>;
export type Module02WorkflowConfig = Record<string, unknown>;

export type Module01ReferenceImageKind = "style" | "walk" | "idle" | "run";
export type Module02ActionReferenceId = "idle" | "walk";

export type {
  AssetKind,
  AssetLibraryExport,
  AssetRecord,
  CharacterProfile,
  CharacterReferenceKind,
  CharacterResultRole,
  ComfyUiJob,
  Live2DModelRecord,
  PromptComposition,
  PromptTemplate,
  PromptTemplateType
};

export interface Module01ReferenceImageAsset {
  kind: Module01ReferenceImageKind;
  fileName: string;
  storedName: string;
  localPath?: string;
  url: string;
}

export interface Module02ActionReferenceAsset {
  actionId: Module02ActionReferenceId;
  fileName: string;
  storedName: string;
  localPath?: string;
  url: string;
}

export interface UploadAssetOptions {
  publicAssetBaseUrl?: string;
  characterId?: string;
  characterAssetKind?: "base-template-reference" | "direction-base-template" | "walk-video-input" | "advanced-video-input" | "advanced-midframe";
  actionKind?: AdvancedActionKind;
}

export interface UploadModule02AssetOptions {
  publicAssetBaseUrl?: string;
}

export interface UploadFrameVideoOptions {
  characterId?: string;
  actionKind?: AdvancedActionKind;
}

export interface AssetLibraryQuery {
  query?: string;
  kind?: AssetKind | "";
  tag?: string;
  favorite?: boolean;
  includeLoose?: boolean;
}

export interface SaveAssetRecordInput {
  kind?: AssetKind;
  title?: string;
  characterId?: string;
  files?: AssetRecord["files"];
  prompt?: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  workflow?: string;
  tags?: string[] | string;
  favorite?: boolean;
}

export interface ImportAssetUploadInput extends SaveAssetRecordInput {
  file: File;
}

export interface ComfyUiStatus {
  configured: boolean;
  ok: boolean;
  message?: string;
  status?: number;
  error?: string;
  system?: unknown;
}

export interface CreateComfyUiJobInput {
  baseUrl: string;
  workflow: unknown;
  clientId?: string;
}

export interface SaveLive2DModelInput {
  name?: string;
  rootPath?: string;
  modelJsonUrl?: string;
  previewImageUrl?: string;
  textures?: Live2DModelRecord["textures"];
  notes?: string;
}

export interface CharacterProfileQuery {
  query?: string;
  tag?: string;
}

export interface SaveCharacterProfileInput {
  name?: string;
  summary?: string;
  basePersona?: string;
  appearanceAnchor?: string;
  outfitAnchor?: string;
  defaultStyle?: string;
  personalityKeywords?: string[] | string;
  negativePrompt?: string;
  tags?: string[] | string;
  notes?: string;
  linkedAssetIds?: string[];
}

export interface UploadCharacterReferenceInput {
  file: File;
  kind?: CharacterReferenceKind;
  title?: string;
  notes?: string;
}

export interface LinkCharacterResultInput {
  assetId: string;
  role?: CharacterResultRole;
  promptCompositionId?: string;
  notes?: string;
}

export interface PromptTemplateQuery {
  type?: PromptTemplateType | "";
  tag?: string;
  query?: string;
}

export interface SavePromptTemplateInput {
  name?: string;
  type?: PromptTemplateType;
  body?: string;
  negativeBody?: string;
  variables?: string[] | string;
  useCase?: string;
  tags?: string[] | string;
}

export interface ComposePromptInput {
  characterProfileId: string;
  templateId: string;
  variables?: Record<string, string>;
  resultAssetIds?: string[];
  save?: boolean;
}

export async function listAssetRecords(query: AssetLibraryQuery = {}): Promise<AssetRecord[]> {
  const params = new URLSearchParams();
  if (query.query?.trim()) {
    params.set("q", query.query.trim());
  }
  if (query.kind) {
    params.set("kind", query.kind);
  }
  if (query.tag?.trim()) {
    params.set("tag", query.tag.trim());
  }
  if (query.favorite !== undefined) {
    params.set("favorite", String(query.favorite));
  }
  if (query.includeLoose) {
    params.set("includeLoose", "true");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/asset-library${suffix}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Asset library load failed: ${response.status}`));
  }
  const body = await response.json() as { records?: AssetRecord[] };
  return body.records ?? [];
}

export async function createAssetRecord(input: SaveAssetRecordInput): Promise<AssetRecord> {
  const response = await fetch(`${API_BASE}/api/asset-library/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Asset record create failed: ${response.status}`));
  }
  const body = await response.json() as { record?: AssetRecord };
  if (!body.record) {
    throw new Error("Asset record create returned no record.");
  }
  return body.record;
}

export async function patchAssetRecord(assetId: string, input: SaveAssetRecordInput): Promise<AssetRecord> {
  const response = await fetch(`${API_BASE}/api/asset-library/records/${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Asset record update failed: ${response.status}`));
  }
  const body = await response.json() as { record?: AssetRecord };
  if (!body.record) {
    throw new Error("Asset record update returned no record.");
  }
  return body.record;
}

export async function importAssetUpload(input: ImportAssetUploadInput): Promise<AssetRecord> {
  const formData = new FormData();
  formData.append("file", input.file);
  appendOptionalFormValue(formData, "kind", input.kind);
  appendOptionalFormValue(formData, "title", input.title);
  appendOptionalFormValue(formData, "characterId", input.characterId);
  appendOptionalFormValue(formData, "prompt", input.prompt);
  appendOptionalFormValue(formData, "negativePrompt", input.negativePrompt);
  appendOptionalFormValue(formData, "provider", input.provider);
  appendOptionalFormValue(formData, "model", input.model);
  appendOptionalFormValue(formData, "workflow", input.workflow);
  appendOptionalFormValue(formData, "tags", Array.isArray(input.tags) ? input.tags.join(",") : input.tags);
  const response = await fetch(`${API_BASE}/api/asset-library/import-upload`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Asset import failed: ${response.status}`));
  }
  const body = await response.json() as { record?: AssetRecord };
  if (!body.record) {
    throw new Error("Asset import returned no record.");
  }
  return body.record;
}

export async function exportAssetLibrary(assetIds?: string[]): Promise<AssetLibraryExport> {
  const response = await fetch(`${API_BASE}/api/asset-library/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetIds })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Asset export failed: ${response.status}`));
  }
  const body = await response.json() as { export?: AssetLibraryExport };
  if (!body.export) {
    throw new Error("Asset export returned no manifest.");
  }
  return body.export;
}

export async function getComfyUiStatus(baseUrl: string): Promise<ComfyUiStatus> {
  const params = new URLSearchParams();
  if (baseUrl.trim()) {
    params.set("baseUrl", baseUrl.trim());
  }
  const response = await fetch(`${API_BASE}/api/comfyui/status?${params.toString()}`);
  const body = await response.json() as ComfyUiStatus;
  if (!response.ok) {
    return body;
  }
  return body;
}

export async function createComfyUiJob(input: CreateComfyUiJobInput): Promise<ComfyUiJob> {
  const response = await fetch(`${API_BASE}/api/comfyui/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `ComfyUI job create failed: ${response.status}`));
  }
  const body = await response.json() as { job?: ComfyUiJob };
  if (!body.job) {
    throw new Error("ComfyUI did not return a job.");
  }
  return body.job;
}

export async function getComfyUiJobStatus(baseUrl: string, promptId: string): Promise<ComfyUiJob> {
  const params = new URLSearchParams();
  if (baseUrl.trim()) {
    params.set("baseUrl", baseUrl.trim());
  }
  const response = await fetch(`${API_BASE}/api/comfyui/jobs/${encodeURIComponent(promptId)}/status?${params.toString()}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `ComfyUI job status failed: ${response.status}`));
  }
  const body = await response.json() as { job?: ComfyUiJob };
  if (!body.job) {
    throw new Error("ComfyUI did not return a job status.");
  }
  return body.job;
}

export async function listLive2DModels(): Promise<Live2DModelRecord[]> {
  const response = await fetch(`${API_BASE}/api/live2d/models`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Live2D models load failed: ${response.status}`));
  }
  const body = await response.json() as { models?: Live2DModelRecord[] };
  return body.models ?? [];
}

export async function createLive2DModel(input: SaveLive2DModelInput): Promise<Live2DModelRecord> {
  const response = await fetch(`${API_BASE}/api/live2d/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Live2D model create failed: ${response.status}`));
  }
  const body = await response.json() as { model?: Live2DModelRecord };
  if (!body.model) {
    throw new Error("Live2D model create returned no model.");
  }
  return body.model;
}

export async function listCharacterProfiles(query: CharacterProfileQuery = {}): Promise<CharacterProfile[]> {
  const params = new URLSearchParams();
  if (query.query?.trim()) {
    params.set("q", query.query.trim());
  }
  if (query.tag?.trim()) {
    params.set("tag", query.tag.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/character-profiles${suffix}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character profiles load failed: ${response.status}`));
  }
  const body = await response.json() as { profiles?: CharacterProfile[] };
  return body.profiles ?? [];
}

export async function createCharacterProfile(input: SaveCharacterProfileInput): Promise<CharacterProfile> {
  const response = await fetch(`${API_BASE}/api/character-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character profile create failed: ${response.status}`));
  }
  const body = await response.json() as { profile?: CharacterProfile };
  if (!body.profile) {
    throw new Error("Character profile create returned no profile.");
  }
  return body.profile;
}

export async function patchCharacterProfile(profileId: string, input: SaveCharacterProfileInput): Promise<CharacterProfile> {
  const response = await fetch(`${API_BASE}/api/character-profiles/${encodeURIComponent(profileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character profile update failed: ${response.status}`));
  }
  const body = await response.json() as { profile?: CharacterProfile };
  if (!body.profile) {
    throw new Error("Character profile update returned no profile.");
  }
  return body.profile;
}

export async function deleteCharacterProfile(profileId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/character-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character profile delete failed: ${response.status}`));
  }
}

export async function uploadCharacterReferenceImage(
  profileId: string,
  input: UploadCharacterReferenceInput
): Promise<CharacterProfile> {
  const formData = new FormData();
  formData.append("file", input.file);
  appendOptionalFormValue(formData, "kind", input.kind);
  appendOptionalFormValue(formData, "title", input.title);
  appendOptionalFormValue(formData, "notes", input.notes);
  const response = await fetch(`${API_BASE}/api/character-profiles/${encodeURIComponent(profileId)}/reference-images`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character reference upload failed: ${response.status}`));
  }
  const body = await response.json() as { profile?: CharacterProfile };
  if (!body.profile) {
    throw new Error("Character reference upload returned no profile.");
  }
  return body.profile;
}

export async function linkCharacterResult(
  profileId: string,
  input: LinkCharacterResultInput
): Promise<CharacterProfile> {
  const response = await fetch(`${API_BASE}/api/character-profiles/${encodeURIComponent(profileId)}/result-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Character result link failed: ${response.status}`));
  }
  const body = await response.json() as { profile?: CharacterProfile };
  if (!body.profile) {
    throw new Error("Character result link returned no profile.");
  }
  return body.profile;
}

export async function listPromptTemplates(query: PromptTemplateQuery = {}): Promise<PromptTemplate[]> {
  const params = new URLSearchParams();
  if (query.type) {
    params.set("type", query.type);
  }
  if (query.tag?.trim()) {
    params.set("tag", query.tag.trim());
  }
  if (query.query?.trim()) {
    params.set("q", query.query.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/prompt-templates${suffix}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt templates load failed: ${response.status}`));
  }
  const body = await response.json() as { templates?: PromptTemplate[] };
  return body.templates ?? [];
}

export async function ensureDefaultPromptTemplates(): Promise<PromptTemplate[]> {
  const response = await fetch(`${API_BASE}/api/prompt-templates/defaults`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Default prompt templates failed: ${response.status}`));
  }
  const body = await response.json() as { templates?: PromptTemplate[] };
  return body.templates ?? [];
}

export async function createPromptTemplate(input: SavePromptTemplateInput): Promise<PromptTemplate> {
  const response = await fetch(`${API_BASE}/api/prompt-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt template create failed: ${response.status}`));
  }
  const body = await response.json() as { template?: PromptTemplate };
  if (!body.template) {
    throw new Error("Prompt template create returned no template.");
  }
  return body.template;
}

export async function patchPromptTemplate(templateId: string, input: SavePromptTemplateInput): Promise<PromptTemplate> {
  const response = await fetch(`${API_BASE}/api/prompt-templates/${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt template update failed: ${response.status}`));
  }
  const body = await response.json() as { template?: PromptTemplate };
  if (!body.template) {
    throw new Error("Prompt template update returned no template.");
  }
  return body.template;
}

export async function deletePromptTemplate(templateId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/prompt-templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt template delete failed: ${response.status}`));
  }
}

export async function composePrompt(input: ComposePromptInput): Promise<PromptComposition> {
  const response = await fetch(`${API_BASE}/api/prompt-compositions/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt composition failed: ${response.status}`));
  }
  const body = await response.json() as { composition?: PromptComposition };
  if (!body.composition) {
    throw new Error("Prompt composition returned no preview.");
  }
  return body.composition;
}

export async function listPromptCompositions(characterProfileId?: string): Promise<PromptComposition[]> {
  const params = new URLSearchParams();
  if (characterProfileId?.trim()) {
    params.set("characterProfileId", characterProfileId.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/prompt-compositions${suffix}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Prompt compositions load failed: ${response.status}`));
  }
  const body = await response.json() as { compositions?: PromptComposition[] };
  return body.compositions ?? [];
}

export async function uploadLive2DTexture(modelId: string, file: File, label?: string): Promise<Live2DModelRecord> {
  const formData = new FormData();
  formData.append("file", file);
  appendOptionalFormValue(formData, "label", label);
  const response = await fetch(`${API_BASE}/api/live2d/models/${encodeURIComponent(modelId)}/textures`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Live2D texture upload failed: ${response.status}`));
  }
  const body = await response.json() as { model?: Live2DModelRecord };
  if (!body.model) {
    throw new Error("Live2D texture upload returned no model.");
  }
  return body.model;
}

export async function listCharacters(): Promise<CharacterFolder[]> {
  const response = await fetch(`${API_BASE}/api/characters`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `角色列表加载失败：${response.status}`));
  }
  const body = await response.json() as { characters?: CharacterFolder[] };
  return body.characters ?? [];
}

export async function createCharacter(name: string): Promise<CharacterFolder> {
  const response = await fetch(`${API_BASE}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `角色创建失败：${response.status}`));
  }
  return response.json() as Promise<CharacterFolder>;
}

export async function deleteCharacter(characterId: string): Promise<CharacterFolder> {
  const response = await fetch(`${API_BASE}/api/characters/${encodeURIComponent(characterId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `角色删除失败：${response.status}`));
  }
  const body = await response.json() as { character?: CharacterFolder };
  return body.character ?? { id: characterId, name: characterId };
}

export async function listPixelCharacters(): Promise<PixelCharacterFolder[]> {
  const response = await fetch(`${API_BASE}/api/module02/characters`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素角色列表加载失败：${response.status}`));
  }
  const body = await response.json() as { characters?: PixelCharacterFolder[] };
  return body.characters ?? [];
}

export async function createPixelCharacter(name: string): Promise<PixelCharacterFolder> {
  const response = await fetch(`${API_BASE}/api/module02/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素角色创建失败：${response.status}`));
  }
  return response.json() as Promise<PixelCharacterFolder>;
}

export async function deletePixelCharacter(characterId: string): Promise<PixelCharacterFolder> {
  const response = await fetch(`${API_BASE}/api/module02/characters/${encodeURIComponent(characterId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素角色删除失败：${response.status}`));
  }
  const body = await response.json() as { character?: PixelCharacterFolder };
  return body.character ?? { id: characterId, name: characterId };
}

export async function getPixelCharacterAssets(characterId: string): Promise<PixelCharacterAssets> {
  const response = await fetch(`${API_BASE}/api/module02/characters/${encodeURIComponent(characterId)}/assets`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素角色文件加载失败：${response.status}`));
  }
  const body = await response.json() as { assets?: PixelCharacterAssets };
  return body.assets ?? {
    baseTemplate: {},
    walkTemplate: {},
    slices: {
      idle: { frames: [] },
      walk: { frames: [] }
    }
  };
}

export async function uploadModule02CharacterAsset(
  characterId: string,
  kind: "character-reference" | "base-template" | "walk-template",
  file: File,
  options: UploadModule02AssetOptions = {}
): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/module02/characters/${encodeURIComponent(characterId)}/assets/${encodeURIComponent(kind)}`, {
    method: "POST",
    headers: buildModule02UploadHeaders(options),
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素角色资源上传失败：${response.status}`));
  }
  return response.json() as Promise<UploadedAsset>;
}

export async function getPixelSpriteActions(): Promise<PixelSpriteActionTemplate[]> {
  const response = await fetch(`${API_BASE}/api/module02/generation/sprite-sheet/actions`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素动作模板加载失败：${response.status}`));
  }
  const body = await response.json() as { actions?: PixelSpriteActionTemplate[] };
  return body.actions ?? [];
}

export async function getProviderModelCatalog(): Promise<ProviderModelCatalog> {
  const response = await fetch(`${API_BASE}/api/provider-models`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Provider model catalog load failed: ${response.status}`));
  }
  return response.json() as Promise<ProviderModelCatalog>;
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await fetch(`${API_BASE}/api/runtime-config`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Runtime config load failed: ${response.status}`));
  }
  return response.json() as Promise<RuntimeConfig>;
}

export function loadUserApiProviderSettings(): UserApiProviderSettings {
  if (typeof localStorage === "undefined") {
    return createDefaultUserApiProviderSettings();
  }
  const raw = localStorage.getItem(USER_API_PROVIDER_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return createDefaultUserApiProviderSettings();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserApiProviderSettings>;
    const providerId = SELECTABLE_API_PROVIDER_IDS.includes(parsed.providerId as typeof SELECTABLE_API_PROVIDER_IDS[number])
      ? parsed.providerId as string
      : APIMART_PROVIDER_ID;
    const apiKeys = parsed.apiKeys && typeof parsed.apiKeys === "object"
      ? Object.fromEntries(Object.entries(parsed.apiKeys).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
    return { providerId, apiKeys };
  } catch {
    return createDefaultUserApiProviderSettings();
  }
}

export function saveUserApiProviderSettings(settings: UserApiProviderSettings): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  const providerId = SELECTABLE_API_PROVIDER_IDS.includes(settings.providerId as typeof SELECTABLE_API_PROVIDER_IDS[number])
    ? settings.providerId
    : APIMART_PROVIDER_ID;
  localStorage.setItem(USER_API_PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify({
    providerId,
    apiKeys: settings.apiKeys
  }));
}

export function filterProviderModelCatalogForUserSettings(
  catalog: ProviderModelCatalog,
  settings = loadUserApiProviderSettings()
): ProviderModelCatalog {
  const providerIds = getCompatibleProviderIds(settings.providerId);
  const models = catalog.models.filter((model) => providerIds.includes(model.providerId) || model.providerId === LOCAL_CODEX_PROVIDER_ID);
  const imageModels = models.filter((model) => model.capability === "image");
  const videoModels = models.filter((model) => model.capability === "video");
  return {
    providers: catalog.providers.filter((provider) => providerIds.includes(provider.id) || provider.id === LOCAL_CODEX_PROVIDER_ID),
    models,
    imageModels,
    videoModels,
    defaults: {
      imageModelId: imageModels.some((model) => model.id === catalog.defaults.imageModelId)
        ? catalog.defaults.imageModelId
        : imageModels[0]?.id ?? catalog.defaults.imageModelId,
      videoModelId: videoModels.some((model) => model.id === catalog.defaults.videoModelId)
        ? catalog.defaults.videoModelId
        : videoModels[0]?.id ?? catalog.defaults.videoModelId
    }
  };
}

function getCompatibleProviderIds(providerId: string): string[] {
  return providerId === APIMART_PROVIDER_ID ? [APIMART_PROVIDER_ID, "openrouter-compatible"] : [providerId];
}

export async function getAdminProviderSettings(adminToken: string): Promise<AdminProviderSettingsResponse> {
  const response = await fetch(`${API_BASE}/api/admin/provider-settings`, {
    headers: buildAdminSettingsHeaders(adminToken)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Provider settings load failed: ${response.status}`));
  }
  return response.json() as Promise<AdminProviderSettingsResponse>;
}

export async function saveAdminProviderSettings(
  adminToken: string,
  input: SaveAdminProviderSettingsInput
): Promise<AdminProviderSettingsResponse> {
  const response = await fetch(`${API_BASE}/api/admin/provider-settings`, {
    method: "PUT",
    headers: {
      ...buildAdminSettingsHeaders(adminToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Provider settings save failed: ${response.status}`));
  }
  return response.json() as Promise<AdminProviderSettingsResponse>;
}

export async function createSpriteSheetGeneration(
  input: CreateSpriteSheetGenerationInput,
  options: GenerationRequestOptions = {}
): Promise<SpriteSheetGenerationResult> {
  const response = await fetch(`${API_BASE}/api/module02/generation/sprite-sheet`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素 sprite sheet 生成失败：${response.status}`));
  }
  return response.json() as Promise<SpriteSheetGenerationResult>;
}

export async function processSpriteSheet(input: ProcessSpriteSheetInput): Promise<ProcessSpriteSheetResult> {
  const response = await fetch(`${API_BASE}/api/module02/processing/sprite-sheet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `像素 sprite sheet 切帧失败：${response.status}`));
  }
  return response.json() as Promise<ProcessSpriteSheetResult>;
}

export async function getModule01WorkflowConfig(): Promise<Module01WorkflowConfig | null> {
  const response = await fetch(`${API_BASE}/api/module01/workflow-config`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `模块 01 配置加载失败：${response.status}`));
  }
  const body = await response.json() as { config?: Module01WorkflowConfig | null };
  return body.config ?? null;
}

export async function saveModule01WorkflowConfig(config: Module01WorkflowConfig): Promise<Module01WorkflowConfig> {
  const response = await fetch(`${API_BASE}/api/module01/workflow-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `模块 01 配置保存失败：${response.status}`));
  }
  const body = await response.json() as { config?: Module01WorkflowConfig };
  return body.config ?? {};
}

export async function getModule02WorkflowConfig(): Promise<Module02WorkflowConfig | null> {
  const response = await fetch(`${API_BASE}/api/module02/workflow-config`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `妯″潡 02 閰嶇疆鍔犺浇澶辫触锛?{response.status}`));
  }
  const body = await response.json() as { config?: Module02WorkflowConfig | null };
  return body.config ?? null;
}

export async function saveModule02WorkflowConfig(config: Module02WorkflowConfig): Promise<Module02WorkflowConfig> {
  const response = await fetch(`${API_BASE}/api/module02/workflow-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `妯″潡 02 閰嶇疆淇濆瓨澶辫触锛?{response.status}`));
  }
  const body = await response.json() as { config?: Module02WorkflowConfig };
  return body.config ?? {};
}

export async function createOneClickCharacterJob(
  input: CreateOneClickCharacterJobInput,
  options: GenerationRequestOptions = {}
): Promise<OneClickCharacterJob> {
  const response = await fetch(`${API_BASE}/api/module01/one-click-character-jobs`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `一键生成角色启动失败：${response.status}`));
  }
  const body = await response.json() as { job?: OneClickCharacterJob };
  if (!body.job) {
    throw new Error("一键生成角色没有返回任务。");
  }
  return body.job;
}

export async function getOneClickCharacterJob(jobId: string): Promise<OneClickCharacterJob> {
  const response = await fetch(`${API_BASE}/api/module01/one-click-character-jobs/${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `一键生成角色状态查询失败：${response.status}`));
  }
  const body = await response.json() as { job?: OneClickCharacterJob };
  if (!body.job) {
    throw new Error("一键生成角色任务不存在。");
  }
  return body.job;
}

export async function uploadModule01ReferenceImage(
  kind: Module01ReferenceImageKind,
  file: File
): Promise<Module01ReferenceImageAsset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/module01/reference-images/${encodeURIComponent(kind)}`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `参考图保存失败：${response.status}`));
  }
  return response.json() as Promise<Module01ReferenceImageAsset>;
}

export async function uploadModule02ActionReferenceImage(
  actionId: Module02ActionReferenceId,
  file: File
): Promise<Module02ActionReferenceAsset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/module02/action-references/${encodeURIComponent(actionId)}`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `模块 02 参考图保存失败：${response.status}`));
  }
  return response.json() as Promise<Module02ActionReferenceAsset>;
}

export async function getCharacterAssets(characterId: string): Promise<CharacterAssets> {
  const response = await fetch(`${API_BASE}/api/characters/${encodeURIComponent(characterId)}/assets`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `角色文件加载失败：${response.status}`));
  }
  const body = await response.json() as { assets?: CharacterAssets };
  return body.assets ?? {
    baseTemplate: {},
    baseCharacter: {}
  };
}

export async function getProject(projectId = "default"): Promise<ProjectState> {
  const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectId)}`);
  if (!response.ok) {
    throw new Error(`Failed to load project: ${response.status}`);
  }
  return response.json() as Promise<ProjectState>;
}

export async function saveProjectKeys(
  projectId: string,
  keys: SavedAnimationKeys
): Promise<ProjectState> {
  const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectId)}/keys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(keys)
  });
  if (!response.ok) {
    throw new Error(`Failed to save project keys: ${response.status}`);
  }
  return response.json() as Promise<ProjectState>;
}

export async function uploadFirstFrameAsset(
  file: File,
  options: UploadAssetOptions = {}
): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/assets/first-frame`, {
    method: "POST",
    headers: buildUploadHeaders(options),
    body: formData
  });
  if (!response.ok) {
    throw new Error(`上传首帧失败：${response.status}`);
  }
  return response.json() as Promise<UploadedAsset>;
}

export async function uploadFrameVideoAsset(file: File, options: UploadFrameVideoOptions = {}): Promise<UploadedFrameVideo> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/assets/frame-video`, {
    method: "POST",
    headers: buildCharacterHeaders(options.characterId, options.actionKind),
    body: formData
  });
  if (!response.ok) {
    throw new Error(`上传帧处理视频失败：${response.status}`);
  }
  return response.json() as Promise<UploadedFrameVideo>;
}

function buildUploadHeaders(options: UploadAssetOptions): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const publicAssetBaseUrl = options.publicAssetBaseUrl?.trim();
  if (publicAssetBaseUrl) {
    headers["x-public-asset-base-url"] = publicAssetBaseUrl;
  }
  const characterId = options.characterId?.trim();
  if (characterId) {
    headers["x-character-id"] = encodeCharacterHeaderValue(characterId);
  }
  const characterAssetKind = options.characterAssetKind?.trim();
  if (characterAssetKind) {
    headers["x-character-asset-kind"] = characterAssetKind;
  }
  const actionKind = options.actionKind?.trim();
  if (actionKind) {
    headers["x-character-action-kind"] = actionKind;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function buildModule02UploadHeaders(options: UploadModule02AssetOptions): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const publicAssetBaseUrl = options.publicAssetBaseUrl?.trim();
  if (publicAssetBaseUrl) {
    headers["x-public-asset-base-url"] = publicAssetBaseUrl;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function createFirstFrameGeneration(
  input: CreateFirstFrameGenerationInput,
  options: GenerationRequestOptions = {}
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/api/generation/first-frame`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `首帧处理请求失败：${response.status}`));
  }
  return response.json() as Promise<unknown>;
}

export async function createDirectionTemplateGeneration(
  input: CreateDirectionTemplateGenerationInput,
  options: GenerationRequestOptions = {}
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/api/generation/direction-template`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `四方向模板生成请求失败：${response.status}`));
  }
  return response.json() as Promise<unknown>;
}

export async function createAdvancedActionMidframeGeneration(
  input: CreateAdvancedActionMidframeGenerationInput,
  options: GenerationRequestOptions = {}
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/api/generation/advanced-action-midframe`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `攻击中间帧生成请求失败：${response.status}`));
  }
  return response.json() as Promise<unknown>;
}

export async function createVideoGeneration(
  input: CreateVideoGenerationInput,
  options: GenerationRequestOptions = {}
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/api/generation/video`, {
    method: "POST",
    headers: buildGenerationHeaders(options),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `视频生成请求失败：${response.status}`));
  }
  return response.json() as Promise<unknown>;
}

export async function getVideoGenerationStatus(
  jobId: string,
  options: GenerationRequestOptions = {}
): Promise<VideoJobStatus> {
  const query = new URLSearchParams();
  if (options.characterId) {
    query.set("characterId", options.characterId);
  }
  if (options.actionKind) {
    query.set("actionKind", options.actionKind);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/generation/video/${encodeURIComponent(jobId)}${suffix}`, {
    method: "GET",
    headers: buildGenerationHeaders(options)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `视频状态查询失败：${response.status}`));
  }
  return response.json() as Promise<VideoJobStatus>;
}

export async function processVideoFrames(input: ProcessFramesInput): Promise<ProcessFramesResult> {
  const response = await fetch(`${API_BASE}/api/processing/frames`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `帧处理失败：${response.status}`));
  }
  return response.json() as Promise<ProcessFramesResult>;
}

export async function processFourDirectionVideo(input: ProcessFourDirectionInput): Promise<ProcessFourDirectionResult> {
  const response = await fetch(`${API_BASE}/api/processing/four-direction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `四方向循环处理失败：${response.status}`));
  }
  return response.json() as Promise<ProcessFourDirectionResult>;
}

export async function processIdleFourDirection(input: ProcessIdleFourDirectionInput): Promise<ProcessIdleFourDirectionResult> {
  const response = await fetch(`${API_BASE}/api/processing/idle-four-direction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `待机四方向处理失败：${response.status}`));
  }
  return response.json() as Promise<ProcessIdleFourDirectionResult>;
}

export async function createGodotExport(input: CreateGodotExportInput): Promise<GodotExportResult> {
  const response = await fetch(`${API_BASE}/api/export/godot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Godot 导出失败：${response.status}`));
  }
  return response.json() as Promise<GodotExportResult>;
}

export async function prepareAdvancedActionStartFrame(input: PrepareAdvancedActionStartFrameInput): Promise<UploadedAsset> {
  const response = await fetch(`${API_BASE}/api/processing/advanced-action/start-frame`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `进阶动作起始帧准备失败：${response.status}`));
  }
  return response.json() as Promise<UploadedAsset>;
}

export async function processAdvancedActionVideo(input: ProcessAdvancedActionInput): Promise<ProcessFourDirectionResult> {
  const response = await fetch(`${API_BASE}/api/processing/advanced-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `进阶动作处理失败：${response.status}`));
  }
  return response.json() as Promise<ProcessFourDirectionResult>;
}

export function toAbsoluteApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function buildGenerationHeaders(options: GenerationRequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const providerAuth = resolveGenerationProviderAuth(options);
  if (providerAuth.providerId) {
    headers["x-ai-provider-id"] = providerAuth.providerId;
  }
  if (providerAuth.providerApiKey) {
    headers["x-ai-provider-api-key"] = providerAuth.providerApiKey;
  }
  const publicAssetBaseUrl = options.publicAssetBaseUrl?.trim();
  if (publicAssetBaseUrl) {
    headers["x-public-asset-base-url"] = publicAssetBaseUrl;
  }
  const characterId = options.characterId?.trim();
  if (characterId) {
    headers["x-character-id"] = encodeCharacterHeaderValue(characterId);
  }
  const actionKind = options.actionKind?.trim();
  if (actionKind) {
    headers["x-character-action-kind"] = actionKind;
  }
  return headers;
}

function resolveGenerationProviderAuth(options: GenerationRequestOptions): { providerId?: string; providerApiKey?: string } {
  if (options.providerId || options.providerApiKey) {
    return {
      providerId: options.providerId,
      providerApiKey: options.providerApiKey
    };
  }
  const settings = loadUserApiProviderSettings();
  return {
    providerId: settings.providerId,
    providerApiKey: settings.apiKeys[settings.providerId]?.trim()
  };
}

function createDefaultUserApiProviderSettings(): UserApiProviderSettings {
  return {
    providerId: APIMART_PROVIDER_ID,
    apiKeys: {}
  };
}

function buildAdminSettingsHeaders(adminToken: string): Record<string, string> {
  return {
    "x-admin-settings-token": adminToken
  };
}

function buildCharacterHeaders(characterId: string | undefined, actionKind?: AdvancedActionKind): Record<string, string> | undefined {
  const trimmed = characterId?.trim();
  const headers: Record<string, string> = {};
  if (trimmed) {
    headers["x-character-id"] = encodeCharacterHeaderValue(trimmed);
  }
  if (actionKind) {
    headers["x-character-action-kind"] = actionKind;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function encodeCharacterHeaderValue(characterId: string): string {
  return encodeURIComponent(characterId);
}

function appendOptionalFormValue(formData: FormData, key: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) {
    formData.append(key, trimmed);
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}
