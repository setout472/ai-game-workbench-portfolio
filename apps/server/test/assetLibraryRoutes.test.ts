import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ai-game-workbench-asset-library-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("asset library routes", () => {
  it("creates, lists, patches, and exports asset records", async () => {
    const app = createApp({ storageDir: tempDir, port: 8787 });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/asset-library/records",
      payload: {
        kind: "character",
        title: "Hero portrait",
        prompt: "blue jacket, clean line art",
        tags: "hero, portrait",
        files: [{ localUrl: "/assets/hero.png", fileName: "hero.png" }]
      }
    });
    const record = createResponse.json().record;
    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/asset-library/records/${record.id}`,
      payload: {
        favorite: true,
        tags: ["hero", "favorite"]
      }
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/asset-library?favorite=true&tag=favorite"
    });
    const exportResponse = await app.inject({
      method: "POST",
      url: "/api/asset-library/export",
      payload: {
        assetIds: [record.id]
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(patchResponse.json().record.favorite).toBe(true);
    expect(listResponse.json().records).toHaveLength(1);
    expect(exportResponse.json().export.assetCount).toBe(1);
    await expect(readFile(join(tempDir, "asset_library", "index.json"), "utf8")).resolves.toContain("Hero portrait");
    await app.close();
  });

  it("reports ComfyUI as optional when no base URL is configured", async () => {
    const app = createApp({ storageDir: tempDir, port: 8787 });

    const response = await app.inject({
      method: "GET",
      url: "/api/comfyui/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      configured: false,
      ok: false
    });
    await app.close();
  });

  it("registers lightweight Live2D model records", async () => {
    const app = createApp({ storageDir: tempDir, port: 8787 });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/live2d/models",
      payload: {
        name: "Kazusa model",
        modelJsonUrl: "/live2d/kazusa/model.json",
        previewImageUrl: "/live2d/kazusa/preview.png"
      }
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/live2d/models"
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().model.name).toBe("Kazusa model");
    expect(listResponse.json().models).toHaveLength(1);
    await expect(readFile(join(tempDir, "live2d", "index.json"), "utf8")).resolves.toContain("Kazusa model");
    await app.close();
  });
});
