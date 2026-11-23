import { FormAssociatedElement, emit, prop, type PropertyValues } from '@kerno/core';
import { rangeSliderStyles } from './range-slider.styles.js';

export interface RangeSliderMark {
  value: number;
  label?: string;
}

export interface RangeChangeDetail {
  values: [number, number];
  value: string;
}

/**
 * Form-associated dual-thumb range slider supporting `min`, `max`, `step`,
 * `min-range` anti-collision gap, labeled `marks`, hover/drag value tooltips,
 * and independent keyboard stepping per thumb.
 *
 * @tag k-range-slider
 *
 * @csspart rail - Background track rail.
 * @csspart fill - Active Accent range bar between thumbs.
 * @csspart thumb - Draggable range thumb (`role="slider"`).
 *
 * @fires k-range-change - Fired when range values change (`{ values: [start, end], value }`).
 * @fires input - Fired continuously while dragging or stepping.
 * @fires change - Fired when range commits.
 */
export class KRangeSlider extends FormAssociatedElement {
  static override styles = rangeSliderStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div class="header"><span class="label"></span><span class="value-readout"></span></div><div class="track-wrap"><div part="rail" class="rail"><div part="fill" class="fill"></div></div><div part="thumb" class="thumb thumb-start" role="slider" tabindex="0"><span class="thumb-tip"></span></div><div part="thumb" class="thumb thumb-end" role="slider" tabindex="0"><span class="thumb-tip"></span></div></div><div class="marks"></div>`;

  /** Comma-separated `"start,end"` value string. */
  @prop({ reflect: true }) accessor value = '20,80';
  @prop({ type: Number, reflect: true }) accessor min = 0;
  @prop({ type: Number, reflect: true }) accessor max = 100;
  @prop({ type: Number, reflect: true }) accessor step = 1;
  @prop({ type: Number, attribute: 'min-range', reflect: true }) accessor minRange = 0;
  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor unit = '';
  @prop({ type: Boolean, attribute: 'show-value', reflect: true }) accessor showValue = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ attribute: false }) accessor marks: readonly RangeSliderMark[] = [];

  #header!: HTMLDivElement;
  #labelEl!: HTMLSpanElement;
  #readoutEl!: HTMLSpanElement;
  #trackWrap!: HTMLDivElement;
  #rail!: HTMLDivElement;
  #fill!: HTMLDivElement;
  #thumbStart!: HTMLDivElement;
  #thumbEnd!: HTMLDivElement;
  #tipStart!: HTMLSpanElement;
  #tipEnd!: HTMLSpanElement;
  #marksEl!: HTMLDivElement;

  #range: [number, number] = [20, 80];
  #draggingIndex: 0 | 1 | null = null;
  #defaultValue = '20,80';
  #defaultCaptured = false;

  get values(): [number, number] {
    return [this.#range[0], this.#range[1]];
  }

  set values(next: [number, number]) {
    this.#range = this.#clampPair(next[0], next[1]);
    this.value = `${this.#range[0]},${this.#range[1]}`;
    this.#syncVisuals();
    this.#syncForm();
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#parseValue();
    this.#syncVisuals();
    this.#syncForm();
  }

  protected override setup(): void {
    this.#header = this.renderRoot.querySelector('.header') as HTMLDivElement;
    this.#labelEl = this.renderRoot.querySelector('.label') as HTMLSpanElement;
    this.#readoutEl = this.renderRoot.querySelector('.value-readout') as HTMLSpanElement;
    this.#trackWrap = this.renderRoot.querySelector('.track-wrap') as HTMLDivElement;
    this.#rail = this.renderRoot.querySelector('.rail') as HTMLDivElement;
    this.#fill = this.renderRoot.querySelector('.fill') as HTMLDivElement;
    this.#thumbStart = this.renderRoot.querySelector('.thumb-start') as HTMLDivElement;
    this.#thumbEnd = this.renderRoot.querySelector('.thumb-end') as HTMLDivElement;
    this.#tipStart = this.#thumbStart.querySelector('.thumb-tip') as HTMLSpanElement;
    this.#tipEnd = this.#thumbEnd.querySelector('.thumb-tip') as HTMLSpanElement;
    this.#marksEl = this.renderRoot.querySelector('.marks') as HTMLDivElement;

    this.#trackWrap.addEventListener('pointerdown', (e) => {
      if (this.isDisabled || this.readonly || e.button !== 0) return;
      e.preventDefault();
      const target = e.target as HTMLElement;
      let idx: 0 | 1;
      if (target === this.#thumbStart) {
        idx = 0;
      } else if (target === this.#thumbEnd) {
        idx = 1;
      } else {
        const val = this.#valueFromClientX(e.clientX);
        const distStart = Math.abs(val - this.#range[0]);
        const distEnd = Math.abs(val - this.#range[1]);
        idx = distStart <= distEnd ? 0 : 1;
      }

      this.#draggingIndex = idx;
      const activeThumb = idx === 0 ? this.#thumbStart : this.#thumbEnd;
      activeThumb.classList.add('dragging');
      activeThumb.focus();
      this.#trackWrap.setPointerCapture(e.pointerId);
      this.#updateFromPointer(e.clientX, false);
    });

    this.#trackWrap.addEventListener('pointermove', (e) => {
      if (this.#draggingIndex === null) return;
      this.#updateFromPointer(e.clientX, false);
    });

    const endDrag = (): void => {
      if (this.#draggingIndex === null) return;
      this.#thumbStart.classList.remove('dragging');
      this.#thumbEnd.classList.remove('dragging');
      this.#draggingIndex = null;
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };

    this.#trackWrap.addEventListener('pointerup', endDrag);
    this.#trackWrap.addEventListener('pointercancel', endDrag);

    this.#bindThumbKeys(this.#thumbStart, 0);
    this.#bindThumbKeys(this.#thumbEnd, 1);
  }

  protected override update(changed: PropertyValues): void {
    if (
      changed.has('value') ||
      changed.has('min') ||
      changed.has('max') ||
      changed.has('step') ||
      changed.has('minRange')
    ) {
      this.#parseValue();
    }
    this.#syncVisuals();
    if (changed.has('marks') || changed.has('min') || changed.has('max')) {
      this.#renderMarks();
    }
    this.#syncForm();
  }

  #bindThumbKeys(thumb: HTMLDivElement, idx: 0 | 1): void {
    thumb.addEventListener('keydown', (e) => {
      if (this.isDisabled || this.readonly) return;
      const step = this.#safeStep();
      const big = step * 10;
      let next: number | null = null;
      const cur = this.#range[idx];

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = cur + step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = cur - step;
      else if (e.key === 'PageUp') next = cur + big;
      else if (e.key === 'PageDown') next = cur - big;
      else if (e.key === 'Home') next = this.min;
      else if (e.key === 'End') next = this.max;

      if (next !== null) {
        e.preventDefault();
        this.#setThumb(idx, next, true);
      }
    });
  }

  #safeStep(): number {
    return Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
  }

  #safeGap(): number {
    return Number.isFinite(this.minRange) && this.minRange >= 0 ? this.minRange : 0;
  }

  #quantize(raw: number): number {
    const step = this.#safeStep();
    const clamped = Math.max(this.min, Math.min(this.max, raw));
    const snapped = Math.round((clamped - this.min) / step) * step + this.min;
    const decimals = String(step).includes('.') ? String(step).split('.')[1]!.length : 0;
    return Number(Math.max(this.min, Math.min(this.max, snapped)).toFixed(decimals));
  }

  #clampPair(rawStart: number, rawEnd: number): [number, number] {
    const gap = Math.min(this.#safeGap(), Math.max(0, this.max - this.min));
    let s = this.#quantize(rawStart);
    let e = this.#quantize(rawEnd);
    if (s > e) [s, e] = [e, s];
    if (e - s < gap) {
      e = this.#quantize(Math.min(this.max, s + gap));
      s = this.#quantize(Math.max(this.min, e - gap));
    }
    return [s, e];
  }

  #parseValue(): void {
    const parts = this.value.split(',').map((s) => Number(s.trim()));
    const s = Number.isFinite(parts[0]) ? parts[0]! : this.min;
    const e = Number.isFinite(parts[1]) ? parts[1]! : this.max;
    this.#range = this.#clampPair(s, e);
  }

  #valueFromClientX(clientX: number): number {
    const rect = this.#rail.getBoundingClientRect();
    if (rect.width <= 0) return this.min;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return this.#quantize(this.min + ratio * (this.max - this.min));
  }

  #updateFromPointer(clientX: number, commitChange: boolean): void {
    if (this.#draggingIndex === null) return;
    const val = this.#valueFromClientX(clientX);
    this.#setThumb(this.#draggingIndex, val, commitChange);
  }

  #setThumb(idx: 0 | 1, rawVal: number, emitChange: boolean): void {
    const gap = Math.min(this.#safeGap(), Math.max(0, this.max - this.min));
    const [prevS, prevE] = this.#range;
    let nextS = prevS;
    let nextE = prevE;

    if (idx === 0) {
      nextS = this.#quantize(Math.min(rawVal, prevE - gap));
    } else {
      nextE = this.#quantize(Math.max(rawVal, prevS + gap));
    }

    if (nextS === prevS && nextE === prevE) return;
    this.#range = [nextS, nextE];
    this.value = `${nextS},${nextE}`;
    this.#syncVisuals();
    this.markInteracted();
    this.#syncForm();

    emit<RangeChangeDetail>(this, 'k-range-change', {
      values: [nextS, nextE],
      value: this.value,
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    if (emitChange) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #percentOf(v: number): number {
    const span = this.max - this.min;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(100, ((v - this.min) / span) * 100));
  }

  #formatVal(v: number): string {
    return this.unit ? `${v}${this.unit}` : String(v);
  }

  #syncVisuals(): void {
    const [s, e] = this.#range;
    const pStart = this.#percentOf(s);
    const pEnd = this.#percentOf(e);
    const disabled = this.isDisabled;

    this.#labelEl.textContent = this.label;
    this.#readoutEl.textContent = this.showValue
      ? `${this.#formatVal(s)} – ${this.#formatVal(e)}`
      : '';
    this.#header.hidden = !this.label && !this.showValue;

    this.#fill.style.left = `${pStart}%`;
    this.#fill.style.width = `${Math.max(0, pEnd - pStart)}%`;

    this.#thumbStart.style.left = `${pStart}%`;
    this.#thumbEnd.style.left = `${pEnd}%`;
    this.#tipStart.textContent = this.#formatVal(s);
    this.#tipEnd.textContent = this.#formatVal(e);

    const baseLabel =
      this.getAttribute('aria-label')?.trim() || this.label || this.localize.term('range');
    this.#thumbStart.tabIndex = disabled ? -1 : 0;
    this.#thumbStart.setAttribute('aria-label', this.localize.term('rangeMinimum', baseLabel));
    this.#thumbStart.setAttribute('aria-valuemin', String(this.min));
    this.#thumbStart.setAttribute('aria-valuemax', String(e - this.#safeGap()));
    this.#thumbStart.setAttribute('aria-valuenow', String(s));
    this.#thumbStart.setAttribute('aria-disabled', disabled ? 'true' : 'false');

    this.#thumbEnd.tabIndex = disabled ? -1 : 0;
    this.#thumbEnd.setAttribute('aria-label', this.localize.term('rangeMaximum', baseLabel));
    this.#thumbEnd.setAttribute('aria-valuemin', String(s + this.#safeGap()));
    this.#thumbEnd.setAttribute('aria-valuemax', String(this.max));
    this.#thumbEnd.setAttribute('aria-valuenow', String(e));
    this.#thumbEnd.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  #renderMarks(): void {
    this.#marksEl.innerHTML = '';
    for (const mark of this.marks) {
      const span = document.createElement('span');
      span.className = 'mark';
      span.style.left = `${this.#percentOf(mark.value)}%`;
      span.textContent = mark.label ?? String(mark.value);
      this.#marksEl.append(span);
    }
  }

  #syncForm(): void {
    if (this.isDisabled) {
      this.setFormValue(null);
      return;
    }
    this.setFormValue(this.value);
  }
}
