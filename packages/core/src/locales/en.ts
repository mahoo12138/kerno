/**
 * Built-in English messages. Every key a Kerno component displays or announces
 * lives here; other locales provide translations for some or all of them
 * (missing keys fall back to English).
 *
 * Parameterized messages are functions so each language controls word order
 * and plural forms.
 */
export const enMessages = {
  // Generic actions
  close: 'Close',
  clear: 'Clear',
  dismiss: 'Dismiss',
  previous: 'Previous',
  next: 'Next',
  remove: (item: string) => `Remove ${item}`,
  copy: 'Copy',
  copied: 'Copied',
  showMore: 'Show more',
  showLess: 'Show less',
  now: 'Now',
  ok: 'OK',
  today: 'Today',
  loading: 'Loading...',

  // Constraint validation
  invalidValue: 'Invalid value',
  valueMissing: 'Please fill out this field.',
  tooShort: (min: number) => `Please lengthen this text to ${min} characters or more.`,
  tooLong: (max: number) => `Please shorten this text to ${max} characters or less.`,
  badNumber: 'Please enter a valid number.',
  rangeUnderflow: (min: string) => `Value must be greater than or equal to ${min}.`,
  rangeOverflow: (max: string) => `Value must be less than or equal to ${max}.`,
  checkboxRequired: 'Please check this box if you want to proceed.',
  switchRequired: 'Please enable this option if you want to proceed.',
  radioRequired: 'Please select one of these options.',
  selectRequired: 'Please select an item in the list.',
  optionRequired: 'Please select an option.',
  chipRequired: 'Please select this option.',
  optionsRequired: 'Please select at least one option.',
  tagsRequired: 'Please add at least one tag.',
  filesRequired: 'Please select at least one file.',
  dateRequired: 'Please select a date.',
  timeRequired: 'Please select a time.',
  colorRequired: 'Please select a color.',
  ratingRequired: 'Please select a rating.',
  invalidColor: 'Enter a valid color value.',
  timeOutOfRange: 'Selected time is out of range.',
  pinIncomplete: (count: number) => `Please enter all ${count} characters.`,
  formErrors: (count: number) =>
    count === 1 ? 'Please fix 1 validation error:' : `Please fix ${count} validation errors:`,

  // Text entry and pickers
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  increment: 'Increase value',
  decrement: 'Decrease value',
  selectPlaceholder: 'Select…',
  optionsPlaceholder: 'Select options...',
  optionPlaceholder: 'Select option',
  searchPlaceholder: 'Search...',
  noMatches: 'No matches found',
  noMatchingOptions: 'No matching options.',
  noOptions: 'No options available',
  clearSelection: 'Clear selection',
  cascaderOptions: 'Cascading options',
  tagsPlaceholder: 'Add tag and press Enter...',
  clearTags: 'Clear all tags',
  tagSuggestions: 'Tag suggestions',
  range: 'Range',
  rangeMinimum: (label: string) => `${label} minimum`,
  rangeMaximum: (label: string) => `${label} maximum`,
  rating: 'Rating',
  ratingValue: (value: string, max: string) => `${value} out of ${max}`,
  verificationCode: 'Verification code',
  pinCharacter: (label: string, index: number, count: number) =>
    `${label} character ${index} of ${count}`,
  chipOptions: 'Chip options',
  moreItems: (count: number) => `${count} more`,
  characterCount: (length: string, max: string) => `${length} / ${max}`,

  // Date and time
  calendar: 'Calendar',
  clearDate: 'Clear date',
  datePlaceholder: 'Select date',
  dateRangePlaceholder: 'Start date – End date',
  timePicker: 'Time picker',
  timePlaceholder: 'Select time',
  clearTime: 'Clear time',
  hour: 'Hour',
  minute: 'Min',
  second: 'Sec',
  period: 'Period',
  am: 'AM',
  pm: 'PM',
  /** Joins a 12-hour clock time with its day period. */
  time12h: (time: string, period: string) => `${time} ${period}`,

  // Color
  colorPicker: 'Color picker',
  toggleColorPicker: 'Toggle color picker',
  colorArea: 'Color saturation and brightness',
  hue: 'Hue',
  opacity: 'Opacity',
  pickScreenColor: 'Pick color from screen',
  clearColor: 'Clear color',
  selectColor: (color: string) => `Select color ${color}`,

  // Navigation and structure
  breadcrumb: 'Breadcrumb',
  showHiddenPath: 'Show hidden path items',
  hiddenItems: (count: number) => `Show ${count} hidden items`,
  navigation: 'Navigation',
  pagination: 'Pagination',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  page: (page: string) => `Page ${page}`,
  pageOf: (page: string, count: string) => `Page ${page} of ${count}`,
  pageRange: (start: string, end: string, total: string) => `${start}–${end} of ${total}`,
  list: 'List',
  tree: 'Tree',
  toggleBranch: 'Toggle branch',
  progress: 'Progress',
  progressRing: 'Progress ring',
  progressSteps: 'Progress steps',
  segmentedControl: 'Segmented control',
  notifications: 'Notifications',
  uploadPrompt: 'Drop files here or click to browse',
  maxFileSize: (size: string) => `Max ${size}`,
  maxFiles: (count: number) => (count === 1 ? 'Up to 1 file' : `Up to ${count} files`),
  noData: 'No data',
  tileMoved: (label: string, position: string, count: string) =>
    `${label}, moved to position ${position} of ${count}`,

  // Tables and data grids
  noRecords: 'No records found',
  noFilteredRows: 'No rows match the current filter.',
  selectAllRows: 'Select all rows',
  selectRow: (row: string) => `Select row ${row}`,
  rowCount: (count: string) => `${count} rows`,
  filteredRowCount: (shown: string, total: string) => `${shown} / ${total} rows`,
  selectedRows: (summary: string, count: string) => `${summary} · ${count} selected`,
  renderedRows: (count: string) => `DOM window: ${count} rows`,

  // Command palette
  commandPlaceholder: 'Type a command or search...',
  noCommands: 'No matching commands.',
  commandCount: (count: number) => (count === 1 ? '1 command' : `${count} commands`),
  navigateHint: 'Navigate',
  runHint: 'Run',
};

/** Every message key with its English value type (a string, or a formatter function). */
export type KernoMessages = typeof enMessages;
