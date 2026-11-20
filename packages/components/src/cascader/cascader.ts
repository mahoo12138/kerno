import {
  FormAssociatedElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  overlayManager,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeOut, slideIn, type MotionHandle } from '@kerno/effects/motion';
import { ShapeOutlineController, type CornerKind } from '@kerno/effects/shape';
import { getIcon } from '@kerno/primitives/icon';
import { cascaderStyles } from './cascader.styles.js';

export type CascaderSize = 'sm' | 'md' | 'lg';
export type CascaderExpandTrigger = 'click' | 'hover';

export interface CascaderOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: readonly CascaderOption[];
}

export interface CascaderChangeDetail {
  value: string;
  path: string[];
  options: CascaderOption[];
}

/** Resolves a value path (`['cn', 'zj', 'hz']`) into matching `CascaderOption` objects. */
export function resolveCascaderPath(
  options: readonly CascaderOption[],
  path: readonly string[],
): CascaderOption[] {
  const out: CascaderOption[] = [];
  let level = options;
  for (const val of path) {
    const hit = level.find((o) => o.value === val);
    if (!hit) break;
    out.push(hit);
    level = hit.children ?? [];
  }
  return out;
}

/**
 * Form-associated multi-column cascading selector with click or hover branch
 * expansion, optional `change-on-select` for non-leaf nodes, full keyboard
 * navigation, Top-Layer panel, and Acrylic glass.
 *
 * @tag k-cascader
 *
 * @csspart trigger - Focusable trigger button.
 * @csspart panel - Top-Layer multi-column menu panel.
 *
 * @fires k-cascader-change - Fired when a selection is committed (`{ value, path, options }`).
 * @fires input - Fired on selection change.
 * @fires change - Fired when selection commits.
 */
export class KCascader extends FormAssociatedElement {
  static override styles = cascaderStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="trigger" class="trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span class="display"></span><span class="trailing"><span class="clear-btn" role="button" tabindex="-1" aria-label="Clear selection" hidden></span><span class="arrow" aria-hidden="true"></span></span></button><div part="panel" class="panel" role="dialog" aria-label="Cascading options"><div class="menus"></div></div>`;

  @prop({ attribute: false }) accessor options: readonly CascaderOption[] = [];
  /** Serialized selected path joined by `'/'` (e.g. `"asia/china/hangzhou"`). */
  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor placeholder = 'Select option';
  @prop({ reflect: true }) accessor separator = ' / ';
  @prop({ reflect: true }) accessor size: CascaderSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ attribute: 'expand-trigger', reflect: true })
  accessor expandTrigger: CascaderExpandTrigger = 'click';
  /** Allows committing intermediate parent nodes without descending to a leaf. */
  @prop({ type: Boolean, attribute: 'change-on-select', reflect: true })
  accessor changeOnSelect = false;
  @prop({ type: Boolean, attribute: 'show-full-path', reflect: true })
  accessor showFullPath = true;
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor open = false;

  readonly #overlayId = uniqueId('k-cascader');

  #trigger!: HTMLButtonElement;
  #display!: HTMLSpanElement;
  #clearBtn!: HTMLSpanElement;
  #arrow!: HTMLSpanElement;
  #panel!: HTMLDivElement;
  #menusEl!: HTMLDivElement;

  #activePath: string[] = [];
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#trigger ?? null,
    getKind: () => this.shape,
  });

  /** Selected value segments as an array. */
  get valuePath(): string[] {
    return this.value ? this.value.split('/').filter(Boolean) : [];
  }

  set valuePath(path: string[]) {
    this.value = path.filter(Boolean).join('/');
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
    this.#cleanupOverlay();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#trigger = this.renderRoot.querySelector('.trigger') as HTMLButtonElement;
    this.#display = this.renderRoot.querySelector('.display') as HTMLSpanElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLSpanElement;
    this.#arrow = this.renderRoot.querySelector('.arrow') as HTMLSpanElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#menusEl = this.renderRoot.querySelector('.menus') as HTMLDivElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#arrow.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-down') ?? ''}</svg>`;

    this.#trigger.addEventListener('click', () => {
      if (this.isDisabled) return;
      this.open = !this.open;
    });

    this.#trigger.addEventListener('keydown', (e) => {
      if (this.isDisabled) return;
      if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !this.open) {
        e.preventDefault();
        this.open = true;
      }
    });

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled) return;
      this.value = '';
      this.#activePath = [];
      this.markInteracted();
      this.#syncFormAndValidity();
      this.#emitChange([], []);
    });

    this.#menusEl.addEventListener('keydown', (e) => this.#onMenuKeyDown(e));
  }

  protected override update(changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#trigger.disabled = disabled;
    this.#trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');

    const resolved = resolveCascaderPath(this.options, this.valuePath);
    const label =
      resolved.length === 0
        ? ''
        : this.showFullPath
          ? resolved.map((o) => o.label).join(this.separator)
          : resolved[resolved.length - 1]!.label;

    this.#display.textContent = label || this.placeholder;
    this.#display.classList.toggle('placeholder', !label);
    this.#clearBtn.hidden = !this.clearable || disabled || !label;

    if (disabled && this.open) this.open = false;

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#openOverlay();
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#closeOverlay();
    } else if (this.open) {
      this.#renderMenus();
    }

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

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#panel.classList.remove('closing');
    }
    this.#activePath = [...this.valuePath];
    this.#renderMenus();
    enterTopLayer(this.#panel);
    this.#stopPosition = autoPosition(this.#trigger, this.#panel, {
      placement: 'bottom-start',
      offset: 4,
    });
    overlayManager.add({
      id: this.#overlayId,
      content: this.#panel,
      trigger: this.#trigger,
      trapFocus: false,
      restoreFocus: true,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      onRequestClose: () => {
        this.open = false;
      },
    });
    slideIn(this.#panel, { y: -4 }, { duration: 'fast' });

    queueMicrotask(() => {
      if (!this.open) return;
      const focusTarget =
        this.#menusEl.querySelector<HTMLButtonElement>('.item[aria-selected="true"]') ??
        this.#menusEl.querySelector<HTMLButtonElement>('.item:not(:disabled)');
      focusTarget?.focus();
    });
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, true);
    this.#stopPosition?.();
    this.#stopPosition = null;
    this.#panel.classList.add('closing');
    this.#exitAnim = fadeOut(this.#panel, { duration: 'fast' });
    void this.#exitAnim.finished.then(() => {
      if (this.open) return;
      this.#panel.classList.remove('closing');
      exitTopLayer(this.#panel);
      this.#exitAnim = null;
    });
  }

  #cleanupOverlay(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#stopPosition?.();
    this.#stopPosition = null;
    exitTopLayer(this.#panel);
    overlayManager.remove(this.#overlayId, false);
    this.#wasOpen = false;
  }

  #columns(): readonly (readonly CascaderOption[])[] {
    if (this.options.length === 0) return [];
    const cols: (readonly CascaderOption[])[] = [this.options];
    let current = this.options;
    for (const val of this.#activePath) {
      const hit = current.find((o) => o.value === val);
      if (!hit || !hit.children || hit.children.length === 0) break;
      cols.push(hit.children);
      current = hit.children;
    }
    return cols;
  }

  #renderMenus(): void {
    this.#menusEl.innerHTML = '';
    const cols = this.#columns();

    if (cols.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No options available';
      this.#menusEl.append(empty);
      return;
    }

    const committed = this.valuePath;

    cols.forEach((levelOptions, colIndex) => {
      const menu = document.createElement('div');
      menu.className = 'menu';
      menu.setAttribute('role', 'listbox');
      menu.dataset.col = String(colIndex);

      levelOptions.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'item';
        btn.setAttribute('role', 'option');
        btn.dataset.col = String(colIndex);
        btn.dataset.value = opt.value;
        btn.disabled = Boolean(opt.disabled);

        const isBranch = Boolean(opt.children && opt.children.length > 0);
        const isActive = this.#activePath[colIndex] === opt.value;
        const isCommitted = committed[colIndex] === opt.value;
        btn.dataset.active = isActive ? 'true' : 'false';
        btn.setAttribute('aria-selected', isCommitted ? 'true' : 'false');

        const label = document.createElement('span');
        label.textContent = opt.label;
        btn.append(label);

        if (isBranch) {
          const chev = document.createElement('span');
          chev.className = 'item-chevron';
          chev.setAttribute('aria-hidden', 'true');
          chev.innerHTML = `<svg viewBox="0 0 16 16">${getIcon('chevron-right') ?? ''}</svg>`;
          btn.append(chev);
        }

        const activatePath = (): string[] => [...this.#activePath.slice(0, colIndex), opt.value];

        btn.addEventListener('click', () => {
          if (opt.disabled) return;
          const nextPath = activatePath();
          this.#activePath = nextPath;
          if (!isBranch) {
            this.#commitPath(nextPath, true);
          } else if (this.changeOnSelect) {
            this.#commitPath(nextPath, false);
          } else {
            this.#renderMenus();
          }
        });

        if (this.expandTrigger === 'hover' && isBranch) {
          btn.addEventListener('pointerenter', () => {
            if (opt.disabled) return;
            if (this.#activePath[colIndex] !== opt.value) {
              this.#activePath = activatePath();
              this.#renderMenus();
            }
          });
        }

        menu.append(btn);
      });

      this.#menusEl.append(menu);
    });
  }

  #commitPath(path: string[], closeAfter: boolean): void {
    const resolved = resolveCascaderPath(this.options, path);
    this.value = path.join('/');
    this.markInteracted();
    this.#syncFormAndValidity();
    if (closeAfter) {
      this.open = false;
    } else {
      this.#renderMenus();
    }
    this.#emitChange(path, resolved);
  }

  #emitChange(path: string[], options: CascaderOption[]): void {
    emit<CascaderChangeDetail>(this, 'k-cascader-change', {
      value: this.value,
      path,
      options,
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onMenuKeyDown(event: KeyboardEvent): void {
    const btn = (event.target as Element | null)?.closest<HTMLButtonElement>('.item[data-col]');
    if (!btn) return;
    const colIndex = Number(btn.dataset.col);
    const val = btn.dataset.value ?? '';
    const menu = btn.parentElement as HTMLDivElement;
    const enabledInCol = [...menu.querySelectorAll<HTMLButtonElement>('.item:not(:disabled)')];
    const idx = enabledInCol.indexOf(btn);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      enabledInCol[(idx + 1) % enabledInCol.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      enabledInCol[(idx - 1 + enabledInCol.length) % enabledInCol.length]?.focus();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextPath = [...this.#activePath.slice(0, colIndex), val];
      const resolved = resolveCascaderPath(this.options, nextPath);
      const last = resolved[resolved.length - 1];
      if (last?.children && last.children.length > 0) {
        this.#activePath = nextPath;
        this.#renderMenus();
        const nextCol = this.#menusEl.querySelector<HTMLDivElement>(
          `.menu[data-col="${colIndex + 1}"]`,
        );
        nextCol?.querySelector<HTMLButtonElement>('.item:not(:disabled)')?.focus();
      }
    } else if (event.key === 'ArrowLeft' && colIndex > 0) {
      event.preventDefault();
      const parentVal = this.#activePath[colIndex - 1];
      const prevCol = this.#menusEl.querySelector<HTMLDivElement>(
        `.menu[data-col="${colIndex - 1}"]`,
      );
      const parentBtn =
        prevCol?.querySelector<HTMLButtonElement>(`.item[data-value="${parentVal}"]`) ??
        prevCol?.querySelector<HTMLButtonElement>('.item:not(:disabled)');
      parentBtn?.focus();
    }
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity({ valueMissing: true }, 'Please select an option.', this.#trigger);
    } else {
      this.setValidity({});
    }
  }
}
