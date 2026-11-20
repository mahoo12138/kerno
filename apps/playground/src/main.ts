import '@kerno/tokens/tokens.css';
import '@kerno/tokens/base.css';
import './studio.css';
import '@kerno/effects/define';
import '@kerno/primitives/define';
import '@kerno/components/define';
import {
  toast,
  type CascaderOption,
  type DataGridRowClickDetail,
  type DataGridSelectionDetail,
  type DrawerPlacement,
  type FormSubmitDetail,
  type FormValidationError,
  type KAccordion,
  type KAlert,
  type KCascader,
  type KCommand,
  type KDataGrid,
  type KDialog,
  type KDrawer,
  type KForm,
  type KList,
  type KMultiSelect,
  type KNav,
  type KPagination,
  type KScrollbar,
  type KScrollView,
  type KSegmentedControl,
  type KTable,
  type KTagsInput,
  type KTile,
  type KTileGroup,
  type KTimePicker,
  type KTree,
  type KTreeItem,
  type KUpload,
  type MarkerEventDetail,
  type ScrollbarVariant,
  type TileReorderDetail,
  type ToastPlacement,
  type TrackClickMode,
} from '@kerno/components';
import {
  fadeIn,
  scaleIn,
  slideIn,
  type CornerKind,
  type ElevationLevel,
  type KSurface,
} from '@kerno/effects';
import type { KInput, KPinInput, KRating, KSelect, KSlider, KSwitch } from '@kerno/primitives';
import { applyTheme, createTheme, darkTheme, type BuiltInThemeName } from '@kerno/tokens';

// ---------------------------------------------------------------------------
// Theme Switcher
// ---------------------------------------------------------------------------
const ocean = createTheme({
  name: 'ocean',
  base: darkTheme,
  tokens: {
    color: {
      accent: {
        default: '#0d9488',
        hover: '#14b8a6',
        active: '#0f766e',
        borderHover: '#5eead4',
        disabled: 'rgba(13, 148, 136, 0.28)',
        fg: '#ffffff',
        fgDisabled: 'rgba(255, 255, 255, 0.48)',
        text: '#5eead4',
      },
      bg: { canvas: '#0b1e24', layer: '#11292f', layerAlt: '#163239' },
      status: {
        info: { fg: '#5eead4', bg: '#0c2f33', solid: '#0d9488' },
      },
    },
    radius: { md: '8px', lg: '14px' },
  },
});

let disposeTheme = (): void => {};
const themeButtons = document.querySelectorAll<HTMLElement>('#theme-switch k-button');

function selectTheme(name: string): void {
  disposeTheme();
  disposeTheme = applyTheme(name === 'ocean' ? ocean : (name as BuiltInThemeName));
  themeButtons.forEach((b) =>
    b.setAttribute('variant', b.dataset.theme === name ? 'accent' : 'standard'),
  );
}

themeButtons.forEach((b) => b.addEventListener('click', () => selectTheme(b.dataset.theme!)));
selectTheme('auto');

// ---------------------------------------------------------------------------
// Sidebar Navigation, Scroll-Spy & Start Tiles Jump Links
// ---------------------------------------------------------------------------
const sidebarNav = document.querySelector<KNav>('#sidebar-nav');
let scrollSpyLockUntil = 0;

sidebarNav?.addEventListener('k-nav-select', (e) => {
  const { value } = (e as CustomEvent<{ value: string }>).detail;
  scrollSpyLockUntil = Date.now() + 700;
  document.getElementById(`sec-${value}`)?.scrollIntoView({ behavior: 'smooth' });
});

const studioSections = document.querySelectorAll<HTMLElement>('.studio-section[id^="sec-"]');
if (sidebarNav && studioSections.length > 0 && typeof IntersectionObserver !== 'undefined') {
  const ratios = new Map<string, number>();
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const key = entry.target.id.replace(/^sec-/, '');
        ratios.set(key, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      if (Date.now() < scrollSpyLockUntil) return;
      let bestKey = '';
      let bestRatio = 0;
      for (const [key, ratio] of ratios) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestKey = key;
        }
      }
      if (bestKey && sidebarNav.value !== bestKey) {
        sidebarNav.value = bestKey;
      }
    },
    { rootMargin: '-12% 0px -45% 0px', threshold: [0, 0.2, 0.5, 0.8] },
  );
  studioSections.forEach((sec) => spy.observe(sec));
}

document.querySelectorAll<HTMLElement>('[data-jump]').forEach((tile) => {
  tile.addEventListener('click', () => {
    const id = tile.dataset.jump;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.querySelector('#hero-jump-acrylic')?.addEventListener('click', () => {
  document.getElementById('sec-acrylic')?.scrollIntoView({ behavior: 'smooth' });
});

const heroTileGroup = document.querySelector<KTileGroup>('#hero-tile-group');
const heroLaunchTile = document.querySelector<KTile>('#hero-launch-tile');
const heroTileStatus = document.querySelector<HTMLOutputElement>('#hero-tile-status');

document.querySelector('#hero-enter-desktop')?.addEventListener('click', () => {
  void heroTileGroup?.enter({ variant: 'desktop' });
});

document.querySelector('#hero-enter-mobile')?.addEventListener('click', () => {
  void heroTileGroup?.enter({ variant: 'mobile' });
});

document.querySelector('#hero-flip-launch')?.addEventListener('click', () => {
  void heroLaunchTile?.launch();
});

heroTileGroup?.addEventListener('tilereorder', (event) => {
  const { from, to, reason } = (event as CustomEvent<TileReorderDetail>).detail;
  if (heroTileStatus) {
    heroTileStatus.textContent = `Tile moved from #${from + 1} to #${to + 1} (${reason}).`;
  }
});

// ---------------------------------------------------------------------------
// Acrylic Material Lab (Live Parameters + Draggable Glass Pane + Live CSS)
// ---------------------------------------------------------------------------
const livePane = document.querySelector<KSurface>('#acrylic-live-pane')!;
const acrylicStage = document.querySelector<HTMLElement>('#acrylic-stage')!;
const shapeBadge = document.querySelector<HTMLElement>('#acrylic-shape-badge')!;
const codeOutput = document.querySelector<HTMLElement>('#acrylic-code-output')!;

const acrylicState = {
  tint: '#141416',
  fg: '#ffffff',
  tintOpacity: 0.48,
  blur: 24,
  saturation: 200,
  brightness: 95,
  noise: 0.04,
  shape: 'chamfer' as CornerKind,
  radius: 16,
  elevation: 4 as ElevationLevel,
  reveal: true,
  pressure: true,
  reduced: false,
};

function syncAcrylicLab(): void {
  const isLightTint = acrylicState.tint.toLowerCase() === '#ffffff';
  const rim = isLightTint ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.24)';

  livePane.style.color = acrylicState.fg;
  livePane.style.setProperty('--k-surface-acrylic-tint', acrylicState.tint);
  livePane.style.setProperty('--k-surface-acrylic-tint-opacity', String(acrylicState.tintOpacity));
  livePane.style.setProperty('--k-surface-acrylic-blur', `${acrylicState.blur}px`);
  livePane.style.setProperty('--k-surface-acrylic-saturation', `${acrylicState.saturation}%`);
  livePane.style.setProperty('--k-surface-acrylic-brightness', `${acrylicState.brightness}%`);
  livePane.style.setProperty('--k-surface-acrylic-noise-opacity', String(acrylicState.noise));
  livePane.style.setProperty('--k-surface-acrylic-border', rim);

  livePane.shape = acrylicState.shape;
  livePane.radius = String(acrylicState.radius);
  livePane.elevation = acrylicState.elevation;
  livePane.reveal = acrylicState.reveal;
  livePane.pressure = acrylicState.pressure;
  livePane.reducedTransparency = acrylicState.reduced;
  shapeBadge.textContent = acrylicState.shape;

  codeOutput.textContent = `<k-surface acrylic${acrylicState.reveal ? ' reveal' : ''}${acrylicState.pressure ? ' pressure' : ''}${acrylicState.reduced ? ' reduced-transparency' : ''}
  shape="${acrylicState.shape}" radius="${acrylicState.radius}" elevation="${acrylicState.elevation}">
/* CSS Custom Properties */
--k-surface-acrylic-tint: ${acrylicState.tint};
--k-surface-acrylic-tint-opacity: ${acrylicState.tintOpacity};
--k-surface-acrylic-blur: ${acrylicState.blur}px;
--k-surface-acrylic-saturation: ${acrylicState.saturation}%;
--k-surface-acrylic-brightness: ${acrylicState.brightness}%;
--k-surface-acrylic-noise-opacity: ${acrylicState.noise};`;
}

// Swatches
const swatches = document.querySelectorAll<HTMLButtonElement>('#acrylic-swatches .swatch');
swatches.forEach((btn) => {
  btn.addEventListener('click', () => {
    swatches.forEach((s) => s.setAttribute('aria-pressed', String(s === btn)));
    acrylicState.tint = btn.dataset.tint ?? '#141416';
    acrylicState.fg = btn.dataset.fg ?? '#ffffff';
    syncAcrylicLab();
  });
});

// Sliders
const bindSlider = (id: string, apply: (val: number) => void): void => {
  const slider = document.querySelector<KSlider>(id);
  slider?.addEventListener('input', () => {
    apply(slider.value);
    syncAcrylicLab();
  });
};
bindSlider('#ctrl-tint-opacity', (v) => (acrylicState.tintOpacity = v));
bindSlider('#ctrl-blur', (v) => (acrylicState.blur = v));
bindSlider('#ctrl-saturate', (v) => (acrylicState.saturation = v));
bindSlider('#ctrl-brightness', (v) => (acrylicState.brightness = v));
bindSlider('#ctrl-noise', (v) => (acrylicState.noise = v));
bindSlider('#ctrl-radius', (v) => (acrylicState.radius = v));
bindSlider('#ctrl-elevation', (v) => (acrylicState.elevation = v as ElevationLevel));

// Shape buttons
const shapeBtns = document.querySelectorAll<HTMLElement>('#ctrl-shape-buttons k-button');
shapeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    acrylicState.shape = (btn.dataset.shape as CornerKind) ?? 'chamfer';
    shapeBtns.forEach((b) => b.setAttribute('variant', b === btn ? 'accent' : 'standard'));
    syncAcrylicLab();
  });
});

// Switches
const bindSwitch = (id: string, apply: (checked: boolean) => void): void => {
  const sw = document.querySelector<KSwitch>(id);
  sw?.addEventListener('change', () => {
    apply(sw.checked);
    syncAcrylicLab();
  });
};
bindSwitch('#ctrl-reveal', (v) => (acrylicState.reveal = v));
bindSwitch('#ctrl-pressure', (v) => (acrylicState.pressure = v));
bindSwitch('#ctrl-reduced', (v) => (acrylicState.reduced = v));

// Copy CSS
const copyBtn = document.querySelector<HTMLElement>('#copy-acrylic-css');
copyBtn?.addEventListener('click', () => {
  void navigator.clipboard?.writeText(codeOutput.textContent ?? '');
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
});

// Draggable glass pane inside the Acrylic artwork stage
let dragStart: { x: number; y: number; origX: number; origY: number } | null = null;
let offsetX = 0;
let offsetY = 0;

livePane.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  dragStart = { x: event.clientX, y: event.clientY, origX: offsetX, origY: offsetY };
  livePane.classList.add('dragging');
  livePane.setPointerCapture(event.pointerId);
});

livePane.addEventListener('pointermove', (event) => {
  if (!dragStart) return;
  const stageRect = acrylicStage.getBoundingClientRect();
  const paneRect = livePane.getBoundingClientRect();
  const maxX = Math.max(0, (stageRect.width - paneRect.width) / 2 - 12);
  const maxY = Math.max(0, (stageRect.height - paneRect.height) / 2 - 12);
  offsetX = Math.max(-maxX, Math.min(maxX, dragStart.origX + (event.clientX - dragStart.x)));
  offsetY = Math.max(-maxY, Math.min(maxY, dragStart.origY + (event.clientY - dragStart.y)));
  livePane.style.left = `${Math.round(offsetX)}px`;
  livePane.style.top = `${Math.round(offsetY)}px`;
});

const endDrag = (): void => {
  dragStart = null;
  livePane.classList.remove('dragging');
};
livePane.addEventListener('pointerup', endDrag);
livePane.addEventListener('pointercancel', endDrag);

syncAcrylicLab();

// ---------------------------------------------------------------------------
// Elevation Shape Toggle & Motion Presets
// ---------------------------------------------------------------------------
const elevationCards = document.querySelectorAll<KSurface>('#elevation-grid k-surface');
document.querySelector('#elevation-shape-toggle')?.addEventListener('click', () => {
  elevationCards.forEach((s) => {
    s.shape = s.shape === 'chamfer' ? 'rounded' : 'chamfer';
  });
});

document.querySelector('#motion-fade')?.addEventListener('click', () => {
  elevationCards.forEach((card, i) => fadeIn(card, { delay: i * 35 }));
});
document.querySelector('#motion-scale')?.addEventListener('click', () => {
  elevationCards.forEach((card, i) => scaleIn(card, { delay: i * 35 }));
});
document.querySelector('#motion-slide')?.addEventListener('click', () => {
  elevationCards.forEach((card, i) => slideIn(card, { y: 12 }, { delay: i * 35 }));
});

// ---------------------------------------------------------------------------
// Fluent Scrollbar & Scroll View Studio
// ---------------------------------------------------------------------------
const pageScrollbar = document.querySelector<KScrollbar>('#page-scrollbar');
const demoScrollView = document.querySelector<KScrollView>('#demo-scroll-view');
const sbOutput = document.querySelector<HTMLOutputElement>('#scrollbar-output');

const sbVariantBtns = document.querySelectorAll<HTMLElement>('#sb-variant-buttons k-button');
const sbTrackBtns = document.querySelectorAll<HTMLElement>('#sb-track-buttons k-button');
const sbPinned = document.querySelector<KSwitch>('#sb-ctrl-pinned');
const sbButtons = document.querySelector<KSwitch>('#sb-ctrl-buttons');
const sbMarkers = document.querySelector<KSwitch>('#sb-ctrl-markers');
const sbSnap = document.querySelector<KSwitch>('#sb-ctrl-snap');
const sbSuspend = document.querySelector<KSwitch>('#sb-ctrl-suspend');

function syncScrollbarHide(): void {
  if (!demoScrollView) return;
  const hidden: string[] = [];
  if (sbButtons && !sbButtons.checked) hidden.push('button');
  if (sbMarkers && !sbMarkers.checked) hidden.push('marker', 'card');
  if (demoScrollView.variant === 'minimal') {
    if (!hidden.includes('button')) hidden.push('button');
    hidden.push('track', 'corner');
  }
  demoScrollView.hide = hidden.join(' ');
}

sbVariantBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const variant = (btn.dataset.sbVariant as ScrollbarVariant) ?? 'fluent';
    sbVariantBtns.forEach((b) => b.setAttribute('variant', b === btn ? 'accent' : 'standard'));
    if (demoScrollView) demoScrollView.variant = variant;
    if (pageScrollbar) pageScrollbar.variant = variant;
    syncScrollbarHide();
  });
});

sbTrackBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = (btn.dataset.sbTrack as TrackClickMode) ?? 'page';
    sbTrackBtns.forEach((b) => b.setAttribute('variant', b === btn ? 'accent' : 'standard'));
    if (demoScrollView) demoScrollView.trackClick = mode;
    if (pageScrollbar) pageScrollbar.trackClick = mode;
  });
});

sbPinned?.addEventListener('change', () => {
  if (demoScrollView) demoScrollView.indicator = sbPinned.checked ? 'pinned' : 'auto';
});
sbButtons?.addEventListener('change', syncScrollbarHide);
sbMarkers?.addEventListener('change', syncScrollbarHide);
sbSnap?.addEventListener('change', () => {
  if (demoScrollView) demoScrollView.snap = sbSnap.checked;
  if (pageScrollbar) pageScrollbar.snap = sbSnap.checked;
});
sbSuspend?.addEventListener('change', () => {
  if (pageScrollbar) pageScrollbar.suspended = sbSuspend.checked;
});

demoScrollView?.addEventListener('k-marker-enter', (e) => {
  const { marker } = (e as CustomEvent<MarkerEventDetail>).detail;
  if (sbOutput) sbOutput.textContent = `Marker hover: ${marker.label}`;
});
demoScrollView?.addEventListener('k-marker-activate', (e) => {
  const { marker } = (e as CustomEvent<MarkerEventDetail>).detail;
  if (sbOutput) sbOutput.textContent = `Jumped to marker: ${marker.label}`;
});
demoScrollView?.addEventListener('scroll', () => {
  if (sbOutput) {
    sbOutput.textContent = `scrollTop: ${Math.round(demoScrollView.scrollTop)}px · scrollLeft: ${Math.round(demoScrollView.scrollLeft)}px`;
  }
});

// ---------------------------------------------------------------------------
// Surface Fill & Per-Side Border Width Lab
// ---------------------------------------------------------------------------
const borderCard = document.querySelector<KSurface>('#surface-border-card');
const borderCode = document.querySelector<HTMLElement>('#surface-border-code');
const sbFillOpacity = document.querySelector<KSlider>('#sb-fill-opacity');
const sbBorderAll = document.querySelector<KSlider>('#sb-border-all');
const sbBorderTop = document.querySelector<KSlider>('#sb-border-top');
const sbBorderRight = document.querySelector<KSlider>('#sb-border-right');
const sbBorderBottom = document.querySelector<KSlider>('#sb-border-bottom');
const sbBorderLeft = document.querySelector<KSlider>('#sb-border-left');
const sbBorderRadius = document.querySelector<KSlider>('#sb-border-radius');
const sbBorderShapeBtns = document.querySelectorAll<HTMLElement>('#sb-border-shapes k-button');

function syncSurfaceBorderLab(): void {
  if (!borderCard) return;
  const fillPct = Number(sbFillOpacity?.value ?? 14);
  const all = Number(sbBorderAll?.value ?? 5);
  const top = Number(sbBorderTop?.value ?? all);
  const right = Number(sbBorderRight?.value ?? all);
  const bottom = Number(sbBorderBottom?.value ?? 7);
  const left = Number(sbBorderLeft?.value ?? all);
  const radius = Number(sbBorderRadius?.value ?? 16);

  const bg = `rgba(255, 255, 255, ${(fillPct / 100).toFixed(2)})`;
  borderCard.radius = String(radius);
  borderCard.style.setProperty('--k-surface-bg', bg);
  borderCard.style.setProperty('--k-surface-border-color', '#ffffff');
  borderCard.style.setProperty('--k-surface-border-width', `${all}px`);
  borderCard.style.setProperty('--k-surface-border-top-width', `${top}px`);
  borderCard.style.setProperty('--k-surface-border-right-width', `${right}px`);
  borderCard.style.setProperty('--k-surface-border-bottom-width', `${bottom}px`);
  borderCard.style.setProperty('--k-surface-border-left-width', `${left}px`);
  borderCard.surface.invalidate();

  if (borderCode) {
    const lines = [
      `.card {`,
      `  --k-surface-bg: ${bg};`,
      `  --k-surface-border-color: #ffffff;`,
      `  --k-surface-border-width: ${all}px;`,
    ];
    if (top !== all) lines.push(`  --k-surface-border-top-width: ${top}px;`);
    if (right !== all) lines.push(`  --k-surface-border-right-width: ${right}px;`);
    if (bottom !== all) lines.push(`  --k-surface-border-bottom-width: ${bottom}px;`);
    if (left !== all) lines.push(`  --k-surface-border-left-width: ${left}px;`);
    lines.push(`}`);
    borderCode.textContent = lines.join('\n');
  }
}

sbBorderAll?.addEventListener('input', () => {
  const v = sbBorderAll.value;
  if (sbBorderTop) sbBorderTop.value = v;
  if (sbBorderRight) sbBorderRight.value = v;
  if (sbBorderBottom) sbBorderBottom.value = v;
  if (sbBorderLeft) sbBorderLeft.value = v;
  syncSurfaceBorderLab();
});

for (const ctrl of [
  sbFillOpacity,
  sbBorderTop,
  sbBorderRight,
  sbBorderBottom,
  sbBorderLeft,
  sbBorderRadius,
]) {
  ctrl?.addEventListener('input', syncSurfaceBorderLab);
}

sbBorderShapeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const shape = (btn.dataset.borderShape as CornerKind) ?? 'rounded';
    sbBorderShapeBtns.forEach((b) => b.setAttribute('variant', b === btn ? 'accent' : 'standard'));
    if (borderCard) borderCard.shape = shape;
    syncSurfaceBorderLab();
  });
});

syncSurfaceBorderLab();

// ---------------------------------------------------------------------------
// Overlays & Modal Dialog
// ---------------------------------------------------------------------------
const dialog = document.querySelector<KDialog>('#demo-dialog')!;
const overlayOutput = document.querySelector<HTMLOutputElement>('#overlay-output')!;
document.querySelector('#open-dialog-btn')?.addEventListener('click', () => dialog.show());
document.querySelector('#hero-open-dialog')?.addEventListener('click', () => dialog.show());
dialog.addEventListener('k-open', () => {
  if (pageScrollbar) pageScrollbar.suspended = true;
});
dialog.addEventListener('k-close', () => {
  if (pageScrollbar && !sbSuspend?.checked) pageScrollbar.suspended = false;
});
document.querySelector('#dialog-cancel')?.addEventListener('click', () => dialog.close());
document.querySelector('#dialog-confirm')?.addEventListener('click', () => {
  overlayOutput.textContent = 'Dialog confirmed.';
  dialog.close();
});
document.addEventListener('k-select', (e) => {
  const detail = (e as CustomEvent<{ value: string }>).detail;
  overlayOutput.textContent = `Menu selected: ${detail.value}`;
});
document.addEventListener('k-nav-select', (e) => {
  const detail = (e as CustomEvent<{ value: string }>).detail;
  overlayOutput.textContent = `Nav selected: ${detail.value}`;
});

// ---------------------------------------------------------------------------
// Data Table
// ---------------------------------------------------------------------------
interface PackageRow extends Record<string, unknown> {
  pkg: string;
  layer: string;
  components: number;
  status: string;
}

const table = document.querySelector<KTable<PackageRow>>('#demo-table')!;
table.columns = [
  { key: 'pkg', title: 'Package', sortable: true },
  { key: 'layer', title: 'Architecture Layer', sortable: true },
  { key: 'components', title: 'Modules', align: 'right', sortable: true },
  {
    key: 'status',
    title: 'Status',
    render: (value) => {
      const badge = document.createElement('k-badge');
      badge.setAttribute('variant', 'success');
      badge.setAttribute('pill', '');
      badge.textContent = String(value);
      return badge;
    },
  },
];
table.data = [
  { pkg: '@kerno/tokens', layer: 'Design Tokens & Theme Engine', components: 10, status: 'Ready' },
  {
    pkg: '@kerno/core',
    layer: 'Runtime, Forms & Top-Layer Overlay Manager',
    components: 8,
    status: 'Ready',
  },
  {
    pkg: '@kerno/effects',
    layer: 'Shape, Surface, Acrylic, Reveal, Pressure, Motion',
    components: 7,
    status: 'Ready',
  },
  {
    pkg: '@kerno/primitives',
    layer: 'Atomic Controls, Textarea, NumberInput, PinInput, Rating & Avatar',
    components: 15,
    status: 'Ready',
  },
  {
    pkg: '@kerno/components',
    layer: 'Overlays, Feedback, Pickers, MultiSelect, Tags, Form & DataGrid',
    components: 33,
    status: 'Ready',
  },
];

// ---------------------------------------------------------------------------
// Form Association Demo
// ---------------------------------------------------------------------------
const form = document.querySelector<HTMLFormElement>('#demo-form')!;
const output = document.querySelector<HTMLOutputElement>('#form-output')!;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form, event.submitter);
  output.textContent = JSON.stringify(Object.fromEntries(data));
});
form.addEventListener('reset', () => {
  output.textContent = 'Form reset.';
});

const fieldset = document.querySelector<HTMLFieldSetElement>('#fs')!;
document.querySelector('#fs-toggle')?.addEventListener('click', () => {
  fieldset.disabled = !fieldset.disabled;
});

// ---------------------------------------------------------------------------
// Section 8: Alerts, Top-Layer Toasts, Drawers & Command Palette
// ---------------------------------------------------------------------------
const feedbackOut = document.querySelector<HTMLOutputElement>('#feedback-output');
const toastPlacementSelect = document.querySelector<KSelect>('#toast-placement-select');
const toastAcrylicToggle = document.querySelector<KSwitch>('#toast-acrylic-toggle');

const currentToastOpts = () => ({
  placement: (toastPlacementSelect?.value || 'bottom-end') as ToastPlacement,
  acrylic: Boolean(toastAcrylicToggle?.checked),
});

document.querySelector('#alert-reset-btn')?.addEventListener('click', () => {
  document.querySelectorAll<KAlert>('#alert-gallery k-alert').forEach((a) => {
    a.open = true;
  });
  if (feedbackOut) feedbackOut.textContent = 'All closed alerts restored.';
});

document.querySelector('#toast-info-btn')?.addEventListener('click', () => {
  toast.info('Sync Scheduled', {
    ...currentToastOpts(),
    description: 'Design tokens synchronized across shadow roots.',
  });
});

document.querySelector('#toast-success-btn')?.addEventListener('click', () => {
  toast.success('Deployment Complete', {
    ...currentToastOpts(),
    description: 'Kerno bundle published with zero runtime dependencies.',
  });
});

document.querySelector('#toast-warning-btn')?.addEventListener('click', () => {
  toast.warning('High Contrast Mode', {
    ...currentToastOpts(),
    description: 'Hover over this toast to pause auto-dismiss countdown.',
    duration: 5000,
  });
});

document.querySelector('#toast-danger-btn')?.addEventListener('click', () => {
  toast.danger('Upload Interrupted', {
    ...currentToastOpts(),
    description: 'Network link dropped while streaming asset chunks.',
  });
});

document.querySelector('#toast-action-btn')?.addEventListener('click', () => {
  const handle = toast.show({
    ...currentToastOpts(),
    variant: 'info',
    title: 'Archived 3 components',
    description: 'Click Undo before the timer finishes (hover pauses timer).',
    duration: 6000,
    actionLabel: 'Undo',
    onAction: () => {
      if (feedbackOut) feedbackOut.textContent = 'Toast Undo action triggered!';
      handle.dismiss();
    },
  });
});

document.querySelector('#toast-clear-btn')?.addEventListener('click', () => {
  toast.clear();
  if (feedbackOut) feedbackOut.textContent = 'Cleared active toast stack.';
});

const drawer = document.querySelector<KDrawer>('#demo-drawer');
const openDrawer = (placement: DrawerPlacement, label: string, acrylic = true): void => {
  if (!drawer) return;
  drawer.placement = placement;
  drawer.label = label;
  drawer.acrylic = acrylic;
  drawer.show();
};

drawer?.addEventListener('k-open', () => {
  if (pageScrollbar) pageScrollbar.suspended = true;
});
drawer?.addEventListener('k-close', () => {
  if (pageScrollbar && !sbSuspend?.checked) pageScrollbar.suspended = false;
});

document
  .querySelector('#drawer-right-btn')
  ?.addEventListener('click', () => openDrawer('right', 'Surface Inspector', true));
document
  .querySelector('#drawer-left-btn')
  ?.addEventListener('click', () => openDrawer('left', 'Navigation Drawer', false));
document
  .querySelector('#drawer-bottom-btn')
  ?.addEventListener('click', () => openDrawer('bottom', 'Bottom Sheet Actions', true));
document
  .querySelector('#drawer-top-btn')
  ?.addEventListener('click', () => openDrawer('top', 'Command Banner', false));
document.querySelector('#drawer-cancel')?.addEventListener('click', () => drawer?.close());
document.querySelector('#drawer-apply')?.addEventListener('click', () => {
  drawer?.close();
  toast.success('Inspector Applied', currentToastOpts());
});

const studioCmd = document.querySelector<KCommand>('#studio-command');
const openCommandPalette = (): void => {
  studioCmd?.show();
};
document.querySelector('#sidebar-open-command')?.addEventListener('click', openCommandPalette);
document.querySelector('#open-command-btn')?.addEventListener('click', openCommandPalette);
document.querySelector('#alert-open-cmd')?.addEventListener('click', openCommandPalette);

studioCmd?.addEventListener('k-open', () => {
  if (pageScrollbar) pageScrollbar.suspended = true;
});
studioCmd?.addEventListener('k-close', () => {
  if (pageScrollbar && !sbSuspend?.checked) pageScrollbar.suspended = false;
});

studioCmd?.addEventListener('k-command-select', (event) => {
  const { value } = (event as CustomEvent<{ value: string }>).detail;
  if (feedbackOut) feedbackOut.textContent = `Command executed: ${value}`;

  if (value.startsWith('theme:')) {
    selectTheme(value.slice(6));
    toast.info(`Theme switched to ${value.slice(6)}`, currentToastOpts());
  } else if (value.startsWith('jump:')) {
    const id = value.slice(5);
    scrollSpyLockUntil = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  } else if (value === 'action:drawer') {
    openDrawer('right', 'Surface Inspector', true);
  } else if (value === 'action:toast') {
    toast.success('Triggered from Command Palette', currentToastOpts());
  } else if (value === 'action:dialog') {
    dialog.show();
  }
});

// ---------------------------------------------------------------------------
// Section 9: Breadcrumbs, Accordion & Pagination Live Data
// ---------------------------------------------------------------------------
document.querySelector('#demo-breadcrumb')?.addEventListener('k-breadcrumb-select', (event) => {
  const { href } = (event as CustomEvent<{ href: string }>).detail;
  if (href.startsWith('#')) {
    event.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  }
});

const accordion = document.querySelector<KAccordion>('#demo-accordion');
const accMultiple = document.querySelector<KSwitch>('#acc-multiple-toggle');
const accCollapsible = document.querySelector<KSwitch>('#acc-collapsible-toggle');
accMultiple?.addEventListener('change', () => {
  if (accordion) accordion.multiple = accMultiple.checked;
});
accCollapsible?.addEventListener('change', () => {
  if (accordion) accordion.collapsible = accCollapsible.checked;
});

const demoPagination = document.querySelector<KPagination>('#demo-pagination');
const paginationPreview = document.querySelector<HTMLDivElement>('#pagination-preview');
const ALL_CATALOG_ITEMS = Array.from({ length: 48 }, (_, i) => ({
  id: i + 1,
  name: [
    'Surface',
    'Acrylic',
    'Reveal',
    'Pressure',
    'Shape',
    'Tile',
    'Dialog',
    'Drawer',
    'Toast',
    'Alert',
    'Command',
    'Avatar',
  ][i % 12]!,
  tag: ['Effects', 'Overlay', 'Feedback', 'Navigation'][i % 4]!,
}));

function renderPaginatedItems(page: number, pageSize: number): void {
  if (!paginationPreview) return;
  const start = (page - 1) * pageSize;
  const slice = ALL_CATALOG_ITEMS.slice(start, start + pageSize);
  paginationPreview.innerHTML = slice
    .map(
      (item) => `
      <div style="padding:10px 12px;border:1px solid var(--k-color-stroke-default);background:var(--k-color-bg-layer-alt);display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:500">#${item.id} ${item.name}</span>
        <k-badge>${item.tag}</k-badge>
      </div>`,
    )
    .join('');
}

if (demoPagination) {
  renderPaginatedItems(demoPagination.page, demoPagination.pageSize);
  demoPagination.addEventListener('k-page-change', (event) => {
    const { page, pageSize } = (event as CustomEvent<{ page: number; pageSize: number }>).detail;
    renderPaginatedItems(page, pageSize);
  });
}

// ---------------------------------------------------------------------------
// Section 10: Advanced Data Entry Lab
// ---------------------------------------------------------------------------
const dataEntryForm = document.querySelector<HTMLFormElement>('#data-entry-form');
const dataEntryOutput = document.querySelector<HTMLOutputElement>('#data-entry-output');
const demoUpload = document.querySelector<KUpload>('#demo-upload');

dataEntryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(dataEntryForm);
  const summary: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    const val = v instanceof File ? `File(${v.name}, ${v.size}B)` : v;
    if (k in summary) {
      const prev = summary[k];
      summary[k] = Array.isArray(prev) ? [...prev, val] : [prev, val];
    } else {
      summary[k] = val;
    }
  }
  if (dataEntryOutput) dataEntryOutput.textContent = JSON.stringify(summary);
});

dataEntryForm?.addEventListener('reset', () => {
  if (dataEntryOutput) dataEntryOutput.textContent = 'Data entry form reset.';
});

demoUpload?.addEventListener('k-upload-reject', (event) => {
  const { file, reason } = (event as CustomEvent<{ file: File; reason: string }>).detail;
  toast.warning('File Rejected', {
    ...currentToastOpts(),
    description: `${file.name} rejected (${reason}).`,
  });
});

document.querySelector('#simulate-upload-btn')?.addEventListener('click', () => {
  if (!demoUpload) return;
  const sample = new File(
    ['# Kerno Release Manifest\nAll Wave 2 modules verified.\n'],
    `kerno-report-${demoUpload.files.length + 1}.md`,
    { type: 'text/markdown' },
  );
  const [entry] = demoUpload.addFiles([sample]);
  if (!entry) return;
  let pct = 20;
  demoUpload.setFileProgress(entry.id, pct);
  const timer = setInterval(() => {
    pct += 25;
    if (pct >= 100) {
      clearInterval(timer);
      demoUpload.setFileStatus(entry.id, 'done');
    } else {
      demoUpload.setFileProgress(entry.id, pct);
    }
  }, 180);
});

// ---------------------------------------------------------------------------
// Section 11: Tree, List & Enhanced Table
// ---------------------------------------------------------------------------
const demoTree = document.querySelector<KTree>('#demo-tree');
const treeOut = document.querySelector<HTMLOutputElement>('#tree-output');
const treeCheckableToggle = document.querySelector<KSwitch>('#tree-checkable-toggle');

treeCheckableToggle?.addEventListener('change', () => {
  if (demoTree) demoTree.checkable = treeCheckableToggle.checked;
});

demoTree?.addEventListener('k-tree-check', (event) => {
  const { checkedValues } = (event as CustomEvent<{ checkedValues: string[] }>).detail;
  if (treeOut) treeOut.textContent = `Checked: ${checkedValues.join(', ') || 'none'}`;
});

demoTree?.addEventListener('k-tree-select', (event) => {
  const { selectedValues } = (event as CustomEvent<{ selectedValues: string[] }>).detail;
  if (treeOut) treeOut.textContent = `Selected: ${selectedValues.join(', ') || 'none'}`;
});

demoTree?.addEventListener('k-tree-load', (event) => {
  const { item } = (event as CustomEvent<{ value: string; item: KTreeItem }>).detail;
  setTimeout(() => {
    const childA = document.createElement('k-tree-item');
    childA.setAttribute('value', 'plugin-acrylic');
    childA.setAttribute('label', 'plugin-acrylic-presets');
    const childB = document.createElement('k-tree-item');
    childB.setAttribute('value', 'plugin-icons');
    childB.setAttribute('label', 'plugin-mdl2-icons');
    item.append(childA, childB);
    item.loading = false;
    item.lazy = false;
    if (treeOut) treeOut.textContent = 'Loaded 2 remote plugin nodes.';
  }, 350);
});

const demoList = document.querySelector<KList>('#demo-list');
const listOut = document.querySelector<HTMLOutputElement>('#list-output');
const listMultiToggle = document.querySelector<KSwitch>('#list-multi-toggle');

listMultiToggle?.addEventListener('change', () => {
  if (demoList) demoList.selection = listMultiToggle.checked ? 'multiple' : 'single';
});

demoList?.addEventListener('k-list-select', (event) => {
  const { selectedValues } = (event as CustomEvent<{ selectedValues: string[] }>).detail;
  if (listOut) listOut.textContent = `Selected: ${selectedValues.join(', ') || 'none'}`;
});

interface CatalogRow extends Record<string, unknown> {
  id: string;
  tag: string;
  category: string;
  form: string;
}

const enhancedTable = document.querySelector<KTable<CatalogRow>>('#enhanced-table');
const tableFilterInput = document.querySelector<KInput>('#table-filter-input');
const tableSelOut = document.querySelector<HTMLOutputElement>('#table-selection-output');

if (enhancedTable) {
  enhancedTable.columns = [
    { key: 'tag', title: 'Tag', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    {
      key: 'form',
      title: 'Form Associated',
      render: (val) => {
        const badge = document.createElement('k-badge');
        badge.setAttribute('variant', val === 'Yes' ? 'accent' : 'neutral');
        badge.textContent = String(val);
        return badge;
      },
    },
  ];
  enhancedTable.data = [
    { id: 'textarea', tag: '<k-textarea>', category: 'Data Entry', form: 'Yes' },
    { id: 'number', tag: '<k-number-input>', category: 'Data Entry', form: 'Yes' },
    { id: 'autocomplete', tag: '<k-autocomplete>', category: 'Data Entry', form: 'Yes' },
    { id: 'datepicker', tag: '<k-date-picker>', category: 'Data Entry', form: 'Yes' },
    { id: 'upload', tag: '<k-upload>', category: 'Data Entry', form: 'Yes' },
    { id: 'tree', tag: '<k-tree>', category: 'Data Display', form: 'No' },
    { id: 'list', tag: '<k-list>', category: 'Data Display', form: 'No' },
    { id: 'command', tag: '<k-command>', category: 'Overlay', form: 'No' },
  ];

  enhancedTable.addEventListener('k-selection-change', (event) => {
    const { selectedKeys } = (event as CustomEvent<{ selectedKeys: string[] }>).detail;
    if (tableSelOut) {
      tableSelOut.textContent = `Selected rows (${selectedKeys.length}): ${selectedKeys.join(', ') || 'none'}`;
    }
  });
}

tableFilterInput?.addEventListener('input', () => {
  if (enhancedTable) enhancedTable.filter = tableFilterInput.value;
});
tableFilterInput?.addEventListener('k-clear', () => {
  if (enhancedTable) enhancedTable.filter = '';
});

// ---------------------------------------------------------------------------
// Section 12: Time Picker, Cascader & Orchestrated Form
// ---------------------------------------------------------------------------
const demoTime24 = document.querySelector<KTimePicker>('#demo-time-24');
const demoTime12 = document.querySelector<KTimePicker>('#demo-time-12');
const timePickerOut = document.querySelector<HTMLOutputElement>('#time-picker-output');

const syncTimeOut = (): void => {
  if (timePickerOut) {
    timePickerOut.textContent = `24h: ${demoTime24?.value || '—'} · 12h: ${demoTime12?.value || '—'}`;
  }
};
demoTime24?.addEventListener('k-time-change', syncTimeOut);
demoTime12?.addEventListener('k-time-change', syncTimeOut);

const CLUSTER_TREE: readonly CascaderOption[] = [
  {
    value: 'apac',
    label: 'Asia Pacific',
    children: [
      {
        value: 'tokyo',
        label: 'Tokyo (ap-northeast-1)',
        children: [
          { value: 'edge-a', label: 'edge-a · Primary' },
          { value: 'edge-b', label: 'edge-b · Failover' },
        ],
      },
      {
        value: 'singapore',
        label: 'Singapore (ap-southeast-1)',
        children: [
          { value: 'core-1', label: 'core-1 · Compute' },
          { value: 'core-2', label: 'core-2 · Analytics' },
        ],
      },
      {
        value: 'hangzhou',
        label: 'Hangzhou (cn-east-1)',
        children: [
          { value: 'mesh-1', label: 'mesh-1 · Gateway' },
          { value: 'mesh-2', label: 'mesh-2 · Vault', disabled: true },
        ],
      },
    ],
  },
  {
    value: 'americas',
    label: 'Americas',
    children: [
      {
        value: 'us-west',
        label: 'Oregon (us-west-2)',
        children: [
          { value: 'prod-a', label: 'prod-a · Primary' },
          { value: 'prod-b', label: 'prod-b · Staging' },
        ],
      },
      {
        value: 'us-east',
        label: 'Virginia (us-east-1)',
        children: [
          { value: 'core-east', label: 'core-east · Global' },
          { value: 'canary', label: 'canary · Lab' },
        ],
      },
    ],
  },
  {
    value: 'emea',
    label: 'Europe & EMEA',
    children: [
      {
        value: 'frankfurt',
        label: 'Frankfurt (eu-central-1)',
        children: [
          { value: 'eu-prod', label: 'eu-prod · Sovereign' },
          { value: 'eu-dr', label: 'eu-dr · Cold Standby' },
        ],
      },
    ],
  },
];

const demoCascader = document.querySelector<KCascader>('#demo-cascader');
const cascaderOut = document.querySelector<HTMLOutputElement>('#cascader-output');
const cascaderHoverToggle = document.querySelector<KSwitch>('#cascader-hover-toggle');
const cascaderBranchToggle = document.querySelector<KSwitch>('#cascader-branch-toggle');

if (demoCascader) {
  demoCascader.options = CLUSTER_TREE;
  demoCascader.addEventListener('k-cascader-change', (event) => {
    const { value, options } = (event as CustomEvent<{ value: string; options: CascaderOption[] }>)
      .detail;
    if (cascaderOut) {
      cascaderOut.textContent = value
        ? `Path: ${value} (${options.map((o) => o.label).join(' → ')})`
        : 'Cleared.';
    }
  });
}

cascaderHoverToggle?.addEventListener('change', () => {
  if (demoCascader) demoCascader.expandTrigger = cascaderHoverToggle.checked ? 'hover' : 'click';
});
cascaderBranchToggle?.addEventListener('change', () => {
  if (demoCascader) demoCascader.changeOnSelect = cascaderBranchToggle.checked;
});

const orchestratedForm = document.querySelector<KForm>('#orchestrated-form');
const kformCascader = document.querySelector<KCascader>('#kform-cascader');
const kformLoadingToggle = document.querySelector<KSwitch>('#kform-loading-toggle');
const kformOut = document.querySelector<HTMLOutputElement>('#kform-output');

if (kformCascader) {
  kformCascader.options = CLUSTER_TREE;
}

kformLoadingToggle?.addEventListener('change', () => {
  if (orchestratedForm) orchestratedForm.loading = kformLoadingToggle.checked;
});

orchestratedForm?.addEventListener('k-submit', (event) => {
  const { values } = (event as CustomEvent<FormSubmitDetail>).detail;
  if (kformOut) kformOut.textContent = `Scheduled: ${JSON.stringify(values)}`;
  toast.success('Release Scheduled', {
    ...currentToastOpts(),
    description: `${String(values.release)} → ${String(values.cluster)} at ${String(values.window)}`,
  });
});

orchestratedForm?.addEventListener('k-invalid', (event) => {
  const { errors } = (event as CustomEvent<{ errors: FormValidationError[] }>).detail;
  if (kformOut) {
    kformOut.textContent = `Validation blocked (${errors.length} error${errors.length === 1 ? '' : 's'}): ${errors.map((e) => e.label).join(', ')}`;
  }
});

orchestratedForm?.addEventListener('k-reset', () => {
  if (kformOut) kformOut.textContent = 'Deployment form reset.';
});

// ---------------------------------------------------------------------------
// Section 13: High-Performance Virtualized DataGrid (10,000 Rows)
// ---------------------------------------------------------------------------
interface TelemetryRow extends Record<string, unknown> {
  id: string;
  service: string;
  region: string;
  latency: number;
  status: 'Healthy' | 'Degraded' | 'Warning';
  owner: string;
}

const SERVICES = [
  'auth-gateway',
  'surface-compositor',
  'acrylic-pipeline',
  'token-compiler',
  'telemetry-ingest',
  'search-indexer',
  'edge-router',
  'billing-ledger',
  'session-vault',
  'media-transcoder',
] as const;
const REGIONS = [
  'ap-northeast-1',
  'ap-southeast-1',
  'us-west-2',
  'us-east-1',
  'eu-central-1',
] as const;
const OWNERS = ['Ada L.', 'Grace H.', '林徽因', 'Alan T.', 'Donald K.', 'Barbara L.'] as const;

function generateTelemetryRows(count: number): TelemetryRow[] {
  const rows: TelemetryRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const latency = 8 + ((i * 37) % 240);
    const status: TelemetryRow['status'] =
      latency > 200 ? 'Warning' : latency > 140 ? 'Degraded' : 'Healthy';
    rows[i] = {
      id: `SVC-${String(i + 1).padStart(5, '0')}`,
      service: `${SERVICES[i % SERVICES.length]}-${String((i % 24) + 1).padStart(2, '0')}`,
      region: REGIONS[(i * 3) % REGIONS.length]!,
      latency,
      status,
      owner: OWNERS[(i * 7) % OWNERS.length]!,
    };
  }
  return rows;
}

const demoDataGrid = document.querySelector<KDataGrid<TelemetryRow>>('#demo-data-grid');
const gridFilterInput = document.querySelector<KInput>('#grid-filter-input');
const datagridOut = document.querySelector<HTMLOutputElement>('#datagrid-output');
const scaleButtons = document.querySelectorAll<HTMLElement>('#datagrid-scale-buttons k-button');

if (demoDataGrid) {
  demoDataGrid.columns = [
    { key: 'id', title: 'Node ID', width: 120, minWidth: 96, sortable: true, resizable: true },
    {
      key: 'service',
      title: 'Service',
      width: 210,
      minWidth: 140,
      sortable: true,
      resizable: true,
    },
    { key: 'region', title: 'Region', width: 150, minWidth: 110, sortable: true, resizable: true },
    {
      key: 'latency',
      title: 'P95 (ms)',
      width: 110,
      minWidth: 85,
      align: 'right',
      sortable: true,
      resizable: true,
      render: (value) => `${String(value)} ms`,
    },
    {
      key: 'status',
      title: 'Status',
      width: 120,
      minWidth: 96,
      sortable: true,
      resizable: true,
      render: (value) => {
        const badge = document.createElement('k-badge');
        const variant =
          value === 'Healthy' ? 'success' : value === 'Degraded' ? 'warning' : 'danger';
        badge.setAttribute('variant', variant);
        badge.setAttribute('pill', '');
        badge.textContent = String(value);
        return badge;
      },
    },
    { key: 'owner', title: 'Owner', minWidth: 110, sortable: true, resizable: true },
  ];
  demoDataGrid.data = generateTelemetryRows(10_000);

  demoDataGrid.addEventListener('k-selection-change', (event) => {
    const { selectedKeys } = (event as CustomEvent<DataGridSelectionDetail<TelemetryRow>>).detail;
    if (datagridOut) {
      const preview = selectedKeys.slice(0, 4).join(', ');
      datagridOut.textContent =
        selectedKeys.length > 0
          ? `Selected ${selectedKeys.length} row(s): ${preview}${selectedKeys.length > 4 ? '…' : ''}`
          : 'Selection cleared.';
    }
  });

  demoDataGrid.addEventListener('k-row-click', (event) => {
    const { row } = (event as CustomEvent<DataGridRowClickDetail<TelemetryRow>>).detail;
    if (datagridOut) {
      datagridOut.textContent = `Focused ${row.id} · ${row.service} (${row.region}, ${row.latency} ms)`;
    }
  });

  demoDataGrid.addEventListener('k-column-resize', (event) => {
    const { key, width } = (event as CustomEvent<{ key: string; width: number }>).detail;
    if (datagridOut) {
      datagridOut.textContent = `Resized column "${key}" to ${width}px.`;
    }
  });
}

scaleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const count = Number(btn.dataset.gridRows ?? 10_000);
    scaleButtons.forEach((b) => b.setAttribute('variant', b === btn ? 'accent' : 'standard'));
    if (demoDataGrid) {
      demoDataGrid.selectedKeys = [];
      demoDataGrid.data = generateTelemetryRows(count);
    }
    if (datagridOut) {
      datagridOut.textContent = `Loaded ${count.toLocaleString()} virtualized telemetry rows.`;
    }
  });
});

gridFilterInput?.addEventListener('input', () => {
  if (demoDataGrid) demoDataGrid.filter = gridFilterInput.value;
});
gridFilterInput?.addEventListener('k-clear', () => {
  if (demoDataGrid) demoDataGrid.filter = '';
});

// ---------------------------------------------------------------------------
// Section 14: Mantine-Inspired Inputs & Multi-Select Lab
// ---------------------------------------------------------------------------
const demoSegmented = document.querySelector<KSegmentedControl>('#demo-segmented');
const demoSegmentedSurface = document.querySelector<KSegmentedControl>('#demo-segmented-surface');
const segmentedVertToggle = document.querySelector<KSwitch>('#segmented-vertical-toggle');
const segmentedOut = document.querySelector<HTMLOutputElement>('#segmented-output');

const syncSegmentedOut = (): void => {
  if (segmentedOut) {
    segmentedOut.textContent = `Mode: ${demoSegmented?.value || '—'} · Range: ${demoSegmentedSurface?.value || '—'}`;
  }
};
demoSegmented?.addEventListener('k-change', syncSegmentedOut);
demoSegmentedSurface?.addEventListener('k-change', syncSegmentedOut);
segmentedVertToggle?.addEventListener('change', () => {
  if (demoSegmented) {
    demoSegmented.orientation = segmentedVertToggle.checked ? 'vertical' : 'horizontal';
  }
});

const demoPin = document.querySelector<KPinInput>('#demo-pin-input');
const pinMaskToggle = document.querySelector<KSwitch>('#pin-mask-toggle');
const demoRating = document.querySelector<KRating>('#demo-rating');
const ratingBadge = document.querySelector<HTMLElement>('#rating-badge');
const pinRatingOut = document.querySelector<HTMLOutputElement>('#pin-rating-output');

const syncPinRatingOut = (): void => {
  if (ratingBadge && demoRating)
    ratingBadge.textContent = `${demoRating.value} / ${demoRating.count}`;
  if (pinRatingOut) {
    pinRatingOut.textContent = `PIN: ${demoPin?.value || '—'} · Rating: ${demoRating?.value ?? 0} / ${demoRating?.count ?? 5}`;
  }
};
demoPin?.addEventListener('input', syncPinRatingOut);
demoPin?.addEventListener('k-complete', (event) => {
  const { value } = (event as CustomEvent<{ value: string }>).detail;
  toast.success('2FA Verified', {
    ...currentToastOpts(),
    description: `One-time code ${value} accepted.`,
  });
});
pinMaskToggle?.addEventListener('change', () => {
  if (demoPin) demoPin.mask = pinMaskToggle.checked;
});
demoRating?.addEventListener('k-rating-change', syncPinRatingOut);

const demoTags = document.querySelector<KTagsInput>('#demo-tags-input');
const tagsOut = document.querySelector<HTMLOutputElement>('#tags-output');
if (demoTags) {
  demoTags.suggestions = [
    'Web Components',
    'Shadow DOM',
    'Zero Deps',
    'Fluent 1',
    'Acrylic',
    'Top Layer',
    'Reveal Highlight',
    'ElementInternals',
    'WAI-ARIA',
  ];
  demoTags.addEventListener('k-tags-change', (event) => {
    const { values } = (event as CustomEvent<{ values: string[] }>).detail;
    if (tagsOut) {
      tagsOut.textContent = `Tags (${values.length}): ${values.join(', ') || 'none'}`;
    }
  });
}

const demoMultiSelect = document.querySelector<KMultiSelect>('#demo-multi-select');
const msHidePickedToggle = document.querySelector<KSwitch>('#ms-hide-picked-toggle');
const msOut = document.querySelector<HTMLOutputElement>('#multiselect-output');

msHidePickedToggle?.addEventListener('change', () => {
  if (demoMultiSelect) demoMultiSelect.hidePickedOptions = msHidePickedToggle.checked;
});
demoMultiSelect?.addEventListener('k-multi-select-change', (event) => {
  const { values } = (event as CustomEvent<{ values: string[] }>).detail;
  if (msOut) {
    msOut.textContent = `Picked (${values.length}): ${values.join(', ') || 'none'}`;
  }
});
