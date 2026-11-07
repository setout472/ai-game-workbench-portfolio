import { Archive, Film, ImagePlus, Settings } from "lucide-react";

interface WorkbenchHubProps {
  onOpenAssetLibrary: () => void;
  onOpenApiSettings: () => void;
  onOpenPixelSpriteGenerator: () => void;
  onOpenSpriteAnimator: () => void;
}

export function WorkbenchHub({
  onOpenAssetLibrary,
  onOpenApiSettings,
  onOpenPixelSpriteGenerator,
  onOpenSpriteAnimator
}: WorkbenchHubProps) {
  return (
    <main className="app-shell hub-shell">
      <section className="hub-hero">
        <div>
          <p className="eyebrow">Open-source game asset workbench</p>
          <h1>AI 游戏工作台</h1>
          <p className="hub-copy">
            用紧凑的 AI 工作流、本地后处理和面向引擎的导出方式，制作可收藏、分享和投入游戏管线的 2D 素材。
          </p>
        </div>
      </section>

      <section className="module-grid" aria-label="工作台模块">
        <button className="module-card module-card-active" type="button" onClick={onOpenAssetLibrary}>
          <span className="module-icon"><Archive size={28} /></span>
          <span className="module-title">素材库</span>
          <span className="module-desc">统一管理高清角色、像素素材、背景、道具、Live2D 贴图、提示词和导出包。</span>
        </button>

        <button className="module-card module-card-active" type="button" onClick={onOpenSpriteAnimator}>
          <span className="module-icon"><Film size={28} /></span>
          <span className="module-title">模块 01：高清2D角色制作</span>
          <span className="module-desc">生成角色基准模板、四方向图、步行动画和循环精灵帧。</span>
        </button>

        <button className="module-card module-card-active" type="button" onClick={onOpenPixelSpriteGenerator}>
          <span className="module-icon"><ImagePlus size={28} /></span>
          <span className="module-title">模块 02：像素角色制作</span>
          <span className="module-desc">生成像素角色基准模板、待机和四方向步行 sprite sheet，并切分 idle / walk 精灵帧。</span>
        </button>

        <button className="module-card module-card-active" type="button" onClick={onOpenApiSettings}>
          <span className="module-icon"><Settings size={28} /></span>
          <span className="module-title">API Settings</span>
          <span className="module-desc">管理全局服务商、API key、模型白名单和默认生成模型。</span>
        </button>
      </section>
    </main>
  );
}
