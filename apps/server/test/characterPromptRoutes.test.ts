import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ai-game-workbench-character-prompts-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("character profile and prompt routes", () => {
  it("creates reusable character profiles and composes prompts from templates", async () => {
    const app = createApp({ storageDir: tempDir, port: 8787 });

    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/character-profiles",
      payload: {
        name: "Mira",
        basePersona: "young swordswoman, calm and observant",
        appearanceAnchor: "silver short hair, amber eyes, small scar under left eye",
        outfitAnchor: "navy travel cloak and light armor",
        defaultStyle: "clean anime key visual",
        negativePrompt: "different face, changed hair color",
        tags: "hero, reusable"
      }
    });
    const profile = createProfileResponse.json().profile;

    const defaultsResponse = await app.inject({
      method: "POST",
      url: "/api/prompt-templates/defaults"
    });
    const actionTemplate = defaultsResponse.json().templates.find((template: { type: string }) => template.type === "action");

    const previewResponse = await app.inject({
      method: "POST",
      url: "/api/prompt-compositions/preview",
      payload: {
        characterProfileId: profile.id,
        templateId: actionTemplate.id,
        variables: { action: "drawing a sword while stepping forward" },
        save: true
      }
    });
    const compositionsResponse = await app.inject({
      method: "GET",
      url: `/api/prompt-compositions?characterProfileId=${profile.id}`
    });

    expect(createProfileResponse.statusCode).toBe(201);
    expect(defaultsResponse.statusCode).toBe(200);
    expect(defaultsResponse.json().templates.map((template: { name: string }) => template.name)).toContain("动作变化");
    expect(defaultsResponse.json().templates.map((template: { name: string }) => template.name)).toContain("以图反推提示词");
    expect(previewResponse.statusCode).toBe(200);
    expect(previewResponse.json().composition.positivePrompt).toContain("drawing a sword");
    expect(previewResponse.json().composition.positivePrompt).toContain("silver short hair");
    expect(previewResponse.json().composition.negativePrompt).toContain("different face");
    expect(compositionsResponse.json().compositions).toHaveLength(1);
    await expect(readFile(join(tempDir, "character_profiles", "index.json"), "utf8")).resolves.toContain("Mira");
    await expect(readFile(join(tempDir, "prompt_templates", "index.json"), "utf8")).resolves.toContain("drawing a sword");
    await app.close();
  });

  it("uploads reference images and links imported results to a character profile", async () => {
    const app = createApp({ storageDir: tempDir, port: 8787 });
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/character-profiles",
      payload: { name: "Uploaded Hero" }
    });
    const profile = createProfileResponse.json().profile;

    const multipart = buildMultipartImagePayload("hero.png", onePixelPng(), {
      kind: "uploaded-source",
      title: "source character"
    });
    const uploadResponse = await app.inject({
      method: "POST",
      url: `/api/character-profiles/${profile.id}/reference-images`,
      headers: { "content-type": multipart.contentType },
      payload: multipart.payload
    });
    const assetResponse = await app.inject({
      method: "POST",
      url: "/api/asset-library/records",
      payload: {
        kind: "portrait",
        title: "External web result",
        files: [{ localUrl: "/assets/result.png", fileName: "result.png" }],
        prompt: "same character, smiling"
      }
    });
    const linkResponse = await app.inject({
      method: "POST",
      url: `/api/character-profiles/${profile.id}/result-links`,
      payload: {
        assetId: assetResponse.json().record.id,
        role: "expression-variant",
        notes: "Generated on a web image tool"
      }
    });

    expect(uploadResponse.statusCode).toBe(201);
    expect(uploadResponse.json().profile.referenceImages[0]).toMatchObject({
      kind: "uploaded-source",
      title: "source character"
    });
    expect(linkResponse.statusCode).toBe(200);
    expect(linkResponse.json().profile.resultLinks[0]).toMatchObject({
      role: "expression-variant",
      notes: "Generated on a web image tool"
    });
    await expect(readFile(join(tempDir, "asset_library", "index.json"), "utf8")).resolves.toContain("source character");
    await app.close();
  });
});

function buildMultipartImagePayload(filename: string, image: Buffer, fields: Record<string, string>) {
  const boundary = "----ai-game-workbench-character-prompt-test";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from([
      `--${boundary}`,
      `Content-Disposition: form-data; name="${name}"`,
      "",
      value
    ].join("\r\n")));
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from([
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    "Content-Type: image/png",
    ""
  ].join("\r\n")));
  chunks.push(Buffer.from("\r\n"));
  chunks.push(image);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    payload: Buffer.concat(chunks)
  };
}

function onePixelPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/atvXioAAAAASUVORK5CYII=",
    "base64"
  );
}
