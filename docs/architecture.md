# Kerno 架构设计说明（Phase 1）

## 1. Axiom Design System 架构调研与借鉴结论

在第一阶段对 `ax-design`（Axiom Design System）进行了梳理，提炼出以下值得在 Kerno 中吸收与独立实现的核心机制：

### 1.1 表面与图层合成（`ax-surface` → 规划中的 `@kerno/effects`）

- **核心思路**：Axiom 将几何外形（Shape）、材质（Acrylic）、动态光照（Reveal Highlight）、空间阴影（Elevation）与按压反馈（Pressure/Tilt）解耦为可组合的渲染层（Layers），由统一的表面容器协调 Canvas 绘制与帧率调度。
- **性能与降级机制**：通过 `IntersectionObserver` / `ResizeObserver` 监控可见性与尺寸，对屏外或微小组件暂停重绘；在低帧率、节能模式或 `prefers-reduced-transparency` / `prefers-reduced-motion` 下自动回退至纯色或静态边框。
- **Kerno 落地方式**：
  - 在第一阶段的 `@kerno/tokens` 中已预留 `surface.acrylic`（`tint`、`tintOpacity`、`blur`、`saturation`、`noiseOpacity`、`fallback`）与 `surface.reveal`（`color`、`borderColor`、`size`）语义令牌。
  - 在 `@kerno/core` 中内建了 `ReactiveController` 协议（`hostConnected` / `hostDisconnected` / `hostUpdate` / `hostUpdated`），第二阶段可将 Reveal、Pressure、Surface 等视觉能力封装为独立 Controller 或包装容器，做到「视觉效果与组件业务逻辑解耦、可独立开关或替换」。

### 1.2 类型化 CSS 属性（`@ax-design/typed-om` 思路）

- **核心思路**：通过 CSS Custom Properties 作为跨 Shadow DOM 的样式通道，并在需要 Canvas 渲染时将其解析为强类型的 JS 数值/颜色对象。
- **Kerno 落地方式**：
  - 第一阶段采用「TypeScript 单一数据源 → 生成静态 `tokens.css` + 类型安全的 `token('color.accent.default')` 引用」方案，编译期通过 `TokenPath` 联合类型杜绝拼写错误，运行时零体积开销。
  - 第二阶段进入 Canvas Surface 渲染时，将基于现有的 `tokenName()` 映射按需读取计算样式并监听主题变更。

### 1.3 原生 Web Components 标准实践

- 全面采用 Open Shadow DOM、`adoptedStyleSheets` 共享样式表、`::part()` 暴露内部结构节点、`slot` 插槽扩展、`ElementInternals` 原生表单关联与 `delegatesFocus` 焦点委托。

---

## 2. Monorepo 与分层结构

```text
kerno/
├── packages/
│   ├── tokens/       # @kerno/tokens — 设计令牌、明暗主题与自定义主题引擎
│   ├── core/         # @kerno/core   — KernoElement 基类、TC39 装饰器、注册、事件、表单与焦点管理
│   └── primitives/   # @kerno/primitives — 基础控件（当前含 k-button）
└── apps/
    └── playground/   # Vite 交互预览与验证环境
```

### 2.1 `@kerno/tokens`

- **两层令牌架构**：
  - **Primitive（`palette.ts`）**：中性色与功能色阶原始值，输出为 `--k-palette-*`，组件不直接引用。
  - **Semantic（`types.ts` / `themes/*.ts`）**：`color`、`font`、`spacing`、`radius`、`elevation`、`motion`、`surface`、`zIndex`、`control`、`focus` 十大语义分组，输出为 `--k-*`。
- **主题切换与嵌套**：
  - 内置 `light`、`dark`、`auto`（默认跟随系统 `prefers-color-scheme`，仅覆盖与配色相关的语义变量 diff）。
  - 任意 DOM 节点或 ShadowRoot 内部可通过 `data-k-theme="light|dark|auto|<custom>"` 实现局部主题嵌套。
  - 提供 `createTheme({ name, base, tokens })` 与 `applyTheme(theme, target)`，通过 `adoptedStyleSheets` 动态注入自定义主题，并返回还原函数。

### 2.2 `@kerno/core`

- **`KernoElement`**：零第三方运行时依赖的轻量基类。
  - **单次模板克隆 + 定向更新**：`static template` 在每个类上仅解析一次 `<template>`，实例挂载时克隆；若检测到 SSR Declarative Shadow DOM（`this.internals.shadowRoot`）则直接复用。
  - **微任务批量更新**：属性变更在微任务中合并，按 `willUpdate` → 属性反射（`reflect`）→ `update` → `firstUpdated` → `updated` 生命周期执行。
  - **TC39 标准装饰器**：`@prop({ type, attribute, reflect, converter, hasChanged })` 与 `@state()`，基于 `Symbol.metadata` 自动推导 `observedAttributes` 并处理升级前属性（property upgrade）。
  - **共享样式表**：`css` 标签模板生成 `KernoCSS`，利用 `adoptedStyleSheets` 在所有实例间共享同一份解析后的 `CSSStyleSheet`。
- **`FormAssociatedElement`**：封装 `ElementInternals`，提供 `name`、`disabled`（自动合并祖先 `<fieldset disabled>` 的 `formDisabledCallback`）以及原生效验属性代理。
- **按需与幂等注册（`define`）**：
  - 每个组件拆分「纯类导出（无副作用）」与「`/define` 自动注册入口」。
  - `define(tagName, Ctor)` 在 SSR 下安全跳过；同标签同类重复调用幂等；同标签异类冲突告警不崩溃；同一类注册到不同标签名时自动派生轻量子类以支持别名与多版本共存。
- **事件与焦点工具**：`emit()` 统一派发 `bubbles: true, composed: true` 的自定义事件；`getTabbableElements()` 与 `getActiveElement()` 支持穿透 Shadow DOM 与 `<slot>`。

### 2.3 `@kerno/primitives` — `<k-button>`

- **标签名**：`k-button`（类 `KButton`）。
- **属性**：`variant`（`'standard' | 'accent' | 'subtle'`）、`size`（`'sm' | 'md' | 'lg'`）、`type`（`'button' | 'submit' | 'reset'`）、`name`、`value`、`disabled`。
- **语义与无障碍**：ShadowRoot 开启 `delegatesFocus: true`，内部使用原生 `<button>` 承载焦点与键盘交互（`Enter` / `Space`），支持 `forced-colors: active` 高对比度模式。
- **表单关联**：继承 `FormAssociatedElement`，支持触发原生表单校验、携带 `name=value` 提交以及重置表单。
- **定制化接口**：
  - Slots：`prefix`、默认插槽、`suffix`（空插槽自动隐藏容器，不产生多余间距）。
  - CSS Parts：`base`、`prefix`、`label`、`suffix`。
  - 组件级 CSS 变量：`--k-button-height`、`--k-button-padding-x`、`--k-button-gap`、`--k-button-radius`、`--k-button-font-size`、`--k-button-font-weight`、`--k-button-bg`、`--k-button-bg-hover`、`--k-button-bg-active`、`--k-button-fg`、`--k-button-border-color`。
