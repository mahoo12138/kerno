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
  formatTimeDisplay,
  formatTimeValue,
  isTimeOutOfBounds,
  nowTimeParts,
  pad2,
  parseTimeValue,
  type TimeParts,
} from './time.js';
import { timePickerStyles } from './time-picker.styles.js';

export type TimePickerSize = 'sm' | 'md' | 'lg';

export interface TimeChangeDetail {
  value: string;
  parts: TimeParts | null;
}

/**
 * Form-associated Fluent 1 Time Picker supporting 24h & 12h (AM/PM) formats,
 * optional seconds, configurable steps, `min`/`max` bounds, Top-Layer popup,
 * and Acrylic glass.
 *
 * @tag k-time-picker
 *
 * @csspart trigger - Focusable trigger button.
 * @csspart panel - Top-Layer multi-column time selector panel.
 *
 * @fires k-time-change - Fired when selected time changes (`{ value, parts }`).
 * @fires input - Fired on time selection.
 * @fires change - Fired when time selection commits.
 */
export class KTimePicker extends FormAssociatedElement {
  static override styles = timePickerStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="trigger" class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><span class="display"></span><span class="trailing"><span class="clear-btn" role="button" tabindex="-1" aria-label="Clear time" hidden></span><span class="clock-icon" aria-hidden="true"></span></span></button><div part="panel" class="panel" role="dialog" aria-label="Time picker"><div class="columns"></div><div class="footer"><button class="footer-btn now-btn" type="button">Now</button><button class="footer-btn primary done-btn" type="button">OK</button></div></div>`;

  /** Canonical 24h value (`"HH:mm"` or `"HH:mm:ss"`). */
  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor min = '';
  @prop({ reflect: true }) accessor max = '';
  @prop({ reflect: true }) accessor placeholder = 'Select time';
  @prop({ reflect: true }) accessor size: TimePickerSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, attribute: 'show-seconds', reflect: true }) accessor showSeconds = false;
  @prop({ type: Boolean, attribute: 'use-12-hours', reflect: true }) accessor use12Hours = false;
  @prop({ type: Number, attribute: 'hour-step' }) accessor hourStep = 1;
  @prop({ type: Number, attribute: 'minute-step' }) accessor minuteStep = 1;
  @prop({ type: Number, attribute: 'second-step' }) accessor secondStep = 1;
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor open = false;

  readonly #overlayId = uniqueId('k-timepicker');

  #trigger!: HTMLButtonElement;
  #display!: HTMLSpanElement;
  #clearBtn!: HTMLSpanElement;
  #clockIcon!: HTMLSpanElement;
  #panel!: HTMLDivElement;
  #columnsEl!: HTMLDivElement;
  #nowBtn!: HTMLButtonElement;
  #doneBtn!: HTMLButtonElement;

  #draft: TimeParts = { hours: 9, minutes: 0, seconds: 0 };
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#trigger ?? null,
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
    this.#trigger = this.renderRoot.querySelector('.trigger') as HTMLButtonElement;
    this.#display = this.renderRoot.querySelector('.display') as HTMLSpanElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLSpanElement;
    this.#clockIcon = this.renderRoot.querySelector('.clock-icon') as HTMLSpanElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#columnsEl = this.renderRoot.querySelector('.columns') as HTMLDivElement;
    this.#nowBtn = this.renderRoot.querySelector('.now-btn') as HTMLButtonElement;
    this.#doneBtn = this.renderRoot.querySelector('.done-btn') as HTMLButtonElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#clockIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('clock') ?? ''}</svg>`;

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
      this.markInteracted();
      this.#syncFormAndValidity();
      this.#emitChange(null);
    });

    this.#nowBtn.addEventListener('click', () => {
      const now = nowTimeParts();
      if (isTimeOutOfBounds(now, this.min, this.max)) return;
      this.#draft = now;
      this.#commitDraft(true);
    });

    this.#doneBtn.addEventListener('click', () => {
      this.#commitDraft(true);
    });
  }

  protected override update(changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#trigger.disabled = disabled;
    this.#trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');

    const parsed = this.value ? parseTimeValue(this.value) : null;
    const displayText = parsed
      ? formatTimeDisplay(parsed, {
          showSeconds: this.showSeconds,
          use12Hours: this.use12Hours,
        })
      : '';
    this.#display.textContent = displayText || this.placeholder;
    this.#display.classList.toggle('placeholder', !displayText);
    this.#clearBtn.hidden = !this.clearable || disabled || !displayText;

    if (disabled && this.open) this.open = false;

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#openOverlay();
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#closeOverlay();
    } else if (this.open) {
      this.#renderColumns();
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
    this.#draft = parseTimeValue(this.value) ?? { hours: 9, minutes: 0, seconds: 0 };
    this.#renderColumns();
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
      for (const selected of this.#columnsEl.querySelectorAll<HTMLElement>(
        '[aria-selected="true"]',
      )) {
        selected.scrollIntoView({ block: 'center' });
      }
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

  #renderColumns(): void {
    const savedScroll = new Map<string, number>();
    for (const col of this.#columnsEl.querySelectorAll<HTMLElement>('.col[aria-label]')) {
      const label = col.getAttribute('aria-label');
      if (label) savedScroll.set(label, col.scrollTop);
    }

    this.#columnsEl.innerHTML = '';

    const hStep = Math.max(1, Math.floor(this.hourStep) || 1);
    const mStep = Math.max(1, Math.floor(this.minuteStep) || 1);
    const sStep = Math.max(1, Math.floor(this.secondStep) || 1);

    const isPm = this.#draft.hours >= 12;
    const hourValues: { label: string; value24: number }[] = [];
    if (this.use12Hours) {
      for (let h = 0; h < 12; h += hStep) {
        const displayH = h === 0 ? 12 : h;
        hourValues.push({ label: pad2(displayH), value24: isPm ? h + 12 : h });
      }
    } else {
      for (let h = 0; h < 24; h += hStep) {
        hourValues.push({ label: pad2(h), value24: h });
      }
    }

    this.#columnsEl.append(
      this.#buildColumn(
        'Hour',
        hourValues.map((h) => ({
          label: h.label,
          selected: this.#draft.hours === h.value24,
          disabled: isTimeOutOfBounds({ ...this.#draft, hours: h.value24 }, this.min, this.max),
          onSelect: () => {
            this.#draft = { ...this.#draft, hours: h.value24 };
            this.#commitDraft(false);
          },
        })),
      ),
    );

    const mins: { label: string; selected: boolean; disabled: boolean; onSelect: () => void }[] =
      [];
    for (let m = 0; m < 60; m += mStep) {
      mins.push({
        label: pad2(m),
        selected: this.#draft.minutes === m,
        disabled: isTimeOutOfBounds({ ...this.#draft, minutes: m }, this.min, this.max),
        onSelect: () => {
          this.#draft = { ...this.#draft, minutes: m };
          this.#commitDraft(false);
        },
      });
    }
    this.#columnsEl.append(this.#buildColumn('Min', mins));

    if (this.showSeconds) {
      const secs: { label: string; selected: boolean; disabled: boolean; onSelect: () => void }[] =
        [];
      for (let s = 0; s < 60; s += sStep) {
        secs.push({
          label: pad2(s),
          selected: this.#draft.seconds === s,
          disabled: isTimeOutOfBounds({ ...this.#draft, seconds: s }, this.min, this.max),
          onSelect: () => {
            this.#draft = { ...this.#draft, seconds: s };
            this.#commitDraft(false);
          },
        });
      }
      this.#columnsEl.append(this.#buildColumn('Sec', secs));
    }

    if (this.use12Hours) {
      const amHour = this.#draft.hours % 12;
      const pmHour = amHour + 12;
      this.#columnsEl.append(
        this.#buildColumn('Period', [
          {
            label: 'AM',
            selected: !isPm,
            disabled: isTimeOutOfBounds({ ...this.#draft, hours: amHour }, this.min, this.max),
            onSelect: () => {
              this.#draft = { ...this.#draft, hours: amHour };
              this.#commitDraft(false);
            },
          },
          {
            label: 'PM',
            selected: isPm,
            disabled: isTimeOutOfBounds({ ...this.#draft, hours: pmHour }, this.min, this.max),
            onSelect: () => {
              this.#draft = { ...this.#draft, hours: pmHour };
              this.#commitDraft(false);
            },
          },
        ]),
      );
    }

    for (const col of this.#columnsEl.querySelectorAll<HTMLElement>('.col[aria-label]')) {
      const label = col.getAttribute('aria-label');
      const top = label ? savedScroll.get(label) : undefined;
      if (top !== undefined) col.scrollTop = top;
    }
  }

  #buildColumn(
    title: string,
    entries: { label: string; selected: boolean; disabled: boolean; onSelect: () => void }[],
  ): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'col-wrap';

    const head = document.createElement('div');
    head.className = 'col-head';
    head.textContent = title;

    const col = document.createElement('div');
    col.className = 'col';
    col.setAttribute('role', 'listbox');
    col.setAttribute('aria-label', title);

    for (const entry of entries) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', entry.selected ? 'true' : 'false');
      btn.disabled = entry.disabled;
      btn.textContent = entry.label;
      btn.addEventListener('click', () => {
        if (!entry.disabled) entry.onSelect();
      });
      col.append(btn);
    }

    wrap.append(head, col);
    return wrap;
  }

  #commitDraft(closeAfter: boolean): void {
    if (isTimeOutOfBounds(this.#draft, this.min, this.max)) return;
    const formatted = formatTimeValue(this.#draft, this.showSeconds);
    const changed = formatted !== this.value;
    this.value = formatted;
    this.markInteracted();
    this.#syncFormAndValidity();
    if (closeAfter) this.open = false;
    else this.#renderColumns();
    if (changed || closeAfter) {
      this.#emitChange(this.#draft);
    }
  }

  #emitChange(parts: TimeParts | null): void {
    emit<TimeChangeDetail>(this, 'k-time-change', { value: this.value, parts });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity({ valueMissing: true }, 'Please select a time.', this.#trigger);
      return;
    }
    const parsed = this.value ? parseTimeValue(this.value) : null;
    if (parsed && isTimeOutOfBounds(parsed, this.min, this.max)) {
      this.setValidity({ rangeUnderflow: true }, 'Selected time is out of range.', this.#trigger);
      return;
    }
    this.setValidity({});
  }
}
