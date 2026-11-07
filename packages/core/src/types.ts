import type { ActionTemplateKey } from "./actionTemplates";

export type TargetSize = 64 | 128 | 256 | 512 | 1024;
export type CharacterDirection = "front" | "back" | "left" | "right";

export const CHARACTER_DIRECTIONS: readonly CharacterDirection[] = [
  "front",
  "back",
  "left",
  "right"
];

export const CHARACTER_DIRECTION_LABELS: Record<CharacterDirection, string> = {
  front: "正面",
  back: "背面",
  left: "左侧面",
  right: "右侧面"
};

export interface SavedAnimationKeys {
  assetKey: string;
  animationKey: string;
  fps: number;
  targetSize: TargetSize;
  loop: boolean;
}

export interface FirstFrameAsset {
  id: string;
  source: "uploaded" | "generated";
  localPath: string;
  publicUrl?: string;
}

export interface AnimationSettings extends SavedAnimationKeys {
  actionTemplate: ActionTemplateKey;
  actionPrompt: string;
  keyColor: string;
  direction: CharacterDirection;
  durationSeconds: number;
  providerModel: string;
}

export interface ProjectState {
  projectId: string;
  keys: SavedAnimationKeys;
  firstFrame?: FirstFrameAsset;
  updatedAt: string;
}

export type AssetKind =
  | "character"
  | "portrait"
  | "expression"
  | "pose"
  | "pixel"
  | "background"
  | "prop"
  | "sprite-sheet"
  | "transparent-frame"
  | "live2d-texture"
  | "live2d-model"
  | "other";

export interface AssetRecordFile {
  label?: string;
  fileName?: string;
  localPath?: string;
  localUrl?: string;
  publicUrl?: string;
  mimeType?: string;
}

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  title: string;
  characterId?: string;
  files: AssetRecordFile[];
  prompt?: string;
  negativePrompt?: string;
  provider?: string;
  model?: string;
  workflow?: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AssetLibraryExport {
  exportId: string;
  createdAt: string;
  assetCount: number;
  exportRootPath: string;
  manifestPath: string;
  manifestUrl?: string;
}

export interface ComfyUiSettings {
  baseUrl: string;
}

export interface ComfyUiJob {
  promptId: string;
  clientId: string;
  status: "queued" | "running" | "completed" | "failed" | "unknown";
  createdAt: string;
  updatedAt: string;
  workflow?: string;
  providerResponse?: unknown;
}

export interface Live2DModelRecord {
  id: string;
  name: string;
  rootPath?: string;
  modelJsonUrl?: string;
  previewImageUrl?: string;
  textures: AssetRecordFile[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CharacterReferenceKind =
  | "base-reference"
  | "uploaded-source"
  | "style-reference"
  | "outfit-reference"
  | "expression-reference"
  | "other";

export type CharacterResultRole =
  | "base-reference"
  | "action-variant"
  | "outfit-variant"
  | "style-variant"
  | "expression-variant"
  | "failed-sample"
  | "other";

export interface CharacterReferenceImage extends AssetRecordFile {
  id: string;
  kind: CharacterReferenceKind;
  title: string;
  createdAt: string;
}

export interface CharacterGenerationResultLink {
  id: string;
  role: CharacterResultRole;
  assetId?: string;
  file?: AssetRecordFile;
  promptCompositionId?: string;
  notes?: string;
  createdAt: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  summary?: string;
  basePersona?: string;
  appearanceAnchor?: string;
  outfitAnchor?: string;
  defaultStyle?: string;
  personalityKeywords: string[];
  negativePrompt?: string;
  notes?: string;
  referenceImages: CharacterReferenceImage[];
  resultLinks: CharacterGenerationResultLink[];
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export type PromptTemplateType =
  | "base-character"
  | "action"
  | "outfit"
  | "expression"
  | "style"
  | "portrait"
  | "half-body"
  | "full-body"
  | "background"
  | "image-to-prompt"
  | "custom";

export interface PromptTemplate {
  id: string;
  name: string;
  type: PromptTemplateType;
  body: string;
  negativeBody?: string;
  variables: string[];
  tags: string[];
  useCase?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PromptComposition {
  id: string;
  characterProfileId: string;
  templateId: string;
  variables: Record<string, string>;
  positivePrompt: string;
  negativePrompt: string;
  linkedAssetIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_KEYS: SavedAnimationKeys = {
  assetKey: "hero_mecha",
  animationKey: "idle",
  fps: 12,
  targetSize: 256,
  loop: true
};
