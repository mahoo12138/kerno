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
import {
  formatColor,
  formatHasAlpha,
  hsvaToRgba,
  parseColor,
  type ColorFormat,
  type Hsva,
} from './color.js';
import { colorInputStyles, colorPickerStyles } from './color-picker.styles.js';

export type ColorInputSize = 'sm' | 'md' | 'lg';

export interface ColorChangeDetail {
  value: string;
  hex: string;
  rgba: string;
  hsla: string;
}

interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
}

/**
 * Zero-dependency HSVA Color Picker with 2D saturation/value board, hue &
 * alpha sliders, preset swatches, and HEX/RGB/HSL formatting.
 *
 * @tag k-color-picker
 *
 * @csspart saturation - 2D saturation/brightness picker surface.
 * @csspart hue - Hue spectrum slider bar.
 * @csspart alpha - Alpha opacity slider bar.
 * @csspart swatches - Preset swatch palette grid.
 *
 * @fires k-color-change - Fired when selected color changes (`{ value, hex, rgba, hsla }`).
 * @fires input - Fired continuously while dragging.
 * @fires change - Fired when selection commits.
 */
export class KColorPicker extends FormAssociatedElement {
  static override styles = colorPickerStyles;
  static override template = /* html */ `<div part="saturation" class="saturation" role="slider" aria-label="Color saturation and brightness" tabindex="0"><div class="sat-white"></div><div class="sat-black"></div><div class="sat-thumb"></div></div><div class="sliders"><div class="preview-swatch"><div class="preview-fill"></div></div><div class="bars"><div part="hue" class="bar hue-bar" role="slider" aria-label="Hue" aria-valuemin="0" aria-valuemax="360" tabindex="0"><div class="bar-thumb hue-thumb"></div></div><div part="alpha" class="bar alpha-bar" role="slider" aria-label="Opacity" aria-valuemin="0" aria-valuemax="100" tabindex="0" hidden><div class="alpha-gradient"></div><div class="bar-thumb alpha-thumb"></div></div></div></div><div part="swatches" class="swatches"></div>`;

  @prop({ reflect: true }) accessor value = '#0d9488';
  @prop({ reflect: true }) accessor format: ColorFormat = 'hex';
  @prop({ type: Boolean, attribute: 'with-alpha', reflect: true }) accessor withAlpha = false;
  @prop({ type: Boolean, attribute: 'full-width', reflect: true }) accessor fullWidth = false;
  @prop({ attribute: false }) accessor swatches: readonly string[] = [];

  #satEl!: HTMLDivElement;
  #satThumb!: HTMLDivElement;
  #hueBar!: HTMLDivElement;
  #hueThumb!: HTMLDivElement;
  #alphaBar!: HTMLDivElement;
  #alphaGrad!: HTMLDivElement;
  #alphaThumb!: HTMLDivElement;
  #previewFill!: HTMLDivElement;
  #swatchesEl!: HTMLDivElement;

  #hsva: Hsva = { h: 175, s: 91, v: 58, a: 1 };
  #defaultValue = '#0d9488';
  #defaultCaptured = false;

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
    this.#syncFromValue();
    this.#renderAll();
    this.#syncForm();
  }

  protected override setup(): void {
    this.#satEl = this.renderRoot.querySelector('.saturation') as HTMLDivElement;
    this.#satThumb = this.renderRoot.querySelector('.sat-thumb') as HTMLDivElement;
    this.#hueBar = this.renderRoot.querySelector('.hue-bar') as HTMLDivElement;
    this.#hueThumb = this.renderRoot.querySelector('.hue-thumb') as HTMLDivElement;
    this.#alphaBar = this.renderRoot.querySelector('.alpha-bar') as HTMLDivElement;
    this.#alphaGrad = this.renderRoot.querySelector('.alpha-gradient') as HTMLDivElement;
    this.#alphaThumb = this.renderRoot.querySelector('.alpha-thumb') as HTMLDivElement;
    this.#previewFill = this.renderRoot.querySelector('.preview-fill') as HTMLDivElement;
    this.#swatchesEl = this.renderRoot.querySelector('.swatches') as HTMLDivElement;

    this.#bindDrag(this.#satEl, (rx, ry) => {
      this.#hsva = { ...this.#hsva, s: Math.round(rx * 100), v: Math.round((1 - ry) * 100) };
      this.#commitHsva(false);
    });

    this.#bindDrag(this.#hueBar, (rx) => {
      this.#hsva = { ...this.#hsva, h: Math.round(rx * 360) };
      this.#commitHsva(false);
    });

    this.#bindDrag(this.#alphaBar, (rx) => {
      this.#hsva = { ...this.#hsva, a: Number(rx.toFixed(2)) };
      this.#commitHsva(false);
    });

    this.#satEl.addEventListener('keydown', (e) => {
      if (this.isDisabled) return;
      const delta = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowRight') this.#hsva.s = Math.min(100, this.#hsva.s + delta);
      else if (e.key === 'ArrowLeft') this.#hsva.s = Math.max(0, this.#hsva.s - delta);
      else if (e.key === 'ArrowUp') this.#hsva.v = Math.min(100, this.#hsva.v + delta);
      else if (e.key === 'ArrowDown') this.#hsva.v = Math.max(0, this.#hsva.v - delta);
      else return;
      e.preventDefault();
      this.#commitHsva(true);
    });

    this.#hueBar.addEventListener('keydown', (e) => {
      if (this.isDisabled) return;
      const delta = e.shiftKey ? 15 : 5;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
        this.#hsva.h = (this.#hsva.h + delta) % 360;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
        this.#hsva.h = (this.#hsva.h - delta + 360) % 360;
      else return;
      e.preventDefault();
      this.#commitHsva(true);
    });

    this.#alphaBar.addEventListener('keydown', (e) => {
      if (this.isDisabled) return;
      const delta = e.shiftKey ? 0.1 : 0.05;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
        this.#hsva.a = Math.min(1, Number((this.#hsva.a + delta).toFixed(2)));
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
        this.#hsva.a = Math.max(0, Number((this.#hsva.a - delta).toFixed(2)));
      else return;
      e.preventDefault();
      this.#commitHsva(true);
    });
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('value')) {
      this.#syncFromValue();
    }
    if (changed.has('format')) {
      this.value = formatColor(this.#hsva, this.format);
    }
    this.#renderAll();
    if (changed.has('swatches') || changed.has('value')) {
      this.#renderSwatches();
    }
    this.#syncForm();
  }

  #bindDrag(el: HTMLElement, onMove: (rx: number, ry: number) => void): void {
    let dragging = false;
    const sample = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const rx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ry = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onMove(rx, ry);
    };
    el.addEventListener('pointerdown', (e) => {
      if (this.isDisabled || e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      el.focus();
      el.setPointerCapture(e.pointerId);
      sample(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      sample(e);
    });
    const stop = (): void => {
      if (!dragging) return;
      dragging = false;
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }

  #syncFromValue(): void {
    const parsed = parseColor(this.value);
    if (parsed) this.#hsva = parsed;
  }

  #renderAll(): void {
    const { h, s, v, a } = this.#hsva;
    const showAlpha = this.withAlpha || formatHasAlpha(this.format);
    const rgba = hsvaToRgba(this.#hsva);

    this.#satEl.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    this.#satThumb.style.left = `${s}%`;
    this.#satThumb.style.top = `${100 - v}%`;
    this.#satThumb.style.backgroundColor = `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;

    this.#hueThumb.style.left = `${(h / 360) * 100}%`;
    this.#hueBar.setAttribute('aria-valuenow', String(Math.round(h)));

    this.#alphaBar.hidden = !showAlpha;
    if (showAlpha) {
      this.#alphaGrad.style.background = `linear-gradient(to right, rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0), rgb(${rgba.r}, ${rgba.g}, ${rgba.b}))`;
      this.#alphaThumb.style.left = `${a * 100}%`;
      this.#alphaBar.setAttribute('aria-valuenow', String(Math.round(a * 100)));
    }

    this.#previewFill.style.backgroundColor = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a})`;
  }

  #renderSwatches(): void {
    this.#swatchesEl.innerHTML = '';
    const currentHex = formatColor(this.#hsva, 'hex').toLowerCase();
    for (const color of this.swatches) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.setAttribute('aria-label', `Select color ${color}`);
      const parsed = parseColor(color);
      const swatchHex = parsed ? formatColor(parsed, 'hex').toLowerCase() : color.toLowerCase();
      btn.setAttribute('aria-pressed', swatchHex === currentHex ? 'true' : 'false');

      const fill = document.createElement('span');
      fill.className = 'swatch-fill';
      fill.style.backgroundColor = color;
      btn.append(fill);

      btn.addEventListener('click', () => {
        if (!parsed) return;
        this.#hsva = parsed;
        this.#commitHsva(true);
      });
      this.#swatchesEl.append(btn);
    }
  }

  #commitHsva(commitChange: boolean): void {
    const formatted = formatColor(this.#hsva, this.format);
    this.value = formatted;
    this.#renderAll();
    this.#renderSwatches();
    this.markInteracted();
    this.#syncForm();

    emit<ColorChangeDetail>(this, 'k-color-change', {
      value: formatted,
      hex: formatColor(this.#hsva, 'hex'),
      rgba: formatColor(this.#hsva, 'rgba'),
      hsla: formatColor(this.#hsva, 'hsla'),
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    if (commitChange) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #syncForm(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
  }
}

/**
 * Form-associated color text input paired with a live swatch trigger, optional
 * EyeDropper button, and a Top-Layer Acrylic `<k-color-picker>` dropdown.
 *
 * @tag k-color-input
 *
 * @csspart control - Input container.
 * @csspart panel - Top-Layer color picker popover.
 *
 * @fires k-color-change - Fired when the color changes (`{ value, hex, rgba, hsla }`).
 */
export class KColorInput extends FormAssociatedElement {
  static override styles = colorInputStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="control" class="control"><button class="swatch-btn" type="button" aria-label="Toggle color picker"><span class="swatch-btn-fill"></span></button><input class="input" type="text" autocomplete="off" spellcheck="false" /><button class="icon-btn eye-btn" type="button" aria-label="Pick color from screen" hidden></button><button class="icon-btn clear-btn" type="button" aria-label="Clear color" hidden></button></div><div part="panel" class="panel" role="dialog" aria-label="Color picker"></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor format: ColorFormat = 'hex';
  @prop({ reflect: true }) accessor placeholder = '#0d9488';
  @prop({ reflect: true }) accessor size: ColorInputSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, attribute: 'with-alpha', reflect: true }) accessor withAlpha = false;
  @prop({ type: Boolean, attribute: 'with-eye-dropper', reflect: true })
  accessor withEyeDropper = true;
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ attribute: false }) accessor swatches: readonly string[] = [];

  readonly #overlayId = uniqueId('k-colorinput');

  #control!: HTMLDivElement;
  #swatchBtn!: HTMLButtonElement;
  #swatchFill!: HTMLSpanElement;
  #input!: HTMLInputElement;
  #eyeBtn!: HTMLButtonElement;
  #clearBtn!: HTMLButtonElement;
  #panel!: HTMLDivElement;
  #picker!: KColorPicker;

  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#control ?? null,
    getKind: () => this.shape,
  });

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
    this.#control = this.renderRoot.querySelector('.control') as HTMLDivElement;
    this.#swatchBtn = this.renderRoot.querySelector('.swatch-btn') as HTMLButtonElement;
    this.#swatchFill = this.renderRoot.querySelector('.swatch-btn-fill') as HTMLSpanElement;
    this.#input = this.renderRoot.querySelector('.input') as HTMLInputElement;
    this.#eyeBtn = this.renderRoot.querySelector('.eye-btn') as HTMLButtonElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLButtonElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;

    this.#eyeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('pipette') ?? ''}</svg>`;
    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;

    this.#picker = new KColorPicker();
    this.#picker.addEventListener('k-color-change', (e) => {
      e.stopPropagation();
      const detail = (e as CustomEvent<ColorChangeDetail>).detail;
      this.value = detail.value;
      this.#input.value = detail.value;
      this.#swatchFill.style.backgroundColor = detail.rgba;
      this.markInteracted();
      this.#syncFormAndValidity();
      emit<ColorChangeDetail>(this, 'k-color-change', detail);
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    this.#panel.append(this.#picker);

    this.#swatchBtn.addEventListener('click', () => {
      if (this.isDisabled || this.readonly) return;
      this.open = !this.open;
    });

    this.#input.addEventListener('focus', () => {
      if (!this.isDisabled && !this.readonly && !this.open) {
        this.open = true;
      }
    });

    this.#input.addEventListener('input', () => {
      if (this.isDisabled || this.readonly) return;
      this.value = this.#input.value;
      const parsed = parseColor(this.value);
      if (parsed) {
        this.#picker.value = this.value;
        this.#swatchFill.style.backgroundColor = formatColor(parsed, 'rgba');
        emit<ColorChangeDetail>(this, 'k-color-change', {
          value: this.value,
          hex: formatColor(parsed, 'hex'),
          rgba: formatColor(parsed, 'rgba'),
          hsla: formatColor(parsed, 'hsla'),
        });
      } else {
        this.#swatchFill.style.backgroundColor = 'transparent';
      }
      this.markInteracted();
      this.#syncFormAndValidity();
    });

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled || this.readonly) return;
      this.value = '';
      this.#input.value = '';
      this.#swatchFill.style.backgroundColor = 'transparent';
      this.markInteracted();
      this.#syncFormAndValidity();
      emit<ColorChangeDetail>(this, 'k-color-change', { value: '', hex: '', rgba: '', hsla: '' });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });

    this.#eyeBtn.addEventListener('click', async () => {
      if (this.isDisabled || this.readonly) return;
      const EyeDropperAPI = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
      if (!EyeDropperAPI) return;
      try {
        const result = await new EyeDropperAPI().open();
        const parsed = parseColor(result.sRGBHex);
        if (parsed) {
          const formatted = formatColor(parsed, this.format);
          this.value = formatted;
          this.#picker.value = formatted;
          this.#input.value = formatted;
          this.#swatchFill.style.backgroundColor = formatColor(parsed, 'rgba');
          this.markInteracted();
          this.#syncFormAndValidity();
          emit<ColorChangeDetail>(this, 'k-color-change', {
            value: formatted,
            hex: formatColor(parsed, 'hex'),
            rgba: formatColor(parsed, 'rgba'),
            hsla: formatColor(parsed, 'hsla'),
          });
          this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }
      } catch {
        // User canceled eyedropper
      }
    });
  }

  protected override update(changed: PropertyValues): void {
    const disabled = this.isDisabled;
    const hasEyeDropper =
      typeof window !== 'undefined' && 'EyeDropper' in window && this.withEyeDropper;

    let parsed = parseColor(this.value);
    if (changed.has('format') && parsed) {
      this.value = formatColor(parsed, this.format);
      parsed = parseColor(this.value);
    }

    this.#control.classList.toggle('disabled', disabled);
    this.#swatchBtn.disabled = disabled;
    this.#input.disabled = disabled;
    this.#input.readOnly = this.readonly;
    this.#input.placeholder = this.placeholder;
    if (this.#input.value !== this.value) this.#input.value = this.value;

    this.#swatchFill.style.backgroundColor = parsed ? formatColor(parsed, 'rgba') : 'transparent';

    this.#eyeBtn.hidden = !hasEyeDropper || disabled || this.readonly;
    this.#clearBtn.hidden = !this.clearable || disabled || this.readonly || !this.value;

    this.#picker.format = this.format;
    this.#picker.withAlpha = this.withAlpha;
    this.#picker.swatches = this.swatches;
    if (parsed) this.#picker.value = this.value;

    this.#syncFormAndValidity();
    this.#shapeOutline.sync();

    if (this.open && !this.#wasOpen && !disabled && !this.readonly) {
      this.#openOverlay();
    } else if ((!this.open || disabled || this.readonly) && this.#wasOpen) {
      this.#closeOverlay();
    }
    this.#wasOpen = this.open && !disabled && !this.readonly;
  }

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#panel.classList.remove('closing');
    }
    enterTopLayer(this.#panel);
    this.#stopPosition = autoPosition(this.#control, this.#panel, {
      placement: 'bottom-start',
      offset: 4,
    });
    overlayManager.add({
      id: this.#overlayId,
      content: this.#panel,
      trigger: this.#control,
      trapFocus: false,
      restoreFocus: false,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      onRequestClose: () => {
        this.open = false;
      },
    });
    slideIn(this.#panel, { y: -4 }, { duration: 'fast' });
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, false);
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

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity({ valueMissing: true }, 'Please select a color.', this.#input);
      return;
    }
    if (this.value && !parseColor(this.value)) {
      this.setValidity({ patternMismatch: true }, 'Enter a valid color value.', this.#input);
      return;
    }
    this.setValidity({});
  }
}
