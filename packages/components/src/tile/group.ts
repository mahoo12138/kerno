import {
  observeSurfaceEnvironment,
  prefersReducedMotion,
  type SurfaceMotionState,
} from '@kerno/effects';
import { resolveLang, translate } from '@kerno/core';
import { bandCount, closestBoundary, type KTileBoundary } from './boundary.js';
import {
  bandShift,
  clamp01,
  enterDesktop,
  enterLength,
  exitDesktop,
  parsePxLength,
  parseVariant,
  readParams,
  turnstile,
  turnstileBegin,
  turnstileOrigin,
  type EntranceFrame,
  type EntranceVariant,
  type Params,
} from './entrance.js';
import { layoutTiles, tileSpan, type LayoutResult } from './layout.js';
import { dropTarget, keyboardTarget, moveIndex, type Direction } from './reorder.js';

const REPOSITION_MS = 367;
const STAGGER_MS = 33;
const STAGGER_CAP_MS = 250;
const LIFT_MS = 240;
const DROP_MS = 500;
const DRAG_SCALE = 1.05;
const DRAG_OPACITY = 0.65;
const OTHERS_SCALE = 0.95;
const SLOP = 6;
const DEFAULT_HOLD_MS = 500;
const DEFAULT_STRIP = 4;
const DEFAULT_STRIP_VERTICAL = 2;
const DEFAULT_COLUMNS = 6;
const DEFAULT_PERSPECTIVE = 1000;

export type TileReorderReason = 'pointer' | 'keyboard' | 'api';
export type TileDragMode = 'none' | 'press' | 'hold' | 'cross-slide';

interface Settle {
  duration: number;
  together: boolean;
}
const MOVE_SETTLE: Settle = { duration: REPOSITION_MS, together: false };
const DROP_SETTLE: Settle = { duration: DROP_MS, together: true };

const STYLE = `
:host {
  display: block;
  position: relative;
  --k-tilt-mode: absolute;
}
::slotted(*) {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  margin: 0;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}
:host([drag="press"]) ::slotted(*) {
  touch-action: none;
}
:host([drag="cross-slide"]) ::slotted(*) {
  touch-action: pan-x pinch-zoom;
}
.announce {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
`;

interface Metrics {
  cellWidth: number;
  cellHeight: number;
  gap: number;
  rows: number | null;
  columns: number | null;
}

interface Shown {
  x: number;
  y: number;
  scale: number;
  animation: Motion | null;
}

interface Gesture {
  tile: HTMLElement;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  timer: number;
  held: boolean;
  lifted: boolean;
  dragging: boolean;
  grabX: number;
  grabY: number;
  order: HTMLElement[];
  from: number;
  to: number;
  frame: number;
}

interface Placed {
  x: number;
  y: number;
  scale: number;
}

interface Look {
  dx: number;
  dy: number;
  grow: number;
  rotateY: number;
  perspective: number;
  originX: number;
  originY: number;
  enter: number;
  launch: number;
  launchAlpha: number;
  drag: number;
  wroteOpacity: boolean;
  wroteOrigin: boolean;
  motionKey: string;
}

interface Hold {
  kind: 'enter' | 'exit';
  dx: number;
  dy: number;
  grow: number;
  rotateY: number;
  perspective: number;
  origin: number;
  enter: number;
}

interface Run {
  kind: 'enter' | 'exit';
  variant: EntranceVariant;
  start: number;
  duration: number;
  params: Params;
  randoms: Map<HTMLElement, number>;
  done: () => void;
}

interface Launch {
  source: HTMLElement | null;
  cx: number;
  cy: number;
  start: number;
  duration: number;
  scale: number;
}

type Motional = HTMLElement & { motion?: (state: SurfaceMotionState | null) => void };

export interface EntranceOptions {
  variant?: EntranceVariant;
}

export interface TileReorderDetail {
  from: number;
  to: number;
  reason: TileReorderReason;
}

export interface TileDragEndDetail {
  from: number;
  to: number;
}

export interface TileContextMenuDetail {
  clientX: number;
  clientY: number;
  pointerType: string;
}

const template = typeof document !== 'undefined' ? document.createElement('template') : null;
if (template) template.innerHTML = `<style>${STYLE}</style><slot></slot>`;

const ElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

/**
 * Windows 8 / Windows 10 Start Screen cell-spanning tile group (`<k-tile-group>`).
 *
 * Lays out child tiles on a grid of cells (`columns` and `rows` attributes on
 * each child), supports live drag-and-drop and `Alt+Shift+Arrow` keyboard
 * reordering, programmatic `moveTile()`, desktop band & mobile turnstile
 * entrance/exit animations (`enter()` / `exit()`), and Start screen launch
 * choreography.
 *
 * @tag k-tile-group
 */
export class KTileGroup extends ElementBase {
  static get observedAttributes(): string[] {
    return ['drag', 'strip', 'orientation'];
  }

  readonly #root: ShadowRoot;
  readonly #shown = new Map<HTMLElement, Shown>();
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #unobserveEnv: (() => void) | null = null;
  #pending = 0;
  #pendingAnimate = false;
  #gesture: Gesture | null = null;
  #lastPointerType = '';
  #lastPointerTime = 0;
  #metrics: Metrics | null = null;
  #autoAcross = 0;
  #ownWidth = false;
  #ownHeight = false;
  #live: HTMLElement | null = null;
  #announceTimer = 0;
  readonly #looks = new WeakMap<HTMLElement, Look>();
  readonly #painted = new WeakMap<HTMLElement, Placed>();
  #run: Run | null = null;
  #hold: Hold | null = null;
  #launch: Launch | null = null;
  #animFrame = 0;
  #visibility: IntersectionObserver | null = null;
  #entered = false;
  #seenVariant: EntranceVariant | null = null;
  #boundary: KTileBoundary | null = null;
  #extent = 0;
  #bandSize = DEFAULT_STRIP;
  #styleCheck = 0;

  describeMove: DescribeMove = describeMoved;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    if (template) this.#root.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('contextmenu', this.#onContextMenu);
    this.addEventListener('touchmove', this.#onTouchMove, {
      passive: false,
    } as AddEventListenerOptions);
    this.addEventListener('keydown', this.#onKeyMove);
    this.addEventListener('focusin', this.#onFocusIn);
    document.addEventListener('tilelaunchstart', this.#onLaunchStart);
    document.addEventListener('tilelaunchend', this.#onLaunchEnd);

    if (typeof MutationObserver !== 'undefined') {
      this.#mutationObserver = new MutationObserver((records) => this.#onMutations(records));
      this.#mutationObserver.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['columns', 'rows'],
      });
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        if (this.#isAuto() && this.#acrossForSize() !== this.#autoAcross) this.#schedule(true);
      });
      this.#resizeObserver.observe(this);
    }
    if (!this.#live) {
      this.#live = document.createElement('div');
      this.#live.className = 'announce';
      this.#live.setAttribute('role', 'status');
      this.#live.setAttribute('aria-live', 'polite');
      this.#root.appendChild(this.#live);
    }
    this.#unobserveEnv = observeSurfaceEnvironment(this, this.#onEnvironmentChange);
    this.#boundary = closestBoundary(this);
    if (this.#boundary) this.#boundary.add(this);
    this.#layout(false);
    this.#seenVariant = this.#entranceVariant();
    this.#watchEntrance();
  }

  disconnectedCallback(): void {
    this.#unobserveEnv?.();
    this.#unobserveEnv = null;
    if (this.#styleCheck) cancelAnimationFrame(this.#styleCheck);
    this.#styleCheck = 0;
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.removeEventListener('contextmenu', this.#onContextMenu);
    this.removeEventListener('touchmove', this.#onTouchMove);
    this.removeEventListener('keydown', this.#onKeyMove);
    this.removeEventListener('focusin', this.#onFocusIn);
    document.removeEventListener('tilelaunchstart', this.#onLaunchStart);
    document.removeEventListener('tilelaunchend', this.#onLaunchEnd);
    this.#mutationObserver?.disconnect();
    this.#resizeObserver?.disconnect();
    this.#mutationObserver = this.#resizeObserver = null;
    this.#endGesture();
    if (this.#pending) cancelAnimationFrame(this.#pending);
    this.#pending = 0;
    this.#stopWatching();
    this.#finishRun();
    this.#endLaunch();
    if (this.#animFrame) cancelAnimationFrame(this.#animFrame);
    this.#animFrame = 0;
    if (this.#boundary) this.#boundary.delete(this);
    this.#boundary = null;
  }

  attributeChangedCallback(name: string): void {
    if ((name === 'strip' || name === 'orientation') && this.isConnected) {
      this.#schedule(true);
    }
  }

  /** @internal */
  boundaryInfo(): { vertical: boolean; bands: number } {
    return { vertical: this.#vertical, bands: bandCount(this.#extent, this.#bandSize) };
  }

  /** Direct child tile elements in DOM order. */
  get tiles(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (let el = this.firstElementChild; el; el = el.nextElementSibling) {
      out.push(el as HTMLElement);
    }
    return out;
  }

  /** Re-reads custom property metrics and re-lays out all tiles. */
  refresh(): void {
    this.#metrics = null;
    this.#schedule(true);
  }

  /** @deprecated Kept for compatibility; the group observes child `columns`/`rows` automatically. */
  tileChanged(): void {
    this.#schedule(true);
  }

  /**
   * Plays the group entrance animation (`'desktop'` band wave or `'mobile'` 3D turnstile).
   */
  enter(options: EntranceOptions = {}): Promise<void> {
    return this.#play('enter', this.#variantOf(options));
  }

  /**
   * Plays the group exit animation (`'desktop'` fade or `'mobile'` 3D turnstile).
   */
  exit(options: EntranceOptions = {}): Promise<void> {
    return this.#play('exit', this.#variantOf(options));
  }

  /**
   * Moves `tile` to index `to` in the group order, animated.
   * Returns `true` if the tile moved, `false` if invalid or canceled.
   */
  moveTile(tile: Element, to: number): boolean {
    const from = this.tiles.indexOf(tile as HTMLElement);
    if (from < 0 || !Number.isInteger(to) || to < 0 || to >= this.tiles.length || to === from) {
      return false;
    }
    return this.#reorder(tile as HTMLElement, from, to, 'api', MOVE_SETTLE) !== from;
  }

  #onEnvironmentChange = (): void => {
    if (this.#styleCheck) return;
    this.#styleCheck = requestAnimationFrame(() => {
      this.#styleCheck = 0;
      const variant = this.#entranceVariant();
      if (variant !== this.#seenVariant) {
        this.#seenVariant = variant;
        if (this.#run) this.#finishRun();
        this.#primeHold();
      }
      const next = this.#readMetrics();
      const now = this.#metrics;
      if (
        now &&
        next.cellWidth === now.cellWidth &&
        next.cellHeight === now.cellHeight &&
        next.gap === now.gap &&
        next.rows === now.rows &&
        next.columns === now.columns
      ) {
        return;
      }
      this.#metrics = next;
      this.#schedule(true);
    });
  };

  #onMutations(records: MutationRecord[]): void {
    for (const record of records) {
      const ours =
        record.type === 'childList' ? record.target === this : record.target.parentNode === this;
      if (ours) {
        this.#schedule(true);
        return;
      }
    }
  }

  get #dragMode(): TileDragMode {
    const mode = this.getAttribute('drag');
    return mode === 'press' || mode === 'hold' || mode === 'cross-slide' ? mode : 'none';
  }

  get #vertical(): boolean {
    return this.getAttribute('orientation') === 'vertical';
  }

  get #strip(): number {
    const n = Number.parseInt(this.getAttribute('strip') || '', 10);
    return n > 0 ? n : this.#vertical ? DEFAULT_STRIP_VERTICAL : DEFAULT_STRIP;
  }

  get #holdDelay(): number {
    const n = Number.parseFloat(this.getAttribute('hold-delay') || '');
    return n >= 0 ? n : DEFAULT_HOLD_MS;
  }

  #schedule(animate: boolean): void {
    this.#pendingAnimate = this.#pendingAnimate || animate;
    if (this.#pending) return;
    this.#pending = requestAnimationFrame(() => {
      this.#pending = 0;
      const a = this.#pendingAnimate;
      this.#pendingAnimate = false;
      if (!this.#gesture || !this.#gesture.dragging) this.#layout(a);
    });
  }

  #readLength(
    style: CSSStyleDeclaration,
    kernoName: string,
    axName: string,
    fallback: number,
  ): number {
    const text = style.getPropertyValue(kernoName).trim() || style.getPropertyValue(axName).trim();
    if (!text) return fallback;
    const px = parsePxLength(text);
    if (px !== null) return px;
    const n = Number.parseFloat(text);
    return Number.isFinite(n) ? n : fallback;
  }

  #readMetrics(): Metrics {
    const style = getComputedStyle(this);
    const count = (kernoName: string, axName: string, fallback: number): number | null => {
      const text =
        style.getPropertyValue(kernoName).trim() || style.getPropertyValue(axName).trim();
      return text === 'auto' ? null : Math.max(1, Math.floor(Number.parseFloat(text) || fallback));
    };
    return {
      cellWidth: Math.max(
        1,
        this.#readLength(style, '--k-tile-cell-width', '--tile-cell-width', 70),
      ),
      cellHeight: Math.max(
        1,
        this.#readLength(style, '--k-tile-cell-height', '--tile-cell-height', 70),
      ),
      gap: Math.max(0, this.#readLength(style, '--k-tile-gap', '--tile-gap', 10)),
      rows: count('--k-tile-rows', '--tile-rows', 6),
      columns: count('--k-tile-columns', '--tile-columns', DEFAULT_COLUMNS),
    };
  }

  get #m(): Metrics {
    if (!this.#metrics) this.#metrics = this.#readMetrics();
    return this.#metrics;
  }

  #fixedAcross(): number | null {
    return this.#vertical ? this.#m.columns : this.#m.rows;
  }

  #isAuto(): boolean {
    return this.#fixedAcross() === null;
  }

  #acrossForSize(): number {
    const m = this.#m;
    return this.#vertical
      ? Math.max(1, Math.floor((this.clientWidth + m.gap) / (m.cellWidth + m.gap)))
      : Math.max(1, Math.floor((this.clientHeight + m.gap) / (m.cellHeight + m.gap)));
  }

  #across(): number {
    const fixed = this.#fixedAcross();
    if (fixed !== null) return fixed;
    this.#autoAcross = this.#acrossForSize();
    return this.#autoAcross;
  }

  #layoutOptions() {
    const across = this.#across();
    return this.#vertical
      ? { orientation: 'vertical' as const, columns: across, strip: this.#strip }
      : { orientation: 'horizontal' as const, rows: across, strip: this.#strip };
  }

  #layoutOf(order: HTMLElement[]): LayoutResult {
    return layoutTiles(order.map(tileSpan), this.#layoutOptions());
  }

  #layout(animate: boolean, order = this.tiles): void {
    const result = this.#layoutOf(order);
    this.#applyLayout(order, result, { animate, scale: 1 });
  }

  #applyLayout(
    order: HTMLElement[],
    result: LayoutResult,
    options: {
      animate: boolean;
      scale: number;
      skip?: HTMLElement;
      duration?: number;
      together?: boolean;
    },
  ): void {
    if (this.#run && this.#run.kind !== 'enter' && this.#layoutChanges(order, result)) {
      this.#finishRun();
    }
    if (options.animate && !this.#movesSeen()) options = { ...options, animate: false };
    if (this.#hold && this.#hold.kind === 'exit') {
      this.#hold = null;
      this.#showHold();
    }
    const m = this.#m;
    const stepX = m.cellWidth + m.gap;
    const stepY = m.cellHeight + m.gap;
    const s = this.style;
    const fixed = this.#fixedAcross();
    const width = this.#vertical
      ? fixed !== null
        ? fixed * stepX - m.gap
        : null
      : result.columns * stepX - m.gap;
    const height = this.#vertical
      ? result.rows * stepY - m.gap
      : fixed !== null
        ? fixed * stepY - m.gap
        : null;
    if (width !== null) s.width = `${Math.max(0, width)}px`;
    else if (this.#ownWidth) s.width = '';
    if (height !== null) s.height = `${Math.max(0, height)}px`;
    else if (this.#ownHeight) s.height = '';
    this.#ownWidth = width !== null;
    this.#ownHeight = height !== null;
    this.#extent = this.#vertical ? result.rows : result.columns;
    if (this.#boundary) this.#boundary.changed(this);

    let moved = 0;
    order.forEach((tile, i) => {
      const span = tileSpan(tile);
      const p = result.placements[i]!;
      const ts = tile.style;
      const w = `${span.columns * stepX - m.gap}px`;
      const h = `${span.rows * stepY - m.gap}px`;
      if (ts.width !== w) ts.width = w;
      if (ts.height !== h) ts.height = h;
      if (tile === options.skip) return;
      if (
        this.#place(
          tile,
          p.column * stepX,
          p.row * stepY,
          options.scale,
          options.animate,
          options.together ? 0 : moved,
          options.duration || REPOSITION_MS,
        )
      ) {
        moved++;
      }
    });
    for (const tile of Array.from(this.#shown.keys())) {
      if (tile.parentElement !== this) this.#shown.delete(tile);
    }
  }

  #movesSeen(): boolean {
    if (this.#hold && this.#hold.kind === 'enter') return false;
    if (this.#run && this.#run.kind === 'enter') return false;
    if (!this.getClientRects().length) return false;
    return getComputedStyle(this).visibility !== 'hidden';
  }

  #place(
    tile: HTMLElement,
    x: number,
    y: number,
    scale: number,
    animate: boolean,
    staggerIndex: number,
    duration: number,
  ): boolean {
    const before = this.#shown.get(tile);
    if (before && before.x === x && before.y === y && before.scale === scale) return false;
    const from = before ? this.#painted.get(tile) : undefined;
    if (before && before.animation) before.animation.cancel();
    let animation: Motion | null = null;
    if (animate && before && from && !prefersReducedMotion()) {
      const delay = Math.min(STAGGER_CAP_MS, staggerIndex * STAGGER_MS);
      animation = new ScriptedMove(
        (p) => this.#paint(tile, p.x, p.y, p.scale),
        from,
        { x, y, scale },
        duration,
        delay,
      );
    } else {
      this.#paint(tile, x, y, scale);
    }
    this.#shown.set(tile, { x, y, scale, animation });
    return Boolean(animation);
  }

  #layoutChanges(order: HTMLElement[], result: LayoutResult): boolean {
    if (Array.from(this.#shown.keys()).some((tile) => tile.parentElement !== this)) return true;
    const m = this.#m;
    const stepX = m.cellWidth + m.gap;
    const stepY = m.cellHeight + m.gap;
    return order.some((tile, i) => {
      const p = result.placements[i]!;
      const at = this.#shown.get(tile);
      const span = tileSpan(tile);
      return (
        !at ||
        at.x !== p.column * stepX ||
        at.y !== p.row * stepY ||
        tile.style.width !== `${span.columns * stepX - m.gap}px` ||
        tile.style.height !== `${span.rows * stepY - m.gap}px`
      );
    });
  }

  #paint(tile: HTMLElement, x: number, y: number, scale: number): void {
    this.#painted.set(tile, { x, y, scale });
    this.#writeTile(tile);
  }

  #variantOf(options: EntranceOptions): EntranceVariant {
    return parseVariant(options.variant || '') || this.#entranceVariant() || 'desktop';
  }

  #entranceVariant(): EntranceVariant | null {
    const style = getComputedStyle(this);
    const raw =
      style.getPropertyValue('--k-tile-entrance').trim() ||
      style.getPropertyValue('--tile-entrance').trim();
    return parseVariant(raw);
  }

  #play(kind: 'enter' | 'exit', variant: EntranceVariant): Promise<void> {
    if (kind === 'enter') {
      this.#entered = true;
      this.#stopWatching();
    }
    this.#finishRun();
    this.#seenVariant = this.#entranceVariant();
    const params = readParams(getComputedStyle(this));
    const desktopEnter = kind === 'enter' && variant === 'desktop' && !prefersReducedMotion();
    if (desktopEnter) this.#bandSize = params.enterBand || this.#strip;
    if (this.#boundary) {
      if (desktopEnter) this.#boundary.join(this, performance.now());
      else this.#boundary.leave(this);
    }
    if (prefersReducedMotion()) {
      this.#hold = kind === 'exit' ? holdFor(kind, variant, params) : null;
      this.#showHold();
      return nextFrame();
    }
    const duration =
      variant === 'mobile'
        ? params.turnstileDuration
        : kind === 'enter'
          ? enterLength(params)
          : params.exitDuration;
    const randoms = new Map<HTMLElement, number>();
    for (const tile of this.tiles) randoms.set(tile, Math.random());
    return new Promise<void>((resolve) => {
      this.#run = {
        kind,
        variant,
        start: performance.now(),
        duration,
        params,
        randoms,
        done: resolve,
      };
      this.#hold = null;
      this.#runFrame(performance.now());
      this.#kick();
    });
  }

  #runFrame(now: number): void {
    const run = this.#run;
    if (!run) return;
    const t = now - run.start;
    const p = run.params;
    const m = this.#m;
    let total = run.duration;
    const vertical = this.#vertical;
    const step = vertical ? m.cellHeight + m.gap : m.cellWidth + m.gap;
    const desktopEnter = run.variant !== 'mobile' && run.kind === 'enter';
    const mobile = run.variant === 'mobile';
    const box = desktopEnter || mobile ? this.getBoundingClientRect() : null;
    const viewport = vertical ? window.innerHeight : window.innerWidth;
    const center = box ? viewport / 2 - (vertical ? box.top : box.left) : 0;
    const place = desktopEnter && this.#boundary ? this.#boundary.place(this) : null;
    const across = place ? place.across : vertical ? this.clientWidth / 2 : this.clientHeight / 2;
    const offset = place ? place.offset : 0;
    const bandSize = p.enterBand || this.#strip;

    for (const tile of this.tiles) {
      const at = this.#shown.get(tile);
      if (!at) continue;
      let frame: EntranceFrame;
      if (mobile) {
        const begin = turnstileBegin(at.x, at.y, run.kind === 'enter', run.randoms.get(tile) || 0);
        frame = turnstile(run.duration > 0 ? t / run.duration : 1, begin, run.kind === 'enter', p);
        const origin = turnstileOrigin(
          box!.left + at.x,
          box!.top + at.y,
          p.turnstileOrigin,
          window.innerHeight,
        );
        const look = this.#lookOf(tile);
        look.originX = origin.x;
        look.originY = origin.y;
      } else if (desktopEnter) {
        const band = Math.floor(Math.round((vertical ? at.y : at.x) / step) / bandSize);
        const delay = p.enterDelay + (offset + band) * p.enterStagger;
        total = Math.max(total, delay + run.duration);
        const middle = band * bandSize * step + (bandSize * step - m.gap) / 2;
        frame = enterDesktop(t, delay, bandShift(middle, center, viewport, p), p);
        const half = { x: tile.offsetWidth / 2, y: tile.offsetHeight / 2 };
        const along = (vertical ? at.y + half.y : at.x + half.x) - middle;
        const off = (vertical ? at.x + half.x : at.y + half.y) - across;
        const pull = frame.scale - 1;
        const look = this.#lookOf(tile);
        look.dx = vertical ? pull * off : frame.dx + pull * along;
        look.dy = vertical ? frame.dx + pull * along : pull * off;
        look.grow = frame.scale;
        look.rotateY = 0;
        look.perspective = p.turnstilePerspective;
        look.enter = frame.enter;
        this.#writeTile(tile);
        continue;
      } else {
        frame = exitDesktop(t, p);
      }
      const look = this.#lookOf(tile);
      look.dx = frame.dx;
      look.dy = 0;
      look.grow = frame.scale;
      look.rotateY = frame.rotateY;
      look.perspective = p.turnstilePerspective;
      look.enter = frame.enter;
      this.#writeTile(tile);
    }
    if (t >= total) this.#finishRun();
  }

  #finishRun(): void {
    const run = this.#run;
    if (!run) return;
    this.#run = null;
    this.#hold = run.kind === 'exit' ? holdFor('exit', run.variant, run.params) : null;
    this.#showHold();
    run.done();
  }

  #jumpEntrance(): void {
    this.#finishRun();
    if (this.#hold && this.#hold.kind === 'enter') {
      this.#stopWatching();
      this.#entered = true;
      this.#hold = null;
      this.#showHold();
    }
  }

  #onFocusIn = (): void => {
    if (this.#run && this.#run.kind === 'enter') this.#finishRun();
    if (this.#hold && this.#hold.kind === 'enter') this.#jumpEntrance();
  };

  #showHold(): void {
    const hold = this.#hold;
    const box = hold && hold.rotateY ? this.getBoundingClientRect() : null;
    for (const tile of this.tiles) {
      const look = this.#lookOf(tile);
      setEntrance(look, hold);
      const at = this.#shown.get(tile);
      if (box && hold && at) {
        const origin = turnstileOrigin(
          box.left + at.x,
          box.top + at.y,
          hold.origin,
          window.innerHeight,
        );
        look.originX = origin.x;
        look.originY = origin.y;
      }
      this.#writeTile(tile);
    }
  }

  #lookOf(tile: HTMLElement): Look {
    let look = this.#looks.get(tile);
    if (!look) {
      look = {
        dx: 0,
        dy: 0,
        grow: 1,
        rotateY: 0,
        perspective: DEFAULT_PERSPECTIVE,
        originX: 0,
        originY: 0,
        enter: 1,
        launch: 1,
        launchAlpha: 1,
        drag: 1,
        wroteOpacity: false,
        wroteOrigin: false,
        motionKey: '',
      };
      setEntrance(look, this.#hold);
      this.#looks.set(tile, look);
    }
    return look;
  }

  #watchEntrance(): void {
    if (this.#entered) return;
    this.#primeHold();
    if (typeof IntersectionObserver === 'undefined') {
      const variant = this.#entranceVariant();
      if (variant) void this.enter({ variant });
      return;
    }
    this.#visibility = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      const variant = this.#entranceVariant();
      if (variant) void this.enter({ variant });
    });
    this.#visibility.observe(this);
  }

  #primeHold(): void {
    if (this.#entered || (this.#hold && this.#hold.kind === 'exit')) return;
    const variant = this.#entranceVariant();
    this.#hold = variant ? holdFor('enter', variant, readParams(getComputedStyle(this))) : null;
    this.#showHold();
  }

  #stopWatching(): void {
    this.#visibility?.disconnect();
    this.#visibility = null;
  }

  #kick(): void {
    if (!this.#animFrame) this.#animFrame = requestAnimationFrame(this.#tick);
  }

  #tick = (): void => {
    this.#animFrame = 0;
    const now = performance.now();
    this.#runFrame(now);
    const launching = this.#launchFrame(now);
    if (this.#run || launching) this.#kick();
  };

  #onLaunchStart = (event: Event): void => {
    const source = this.#tileOf(event);
    void Promise.resolve().then(() => {
      if (!event.defaultPrevented) this.#startLaunch(source);
    });
  };

  #onLaunchEnd = (): void => {
    this.#endLaunch();
    const variant = this.#entranceVariant();
    if (variant) void this.enter({ variant });
  };

  #startLaunch(source: HTMLElement | null): void {
    const params = readParams(getComputedStyle(this));
    this.#clearLaunch();
    const duration = prefersReducedMotion() ? 0 : params.launchDuration;
    const rect = this.getBoundingClientRect();
    const cx = window.innerWidth / 2 - rect.left;
    const cy = window.innerHeight / 2 - rect.top;
    this.#launch = {
      source,
      cx,
      cy,
      start: performance.now(),
      duration,
      scale: params.launchScale,
    };
    if (source) source.style.zIndex = '2';
    this.#launchFrame(performance.now());
    this.#kick();
  }

  #launchFrame(now: number): boolean {
    const l = this.#launch;
    if (!l) return false;
    const t = l.duration > 0 ? clamp01((now - l.start) / l.duration) : 1;
    const e = t >= 1 ? 1 : ease(t);
    for (const tile of this.tiles) {
      if (tile === l.source) continue;
      const look = this.#lookOf(tile);
      look.launch = 1 + (l.scale - 1) * e;
      look.launchAlpha = 1 - e;
      this.#writeTile(tile);
    }
    return t < 1;
  }

  #endLaunch(): void {
    if (
      this.#launch &&
      this.#launch.source &&
      (!this.#gesture || this.#gesture.tile !== this.#launch.source)
    ) {
      this.#launch.source.style.zIndex = '';
    }
    this.#launch = null;
    this.#clearLaunch();
  }

  #clearLaunch(): void {
    for (const tile of this.tiles) {
      const look = this.#lookOf(tile);
      look.launch = 1;
      look.launchAlpha = 1;
      this.#writeTile(tile);
    }
  }

  #writeTile(tile: HTMLElement): void {
    const at = this.#painted.get(tile);
    if (!at) return;
    const look = this.#lookOf(tile);
    let x = at.x + look.dx;
    let y = at.y + look.dy;
    let scale = at.scale * look.grow;
    if (look.launch !== 1) {
      const l = look.launch;
      const cx = this.#launch ? this.#launch.cx : this.clientWidth / 2;
      const cy = this.#launch ? this.#launch.cy : this.clientHeight / 2;
      x = cx + l * (x - cx) - (1 - l) * (tile.offsetWidth / 2);
      y = cy + l * (y - cy) - (1 - l) * (tile.offsetHeight / 2);
      scale *= l;
    }
    const turned = look.rotateY !== 0;
    const alpha = look.enter * look.launchAlpha * look.drag;
    let transform = transformOf(x, y, scale);
    const motion = (tile as Motional).motion;
    if (typeof motion === 'function') {
      tile.style.transform = transform;
      if (look.wroteOpacity) tile.style.opacity = '';
      if (look.wroteOrigin) tile.style.transformOrigin = '';
      look.wroteOpacity = look.wroteOrigin = false;
      const state: SurfaceMotionState | null = turned || alpha < 1 ? { opacity: alpha } : null;
      if (state && turned) {
        state.rotateY = look.rotateY;
        state.perspective = look.perspective;
        state.originX = look.originX;
        state.originY = look.originY;
      }
      const key = state ? JSON.stringify(state) : '';
      if (key !== look.motionKey) {
        look.motionKey = key;
        motion.call(tile, state);
      }
      return;
    }
    if (turned) transform += ` perspective(${look.perspective}px) rotateY(${look.rotateY}deg)`;
    tile.style.transform = transform;
    if (turned || look.wroteOrigin) {
      tile.style.transformOrigin = turned ? `${look.originX}px ${look.originY}px` : '';
    }
    look.wroteOrigin = turned;
    if (alpha < 1 || look.wroteOpacity) tile.style.opacity = alpha < 1 ? String(alpha) : '';
    look.wroteOpacity = alpha < 1;
  }

  #fadeDrag(tile: HTMLElement, to: number, duration: number, done?: () => void): void {
    const look = this.#lookOf(tile);
    const running = fades.get(tile);
    if (running) cancelAnimationFrame(running);
    fades.delete(tile);
    const from = look.drag;
    const reduced = prefersReducedMotion();
    if (from === to || reduced) {
      look.drag = to;
      this.#writeTile(tile);
      if (done) window.setTimeout(done, reduced ? 0 : duration);
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) {
        look.drag = to;
        this.#writeTile(tile);
        fades.delete(tile);
        if (done) done();
        return;
      }
      look.drag = from + (to - from) * ease(t);
      this.#writeTile(tile);
      fades.set(tile, requestAnimationFrame(step));
    };
    fades.set(tile, requestAnimationFrame(step));
  }

  #tileOf(event: Event): HTMLElement | null {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node instanceof HTMLElement && node.parentElement === this) return node;
    }
    let el = event.target as Element | null;
    while (el && el.parentElement !== this) el = el.parentElement;
    return el as HTMLElement | null;
  }

  #onPointerDown = (event: PointerEvent): void => {
    this.#lastPointerType = event.pointerType;
    this.#lastPointerTime = Date.now();
    if (
      this.#gesture ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }
    const tile = this.#tileOf(event);
    if (!tile) return;
    const mode = this.#dragMode;
    const hasMenu = this.hasAttribute('contextmenu') && event.pointerType !== 'mouse';
    if (mode === 'none' && !hasMenu) return;
    this.#gesture = {
      tile,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(this.#onHold, this.#holdDelay),
      held: false,
      lifted: false,
      dragging: false,
      grabX: 0,
      grabY: 0,
      order: [],
      from: 0,
      to: 0,
      frame: 0,
    };
    window.addEventListener('pointermove', this.#onPointerMove);
    window.addEventListener('pointerup', this.#onPointerUp);
    window.addEventListener('pointercancel', this.#onPointerCancel);
    window.addEventListener('keydown', this.#onKeyDown);
  };

  #onHold = (): void => {
    const g = this.#gesture;
    if (!g || g.dragging) return;
    g.held = true;
    const mode = this.#dragMode;
    if (mode === 'hold' || (mode === 'cross-slide' && g.pointerType !== 'mouse')) {
      this.#lift();
    }
  };

  #onPointerMove = (event: PointerEvent): void => {
    const g = this.#gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    g.x = event.clientX;
    g.y = event.clientY;
    if (g.dragging) {
      if (!g.frame) g.frame = requestAnimationFrame(this.#dragFrame);
      return;
    }
    if (Math.hypot(g.x - g.startX, g.y - g.startY) <= SLOP) return;
    const mode = this.#dragMode;
    const vertical = Math.abs(g.y - g.startY) > Math.abs(g.x - g.startX);
    const crossSlide = mode === 'cross-slide' && (g.pointerType === 'mouse' || g.held || vertical);
    if (mode === 'press' || crossSlide || (mode === 'hold' && g.held)) {
      this.#startDrag();
    } else {
      this.#endGesture();
    }
  };

  #onPointerUp = (event: PointerEvent): void => {
    const g = this.#gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    if (g.dragging) {
      this.#drop(false);
      return;
    }
    if (g.held && g.pointerType !== 'mouse' && this.hasAttribute('contextmenu')) {
      this.#fireContextMenu(g.tile, g.x, g.y, g.pointerType);
      suppressNextClick();
    }
    this.#endGesture();
  };

  #onPointerCancel = (event: PointerEvent): void => {
    const g = this.#gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    if (g.dragging) this.#drop(true);
    else this.#endGesture();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#gesture && this.#gesture.dragging) {
      event.preventDefault();
      this.#drop(true);
    }
  };

  #onTouchMove = (event: TouchEvent): void => {
    const g = this.#gesture;
    if (g && (g.lifted || g.dragging) && event.cancelable) event.preventDefault();
  };

  #onContextMenu = (event: MouseEvent): void => {
    const tile = this.#tileOf(event);
    if (!tile) return;
    const g = this.#gesture;
    if (g && g.pointerType !== 'mouse') {
      if (this.hasAttribute('contextmenu') || this.#dragMode !== 'none') event.preventDefault();
      return;
    }
    if (!this.hasAttribute('contextmenu')) return;
    event.preventDefault();
    const recent = Date.now() - this.#lastPointerTime < 1000;
    const keyboard = !recent || (event.clientX === 0 && event.clientY === 0 && event.button !== 2);
    let x = event.clientX;
    let y = event.clientY;
    if (keyboard) {
      const r = tile.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    this.#fireContextMenu(tile, x, y, keyboard ? 'keyboard' : this.#lastPointerType || 'mouse');
  };

  #fireContextMenu(tile: HTMLElement, clientX: number, clientY: number, pointerType: string): void {
    tile.dispatchEvent(
      new CustomEvent<TileContextMenuDetail>('tilecontextmenu', {
        bubbles: true,
        composed: true,
        detail: { clientX, clientY, pointerType },
      }),
    );
  }

  #lift(): void {
    const g = this.#gesture!;
    if (g.lifted) return;
    g.lifted = true;
    this.#jumpEntrance();
    const release = (g.tile as HTMLElement & { release?: (takenOver?: boolean) => void }).release;
    if (typeof release === 'function') release.call(g.tile, true);
    g.tile.dispatchEvent(new CustomEvent('tilelift', { bubbles: true, composed: true }));
    const shown = this.#shown.get(g.tile);
    if (shown) this.#place(g.tile, shown.x, shown.y, DRAG_SCALE, true, 0, LIFT_MS);
    g.tile.style.zIndex = '1';
    this.#fadeDrag(g.tile, dragOpacity(g.tile), LIFT_MS);
    for (const tile of this.tiles) {
      if (tile === g.tile) continue;
      const s = this.#shown.get(tile);
      if (s) this.#place(tile, s.x, s.y, OTHERS_SCALE, true, 0, LIFT_MS);
    }
  }

  #startDrag(): void {
    const g = this.#gesture!;
    window.clearTimeout(g.timer);
    const start = new CustomEvent('tiledragstart', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!g.tile.dispatchEvent(start)) {
      this.#endGesture();
      return;
    }
    g.dragging = true;
    g.order = this.tiles;
    g.from = g.to = g.order.indexOf(g.tile);
    const shown = this.#shown.get(g.tile);
    const rect = this.getBoundingClientRect();
    g.grabX = g.startX - rect.left - (shown ? shown.x : 0);
    g.grabY = g.startY - rect.top - (shown ? shown.y : 0);
    this.#lift();
    g.frame = requestAnimationFrame(this.#dragFrame);
  }

  #dragFrame = (): void => {
    const g = this.#gesture;
    if (!g || !g.dragging) return;
    g.frame = 0;
    const m = this.#m;
    const rect = this.getBoundingClientRect();
    const x = g.x - rect.left - g.grabX;
    const y = g.y - rect.top - g.grabY;
    const shown = this.#shown.get(g.tile);
    if (shown && shown.animation) shown.animation.cancel();
    this.#paint(g.tile, x, y, DRAG_SCALE);
    this.#shown.set(g.tile, { x, y, scale: DRAG_SCALE, animation: null });
    const target = dropTarget(
      g.order.map(tileSpan),
      g.from,
      { column: x / (m.cellWidth + m.gap), row: y / (m.cellHeight + m.gap) },
      { ...this.#layoutOptions(), current: g.to },
    );
    if (target.index === g.to) return;
    g.to = target.index;
    this.#applyLayout(moveIndex(g.order, g.from, g.to), target.layout, {
      animate: true,
      scale: OTHERS_SCALE,
      skip: g.tile,
    });
  };

  #drop(cancel: boolean): void {
    const g = this.#gesture!;
    if (g.frame) cancelAnimationFrame(g.frame);
    g.frame = 0;
    const tile = g.tile;
    this.#gesture = null;
    this.#removeListeners(g);
    suppressNextClick();
    const to = this.#reorder(tile, g.from, cancel ? g.from : g.to, 'pointer', DROP_SETTLE);
    this.#fadeDrag(tile, 1, DROP_MS, () => {
      if (!this.#gesture || this.#gesture.tile !== tile) tile.style.zIndex = '';
    });
    tile.dispatchEvent(
      new CustomEvent<TileDragEndDetail>('tiledragend', {
        bubbles: true,
        composed: true,
        detail: { from: g.from, to },
      }),
    );
  }

  #reorder(
    tile: HTMLElement,
    from: number,
    to: number,
    reason: TileReorderReason,
    settle: Settle,
  ): number {
    if (to !== from) {
      const event = new CustomEvent<TileReorderDetail>('tilereorder', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { from, to, reason },
      });
      if (!tile.dispatchEvent(event)) to = from;
    }
    const order = moveIndex(this.tiles, from, to);
    if (to !== from) {
      this.#moveNode(tile, order[to + 1] || null);
      this.#announceMove(tile, to + 1);
      this.#reveal(tile, settle.duration);
    }
    this.#applyLayout(order, this.#layoutOf(order), {
      animate: true,
      scale: 1,
      duration: settle.duration,
      together: settle.together,
    });
    return to;
  }

  #moveNode(tile: HTMLElement, next: HTMLElement | null): void {
    const self = this as HTMLElement & {
      moveBefore?: (node: Node, child: Node | null) => void;
    };
    if (typeof self.moveBefore === 'function') {
      self.moveBefore(tile, next);
    } else {
      const focused = deepActiveElement();
      this.insertBefore(tile, next);
      if (focused && within(focused, tile)) focused.focus({ preventScroll: true });
    }
    if (this.#mutationObserver) this.#mutationObserver.takeRecords();
  }

  #announceMove(tile: HTMLElement, position: number): void {
    const live = this.#live;
    if (!live) return;
    window.clearTimeout(this.#announceTimer);
    live.textContent = '';
    if (this.getAttribute('announce') === 'off') return;
    this.#announceTimer = window.setTimeout(() => {
      live.textContent = this.describeMove(tile, position, this.tiles.length);
    }, 150);
  }

  #reveal(tile: HTMLElement, duration: number): void {
    const check = (): void => {
      if (clipped(tile)) tile.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    if (prefersReducedMotion()) check();
    else window.setTimeout(check, duration);
  }

  #onKeyMove = (event: KeyboardEvent): void => {
    if (
      !event.altKey ||
      !event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.defaultPrevented
    ) {
      return;
    }
    const direction = directionOf(event.key);
    if (!direction) return;
    if (this.#dragMode === 'none' || this.#gesture) return;
    const target = (
      typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target
    ) as HTMLElement | null;
    if (!target || isEditable(target)) return;
    const tile = this.#tileOf(event);
    if (!tile) return;
    event.preventDefault();
    const from = this.tiles.indexOf(tile);
    const to = keyboardTarget(this.tiles.map(tileSpan), from, direction, this.#layoutOptions());
    if (to === from) return;
    this.#jumpEntrance();
    this.#reorder(tile, from, to, 'keyboard', MOVE_SETTLE);
  };

  #endGesture(): void {
    const g = this.#gesture;
    if (!g) return;
    this.#gesture = null;
    this.#removeListeners(g);
    if (g.lifted) {
      suppressNextClick();
      for (const tile of this.tiles) {
        const s = this.#shown.get(tile);
        if (s) this.#place(tile, s.x, s.y, 1, true, 0, DROP_MS);
      }
      this.#fadeDrag(g.tile, 1, DROP_MS, () => {
        g.tile.style.zIndex = '';
      });
    }
  }

  #removeListeners(g: Gesture): void {
    window.clearTimeout(g.timer);
    if (g.frame) cancelAnimationFrame(g.frame);
    window.removeEventListener('pointermove', this.#onPointerMove);
    window.removeEventListener('pointerup', this.#onPointerUp);
    window.removeEventListener('pointercancel', this.#onPointerCancel);
    window.removeEventListener('keydown', this.#onKeyDown);
  }
}

interface Motion {
  readonly playState: string;
  cancel(): void;
}

function ease(t: number): number {
  const [x1, y1, x2, y2] = [0.1, 0.9, 0.2, 1];
  const at = (a: number, b: number, u: number): number =>
    3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

class ScriptedMove implements Motion {
  playState = 'running';
  #frame = 0;
  readonly #start = performance.now();
  readonly #draw: (p: Placed) => void;
  readonly #from: Placed;
  readonly #to: Placed;
  readonly #duration: number;
  readonly #delay: number;

  constructor(
    draw: (p: Placed) => void,
    from: Placed,
    to: Placed,
    duration: number,
    delay: number,
  ) {
    this.#draw = draw;
    this.#from = from;
    this.#to = to;
    this.#duration = duration;
    this.#delay = delay;
    draw(from);
    this.#frame = requestAnimationFrame(this.#step);
  }

  #step = (now: number): void => {
    const t = Math.min(1, Math.max(0, (now - this.#start - this.#delay) / this.#duration));
    if (t >= 1) {
      this.#draw(this.#to);
      this.playState = 'finished';
      this.#frame = 0;
      return;
    }
    const k = ease(t);
    const from = this.#from;
    const to = this.#to;
    this.#draw({
      x: from.x + (to.x - from.x) * k,
      y: from.y + (to.y - from.y) * k,
      scale: from.scale + (to.scale - from.scale) * k,
    });
    this.#frame = requestAnimationFrame(this.#step);
  };

  cancel(): void {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.playState = 'idle';
  }
}

function transformOf(x: number, y: number, scale: number): string {
  return scale === 1 ? `translate(${x}px, ${y}px)` : `translate(${x}px, ${y}px) scale(${scale})`;
}

function holdFor(kind: 'enter' | 'exit', variant: EntranceVariant, p: Params): Hold {
  const mobile = variant === 'mobile';
  const desktopEnter = kind === 'enter' && !mobile;
  return {
    kind,
    dx: 0,
    dy: 0,
    grow: desktopEnter ? p.enterScale : 1,
    rotateY: mobile ? 90 : 0,
    perspective: p.turnstilePerspective,
    origin: p.turnstileOrigin,
    enter: 0,
  };
}

function setEntrance(look: Look, hold: Hold | null): void {
  look.dx = hold ? hold.dx : 0;
  look.dy = hold ? hold.dy : 0;
  look.grow = hold ? hold.grow : 1;
  look.rotateY = hold ? hold.rotateY : 0;
  look.perspective = hold ? hold.perspective : DEFAULT_PERSPECTIVE;
  look.enter = hold ? hold.enter : 1;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function dragOpacity(tile: HTMLElement): number {
  const style = getComputedStyle(tile);
  const raw =
    style.getPropertyValue('--k-tile-drag-opacity').trim() ||
    style.getPropertyValue('--tile-drag-opacity').trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DRAG_OPACITY;
}

const fades = new WeakMap<HTMLElement, number>();

function suppressNextClick(): void {
  const stop = (event: Event): void => {
    event.stopPropagation();
    event.preventDefault();
    window.removeEventListener('click', stop, true);
  };
  window.addEventListener('click', stop, true);
  window.setTimeout(() => window.removeEventListener('click', stop, true), 400);
}

export type DescribeMove = (tile: Element, position: number, count: number) => string;

function describeMoved(tile: Element, position: number, count: number): string {
  const lang = resolveLang(tile);
  return translate(lang, 'tileMoved', labelOf(tile), String(position), String(count));
}

function labelOf(tile: Element): string {
  const own = (tile.getAttribute('aria-label') || '').trim();
  if (own) return own;
  const inner = tile.querySelectorAll('[aria-label]');
  for (let i = 0; i < inner.length; i++) {
    const label = (inner[i]!.getAttribute('aria-label') || '').trim();
    if (label) return label;
  }
  return (tile.textContent || '').trim();
}

function directionOf(key: string): Direction | null {
  switch (key) {
    case 'ArrowLeft':
    case 'Left':
      return 'left';
    case 'ArrowRight':
    case 'Right':
      return 'right';
    case 'ArrowUp':
    case 'Up':
      return 'up';
    case 'ArrowDown':
    case 'Down':
      return 'down';
    default:
      return null;
  }
}

function isEditable(el: HTMLElement): boolean {
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

function deepActiveElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement as HTMLElement;
  }
  return el;
}

function within(node: Node, root: Node): boolean {
  for (let n: Node | null = node; n; n = n.parentNode || (n as ShadowRoot).host || null) {
    if (n === root) return true;
  }
  return false;
}

function clipped(tile: HTMLElement): boolean {
  const r = tile.getBoundingClientRect();
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  for (let el = tile.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
    const b = el.getBoundingClientRect();
    left = Math.max(left, b.left);
    top = Math.max(top, b.top);
    right = Math.min(right, b.right);
    bottom = Math.min(bottom, b.bottom);
  }
  return r.left < left || r.top < top || r.right > right || r.bottom > bottom;
}
