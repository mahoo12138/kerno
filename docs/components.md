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

| 标签名                            | 类名                       | 核心属性                                                                                                                                      | 表单关联 (`ElementInternals`)                |
| --------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `<k-button>`                      | `KButton`                  | `variant="standard\|accent\|subtle"`、`size="sm\|md\|lg"`、`shape`、`type="button\|submit\|reset"`、`loading`、`disabled`                     | 支持 `submit` / `reset` 及 `name=value` 提交 |
| `<k-icon>`                        | `KIcon`                    | `name`、`size="sm\|md\|lg\|<css>"`、`label`、`spin`；配套 `registerIcon(name, svg)`                                                           | —                                            |
| `<k-input>`                       | `KInput`                   | `value`、`type`、`placeholder`、`size`、`shape`、`clearable`、`password-toggle`、`required`、`minlength`、`maxlength`、`pattern`              | 完整支持 `FormData`、约束校验与 `reset`      |
| `<k-checkbox>`                    | `KCheckbox`                | `checked`、`indeterminate`、`value`、`size`、`required`、`disabled`                                                                           | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-radio>` / `<k-radio-group>`   | `KRadio` / `KRadioGroup`   | `name`、`value`、`checked`、`orientation="horizontal\|vertical"`、`required`、`disabled`                                                      | 支持组模式与独立同名互斥模式、方向键漫游     |
| `<k-switch>`                      | `KSwitch`                  | `checked`、`value`、`size`、`required`、`disabled`（`role="switch"`）                                                                         | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-select>` / `<k-option>`       | `KSelect` / `KOption`      | `value`、`placeholder`、`size`、`open`、`required`、`disabled`                                                                                | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-slider>`                      | `KSlider`                  | `value`、`min`、`max`、`step`、`label`、`unit`、`show-value`、`disabled`                                                                      | 完整支持 `FormData` 与 `reset`               |
| `<k-badge>`                       | `KBadge`                   | `variant="neutral\|accent\|success\|warning\|danger"`、`pill`                                                                                 | —                                            |
| `<k-separator>`                   | `KSeparator`               | `orientation="horizontal\|vertical"`、`decorative`                                                                                            | —                                            |
| `<k-avatar>` / `<k-avatar-group>` | `KAvatar` / `KAvatarGroup` | `src`、`alt`、`initials`、`size="xs\|sm\|md\|lg\|xl"`、`shape`、`status="online\|busy\|away\|offline"`、`variant`；头像组支持 `max` `+N` 溢出 | —                                            |
| `<k-textarea>`                    | `KTextarea`                | `value`、`rows`、`auto-resize`、`show-count`、`resize`、`size`、`shape`、`minlength`、`maxlength`、`required`                                 | 完整支持 `FormData`、约束校验与 `reset`      |
| `<k-number-input>`                | `KNumberInput`             | `value`、`min`、`max`、`step`、`precision`、`hide-steppers`、`size`、`shape`、长按连发与键盘步进                                              | 完整支持 `FormData`、范围校验与 `reset`      |
| `<k-pin-input>`                   | `KPinInput`                | OTP / 验证码多格输入：`length`、`type="number\|alphanumeric"`、`mask`、`one-time-code`、整段粘贴分发、自动前进与退格回退、`k-complete`        | 完整支持 `FormData`、长度校验与 `reset`      |
| `<k-rating>`                      | `KRating`                  | 星级评分：`value`、`count`、`fractions`（支持半星等分）、悬停预览、`highlight-selected-only`、`readonly`、`clearable`、`k-rating-change`      | 完整支持 `FormData`、`required` 与 `reset`   |
| `<k-chip>` / `<k-chip-group>`     | `KChip` / `KChipGroup`     | 可勾选芯片开关：`variant="outline\|filled\|light"`、`pill`、`size`、单选（`radio`）与多选（`multiple`）协调、`k-chip-change`                  | 完整支持 `FormData`（含多值）与 `reset`      |
| `<k-indicator>`                   | `KIndicator`               | 角标包裹器：9 方位 `position`、计数 `label`、`variant`、`offset`、`with-border` 镂空边与 `processing` 脉冲波纹                                | —                                            |
| `<k-kbd>`                         | `KKbd`                     | 语义化键盘按键展示：`size="xs\|sm\|md\|lg"`、立体按键下沿与等宽字体                                                                           | —                                            |

---

## 4. `@kerno/components` — 复合与业务组件

| 标签名                                                   | 类名                                          | 核心能力与事件                                                                                                                                                                                                         |
| -------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<k-dialog>`                                             | `KDialog`                                     | `open`、`label`、`modal`、`acrylic`、`close-on-escape`、`close-on-backdrop`；焦点陷阱、滚动锁定；事件 `k-open`、`k-close`、`k-request-close`                                                                           |
| `<k-drawer>`                                             | `KDrawer`                                     | `open`、`placement="right\|left\|top\|bottom"`、`size="sm\|md\|lg\|full"`、`acrylic`；Top Layer 四向滑入抽屉、焦点陷阱与 `k-request-close`                                                                             |
| `<k-alert>`                                              | `KAlert`                                      | Fluent 1 InfoBar：`variant="info\|success\|warning\|danger\|neutral"`、`title`、`closable`、`shape`、可取消 `k-close`                                                                                                  |
| `<k-toast>` / `<k-toast-container>` + `toast.*`          | `KToast` / `KToastContainer`                  | Top Layer 通知栈、`placement` 六方位、`acrylic`、悬停/聚焦自动暂停倒计时、`action-label`；支持命令式 `toast.show/info/success/warning/danger`                                                                          |
| `<k-command>` / `<k-command-group>` / `<k-command-item>` | `KCommand` / `KCommandGroup` / `KCommandItem` | 全局快捷键（`shortcut="mod+k"`）与内嵌模式（`inline`）、模糊搜索过滤、空分组自动隐藏、ARIA Combobox 方向键漫游、`acrylic`、`k-command-select`                                                                          |
| `<k-autocomplete>`                                       | `KAutocomplete`                               | 表单关联可搜索 Combobox：支持 `options` 与 `<k-option>`、`clearable`、`allow-custom`、`loading`、`acrylic` Top Layer、`k-search`/`k-select`                                                                            |
| `<k-date-picker>`                                        | `KDatePicker`                                 | 零依赖表单关联日期选择器：支持 `mode="single\|range"`、`min`/`max`、日/月/年三视图、键盘导航、`acrylic` Top Layer、`k-date-change`                                                                                     |
| `<k-time-picker>`                                        | `KTimePicker`                                 | 表单关联时间选择器：24h / 12h（AM/PM）模式、可选秒列（`show-seconds`）、步长（`hour/minute/second-step`）、`min`/`max` 边界、`acrylic` Top Layer、`k-time-change`                                                      |
| `<k-cascader>`                                           | `KCascader`                                   | 表单关联多列级联选择器：`click`/`hover` 展开、`change-on-select` 支持选中非叶子节点、完整方向键跨列导航、`acrylic` Top Layer、`k-cascader-change`                                                                      |
| `<k-form>`                                               | `KForm`                                       | 声明式表单编排容器：协调原生与 Kerno 表单控件，`layout="vertical\|horizontal\|grid"`、顶部可点击聚焦错误汇总（`role="alert"`）、`validate()`/`getValues()`/`reset()`、`loading` 锁定、`k-submit`/`k-invalid`/`k-reset` |
| `<k-data-grid>`                                          | `KDataGrid`                                   | 高性能虚拟滚动数据网格：支持 10,000+ 行 60fps 窗口渲染、拖拽列宽（`resizable`）、排序、实时全局过滤、多选复选框、状态栏统计与 `k-sort-change`/`k-selection-change`/`k-column-resize`                                   |
| `<k-segmented-control>`                                  | `KSegmentedControl`                           | 表单关联分段控制器：动态测算滑动高亮指示条、`variant="accent\|surface"`、`orientation="horizontal\|vertical"`、`full-width`、支持 `data` 与 `<k-option>`、`k-change`                                                   |
| `<k-tags-input>`                                         | `KTagsInput`                                  | 表单关联自由标签输入：支持 `Enter`/逗号/粘贴拆分、退格删尾标签、`max-tags`、`allow-duplicates`、Top Layer Acrylic 联想下拉、多值 `FormData` 与 `k-tags-change`                                                         |
| `<k-multi-select>`                                       | `KMultiSelect`                                | 表单关联可搜索多选下拉：内嵌可移除标签芯片 + Top Layer Acrylic 复选列表、`searchable`、`max-values`、`hide-picked-options`、`clearable`、多值 `FormData` 与 `k-multi-select-change`                                    |
| `<k-stepper>` / `<k-stepper-step>`                       | `KStepper` / `KStepperStep`                   | 多步骤向导：`active`、`orientation="horizontal\|vertical"`、`allow-next-steps-select`、已完成/进行中/加载态、Accent 进度连接线、`completed` 完成插槽、`k-step-click`/`k-step-change`                                   |
| `<k-timeline>` / `<k-timeline-item>`                     | `KTimeline` / `KTimelineItem`                 | 时间轴日志：`active` 高亮进度线、`align="left\|right"`、`bullet-size`、`line-width`、`line-variant="solid\|dashed\|dotted"`、`icon` / `slot="bullet"` 自定义节点与 `timestamp`                                         |
| `<k-ring-progress>`                                      | `KRingProgress`                               | 多段 SVG 环形进度图：`sections: [{ value, color, label }]` 或单值 `value`、`size`、`thickness`、`round-caps`、中心 KPI 插槽与分段悬停事件 `k-section-hover`                                                            |
| `<k-upload>`                                             | `KUpload`                                     | 表单关联拖拽上传：`accept`/`max-size`/`max-files` 校验、队列进度条、提交原生 `File` `FormData`、`k-upload-change`/`k-upload-reject`                                                                                    |
| `<k-tree>` / `<k-tree-item>`                             | `KTree` / `KTreeItem`                         | WAI-ARIA TreeView：`selection`、`checkable` 父子级联勾选与自动半选态、`lazy` 懒加载（`k-tree-load`）、完整方向键导航                                                                                                   |
| `<k-list>` / `<k-list-item>`                             | `KList` / `KListItem`                         | 列表视图：`selection="none\|single\|multiple"`、`bordered`、`divided`、`dense`、左侧 Accent 指示条与键盘漫游、`k-list-select`                                                                                          |
| `<k-accordion>` / `<k-accordion-item>`                   | `KAccordion` / `KAccordionItem`               | `multiple`、`collapsible`、CSS Grid 平滑高度展开、`inert` 折叠态隔离、方向键头部焦点漫游、`k-toggle` / `k-accordion-change`                                                                                            |
| `<k-breadcrumb>` / `<k-breadcrumb-item>`                 | `KBreadcrumb` / `KBreadcrumbItem`             | 自动末项 `aria-current="page"`、自定义 `separator`、`max-items` 中间路径省略折叠与点击展开、`k-breadcrumb-select`                                                                                                      |
| `<k-pagination>`                                         | `KPagination`                                 | `page`、`total` / `total-pages`、`page-size`、`show-edges`、`show-total`、智能省略号区间计算、同色系 Accent 当前页反馈、`k-page-change`                                                                                |
| `<k-popover>`                                            | `KPopover`                                    | `open`、`placement`、`offset`、`trigger="click\|manual"`、`acrylic`；锚点自动翻转定位                                                                                                                                  |
| `<k-tooltip>`                                            | `KTooltip`                                    | `content`、`placement`、`offset`、`delay`、`disabled`；悬停/聚焦触发与 `aria-describedby`                                                                                                                              |
| `<k-dropdown>` / `<k-menu>` / `<k-menu-item>`            | `KDropdown` / `KMenu` / `KMenuItem`           | 浮层菜单、方向键循环导航、选中触发 `k-select` 并自动收起还原焦点                                                                                                                                                       |
| `<k-tabs>` / `<k-tab>` / `<k-tab-panel>`                 | `KTabs` / `KTab` / `KTabPanel`                | `value`、`orientation`、`activation="auto\|manual"`；自动 ARIA 关联与方向键切换（`k-tab-change`）                                                                                                                      |
| `<k-nav>` / `<k-nav-item>`                               | `KNav` / `KNavItem`                           | `value`、`orientation`、`label`；自动设置激活项 `aria-current="page"`（`k-nav-select`）                                                                                                                                |
| `<k-card>`                                               | `KCard`                                       | 基于 `<k-surface>` 的卡片容器，支持 `title`、`shape`、`elevation`、`acrylic`、`reveal`、`pressure`、`interactive`                                                                                                      |
| `<k-table>`                                              | `KTable`                                      | 属性 `columns`、`data`、`selectable`、`row-key`、`filter`、`sticky-header`、`sort-key`、`striped`；排序（`k-sort-change`）与行多选（`k-selection-change`）                                                             |
| `<k-form-field>`                                         | `KFormField`                                  | `label`、`help`、`error`、`required`；点击标签自动聚焦控件，实时监听并展示子控件的 `validationMessage`                                                                                                                 |
| `<k-progress>`                                           | `KProgress`                                   | `value`、`max`、`indeterminate`、`variant`、`size`（`role="progressbar"`）                                                                                                                                             |
| `<k-skeleton>`                                           | `KSkeleton`                                   | `variant="text\|circular\|rectangular"`、`effect="pulse\|none"`、`width`、`height`                                                                                                                                     |
| `<k-empty-state>`                                        | `KEmptyState`                                 | `icon`、`title`、`description` 与默认操作按钮插槽                                                                                                                                                                      |
| `<k-scroll-view>` / `<k-scrollbar>`                      | `KScrollView` / `KScrollbar`                  | 原生滚动 + 覆盖式 Fluent / Windows Classic / Minimal 滚动条，支持几何输入路由、平滑滑行、标记点合并与 Top Layer 悬停卡片（`k-marker-activate`）                                                                        |
| `<k-tile>` / `<k-tile-group>` / `<k-tile-bound>`         | `KTile` / `KTileGroup` / `KTileBound`         | Windows Start 磁贴网格，支持拖拽重排、桌面/移动端 3D 入场与 3D 翻转启动过渡                                                                                                                                            |
