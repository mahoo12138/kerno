import '@kerno/tokens/tokens.css';
import '@kerno/tokens/base.css';
import './studio.css';
import '@kerno/effects/define';
import '@kerno/primitives/define';
import '@kerno/components/define';
import {
  toast,
  type DrawerPlacement,
  type KAccordion,
  type KAlert,
  type KCommand,
  type KDialog,
  type KDrawer,
  type KNav,
  type KPagination,
  type KScrollbar,
  type KScrollView,
  type KTable,
  type KTile,
  type KTileGroup,
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
import type { KSelect, KSlider, KSwitch } from '@kerno/primitives';
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
    layer: 'Atomic Controls, Avatar, Slider & Icons',
    components: 11,
    status: 'Ready',
  },
  {
    pkg: '@kerno/components',
    layer: 'Overlays, Feedback, Navigation, Tiles & Data Display',
    components: 21,
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
