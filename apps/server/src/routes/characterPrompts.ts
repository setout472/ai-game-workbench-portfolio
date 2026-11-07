import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config";
import { createAssetRecord } from "../storage/assetLibraryStore";
import {
  addCharacterReferenceImage,
  composePrompt,
  createCharacterProfile,
  createDefaultPromptTemplates,
  createPromptTemplate,
  deleteCharacterProfile,
  deletePromptTemplate,
  getCharacterProfile,
  linkCharacterResult,
  listCharacterProfiles,
  listPromptCompositions,
  listPromptTemplates,
  normalizeCharacterReferenceKind,
  normalizeCharacterResultRole,
  normalizePromptTemplateType,
  patchCharacterProfile,
  patchPromptTemplate,
  type CharacterProfileInput,
  type ComposePromptInput,
  type LinkCharacterResultInput,
  type PromptTemplateInput
} from "../storage/characterPromptStore";

type CharacterPromptRouteConfig = Pick<AppConfig, "storageDir">;

export function registerCharacterPromptRoutes(app: FastifyInstance, config: CharacterPromptRouteConfig): void {
  app.get("/api/character-profiles", async (request) => {
    const query = request.query as { q?: string; query?: string; tag?: string };
    return {
      profiles: await listCharacterProfiles(config.storageDir, {
        query: query.q ?? query.query,
        tag: query.tag
      })
    };
  });

  app.get("/api/character-profiles/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId?: string };
    const profile = profileId ? await getCharacterProfile(config.storageDir, profileId) : null;
    if (!profile) {
      return reply.code(404).send({ error: "character profile not found" });
    }
    return { profile };
  });

  app.post("/api/character-profiles", async (request, reply) => {
    const profile = await createCharacterProfile(config.storageDir, request.body as CharacterProfileInput);
    return reply.code(201).send({ profile });
  });

  app.patch("/api/character-profiles/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId?: string };
    if (!profileId) {
      return reply.code(400).send({ error: "profile id is required" });
    }
    const profile = await patchCharacterProfile(config.storageDir, profileId, request.body as CharacterProfileInput);
    if (!profile) {
      return reply.code(404).send({ error: "character profile not found" });
    }
    return { profile };
  });

  app.delete("/api/character-profiles/:profileId", async (request, reply) => {
    const { profileId } = request.params as { profileId?: string };
    if (!profileId) {
      return reply.code(400).send({ error: "profile id is required" });
    }
    const profile = await deleteCharacterProfile(config.storageDir, profileId);
    if (!profile) {
      return reply.code(404).send({ error: "character profile not found" });
    }
    return { profile };
  });

  app.post("/api/character-profiles/:profileId/reference-images", async (request, reply) => {
    const { profileId } = request.params as { profileId?: string };
    if (!profileId) {
      return reply.code(400).send({ error: "profile id is required" });
    }
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "file is required" });
    }
    if (!file.mimetype.startsWith("image/")) {
      return reply.code(400).send({ error: "only image files are supported" });
    }
    const fields = file.fields as Record<string, { value?: unknown } | undefined>;
    const kind = readMultipartField(fields, "kind");
    if (kind && !normalizeCharacterReferenceKind(kind)) {
      return reply.code(400).send({ error: "unsupported reference image kind" });
    }
    const extension = getImageExtension(file.filename, file.mimetype);
    const storedName = `${randomUUID()}${extension}`;
    const assetDir = join(config.storageDir, "assets");
    const localPath = join(assetDir, storedName);
    await mkdir(assetDir, { recursive: true });
    await writeFile(localPath, await file.toBuffer());
    const reference = {
      kind: normalizeCharacterReferenceKind(kind) ?? "uploaded-source",
      title: readMultipartField(fields, "title") ?? file.filename,
      fileName: file.filename,
      localPath,
      localUrl: `/assets/${storedName}`,
      mimeType: file.mimetype
    };
    const profile = await addCharacterReferenceImage(config.storageDir, profileId, reference);
    if (!profile) {
      return reply.code(404).send({ error: "character profile not found" });
    }
    await createAssetRecord(config.storageDir, {
      kind: "character",
      title: `${profile.name} ${reference.title}`,
      characterId: profile.id,
      workflow: "character-reference",
      tags: ["character-profile", "reference"],
      files: [{
        label: reference.title,
        fileName: reference.fileName,
        localPath: reference.localPath,
        localUrl: reference.localUrl,
        mimeType: reference.mimeType
      }]
    });
    return reply.code(201).send({ profile, reference: profile.referenceImages[0] });
  });

  app.post("/api/character-profiles/:profileId/result-links", async (request, reply) => {
    const { profileId } = request.params as { profileId?: string };
    if (!profileId) {
      return reply.code(400).send({ error: "profile id is required" });
    }
    const input = request.body as LinkCharacterResultInput;
    if (input.role && !normalizeCharacterResultRole(input.role)) {
      return reply.code(400).send({ error: "unsupported result role" });
    }
    const profile = await linkCharacterResult(config.storageDir, profileId, input);
    if (!profile) {
      return reply.code(404).send({ error: "character profile not found" });
    }
    return { profile, resultLink: profile.resultLinks[0] };
  });

  app.get("/api/prompt-templates", async (request) => {
    const query = request.query as { q?: string; query?: string; type?: string; tag?: string };
    return {
      templates: await listPromptTemplates(config.storageDir, {
        query: query.q ?? query.query,
        type: query.type,
        tag: query.tag
      })
    };
  });

  app.post("/api/prompt-templates/defaults", async () => {
    let templates = await listPromptTemplates(config.storageDir);
    const existingKeys = new Set(templates.map((template) => `${template.type}:${template.name}`));
    for (const template of createDefaultPromptTemplates()) {
      const key = `${template.type ?? "custom"}:${template.name ?? ""}`;
      if (!existingKeys.has(key)) {
        await createPromptTemplate(config.storageDir, template);
      }
    }
    const refreshedTemplates = await listPromptTemplates(config.storageDir);
    if (refreshedTemplates.length !== templates.length) {
      templates = refreshedTemplates;
    }
    return { templates };
  });

  app.post("/api/prompt-templates", async (request, reply) => {
    const input = request.body as PromptTemplateInput;
    if (input.type && !normalizePromptTemplateType(input.type)) {
      return reply.code(400).send({ error: "unsupported prompt template type" });
    }
    const template = await createPromptTemplate(config.storageDir, input);
    return reply.code(201).send({ template });
  });

  app.patch("/api/prompt-templates/:templateId", async (request, reply) => {
    const { templateId } = request.params as { templateId?: string };
    if (!templateId) {
      return reply.code(400).send({ error: "template id is required" });
    }
    const input = request.body as PromptTemplateInput;
    if (input.type && !normalizePromptTemplateType(input.type)) {
      return reply.code(400).send({ error: "unsupported prompt template type" });
    }
    const template = await patchPromptTemplate(config.storageDir, templateId, input);
    if (!template) {
      return reply.code(404).send({ error: "prompt template not found" });
    }
    return { template };
  });

  app.delete("/api/prompt-templates/:templateId", async (request, reply) => {
    const { templateId } = request.params as { templateId?: string };
    if (!templateId) {
      return reply.code(400).send({ error: "template id is required" });
    }
    const template = await deletePromptTemplate(config.storageDir, templateId);
    if (!template) {
      return reply.code(404).send({ error: "prompt template not found" });
    }
    return { template };
  });

  app.post("/api/prompt-compositions/preview", async (request, reply) => {
    const composition = await composePrompt(config.storageDir, request.body as ComposePromptInput);
    if ("error" in composition) {
      return reply.code(400).send({ error: composition.error });
    }
    return { composition };
  });

  app.get("/api/prompt-compositions", async (request) => {
    const query = request.query as { characterProfileId?: string };
    return { compositions: await listPromptCompositions(config.storageDir, query.characterProfileId) };
  });
}

function readMultipartField(fields: Record<string, { value?: unknown } | undefined>, key: string): string | undefined {
  const value = fields[key]?.value;
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getImageExtension(filename: string, mimeType: string): string {
  const extension = extname(filename).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    return extension;
  }
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".png";
}
