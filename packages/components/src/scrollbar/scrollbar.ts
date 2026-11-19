import { KernoElement, isServer, prop, type PropertyValues } from '@kerno/core';
import { ScrollbarController } from './controller.js';
import { watchFocus } from './focus.js';
import { DOCUMENT_HIDE_CSS, pageScrollbarStyles, scrollViewStyles } from './scrollbar.styles.js';
import { documentTarget, elementTarget } from './target.js';
import type {
  Axis,
  AxisVisibility,
  IndicatorMode,
  MarkerAlign,
  ScrollMarker,
  ScrollMarkerInput,
  ScrollbarVariant,
  TouchMode,
  TrackClickMode,
} from './types.js';

const DOCUMENT_STYLE_ID = 'k-scrollbar-document-hide';
let documentStyleUses = 0;

function acquireDocumentStyle(): void {
  if (isServer) return;
  if (documentStyleUses++ > 0) return;
  if (document.getElementById(DOCUMENT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DOCUMENT_STYLE_ID;
  style.textContent = DOCUMENT_HIDE_CSS;
  document.head.append(style);
}

function releaseDocumentStyle(): void {
  if (isServer) return;
  if (--documentStyleUses > 0) return;
  documentStyleUses = 0;
  document.getElementById(DOCUMENT_STYLE_ID)?.remove();
}

/**
 * Scroll container with native scrolling and Fluent / Windows-style overlay
 * scrollbars, smooth glide, markers, and top-layer hover cards.
 *
 * @tag k-scroll-view
 *
 * @slot - Scrollable content.
 *
 * @csspart viewport - Native scrolling container.
 * @csspart content - Inner content wrapper.
 * @csspart scrollbar - Vertical or horizontal scrollbar container.
 * @csspart track - Scrollbar track background.
 * @csspart thumb - Draggable scrollbar thumb.
 * @csspart button - Arrow step buttons (`button-start`, `button-end`).
 * @csspart corner - Corner cell where both axes meet.
 * @csspart marker - Individual section/hit marker tick on the track.
 * @csspart card - Top-layer marker hover tooltip card.
 * @csspart card-content - Content wrapper inside the marker hover card.
 *
 * @fires k-marker-enter - Pointer enters a marker (`detail: { marker, markers }`).
 * @fires k-marker-leave - Pointer leaves the last hovered marker.
 * @fires k-marker-activate - Cancelable click activation on a marker.
 */
export class KScrollView extends KernoElement {
  static override styles = scrollViewStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div class="viewport" part="viewport"><div class="content" part="content"><slot></slot></div></div><div class="frame"></div><div class="cards"></div>`;

  /** Built-in visual style (`'fluent' | 'classic' | 'minimal'`). */
  @prop({ reflect: true }) accessor variant: ScrollbarVariant = 'fluent';
  /** Vertical bar visibility mode (`'auto' | 'always' | 'hidden'`). */
  @prop({ reflect: true }) accessor vertical: AxisVisibility = 'auto';
  /** Horizontal bar visibility mode (`'auto' | 'always' | 'hidden'`). */
  @prop({ reflect: true }) accessor horizontal: AxisVisibility = 'auto';
  /** Space-separated parts to omit (`thumb`, `button`, `track`, `corner`, `marker`, `card`). */
  @prop({ reflect: true }) accessor hide = '';
  /** Track press behavior (`'page' | 'jump'`). */
  @prop({ attribute: 'track-click', reflect: true }) accessor trackClick: TrackClickMode = 'page';
  /** Touch display mode (`'indicator' | 'bar'`). */
  @prop({ reflect: true }) accessor touch: TouchMode = 'indicator';
  /** Reveal trigger mode (`'auto' | 'near' | 'pinned'`). */
  @prop({ reflect: true }) accessor indicator: IndicatorMode = 'auto';
  /** CSS selector matching elements inside the scroll view to plot as markers. */
  @prop({ attribute: 'marker-selector', reflect: true }) accessor markerSelector = '';
  /** Axis for selector-collected markers (`'vertical' | 'horizontal'`). */
  @prop({ attribute: 'marker-axis', reflect: true }) accessor markerAxis: Axis = 'vertical';
  /** Target alignment when jumping to a marker (`'center' | 'start'`). */
  @prop({ attribute: 'marker-align', reflect: true }) accessor markerAlign: MarkerAlign = 'center';
  /** Snaps thumb edges and markers onto exact device pixels. */
  @prop({ type: Boolean, reflect: true }) accessor snap = false;
  /** Fades bars out and ignores input while suspended (e.g. during modal overlays). */
  @prop({ type: Boolean, reflect: true }) accessor suspended = false;

  #viewport!: HTMLDivElement;
  #controller!: ScrollbarController;
  #unwatchFocus: (() => void) | null = null;
  #pendingMarkers: Iterable<ScrollMarkerInput | Element> | null | undefined = undefined;

  /** Underlying native scroll viewport element. */
  get viewport(): HTMLElement {
    return this.#viewport;
  }

  /** Explicit markers list (`null` while `marker-selector` is in charge). */
  get markers(): ScrollMarker[] | null {
    return this.#controller ? this.#controller.markers : null;
  }

  set markers(value: Iterable<ScrollMarkerInput | Element> | null) {
    if (this.#controller) this.#controller.markers = value;
    else this.#pendingMarkers = value;
  }

  /** Forces a layout & token refresh on the next animation frame. */
  refresh(): void {
    this.#controller?.refresh();
  }

  /** Recollects and re-measures markers on the next animation frame. */
  refreshMarkers(): void {
    this.#controller?.refreshMarkers();
  }

  /** Synchronously flushes pending scrollbar layout and painting. */
  flush(): void {
    this.#controller?.flush();
  }

  override get scrollTop(): number {
    return this.#viewport?.scrollTop ?? 0;
  }

  override set scrollTop(value: number) {
    if (this.#viewport) this.#viewport.scrollTop = value;
  }

  override get scrollLeft(): number {
    return this.#viewport?.scrollLeft ?? 0;
  }

  override set scrollLeft(value: number) {
    if (this.#viewport) this.#viewport.scrollLeft = value;
  }

  override get scrollHeight(): number {
    return this.#viewport?.scrollHeight ?? 0;
  }

  override get scrollWidth(): number {
    return this.#viewport?.scrollWidth ?? 0;
  }

  override scrollTo(options?: ScrollToOptions): void;
  override scrollTo(x: number, y: number): void;
  override scrollTo(x?: ScrollToOptions | number, y?: number): void {
    if (!this.#viewport) return;
    if (typeof x === 'number') this.#viewport.scrollTo(x, y ?? 0);
    else this.#viewport.scrollTo(x);
  }

  override scrollBy(options?: ScrollToOptions): void;
  override scrollBy(x: number, y: number): void;
  override scrollBy(x?: ScrollToOptions | number, y?: number): void {
    if (!this.#viewport) return;
    if (typeof x === 'number') this.#viewport.scrollBy(x, y ?? 0);
    else this.#viewport.scrollBy(x);
  }

  override scroll(options?: ScrollToOptions): void;
  override scroll(x: number, y: number): void;
  override scroll(x?: ScrollToOptions | number, y?: number): void {
    if (typeof x === 'number') this.scrollTo(x, y ?? 0);
    else this.scrollTo(x);
  }

  protected override setup(): void {
    this.#viewport = this.renderRoot.querySelector('.viewport') as HTMLDivElement;
    const frame = this.renderRoot.querySelector('.frame') as HTMLElement;
    const cards = this.renderRoot.querySelector('.cards') as HTMLElement;

    this.#controller = new ScrollbarController({
      host: this,
      root: this.renderRoot,
      target: elementTarget(this.#viewport, this),
      frame,
      cards,
      viewport: this.#viewport,
    });

    if (this.#pendingMarkers !== undefined) {
      this.#controller.markers = this.#pendingMarkers;
      this.#pendingMarkers = undefined;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (isServer || !this.#viewport) return;
    this.#viewport.addEventListener('scroll', this.#reemit);
    this.#viewport.addEventListener('scrollend', this.#reemit);
    this.#unwatchFocus = watchFocus(this, this.#viewport);
    this.#controller.connect();
  }

  override disconnectedCallback(): void {
    this.#unwatchFocus?.();
    this.#unwatchFocus = null;
    this.#viewport?.removeEventListener('scroll', this.#reemit);
    this.#viewport?.removeEventListener('scrollend', this.#reemit);
    this.#controller?.disconnect();
    super.disconnectedCallback();
  }

  protected override update(_changed: PropertyValues): void {
    this.#controller?.refresh();
  }

  #reemit = (event: Event): void => {
    this.dispatchEvent(new Event(event.type));
  };
}

/**
 * Page-level overlay scrollbar replacing the document's native scrollbar while
 * keeping native window scrolling intact. Only one `<k-scrollbar>` is active
 * per document; additional instances warn and remain inert.
 *
 * @tag k-scrollbar
 */
export class KScrollbar extends KernoElement {
  static override styles = pageScrollbarStyles;
  static override template = /* html */ `<div class="frame"></div><div class="cards"></div>`;
  static #active: KScrollbar | null = null;

  @prop({ reflect: true }) accessor variant: ScrollbarVariant = 'fluent';
  @prop({ reflect: true }) accessor vertical: AxisVisibility = 'auto';
  @prop({ reflect: true }) accessor horizontal: AxisVisibility = 'auto';
  @prop({ reflect: true }) accessor hide = '';
  @prop({ attribute: 'track-click', reflect: true }) accessor trackClick: TrackClickMode = 'page';
  @prop({ reflect: true }) accessor touch: TouchMode = 'indicator';
  @prop({ reflect: true }) accessor indicator: IndicatorMode = 'near';
  @prop({ attribute: 'marker-selector', reflect: true }) accessor markerSelector = '';
  @prop({ attribute: 'marker-axis', reflect: true }) accessor markerAxis: Axis = 'vertical';
  @prop({ attribute: 'marker-align', reflect: true }) accessor markerAlign: MarkerAlign = 'center';
  @prop({ type: Boolean, reflect: true }) accessor snap = false;
  @prop({ type: Boolean, reflect: true }) accessor suspended = false;

  #controller!: ScrollbarController;
  #pendingMarkers: Iterable<ScrollMarkerInput | Element> | null | undefined = undefined;

  get markers(): ScrollMarker[] | null {
    return this.#controller ? this.#controller.markers : null;
  }

  set markers(value: Iterable<ScrollMarkerInput | Element> | null) {
    if (this.#controller) this.#controller.markers = value;
    else this.#pendingMarkers = value;
  }

  refresh(): void {
    this.#controller?.refresh();
  }

  refreshMarkers(): void {
    this.#controller?.refreshMarkers();
  }

  flush(): void {
    this.#controller?.flush();
  }

  protected override setup(): void {
    const frame = this.renderRoot.querySelector('.frame') as HTMLElement;
    const cards = this.renderRoot.querySelector('.cards') as HTMLElement;
    this.#controller = new ScrollbarController({
      host: this,
      root: this.renderRoot,
      target: documentTarget(),
      frame,
      cards,
      viewport: null,
    });
    if (this.#pendingMarkers !== undefined) {
      this.#controller.markers = this.#pendingMarkers;
      this.#pendingMarkers = undefined;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (isServer) return;
    if (KScrollbar.#active === this) return;
    if (KScrollbar.#active) {
      console.warn('<k-scrollbar>: only one page scrollbar may be active; this one stays inert.');
      return;
    }
    KScrollbar.#active = this;
    acquireDocumentStyle();
    this.#controller.connect();
  }

  override disconnectedCallback(): void {
    if (KScrollbar.#active === this) {
      KScrollbar.#active = null;
      this.#controller?.disconnect();
      releaseDocumentStyle();
    }
    super.disconnectedCallback();
  }

  protected override update(_changed: PropertyValues): void {
    if (KScrollbar.#active === this) {
      this.#controller?.refresh();
    }
  }
}
