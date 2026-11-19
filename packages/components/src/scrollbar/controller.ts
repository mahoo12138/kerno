import { isServer } from '@kerno/core';
import { prefersReducedMotion } from '@kerno/effects/motion';
import {
  FOLLOW_TAU,
  SMOOTH_TAU,
  buttonGlyphPath,
  dragTo,
  follow,
  followThumb,
  jumpTo,
  layoutAt,
  layoutAxis,
  markerAnchor,
  markerOffset,
  pageDirection,
  pageStep,
  parseCssLengthPx,
  parseCssTimeMs,
  physical,
  placeCard,
  snap,
  snapLayout,
  type AxisLayout,
  type GlyphDirection,
  type GlyphShape,
  type ShownThumb,
} from './geometry.js';
import { Glide } from './glide.js';
import type { ScrollTarget } from './target.js';
import {
  AXES,
  type Axis,
  type AxisVisibility,
  type HidePart,
  type IndicatorMode,
  type MarkerAlign,
  type MarkerEventDetail,
  type Placement,
  type ScrollMarker,
  type ScrollMarkerInput,
  type ScrollbarVariant,
  type TouchMode,
  type TrackClickMode,
} from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CLICK_SLOP = 4;
const JUMP_TIME = 300;
const JUMP_SLOP = 5;
const TOUCH_DEADZONE = 5;
const TOUCH_SLOPE = 1.5;
const RESYNC = 2;

type IndicatorKind = 'none' | 'mouse' | 'touch';
type Region = 'thumb' | 'button-start' | 'button-end' | 'track' | null;

export interface ScrollbarControllerOptions {
  host: HTMLElement;
  root: ShadowRoot;
  target: ScrollTarget;
  frame: HTMLElement;
  cards: HTMLElement;
  viewport: HTMLElement | null;
}

interface BarDom {
  axis: Axis;
  root: HTMLDivElement;
  trackBg: HTMLDivElement;
  buttonStart: HTMLDivElement;
  buttonStartPath: SVGPathElement;
  buttonEnd: HTMLDivElement;
  buttonEndPath: SVGPathElement;
  area: HTMLDivElement;
  thumb: HTMLDivElement;
  markers: HTMLDivElement;
}

interface PlacedMarker {
  marker: ScrollMarker;
  contentPosition: number;
  anchor: number;
  offset: number;
  shown: number | null;
  slot: HTMLDivElement;
  el: HTMLDivElement;
  members: PlacedMarker[];
  leader: boolean;
  lastTransform: string;
}

interface AxisRuntime {
  displayed: boolean;
  layout: AxisLayout | null;
  shown: ShownThumb | null;
  thickness: number;
  origin: number;
  hover: boolean;
  near: boolean;
  pressed: boolean;
  hoveredRegion: Region;
  pressedRegion: Region;
  markers: PlacedMarker[];
  hoveredMarker: PlacedMarker | null;
  pressedMarker: PlacedMarker | null;
}

interface ActivePress {
  axis: Axis;
  mode: 'marker' | 'drag' | 'button' | 'page' | 'jump' | 'touch';
  pointerId: number;
  touch: boolean;
  time: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  travel: number;
  startAlong: number;
  startPosition: number;
  written: number | null;
  dir: -1 | 0 | 1;
  marker: PlacedMarker | null;
  over: boolean;
  intent: 'undetermined' | 'along' | 'across';
}

interface HoverCardSlot {
  el: HTMLDivElement;
  content: HTMLDivElement;
  markerId: string | null;
  timer: number | null;
}

interface ParsedTokens {
  scrollSmoothing: number;
  thumbSmoothing: number;
  idleDelay: number;
  touchIdleDelay: number;
  cardDelay: number;
  repeatDelay: number;
  repeatInterval: number;
  line: number;
  hotzoneRaw: string;
  markerSpacing: number;
  markerReach: number;
  cardGap: number;
  fadeOut: number;
}

const DEFAULT_TOKENS: ParsedTokens = {
  scrollSmoothing: SMOOTH_TAU,
  thumbSmoothing: FOLLOW_TAU,
  idleDelay: 2500,
  touchIdleDelay: 500,
  cardDelay: 320,
  repeatDelay: 250,
  repeatInterval: 50,
  line: 40,
  hotzoneRaw: '4px',
  markerSpacing: 6,
  markerReach: 12,
  cardGap: 10,
  fadeOut: 167,
};

function swallowNextClick(): void {
  const stop = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
  };
  const cleanup = (): void => {
    window.removeEventListener('click', stop, true);
  };
  window.addEventListener('click', stop, true);
  window.setTimeout(cleanup, 0);
}

function pointInEl(el: HTMLElement | null, x: number, y: number): boolean {
  if (!el || el.style.display === 'none') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

const roundPx = (n: number): string => `${Math.round(n * 100) / 100}px`;

export class ScrollbarController {
  readonly #host: HTMLElement;
  readonly #target: ScrollTarget;
  readonly #frame: HTMLElement;
  readonly #cardsContainer: HTMLElement;
  readonly #viewport: HTMLElement | null;
  readonly #glide: Glide;
  readonly #bars: Record<Axis, BarDom>;
  readonly #corner: HTMLDivElement;
  readonly #axes: Record<Axis, AxisRuntime>;
  readonly #cards: [HoverCardSlot, HoverCardSlot];
  readonly #supportsPopover: boolean;

  #connected = false;
  #tokens: ParsedTokens = { ...DEFAULT_TOKENS };
  #tokensDirty = true;
  #markersDirty = true;
  #rafId: number | null = null;
  #lastFrameTime = 0;

  #indicator: IndicatorKind = 'none';
  #lastIndicator: 'mouse' | 'touch' = 'mouse';
  #idleTimer: number | null = null;
  #repeatTimer: number | null = null;
  #cardDelayTimer: number | null = null;
  #activeCard: HoverCardSlot | null = null;
  #lastCardOffset = 0;
  #press: ActivePress | null = null;

  #explicitMarkers: ScrollMarker[] | null = null;
  #collectedMarkers: ScrollMarker[] = [];

  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #lastGlyphShape: GlyphShape | null = null;
  #lastRtl = false;

  constructor(options: ScrollbarControllerOptions) {
    this.#host = options.host;
    this.#target = options.target;
    this.#frame = options.frame;
    this.#cardsContainer = options.cards;
    this.#viewport = options.viewport;
    this.#supportsPopover = !isServer && 'popover' in HTMLElement.prototype;

    this.#glide = new Glide(this.#target, () =>
      prefersReducedMotion() ? 0 : this.#tokens.scrollSmoothing,
    );

    this.#bars = {
      vertical: this.#createBarDom('vertical'),
      horizontal: this.#createBarDom('horizontal'),
    };
    this.#corner = document.createElement('div');
    this.#corner.className = 'corner';
    this.#corner.setAttribute('part', 'corner');
    this.#corner.setAttribute('aria-hidden', 'true');
    this.#corner.style.display = 'none';

    this.#frame.append(this.#bars.vertical.root, this.#bars.horizontal.root, this.#corner);

    this.#axes = {
      vertical: this.#createAxisRuntime(),
      horizontal: this.#createAxisRuntime(),
    };

    this.#cards = [this.#createCardSlot(), this.#createCardSlot()];
  }

  get markers(): ScrollMarker[] | null {
    return this.#explicitMarkers ? this.#explicitMarkers.slice() : null;
  }

  set markers(value: Iterable<ScrollMarkerInput | Element> | null) {
    if (value === null) {
      this.#explicitMarkers = null;
    } else {
      const list: ScrollMarker[] = [];
      let idx = 0;
      for (const item of value) {
        if (item instanceof Element) {
          list.push(this.#markerFromElement(item, idx++, this.#markerAxis()));
        } else if (item.element) {
          const fallback = this.#markerFromElement(item.element, idx++, item.axis ?? 'vertical');
          list.push({
            id: item.id ?? fallback.id,
            label: item.label ?? fallback.label,
            axis: item.axis ?? fallback.axis,
            element: item.element,
            data: item.data,
          });
        } else {
          const fallbackId = `k-marker-${idx++}`;
          list.push({
            id: item.id ?? fallbackId,
            label: item.label ?? item.id ?? fallbackId,
            axis: item.axis ?? 'vertical',
            position: item.position ?? 0,
            data: item.data,
          });
        }
      }
      this.#explicitMarkers = list;
    }
    this.#markersDirty = true;
    this.#schedule();
  }

  connect(): void {
    if (this.#connected || isServer) return;
    this.#connected = true;
    this.#tokensDirty = true;
    this.#markersDirty = true;

    this.#target.scrollEvents.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#target.pointerArea.addEventListener('pointermove', this.#onPointerMove as EventListener, {
      passive: true,
    });
    this.#target.pointerArea.addEventListener('pointerdown', this.#onPointerDown as EventListener, {
      capture: true,
      passive: false,
    });
    this.#target.pointerArea.addEventListener(
      'pointerleave',
      this.#onPointerLeave as EventListener,
      { passive: true },
    );

    if (typeof ResizeObserver === 'function') {
      this.#resizeObserver = new ResizeObserver(() => {
        this.#markersDirty = true;
        this.#schedule();
      });
      if (this.#viewport) {
        this.#resizeObserver.observe(this.#viewport);
        const content = this.#viewport.firstElementChild;
        if (content) this.#resizeObserver.observe(content);
      } else {
        this.#resizeObserver.observe(document.documentElement);
        if (document.body) this.#resizeObserver.observe(document.body);
      }
    }

    if (this.#target.isDocument) {
      window.addEventListener('resize', this.#onWindowResize, { passive: true });
    }

    if (typeof MutationObserver === 'function') {
      this.#mutationObserver = new MutationObserver(() => {
        if (this.#markerSelector()) {
          this.#markersDirty = true;
          this.#schedule();
        }
      });
      const observeRoot = this.#target.isDocument ? document.body : this.#host;
      if (observeRoot) {
        this.#mutationObserver.observe(observeRoot, { childList: true, subtree: true });
      }
    }

    if (this.#indicatorMode() === 'pinned' && !this.#isSuspended()) {
      this.#setIndicator('mouse');
    }

    this.#syncGlyphs();
    this.#schedule();
  }

  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false;
    this.#cancelPress();
    this.#clearIdleTimer();
    this.#clearCardDelay();
    this.#hideCardsImmediate();
    this.#glide.stop();
    this.#target.holdInstant(false);

    if (this.#rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    this.#target.scrollEvents.removeEventListener('scroll', this.#onScroll);
    this.#target.pointerArea.removeEventListener(
      'pointermove',
      this.#onPointerMove as EventListener,
    );
    this.#target.pointerArea.removeEventListener(
      'pointerdown',
      this.#onPointerDown as EventListener,
      { capture: true },
    );
    this.#target.pointerArea.removeEventListener(
      'pointerleave',
      this.#onPointerLeave as EventListener,
    );

    if (this.#target.isDocument) {
      window.removeEventListener('resize', this.#onWindowResize);
    }

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
  }

  refresh(): void {
    this.#tokensDirty = true;
    this.#markersDirty = true;
    if (this.#isSuspended()) {
      this.#cancelPress();
      this.#hideCard(true);
      this.#setIndicator('none');
    } else if (this.#indicatorMode() === 'pinned') {
      this.#clearIdleTimer();
      this.#setIndicator('mouse');
    }
    this.#syncGlyphs();
    this.#schedule();
  }

  refreshMarkers(): void {
    this.#markersDirty = true;
    this.#schedule();
  }

  /** Synchronously forces a layout and render pass (useful in unit tests). */
  flush(): void {
    if (!this.#connected) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#stepFrame(performance.now());
  }

  // -------------------------------------------------------------------------
  // Config getters
  // -------------------------------------------------------------------------

  #variant(): ScrollbarVariant {
    const v = this.#host.getAttribute('variant');
    return v === 'classic' || v === 'minimal' ? v : 'fluent';
  }

  #axisVisibility(axis: Axis): AxisVisibility {
    const v = this.#host.getAttribute(axis);
    return v === 'always' || v === 'hidden' ? v : 'auto';
  }

  #trackClick(): TrackClickMode {
    return this.#host.getAttribute('track-click') === 'jump' ? 'jump' : 'page';
  }

  #touchMode(): TouchMode {
    return this.#host.getAttribute('touch') === 'bar' ? 'bar' : 'indicator';
  }

  #indicatorMode(): IndicatorMode {
    const v = this.#host.getAttribute('indicator');
    if (v === 'auto' || v === 'near' || v === 'pinned') return v;
    return this.#target.isDocument ? 'near' : 'auto';
  }

  #markerSelector(): string {
    return this.#host.getAttribute('marker-selector')?.trim() ?? '';
  }

  #markerAxis(): Axis {
    return this.#host.getAttribute('marker-axis') === 'horizontal' ? 'horizontal' : 'vertical';
  }

  #markerAlign(): MarkerAlign {
    return this.#host.getAttribute('marker-align') === 'start' ? 'start' : 'center';
  }

  #isSnapping(): boolean {
    return this.#host.hasAttribute('snap');
  }

  #isSuspended(): boolean {
    return this.#host.hasAttribute('suspended');
  }

  #hiddenParts(): Set<HidePart> {
    const raw = this.#host.getAttribute('hide');
    const set = new Set<HidePart>();
    if (raw === null) {
      if (this.#variant() === 'minimal') {
        set.add('button');
        set.add('track');
        set.add('corner');
      }
      return set;
    }
    for (const token of raw.split(/\s+/)) {
      if (
        token === 'thumb' ||
        token === 'button' ||
        token === 'track' ||
        token === 'corner' ||
        token === 'marker' ||
        token === 'card'
      ) {
        set.add(token);
      }
    }
    return set;
  }

  #readTokens(): void {
    this.#tokensDirty = false;
    if (typeof getComputedStyle === 'undefined') return;
    const s = getComputedStyle(this.#host);
    const get = (name: string): string => s.getPropertyValue(name).trim();
    this.#tokens = {
      scrollSmoothing: parseCssTimeMs(get('--k-scrollbar-scroll-smoothing'), SMOOTH_TAU),
      thumbSmoothing: parseCssTimeMs(get('--k-scrollbar-thumb-smoothing'), FOLLOW_TAU),
      idleDelay: parseCssTimeMs(get('--k-scrollbar-idle-delay'), 2500),
      touchIdleDelay: parseCssTimeMs(get('--k-scrollbar-touch-idle-delay'), 500),
      cardDelay: parseCssTimeMs(get('--k-scrollbar-card-delay'), 320),
      repeatDelay: parseCssTimeMs(get('--k-scrollbar-repeat-delay'), 250),
      repeatInterval: Math.max(16, parseCssTimeMs(get('--k-scrollbar-repeat-interval'), 50)),
      line: parseCssLengthPx(get('--k-scrollbar-line'), 40),
      hotzoneRaw: get('--k-scrollbar-hotzone') || '4px',
      markerSpacing: parseCssLengthPx(get('--k-scrollbar-marker-spacing'), 6),
      markerReach: parseCssLengthPx(get('--k-scrollbar-marker-reach'), 12),
      cardGap: parseCssLengthPx(get('--k-scrollbar-card-gap'), 10),
      fadeOut: parseCssTimeMs(get('--k-scrollbar-fade-out'), 167),
    };
  }

  #hotzonePx(thickness: number): number {
    return parseCssLengthPx(this.#tokens.hotzoneRaw, 4, thickness);
  }

  // -------------------------------------------------------------------------
  // DOM builders
  // -------------------------------------------------------------------------

  #createBarDom(axis: Axis): BarDom {
    const suffix = `-${axis}`;
    const root = document.createElement('div');
    root.className = axis === 'vertical' ? 'bar v' : 'bar h';
    root.setAttribute('part', `scrollbar scrollbar${suffix}`);
    root.setAttribute('aria-hidden', 'true');
    root.style.display = 'none';

    const trackBg = document.createElement('div');
    trackBg.className = 'track-bg';
    trackBg.setAttribute('part', `track track${suffix}`);

    const makeButton = (dir: 'start' | 'end'): [HTMLDivElement, SVGPathElement] => {
      const btn = document.createElement('div');
      btn.className = `button ${dir}`;
      btn.setAttribute('part', `button button-${dir} button${suffix}`);
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(SVG_NS, 'path');
      svg.append(path);
      btn.append(svg);
      return [btn, path];
    };

    const [buttonStart, buttonStartPath] = makeButton('start');
    const [buttonEnd, buttonEndPath] = makeButton('end');

    const area = document.createElement('div');
    area.className = 'area';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.setAttribute('part', `thumb thumb${suffix}`);

    const markers = document.createElement('div');
    markers.className = 'markers';

    area.append(thumb, markers);
    root.append(trackBg, buttonStart, area, buttonEnd);

    return {
      axis,
      root,
      trackBg,
      buttonStart,
      buttonStartPath,
      buttonEnd,
      buttonEndPath,
      area,
      thumb,
      markers,
    };
  }

  #createAxisRuntime(): AxisRuntime {
    return {
      displayed: false,
      layout: null,
      shown: null,
      thickness: 0,
      origin: 0,
      hover: false,
      near: false,
      pressed: false,
      hoveredRegion: null,
      pressedRegion: null,
      markers: [],
      hoveredMarker: null,
      pressedMarker: null,
    };
  }

  #createCardSlot(): HoverCardSlot {
    const el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('part', 'card');
    el.setAttribute('aria-hidden', 'true');
    if (this.#supportsPopover) el.setAttribute('popover', 'manual');
    else el.style.zIndex = '2147483647';

    const content = document.createElement('div');
    content.className = 'card-content';
    content.setAttribute('part', 'card-content');
    el.append(content);
    this.#cardsContainer.append(el);
    return { el, content, markerId: null, timer: null };
  }

  #syncGlyphs(): void {
    const shape: GlyphShape = this.#variant() === 'classic' ? 'chevron' : 'triangle';
    const rtl = this.#target.rtl();
    if (shape === this.#lastGlyphShape && rtl === this.#lastRtl) return;
    this.#lastGlyphShape = shape;
    this.#lastRtl = rtl;

    this.#bars.vertical.buttonStartPath.setAttribute('d', buttonGlyphPath('up', shape));
    this.#bars.vertical.buttonEndPath.setAttribute('d', buttonGlyphPath('down', shape));
    const hStart: GlyphDirection = rtl ? 'right' : 'left';
    const hEnd: GlyphDirection = rtl ? 'left' : 'right';
    this.#bars.horizontal.buttonStartPath.setAttribute('d', buttonGlyphPath(hStart, shape));
    this.#bars.horizontal.buttonEndPath.setAttribute('d', buttonGlyphPath(hEnd, shape));
  }

  // -------------------------------------------------------------------------
  // Frame loop
  // -------------------------------------------------------------------------

  #schedule(): void {
    if (!this.#connected || this.#rafId !== null) return;
    if (typeof requestAnimationFrame === 'function') {
      this.#rafId = requestAnimationFrame((now) => {
        this.#rafId = null;
        this.#stepFrame(now);
      });
    } else {
      queueMicrotask(() => this.#stepFrame(performance.now()));
    }
  }

  #stepFrame(now: number): void {
    if (!this.#connected) return;
    const dt = this.#lastFrameTime > 0 ? Math.min(64, Math.max(0, now - this.#lastFrameTime)) : 16;
    this.#lastFrameTime = now;

    if (this.#tokensDirty) this.#readTokens();
    if (this.#glide.running) this.#glide.step(dt);

    const hidden = this.#hiddenParts();
    const touchIndicatorOnly = this.#lastIndicator === 'touch' && this.#touchMode() === 'indicator';

    // 1. Refresh RTL & layout visibility
    this.#target.refreshDirection();
    const rtl = this.#target.rtl();
    this.#frame.classList.toggle('rtl', rtl);
    this.#syncGlyphs();

    for (const axis of AXES) {
      const mode = this.#axisVisibility(axis);
      const client = this.#target.client(axis);
      const size = this.#target.size(axis);
      const scrollable = size - client > 0.5;
      const displayed = mode === 'always' || (mode === 'auto' && scrollable);
      const rt = this.#axes[axis];
      const bar = this.#bars[axis];
      rt.displayed = displayed;
      bar.root.style.display = displayed ? '' : 'none';

      const hideButtons = hidden.has('button') || touchIndicatorOnly;
      const hideTrack = hidden.has('track') || touchIndicatorOnly;
      const hideThumb = hidden.has('thumb');
      const hideMarkers = hidden.has('marker');

      bar.buttonStart.style.display = hideButtons ? 'none' : '';
      bar.buttonEnd.style.display = hideButtons ? 'none' : '';
      bar.trackBg.style.display = hideTrack ? 'none' : '';
      bar.thumb.style.display = hideThumb ? 'none' : '';
      bar.markers.style.display = hideMarkers ? 'none' : '';
    }

    // Corner spacing when both axes are displayed
    const bothDisplayed = this.#axes.vertical.displayed && this.#axes.horizontal.displayed;
    const vThick = this.#axes.vertical.displayed ? this.#bars.vertical.root.offsetWidth : 0;
    const hThick = this.#axes.horizontal.displayed ? this.#bars.horizontal.root.offsetHeight : 0;
    this.#axes.vertical.thickness = vThick;
    this.#axes.horizontal.thickness = hThick;

    this.#bars.vertical.root.style.bottom = bothDisplayed ? `${hThick}px` : '0px';
    if (rtl) {
      this.#bars.horizontal.root.style.left = bothDisplayed ? `${vThick}px` : '0px';
      this.#bars.horizontal.root.style.right = '0px';
    } else {
      this.#bars.horizontal.root.style.left = '0px';
      this.#bars.horizontal.root.style.right = bothDisplayed ? `${vThick}px` : '0px';
    }

    const showCorner = bothDisplayed && !hidden.has('corner') && !touchIndicatorOnly;
    this.#corner.style.display = showCorner ? '' : 'none';
    if (showCorner) {
      this.#corner.style.width = `${vThick}px`;
      this.#corner.style.height = `${hThick}px`;
      this.#corner.dataset.shown = String(this.#isBarVisible('vertical'));
    }

    this.#host.style.setProperty('--k-scrollbar-vertical-size', `${vThick}px`);
    this.#host.style.setProperty('--k-scrollbar-horizontal-size', `${hThick}px`);

    // 2. Collect & measure markers when dirty
    if (this.#markersDirty && !hidden.has('marker')) {
      this.#markersDirty = false;
      this.#syncMarkers();
    }

    // 3. Compute axis layouts & render thumbs + markers
    const reducedMotion = prefersReducedMotion();
    const thumbTau =
      reducedMotion || this.#press?.mode === 'drag' ? 0 : this.#tokens.thumbSmoothing;
    const snapping = this.#isSnapping();
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const alignFactor = this.#markerAlign() === 'start' ? 0 : 0.5;

    let stillMoving = this.#glide.running;

    for (const axis of AXES) {
      const rt = this.#axes[axis];
      const bar = this.#bars[axis];
      if (!rt.displayed) {
        rt.layout = null;
        rt.shown = null;
        this.#syncHostAxisState(axis);
        continue;
      }

      const client = this.#target.client(axis);
      const size = this.#target.size(axis);
      const position = this.#target.position(axis);
      const trackLen = axis === 'vertical' ? bar.area.clientHeight : bar.area.clientWidth;
      const thumbStyle = getComputedStyle(bar.thumb);
      const minThumb =
        Number.parseFloat(axis === 'vertical' ? thumbStyle.minHeight : thumbStyle.minWidth) || 28;
      const areaRect = bar.area.getBoundingClientRect();
      rt.origin = axis === 'vertical' ? areaRect.top : rtl ? areaRect.right : areaRect.left;

      const exact = layoutAxis({ client, size, position, track: trackLen, minThumb });
      rt.layout = exact;

      const shown = followThumb(rt.shown, exact.thumbOffset, exact.thumbLength, dt, thumbTau);
      rt.shown = shown;
      if (shown.offset !== exact.thumbOffset || shown.length !== exact.thumbLength) {
        stillMoving = true;
      }

      let drawn: AxisLayout = {
        ...exact,
        thumbOffset: shown.offset,
        thumbLength: shown.length,
      };
      if (snapping) {
        drawn = snapLayout(drawn, rt.origin, dpr);
      }

      this.#renderThumb(bar, drawn, rtl, snapping);

      if (!hidden.has('marker') && rt.markers.length > 0) {
        const markersMoving = this.#layoutAndRenderMarkers(
          axis,
          rt,
          exact,
          drawn,
          client,
          alignFactor,
          dt,
          thumbTau,
          rtl,
          snapping,
          dpr,
        );
        if (markersMoving) stillMoving = true;
      }

      const shownNow = this.#isBarVisible(axis);
      const engaged = this.#isAxisEngaged(axis);
      bar.root.dataset.shown = String(shownNow);
      bar.root.dataset.engaged = String(engaged);
      this.#syncHostAxisState(axis);
    }

    if (stillMoving) this.#schedule();
  }

  #renderThumb(bar: BarDom, layout: AxisLayout, rtl: boolean, exact: boolean): void {
    const vertical = bar.axis === 'vertical';
    const edge = vertical
      ? layout.thumbOffset
      : physical(layout.thumbOffset, layout.thumbLength, layout.track, rtl);
    const fmt = (n: number): string => (exact ? `${n}px` : roundPx(n));
    if (vertical) {
      bar.thumb.style.height = fmt(layout.thumbLength);
      bar.thumb.style.transform = `translate(0, ${fmt(edge)})`;
    } else {
      bar.thumb.style.width = fmt(layout.thumbLength);
      bar.thumb.style.transform = `translate(${fmt(edge)}, 0)`;
    }
  }

  // -------------------------------------------------------------------------
  // Markers & Top-Layer Hover Cards
  // -------------------------------------------------------------------------

  #markerFromElement(el: Element, index: number, axis: Axis): ScrollMarker {
    const id = el.id || `k-marker-${index}`;
    const label =
      el.getAttribute('data-marker-label')?.trim() ||
      el.textContent?.trim().replace(/\s+/g, ' ') ||
      id;
    return { id, label, axis, element: el };
  }

  #syncMarkers(): void {
    let source: ScrollMarker[];
    if (this.#explicitMarkers !== null) {
      source = this.#explicitMarkers;
    } else {
      const selector = this.#markerSelector();
      if (!selector) {
        source = [];
      } else {
        const root = this.#target.isDocument ? document : this.#host;
        const axis = this.#markerAxis();
        try {
          const nodes = root.querySelectorAll(selector);
          source = Array.from(nodes, (el, i) => this.#markerFromElement(el, i, axis));
        } catch {
          source = [];
        }
      }
    }
    this.#collectedMarkers = source;

    const viewport = source.some((m) => m.element) ? this.#target.viewport() : undefined;
    const positions = {
      vertical: this.#target.position('vertical'),
      horizontal: this.#target.position('horizontal'),
    };

    for (const axis of AXES) {
      const rt = this.#axes[axis];
      const bar = this.#bars[axis];
      const byId = new Map<string, PlacedMarker>();
      for (const existing of rt.markers) byId.set(existing.marker.id, existing);

      const next: PlacedMarker[] = [];
      const seen = new Set<string>();
      for (const marker of this.#collectedMarkers) {
        if ((marker.axis ?? 'vertical') !== axis || seen.has(marker.id)) continue;
        seen.add(marker.id);
        let placed = byId.get(marker.id);
        if (!placed) {
          const slot = document.createElement('div');
          slot.className = 'slot';
          const el = document.createElement('div');
          el.className = 'marker';
          el.setAttribute('part', `marker marker-${axis}`);
          el.setAttribute('data-id', marker.id);
          slot.append(el);
          bar.markers.append(slot);
          placed = {
            marker,
            contentPosition: 0,
            anchor: 0,
            offset: 0,
            shown: null,
            slot,
            el,
            members: [],
            leader: true,
            lastTransform: '',
          };
          placed.members = [placed];
        } else {
          placed.marker = marker;
        }
        placed.contentPosition = marker.element
          ? this.#target.contentOffset(marker.element, axis, viewport, positions[axis])
          : (marker.position ?? 0);
        next.push(placed);
      }

      for (const old of rt.markers) {
        if (!seen.has(old.marker.id)) {
          old.slot.remove();
          if (rt.hoveredMarker === old) rt.hoveredMarker = null;
          if (rt.pressedMarker === old) rt.pressedMarker = null;
        }
      }

      next.sort((a, b) => a.contentPosition - b.contentPosition);
      rt.markers = next;
    }
  }

  #layoutAndRenderMarkers(
    axis: Axis,
    rt: AxisRuntime,
    exact: AxisLayout,
    drawn: AxisLayout,
    client: number,
    align: number,
    dt: number,
    tau: number,
    rtl: boolean,
    snapping: boolean,
    dpr: number,
  ): boolean {
    const spacing = this.#tokens.markerSpacing;
    let group: PlacedMarker[] = [];
    const closeGroup = (): void => {
      if (group.length === 0) return;
      const leader = group[0]!;
      leader.offset = group.reduce((sum, m) => sum + m.offset, 0) / group.length;
      leader.members = group;
      for (let i = 0; i < group.length; i++) {
        const m = group[i]!;
        m.leader = i === 0;
        if (i > 0) m.members = [m];
        m.slot.style.display = i === 0 ? '' : 'none';
      }
      group = [];
    };

    for (const placed of rt.markers) {
      placed.anchor = markerAnchor(placed.contentPosition, client, exact.max, align);
      placed.offset = markerOffset(exact, placed.anchor, align);
      const prev = group[group.length - 1];
      if (prev && placed.offset - prev.offset >= spacing) closeGroup();
      group.push(placed);
    }
    closeGroup();

    let moving = false;
    let currentMark: PlacedMarker | null = null;
    for (const placed of rt.markers) {
      if (!placed.leader) continue;
      if (placed.anchor <= exact.position + 1) currentMark = placed;
      const shown =
        placed.shown === null ? placed.offset : follow(placed.shown, placed.offset, dt, tau);
      placed.shown = shown;
      if (shown !== placed.offset) moving = true;
      const at = snapping ? snap(shown, rt.origin, dpr) : shown;
      const along = axis === 'vertical' ? at : physical(at, 0, exact.track, rtl);
      const transform =
        axis === 'vertical' ? `translate(0, ${roundPx(along)})` : `translate(${roundPx(along)}, 0)`;
      if (placed.lastTransform !== transform) {
        placed.lastTransform = transform;
        placed.slot.style.transform = transform;
      }
    }

    const thumbEnd = drawn.thumbOffset + drawn.thumbLength;
    for (const placed of rt.markers) {
      if (!placed.leader) continue;
      const at = placed.shown ?? placed.offset;
      const onThumb = at >= drawn.thumbOffset && at <= thumbEnd;
      const isCurrent = placed === currentMark;
      placed.el.toggleAttribute('on-thumb', onThumb);
      placed.el.toggleAttribute('current', isCurrent);
    }

    return moving;
  }

  #hitMarker(axis: Axis, along: number): PlacedMarker | null {
    if (this.#hiddenParts().has('marker')) return null;
    const reach = this.#tokens.markerReach;
    let best: PlacedMarker | null = null;
    let bestDist = Infinity;
    for (const placed of this.#axes[axis].markers) {
      if (!placed.leader) continue;
      const d = Math.abs(along - placed.offset);
      if (d <= reach && d < bestDist) {
        best = placed;
        bestDist = d;
      }
    }
    return best;
  }

  #setMarkerHover(axis: Axis, next: PlacedMarker | null): void {
    const rt = this.#axes[axis];
    const prev = rt.hoveredMarker;
    if (prev === next) return;
    if (prev) prev.el.removeAttribute('hover');
    rt.hoveredMarker = next;
    if (next) next.el.setAttribute('hover', '');

    if (next) {
      this.#dispatchMarkerEvent('k-marker-enter', next);
      if (!this.#hiddenParts().has('card')) {
        const delay = this.#activeCard ? 0 : this.#tokens.cardDelay;
        this.#clearCardDelay();
        if (delay > 0) {
          this.#cardDelayTimer = window.setTimeout(() => {
            this.#cardDelayTimer = null;
            if (this.#axes[axis].hoveredMarker === next) {
              this.#showCard(axis, next);
            }
          }, delay);
        } else {
          this.#showCard(axis, next);
        }
      }
    } else {
      this.#clearCardDelay();
      if (prev) this.#dispatchMarkerEvent('k-marker-leave', prev);
      this.#hideCard(true);
    }
  }

  #activateMarker(axis: Axis, placed: PlacedMarker): void {
    const allowed = this.#dispatchMarkerEvent('k-marker-activate', placed, true);
    if (!allowed) return;
    this.#glide.to(axis, placed.anchor);
    this.#schedule();
  }

  #dispatchMarkerEvent(name: string, placed: PlacedMarker, cancelable = false): boolean {
    const detail: MarkerEventDetail = {
      marker: placed.marker,
      markers: placed.members.map((m) => m.marker),
    };
    return this.#host.dispatchEvent(
      new CustomEvent<MarkerEventDetail>(name, {
        bubbles: true,
        composed: true,
        cancelable,
        detail,
      }),
    );
  }

  #showCard(axis: Axis, placed: PlacedMarker): void {
    const bar = this.#bars[axis];
    const barRect = bar.root.getBoundingClientRect();
    const areaRect = bar.area.getBoundingClientRect();
    const rtl = this.#target.rtl();
    const at = placed.shown ?? placed.offset;
    const layout = this.#axes[axis].layout;
    const trackLen = layout?.track ?? (axis === 'vertical' ? areaRect.height : areaRect.width);
    const along = axis === 'vertical' ? at : physical(at, 0, trackLen, rtl);
    const point =
      axis === 'vertical'
        ? { x: rtl ? barRect.right : barRect.left, y: areaRect.top + along }
        : { x: areaRect.left + along, y: barRect.top };
    const placement: Placement = axis === 'vertical' ? (rtl ? 'right' : 'left') : 'above';
    const forward = at >= this.#lastCardOffset;
    this.#lastCardOffset = at;

    const current = this.#activeCard;
    if (current && current.markerId === placed.marker.id) {
      this.#positionCard(current, point, placement);
      return;
    }
    if (current) this.#closeCardSlot(current, forward);

    const card = this.#cards[0] === current ? this.#cards[1] : this.#cards[0];
    if (card.timer !== null) {
      window.clearTimeout(card.timer);
      card.timer = null;
    }
    card.markerId = placed.marker.id;
    card.content.textContent = '';
    for (const member of placed.members) {
      const line = document.createElement('div');
      line.className = 'card-line';
      line.textContent = member.marker.label;
      card.content.append(line);
    }

    card.el.dataset.axis = axis;
    card.el.dataset.dir = forward ? 'forward' : 'backward';
    card.el.dataset.state = 'enter';
    card.el.classList.add('open');

    if (this.#supportsPopover) {
      try {
        if (!card.el.matches(':popover-open')) card.el.showPopover();
      } catch {
        // Ignore if host is disconnected during transition.
      }
    }

    this.#positionCard(card, point, placement);
    void getComputedStyle(card.el).opacity;
    card.el.dataset.state = 'open';
    this.#activeCard = card;
  }

  #positionCard(card: HoverCardSlot, point: { x: number; y: number }, placement: Placement): void {
    const rect = card.el.getBoundingClientRect();
    const pos = placeCard(
      point,
      { width: rect.width, height: rect.height },
      placement,
      this.#tokens.cardGap,
      { width: window.innerWidth, height: window.innerHeight },
      4,
    );
    card.el.style.left = `${pos.left}px`;
    card.el.style.top = `${pos.top}px`;
  }

  #hideCard(forward: boolean): void {
    if (!this.#activeCard) return;
    this.#closeCardSlot(this.#activeCard, forward);
    this.#activeCard = null;
  }

  #closeCardSlot(card: HoverCardSlot, forward: boolean): void {
    card.el.dataset.dir = forward ? 'forward' : 'backward';
    card.el.dataset.state = 'exit';
    const wait = prefersReducedMotion() ? 0 : this.#tokens.fadeOut;
    if (card.timer !== null) window.clearTimeout(card.timer);
    if (wait > 0) {
      card.timer = window.setTimeout(() => this.#finishCardSlot(card), wait);
    } else {
      this.#finishCardSlot(card);
    }
  }

  #finishCardSlot(card: HoverCardSlot): void {
    card.timer = null;
    card.markerId = null;
    card.el.classList.remove('open');
    delete card.el.dataset.state;
    if (this.#supportsPopover) {
      try {
        if (card.el.matches(':popover-open')) card.el.hidePopover();
      } catch {
        // Ignore if already closed.
      }
    }
  }

  #hideCardsImmediate(): void {
    for (const card of this.#cards) {
      if (card.timer !== null) window.clearTimeout(card.timer);
      this.#finishCardSlot(card);
    }
    this.#activeCard = null;
  }

  #clearCardDelay(): void {
    if (this.#cardDelayTimer !== null) {
      window.clearTimeout(this.#cardDelayTimer);
      this.#cardDelayTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Visibility, Indicator & State Attributes
  // -------------------------------------------------------------------------

  #isBarVisible(axis: Axis): boolean {
    if (this.#isSuspended()) return false;
    const rt = this.#axes[axis];
    if (!rt.displayed) return false;
    const mode = this.#indicatorMode();
    if (mode === 'pinned') return true;
    if (this.#indicator !== 'none') return true;
    return rt.hover || rt.near || rt.pressed;
  }

  #isAxisEngaged(axis: Axis): boolean {
    const rt = this.#axes[axis];
    return rt.hover || rt.near || rt.pressed || rt.hoveredMarker !== null;
  }

  #reveal(kind: 'mouse' | 'touch'): void {
    if (this.#isSuspended()) return;
    this.#setIndicator(kind);
    if (this.#indicatorMode() === 'pinned') return;
    this.#clearIdleTimer();
    const delay = kind === 'touch' ? this.#tokens.touchIdleDelay : this.#tokens.idleDelay;
    this.#idleTimer = window.setTimeout(() => {
      this.#idleTimer = null;
      if (this.#press || this.#axes.vertical.hover || this.#axes.horizontal.hover) return;
      this.#setIndicator('none');
      this.#schedule();
    }, delay);
  }

  #setIndicator(kind: IndicatorKind): void {
    if (this.#indicator === kind) return;
    this.#indicator = kind;
    this.#host.setAttribute('indicator-state', kind);
    if (kind !== 'none') {
      this.#lastIndicator = kind;
      this.#host.setAttribute('last-indicator', kind);
    }
    this.#schedule();
  }

  #clearIdleTimer(): void {
    if (this.#idleTimer !== null) {
      window.clearTimeout(this.#idleTimer);
      this.#idleTimer = null;
    }
  }

  #syncHostAxisState(axis: Axis): void {
    const rt = this.#axes[axis];
    const tokens: string[] = [];
    if (rt.displayed && this.#isBarVisible(axis)) tokens.push('visible');
    if (rt.displayed && rt.layout && !rt.layout.scrollable) tokens.push('disabled');
    if (rt.hover) tokens.push('hover');
    if (rt.near) tokens.push('near');
    if (this.#isAxisEngaged(axis)) tokens.push('engaged');
    if (rt.pressed) tokens.push('pressed');
    const value = tokens.join(' ');
    const attr = `${axis}-state`;
    if (this.#host.getAttribute(attr) !== value) {
      this.#host.setAttribute(attr, value);
    }
  }

  // -------------------------------------------------------------------------
  // Geometry-Based Pointer Routing
  // -------------------------------------------------------------------------

  #along(axis: Axis, clientX: number, clientY: number): number {
    const areaRect = this.#bars[axis].area.getBoundingClientRect();
    if (axis === 'vertical') return clientY - areaRect.top;
    return this.#target.rtl() ? areaRect.right - clientX : clientX - areaRect.left;
  }

  #inZone(axis: Axis, x: number, y: number): { inZone: boolean; overBar: boolean } {
    const rt = this.#axes[axis];
    if (!rt.displayed || this.#isSuspended()) return { inZone: false, overBar: false };
    const r = this.#bars[axis].root.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { inZone: false, overBar: false };
    const overBar = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (overBar) return { inZone: true, overBar: true };
    const hz = this.#hotzonePx(rt.thickness);
    if (hz <= 0) return { inZone: false, overBar: false };
    if (axis === 'vertical') {
      const rtl = this.#target.rtl();
      const left = rtl ? r.left : r.left - hz;
      const right = rtl ? r.right + hz : r.right;
      return { inZone: x >= left && x <= right && y >= r.top && y <= r.bottom, overBar: false };
    }
    return {
      inZone: x >= r.left && x <= r.right && y >= r.top - hz && y <= r.bottom,
      overBar: false,
    };
  }

  #regionFor(axis: Axis, layout: AxisLayout, x: number, y: number, along: number): Region {
    const bar = this.#bars[axis];
    const r = bar.root.getBoundingClientRect();
    const px = axis === 'vertical' ? (r.left + r.right) / 2 : x;
    const py = axis === 'vertical' ? y : (r.top + r.bottom) / 2;
    if (pointInEl(bar.buttonStart, px, py)) return 'button-start';
    if (pointInEl(bar.buttonEnd, px, py)) return 'button-end';
    if (!pointInEl(bar.area, px, py)) return null;
    const hidden = this.#hiddenParts();
    const shown = this.#axes[axis].shown;
    const onExactThumb = pageDirection(layout, along) === 0;
    const onDrawnThumb =
      shown !== null && along >= shown.offset && along < shown.offset + shown.length;
    const region: Region = onExactThumb || onDrawnThumb ? 'thumb' : 'track';
    if (region === 'thumb' && hidden.has('thumb')) return null;
    if (region === 'track' && hidden.has('track') && this.#variant() !== 'minimal') return null;
    return region;
  }

  #setRegionAttr(axis: Axis, kind: 'hover' | 'pressed', region: Region): void {
    const bar = this.#bars[axis];
    bar.thumb.toggleAttribute(kind, region === 'thumb');
    bar.buttonStart.toggleAttribute(kind, region === 'button-start');
    bar.buttonEnd.toggleAttribute(kind, region === 'button-end');
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  #onScroll = (): void => {
    const kind = this.#lastIndicator === 'touch' ? 'touch' : 'mouse';
    this.#reveal(kind);
    this.#schedule();
  };

  #onWindowResize = (): void => {
    this.#markersDirty = true;
    this.#schedule();
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (this.#isSuspended()) return;
    if (this.#press) return;

    const kind = e.pointerType === 'touch' ? 'touch' : 'mouse';
    if (kind === 'touch' && this.#touchMode() === 'indicator') return;

    let anyZone = false;
    for (const axis of AXES) {
      const rt = this.#axes[axis];
      const zone = this.#inZone(axis, e.clientX, e.clientY);
      if (zone.inZone && rt.layout) {
        anyZone = true;
        const along = this.#along(axis, e.clientX, e.clientY);
        const region = this.#regionFor(axis, rt.layout, e.clientX, e.clientY, along);
        const marker = this.#hitMarker(axis, along);
        rt.hover = zone.overBar;
        rt.near = true;
        rt.hoveredRegion = region;
        this.#setRegionAttr(axis, 'hover', region);
        this.#setMarkerHover(axis, marker);
      } else if (rt.hover || rt.near || rt.hoveredRegion || rt.hoveredMarker) {
        rt.hover = false;
        rt.near = false;
        rt.hoveredRegion = null;
        this.#setRegionAttr(axis, 'hover', null);
        this.#setMarkerHover(axis, null);
      }
    }

    if (anyZone || this.#indicatorMode() === 'auto') {
      this.#reveal(kind);
    }
    this.#schedule();
  };

  #onPointerLeave = (): void => {
    if (this.#press) return;
    for (const axis of AXES) {
      const rt = this.#axes[axis];
      rt.hover = false;
      rt.near = false;
      rt.hoveredRegion = null;
      this.#setRegionAttr(axis, 'hover', null);
      this.#setMarkerHover(axis, null);
    }
    this.#schedule();
  };

  #onPointerDown = (e: PointerEvent): void => {
    if (this.#isSuspended() || this.#press) return;
    const touch = e.pointerType === 'touch';
    if (!touch && e.button !== 0) return;
    if (touch && this.#touchMode() === 'indicator') return;

    for (const axis of AXES) {
      const rt = this.#axes[axis];
      const zone = this.#inZone(axis, e.clientX, e.clientY);
      if (!zone.inZone || !rt.layout || !rt.layout.scrollable) continue;

      const along = this.#along(axis, e.clientX, e.clientY);
      const marker = this.#hitMarker(axis, along);
      const region = this.#regionFor(axis, rt.layout, e.clientX, e.clientY, along);
      if (!marker && !region) continue;

      e.preventDefault();
      this.#reveal(touch ? 'touch' : 'mouse');
      this.#glide.stop(axis);

      const press: ActivePress = {
        axis,
        mode: 'marker',
        pointerId: e.pointerId,
        touch,
        time: e.timeStamp,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        travel: 0,
        startAlong: along,
        startPosition: rt.layout.position,
        written: null,
        dir: 0,
        marker,
        over: false,
        intent: 'undetermined',
      };
      this.#press = press;
      rt.pressed = true;

      const isButton = region === 'button-start' || region === 'button-end';
      if (touch && !(isButton && !marker)) {
        press.mode = 'touch';
        rt.near = true;
      } else if (
        marker &&
        pageDirection(rt.layout, along) === 0 &&
        !this.#hiddenParts().has('thumb')
      ) {
        press.mode = 'drag';
        rt.pressedMarker = marker;
        rt.pressedRegion = 'thumb';
        this.#setRegionAttr(axis, 'pressed', 'thumb');
        this.#target.holdInstant(true);
      } else if (marker) {
        press.mode = 'marker';
        rt.pressedMarker = marker;
      } else if (region === 'thumb') {
        press.mode = 'drag';
        rt.pressedRegion = 'thumb';
        this.#setRegionAttr(axis, 'pressed', 'thumb');
        this.#target.holdInstant(true);
      } else if (region === 'track' && this.#trackClick() === 'jump') {
        press.mode = 'jump';
        rt.pressedRegion = 'track';
      } else if (region === 'track') {
        press.mode = 'page';
        const heading = this.#headingLayout(axis, rt.layout);
        press.dir = pageDirection(heading, along);
        rt.pressedRegion = 'track';
        if (press.dir !== 0) {
          this.#pageOnce(press);
          this.#scheduleRepeat(this.#tokens.repeatDelay, () => this.#repeatPage(press));
        }
      } else if (isButton) {
        press.mode = 'button';
        press.dir = region === 'button-start' ? -1 : 1;
        press.over = true;
        rt.pressedRegion = region;
        this.#setRegionAttr(axis, 'pressed', region);
        this.#glide.by(axis, press.dir * this.#tokens.line);
        this.#scheduleRepeat(this.#tokens.repeatDelay, () => this.#repeatButton(press));
      }

      window.addEventListener('pointermove', this.#onActivePointerMove, { passive: false });
      window.addEventListener('pointerup', this.#onActivePointerUp, { passive: false });
      window.addEventListener('pointercancel', this.#onActivePointerCancel, { passive: true });
      this.#schedule();
      return;
    }
  };

  #onActivePointerMove = (e: PointerEvent): void => {
    const p = this.#press;
    if (!p || e.pointerId !== p.pointerId) return;
    p.travel += Math.hypot(e.clientX - p.x, e.clientY - p.y);
    p.x = e.clientX;
    p.y = e.clientY;

    if (p.mode === 'touch') this.#handleTouchMove(p);
    if (p.mode === 'jump') this.#handleJumpToDrag(p);
    if (p.mode === 'drag') this.#handleDrag(p);
    else if (p.mode === 'button') this.#handleButtonTrack(p);
  };

  #onActivePointerUp = (e: PointerEvent): void => {
    const p = this.#press;
    if (!p || e.pointerId !== p.pointerId) return;
    this.#finishPress(e, true);
  };

  #onActivePointerCancel = (e: PointerEvent): void => {
    const p = this.#press;
    if (!p || e.pointerId !== p.pointerId) return;
    this.#finishPress(e, false);
  };

  #handleTouchMove(p: ActivePress): void {
    const rt = this.#axes[p.axis];
    const zone = this.#inZone(p.axis, p.x, p.y);
    const m = zone.inZone ? this.#hitMarker(p.axis, this.#along(p.axis, p.x, p.y)) : null;
    this.#setMarkerHover(p.axis, m);
    if (p.intent !== 'undetermined') return;

    const dx = Math.abs(p.x - p.startX);
    const dy = Math.abs(p.y - p.startY);
    if (dx <= TOUCH_DEADZONE && dy <= TOUCH_DEADZONE) return;
    const alongMove = p.axis === 'vertical' ? dy : dx;
    const across = p.axis === 'vertical' ? dx : dy;
    if (alongMove / Math.max(across, 0.1) <= TOUCH_SLOPE) {
      p.intent = 'across';
      return;
    }
    p.intent = 'along';
    if (!rt.layout) return;
    p.mode = 'drag';
    p.startAlong = this.#along(p.axis, p.x, p.y);
    p.startPosition = rt.layout.position;
    p.written = null;
    this.#setRegionAttr(p.axis, 'pressed', 'thumb');
    this.#target.holdInstant(true);
  }

  #handleJumpToDrag(p: ActivePress): void {
    const along = this.#along(p.axis, p.x, p.y);
    if (Math.abs(along - p.startAlong) <= JUMP_SLOP) return;
    const rt = this.#axes[p.axis];
    if (!rt.layout) return;
    p.mode = 'drag';
    p.startAlong = along;
    p.startPosition = rt.layout.position;
    p.written = null;
    this.#setRegionAttr(p.axis, 'pressed', 'thumb');
    this.#target.holdInstant(true);
  }

  #handleDrag(p: ActivePress): void {
    const rt = this.#axes[p.axis];
    if (!rt.layout) return;
    const livePos = this.#target.position(p.axis);
    if (p.written !== null && Math.abs(livePos - p.written) > RESYNC) {
      p.startPosition += livePos - p.written;
    }
    const along = this.#along(p.axis, p.x, p.y);
    const to = dragTo(rt.layout, p.startPosition, along - p.startAlong);
    this.#target.scrollTo(p.axis, to);
    p.written = to;

    const zone = this.#inZone(p.axis, p.x, p.y);
    const m = zone.inZone ? this.#hitMarker(p.axis, along) : null;
    this.#setMarkerHover(p.axis, m);
    this.#schedule();
  }

  #handleButtonTrack(p: ActivePress): void {
    const bar = this.#bars[p.axis];
    const btn = p.dir < 0 ? bar.buttonStart : bar.buttonEnd;
    const over = pointInEl(btn, p.x, p.y);
    if (over === p.over) return;
    p.over = over;
    if (over) {
      this.#setRegionAttr(p.axis, 'pressed', p.dir < 0 ? 'button-start' : 'button-end');
      this.#scheduleRepeat(this.#tokens.repeatDelay, () => this.#repeatButton(p));
    } else {
      this.#clearRepeat();
      this.#setRegionAttr(p.axis, 'pressed', null);
    }
  }

  #headingLayout(axis: Axis, layout: AxisLayout): AxisLayout {
    const goal = this.#glide.goal(axis);
    return goal === null ? layout : layoutAt(layout, goal);
  }

  #pageOnce(p: ActivePress): void {
    const step = pageStep(this.#target.client(p.axis), this.#tokens.line);
    this.#glide.by(p.axis, p.dir * step);
    this.#schedule();
  }

  #repeatPage(p: ActivePress): void {
    if (this.#press !== p) return;
    const layout = this.#axes[p.axis].layout;
    if (!layout) return;
    const along = this.#along(p.axis, p.x, p.y);
    if (pageDirection(this.#headingLayout(p.axis, layout), along) !== p.dir) return;
    this.#pageOnce(p);
    this.#scheduleRepeat(this.#tokens.repeatInterval, () => this.#repeatPage(p));
  }

  #repeatButton(p: ActivePress): void {
    if (this.#press !== p || !p.over) return;
    this.#glide.by(p.axis, p.dir * this.#tokens.line);
    this.#schedule();
    this.#scheduleRepeat(this.#tokens.repeatInterval, () => this.#repeatButton(p));
  }

  #finishPress(e: PointerEvent, click: boolean): void {
    const p = this.#press;
    if (!p) return;
    const quick = e.timeStamp - p.time < JUMP_TIME;
    const rt = this.#axes[p.axis];

    if (p.touch) {
      if (click && p.mode === 'touch' && p.intent === 'undetermined' && quick) {
        if (p.marker) this.#activateMarker(p.axis, p.marker);
        else if (rt.layout) {
          this.#glide.to(p.axis, jumpTo(rt.layout, this.#along(p.axis, p.x, p.y)));
        }
      }
    } else {
      if (click && p.marker && p.travel < CLICK_SLOP) {
        this.#activateMarker(p.axis, p.marker);
      } else if (click && p.mode === 'jump' && quick && rt.layout) {
        this.#glide.to(p.axis, jumpTo(rt.layout, this.#along(p.axis, e.clientX, e.clientY)));
      }
    }

    if (click) swallowNextClick();
    this.#cancelPress();
    this.#reveal(p.touch ? 'touch' : 'mouse');
    this.#schedule();
  }

  #cancelPress(): void {
    this.#clearRepeat();
    const p = this.#press;
    if (!p) return;
    this.#press = null;
    this.#target.holdInstant(false);
    const rt = this.#axes[p.axis];
    rt.pressed = false;
    rt.pressedRegion = null;
    rt.pressedMarker = null;
    this.#setRegionAttr(p.axis, 'pressed', null);
    window.removeEventListener('pointermove', this.#onActivePointerMove);
    window.removeEventListener('pointerup', this.#onActivePointerUp);
    window.removeEventListener('pointercancel', this.#onActivePointerCancel);
  }

  #scheduleRepeat(delayMs: number, fn: () => void): void {
    this.#clearRepeat();
    this.#repeatTimer = window.setTimeout(() => {
      this.#repeatTimer = null;
      fn();
    }, delayMs);
  }

  #clearRepeat(): void {
    if (this.#repeatTimer !== null) {
      window.clearTimeout(this.#repeatTimer);
      this.#repeatTimer = null;
    }
  }
}
