import {
  AriaForwardingController,
  FormAssociatedElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  isComposing,
  overlayManager,
  prop,
  setLabels,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeOut, slideIn, type MotionHandle } from '@kerno/effects/motion';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { getIcon } from '@kerno/primitives/icon';
import { autocompleteStyles } from './autocomplete.styles.js';

export type AutocompleteSize = 'sm' | 'md' | 'lg';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface AutocompleteSelectDetail {
  value: string;
  label: string;
  option?: AutocompleteOption;
}

export type AutocompleteFilter = (option: AutocompleteOption, query: string) => boolean;

export function defaultAutocompleteFilter(option: AutocompleteOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    Boolean(option.description?.toLowerCase().includes(q))
  );
}

/**
 * Form-associated searchable combobox / autocomplete supporting both
 * programmatic `options` arrays and declarative `<k-option>` children,
 * Top-Layer floating listbox with optional Acrylic glass, and full ARIA
 * combobox keyboard navigation.
 *
 * @tag k-autocomplete
 *
 * @slot - Optional declarative `<k-option value="...">Label</k-option>` items.
 *
 * @csspart base - Input trigger frame.
 * @csspart input - Native `<input role="combobox">`.
 * @csspart clear-button - Clear action button.
 * @csspart listbox - Top-Layer suggestion panel (`role="listbox"`).
 *
 * @fires k-search - Fired when the user types a search query (`{ query }`).
 * @fires k-select - Fired when an option is selected (`{ value, label, option }`).
 * @fires input - Fired when the committed value changes.
 * @fires change - Fired when selection is committed.
 */
export class KAutocomplete extends FormAssociatedElement {
  static override styles = autocompleteStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><span class="lead-icon" aria-hidden="true"></span><input part="input" class="input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" /><span class="spinner" aria-hidden="true" hidden></span><button part="clear-button" class="action-btn clear-btn" type="button" tabindex="-1" aria-label="Clear" hidden></button></div><div part="listbox" class="listbox" role="listbox"></div><div class="hidden-slot"><slot></slot></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ reflect: true }) accessor size: AutocompleteSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  /** Allows committing arbitrary typed text not present in `options`. */
  @prop({ type: Boolean, attribute: 'allow-custom', reflect: true }) accessor allowCustom = false;
  @prop({ type: Boolean, reflect: true }) accessor loading = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ attribute: 'empty-text', reflect: true }) accessor emptyText = '';
  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ attribute: false }) accessor options: readonly AutocompleteOption[] = [];

  /** Custom option filter predicate (override with `() => true` for async server search). */
  filter: AutocompleteFilter = defaultAutocompleteFilter;

  readonly #overlayId = uniqueId('k-autocomplete');
  readonly #listId = uniqueId('k-ac-list');

  #base!: HTMLDivElement;
  #input!: HTMLInputElement;
  #leadIcon!: HTMLSpanElement;
  #spinner!: HTMLSpanElement;
  #clearBtn!: HTMLButtonElement;
  #listbox!: HTMLDivElement;
  #slot!: HTMLSlotElement;

  #slottedOptions: AutocompleteOption[] = [];
  #filtered: AutocompleteOption[] = [];
  #activeIndex = -1;
  #query = '';
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#base ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#input });
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
    this.#cleanupOverlay(false);
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncInputFromValue();
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#input = this.renderRoot.querySelector('.input') as HTMLInputElement;
    this.#leadIcon = this.renderRoot.querySelector('.lead-icon') as HTMLSpanElement;
    this.#spinner = this.renderRoot.querySelector('.spinner') as HTMLSpanElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLButtonElement;
    this.#listbox = this.renderRoot.querySelector('.listbox') as HTMLDivElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#listbox.id = this.#listId;
    this.#input.setAttribute('aria-controls', this.#listId);
    this.#leadIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('search') ?? ''}</svg>`;
    this.#spinner.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('loader') ?? ''}</svg>`;
    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;

    this.#slot.addEventListener('slotchange', () => {
      this.#readSlottedOptions();
      this.#syncInputFromValue();
      if (this.open) this.#renderOptions();
    });

    this.#base.addEventListener('mousedown', (e) => {
      if (this.isDisabled) return;
      if (e.target !== this.#input && e.target !== this.#clearBtn) {
        e.preventDefault();
        this.#input.focus();
        if (!this.open) this.open = true;
      }
    });

    this.#input.addEventListener('focus', () => {
      if (!this.isDisabled && !this.open) {
        this.open = true;
      }
    });

    this.#input.addEventListener('input', () => {
      this.#query = this.#input.value;
      this.markInteracted();
      if (this.allowCustom) {
        this.value = this.#query;
        this.#syncFormAndValidity();
      } else if (this.#query === '') {
        this.value = '';
        this.#syncFormAndValidity();
      }
      if (!this.open) this.open = true;
      this.#renderOptions();
      this.#syncClearBtn();
      emit(this, 'k-search', { query: this.#query });
    });

    this.#input.addEventListener('keydown', (e) => this.#onKeyDown(e));

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled) return;
      this.value = '';
      this.#query = '';
      this.#input.value = '';
      this.markInteracted();
      this.#syncFormAndValidity();
      this.#syncClearBtn();
      this.#renderOptions();
      this.#input.focus();
      emit(this, 'k-search', { query: '' });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });

    this.#listbox.addEventListener('mousedown', (e) => {
      // Keep focus on the search input when clicking an option.
      e.preventDefault();
    });

    this.#listbox.addEventListener('click', (e) => {
      const optEl = (e.target as Element | null)?.closest<HTMLElement>('.option[data-index]');
      if (!optEl) return;
      const idx = Number(optEl.dataset.index);
      const opt = this.#filtered[idx];
      if (opt && !opt.disabled) {
        this.#commitOption(opt);
      }
    });

    this.#listbox.addEventListener('pointermove', (e) => {
      const optEl = (e.target as Element | null)?.closest<HTMLElement>('.option[data-index]');
      if (!optEl) return;
      const idx = Number(optEl.dataset.index);
      if (Number.isFinite(idx) && idx !== this.#activeIndex && !this.#filtered[idx]?.disabled) {
        this.#setActiveIndex(idx, false);
      }
    });

    this.#readSlottedOptions();
  }

  protected override update(changed: PropertyValues): void {
    // Localized labels; re-applied whenever the language changes.
    setLabels(this.renderRoot, [['.clear-btn', this.localize.term('clear')]]);
    const disabled = this.isDisabled;
    this.#base.classList.toggle('disabled', disabled);
    this.#input.disabled = disabled;
    this.#input.placeholder = this.placeholder || this.localize.term('searchPlaceholder');
    this.#input.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    this.#spinner.hidden = !this.loading;

    if (changed.has('value') || changed.has('options')) {
      this.#syncInputFromValue();
    }

    if (disabled && this.open) {
      this.open = false;
    }

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#openOverlay();
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#closeOverlay();
    } else if (
      this.open &&
      (changed.size === 0 ||
        changed.has('options') ||
        changed.has('loading') ||
        changed.has('emptyText'))
    ) {
      this.#renderOptions();
    }

    this.#syncClearBtn();
    this.#syncFormAndValidity();

    if (
      changed.has('shape') ||
      changed.has('size') ||
      changed.has('disabled') ||
      changed.has('formDisabled')
    ) {
      this.#shapeOutline.sync();
    }
  }

  #allOptions(): readonly AutocompleteOption[] {
    return this.options.length > 0 ? this.options : this.#slottedOptions;
  }

  #readSlottedOptions(): void {
    this.#slottedOptions = this.#slot
      .assignedElements({ flatten: true })
      .filter(
        (el) => el.tagName.toLowerCase() === 'k-option' || el.tagName.toLowerCase() === 'option',
      )
      .map((el) => ({
        value: el.getAttribute('value') ?? (el.textContent?.trim() || ''),
        label: el.textContent?.trim() || (el.getAttribute('value') ?? ''),
        description: el.getAttribute('description') ?? undefined,
        disabled: el.hasAttribute('disabled'),
      }));
  }

  #syncInputFromValue(): void {
    const match = this.#allOptions().find((o) => o.value === this.value);
    const display = match ? match.label : this.value;
    if (!this.open || !this.#query) {
      this.#input.value = display;
    }
  }

  #syncClearBtn(): void {
    this.#clearBtn.hidden =
      !this.clearable ||
      this.isDisabled ||
      (this.#input.value.length === 0 && this.value.length === 0);
  }

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#listbox.classList.remove('closing');
    }
    this.#renderOptions();
    enterTopLayer(this.#listbox);
    this.#listbox.style.minWidth = `${Math.round(this.#base.getBoundingClientRect().width)}px`;
    this.#stopPosition = autoPosition(this.#base, this.#listbox, {
      placement: 'bottom-start',
      offset: 4,
    });
    overlayManager.add({
      id: this.#overlayId,
      content: this.#listbox,
      trigger: this.#base,
      trapFocus: false,
      restoreFocus: false,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      onRequestClose: () => {
        this.open = false;
      },
    });
    slideIn(this.#listbox, { y: -4 }, { duration: 'fast' });
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, false);
    this.#stopPosition?.();
    this.#stopPosition = null;

    if (!this.allowCustom) {
      this.#query = '';
      this.#syncInputFromValue();
    }

    this.#listbox.classList.add('closing');
    this.#exitAnim = fadeOut(this.#listbox, { duration: 'fast' });
    void this.#exitAnim.finished.then(() => {
      if (this.open) return;
      this.#listbox.classList.remove('closing');
      exitTopLayer(this.#listbox);
      this.#exitAnim = null;
    });
  }

  #cleanupOverlay(restoreFocus: boolean): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#stopPosition?.();
    this.#stopPosition = null;
    exitTopLayer(this.#listbox);
    overlayManager.remove(this.#overlayId, restoreFocus);
    this.#wasOpen = false;
  }

  #renderOptions(): void {
    const query = this.#query;
    const all = this.#allOptions();
    this.#filtered = all.filter((opt) => this.filter(opt, query));
    this.#listbox.innerHTML = '';

    if (this.#filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = this.loading
        ? this.localize.term('loading')
        : this.emptyText || this.localize.term('noMatches');
      this.#listbox.append(empty);
      this.#activeIndex = -1;
      this.#input.removeAttribute('aria-activedescendant');
      return;
    }

    let firstEnabled = -1;
    let selectedIndex = -1;
    this.#filtered.forEach((opt, index) => {
      const el = document.createElement('div');
      el.className = 'option';
      el.id = `${this.#listId}-opt-${index}`;
      el.setAttribute('role', 'option');
      el.dataset.index = String(index);
      const isSelected = opt.value === this.value && this.value !== '';
      el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (opt.disabled) el.setAttribute('aria-disabled', 'true');
      else if (firstEnabled === -1) firstEnabled = index;
      if (isSelected && !opt.disabled) selectedIndex = index;

      const labelEl = document.createElement('span');
      labelEl.textContent = opt.label;
      el.append(labelEl);

      if (opt.description) {
        const descEl = document.createElement('span');
        descEl.className = 'opt-desc';
        descEl.textContent = opt.description;
        el.append(descEl);
      }

      this.#listbox.append(el);
    });

    this.#setActiveIndex(selectedIndex !== -1 ? selectedIndex : firstEnabled, false);
  }

  #setActiveIndex(index: number, scroll: boolean): void {
    this.#activeIndex = index;
    const nodes = this.#listbox.querySelectorAll<HTMLElement>('.option');
    nodes.forEach((node, idx) => {
      const active = idx === index;
      node.dataset.active = active ? 'true' : 'false';
      if (active) {
        this.#input.setAttribute('aria-activedescendant', node.id);
        if (scroll) node.scrollIntoView({ block: 'nearest' });
      }
    });
    if (index === -1) {
      this.#input.removeAttribute('aria-activedescendant');
    }
  }

  #moveActive(delta: 1 | -1): void {
    const len = this.#filtered.length;
    if (len === 0) return;
    let next = this.#activeIndex;
    for (let step = 0; step < len; step++) {
      next = (next + delta + len) % len;
      if (!this.#filtered[next]?.disabled) {
        this.#setActiveIndex(next, true);
        return;
      }
    }
  }

  #commitOption(opt: AutocompleteOption): void {
    this.value = opt.value;
    this.#query = '';
    this.#input.value = opt.label;
    this.markInteracted();
    this.#syncFormAndValidity();
    this.#syncClearBtn();
    this.open = false;
    emit<AutocompleteSelectDetail>(this, 'k-select', {
      value: opt.value,
      label: opt.label,
      option: opt,
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled || isComposing(event)) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.open) {
        this.open = true;
      } else {
        this.#moveActive(1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open) {
        this.open = true;
      } else {
        this.#moveActive(-1);
      }
    } else if (event.key === 'Enter' && this.open) {
      const active = this.#filtered[this.#activeIndex];
      if (active && !active.disabled) {
        event.preventDefault();
        this.#commitOption(active);
      } else if (this.allowCustom) {
        this.open = false;
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
    } else if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.open = false;
    }
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity({ valueMissing: true }, this.localize.term('optionRequired'), this.#input);
    } else {
      this.setValidity({});
    }
  }
}
