import {
  AriaForwardingController,
  FormAssociatedElement,
  emit,
  isServer,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { segmentedControlStyles } from './segmented-control.styles.js';

export type SegmentedControlSize = 'sm' | 'md' | 'lg';
export type SegmentedControlOrientation = 'horizontal' | 'vertical';
export type SegmentedControlVariant = 'accent' | 'surface';

export interface SegmentedControlItem {
  value: string;
  label?: string;
  disabled?: boolean;
}

export type SegmentedControlDataItem = string | SegmentedControlItem;

export interface SegmentedChangeDetail {
  value: string;
  option: SegmentedControlItem | null;
}

/**
 * Form-associated segmented control with a dynamically measured sliding
 * Fluent indicator, horizontal/vertical orientation, full keyboard roving
 * focus, and declarative `<k-option>` or JS `data` input.
 *
 * @tag k-segmented-control
 *
 * @slot - Optional `<k-option>` or `<option>` items when `data` is not set.
 *
 * @csspart track - Outer radiogroup track.
 * @csspart indicator - Sliding highlight bar behind the active segment.
 * @csspart segment - Individual selectable segment button.
 *
 * @fires k-change - Fired when the active segment changes (`{ value, option }`).
 * @fires input - Fired on segment selection.
 * @fires change - Fired when segment selection commits.
 */
export class KSegmentedControl extends FormAssociatedElement {
  static override styles = segmentedControlStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="track" class="track" role="radiogroup"><div part="indicator" class="indicator" aria-hidden="true"></div></div><slot class="source-slot"></slot>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ attribute: false }) accessor data: readonly SegmentedControlDataItem[] = [];
  @prop({ reflect: true }) accessor orientation: SegmentedControlOrientation = 'horizontal';
  @prop({ reflect: true }) accessor size: SegmentedControlSize = 'md';
  @prop({ reflect: true }) accessor variant: SegmentedControlVariant = 'accent';
  @prop({ type: Boolean, attribute: 'full-width', reflect: true }) accessor fullWidth = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ reflect: true }) accessor label = '';

  #track!: HTMLDivElement;
  #indicator!: HTMLDivElement;
  #sourceSlot!: HTMLSlotElement;
  #buttons: HTMLButtonElement[] = [];
  #items: SegmentedControlItem[] = [];
  #defaultValue = '';
  #defaultCaptured = false;
  #hasPositioned = false;
  #ro: ResizeObserver | null = null;

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the inner radiogroup.
    new AriaForwardingController(this, {
      getTarget: () => this.#track,
      getFallbackLabel: () => this.label || this.localize.term('segmentedControl'),
    });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
    if (!isServer && typeof ResizeObserver === 'function' && this.#track && !this.#ro) {
      this.#ro = new ResizeObserver(() => this.#positionIndicator(false));
      this.#ro.observe(this.#track);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#ro?.disconnect();
    this.#ro = null;
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#track = this.renderRoot.querySelector('.track') as HTMLDivElement;
    this.#indicator = this.renderRoot.querySelector('.indicator') as HTMLDivElement;
    this.#sourceSlot = this.renderRoot.querySelector('.source-slot') as HTMLSlotElement;

    this.#sourceSlot.addEventListener('slotchange', () => {
      this.#rebuild();
    });

    if (!isServer && typeof ResizeObserver === 'function') {
      this.#ro = new ResizeObserver(() => this.#positionIndicator(false));
      this.#ro.observe(this.#track);
    }
  }

  protected override update(changed: PropertyValues): void {
    this.#track.setAttribute('aria-orientation', this.orientation);

    if (changed.has('data') || this.#buttons.length === 0) {
      this.#rebuild();
    } else {
      this.#syncSelectionState();
    }

    this.#syncFormAndValidity();
    queueMicrotask(() => this.#positionIndicator(this.#hasPositioned));
  }

  #resolveItems(): SegmentedControlItem[] {
    if (this.data.length > 0) {
      return this.data.map((entry) =>
        typeof entry === 'string'
          ? { value: entry, label: entry }
          : { value: entry.value, label: entry.label ?? entry.value, disabled: entry.disabled },
      );
    }
    const slotted = this.#sourceSlot.assignedElements({ flatten: true }).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag === 'k-option' || tag === 'option';
    });
    return slotted.map((el) => {
      const value = el.getAttribute('value') ?? el.textContent?.trim() ?? '';
      return {
        value,
        label: el.textContent?.trim() || value,
        disabled: el.hasAttribute('disabled'),
      };
    });
  }

  #rebuild(): void {
    this.#items = this.#resolveItems();
    for (const btn of this.#buttons) btn.remove();
    this.#buttons = [];

    // Default to first enabled option if no value is specified yet
    if (!this.value && this.#items.length > 0) {
      const firstEnabled = this.#items.find((i) => !i.disabled);
      if (firstEnabled) this.value = firstEnabled.value;
    }

    this.#items.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'segment';
      btn.setAttribute('part', 'segment');
      btn.setAttribute('role', 'radio');
      btn.dataset.value = item.value;
      btn.textContent = item.label ?? item.value;

      btn.addEventListener('click', () => {
        if (this.isDisabled || this.readonly || item.disabled) return;
        this.#select(item);
      });

      btn.addEventListener('keydown', (e) => {
        if (this.isDisabled || this.readonly) return;
        const isVert = this.orientation === 'vertical';
        const nextKey = isVert ? 'ArrowDown' : 'ArrowRight';
        const prevKey = isVert ? 'ArrowUp' : 'ArrowLeft';

        if (e.key === nextKey || e.key === prevKey || e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          const enabledIndices = this.#items
            .map((it, i) => (it.disabled ? -1 : i))
            .filter((i) => i !== -1);
          if (enabledIndices.length === 0) return;

          let targetIndex: number;
          if (e.key === 'Home') {
            targetIndex = enabledIndices[0]!;
          } else if (e.key === 'End') {
            targetIndex = enabledIndices[enabledIndices.length - 1]!;
          } else {
            const pos = enabledIndices.indexOf(index);
            const delta = e.key === nextKey ? 1 : -1;
            targetIndex =
              enabledIndices[(pos + delta + enabledIndices.length) % enabledIndices.length]!;
          }
          const targetItem = this.#items[targetIndex];
          if (targetItem) {
            this.#buttons[targetIndex]?.focus();
            this.#select(targetItem);
          }
        }
      });

      this.#buttons.push(btn);
      this.#track.append(btn);
    });

    this.#syncSelectionState();
    queueMicrotask(() => this.#positionIndicator(false));
  }

  #syncSelectionState(): void {
    const activeIndex = this.#items.findIndex((i) => i.value === this.value);
    const fallbackFocusIndex = this.#items.findIndex((i) => !i.disabled);
    const focusIndex = activeIndex !== -1 ? activeIndex : fallbackFocusIndex;

    this.#buttons.forEach((btn, i) => {
      const item = this.#items[i]!;
      const selected = item.value === this.value;
      const disabled = this.isDisabled || Boolean(item.disabled);
      btn.disabled = disabled;
      btn.setAttribute('aria-checked', selected ? 'true' : 'false');
      btn.tabIndex = disabled ? -1 : i === focusIndex ? 0 : -1;
    });
  }

  #positionIndicator(animate: boolean): void {
    const idx = this.#items.findIndex((i) => i.value === this.value);
    const activeBtn = idx !== -1 ? this.#buttons[idx] : undefined;
    if (!activeBtn || activeBtn.offsetWidth === 0) {
      this.#indicator.classList.remove('visible');
      return;
    }

    this.#indicator.classList.toggle('animated', animate);
    this.#indicator.style.width = `${activeBtn.offsetWidth}px`;
    this.#indicator.style.height = `${activeBtn.offsetHeight}px`;
    this.#indicator.style.transform = `translate3d(${activeBtn.offsetLeft}px, ${activeBtn.offsetTop}px, 0)`;
    this.#indicator.classList.add('visible');
    this.#hasPositioned = true;
  }

  #select(item: SegmentedControlItem): void {
    const prev = this.value;
    this.value = item.value;
    this.#syncSelectionState();
    this.#positionIndicator(true);
    this.markInteracted();
    this.#syncFormAndValidity();
    if (item.value !== prev) {
      emit<SegmentedChangeDetail>(this, 'k-change', { value: item.value, option: item });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity(
        { valueMissing: true },
        this.localize.term('optionRequired'),
        this.#buttons[0],
      );
      return;
    }
    this.setValidity({});
  }
}
