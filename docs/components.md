# Kerno 组件与 API 参考手册

Kerno 采用「无副作用类导出」与「按需 `/define` 注册」分离的模块体系：

```ts
// 1. 引入全局设计令牌样式
import '@kerno/tokens/tokens.css';
import '@kerno/tokens/base.css';

// 2. 按需注册或全量注册组件
import '@kerno/effects/define';
import '@kerno/primitives/define';
import '@kerno/components/define';
```

---

## 1. `@kerno/tokens` — 令牌与主题 API

| API                                                         | 说明                                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `token(path, fallback?)`                                    | 返回类型安全的 CSS 变量引用，如 `token('color.accent.default')` → `'var(--k-color-accent-default)'` |
| `tokenName(path)`                                           | 返回 CSS 变量名，如 `'--k-color-accent-default'`                                                    |
| `createTheme({ name, base?, colorScheme?, tokens? })`       | 基于 `lightTheme` 或 `darkTheme` 深度合并生成自定义主题                                             |
| `applyTheme(theme \| 'light' \| 'dark' \| 'auto', target?)` | 将主题应用至 `document.documentElement` 或任意 DOM / ShadowRoot 子树，返回还原函数                  |

---

## 2. `@kerno/effects` — 视觉基础设施

### `<k-surface>`

统一表面渲染容器，集成参数化几何裁剪、HiDPI Canvas 绘制、可见性节流与多层视觉效果。

- **属性**：
  - `shape`: `'rounded' | 'chamfer' | 'scallop' | 'notch'`（默认 `'rounded'`）
  - `radius`: 数字或 1~4 值空格分隔简写（如 `"12"` 或 `"16 4"`）
  - `elevation`: `0 | 1 | 2 | 3 | 4 | 5`（`rounded` 下使用 `box-shadow`，异形下自动转换为 `filter: drop-shadow(...)`）
  - `acrylic`: 开启亚克力背景模糊、叠色与程序化 `64×64` 噪点纹理
  - `reduced-transparency`: 强制回退至不透明实心底色
  - `reveal`: 开启基于指针位置的动态边框与表面光照（Reveal Highlight）
  - `pressure`: 开启指针按压 3D 透视倾斜与下沉反馈（Pressure）
- **CSS 变量**：`--k-surface-bg`、`--k-surface-border-color`、`--k-surface-border-width`、`--k-surface-padding`、`--k-surface-radius`

### Motion 工具（`@kerno/effects/motion`）

- `animate(el, keyframes, options)`、`fadeIn`、`fadeOut`、`scaleIn`、`scaleOut`、`slideIn`
- 自动读取 `--k-motion-duration-*` 与 `--k-motion-easing-*`，并在 `prefers-reduced-motion: reduce` 下归零。

---

## 3. `@kerno/primitives` — 基础控件

| 标签名                          | 类名                     | 核心属性                                                                                                                         | 表单关联 (`ElementInternals`)                |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `<k-button>`                    | `KButton`                | `variant="standard\|accent\|subtle"`、`size="sm\|md\|lg"`、`shape`、`type="button\|submit\|reset"`、`loading`、`disabled`        | 支持 `submit` / `reset` 及 `name=value` 提交 |
| `<k-icon>`                      | `KIcon`                  | `name`、`size="sm\|md\|lg\|<css>"`、`label`、`spin`；配套 `registerIcon(name, svg)`                                              | —                                            |
| `<k-input>`                     | `KInput`                 | `value`、`type`、`placeholder`、`size`、`shape`、`clearable`、`password-toggle`、`required`、`minlength`、`maxlength`、`pattern` | 完整支持 `FormData`、约束校验与 `reset`      |
| `<k-checkbox>`                  | `KCheckbox`              | `checked`、`indeterminate`、`value`、`size`、`required`、`disabled`                                                              | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-radio>` / `<k-radio-group>` | `KRadio` / `KRadioGroup` | `name`、`value`、`checked`、`orientation="horizontal\|vertical"`、`required`、`disabled`                                         | 支持组模式与独立同名互斥模式、方向键漫游     |
| `<k-switch>`                    | `KSwitch`                | `checked`、`value`、`size`、`required`、`disabled`（`role="switch"`）                                                            | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-select>` / `<k-option>`     | `KSelect` / `KOption`    | `value`、`placeholder`、`size`、`open`、`required`、`disabled`                                                                   | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-slider>`                    | `KSlider`                | `value`、`min`、`max`、`step`、`label`、`unit`、`show-value`、`disabled`                                                         | 完整支持 `FormData` 与 `reset`               |
| `<k-badge>`                     | `KBadge`                 | `variant="neutral\|accent\|success\|warning\|danger"`、`pill`                                                                    | —                                            |
| `<k-separator>`                 | `KSeparator`             | `orientation="horizontal\|vertical"`、`decorative`                                                                               | —                                            |

---

## 4. `@kerno/components` — 复合与业务组件

| 标签名                                        | 类名                                | 核心能力与事件                                                                                                                                  |
| --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `<k-dialog>`                                  | `KDialog`                           | `open`、`label`、`modal`、`acrylic`、`close-on-escape`、`close-on-backdrop`；焦点陷阱、滚动锁定；事件 `k-open`、`k-close`、`k-request-close`    |
| `<k-popover>`                                 | `KPopover`                          | `open`、`placement`、`offset`、`trigger="click\|manual"`、`acrylic`；锚点自动翻转定位                                                           |
| `<k-tooltip>`                                 | `KTooltip`                          | `content`、`placement`、`offset`、`delay`、`disabled`；悬停/聚焦触发与 `aria-describedby`                                                       |
| `<k-dropdown>` / `<k-menu>` / `<k-menu-item>` | `KDropdown` / `KMenu` / `KMenuItem` | 浮层菜单、方向键循环导航、选中触发 `k-select` 并自动收起还原焦点                                                                                |
| `<k-tabs>` / `<k-tab>` / `<k-tab-panel>`      | `KTabs` / `KTab` / `KTabPanel`      | `value`、`orientation`、`activation="auto\|manual"`；自动 ARIA 关联与方向键切换（`k-tab-change`）                                               |
| `<k-nav>` / `<k-nav-item>`                    | `KNav` / `KNavItem`                 | `value`、`orientation`、`label`；自动设置激活项 `aria-current="page"`（`k-nav-select`）                                                         |
| `<k-card>`                                    | `KCard`                             | 基于 `<k-surface>` 的卡片容器，支持 `title`、`shape`、`elevation`、`acrylic`、`reveal`、`pressure`、`interactive`                               |
| `<k-table>`                                   | `KTable`                            | 属性 `columns`、`data`、`sort-key`、`sort-direction`、`striped`；支持列排序（`k-sort-change`）与自定义单元格渲染函数                            |
| `<k-form-field>`                              | `KFormField`                        | `label`、`help`、`error`、`required`；点击标签自动聚焦控件，实时监听并展示子控件的 `validationMessage`                                          |
| `<k-progress>`                                | `KProgress`                         | `value`、`max`、`indeterminate`、`variant`、`size`（`role="progressbar"`）                                                                      |
| `<k-skeleton>`                                | `KSkeleton`                         | `variant="text\|circular\|rectangular"`、`effect="pulse\|none"`、`width`、`height`                                                              |
| `<k-empty-state>`                             | `KEmptyState`                       | `icon`、`title`、`description` 与默认操作按钮插槽                                                                                               |
| `<k-scroll-view>` / `<k-scrollbar>`           | `KScrollView` / `KScrollbar`        | 原生滚动 + 覆盖式 Fluent / Windows Classic / Minimal 滚动条，支持几何输入路由、平滑滑行、标记点合并与 Top Layer 悬停卡片（`k-marker-activate`） |
