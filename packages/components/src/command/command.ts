import {
  KernoElement,
  emit,
  enterTopLayer,
  exitTopLayer,
  isServer,
  overlayManager,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeIn, fadeOut, scaleIn, scaleOut, type MotionHandle } from '@kerno/effects/motion';
import { getIcon } from '@kerno/primitives/icon';
import { commandGroupStyles, commandItemStyles, commandStyles } from './command.styles.js';

export interface CommandSelectDetail {
  value: string;
  item: KCommandItem;
}

export type CommandFilter = (item: KCommandItem, query: string) => boolean | number;

/**
 * Case-insensitive fuzzy scorer prioritizing prefix and substring matches while
 * still matching ordered subsequences (e.g. `"thoc"` → `"Theme: Ocean"`).
 */
export function defaultCommandFilter(item: KCommandItem, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const haystack = `${item.labelText} ${item.keywords} ${item.value}`.trim().toLowerCase();
  if (!haystack) return 0;

  if (haystack === q) return 100;
  if (haystack.startsWith(q)) return 80;
  const subIdx = haystack.indexOf(q);
  if (subIdx !== -1) return 60 - Math.min(20, subIdx);

  // Ordered subsequence match
  let qi = 0;
  let score = 10;
  let consecutive = 0;
  for (let i = 0; i < haystack.length && qi < q.length; i++) {
    if (haystack[i] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive * 2;
    } else {
      consecutive = 0;
    }
  }
  return qi === q.length ? score : 0;
}

interface ParsedShortcut {
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

function parseShortcut(spec: string): ParsedShortcut | null {
  const tokens = spec
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const parsed: ParsedShortcut = {
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: '',
  };

  for (const tok of tokens) {
    if (tok === 'mod') parsed.mod = true;
    else if (tok === 'ctrl' || tok === 'control') parsed.ctrl = true;
    else if (tok === 'meta' || tok === 'cmd' || tok === 'command') parsed.meta = true;
    else if (tok === 'alt' || tok === 'option') parsed.alt = true;
    else if (tok === 'shift') parsed.shift = true;
    else parsed.key = tok;
  }

  return parsed.key ? parsed : null;
}

function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  if (event.key.toLowerCase() !== parsed.key) return false;
  if (parsed.mod) {
    if (!(event.metaKey || event.ctrlKey)) return false;
  } else {
    if (event.ctrlKey !== parsed.ctrl) return false;
    if (event.metaKey !== parsed.meta) return false;
  }
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  return true;
}

/**
 * Single selectable command entry inside `<k-command>` or `<k-command-group>`.
 *
 * @tag k-command-item
 *
 * @slot prefix - Leading icon.
 * @slot - Primary command label.
 * @slot description - Optional secondary caption.
 * @slot suffix - Optional trailing content.
 */
export class KCommandItem extends KernoElement {
  static override styles = commandItemStyles;
  static override template = /* html */ `<div part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span class="text"><span part="label" class="label"><slot></slot></span><span part="description" class="desc"><slot name="description"></slot></span></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span><span part="shortcut" class="shortcut" aria-hidden="true"></span></div>`;

  @prop({ reflect: true }) accessor value = '';
  /** Extra space-separated search keywords matched during filtering. */
  @prop({ reflect: true }) accessor keywords = '';
  /** Visual keyboard shortcut hint (e.g. `"⌘ K"` or `"Ctrl+Shift+P"`). */
  @prop({ reflect: true }) accessor shortcut = '';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ type: Boolean, reflect: true }) accessor active = false;

  #shortcutEl!: HTMLSpanElement;

  /** Normalized text label used by command filtering. */
  get labelText(): string {
    return (this.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  protected override setup(): void {
    this.#shortcutEl = this.renderRoot.querySelector('.shortcut') as HTMLSpanElement;
    if (!this.id) this.id = uniqueId('k-cmd-item');
    this.setAttribute('role', 'option');

    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        const has = slot
          .assignedNodes({ flatten: true })
          .some((n) => n.nodeType === Node.ELEMENT_NODE || Boolean(n.textContent?.trim()));
        slot.parentElement?.classList.toggle('has-content', has);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }

    this.addEventListener('pointerenter', () => {
      if (this.disabled) return;
      emit(this, 'k-command-item-hover', { item: this }, { bubbles: true, composed: true });
    });

    this.addEventListener('mousedown', (e) => {
      // Keep focus in the command search input while clicking an item.
      e.preventDefault();
    });

    this.addEventListener('click', () => {
      if (this.disabled) return;
      emit(this, 'k-command-item-activate', { item: this }, { bubbles: true, composed: true });
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.setAttribute('aria-selected', this.active ? 'true' : 'false');
    this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');

    const keys = this.shortcut
      .split(/[\s+]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    this.#shortcutEl.innerHTML = keys.map((k) => `<kbd>${this.#escapeHtml(k)}</kbd>`).join('');
  }

  #escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

/**
 * Named section grouping `<k-command-item>` entries; automatically hides when
 * every child item is filtered out.
 *
 * @tag k-command-group
 */
export class KCommandGroup extends KernoElement {
  static override styles = commandGroupStyles;
  static override template = /* html */ `<div role="group"><div part="heading" class="heading"></div><slot></slot></div>`;

  @prop({ reflect: true }) accessor heading = '';

  #headingEl!: HTMLDivElement;

  protected override setup(): void {
    this.#headingEl = this.renderRoot.querySelector('.heading') as HTMLDivElement;
  }

  protected override update(_changed: PropertyValues): void {
    this.#headingEl.textContent = this.heading;
    if (this.heading) {
      this.setAttribute('aria-label', this.heading);
    } else {
      this.removeAttribute('aria-label');
    }
  }
}

/**
 * Keyboard-first Command Palette (`Cmd/Ctrl + K`) with fuzzy filtering,
 * auto-hiding groups, Top-Layer modal presentation, optional Acrylic surface,
 * and inline embedding mode.
 *
 * @tag k-command
 *
 * @slot - `<k-command-group>` and `<k-command-item>` elements.
 *
 * @csspart backdrop - Modal backdrop (hidden when `inline`).
 * @csspart panel - Command palette surface (`role="dialog"` in modal mode).
 * @csspart input - Search `<input role="combobox">`.
 * @csspart list - Scrollable listbox container.
 * @csspart empty - Empty search results message.
 * @csspart footer - Keyboard hint footer.
 *
 * @fires k-command-select - Fired when a command item is selected (`{ value, item }`).
 * @fires k-open - Fired when the modal palette opens.
 * @fires k-close - Fired when the modal palette closes.
 */
export class KCommand extends KernoElement {
  static override styles = commandStyles;
  static override template = /* html */ `<div class="overlay"><div part="backdrop" class="backdrop" aria-hidden="true"></div><div part="panel" class="panel" tabindex="-1"><div class="search-row"><span class="search-icon" aria-hidden="true"></span><input part="input" class="search-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" autocomplete="off" spellcheck="false" /><span class="esc-hint" aria-hidden="true">Esc</span></div><div part="list" class="list" role="listbox"><slot></slot><div part="empty" class="empty" hidden></div></div><div part="footer" class="footer"><span class="footer-keys"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Run</span></span><span class="footer-count"></span></div></div></div>`;

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  /** Embeds the command palette directly in document flow without Top-Layer modal chrome. */
  @prop({ type: Boolean, reflect: true }) accessor inline = false;
  @prop({ reflect: true }) accessor placeholder = 'Type a command or search...';
  @prop({ attribute: 'empty-text', reflect: true }) accessor emptyText = 'No matching commands.';
  @prop({ reflect: true }) accessor value = '';
  /** Optional global keyboard shortcut that toggles the palette (e.g. `"mod+k"`). */
  @prop({ reflect: true }) accessor shortcut = '';
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, attribute: 'close-on-select', reflect: true })
  accessor closeOnSelect = true;

  /** Custom filter/scorer function; defaults to built-in fuzzy subsequence matcher. */
  filter: CommandFilter = defaultCommandFilter;

  readonly #overlayId = uniqueId('k-command');
  readonly #listId = uniqueId('k-command-list');

  #overlay!: HTMLDivElement;
  #backdrop!: HTMLDivElement;
  #panel!: HTMLDivElement;
  #searchIcon!: HTMLSpanElement;
  #input!: HTMLInputElement;
  #list!: HTMLDivElement;
  #emptyEl!: HTMLDivElement;
  #countEl!: HTMLSpanElement;
  #slot!: HTMLSlotElement;

  #wasOpen = false;
  #exitAnims: MotionHandle[] = [];
  #activeItem: KCommandItem | null = null;
  #parsedShortcut: ParsedShortcut | null = null;
  #shortcutListening = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncGlobalShortcut();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#removeGlobalShortcut();
    this.#cancelExit();
    exitTopLayer(this.#overlay);
    overlayManager.remove(this.#overlayId, false);
    this.#wasOpen = false;
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  toggle(): void {
    this.open = !this.open;
  }

  protected override setup(): void {
    this.#overlay = this.renderRoot.querySelector('.overlay') as HTMLDivElement;
    this.#backdrop = this.renderRoot.querySelector('.backdrop') as HTMLDivElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#searchIcon = this.renderRoot.querySelector('.search-icon') as HTMLSpanElement;
    this.#input = this.renderRoot.querySelector('.search-input') as HTMLInputElement;
    this.#list = this.renderRoot.querySelector('.list') as HTMLDivElement;
    this.#emptyEl = this.renderRoot.querySelector('.empty') as HTMLDivElement;
    this.#countEl = this.renderRoot.querySelector('.footer-count') as HTMLSpanElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#list.id = this.#listId;
    this.#input.setAttribute('aria-controls', this.#listId);
    this.#searchIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('search') ?? ''}</svg>`;

    this.#input.addEventListener('input', () => {
      this.value = this.#input.value;
      this.#applyFilter();
    });

    this.#input.addEventListener('keydown', (e) => this.#onInputKeyDown(e));

    this.#slot.addEventListener('slotchange', () => this.#applyFilter());

    this.addEventListener('k-command-item-hover', (event: Event) => {
      const detail = (event as CustomEvent<{ item: KCommandItem }>).detail;
      if (detail?.item) {
        event.stopPropagation();
        this.#setActiveItem(detail.item, false);
      }
    });

    this.addEventListener('k-command-item-activate', (event: Event) => {
      const detail = (event as CustomEvent<{ item: KCommandItem }>).detail;
      if (detail?.item) {
        event.stopPropagation();
        this.#selectItem(detail.item);
      }
    });
  }

  protected override update(changed: PropertyValues): void {
    this.#input.placeholder = this.placeholder;
    if (this.#input.value !== this.value) {
      this.#input.value = this.value;
    }
    this.#emptyEl.textContent = this.emptyText;

    if (changed.has('shortcut') || changed.has('inline')) {
      this.#syncGlobalShortcut();
    }

    if (this.inline) {
      this.#panel.removeAttribute('role');
      this.#panel.removeAttribute('aria-modal');
      if (this.#wasOpen) {
        this.#wasOpen = false;
        overlayManager.remove(this.#overlayId, false);
        exitTopLayer(this.#overlay);
      }
      this.#applyFilter();
      return;
    }

    this.#panel.setAttribute('role', 'dialog');
    this.#panel.setAttribute('aria-modal', 'true');
    this.#panel.setAttribute('aria-label', this.placeholder);

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#cancelExit();
      enterTopLayer(this.#overlay);
      overlayManager.add({
        id: this.#overlayId,
        content: this.#panel,
        trapFocus: true,
        lockScroll: true,
        restoreFocus: true,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        onRequestClose: () => {
          this.open = false;
        },
      });
      this.#applyFilter();
      fadeIn(this.#backdrop);
      scaleIn(this.#panel);
      queueMicrotask(() => {
        if (this.open && this.isConnected) {
          this.#input.focus();
          this.#input.select();
        }
      });
      emit(this, 'k-open');
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      overlayManager.remove(this.#overlayId);
      emit(this, 'k-close');
      this.#playExit();
    } else if (changed.has('value')) {
      this.#applyFilter();
    }
  }

  #allItems(): KCommandItem[] {
    return [...this.querySelectorAll<KCommandItem>('k-command-item')];
  }

  #visibleEnabledItems(): KCommandItem[] {
    return this.#allItems().filter((item) => !item.hidden && !item.disabled);
  }

  #applyFilter(): void {
    const query = this.value;
    const items = this.#allItems();
    let visibleCount = 0;

    for (const item of items) {
      const result = this.filter(item, query);
      const matched = typeof result === 'number' ? result > 0 : Boolean(result);
      item.hidden = !matched;
      if (matched) visibleCount++;
    }

    const groups = this.querySelectorAll<KCommandGroup>('k-command-group');
    for (const group of groups) {
      const hasVisible = [...group.querySelectorAll<KCommandItem>('k-command-item')].some(
        (item) => !item.hidden,
      );
      group.hidden = !hasVisible;
    }

    this.#emptyEl.hidden = visibleCount > 0;
    this.#countEl.textContent = `${visibleCount} ${visibleCount === 1 ? 'command' : 'commands'}`;

    const enabled = this.#visibleEnabledItems();
    if (this.#activeItem && enabled.includes(this.#activeItem)) {
      this.#setActiveItem(this.#activeItem, false);
    } else {
      this.#setActiveItem(enabled[0] ?? null, false);
    }
  }

  #setActiveItem(item: KCommandItem | null, scrollIntoView: boolean): void {
    for (const candidate of this.#allItems()) {
      candidate.active = candidate === item;
    }
    this.#activeItem = item;
    if (item?.id) {
      this.#input.setAttribute('aria-activedescendant', item.id);
    } else {
      this.#input.removeAttribute('aria-activedescendant');
    }
    if (scrollIntoView && item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }

  #selectItem(item: KCommandItem): void {
    if (item.disabled) return;
    emit<CommandSelectDetail>(this, 'k-command-select', {
      value: item.value || item.labelText,
      item,
    });
    if (this.closeOnSelect && !this.inline) {
      this.open = false;
    }
  }

  #onInputKeyDown(event: KeyboardEvent): void {
    const enabled = this.#visibleEnabledItems();
    if (enabled.length === 0) return;

    const currentIdx = this.#activeItem ? enabled.indexOf(this.#activeItem) : -1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = enabled[(currentIdx + 1) % enabled.length]!;
      this.#setActiveItem(next, true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = enabled[(currentIdx - 1 + enabled.length) % enabled.length]!;
      this.#setActiveItem(prev, true);
    } else if (event.key === 'Home' && this.#input.value === '') {
      event.preventDefault();
      this.#setActiveItem(enabled[0]!, true);
    } else if (event.key === 'End' && this.#input.value === '') {
      event.preventDefault();
      this.#setActiveItem(enabled[enabled.length - 1]!, true);
    } else if (event.key === 'Enter') {
      if (this.#activeItem) {
        event.preventDefault();
        this.#selectItem(this.#activeItem);
      }
    }
  }

  #playExit(): void {
    this.#overlay.classList.add('closing');
    const anims: MotionHandle[] = [
      scaleOut(this.#panel, { duration: 'fast' }),
      fadeOut(this.#backdrop, { duration: 'fast' }),
    ];
    this.#exitAnims = anims;
    void Promise.all(anims.map((a) => a.finished)).then(() => {
      if (this.open) return;
      this.#overlay.classList.remove('closing');
      exitTopLayer(this.#overlay);
      this.#exitAnims = [];
      this.value = '';
    });
  }

  #cancelExit(): void {
    for (const anim of this.#exitAnims) anim.cancel();
    this.#exitAnims = [];
    this.#overlay?.classList.remove('closing');
  }

  #syncGlobalShortcut(): void {
    if (isServer) return;
    this.#parsedShortcut = !this.inline && this.shortcut ? parseShortcut(this.shortcut) : null;
    if (this.#parsedShortcut && this.isConnected && !this.#shortcutListening) {
      this.#shortcutListening = true;
      document.addEventListener('keydown', this.#onGlobalKeyDown);
    } else if ((!this.#parsedShortcut || !this.isConnected) && this.#shortcutListening) {
      this.#removeGlobalShortcut();
    }
  }

  #removeGlobalShortcut(): void {
    if (!this.#shortcutListening) return;
    this.#shortcutListening = false;
    document.removeEventListener('keydown', this.#onGlobalKeyDown);
  }

  #onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !this.#parsedShortcut) return;
    if (!matchesShortcut(event, this.#parsedShortcut)) return;
    event.preventDefault();
    this.toggle();
  };
}
