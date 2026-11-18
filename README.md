# Kerno — 项目实现概要

## 1. 品牌与定位

**项目名称：** Kerno
**品牌定位：** A Modular Web Component System
**品牌理念：** Build interfaces with structure.

Kerno 是一套面向现代 Web 应用的模块化 UI 组件系统。

它不仅是传统的 UI 组件库，还提供完整的设计 Token、主题系统、图形基础设施、视觉效果、交互机制和业务组件。

**核心目标：** 构建一套框架无关、高度可定制、可长期演进的 Web Components 生态。

## 2. 核心参考项目

### Axiom Design System

**首要参考项目：** https://github.com/ax-design

**项目介绍：** AXIOM DESIGN SYSTEM

Axiom 是 Kerno 在视觉基础设施、图形能力和原生 Web Components 设计方面的重要参考。

重点研究和借鉴以下设计思路：

- **Shape：** 统一的几何形状系统，探索 Rounded、Chamfered、Scalloped、Notched 等形状及其渲染方式。
- **Surface：** 统一的表面渲染机制，关注 Canvas 绘制、渲染调度与性能。
- **Acrylic：** 半透明材质、背景模糊、叠色与噪声纹理。
- **Elevation：** 统一的空间层级和深度表达。
- **Reveal Highlight：** 基于指针位置的动态光照与高亮反馈。
- **Pressure：** 按压、倾斜等交互反馈效果。
- **Typed CSS Properties：** 探索 CSS Custom Properties 的类型化管理和变更检测。
- **Native Web Components：** 基于 Custom Elements、Slots、Custom Events、CSS Parts 等 Web 标准构建组件。

Axiom 不应仅被视为视觉参考，而应作为研究底层 UI 基础设施设计的重要案例。

**借鉴原则：**

1. 深入研究 Axiom 的架构、API 和实现方式。
2. 优先借鉴经过验证的设计思路，避免重复造轮子。
3. 不直接 Fork Axiom，也不将 Kerno 绑定到 Axiom 的内部实现。
4. 对值得复用的能力进行独立实现或封装适配层。
5. 保持 Kerno 自身的 API、设计 Token 和架构体系。
6. 在需要复用 Axiom 的具体代码或依赖时，先确认许可证、版本稳定性和兼容性。

### Fluent Design

参考 Windows 10 早期 Fluent Design 的视觉理念：

- Acrylic 材质与半透明表面。
- Reveal 光照与环境反馈。
- Elevation 空间层级。
- Shape 几何形状。
- Motion 动效与交互反馈。

不要简单复刻 Windows 10，也不要将 Kerno 限制为 Fluent Design 的 Web 实现。

Kerno 应在吸收这些设计理念的基础上，形成自己的视觉语言。

## 3. 技术方向

- 使用 TypeScript + 原生 Web Components。
- 基于 Custom Elements、CSS、Shadow DOM、Slots 等 Web 标准。
- 保持框架无关，支持 React、Vue、Svelte 和原生 HTML。
- 使用 CSS Custom Properties 构建设计 Token 和主题机制。
- 合理使用 `::part()` 暴露样式定制能力。
- 表单组件尽可能支持原生表单语义和 `ElementInternals`。
- 避免不必要的第三方运行时依赖。

## 4. 整体架构

采用分层、模块化设计，各层职责独立。

### Tokens — 设计令牌

统一管理：

- Color
- Typography
- Spacing
- Radius
- Elevation
- Motion
- Surface
- Z-index

支持主题切换、暗色模式和用户自定义主题。

### Core — 核心基础设施

负责组件运行时和公共机制：

- Custom Element 注册与生命周期管理
- 组件属性与状态管理
- 事件分发
- Focus Management
- Overlay Manager
- 表单基础设施
- 无障碍支持

### Primitives — 基础控件

提供最小粒度的基础组件：

- Button
- Icon
- Text
- Input
- Checkbox
- Radio
- Switch
- Select
- Badge
- Avatar
- Separator

### Components — 复合组件

提供常用交互和界面组件：

- Dialog
- Drawer
- Dropdown
- Tooltip
- Popover
- Tabs
- Accordion
- Navigation
- Menu
- Pagination
- Breadcrumb
- Command

### Data Display — 数据展示

- Table
- Data Grid
- Tree
- List
- Card
- Empty State
- Progress
- Skeleton

### Data Entry — 数据录入

- Form
- Date Picker
- Date Range Picker
- Time Picker
- Cascader
- Autocomplete
- Upload

### Graphics & Effects — 图形与视觉效果

这是 Kerno 区别于普通组件库的重要部分。

参考 Axiom 的设计思路，建立独立的视觉基础设施：

- Shape：几何形状及其渲染系统。
- Surface：表面绘制与渲染调度。
- Acrylic：透明材质和模糊效果。
- Elevation：空间层级与深度。
- Reveal：动态光照和指针反馈。
- Pressure：按压与倾斜反馈。
- Motion：统一动效系统。

这些能力应尽可能独立于具体业务组件，可以被多个组件复用。

### Icons — 图标系统

提供统一的图标组件、图标资源和自定义图标接入机制。

## 5. 定制化要求

定制化是 Kerno 的核心设计目标。

1. Theme：支持完整主题切换和自定义主题。
2. Tokens：关键视觉参数必须有对应设计令牌，避免硬编码。
3. CSS：暴露合理的 CSS Custom Properties 和 `::part()`。
4. Slots：支持通过插槽扩展组件内部结构。
5. Composition：基础组件可以自由组合。
6. Effects：视觉效果可以独立启用、关闭或替换。
7. Renderer：图形和材质渲染机制与组件业务逻辑分离。

组件的功能逻辑与视觉实现应尽可能解耦。

## 6. 工程与质量要求

- 组件 API 保持一致、可预测。
- 优先遵循 HTML 原生语义和无障碍标准。
- 完整支持键盘操作、焦点管理和 ARIA。
- 兼顾响应式布局。
- 控制运行时体积，支持按需引入和 Tree Shaking。
- 建立单元测试、交互测试和视觉回归测试。
- 提供组件文档、在线示例和 API 说明。
- 关注 SSR、Hydration 和跨框架兼容性。
- 图形渲染重点关注 DPR、坐标系统、裁剪、重绘和性能预算。

## 7. 建议的 Monorepo 包结构

- `@kerno/core`：运行时与基础设施
- `@kerno/tokens`：设计令牌与主题
- `@kerno/primitives`：基础控件
- `@kerno/components`：复合组件
- `@kerno/effects`：图形、材质与视觉效果
- `@kerno/icons`：图标系统

具体拆包应根据实际依赖关系调整，避免过早拆分。

## 8. 实施路线

采用渐进式建设，不要一次性生成所有组件。

**第一阶段：架构基础**

- 建立 Monorepo 和构建系统。
- 研究 Axiom 的架构和可复用设计。
- 建立 Tokens、Theme 和 Core。
- 完成基础组件注册机制。

**第二阶段：视觉基础设施**

- Shape
- Surface
- Elevation
- Acrylic
- Motion

**第三阶段：基础控件**

- Button
- Input
- Checkbox
- Radio
- Switch
- Icon

验证组件 API、主题机制、样式隔离和跨框架使用。

**第四阶段：交互与复合组件**

- Overlay Manager
- Dialog
- Popover
- Tooltip
- Dropdown
- Tabs
- Navigation

**第五阶段：业务组件与生态**

- Data Display
- Data Entry
- 表单体系
- 文档站点
- 测试体系
- 发布流程

## 9. 最重要的设计原则

Kerno 不应该只是另一个 Button、Input、Dialog 组件集合。

它应该是一套完整的 UI 基础设施：

- 从 Shape 和 Surface 开始建立视觉基础。
- 从 Tokens 和 Theme 建立设计体系。
- 从 Core 和 Primitives 建立组件运行时。
- 从 Components 和业务组件建立应用能力。
- 通过独立的 Effects 系统赋予组件丰富的视觉表现。

**Axiom 提供重要的技术与设计参考，Fluent Design 提供视觉灵感，Kerno 最终形成自己的架构、API 和设计语言。**