import {
  AriaForwardingController,
  FormAssociatedElement,
  KernoElement,
  enterTopLayer,
  exitTopLayer,
  getActiveElement,
  isServer,
  overlayManager,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { scaleIn, scaleOut, type MotionHandle } from '@kerno/effects/motion';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { getIcon } from '../icon/registry.js';
import { optionStyles, selectStyles } from './select.styles.js';

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectShape = CornerKind;

/**
 * Option inside `<k-select>`.
 *
 * @tag k-option
 *
 * @slot - Option label text.
 *
 * @csspart base - Inner button (`role="option"`).
 */
export class KOption extends KernoElement {
  static override styles = optionStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button" role="option" aria-selected="false"><span part="label" class="label"><slot></slot></span></button>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ type: Boolean, reflect: true }) accessor selected = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #base!: HTMLButtonElement;

  override connectedCallback(): void {
    super.connectedCallback();
    const select = this.closest('k-select');
    if (select instanceof KSelect) select.notifyOptionsChanged();
  }

  override click(): void {
    if (this.#base) this.#base.click();
    else super.click();
  }

  get labelText(): string {
    return (this.textContent ?? '').trim() || this.value;
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLButtonElement;
  }

  protected override update(_changed: PropertyValues): void {
    this.#base.disabled = this.disabled;
    this.#base.setAttribute('aria-selected', this.selected ? 'true' : 'false');
  }
}

/**
 * Form-associated select control with Windows 10 ComboBox overlay popup,
 * keyboard navigation and constraint validation.
 *
 * @tag k-select
 *
 * @slot - `<k-option>` elements.
 *
 * @csspart combobox - Trigger button (`role="combobox"`).
 * @csspart display - Selected label or placeholder text.
 * @csspart listbox - Floating options popup (`role="listbox"`).
 *
 * @fires input - Fired when the user selects an option.
 * @fires change - Fired when the user selects an option.
 */
export class KSelect extends FormAssociatedElement {
  static override styles = selectStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="combobox" class="combobox" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false"><span part="display" class="display"></span><span class="arrow" aria-hidden="true"></span></button><div part="listbox" class="listbox" role="listbox"><slot></slot></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ reflect: true }) accessor size: SelectSize = 'md';
  @prop({ reflect: true }) accessor shape: SelectShape = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor open = false;

  readonly #overlayId = uniqueId('k-select');

  #combobox!: HTMLButtonElement;
  #display!: HTMLSpanElement;
  #listbox!: HTMLDivElement;
  #defaultValue = '';
  #defaultCaptured = false;
  #initialOptionAdopted = false;
  #stopPositioning: (() => void) | null = null;
  #wasOpen = false;
  #exitAnim: MotionHandle | null = null;
  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#combobox ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    this.addEventListener('click', this.#onOptionClick);
    this.addEventListener('keydown', this.#onKeyDown);
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#combobox });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cancelExit();
    this.#cleanup(false);
    this.#wasOpen = false;
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.open = false;
    this.value = this.#defaultValue;
    this.#syncOptions();
  }

  getOptions(): KOption[] {
    return [...this.querySelectorAll('k-option')].filter(
      (el): el is KOption => el instanceof KOption,
    );
  }

  notifyOptionsChanged(): void {
    if (!this.hasUpdated) return;
    this.#syncOptions();
  }

  protected override setup(): void {
    this.#combobox = this.renderRoot.querySelector('.combobox') as HTMLButtonElement;
    this.#display = this.renderRoot.querySelector('.display') as HTMLSpanElement;
    this.#listbox = this.renderRoot.querySelector('.listbox') as HTMLDivElement;

    const arrow = this.renderRoot.querySelector('.arrow') as HTMLSpanElement;
    arrow.innerHTML = `<svg viewBox="0 0 16 16">${getIcon('chevron-down') ?? ''}</svg>`;

    this.#combobox.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.isDisabled) {
        this.open = !this.open;
      }
    });

    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    slot.addEventListener('slotchange', () => this.#syncOptions());
  }

  protected override update(changed: PropertyValues): void {
    this.#combobox.disabled = this.isDisabled;
    this.#combobox.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    this.#syncOptions();

    if (
      changed.has('shape') ||
      changed.has('size') ||
      changed.has('disabled') ||
      changed.has('formDisabled')
    ) {
      this.#shapeOutline.sync();
    }

    if (this.open && !this.#wasOpen && !this.isDisabled) {
      this.#wasOpen = true;
      this.#cancelExit();
      enterTopLayer(this.#listbox);
      this.#stopPositioning = this.#startOverlayPositioning();
      overlayManager.add({
        id: this.#overlayId,
        content: this.#listbox,
        trigger: this.#combobox,
        restoreFocus: true,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        onRequestClose: () => {
          this.open = false;
        },
      });
      scaleIn(this.#listbox, { duration: 'fast' });
      queueMicrotask(() => {
        if (!this.open) return;
        const enabled = this.getOptions().filter((o) => !o.disabled);
        const active = enabled.find((o) => o.selected) ?? enabled[0];
        active?.focus();
      });
    } else if ((!this.open || this.isDisabled) && this.#wasOpen) {
      this.#wasOpen = false;
      overlayManager.remove(this.#overlayId);
      this.#playExit();
    }
  }

  /**
   * Positions the Windows 10 ComboBox popup directly over the combobox trigger
   * so the selected option overlays the trigger row in-place.
   */
  #startOverlayPositioning(): () => void {
    if (isServer) return () => {};
    const update = (): void => {
      const triggerRect = this.#combobox.getBoundingClientRect();
      const width = Math.max(triggerRect.width, 120);
      this.#listbox.style.width = `${width}px`;
      this.#listbox.style.minWidth = `${width}px`;

      const options = this.getOptions().filter((o) => !o.hidden);
      const selectedIdx = options.findIndex((o) => o.selected);
      let offsetY = 5; // 1px border + 4px top padding
      if (selectedIdx > 0) {
        for (let i = 0; i < selectedIdx; i++) {
          offsetY += options[i]!.offsetHeight || 32;
        }
      }
      offsetY -= this.#listbox.scrollTop;

      const listHeight = this.#listbox.offsetHeight || options.length * 32 + 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;

      let left = triggerRect.left;
      let top = triggerRect.top - offsetY;

      if (left + width > vw - pad) left = Math.max(pad, vw - pad - width);
      if (left < pad) left = pad;
      if (top + listHeight > vh - pad) top = Math.max(pad, vh - pad - listHeight);
      if (top < pad) top = pad;

      this.#listbox.style.transformOrigin = `50% ${Math.round(triggerRect.top - top + triggerRect.height / 2)}px`;
      this.#listbox.style.left = `${Math.round(left)}px`;
      this.#listbox.style.top = `${Math.round(top)}px`;
    };

    // Coalesce scroll/resize bursts into one layout read per frame.
    let frame: number | null = null;
    const schedule = (): void => {
      frame ??= requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };

    update();
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, { capture: true });
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }

  #syncOptions(): void {
    const options = this.getOptions();
    if (!this.#initialOptionAdopted && options.length > 0) {
      this.#initialOptionAdopted = true;
      if (!this.value) {
        const preSelected = options.find((o) => o.selected && !o.disabled);
        if (preSelected) {
          this.value = preSelected.value;
          if (!this.#defaultValue) this.#defaultValue = preSelected.value;
        }
      }
    }

    let selectedOption: KOption | undefined;
    for (const opt of options) {
      const isSelected = this.value !== '' && opt.value === this.value;
      opt.selected = isSelected;
      if (isSelected) selectedOption = opt;
    }

    if (selectedOption) {
      this.#display.textContent = selectedOption.labelText;
      this.#display.classList.remove('placeholder');
    } else {
      this.#display.textContent = this.placeholder || this.localize.term('selectPlaceholder');
      this.#display.classList.add('placeholder');
    }

    this.setFormValue(selectedOption ? this.value : null);
    this.setValidity(
      { valueMissing: this.required && !selectedOption },
      this.localize.term('selectRequired'),
      this.#combobox,
    );
  }

  #selectOption(opt: KOption): void {
    if (opt.disabled || this.isDisabled) return;
    const changed = this.value !== opt.value;
    this.value = opt.value;
    this.open = false;
    this.markInteracted();
    this.#syncOptions();
    if (changed) {
      this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #onOptionClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    const opt = path.find(
      (n): n is KOption => n instanceof KOption && n.closest('k-select') === this,
    );
    if (opt) {
      this.#selectOption(opt);
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (this.isDisabled) return;
    if (!this.open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.open = true;
      }
      return;
    }

    const enabled = this.getOptions().filter((o) => !o.disabled);
    if (enabled.length === 0) return;
    const active = getActiveElement();
    const idx = enabled.findIndex((o) => o === active || o.shadowRoot?.contains(active));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      enabled[(idx + 1) % enabled.length]!.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      enabled[idx <= 0 ? enabled.length - 1 : idx - 1]!.focus();
    }
  };

  #playExit(): void {
    this.#listbox.classList.add('closing');
    const anim = scaleOut(this.#listbox, { duration: 'fast' });
    this.#exitAnim = anim;
    void anim.finished.then(() => {
      if (this.open) return;
      this.#listbox.classList.remove('closing');
      this.#stopPositioning?.();
      this.#stopPositioning = null;
      exitTopLayer(this.#listbox);
      this.#exitAnim = null;
    });
  }

  #cancelExit(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#listbox?.classList.remove('closing');
  }

  #cleanup(restoreFocus = true): void {
    this.#stopPositioning?.();
    this.#stopPositioning = null;
    exitTopLayer(this.#listbox);
    overlayManager.remove(this.#overlayId, restoreFocus);
  }
}
