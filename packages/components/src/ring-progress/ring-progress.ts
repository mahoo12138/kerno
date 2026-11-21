import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { token } from '@kerno/tokens';
import { ringProgressStyles } from './ring-progress.styles.js';

export interface RingProgressSection {
  /** Percentage value (`0`–`100`). */
  value: number;
  /** CSS color string (defaults to Kerno accent token). */
  color?: string;
  /** Accessible / tooltip description for this segment. */
  label?: string;
}

export interface RingSectionHoverDetail {
  index: number;
  section: RingProgressSection | null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Multi-segment SVG circular progress ring inspired by Mantine `RingProgress`,
 * supporting arbitrary colored segments, centered metric slot, optional round
 * caps, and interactive segment hover events.
 *
 * @tag k-ring-progress
 *
 * @slot - Centered label / KPI readout inside the ring.
 *
 * @csspart svg - Outer SVG ring element.
 * @csspart label - Centered overlay slot container.
 *
 * @fires k-section-hover - Fired when pointer enters or leaves a ring segment (`{ index, section }`).
 */
export class KRingProgress extends KernoElement {
  static override styles = ringProgressStyles;
  static override template = /* html */ `<svg part="svg" class="svg" role="img"></svg><div part="label" class="label"><slot></slot></div>`;

  @prop({ attribute: false }) accessor sections: readonly RingProgressSection[] = [];
  /** Single-section convenience value (`0`–`100`) used when `sections` is empty. */
  @prop({ type: Number, reflect: true }) accessor value = 0;
  @prop({ type: Number, reflect: true }) accessor size = 128;
  @prop({ type: Number, reflect: true }) accessor thickness = 12;
  @prop({ type: Boolean, attribute: 'round-caps', reflect: true }) accessor roundCaps = false;
  @prop({ attribute: 'root-color', reflect: true }) accessor rootColor = '';
  @prop({ reflect: true }) accessor label = 'Progress ring';

  #svg!: SVGSVGElement;

  protected override setup(): void {
    this.#svg = this.renderRoot.querySelector('.svg') as SVGSVGElement;
  }

  protected override update(_changed: PropertyValues): void {
    const size = Math.max(32, Math.floor(this.size) || 128);
    const thickness = Math.max(2, Math.min(size / 2 - 2, Math.floor(this.thickness) || 12));
    const half = size / 2;
    const radius = half - thickness / 2;
    const circumference = 2 * Math.PI * radius;

    this.#svg.setAttribute('width', String(size));
    this.#svg.setAttribute('height', String(size));
    this.#svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    this.#svg.setAttribute('aria-label', this.label || 'Progress ring');

    if (this.rootColor) {
      this.style.setProperty('--k-ring-root-color', this.rootColor);
    }

    const activeSections: readonly RingProgressSection[] =
      this.sections.length > 0
        ? this.sections
        : this.value > 0
          ? [{ value: this.value, color: token('color.accent.default') }]
          : [];

    this.#svg.innerHTML = '';

    const track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('class', 'track');
    track.setAttribute('cx', String(half));
    track.setAttribute('cy', String(half));
    track.setAttribute('r', String(radius));
    track.setAttribute('stroke-width', String(thickness));
    this.#svg.append(track);

    let accumulated = 0;
    activeSections.forEach((sec, index) => {
      const clamped = Math.max(0, Math.min(100 - accumulated, Number(sec.value) || 0));
      if (clamped <= 0) return;

      const segLength = (clamped / 100) * circumference;
      const startDeg = -90 + (accumulated / 100) * 360;
      accumulated += clamped;

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', 'segment');
      circle.setAttribute('cx', String(half));
      circle.setAttribute('cy', String(half));
      circle.setAttribute('r', String(radius));
      circle.setAttribute('stroke-width', String(thickness));
      circle.setAttribute('stroke', sec.color || token('color.accent.default'));
      circle.setAttribute('stroke-linecap', this.roundCaps ? 'round' : 'butt');
      circle.setAttribute(
        'stroke-dasharray',
        `${segLength.toFixed(2)} ${(circumference - segLength).toFixed(2)}`,
      );
      circle.setAttribute('transform', `rotate(${startDeg.toFixed(2)} ${half} ${half})`);

      if (sec.label) {
        const title = document.createElementNS(SVG_NS, 'title');
        title.textContent = `${sec.label}: ${clamped}%`;
        circle.append(title);
      }

      circle.addEventListener('pointerenter', () => {
        emit<RingSectionHoverDetail>(this, 'k-section-hover', { index, section: sec });
      });
      circle.addEventListener('pointerleave', () => {
        emit<RingSectionHoverDetail>(this, 'k-section-hover', { index: -1, section: null });
      });

      this.#svg.append(circle);
    });
  }
}
