import { FormAssociatedElement, emit, prop, state, type PropertyValues } from '@kerno/core';
import { ratingStyles } from './rating.styles.js';

export type RatingSize = 'sm' | 'md' | 'lg';

export interface RatingChangeDetail {
  value: number;
}

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.4l2.92 6.04 6.66.84-4.88 4.6 1.24 6.62L12 17.28l-5.94 3.22 1.24-6.62-4.88-4.6 6.66-.84z"/></svg>`;

/**
 * Form-associated star rating control supporting fractional steps (half/quarter
 * stars via `fractions`), pointer hover previews, `highlight-selected-only`,
 * keyboard stepping, and readonly display mode.
 *
 * @tag k-rating
 *
 * @csspart track - Focusable `role="slider"` track containing the rating symbols.
 * @csspart star - Individual rating symbol container.
 *
 * @fires k-rating-change - Fired when the committed rating changes (`{ value }`).
 * @fires input - Fired on rating change.
 * @fires change - Fired when rating commits.
 */
export class KRating extends FormAssociatedElement {
  static override styles = ratingStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="track" class="track" role="slider" aria-valuemin="0"></div>`;

  @prop({ type: Number, reflect: true }) accessor value = 0;
  @prop({ type: Number, reflect: true }) accessor count = 5;
  /** Number of selectable subdivisions per star (`1` = whole, `2` = half-star, `4` = quarter-star). */
  @prop({ type: Number, reflect: true }) accessor fractions = 1;
  @prop({ reflect: true }) accessor size: RatingSize = 'md';
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, reflect: true }) accessor clearable = true;
  @prop({ type: Boolean, attribute: 'highlight-selected-only', reflect: true })
  accessor highlightSelectedOnly = false;
  @prop({ reflect: true }) accessor label = 'Rating';

  @state() accessor #hoverValue: number | null = null;

  #track!: HTMLDivElement;
  #stars: { el: HTMLSpanElement; fill: SVGSVGElement }[] = [];
  #defaultValue = 0;
  #defaultCaptured = false;

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      const attr = this.getAttribute('value');
      this.#defaultValue = attr !== null ? Number(attr) || 0 : this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#hoverValue = null;
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#track = this.renderRoot.querySelector('.track') as HTMLDivElement;

    this.#track.addEventListener('pointerleave', () => {
      if (this.#hoverValue !== null) this.#hoverValue = null;
    });

    this.#track.addEventListener('keydown', (e) => {
      if (this.isDisabled || this.readonly) return;
      const step = this.#step();
      const max = this.#normalizedCount();
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        next = Math.min(max, this.#roundStep(this.value + step));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        next = Math.max(0, this.#roundStep(this.value - step));
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = max;
      }
      if (next !== null) {
        e.preventDefault();
        this.#commit(next);
      }
    });
  }

  protected override update(changed: PropertyValues): void {
    const count = this.#normalizedCount();
    if (changed.has('count') || this.#stars.length !== count) {
      this.#rebuildStars(count);
    }

    const active = this.#hoverValue ?? this.#clampedValue();
    this.#track.tabIndex = this.isDisabled || this.readonly ? -1 : 0;
    this.#track.setAttribute('aria-label', this.label || 'Rating');
    this.#track.setAttribute('aria-valuemax', String(count));
    this.#track.setAttribute('aria-valuenow', String(this.#clampedValue()));
    this.#track.setAttribute('aria-valuetext', `${this.#clampedValue()} out of ${count}`);
    this.#track.setAttribute('aria-readonly', this.readonly ? 'true' : 'false');
    this.#track.setAttribute('aria-disabled', this.isDisabled ? 'true' : 'false');

    this.#stars.forEach(({ fill }, i) => {
      const index = i + 1;
      let ratio: number;
      if (this.highlightSelectedOnly) {
        ratio = active > 0 && Math.ceil(active) === index ? 1 : 0;
      } else {
        ratio = Math.max(0, Math.min(1, active - i));
      }
      const rightInset = ((1 - ratio) * 100).toFixed(2);
      fill.style.clipPath = `inset(0 ${rightInset}% 0 0)`;
    });

    this.#syncFormAndValidity();
  }

  #normalizedCount(): number {
    return Math.max(1, Math.min(10, Math.floor(this.count) || 5));
  }

  #normalizedFractions(): number {
    return Math.max(1, Math.min(10, Math.floor(this.fractions) || 1));
  }

  #step(): number {
    return 1 / this.#normalizedFractions();
  }

  #roundStep(v: number): number {
    const f = this.#normalizedFractions();
    return Math.round(v * f) / f;
  }

  #clampedValue(): number {
    const max = this.#normalizedCount();
    const num = Number.isFinite(this.value) ? this.value : 0;
    return Math.max(0, Math.min(max, this.#roundStep(num)));
  }

  #valueFromPointer(index: number, el: HTMLSpanElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    const frac = this.#normalizedFractions();
    if (rect.width <= 0 || frac <= 1) return index + 1;
    const rel = Math.max(0.01, Math.min(1, (clientX - rect.left) / rect.width));
    const sub = Math.ceil(rel * frac) / frac;
    return this.#roundStep(index + sub);
  }

  #rebuildStars(count: number): void {
    this.#track.innerHTML = '';
    this.#stars = [];
    for (let i = 0; i < count; i++) {
      const wrap = document.createElement('span');
      wrap.className = 'star';
      wrap.setAttribute('part', 'star');
      wrap.innerHTML = `${STAR_SVG}${STAR_SVG}`;
      const [empty, fill] = wrap.querySelectorAll('svg');
      empty!.classList.add('star-empty');
      fill!.classList.add('star-fill');

      wrap.addEventListener('pointermove', (e) => {
        if (this.isDisabled || this.readonly) return;
        this.#hoverValue = this.#valueFromPointer(i, wrap, e.clientX);
      });

      wrap.addEventListener('click', (e) => {
        if (this.isDisabled || this.readonly) return;
        const picked = this.#valueFromPointer(i, wrap, e.clientX);
        const next = this.clearable && picked === this.#clampedValue() ? 0 : picked;
        this.#hoverValue = null;
        this.#commit(next);
      });

      this.#stars.push({ el: wrap, fill: fill! });
      this.#track.append(wrap);
    }
  }

  #commit(next: number): void {
    const prev = this.#clampedValue();
    this.value = next;
    this.markInteracted();
    this.#syncFormAndValidity();
    if (next !== prev) {
      emit<RatingChangeDetail>(this, 'k-rating-change', { value: next });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #syncFormAndValidity(): void {
    const val = this.#clampedValue();
    this.setFormValue(this.isDisabled || val <= 0 ? null : String(val));
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && val <= 0) {
      this.setValidity({ valueMissing: true }, 'Please select a rating.', this.#track);
      return;
    }
    this.setValidity({});
  }
}
