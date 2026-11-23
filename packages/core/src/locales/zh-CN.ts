import type { KernoLocale } from '../i18n.js';
import type { KernoMessages } from './en.js';

/** Typed against `KernoMessages`, so a missing or mistyped key fails the build. */
const messages: KernoMessages = {
  // Generic actions
  close: '关闭',
  clear: '清除',
  dismiss: '关闭',
  previous: '上一页',
  next: '下一页',
  remove: (item) => `移除 ${item}`,
  copy: '复制',
  copied: '已复制',
  showMore: '展开',
  showLess: '收起',
  now: '此刻',
  ok: '确定',
  today: '今天',
  loading: '加载中…',

  // Constraint validation
  invalidValue: '值无效',
  valueMissing: '请填写此字段。',
  tooShort: (min) => `请至少输入 ${min} 个字符。`,
  tooLong: (max) => `最多只能输入 ${max} 个字符。`,
  badNumber: '请输入有效的数字。',
  rangeUnderflow: (min) => `值必须大于或等于 ${min}。`,
  rangeOverflow: (max) => `值必须小于或等于 ${max}。`,
  checkboxRequired: '如要继续，请勾选此复选框。',
  switchRequired: '如要继续，请开启此选项。',
  radioRequired: '请选择其中一个选项。',
  selectRequired: '请从列表中选择一项。',
  optionRequired: '请选择一个选项。',
  chipRequired: '请选中此选项。',
  optionsRequired: '请至少选择一个选项。',
  tagsRequired: '请至少添加一个标签。',
  filesRequired: '请至少选择一个文件。',
  dateRequired: '请选择日期。',
  timeRequired: '请选择时间。',
  colorRequired: '请选择颜色。',
  ratingRequired: '请选择评分。',
  invalidColor: '请输入有效的颜色值。',
  timeOutOfRange: '所选时间超出范围。',
  pinIncomplete: (count) => `请输入全部 ${count} 个字符。`,
  formErrors: (count) => `请修正以下 ${count} 处错误：`,

  // Text entry and pickers
  showPassword: '显示密码',
  hidePassword: '隐藏密码',
  increment: '增大',
  decrement: '减小',
  selectPlaceholder: '请选择…',
  optionsPlaceholder: '请选择…',
  optionPlaceholder: '请选择',
  searchPlaceholder: '搜索…',
  noMatches: '无匹配结果',
  noMatchingOptions: '没有匹配的选项。',
  noOptions: '暂无选项',
  clearSelection: '清除选择',
  cascaderOptions: '级联选项',
  tagsPlaceholder: '输入标签后按回车…',
  clearTags: '清除全部标签',
  tagSuggestions: '标签建议',
  range: '范围',
  rangeMinimum: (label) => `${label}最小值`,
  rangeMaximum: (label) => `${label}最大值`,
  rating: '评分',
  ratingValue: (value, max) => `${value} 分，满分 ${max} 分`,
  verificationCode: '验证码',
  pinCharacter: (label, index, count) => `${label}第 ${index} 位，共 ${count} 位`,
  chipOptions: '选项',
  moreItems: (count) => `还有 ${count} 个`,
  characterCount: (length, max) => `${length} / ${max}`,

  // Date and time
  calendar: '日历',
  clearDate: '清除日期',
  datePlaceholder: '选择日期',
  dateRangePlaceholder: '开始日期 – 结束日期',
  timePicker: '时间选择器',
  timePlaceholder: '选择时间',
  clearTime: '清除时间',
  hour: '时',
  minute: '分',
  second: '秒',
  period: '上午/下午',
  am: '上午',
  pm: '下午',
  time12h: (time, period) => `${period} ${time}`,

  // Color
  colorPicker: '取色器',
  toggleColorPicker: '打开或关闭取色器',
  colorArea: '饱和度与亮度',
  hue: '色相',
  opacity: '不透明度',
  pickScreenColor: '从屏幕取色',
  clearColor: '清除颜色',
  selectColor: (color) => `选择颜色 ${color}`,

  // Navigation and structure
  breadcrumb: '面包屑导航',
  showHiddenPath: '显示隐藏的路径',
  hiddenItems: (count) => `显示 ${count} 个隐藏项`,
  navigation: '导航',
  pagination: '分页',
  firstPage: '第一页',
  previousPage: '上一页',
  nextPage: '下一页',
  lastPage: '最后一页',
  page: (page) => `第 ${page} 页`,
  pageOf: (page, count) => `第 ${page} / ${count} 页`,
  pageRange: (start, end, total) => `第 ${start}–${end} 条，共 ${total} 条`,
  list: '列表',
  tree: '树',
  toggleBranch: '展开或折叠',
  progress: '进度',
  progressRing: '环形进度',
  progressSteps: '步骤',
  segmentedControl: '分段控件',
  notifications: '通知',
  uploadPrompt: '将文件拖到此处，或点击选择',
  maxFileSize: (size) => `最大 ${size}`,
  maxFiles: (count) => `最多 ${count} 个文件`,
  noData: '暂无数据',
  tileMoved: (label, position, count) => `${label}，已移到第 ${position} 位，共 ${count} 位`,

  // Tables and data grids
  noRecords: '暂无数据',
  noFilteredRows: '没有符合筛选条件的行。',
  selectAllRows: '全选',
  selectRow: (row) => `选择第 ${row} 行`,
  rowCount: (count) => `${count} 行`,
  filteredRowCount: (shown, total) => `${shown} / ${total} 行`,
  selectedRows: (summary, count) => `${summary} · 已选 ${count} 行`,
  renderedRows: (count) => `DOM 窗口：${count} 行`,

  // Command palette
  commandPlaceholder: '输入命令或搜索…',
  noCommands: '没有匹配的命令。',
  commandCount: (count) => `${count} 条命令`,
  navigateHint: '选择',
  runHint: '执行',
};

/**
 * Simplified Chinese.
 *
 * @example
 * import { registerLocale } from '@kerno/core';
 * import { zhCN } from '@kerno/core/locales/zh-CN';
 * registerLocale(zhCN);
 * document.documentElement.lang = 'zh-CN';
 */
export const zhCN: KernoLocale = { code: 'zh-CN', messages };
