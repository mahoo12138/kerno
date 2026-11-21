# Kerno 测试、包体积分析与发版流水线指南

本文档说明 Kerno Monorepo 的质量门禁、包体积分析与 npm 发版流程。

---

## 1. 单元测试与质量门禁

所有组件与基础原语测试均在真实 **Playwright Chromium** 浏览器环境中运行（支持 Shadow DOM、`ElementInternals`、`FormData`、Popover Top Layer、ResizeObserver 与真实样式计算）：

```bash
# 全量门禁：构建 + 类型检查 + ESLint + Prettier + 全量 Chromium 浏览器测试
pnpm check

# 仅运行单元测试（监听模式）
pnpm test:watch
```

---

## 2. 包体积分析与预算门禁（Bundle Size Pipeline）

Kerno 内置零外部依赖的包体积分析脚本 [analyze-size.mjs](file:///Users/mahoo/Projects/kerno/scripts/analyze-size.mjs)，基于 Vite 8 / Rolldown 压缩编译后的 npm `dist/` 产物，使用 Node 原生 `zlib` 精确计算 **Raw / Gzip / Brotli** 体积，并对照 [size-budgets.json](file:///Users/mahoo/Projects/kerno/scripts/size-budgets.json) 进行预算校验：

```bash
# 生成包体积报告（终端表格 + reports/bundle-size.md + reports/bundle-size.json）
pnpm size

# CI 预算门禁模式：任意包、单组件独立体积或子路径超出 gzip 预算时返回非零退出码
pnpm size:check
```

分析覆盖三个维度：

1. **整包入口（Workspace 依赖外置）**：`@kerno/tokens`（含 `tokens.css` / `base.css`）、`@kerno/core`、`@kerno/effects`、`@kerno/primitives`、`@kerno/components`。
2. **代表性单组件独立体积（全依赖内联）**：真实衡量业务方在原生 HTML 中仅引入单个组件的总下载开销。
3. **全量 60+ 子路径模块体积排行**：逐一统计所有 `@kerno/effects/*`、`@kerno/primitives/*`、`@kerno/components/*` 子路径模块，防止单组件体积无意膨胀。

在 GitHub Actions 中运行时，`pnpm size:check` 会自动将 Markdown 表格追加至 `$GITHUB_STEP_SUMMARY` 并在 CI 工件中留存。

---

## 3. 发版与产物审计流水线（Release Pipeline）

[release.mjs](file:///Users/mahoo/Projects/kerno/scripts/release.mjs) 提供统一的本地预检、版本升级、Changelog 生成与 npm 发布命令：

### 步骤 A：发版前完整审计

```bash
pnpm release:verify
```

该命令依次执行：

1. `pnpm check`（构建 + 类型检查 + Lint + 格式 + 全部浏览器测试）
2. `pnpm size:check`（Gzip 包体积预算门禁）
3. 校验全部 5 个 `@kerno/*` 包版本号一致、`license` 与 `publishConfig.access = "public"` 完整；
4. 对每个包执行 `pnpm pack` 打包为临时 `.tgz` 并逐项审计：
   - 所有 `package.json#exports` 指向的编译产物与 `.d.ts` 均真实存在于 tarball 内；
   - 严禁出现 `*.test.ts` / `*.test.js` 测试文件泄漏；
   - 严禁打包后的 `package.json` 残留未解析的 `workspace:` 协议。

### 步骤 B：统一升级版本号与自动生成 Changelog

```bash
# 预览版本变更与 Changelog 片段（不写入文件）
pnpm release:version minor -- --dry-run

# 同步更新 5 个包的 package.json 并写入 CHANGELOG.md
pnpm release:version minor   # 支持 patch | minor | major | 0.2.0-beta.1
```

### 步骤 C：本地预演或打 Tag 自动发版

```bash
# 本地 npm publish 预演（默认 --dry-run，不会真正推送）
pnpm release:dry-run

# 提交并推送版本 Tag，触发 .github/workflows/release.yml 自动验证、OIDC Provenance 发布与 GitHub Release 创建
git add -A && git commit -m "chore(release): v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push --follow-tags
```

> [!NOTE]
> 在 GitHub 仓库 Secrets 中配置 `NPM_TOKEN` 后，推送 `v*` 标签或手动触发 `Release` Workflow（取消 `dry_run`）即可自动执行全量测试、体积校验、带 OIDC 溯源证明（`--provenance`）的 npm 发布并附带 `bundle-size.md` 生成 GitHub Release。
