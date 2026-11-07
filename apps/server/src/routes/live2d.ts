import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config";
import {
  createAssetRecord
} from "../storage/assetLibraryStore";
import {
  createLive2DModel,
  listLive2DModels,
  patchLive2DModel,
  type CreateLive2DModelInput
} from "../storage/live2dStore";

type Live2DRouteConfig = Pick<AppConfig, "storageDir">;

export function registerLive2DRoutes(app: FastifyInstance, config: Live2DRouteConfig): void {
  app.get("/api/live2d/models", async () => ({ models: await listLive2DModels(config.storageDir) }));

  app.post("/api/live2d/models", async (request, reply) => {
    const model = await createLive2DModel(config.storageDir, request.body as CreateLive2DModelInput);
    if (model.modelJsonUrl) {
      await createAssetRecord(config.storageDir, {
        kind: "live2d-model",
        title: model.name,
        workflow: "live2d",
        tags: ["live2d"],
        files: [{
          label: "model",
          localUrl: model.modelJsonUrl
        }]
      });
    }
    return reply.code(201).send({ model });
  });

  app.patch("/api/live2d/models/:modelId", async (request, reply) => {
    const { modelId } = request.params as { modelId?: string };
    if (!modelId) {
      return reply.code(400).send({ error: "model id is required" });
    }
    const model = await patchLive2DModel(config.storageDir, modelId, request.body as CreateLive2DModelInput);
    if (!model) {
      return reply.code(404).send({ error: "Live2D model not found" });
    }
    return { model };
  });

  app.post("/api/live2d/models/:modelId/textures", async (request, reply) => {
    const { modelId } = request.params as { modelId?: string };
    if (!modelId) {
      return reply.code(400).send({ error: "model id is required" });
    }
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "file is required" });
    }
    if (!file.mimetype.startsWith("image/")) {
      return reply.code(400).send({ error: "only image files are supported" });
    }
    const storedName = `${randomUUID()}${getImageExtension(file.filename, file.mimetype)}`;
    const textureDir = join(config.storageDir, "live2d", modelId, "textures");
    const localPath = join(textureDir, storedName);
    await mkdir(textureDir, { recursive: true });
    await writeFile(localPath, await file.toBuffer());
    const texture = {
      label: readMultipartField(file.fields as Record<string, { value?: unknown } | undefined>, "label") ?? "texture",
      fileName: file.filename,
      localPath,
      localUrl: `/live2d/${modelId}/textures/${storedName}`,
      mimeType: file.mimetype
    };
    const models = await listLive2DModels(config.storageDir);
    const existing = models.find((model) => model.id === modelId);
    const model = await patchLive2DModel(config.storageDir, modelId, {
      textures: [...(existing?.textures ?? []), texture]
    });
    if (!model) {
      return reply.code(404).send({ error: "Live2D model not found" });
    }
    await createAssetRecord(config.storageDir, {
      kind: "live2d-texture",
      title: `${model.name} ${texture.label}`,
      workflow: "live2d-texture-replacement",
      tags: ["live2d", "texture"],
      files: [texture]
    });
    return reply.code(201).send({ model, texture });
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
