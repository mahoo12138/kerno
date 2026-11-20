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
  MONTH_NAMES_LONG,
  MONTH_NAMES_SHORT,
  addDaysIso,
  addMonths,
  buildMonthGrid,
  compareIsoDates,
  getWeekdayLabels,
  isDateOutOfBounds,
  parseIsoDate,
  todayIso,
} from './calendar.js';
import { datePickerStyles } from './date-picker.styles.js';

export type DatePickerMode = 'single' | 'range';
export type DatePickerSize = 'sm' | 'md' | 'lg';
type CalendarView = 'days' | 'months' | 'years';

export interface DateChangeDetail {
  value: string;
  start: string;
  end: string;
}

/**
 * Zero-dependency form-associated Fluent 1 Date Picker supporting both
 * `mode="single"` (`YYYY-MM-DD`) and `mode="range"` (`YYYY-MM-DD..YYYY-MM-DD`),
 * Days/Months/Years views, `min`/`max` constraints, keyboard navigation,
 * Top-Layer calendar popup, and optional Acrylic frosted glass.
 *
 * @tag k-date-picker
 *
 * @csspart trigger - Focusable trigger button.
 * @csspart panel - Top-Layer calendar popup.
 *
 * @fires k-date-change - Fired when selection changes (`{ value, start, end }`).
 * @fires input - Fired on date selection.
 * @fires change - Fired when date selection commits.
 */
export class KDatePicker extends FormAssociatedElement {
  static override styles = datePickerStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="trigger" class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><span class="display"></span><span class="trailing"><span class="clear-btn" role="button" tabindex="-1" aria-label="Clear date" hidden></span><span class="cal-icon" aria-hidden="true"></span></span></button><div part="panel" class="panel" role="dialog" aria-label="Calendar"><div class="cal-header"><button class="nav-btn prev-btn" type="button" aria-label="Previous"></button><button class="view-btn" type="button"></button><button class="nav-btn next-btn" type="button" aria-label="Next"></button></div><div class="cal-body"></div><div class="cal-footer"><button class="footer-btn today-btn" type="button">Today</button><button class="footer-btn muted clear-footer-btn" type="button" hidden>Clear</button></div></div>`;

  @prop({ reflect: true }) accessor mode: DatePickerMode = 'single';
  /** Canonical ISO value (`"YYYY-MM-DD"` in single mode, `"YYYY-MM-DD..YYYY-MM-DD"` in range mode). */
  @prop({ reflect: true }) accessor value = '';
  @prop({ attribute: 'start-value', reflect: true }) accessor startValue = '';
  @prop({ attribute: 'end-value', reflect: true }) accessor endValue = '';
  @prop({ reflect: true }) accessor min = '';
  @prop({ reflect: true }) accessor max = '';
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ reflect: true }) accessor size: DatePickerSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  /** `0` = Sunday, `1` = Monday (default). */
  @prop({ type: Number, attribute: 'first-day-of-week', reflect: true })
  accessor firstDayOfWeek: 0 | 1 = 1;
  @prop({ type: Boolean, reflect: true }) accessor open = false;

  readonly #overlayId = uniqueId('k-datepicker');

  #trigger!: HTMLButtonElement;
  #display!: HTMLSpanElement;
  #clearBtn!: HTMLSpanElement;
  #calIcon!: HTMLSpanElement;
  #panel!: HTMLDivElement;
  #prevBtn!: HTMLButtonElement;
  #viewBtn!: HTMLButtonElement;
  #nextBtn!: HTMLButtonElement;
  #calBody!: HTMLDivElement;
  #todayBtn!: HTMLButtonElement;
  #clearFooterBtn!: HTMLButtonElement;

  #view: CalendarView = 'days';
  #viewYear = new Date().getFullYear();
  #viewMonth = new Date().getMonth() + 1;
  #focusedIso = todayIso();
  #hoverIso = '';
  #pickingEnd = false;
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultStart = '';
  #defaultEnd = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#trigger ?? null,
    getKind: () => this.shape,
  });

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultStart = this.getAttribute('start-value') ?? this.startValue;
      this.#defaultEnd = this.getAttribute('end-value') ?? this.endValue;
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
    this.startValue = this.#defaultStart;
    this.endValue = this.#defaultEnd;
    this.#pickingEnd = false;
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#trigger = this.renderRoot.querySelector('.trigger') as HTMLButtonElement;
    this.#display = this.renderRoot.querySelector('.display') as HTMLSpanElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLSpanElement;
    this.#calIcon = this.renderRoot.querySelector('.cal-icon') as HTMLSpanElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#prevBtn = this.renderRoot.querySelector('.prev-btn') as HTMLButtonElement;
    this.#viewBtn = this.renderRoot.querySelector('.view-btn') as HTMLButtonElement;
    this.#nextBtn = this.renderRoot.querySelector('.next-btn') as HTMLButtonElement;
    this.#calBody = this.renderRoot.querySelector('.cal-body') as HTMLDivElement;
    this.#todayBtn = this.renderRoot.querySelector('.today-btn') as HTMLButtonElement;
    this.#clearFooterBtn = this.renderRoot.querySelector('.clear-footer-btn') as HTMLButtonElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#calIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('calendar') ?? ''}</svg>`;
    this.#prevBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-left') ?? ''}</svg>`;
    this.#nextBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-right') ?? ''}</svg>`;

    this.#trigger.addEventListener('click', () => {
      if (this.isDisabled) return;
      this.open = !this.open;
    });

    this.#trigger.addEventListener('keydown', (e) => {
      if (this.isDisabled) return;
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        if (!this.open) {
          e.preventDefault();
          this.open = true;
        }
      }
    });

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#clearSelection();
    });
    this.#clearFooterBtn.addEventListener('click', () => this.#clearSelection());

    this.#todayBtn.addEventListener('click', () => {
      const today = todayIso();
      if (isDateOutOfBounds(today, this.min, this.max)) return;
      const p = parseIsoDate(today)!;
      this.#view = 'days';
      this.#viewYear = p.year;
      this.#viewMonth = p.month;
      this.#focusedIso = today;
      if (this.mode === 'single') {
        this.#selectDay(today);
      } else {
        this.#renderCalendar();
      }
    });

    this.#prevBtn.addEventListener('click', () => this.#stepView(-1));
    this.#nextBtn.addEventListener('click', () => this.#stepView(1));
    this.#viewBtn.addEventListener('click', () => {
      if (this.#view === 'days') this.#view = 'months';
      else if (this.#view === 'months') this.#view = 'years';
      else this.#view = 'days';
      this.#renderCalendar();
    });

    this.#calBody.addEventListener('keydown', (e) => this.#onCalendarKeyDown(e));
  }

  protected override update(changed: PropertyValues): void {
    // Sync canonical `value` ↔ `startValue`/`endValue` in range mode
    if (this.mode === 'range') {
      if (changed.has('value') && this.value.includes('..')) {
        const [s, e] = this.value.split('..');
        if (s && parseIsoDate(s)) this.startValue = s;
        if (e && parseIsoDate(e)) this.endValue = e;
      } else if (changed.has('startValue') || changed.has('endValue')) {
        this.value = this.startValue && this.endValue ? `${this.startValue}..${this.endValue}` : '';
      }
    }

    const disabled = this.isDisabled;
    this.#trigger.disabled = disabled;
    this.#trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');

    const displayText = this.#displayLabel();
    const isEmpty = displayText === '';
    this.#display.textContent =
      displayText ||
      this.placeholder ||
      (this.mode === 'range' ? 'Start date – End date' : 'Select date');
    this.#display.classList.toggle('placeholder', isEmpty);

    const canClear = this.clearable && !disabled && !isEmpty;
    this.#clearBtn.hidden = !canClear;
    this.#clearFooterBtn.hidden = !canClear;

    if (disabled && this.open) this.open = false;

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#openOverlay();
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#closeOverlay();
    } else if (this.open) {
      this.#renderCalendar();
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

  #displayLabel(): string {
    if (this.mode === 'range') {
      if (this.startValue && this.endValue) return `${this.startValue} → ${this.endValue}`;
      if (this.startValue) return `${this.startValue} → ...`;
      return '';
    }
    return this.value;
  }

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#panel.classList.remove('closing');
    }

    const seed =
      parseIsoDate(this.mode === 'range' ? this.startValue : this.value) ??
      parseIsoDate(todayIso())!;
    this.#view = 'days';
    this.#viewYear = seed.year;
    this.#viewMonth = seed.month;
    this.#focusedIso = (this.mode === 'range' ? this.startValue : this.value) || todayIso();
    this.#hoverIso = '';
    this.#pickingEnd = false;

    this.#renderCalendar();
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
      const target =
        this.#calBody.querySelector<HTMLButtonElement>(`button[data-iso="${this.#focusedIso}"]`) ??
        this.#calBody.querySelector<HTMLButtonElement>('button:not(:disabled)');
      target?.focus();
    });
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, true);
    this.#stopPosition?.();
    this.#stopPosition = null;
    this.#hoverIso = '';
    this.#pickingEnd = false;

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

  #stepView(dir: 1 | -1): void {
    if (this.#view === 'days') {
      const next = addMonths(this.#viewYear, this.#viewMonth, dir);
      this.#viewYear = next.year;
      this.#viewMonth = next.month;
    } else if (this.#view === 'months') {
      this.#viewYear += dir;
    } else {
      this.#viewYear += dir * 12;
    }
    this.#renderCalendar();
  }

  #renderCalendar(): void {
    this.#calBody.innerHTML = '';

    if (this.#view === 'days') {
      this.#viewBtn.textContent = `${MONTH_NAMES_LONG[this.#viewMonth - 1]} ${this.#viewYear}`;
      this.#renderDaysView();
    } else if (this.#view === 'months') {
      this.#viewBtn.textContent = String(this.#viewYear);
      this.#renderMonthsView();
    } else {
      const startYear = Math.floor(this.#viewYear / 12) * 12;
      this.#viewBtn.textContent = `${startYear} – ${startYear + 11}`;
      this.#renderYearsView(startYear);
    }

    this.#todayBtn.disabled = isDateOutOfBounds(todayIso(), this.min, this.max);
  }

  #renderDaysView(): void {
    const weekdays = document.createElement('div');
    weekdays.className = 'weekdays';
    for (const label of getWeekdayLabels(this.firstDayOfWeek)) {
      const span = document.createElement('span');
      span.className = 'weekday';
      span.textContent = label;
      weekdays.append(span);
    }

    const grid = document.createElement('div');
    grid.className = 'days-grid';
    grid.setAttribute('role', 'grid');

    const today = todayIso();
    const cells = buildMonthGrid(this.#viewYear, this.#viewMonth, this.firstDayOfWeek);

    let rangeStart = this.startValue;
    let rangeEnd = this.endValue;
    if (this.mode === 'range' && this.#pickingEnd && this.startValue && this.#hoverIso) {
      if (compareIsoDates(this.#hoverIso, this.startValue) < 0) {
        rangeStart = this.#hoverIso;
        rangeEnd = this.startValue;
      } else {
        rangeStart = this.startValue;
        rangeEnd = this.#hoverIso;
      }
    }

    for (const cell of cells) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.dataset.iso = cell.iso;
      btn.textContent = String(cell.day);
      btn.setAttribute('aria-label', cell.iso);

      const disabled = isDateOutOfBounds(cell.iso, this.min, this.max);
      btn.disabled = disabled;
      if (!cell.inMonth) btn.dataset.outside = 'true';
      if (cell.iso === today) btn.dataset.today = 'true';

      let selected: boolean;
      let inRange = false;
      if (this.mode === 'single') {
        selected = this.value === cell.iso;
      } else {
        selected =
          (Boolean(rangeStart) && cell.iso === rangeStart) ||
          (Boolean(rangeEnd) && cell.iso === rangeEnd);
        if (
          rangeStart &&
          rangeEnd &&
          compareIsoDates(cell.iso, rangeStart) > 0 &&
          compareIsoDates(cell.iso, rangeEnd) < 0
        ) {
          inRange = true;
        }
      }

      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (inRange) btn.dataset.inRange = 'true';
      btn.tabIndex = cell.iso === this.#focusedIso ? 0 : -1;

      btn.addEventListener('click', () => {
        if (!disabled) this.#selectDay(cell.iso);
      });

      if (this.mode === 'range') {
        btn.addEventListener('pointerenter', () => {
          if (this.#pickingEnd && !disabled && this.#hoverIso !== cell.iso) {
            this.#hoverIso = cell.iso;
            this.#renderCalendar();
          }
        });
      }

      grid.append(btn);
    }

    this.#calBody.append(weekdays, grid);
  }

  #renderMonthsView(): void {
    const grid = document.createElement('div');
    grid.className = 'period-grid';
    MONTH_NAMES_SHORT.forEach((label, idx) => {
      const month = idx + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.textContent = label;
      btn.setAttribute('aria-selected', month === this.#viewMonth ? 'true' : 'false');
      btn.addEventListener('click', () => {
        this.#viewMonth = month;
        this.#view = 'days';
        this.#renderCalendar();
      });
      grid.append(btn);
    });
    this.#calBody.append(grid);
  }

  #renderYearsView(startYear: number): void {
    const grid = document.createElement('div');
    grid.className = 'period-grid';
    for (let y = startYear; y < startYear + 12; y++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.textContent = String(y);
      btn.setAttribute('aria-selected', y === this.#viewYear ? 'true' : 'false');
      btn.addEventListener('click', () => {
        this.#viewYear = y;
        this.#view = 'months';
        this.#renderCalendar();
      });
      grid.append(btn);
    }
    this.#calBody.append(grid);
  }

  #selectDay(iso: string): void {
    this.#focusedIso = iso;
    this.markInteracted();

    if (this.mode === 'single') {
      this.value = iso;
      this.startValue = iso;
      this.endValue = '';
      this.#syncFormAndValidity();
      this.open = false;
      this.#emitChange();
      return;
    }

    if (!this.#pickingEnd || !this.startValue) {
      this.startValue = iso;
      this.endValue = '';
      this.value = '';
      this.#pickingEnd = true;
      this.#hoverIso = iso;
      this.#syncFormAndValidity();
      this.#renderCalendar();
      return;
    }

    if (compareIsoDates(iso, this.startValue) < 0) {
      this.endValue = this.startValue;
      this.startValue = iso;
    } else {
      this.endValue = iso;
    }
    this.value = `${this.startValue}..${this.endValue}`;
    this.#pickingEnd = false;
    this.#hoverIso = '';
    this.#syncFormAndValidity();
    this.open = false;
    this.#emitChange();
  }

  #clearSelection(): void {
    this.value = '';
    this.startValue = '';
    this.endValue = '';
    this.#pickingEnd = false;
    this.#hoverIso = '';
    this.markInteracted();
    this.#syncFormAndValidity();
    if (this.open) this.#renderCalendar();
    this.#emitChange();
  }

  #emitChange(): void {
    emit<DateChangeDetail>(this, 'k-date-change', {
      value: this.value,
      start: this.mode === 'range' ? this.startValue : this.value,
      end: this.mode === 'range' ? this.endValue : '',
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onCalendarKeyDown(event: KeyboardEvent): void {
    if (this.#view !== 'days') return;
    let delta: number;
    if (event.key === 'ArrowLeft') delta = -1;
    else if (event.key === 'ArrowRight') delta = 1;
    else if (event.key === 'ArrowUp') delta = -7;
    else if (event.key === 'ArrowDown') delta = 7;
    else if (event.key === 'PageUp') {
      event.preventDefault();
      this.#stepView(-1);
      return;
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      this.#stepView(1);
      return;
    } else {
      return;
    }

    event.preventDefault();
    const nextIso = addDaysIso(this.#focusedIso, delta);
    const parsed = parseIsoDate(nextIso);
    if (!parsed) return;
    this.#focusedIso = nextIso;
    this.#viewYear = parsed.year;
    this.#viewMonth = parsed.month;
    this.#renderCalendar();
    this.#calBody.querySelector<HTMLButtonElement>(`button[data-iso="${nextIso}"]`)?.focus();
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.value) {
      this.setValidity({ valueMissing: true }, 'Please select a date.', this.#trigger);
    } else {
      this.setValidity({});
    }
  }
}
