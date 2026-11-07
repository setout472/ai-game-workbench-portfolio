import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Box, Copy, Download, Heart, ImagePlus, Library, Play, RefreshCw, Save, Trash2, Upload, UserRound } from "lucide-react";
import type {
  AssetKind,
  AssetRecord,
  CharacterProfile,
  CharacterReferenceKind,
  CharacterResultRole,
  ComfyUiJob,
  Live2DModelRecord,
  PromptComposition,
  PromptTemplate,
  PromptTemplateType
} from "../api/client";
import {
  composePrompt,
  createCharacterProfile,
  createComfyUiJob,
  createLive2DModel,
  createPromptTemplate,
  deleteCharacterProfile,
  deletePromptTemplate,
  ensureDefaultPromptTemplates,
  exportAssetLibrary,
  getComfyUiJobStatus,
  getComfyUiStatus,
  importAssetUpload,
  linkCharacterResult,
  listAssetRecords,
  listCharacterProfiles,
  listLive2DModels,
  listPromptCompositions,
  listPromptTemplates,
  patchAssetRecord,
  patchCharacterProfile,
  patchPromptTemplate,
  toAbsoluteApiUrl,
  uploadCharacterReferenceImage,
  uploadLive2DTexture
} from "../api/client";

interface AssetLibraryProps {
  onBack: () => void;
}

type WorkbenchTab =
  | "asset-import"
  | "asset-browse"
  | "profile-create"
  | "profile-manage"
  | "profile-references"
  | "profile-results"
  | "prompt-templates"
  | "prompt-compose"
  | "image-to-prompt"
  | "comfyui"
  | "live2d";

interface CharacterProfileDraft {
  name: string;
  summary: string;
  basePersona: string;
  appearanceAnchor: string;
  outfitAnchor: string;
  defaultStyle: string;
  personalityKeywords: string;
  negativePrompt: string;
  tags: string;
  notes: string;
}

interface PromptTemplateDraft {
  name: string;
  type: PromptTemplateType;
  body: string;
  negativeBody: string;
  variables: string;
  tags: string;
  useCase: string;
}

const ASSET_KINDS: { value: AssetKind | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "character", label: "角色立绘" },
  { value: "portrait", label: "头像" },
  { value: "expression", label: "表情" },
  { value: "pose", label: "姿势" },
  { value: "pixel", label: "像素图" },
  { value: "background", label: "背景" },
  { value: "prop", label: "道具" },
  { value: "sprite-sheet", label: "精灵表" },
  { value: "transparent-frame", label: "透明帧" },
  { value: "live2d-texture", label: "Live2D 贴图" },
  { value: "live2d-model", label: "Live2D 模型" },
  { value: "other", label: "其他" }
];

const PROMPT_TEMPLATE_TYPES: { value: PromptTemplateType | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "base-character", label: "基础人设" },
  { value: "action", label: "动作变化" },
  { value: "outfit", label: "服装变化" },
  { value: "expression", label: "表情变化" },
  { value: "style", label: "画风变化" },
  { value: "portrait", label: "头像" },
  { value: "half-body", label: "半身像" },
  { value: "full-body", label: "全身图" },
  { value: "background", label: "背景融合" },
  { value: "image-to-prompt", label: "以图反推" },
  { value: "custom", label: "自定义" }
];

const REFERENCE_KINDS: { value: CharacterReferenceKind; label: string }[] = [
  { value: "base-reference", label: "基础参考图" },
  { value: "uploaded-source", label: "上传原图" },
  { value: "style-reference", label: "画风参考" },
  { value: "outfit-reference", label: "服装参考" },
  { value: "expression-reference", label: "表情参考" },
  { value: "other", label: "其他" }
];

const RESULT_ROLES: { value: CharacterResultRole; label: string }[] = [
  { value: "base-reference", label: "基础参考图" },
  { value: "action-variant", label: "动作变体" },
  { value: "outfit-variant", label: "服装变体" },
  { value: "style-variant", label: "画风变体" },
  { value: "expression-variant", label: "表情变体" },
  { value: "failed-sample", label: "失败样例" },
  { value: "other", label: "其他" }
];

const COMFY_STORAGE_KEY = "ai-game-workbench.comfyui-settings.v1";

const EMPTY_PROFILE_DRAFT: CharacterProfileDraft = {
  name: "",
  summary: "",
  basePersona: "",
  appearanceAnchor: "",
  outfitAnchor: "",
  defaultStyle: "",
  personalityKeywords: "",
  negativePrompt: "",
  tags: "",
  notes: ""
};

const EMPTY_TEMPLATE_DRAFT: PromptTemplateDraft = {
  name: "",
  type: "custom",
  body: "",
  negativeBody: "",
  variables: "",
  tags: "",
  useCase: ""
};

const SYSTEM_VARIABLES = new Set([
  "character_name",
  "character_anchor",
  "base_persona",
  "appearance_anchor",
  "outfit_anchor",
  "default_style",
  "personality_keywords",
  "notes"
]);

export function AssetLibrary({ onBack }: AssetLibraryProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("asset-import");
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [compositions, setCompositions] = useState<PromptComposition[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AssetKind | "">("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [includeLoose, setIncludeLoose] = useState(true);
  const [templateTypeFilter, setTemplateTypeFilter] = useState<PromptTemplateType | "">("");
  const [status, setStatus] = useState("");

  const [importKind, setImportKind] = useState<AssetKind>("character");
  const [importTitle, setImportTitle] = useState("");
  const [importTags, setImportTags] = useState("");
  const [importPrompt, setImportPrompt] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const [profileDraft, setProfileDraft] = useState<CharacterProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceKind, setReferenceKind] = useState<CharacterReferenceKind>("uploaded-source");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [resultRole, setResultRole] = useState<CharacterResultRole>("action-variant");
  const [resultNotes, setResultNotes] = useState("");

  const [templateDraft, setTemplateDraft] = useState<PromptTemplateDraft>(EMPTY_TEMPLATE_DRAFT);
  const [composerVariables, setComposerVariables] = useState<Record<string, string>>({});
  const [compositionPreview, setCompositionPreview] = useState<PromptComposition | null>(null);
  const [reverseAssetId, setReverseAssetId] = useState("");
  const [reverseFile, setReverseFile] = useState<File | null>(null);
  const [reverseTitle, setReverseTitle] = useState("");
  const [reverseFocus, setReverseFocus] = useState("画风、色彩、光影、构图、材质、镜头语言");
  const [reverseLanguage, setReverseLanguage] = useState("中文");
  const [reverseTargetUse, setReverseTargetUse] = useState("用于网页端 AI 生图，复现参考图的视觉风格");
  const [reversePromptPreview, setReversePromptPreview] = useState("");

  const [comfyBaseUrl, setComfyBaseUrl] = useState(() => loadComfyBaseUrl());
  const [comfyWorkflow, setComfyWorkflow] = useState("{}");
  const [comfyJob, setComfyJob] = useState<ComfyUiJob | null>(null);
  const [live2dModels, setLive2dModels] = useState<Live2DModelRecord[]>([]);
  const [live2dName, setLive2dName] = useState("");
  const [live2dModelUrl, setLive2dModelUrl] = useState("");
  const [live2dPreviewUrl, setLive2dPreviewUrl] = useState("");
  const [live2dTextureFile, setLive2dTextureFile] = useState<File | null>(null);
  const [live2dTextureLabel, setLive2dTextureLabel] = useState("");
  const [activeLive2dId, setActiveLive2dId] = useState("");

  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) ?? records[0], [records, selectedId]);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId) ?? null, [profiles, selectedProfileId]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [templates, selectedTemplateId]);
  const reverseAsset = useMemo(() => records.find((record) => record.id === reverseAssetId) ?? records.find(hasPreviewableImage), [records, reverseAssetId]);
  const imageToPromptTemplate = useMemo(() => templates.find((template) => template.type === "image-to-prompt"), [templates]);

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    localStorage.setItem(COMFY_STORAGE_KEY, JSON.stringify({ baseUrl: comfyBaseUrl }));
  }, [comfyBaseUrl]);

  useEffect(() => {
    setProfileDraft(selectedProfile ? profileToDraft(selectedProfile) : EMPTY_PROFILE_DRAFT);
  }, [selectedProfile?.id]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateDraft(EMPTY_TEMPLATE_DRAFT);
      return;
    }
    setTemplateDraft(templateToDraft(selectedTemplate));
    setComposerVariables((current) => Object.fromEntries(selectedTemplate.variables.map((variable) => [variable, current[variable] ?? ""])));
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (selectedProfile) {
      void loadProfileCompositions(selectedProfile.id);
    } else {
      setCompositions([]);
    }
  }, [selectedProfile?.id]);

  async function refreshAll() {
    setStatus("正在加载工作台...");
    try {
      const [nextRecords, nextLive2dModels, nextProfiles, loadedTemplates] = await Promise.all([
        listAssetRecords({ query, kind, favorite: favoriteOnly ? true : undefined, includeLoose }),
        listLive2DModels(),
        listCharacterProfiles({ query }),
        listPromptTemplates({ type: templateTypeFilter, query })
      ]);
      const nextTemplates = loadedTemplates.some((template) => template.type === "image-to-prompt")
        ? loadedTemplates
        : await ensureDefaultPromptTemplates();
      setRecords(nextRecords);
      setLive2dModels(nextLive2dModels);
      setProfiles(nextProfiles);
      setTemplates(nextTemplates);
      setSelectedId((current) => current && nextRecords.some((record) => record.id === current) ? current : nextRecords[0]?.id ?? "");
      setReverseAssetId((current) => current && nextRecords.some((record) => record.id === current) ? current : nextRecords.find(hasPreviewableImage)?.id ?? "");
      setSelectedProfileId((current) => current && nextProfiles.some((profile) => profile.id === current) ? current : nextProfiles[0]?.id ?? "");
      setSelectedTemplateId((current) => current && nextTemplates.some((template) => template.id === current) ? current : nextTemplates[0]?.id ?? "");
      setActiveLive2dId((current) => current && nextLive2dModels.some((model) => model.id === current) ? current : nextLive2dModels[0]?.id ?? "");
      setStatus(`已加载 ${nextRecords.length} 个素材、${nextProfiles.length} 个角色档案、${nextTemplates.length} 个提示词模板。`);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "工作台加载失败。");
    }
  }

  async function loadProfileCompositions(profileId: string) {
    try {
      setCompositions(await listPromptCompositions(profileId));
    } catch {
      setCompositions([]);
    }
  }

  async function refreshAssetsOnly() {
    const nextRecords = await listAssetRecords({ query, kind, favorite: favoriteOnly ? true : undefined, includeLoose });
    setRecords(nextRecords);
    setSelectedId((current) => current && nextRecords.some((record) => record.id === current) ? current : nextRecords[0]?.id ?? "");
  }

  async function handleImport() {
    if (!importFile) {
      setStatus("请先选择文件。");
      return;
    }
    setStatus("正在导入素材...");
    try {
      const record = await importAssetUpload({
        file: importFile,
        kind: importKind,
        title: importTitle || importFile.name,
        tags: importTags,
        prompt: importPrompt,
        workflow: "manual-import"
      });
      setRecords((current) => [record, ...current]);
      setSelectedId(record.id);
      setImportFile(null);
      setImportTitle("");
      setImportTags("");
      setImportPrompt("");
      setActiveTab("asset-browse");
      setStatus("素材已导入。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "素材导入失败。");
    }
  }

  async function toggleFavorite(record: AssetRecord) {
    const patched = await patchAssetRecord(record.id, { favorite: !record.favorite });
    setRecords((current) => current.map((item) => item.id === patched.id ? patched : item));
  }

  async function saveTags(record: AssetRecord, tags: string) {
    const patched = await patchAssetRecord(record.id, { tags });
    setRecords((current) => current.map((item) => item.id === patched.id ? patched : item));
  }

  async function handleExport() {
    setStatus("正在导出当前素材视图...");
    try {
      const exported = await exportAssetLibrary(records.filter((record) => !record.id.startsWith("loose-")).map((record) => record.id));
      setStatus(`已导出 ${exported.assetCount} 个素材到 ${exported.exportRootPath}`);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "素材导出失败。");
    }
  }

  async function saveProfile(mode: "create" | "update") {
    setStatus(mode === "create" ? "正在创建角色档案..." : "正在更新角色档案...");
    try {
      const profile = mode === "create" || !selectedProfile
        ? await createCharacterProfile(profileDraftToInput(profileDraft))
        : await patchCharacterProfile(selectedProfile.id, profileDraftToInput(profileDraft));
      setProfiles((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
      setSelectedProfileId(profile.id);
      setStatus(mode === "create" ? "角色档案已创建。" : "角色档案已更新。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "角色档案保存失败。");
    }
  }

  async function removeProfile() {
    if (!selectedProfile) {
      return;
    }
    setStatus("正在删除角色档案...");
    try {
      await deleteCharacterProfile(selectedProfile.id);
      setProfiles((current) => current.filter((item) => item.id !== selectedProfile.id));
      setSelectedProfileId("");
      setStatus("角色档案已删除。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "角色档案删除失败。");
    }
  }

  async function uploadReference() {
    if (!selectedProfile || !referenceFile) {
      setStatus("请选择角色档案和参考图。");
      return;
    }
    setStatus("正在上传角色参考图...");
    try {
      const profile = await uploadCharacterReferenceImage(selectedProfile.id, {
        file: referenceFile,
        kind: referenceKind,
        title: referenceTitle || referenceFile.name
      });
      setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
      setReferenceFile(null);
      setReferenceTitle("");
      await refreshAssetsOnly();
      setStatus("参考图已保存到角色档案。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "参考图上传失败。");
    }
  }

  async function linkSelectedAsset() {
    if (!selectedProfile || !selectedRecord) {
      setStatus("请先选择角色档案和素材。");
      return;
    }
    setStatus("正在关联生成结果...");
    try {
      const profile = await linkCharacterResult(selectedProfile.id, {
        assetId: selectedRecord.id,
        role: resultRole,
        promptCompositionId: compositionPreview?.id,
        notes: resultNotes
      });
      setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
      setResultNotes("");
      setStatus("素材已挂回角色档案。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "结果关联失败。");
    }
  }

  async function seedTemplates() {
    setStatus("正在加载默认提示词模板...");
    try {
      const nextTemplates = await ensureDefaultPromptTemplates();
      setTemplates(nextTemplates);
      setSelectedTemplateId((current) => current && nextTemplates.some((template) => template.id === current) ? current : nextTemplates[0]?.id ?? "");
      setStatus("默认提示词模板已准备好。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "默认模板加载失败。");
    }
  }

  async function saveTemplate(mode: "create" | "update") {
    setStatus(mode === "create" ? "正在新建提示词模板..." : "正在更新提示词模板...");
    try {
      const template = mode === "create" || !selectedTemplate
        ? await createPromptTemplate(templateDraftToInput(templateDraft))
        : await patchPromptTemplate(selectedTemplate.id, templateDraftToInput(templateDraft));
      setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
      setSelectedTemplateId(template.id);
      setStatus(mode === "create" ? "提示词模板已新建。" : "提示词模板已更新。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "提示词模板保存失败。");
    }
  }

  async function removeTemplate() {
    if (!selectedTemplate) {
      return;
    }
    setStatus("正在删除提示词模板...");
    try {
      await deletePromptTemplate(selectedTemplate.id);
      setTemplates((current) => current.filter((item) => item.id !== selectedTemplate.id));
      setSelectedTemplateId("");
      setStatus("提示词模板已删除。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "提示词模板删除失败。");
    }
  }

  async function importReverseImage() {
    if (!reverseFile) {
      setStatus("请先选择一张参考图。");
      return;
    }
    setStatus("正在导入反推参考图...");
    try {
      const record = await importAssetUpload({
        file: reverseFile,
        kind: "other",
        title: reverseTitle || reverseFile.name,
        tags: "以图反推, 参考图",
        workflow: "image-to-prompt-source"
      });
      setRecords((current) => [record, ...current]);
      setReverseAssetId(record.id);
      setSelectedId(record.id);
      setReverseFile(null);
      setReverseTitle("");
      setStatus("参考图已导入素材库。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "参考图导入失败。");
    }
  }

  function buildReversePrompt() {
    if (!imageToPromptTemplate) {
      setStatus("请先加载默认模板，或新建一个“以图反推”模板。");
      return;
    }
    const file = reverseAsset?.files.find(isImageFile);
    const imageHint = reverseAsset
      ? `参考图：${reverseAsset.title}${file?.fileName ? `（${file.fileName}）` : ""}。`
      : "参考图：我会随这段文字一起上传图片。";
    const prompt = [
      imageHint,
      renderTemplateText(imageToPromptTemplate.body, {
        analysis_focus: reverseFocus,
        output_language: reverseLanguage,
        target_use: reverseTargetUse
      })
    ].join("\n\n");
    setReversePromptPreview(prompt);
    setStatus("以图反推提示词已生成。");
  }

  async function previewPrompt(save = false) {
    if (!selectedProfile || !selectedTemplate) {
      setStatus("请选择角色档案和提示词模板。");
      return;
    }
    setStatus(save ? "正在保存组装记录..." : "正在组装提示词...");
    try {
      const composition = await composePrompt({
        characterProfileId: selectedProfile.id,
        templateId: selectedTemplate.id,
        variables: composerVariables,
        save
      });
      setCompositionPreview(composition);
      if (save) {
        setCompositions((current) => [composition, ...current.filter((item) => item.id !== composition.id)]);
      }
      setStatus(save ? "组装记录已保存。" : "提示词预览已刷新。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "提示词组装失败。");
    }
  }

  async function copyText(text: string, label: string) {
    if (!text.trim()) {
      setStatus(`${label} 为空。`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} 已复制。`);
    } catch {
      setStatus("复制失败，请手动选择预览框里的文本。");
    }
  }

  async function checkComfy() {
    setStatus("正在检查 ComfyUI...");
    const result = await getComfyUiStatus(comfyBaseUrl);
    setStatus(result.ok ? "ComfyUI 可以连接。" : result.error ?? result.message ?? "ComfyUI 尚未就绪。");
  }

  async function submitComfy() {
    setStatus("正在提交 ComfyUI 工作流...");
    try {
      const workflow = JSON.parse(comfyWorkflow) as unknown;
      const job = await createComfyUiJob({ baseUrl: comfyBaseUrl, workflow });
      setComfyJob(job);
      setStatus(`ComfyUI 任务已入队：${job.promptId}`);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "ComfyUI 提交失败。");
    }
  }

  async function refreshComfyJob() {
    if (!comfyJob) {
      return;
    }
    const job = await getComfyUiJobStatus(comfyBaseUrl, comfyJob.promptId);
    setComfyJob(job);
    setStatus(`ComfyUI 任务状态：${job.status}`);
  }

  async function addLive2dModel() {
    setStatus("正在保存 Live2D 模型...");
    try {
      const model = await createLive2DModel({
        name: live2dName || "Live2D 模型",
        modelJsonUrl: live2dModelUrl,
        previewImageUrl: live2dPreviewUrl,
        notes: "v1 lightweight Live2D record"
      });
      setLive2dModels((current) => [model, ...current]);
      setActiveLive2dId(model.id);
      setLive2dName("");
      setLive2dModelUrl("");
      setLive2dPreviewUrl("");
      setStatus("Live2D 模型已保存。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Live2D 模型保存失败。");
    }
  }

  async function uploadTexture() {
    if (!activeLive2dId || !live2dTextureFile) {
      setStatus("请选择 Live2D 模型和贴图。");
      return;
    }
    setStatus("正在上传 Live2D 贴图...");
    try {
      const model = await uploadLive2DTexture(activeLive2dId, live2dTextureFile, live2dTextureLabel);
      setLive2dModels((current) => current.map((item) => item.id === model.id ? model : item));
      setLive2dTextureFile(null);
      setLive2dTextureLabel("");
      await refreshAssetsOnly();
      setStatus("Live2D 贴图已保存并加入素材库。");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Live2D 贴图上传失败。");
    }
  }

  function openModule(nextTab: WorkbenchTab) {
    if (nextTab === "profile-create") {
      setSelectedProfileId("");
      setProfileDraft(EMPTY_PROFILE_DRAFT);
    }
    if (nextTab === "prompt-templates" && !selectedTemplateId) {
      setTemplateDraft(EMPTY_TEMPLATE_DRAFT);
    }
    setActiveTab(nextTab);
  }

  return (
    <main className="app-shell asset-library-shell">
      <aside className="asset-library-sidebar">
        <button className="nav-item" type="button" onClick={onBack}><ArrowLeft size={16} /> 返回首页</button>
        <div className="nav-brand">AI 素材工作台</div>
        <div className="asset-module-groups" role="tablist" aria-label="素材工作台功能">
          <section className="asset-module-group">
            <p>1. 素材</p>
            <button className={`asset-tab ${activeTab === "asset-import" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("asset-import")}><Upload size={16} /> 导入素材</button>
            <button className={`asset-tab ${activeTab === "asset-browse" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("asset-browse")}><Library size={16} /> 浏览素材</button>
          </section>
          <section className="asset-module-group">
            <p>2. 角色</p>
            <button className={`asset-tab ${activeTab === "profile-create" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("profile-create")}><UserRound size={16} /> 创建角色</button>
            <button className={`asset-tab ${activeTab === "profile-manage" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("profile-manage")}><Save size={16} /> 管理档案</button>
            <button className={`asset-tab ${activeTab === "profile-references" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("profile-references")}><ImagePlus size={16} /> 参考图</button>
            <button className={`asset-tab ${activeTab === "profile-results" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("profile-results")}><Heart size={16} /> 结果关联</button>
          </section>
          <section className="asset-module-group">
            <p>3. 提示词</p>
            <button className={`asset-tab ${activeTab === "prompt-templates" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("prompt-templates")}><Copy size={16} /> 模板管理</button>
            <button className={`asset-tab ${activeTab === "prompt-compose" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("prompt-compose")}><Play size={16} /> 组装提示词</button>
            <button className={`asset-tab ${activeTab === "image-to-prompt" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("image-to-prompt")}><ImagePlus size={16} /> 以图反推</button>
          </section>
          <section className="asset-module-group">
            <p>4. 接入</p>
            <button className={`asset-tab ${activeTab === "comfyui" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("comfyui")}><Box size={16} /> ComfyUI</button>
            <button className={`asset-tab ${activeTab === "live2d" ? "asset-tab-active" : ""}`} type="button" onClick={() => openModule("live2d")}><Box size={16} /> Live2D</button>
          </section>
        </div>
        <div className="toolbar asset-sidebar-actions">
          <button className="tool-button primary" type="button" onClick={() => void refreshAll()}><RefreshCw size={16} /> 刷新</button>
        </div>
      </aside>

      <section className="asset-library-main">
        <header className="tool-header asset-library-header">
          <div>
            <p className="eyebrow">本地素材、角色档案与可复用提示词</p>
            <h1>{getModuleTitle(activeTab)}</h1>
          </div>
          <p className="state-pill">{status || "就绪"}</p>
        </header>

        {renderActiveModule()}
      </section>
    </main>
  );

  function renderActiveModule() {
    switch (activeTab) {
      case "asset-import":
        return renderAssetImportModule();
      case "asset-browse":
        return renderAssetBrowseModule();
      case "profile-create":
        return renderProfileCreateModule();
      case "profile-manage":
        return renderProfileManageModule();
      case "profile-references":
        return renderProfileReferencesModule();
      case "profile-results":
        return renderProfileResultsModule();
      case "prompt-templates":
        return renderPromptTemplatesModule();
      case "prompt-compose":
        return renderPromptComposeModule();
      case "image-to-prompt":
        return renderImageToPromptModule();
      case "comfyui":
        return renderComfyUiModule();
      case "live2d":
        return renderLive2dModule();
      default:
        return null;
    }
  }

  function renderAssetImportModule() {
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-import-panel asset-workbench-panel">
          <div className="stage-heading"><h2>导入素材</h2><span>{importFile?.name ?? "PNG / WebP / MP4 / JSON"}</span></div>
          <div className="form-grid">
            <label className="field">类型<select value={importKind} onChange={(event) => setImportKind(event.target.value as AssetKind)}>{ASSET_KINDS.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <DraftField label="标题" value={importTitle} onChange={setImportTitle} />
            <DraftField label="标签" value={importTags} onChange={setImportTags} />
          </div>
          <label className="field">提示词<textarea rows={5} value={importPrompt} onChange={(event) => setImportPrompt(event.target.value)} /></label>
          <div className="toolbar">
            <label className="file-picker"><Upload size={16} /> 选择文件<input className="visually-hidden" type="file" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} /></label>
            <button className="tool-button primary" type="button" onClick={() => void handleImport()}><ImagePlus size={16} /> 导入素材</button>
          </div>
        </section>
      </div>
    );
  }

  function renderAssetBrowseModule() {
    return (
      <div className="module-page asset-browser-layout">
        <section className="workflow-stage asset-workbench-panel module-filter-panel">
          <div className="stage-heading"><h2>浏览素材</h2><span>{records.length} 个素材</span></div>
          <div className="form-grid">
            <label className="field">搜索<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="field">类型<select value={kind} onChange={(event) => setKind(event.target.value as AssetKind | "")}>{ASSET_KINDS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <div className="module-filter-row">
            <label className="toggle-field"><input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} />只看收藏</label>
            <label className="toggle-field"><input type="checkbox" checked={includeLoose} onChange={(event) => setIncludeLoose(event.target.checked)} />包含散落文件</label>
          </div>
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={() => void refreshAssetsOnly()}><RefreshCw size={16} /> 应用筛选</button>
            <button className="tool-button" type="button" onClick={() => void handleExport()}><Download size={16} /> 导出当前结果</button>
          </div>
        </section>

        <section className="asset-grid module-asset-grid" aria-label="素材记录">
          {records.map((record) => (
            <button className={`asset-card ${selectedRecord?.id === record.id ? "asset-card-active" : ""}`} key={record.id} type="button" onClick={() => setSelectedId(record.id)}>
              <AssetPreview record={record} />
              <span className="asset-card-title">{record.title}</span>
              <span className="asset-card-meta">{getAssetKindLabel(record.kind)} {record.favorite ? "已收藏" : ""}</span>
            </button>
          ))}
          {records.length === 0 ? <div className="empty-panel">暂无素材</div> : null}
        </section>

        <section className="asset-browser-detail">
          {selectedRecord ? (
            <AssetDetails record={selectedRecord} onFavorite={() => void toggleFavorite(selectedRecord)} onSaveTags={(tags) => void saveTags(selectedRecord, tags)} />
          ) : (
            <div className="workflow-stage asset-workbench-panel"><div className="empty-panel">暂无选中素材</div></div>
          )}
        </section>
      </div>
    );
  }

  function renderProfileCreateModule() {
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-workbench-panel profile-editor-panel">
          <div className="stage-heading"><h2>创建角色</h2><span>基础人设与复用锚点</span></div>
          <ProfileFormFields draft={profileDraft} onChange={setProfileDraft} />
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={() => void saveProfile("create")}><UserRound size={16} /> 保存为角色档案</button>
            <button className="tool-button" type="button" onClick={() => setProfileDraft(EMPTY_PROFILE_DRAFT)}><RefreshCw size={16} /> 清空草稿</button>
          </div>
        </section>
      </div>
    );
  }

  function renderProfileManageModule() {
    return (
      <div className="module-page list-editor-layout">
        <section className="workflow-stage asset-workbench-panel profile-list-panel">
          <div className="stage-heading"><h2>角色列表</h2><span>{profiles.length} 个角色</span></div>
          <div className="profile-list">
            {profiles.map((profile) => (
              <button key={profile.id} className={`profile-list-item ${selectedProfile?.id === profile.id ? "profile-list-item-active" : ""}`} type="button" onClick={() => setSelectedProfileId(profile.id)}>
                <strong>{profile.name}</strong><span>{profile.summary || profile.appearanceAnchor || "暂无简介"}</span>
              </button>
            ))}
            {profiles.length === 0 ? <div className="empty-panel">暂无角色档案</div> : null}
          </div>
        </section>

        <section className="workflow-stage asset-workbench-panel profile-editor-panel">
          <div className="stage-heading"><h2>{selectedProfile ? selectedProfile.name : "选择角色"}</h2><span>档案正文</span></div>
          {selectedProfile ? (
            <>
              <ProfileFormFields draft={profileDraft} onChange={setProfileDraft} />
              <div className="toolbar">
                <button className="tool-button primary" type="button" onClick={() => void saveProfile("update")}><Save size={16} /> 更新档案</button>
                <button className="tool-button danger" type="button" onClick={() => void removeProfile()}><Trash2 size={16} /> 删除</button>
              </div>
            </>
          ) : <div className="empty-panel">暂无选中角色</div>}
        </section>
      </div>
    );
  }

  function renderProfileReferencesModule() {
    return (
      <div className="module-page list-editor-layout">
        <section className="workflow-stage asset-workbench-panel profile-list-panel">
          <div className="stage-heading"><h2>选择角色</h2><span>{profiles.length} 个角色</span></div>
          <div className="profile-list">
            {profiles.map((profile) => (
              <button key={profile.id} className={`profile-list-item ${selectedProfile?.id === profile.id ? "profile-list-item-active" : ""}`} type="button" onClick={() => setSelectedProfileId(profile.id)}>
                <strong>{profile.name}</strong><span>{profile.summary || profile.appearanceAnchor || "暂无简介"}</span>
              </button>
            ))}
            {profiles.length === 0 ? <div className="empty-panel">暂无角色档案</div> : null}
          </div>
        </section>

        <section className="workflow-stage asset-workbench-panel">
          <div className="stage-heading"><h2>参考图</h2><span>{selectedProfile?.referenceImages.length ?? 0} 张</span></div>
          {selectedProfile ? (
            <>
              <div className="form-grid">
                <label className="field">类型<select value={referenceKind} onChange={(event) => setReferenceKind(event.target.value as CharacterReferenceKind)}>{REFERENCE_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <DraftField label="标题" value={referenceTitle} onChange={setReferenceTitle} />
              </div>
              <div className="toolbar">
                <label className="file-picker"><Upload size={16} /> 选择参考图<input className="visually-hidden" type="file" accept="image/*" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label>
                <button className="tool-button primary" type="button" disabled={!referenceFile} onClick={() => void uploadReference()}><ImagePlus size={16} /> 保存参考图</button>
              </div>
              <div className="reference-grid">
                {selectedProfile.referenceImages.map((image) => (
                  <figure key={image.id} className="reference-card">
                    <img src={toAbsoluteApiUrl(image.localUrl ?? image.publicUrl ?? "")} alt="" />
                    <figcaption>{image.title}<span>{getReferenceKindLabel(image.kind)}</span></figcaption>
                  </figure>
                ))}
                {selectedProfile.referenceImages.length === 0 ? <div className="empty-panel">暂无参考图</div> : null}
              </div>
            </>
          ) : <div className="empty-panel">暂无选中角色</div>}
        </section>
      </div>
    );
  }

  function renderProfileResultsModule() {
    return (
      <div className="module-page list-editor-layout">
        <section className="workflow-stage asset-workbench-panel profile-list-panel">
          <div className="stage-heading"><h2>选择角色</h2><span>{profiles.length} 个角色</span></div>
          <div className="profile-list">
            {profiles.map((profile) => (
              <button key={profile.id} className={`profile-list-item ${selectedProfile?.id === profile.id ? "profile-list-item-active" : ""}`} type="button" onClick={() => setSelectedProfileId(profile.id)}>
                <strong>{profile.name}</strong><span>{profile.summary || profile.appearanceAnchor || "暂无简介"}</span>
              </button>
            ))}
            {profiles.length === 0 ? <div className="empty-panel">暂无角色档案</div> : null}
          </div>
        </section>

        <section className="workflow-stage asset-workbench-panel">
          <div className="stage-heading"><h2>生成结果</h2><span>{selectedProfile?.resultLinks.length ?? 0} 条关联</span></div>
          {selectedProfile ? (
            <>
              <label className="field">选择素材<select value={selectedRecord?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}><option value="">选择素材</option>{records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
              <div className="form-grid">
                <label className="field">角色用途<select value={resultRole} onChange={(event) => setResultRole(event.target.value as CharacterResultRole)}>{RESULT_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                <DraftField label="备注" value={resultNotes} onChange={setResultNotes} />
              </div>
              <button className="tool-button primary" type="button" disabled={!selectedRecord} onClick={() => void linkSelectedAsset()}><Save size={16} /> 关联素材</button>
              <div className="result-link-list">
                {selectedProfile.resultLinks.map((link) => (
                  <div key={link.id} className="result-link-row"><strong>{getResultRoleLabel(link.role)}</strong><span>{findAssetTitle(records, link.assetId) ?? link.file?.fileName ?? "已关联文件"}</span></div>
                ))}
                {selectedProfile.resultLinks.length === 0 ? <div className="empty-panel">暂无生成结果</div> : null}
              </div>
            </>
          ) : <div className="empty-panel">暂无选中角色</div>}
        </section>
      </div>
    );
  }

  function renderPromptTemplatesModule() {
    return (
      <div className="module-page list-editor-layout">
        <section className="workflow-stage asset-workbench-panel template-list-panel">
          <div className="stage-heading"><h2>模板列表</h2><span>{templates.length} 个模板</span></div>
          <div className="form-grid">
            <label className="field">搜索<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="field">模板类型<select value={templateTypeFilter} onChange={(event) => setTemplateTypeFilter(event.target.value as PromptTemplateType | "")}>{PROMPT_TEMPLATE_TYPES.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={() => void seedTemplates()}><Library size={16} /> 默认模板</button>
            <button className="tool-button" type="button" onClick={() => void refreshAll()}><RefreshCw size={16} /> 应用筛选</button>
          </div>
          <div className="template-list">
            {templates.map((template) => (
              <button key={template.id} className={`template-list-item ${selectedTemplate?.id === template.id ? "template-list-item-active" : ""}`} type="button" onClick={() => setSelectedTemplateId(template.id)}>
                <strong>{template.name}</strong><span>{getPromptTypeLabel(template.type)} · {template.variables.join(", ") || "无变量"}</span>
              </button>
            ))}
            {templates.length === 0 ? <div className="empty-panel">暂无模板</div> : null}
          </div>
        </section>

        <section className="workflow-stage asset-workbench-panel template-editor-panel">
          <div className="stage-heading"><h2>{selectedTemplate ? selectedTemplate.name : "新建模板"}</h2><span>变量格式 {"{name}"}</span></div>
          <TemplateFormFields draft={templateDraft} onChange={setTemplateDraft} />
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={() => void saveTemplate("create")}><Copy size={16} /> 新建模板</button>
            <button className="tool-button" type="button" disabled={!selectedTemplate} onClick={() => void saveTemplate("update")}><Save size={16} /> 更新模板</button>
            <button className="tool-button danger" type="button" disabled={!selectedTemplate} onClick={() => void removeTemplate()}><Trash2 size={16} /> 删除</button>
          </div>
        </section>
      </div>
    );
  }

  function renderPromptComposeModule() {
    const customVariables = selectedTemplate?.variables.filter((variable) => !SYSTEM_VARIABLES.has(variable)) ?? [];
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-workbench-panel composer-panel">
          <div className="stage-heading"><h2>组装提示词</h2><span>复制到网页端生图工具</span></div>
          <div className="form-grid">
            <label className="field">角色<select value={selectedProfile?.id ?? ""} onChange={(event) => setSelectedProfileId(event.target.value)}><option value="">选择角色</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
            <label className="field">模板<select value={selectedTemplate?.id ?? ""} onChange={(event) => setSelectedTemplateId(event.target.value)}><option value="">选择模板</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          </div>
          <div className="composer-variable-grid">
            {customVariables.map((variable) => (
              <label className="field" key={variable}>{variable}<input value={composerVariables[variable] ?? ""} onChange={(event) => setComposerVariables({ ...composerVariables, [variable]: event.target.value })} /></label>
            ))}
            {customVariables.length === 0 ? <div className="empty-panel">该模板只使用已保存的角色字段</div> : null}
          </div>
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={() => void previewPrompt(false)}><Play size={16} /> 预览</button>
            <button className="tool-button" type="button" onClick={() => void previewPrompt(true)}><Save size={16} /> 保存记录</button>
            <button className="tool-button" type="button" onClick={() => void copyText(compositionPreview?.positivePrompt ?? "", "正向提示词")}><Copy size={16} /> 复制正向</button>
            <button className="tool-button" type="button" onClick={() => void copyText(compositionPreview?.negativePrompt ?? "", "负面提示词")}><Copy size={16} /> 复制负面</button>
          </div>
          <label className="field">正向提示词<textarea readOnly rows={8} value={compositionPreview?.positivePrompt ?? ""} /></label>
          <label className="field">负面提示词<textarea readOnly rows={4} value={compositionPreview?.negativePrompt ?? ""} /></label>
          <div className="composition-list">
            {compositions.map((composition) => (
              <div className="composition-row" key={composition.id}><strong>{new Date(composition.createdAt).toLocaleString()}</strong><span>{composition.positivePrompt}</span></div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderImageToPromptModule() {
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-workbench-panel reverse-prompt-panel">
          <div className="stage-heading"><h2>以图反推提示词</h2><span>{reverseAsset?.title ?? "选择或上传参考图"}</span></div>
          <div className="reverse-preview-row">
            {reverseAsset ? <AssetPreview record={reverseAsset} /> : <div className="asset-preview"><ImagePlus size={28} /></div>}
            <div className="reverse-upload-stack">
              <label className="field">参考图<select value={reverseAsset?.id ?? ""} onChange={(event) => setReverseAssetId(event.target.value)}><option value="">选择素材</option>{records.filter(hasPreviewableImage).map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
              <DraftField label="导入标题" value={reverseTitle} onChange={setReverseTitle} />
              <div className="toolbar">
                <label className="file-picker"><Upload size={16} /> 上传图片<input className="visually-hidden" type="file" accept="image/*" onChange={(event) => setReverseFile(event.target.files?.[0] ?? null)} /></label>
                <button className="tool-button" type="button" onClick={() => void importReverseImage()}>导入</button>
              </div>
            </div>
          </div>
          <ProfileTextarea label="分析重点" value={reverseFocus} rows={2} onChange={setReverseFocus} />
          <div className="form-grid">
            <DraftField label="输出语言" value={reverseLanguage} onChange={setReverseLanguage} />
            <DraftField label="目标用途" value={reverseTargetUse} onChange={setReverseTargetUse} />
          </div>
          <div className="toolbar">
            <button className="tool-button primary" type="button" onClick={buildReversePrompt}><Play size={16} /> 生成反推提示词</button>
            <button className="tool-button" type="button" onClick={() => void copyText(reversePromptPreview, "以图反推提示词")}><Copy size={16} /> 复制</button>
          </div>
          <label className="field">反推提示词<textarea readOnly rows={7} value={reversePromptPreview} /></label>
        </section>
      </div>
    );
  }

  function renderComfyUiModule() {
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-workbench-panel integration-panel">
          <div className="stage-heading"><h2>ComfyUI 接入</h2><span>{comfyJob?.promptId ?? "可选本地后端"}</span></div>
          <label className="field">服务地址<input value={comfyBaseUrl} onChange={(event) => setComfyBaseUrl(event.target.value)} placeholder="http://127.0.0.1:8188" /></label>
          <label className="field">工作流 JSON<textarea rows={10} value={comfyWorkflow} onChange={(event) => setComfyWorkflow(event.target.value)} /></label>
          <div className="toolbar">
            <button className="tool-button" type="button" onClick={() => void checkComfy()}><RefreshCw size={16} /> 检查连接</button>
            <button className="tool-button primary" type="button" onClick={() => void submitComfy()}><Play size={16} /> 提交工作流</button>
            <button className="tool-button" type="button" disabled={!comfyJob} onClick={() => void refreshComfyJob()}>查看状态</button>
          </div>
        </section>
      </div>
    );
  }

  function renderLive2dModule() {
    return (
      <div className="module-page single-module-page">
        <section className="workflow-stage asset-workbench-panel integration-panel">
          <div className="stage-heading"><h2>Live2D 轻集成</h2><span>{live2dModels.length} 个模型</span></div>
          <div className="form-grid">
            <DraftField label="名称" value={live2dName} onChange={setLive2dName} />
            <DraftField label="model.json URL" value={live2dModelUrl} onChange={setLive2dModelUrl} />
            <DraftField label="预览图 URL" value={live2dPreviewUrl} onChange={setLive2dPreviewUrl} />
          </div>
          <button className="tool-button primary" type="button" onClick={() => void addLive2dModel()}><Box size={16} /> 保存模型</button>
          <div className="form-grid">
            <label className="field">模型<select value={activeLive2dId} onChange={(event) => setActiveLive2dId(event.target.value)}><option value="">选择</option>{live2dModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
            <DraftField label="贴图标签" value={live2dTextureLabel} onChange={setLive2dTextureLabel} />
          </div>
          <div className="toolbar">
            <label className="file-picker"><Upload size={16} /> 选择贴图<input className="visually-hidden" type="file" accept="image/*" onChange={(event) => setLive2dTextureFile(event.target.files?.[0] ?? null)} /></label>
            <button className="tool-button" type="button" onClick={() => void uploadTexture()}>上传贴图</button>
          </div>
          <div className="live2d-model-list">
            {live2dModels.map((model) => (
              <div className="live2d-model-row" key={model.id}>
                {model.previewImageUrl ? <img src={toAbsoluteApiUrl(model.previewImageUrl)} alt="" /> : <Box size={28} />}
                <div><strong>{model.name}</strong><span>{model.textures.length} 张贴图</span></div>
              </div>
            ))}
            {live2dModels.length === 0 ? <div className="empty-panel">暂无 Live2D 模型</div> : null}
          </div>
        </section>
      </div>
    );
  }

}

function AssetDetails({ record, onFavorite, onSaveTags }: {
  record: AssetRecord;
  onFavorite: () => void;
  onSaveTags: (tags: string) => void;
}) {
  const [tags, setTags] = useState(record.tags.join(", "));

  useEffect(() => {
    setTags(record.tags.join(", "));
  }, [record.id, record.tags]);

  return (
    <section className="workflow-stage asset-detail-panel asset-workbench-panel">
      <div className="stage-heading"><h2>{record.title}</h2><span>{getAssetKindLabel(record.kind)}</span></div>
      <div className="asset-detail-preview"><AssetPreview record={record} large /></div>
      <div className="toolbar"><button className={`tool-button ${record.favorite ? "primary" : ""}`} type="button" onClick={onFavorite}><Heart size={16} /> 收藏</button></div>
      <div className="form-grid">
        <label className="field">标签<input value={tags} onChange={(event) => setTags(event.target.value)} onBlur={() => onSaveTags(tags)} /></label>
        <label className="field">服务商<input readOnly value={record.provider ?? ""} /></label>
        <label className="field">模型<input readOnly value={record.model ?? ""} /></label>
        <label className="field">工作流<input readOnly value={record.workflow ?? ""} /></label>
      </div>
      <label className="field">提示词<textarea readOnly rows={4} value={record.prompt ?? ""} /></label>
      <div className="asset-file-list">
        {record.files.map((file, index) => (
          <a key={`${file.localUrl ?? file.publicUrl ?? index}`} href={toAbsoluteApiUrl(file.localUrl ?? file.publicUrl ?? "")} target="_blank" rel="noreferrer">
            {file.label ?? file.fileName ?? `文件 ${index + 1}`}
          </a>
        ))}
      </div>
    </section>
  );
}

function AssetPreview({ record, large = false }: { record: AssetRecord; large?: boolean }) {
  const file = record.files[0];
  const url = file?.localUrl ?? file?.publicUrl;
  if (!url) {
    return <div className={`asset-preview ${large ? "asset-preview-large" : ""}`}><Box size={large ? 42 : 24} /></div>;
  }
  const absolute = toAbsoluteApiUrl(url);
  const isVideo = file?.mimeType?.startsWith("video/") || /\.(mp4|webm)$/i.test(url);
  return <div className={`asset-preview ${large ? "asset-preview-large" : ""}`}>{isVideo ? <video src={absolute} muted loop playsInline /> : <img src={absolute} alt="" />}</div>;
}

function DraftField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field">{label}<input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ProfileTextarea({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return <label className="field">{label}<textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ProfileFormFields({ draft, onChange }: { draft: CharacterProfileDraft; onChange: (draft: CharacterProfileDraft) => void }) {
  return (
    <>
      <div className="form-grid">
        <DraftField label="名称" value={draft.name} onChange={(value) => onChange({ ...draft, name: value })} />
        <DraftField label="标签" value={draft.tags} onChange={(value) => onChange({ ...draft, tags: value })} />
        <DraftField label="性格关键词" value={draft.personalityKeywords} onChange={(value) => onChange({ ...draft, personalityKeywords: value })} />
        <DraftField label="默认画风" value={draft.defaultStyle} onChange={(value) => onChange({ ...draft, defaultStyle: value })} />
      </div>
      <ProfileTextarea label="简介" value={draft.summary} onChange={(value) => onChange({ ...draft, summary: value })} rows={2} />
      <ProfileTextarea label="基础人设" value={draft.basePersona} onChange={(value) => onChange({ ...draft, basePersona: value })} rows={3} />
      <ProfileTextarea label="外貌锚点" value={draft.appearanceAnchor} onChange={(value) => onChange({ ...draft, appearanceAnchor: value })} rows={3} />
      <ProfileTextarea label="服装基准" value={draft.outfitAnchor} onChange={(value) => onChange({ ...draft, outfitAnchor: value })} rows={2} />
      <ProfileTextarea label="常用负面提示词" value={draft.negativePrompt} onChange={(value) => onChange({ ...draft, negativePrompt: value })} rows={2} />
      <ProfileTextarea label="备注" value={draft.notes} onChange={(value) => onChange({ ...draft, notes: value })} rows={2} />
    </>
  );
}

function TemplateFormFields({ draft, onChange }: { draft: PromptTemplateDraft; onChange: (draft: PromptTemplateDraft) => void }) {
  return (
    <>
      <div className="form-grid">
        <DraftField label="名称" value={draft.name} onChange={(value) => onChange({ ...draft, name: value })} />
        <label className="field">类型<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as PromptTemplateType })}>{PROMPT_TEMPLATE_TYPES.filter((type) => type.value).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <DraftField label="变量" value={draft.variables} onChange={(value) => onChange({ ...draft, variables: value })} />
        <DraftField label="标签" value={draft.tags} onChange={(value) => onChange({ ...draft, tags: value })} />
      </div>
      <ProfileTextarea label="正向模板" value={draft.body} rows={6} onChange={(value) => onChange({ ...draft, body: value })} />
      <ProfileTextarea label="负面模板" value={draft.negativeBody} rows={3} onChange={(value) => onChange({ ...draft, negativeBody: value })} />
      <ProfileTextarea label="用途" value={draft.useCase} rows={2} onChange={(value) => onChange({ ...draft, useCase: value })} />
    </>
  );
}

function getModuleTitle(tab: WorkbenchTab): string {
  switch (tab) {
    case "asset-import":
      return "导入素材";
    case "asset-browse":
      return "浏览素材";
    case "profile-create":
      return "创建角色";
    case "profile-manage":
      return "管理档案";
    case "profile-references":
      return "参考图";
    case "profile-results":
      return "结果关联";
    case "prompt-templates":
      return "模板管理";
    case "prompt-compose":
      return "组装提示词";
    case "image-to-prompt":
      return "以图反推";
    case "comfyui":
      return "ComfyUI";
    case "live2d":
      return "Live2D";
    default:
      return "素材库";
  }
}

function profileToDraft(profile: CharacterProfile): CharacterProfileDraft {
  return {
    name: profile.name,
    summary: profile.summary ?? "",
    basePersona: profile.basePersona ?? "",
    appearanceAnchor: profile.appearanceAnchor ?? "",
    outfitAnchor: profile.outfitAnchor ?? "",
    defaultStyle: profile.defaultStyle ?? "",
    personalityKeywords: profile.personalityKeywords.join(", "),
    negativePrompt: profile.negativePrompt ?? "",
    tags: profile.tags.join(", "),
    notes: profile.notes ?? ""
  };
}

function profileDraftToInput(draft: CharacterProfileDraft) {
  return {
    name: draft.name,
    summary: draft.summary,
    basePersona: draft.basePersona,
    appearanceAnchor: draft.appearanceAnchor,
    outfitAnchor: draft.outfitAnchor,
    defaultStyle: draft.defaultStyle,
    personalityKeywords: draft.personalityKeywords,
    negativePrompt: draft.negativePrompt,
    tags: draft.tags,
    notes: draft.notes
  };
}

function templateToDraft(template: PromptTemplate): PromptTemplateDraft {
  return {
    name: template.name,
    type: template.type,
    body: template.body,
    negativeBody: template.negativeBody ?? "",
    variables: template.variables.join(", "),
    tags: template.tags.join(", "),
    useCase: template.useCase ?? ""
  };
}

function templateDraftToInput(draft: PromptTemplateDraft) {
  return {
    name: draft.name,
    type: draft.type,
    body: draft.body,
    negativeBody: draft.negativeBody,
    variables: draft.variables,
    tags: draft.tags,
    useCase: draft.useCase
  };
}

function findAssetTitle(records: AssetRecord[], assetId: string | undefined): string | undefined {
  return assetId ? records.find((record) => record.id === assetId)?.title : undefined;
}

function hasPreviewableImage(record: AssetRecord): boolean {
  return record.files.some(isImageFile);
}

function isImageFile(file: AssetRecord["files"][number]): boolean {
  const url = file.localUrl ?? file.publicUrl ?? file.fileName ?? "";
  return Boolean(file.mimeType?.startsWith("image/")) || /\.(png|jpe?g|webp|gif)$/i.test(url);
}

function renderTemplateText(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => variables[key] ?? match);
}

function getAssetKindLabel(kind: AssetKind): string {
  return ASSET_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

function getPromptTypeLabel(type: PromptTemplateType): string {
  return PROMPT_TEMPLATE_TYPES.find((item) => item.value === type)?.label ?? type;
}

function getReferenceKindLabel(kind: CharacterReferenceKind): string {
  return REFERENCE_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

function getResultRoleLabel(role: CharacterResultRole): string {
  return RESULT_ROLES.find((item) => item.value === role)?.label ?? role;
}

function loadComfyBaseUrl(): string {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMFY_STORAGE_KEY) ?? "{}") as { baseUrl?: string };
    return parsed.baseUrl ?? "http://127.0.0.1:8188";
  } catch {
    return "http://127.0.0.1:8188";
  }
}
