import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AssetRecordFile,
  CharacterGenerationResultLink,
  CharacterProfile,
  CharacterReferenceImage,
  CharacterReferenceKind,
  CharacterResultRole,
  PromptComposition,
  PromptTemplate,
  PromptTemplateType
} from "@ai-game-workbench/core";

interface CharacterProfileIndex {
  profiles: CharacterProfile[];
}

interface PromptTemplateIndex {
  templates: PromptTemplate[];
  compositions: PromptComposition[];
}

export interface CharacterProfileQuery {
  query?: string;
  tag?: string;
}

export interface PromptTemplateQuery {
  query?: string;
  type?: string;
  tag?: string;
}

export interface CharacterProfileInput {
  name?: string;
  summary?: string;
  basePersona?: string;
  appearanceAnchor?: string;
  outfitAnchor?: string;
  defaultStyle?: string;
  personalityKeywords?: string[] | string;
  negativePrompt?: string;
  notes?: string;
  tags?: string[] | string;
}

export interface PromptTemplateInput {
  name?: string;
  type?: string;
  body?: string;
  negativeBody?: string;
  variables?: string[] | string;
  tags?: string[] | string;
  useCase?: string;
}

export interface ComposePromptInput {
  characterProfileId?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  save?: boolean;
}

export interface LinkCharacterResultInput {
  role?: string;
  assetId?: string;
  file?: AssetRecordFile;
  promptCompositionId?: string;
  notes?: string;
}

const PROMPT_TEMPLATE_TYPES = new Set<PromptTemplateType>([
  "base-character",
  "action",
  "outfit",
  "expression",
  "style",
  "portrait",
  "half-body",
  "full-body",
  "background",
  "image-to-prompt",
  "custom"
]);

const CHARACTER_REFERENCE_KINDS = new Set<CharacterReferenceKind>([
  "base-reference",
  "uploaded-source",
  "style-reference",
  "outfit-reference",
  "expression-reference",
  "other"
]);

const CHARACTER_RESULT_ROLES = new Set<CharacterResultRole>([
  "base-reference",
  "action-variant",
  "outfit-variant",
  "style-variant",
  "expression-variant",
  "failed-sample",
  "other"
]);

export async function listCharacterProfiles(storageDir: string, query: CharacterProfileQuery = {}): Promise<CharacterProfile[]> {
  const index = await readCharacterProfileIndex(storageDir);
  const search = query.query?.trim().toLowerCase();
  const tag = query.tag?.trim().toLowerCase();
  return index.profiles
    .filter((profile) => !tag || profile.tags.some((value) => value.toLowerCase() === tag))
    .filter((profile) => {
      if (!search) {
        return true;
      }
      const haystack = [
        profile.name,
        profile.summary,
        profile.basePersona,
        profile.appearanceAnchor,
        profile.outfitAnchor,
        profile.defaultStyle,
        profile.negativePrompt,
        profile.notes,
        ...profile.personalityKeywords,
        ...profile.tags
      ].filter(Boolean).join("\n").toLowerCase();
      return haystack.includes(search);
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getCharacterProfile(storageDir: string, profileId: string): Promise<CharacterProfile | null> {
  return (await readCharacterProfileIndex(storageDir)).profiles.find((profile) => profile.id === profileId) ?? null;
}

export async function createCharacterProfile(storageDir: string, input: CharacterProfileInput): Promise<CharacterProfile> {
  const now = new Date().toISOString();
  const profile: CharacterProfile = {
    id: randomUUID(),
    name: sanitizeText(input.name) || "Untitled character",
    summary: sanitizeText(input.summary),
    basePersona: sanitizeText(input.basePersona),
    appearanceAnchor: sanitizeText(input.appearanceAnchor),
    outfitAnchor: sanitizeText(input.outfitAnchor),
    defaultStyle: sanitizeText(input.defaultStyle),
    personalityKeywords: sanitizeList(input.personalityKeywords),
    negativePrompt: sanitizeText(input.negativePrompt),
    notes: sanitizeText(input.notes),
    referenceImages: [],
    resultLinks: [],
    tags: sanitizeList(input.tags),
    createdAt: now,
    updatedAt: now
  };
  const index = await readCharacterProfileIndex(storageDir);
  index.profiles = [profile, ...index.profiles];
  await writeCharacterProfileIndex(storageDir, index);
  return profile;
}

export async function patchCharacterProfile(storageDir: string, profileId: string, input: CharacterProfileInput): Promise<CharacterProfile | null> {
  const index = await readCharacterProfileIndex(storageDir);
  const profileIndex = index.profiles.findIndex((profile) => profile.id === profileId);
  if (profileIndex < 0) {
    return null;
  }
  const existing = index.profiles[profileIndex];
  if (!existing) {
    return null;
  }
  const patched: CharacterProfile = {
    ...existing,
    name: input.name === undefined ? existing.name : sanitizeText(input.name) || existing.name,
    summary: input.summary === undefined ? existing.summary : sanitizeText(input.summary),
    basePersona: input.basePersona === undefined ? existing.basePersona : sanitizeText(input.basePersona),
    appearanceAnchor: input.appearanceAnchor === undefined ? existing.appearanceAnchor : sanitizeText(input.appearanceAnchor),
    outfitAnchor: input.outfitAnchor === undefined ? existing.outfitAnchor : sanitizeText(input.outfitAnchor),
    defaultStyle: input.defaultStyle === undefined ? existing.defaultStyle : sanitizeText(input.defaultStyle),
    personalityKeywords: input.personalityKeywords === undefined ? existing.personalityKeywords : sanitizeList(input.personalityKeywords),
    negativePrompt: input.negativePrompt === undefined ? existing.negativePrompt : sanitizeText(input.negativePrompt),
    notes: input.notes === undefined ? existing.notes : sanitizeText(input.notes),
    tags: input.tags === undefined ? existing.tags : sanitizeList(input.tags),
    updatedAt: new Date().toISOString()
  };
  index.profiles[profileIndex] = patched;
  await writeCharacterProfileIndex(storageDir, index);
  return patched;
}

export async function deleteCharacterProfile(storageDir: string, profileId: string): Promise<CharacterProfile | null> {
  const index = await readCharacterProfileIndex(storageDir);
  const profile = index.profiles.find((item) => item.id === profileId) ?? null;
  if (!profile) {
    return null;
  }
  index.profiles = index.profiles.filter((item) => item.id !== profileId);
  await writeCharacterProfileIndex(storageDir, index);
  return profile;
}

export async function addCharacterReferenceImage(
  storageDir: string,
  profileId: string,
  input: Omit<CharacterReferenceImage, "id" | "createdAt">
): Promise<CharacterProfile | null> {
  const index = await readCharacterProfileIndex(storageDir);
  const profileIndex = index.profiles.findIndex((profile) => profile.id === profileId);
  if (profileIndex < 0 || !index.profiles[profileIndex]) {
    return null;
  }
  const profile = index.profiles[profileIndex];
  const reference: CharacterReferenceImage = {
    ...input,
    id: randomUUID(),
    kind: normalizeCharacterReferenceKind(input.kind) ?? "other",
    title: sanitizeText(input.title) || "Reference image",
    createdAt: new Date().toISOString()
  };
  const patched: CharacterProfile = {
    ...profile,
    referenceImages: [reference, ...profile.referenceImages],
    updatedAt: new Date().toISOString()
  };
  index.profiles[profileIndex] = patched;
  await writeCharacterProfileIndex(storageDir, index);
  return patched;
}

export async function linkCharacterResult(
  storageDir: string,
  profileId: string,
  input: LinkCharacterResultInput
): Promise<CharacterProfile | null> {
  const index = await readCharacterProfileIndex(storageDir);
  const profileIndex = index.profiles.findIndex((profile) => profile.id === profileId);
  if (profileIndex < 0 || !index.profiles[profileIndex]) {
    return null;
  }
  const profile = index.profiles[profileIndex];
  const link: CharacterGenerationResultLink = {
    id: randomUUID(),
    role: normalizeCharacterResultRole(input.role) ?? "other",
    assetId: sanitizeText(input.assetId),
    file: sanitizeFile(input.file),
    promptCompositionId: sanitizeText(input.promptCompositionId),
    notes: sanitizeText(input.notes),
    createdAt: new Date().toISOString()
  };
  const patched: CharacterProfile = {
    ...profile,
    resultLinks: [link, ...profile.resultLinks],
    updatedAt: new Date().toISOString()
  };
  index.profiles[profileIndex] = patched;
  await writeCharacterProfileIndex(storageDir, index);
  return patched;
}

export async function listPromptTemplates(storageDir: string, query: PromptTemplateQuery = {}): Promise<PromptTemplate[]> {
  const index = await readPromptTemplateIndex(storageDir);
  const search = query.query?.trim().toLowerCase();
  const type = normalizePromptTemplateType(query.type);
  const tag = query.tag?.trim().toLowerCase();
  return index.templates
    .filter((template) => !type || template.type === type)
    .filter((template) => !tag || template.tags.some((value) => value.toLowerCase() === tag))
    .filter((template) => {
      if (!search) {
        return true;
      }
      const haystack = [
        template.name,
        template.body,
        template.negativeBody,
        template.useCase,
        ...template.variables,
        ...template.tags
      ].filter(Boolean).join("\n").toLowerCase();
      return haystack.includes(search);
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createPromptTemplate(storageDir: string, input: PromptTemplateInput): Promise<PromptTemplate> {
  const now = new Date().toISOString();
  const body = sanitizeText(input.body) || "";
  const template: PromptTemplate = {
    id: randomUUID(),
    name: sanitizeText(input.name) || "Untitled template",
    type: normalizePromptTemplateType(input.type) ?? "custom",
    body,
    negativeBody: sanitizeText(input.negativeBody),
    variables: sanitizeList(input.variables).length > 0 ? sanitizeList(input.variables) : extractPromptVariables(body),
    tags: sanitizeList(input.tags),
    useCase: sanitizeText(input.useCase),
    createdAt: now,
    updatedAt: now
  };
  const index = await readPromptTemplateIndex(storageDir);
  index.templates = [template, ...index.templates];
  await writePromptTemplateIndex(storageDir, index);
  return template;
}

export async function patchPromptTemplate(storageDir: string, templateId: string, input: PromptTemplateInput): Promise<PromptTemplate | null> {
  const index = await readPromptTemplateIndex(storageDir);
  const templateIndex = index.templates.findIndex((template) => template.id === templateId);
  if (templateIndex < 0) {
    return null;
  }
  const existing = index.templates[templateIndex];
  if (!existing) {
    return null;
  }
  const body = input.body === undefined ? existing.body : sanitizeText(input.body) || "";
  const explicitVariables = input.variables === undefined ? existing.variables : sanitizeList(input.variables);
  const patched: PromptTemplate = {
    ...existing,
    name: input.name === undefined ? existing.name : sanitizeText(input.name) || existing.name,
    type: input.type === undefined ? existing.type : normalizePromptTemplateType(input.type) ?? existing.type,
    body,
    negativeBody: input.negativeBody === undefined ? existing.negativeBody : sanitizeText(input.negativeBody),
    variables: explicitVariables.length > 0 ? explicitVariables : extractPromptVariables(body),
    tags: input.tags === undefined ? existing.tags : sanitizeList(input.tags),
    useCase: input.useCase === undefined ? existing.useCase : sanitizeText(input.useCase),
    updatedAt: new Date().toISOString()
  };
  index.templates[templateIndex] = patched;
  await writePromptTemplateIndex(storageDir, index);
  return patched;
}

export async function deletePromptTemplate(storageDir: string, templateId: string): Promise<PromptTemplate | null> {
  const index = await readPromptTemplateIndex(storageDir);
  const template = index.templates.find((item) => item.id === templateId) ?? null;
  if (!template) {
    return null;
  }
  index.templates = index.templates.filter((item) => item.id !== templateId);
  await writePromptTemplateIndex(storageDir, index);
  return template;
}

export async function composePrompt(storageDir: string, input: ComposePromptInput): Promise<PromptComposition | { error: string }> {
  const characterProfileId = sanitizeText(input.characterProfileId);
  const templateId = sanitizeText(input.templateId);
  if (!characterProfileId || !templateId) {
    return { error: "characterProfileId and templateId are required" };
  }
  const profile = await getCharacterProfile(storageDir, characterProfileId);
  if (!profile) {
    return { error: "character profile not found" };
  }
  const templateIndex = await readPromptTemplateIndex(storageDir);
  const template = templateIndex.templates.find((item) => item.id === templateId);
  if (!template) {
    return { error: "prompt template not found" };
  }
  const variables = sanitizeVariableMap(input.variables);
  const systemVariables = buildSystemVariables(profile);
  const mergedVariables = { ...systemVariables, ...variables };
  const now = new Date().toISOString();
  const composition: PromptComposition = {
    id: randomUUID(),
    characterProfileId,
    templateId,
    variables,
    positivePrompt: renderTemplate(template.body, mergedVariables),
    negativePrompt: joinPromptParts([
      profile.negativePrompt,
      renderTemplate(template.negativeBody ?? "", mergedVariables)
    ]),
    linkedAssetIds: [],
    createdAt: now,
    updatedAt: now
  };
  if (input.save) {
    templateIndex.compositions = [composition, ...templateIndex.compositions];
    await writePromptTemplateIndex(storageDir, templateIndex);
  }
  return composition;
}

export async function listPromptCompositions(storageDir: string, characterProfileId?: string): Promise<PromptComposition[]> {
  const index = await readPromptTemplateIndex(storageDir);
  return index.compositions
    .filter((composition) => !characterProfileId || composition.characterProfileId === characterProfileId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createDefaultPromptTemplates(): PromptTemplateInput[] {
  return [
    {
      name: "基础人设图",
      type: "base-character",
      body: "{character_anchor}, {base_persona}, {outfit_anchor}, {default_style}, full body character design sheet, clean background, front view, clear silhouette",
      negativeBody: "low quality, blurry, extra limbs, bad hands, watermark, text, logo",
      variables: ["character_anchor", "base_persona", "outfit_anchor", "default_style"],
      tags: ["starter", "reference"],
      useCase: "从零创建角色时生成第一张基础参考图"
    },
    {
      name: "动作变化",
      type: "action",
      body: "{character_anchor}, same character, {action}, {outfit_anchor}, {default_style}, consistent face and hairstyle, dynamic pose",
      negativeBody: "different character, changed hairstyle, changed face, low quality, watermark",
      variables: ["character_anchor", "action", "outfit_anchor", "default_style"],
      tags: ["variant", "action"],
      useCase: "在同一角色基础上变化动作"
    },
    {
      name: "服装变化",
      type: "outfit",
      body: "{character_anchor}, same character, wearing {outfit}, {default_style}, consistent face, consistent hairstyle, high detail outfit design",
      negativeBody: "different character, wrong face, wrong hair color, low quality, watermark",
      variables: ["character_anchor", "outfit", "default_style"],
      tags: ["variant", "outfit"],
      useCase: "在同一角色基础上更换服装"
    },
    {
      name: "画风变化",
      type: "style",
      body: "{character_anchor}, same character, {style}, consistent facial features, consistent hairstyle, polished illustration",
      negativeBody: "different character, inconsistent identity, low quality, watermark",
      variables: ["character_anchor", "style"],
      tags: ["variant", "style"],
      useCase: "在保留角色身份的基础上变换画风"
    },
    {
      name: "以图反推提示词",
      type: "image-to-prompt",
      body: "请分析我上传的参考图，并输出一份可用于 AI 生图的提示词。重点提炼：{analysis_focus}。请分别给出：1. 主体与构图；2. 画风与媒介；3. 色彩、光影和质感；4. 镜头、景别和氛围；5. 可直接复制的正向提示词；6. 可直接复制的负面提示词。输出语言：{output_language}。目标用途：{target_use}。",
      negativeBody: "",
      variables: ["analysis_focus", "output_language", "target_use"],
      tags: ["reverse", "vision", "style"],
      useCase: "把参考图交给视觉 AI 分析，反推出可复现该图风格的生图提示词"
    }
  ];
}

export function normalizePromptTemplateType(value: string | undefined): PromptTemplateType | undefined {
  const normalized = value?.trim() as PromptTemplateType | undefined;
  return normalized && PROMPT_TEMPLATE_TYPES.has(normalized) ? normalized : undefined;
}

export function normalizeCharacterReferenceKind(value: string | undefined): CharacterReferenceKind | undefined {
  const normalized = value?.trim() as CharacterReferenceKind | undefined;
  return normalized && CHARACTER_REFERENCE_KINDS.has(normalized) ? normalized : undefined;
}

export function normalizeCharacterResultRole(value: string | undefined): CharacterResultRole | undefined {
  const normalized = value?.trim() as CharacterResultRole | undefined;
  return normalized && CHARACTER_RESULT_ROLES.has(normalized) ? normalized : undefined;
}

async function readCharacterProfileIndex(storageDir: string): Promise<CharacterProfileIndex> {
  try {
    const parsed = JSON.parse(await readFile(resolveCharacterProfileIndexPath(storageDir), "utf8")) as Partial<CharacterProfileIndex>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeProfile).filter(isCharacterProfile) : []
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { profiles: [] };
    }
    throw error;
  }
}

async function writeCharacterProfileIndex(storageDir: string, index: CharacterProfileIndex): Promise<void> {
  const path = resolveCharacterProfileIndexPath(storageDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

async function readPromptTemplateIndex(storageDir: string): Promise<PromptTemplateIndex> {
  try {
    const parsed = JSON.parse(await readFile(resolvePromptTemplateIndexPath(storageDir), "utf8")) as Partial<PromptTemplateIndex>;
    return {
      templates: Array.isArray(parsed.templates) ? parsed.templates.map(normalizeTemplate).filter(isPromptTemplate) : [],
      compositions: Array.isArray(parsed.compositions) ? parsed.compositions.map(normalizeComposition).filter(isPromptComposition) : []
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { templates: [], compositions: [] };
    }
    throw error;
  }
}

async function writePromptTemplateIndex(storageDir: string, index: PromptTemplateIndex): Promise<void> {
  const path = resolvePromptTemplateIndexPath(storageDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function normalizeProfile(value: unknown): CharacterProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<CharacterProfile>;
  const id = sanitizeText(input.id);
  if (!id) {
    return null;
  }
  const createdAt = sanitizeText(input.createdAt) || new Date().toISOString();
  return {
    id,
    name: sanitizeText(input.name) || "Untitled character",
    summary: sanitizeText(input.summary),
    basePersona: sanitizeText(input.basePersona),
    appearanceAnchor: sanitizeText(input.appearanceAnchor),
    outfitAnchor: sanitizeText(input.outfitAnchor),
    defaultStyle: sanitizeText(input.defaultStyle),
    personalityKeywords: sanitizeList(input.personalityKeywords),
    negativePrompt: sanitizeText(input.negativePrompt),
    notes: sanitizeText(input.notes),
    referenceImages: Array.isArray(input.referenceImages) ? input.referenceImages.map(normalizeReferenceImage).filter(isReferenceImage) : [],
    resultLinks: Array.isArray(input.resultLinks) ? input.resultLinks.map(normalizeResultLink).filter(isResultLink) : [],
    tags: sanitizeList(input.tags),
    createdAt,
    updatedAt: sanitizeText(input.updatedAt) || createdAt
  };
}

function normalizeTemplate(value: unknown): PromptTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<PromptTemplate>;
  const id = sanitizeText(input.id);
  if (!id) {
    return null;
  }
  const body = sanitizeText(input.body) || "";
  const createdAt = sanitizeText(input.createdAt) || new Date().toISOString();
  return {
    id,
    name: sanitizeText(input.name) || "Untitled template",
    type: normalizePromptTemplateType(input.type) ?? "custom",
    body,
    negativeBody: sanitizeText(input.negativeBody),
    variables: sanitizeList(input.variables).length > 0 ? sanitizeList(input.variables) : extractPromptVariables(body),
    tags: sanitizeList(input.tags),
    useCase: sanitizeText(input.useCase),
    createdAt,
    updatedAt: sanitizeText(input.updatedAt) || createdAt
  };
}

function normalizeComposition(value: unknown): PromptComposition | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<PromptComposition>;
  const id = sanitizeText(input.id);
  const characterProfileId = sanitizeText(input.characterProfileId);
  const templateId = sanitizeText(input.templateId);
  if (!id || !characterProfileId || !templateId) {
    return null;
  }
  const createdAt = sanitizeText(input.createdAt) || new Date().toISOString();
  return {
    id,
    characterProfileId,
    templateId,
    variables: sanitizeVariableMap(input.variables),
    positivePrompt: sanitizeText(input.positivePrompt) || "",
    negativePrompt: sanitizeText(input.negativePrompt) || "",
    linkedAssetIds: sanitizeList(input.linkedAssetIds),
    createdAt,
    updatedAt: sanitizeText(input.updatedAt) || createdAt
  };
}

function normalizeReferenceImage(value: unknown): CharacterReferenceImage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<CharacterReferenceImage>;
  const id = sanitizeText(input.id);
  const file = sanitizeFile(input);
  if (!id || !file) {
    return null;
  }
  return {
    ...file,
    id,
    kind: normalizeCharacterReferenceKind(input.kind) ?? "other",
    title: sanitizeText(input.title) || "Reference image",
    createdAt: sanitizeText(input.createdAt) || new Date().toISOString()
  };
}

function normalizeResultLink(value: unknown): CharacterGenerationResultLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Partial<CharacterGenerationResultLink>;
  const id = sanitizeText(input.id);
  if (!id) {
    return null;
  }
  return {
    id,
    role: normalizeCharacterResultRole(input.role) ?? "other",
    assetId: sanitizeText(input.assetId),
    file: sanitizeFile(input.file),
    promptCompositionId: sanitizeText(input.promptCompositionId),
    notes: sanitizeText(input.notes),
    createdAt: sanitizeText(input.createdAt) || new Date().toISOString()
  };
}

function sanitizeFile(value: unknown): AssetRecordFile | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const input = value as AssetRecordFile;
  const file: AssetRecordFile = {
    label: sanitizeText(input.label),
    fileName: sanitizeText(input.fileName),
    localPath: sanitizeText(input.localPath),
    localUrl: sanitizeText(input.localUrl),
    publicUrl: sanitizeText(input.publicUrl),
    mimeType: sanitizeText(input.mimeType)
  };
  return file.localPath || file.localUrl || file.publicUrl ? file : undefined;
}

function sanitizeVariableMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key.trim(), typeof item === "string" ? item.trim() : String(item ?? "").trim()])
    .filter(([key, item]) => key && item));
}

function buildSystemVariables(profile: CharacterProfile): Record<string, string> {
  return {
    character_name: profile.name,
    character_anchor: joinPromptParts([profile.name, profile.appearanceAnchor]),
    base_persona: profile.basePersona ?? "",
    appearance_anchor: profile.appearanceAnchor ?? "",
    outfit_anchor: profile.outfitAnchor ?? "",
    default_style: profile.defaultStyle ?? "",
    personality_keywords: profile.personalityKeywords.join(", "),
    notes: profile.notes ?? ""
  };
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => variables[key] ?? match);
}

function extractPromptVariables(template: string): string[] {
  return [...new Set(Array.from(template.matchAll(/\{([a-zA-Z0-9_]+)\}/g))
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value)))];
}

function joinPromptParts(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function sanitizeList(value: string[] | string | undefined): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function sanitizeText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function resolveCharacterProfileIndexPath(storageDir: string): string {
  return join(storageDir, "character_profiles", "index.json");
}

function resolvePromptTemplateIndexPath(storageDir: string): string {
  return join(storageDir, "prompt_templates", "index.json");
}

function isCharacterProfile(value: CharacterProfile | null): value is CharacterProfile {
  return value !== null;
}

function isPromptTemplate(value: PromptTemplate | null): value is PromptTemplate {
  return value !== null;
}

function isPromptComposition(value: PromptComposition | null): value is PromptComposition {
  return value !== null;
}

function isReferenceImage(value: CharacterReferenceImage | null): value is CharacterReferenceImage {
  return value !== null;
}

function isResultLink(value: CharacterGenerationResultLink | null): value is CharacterGenerationResultLink {
  return value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
