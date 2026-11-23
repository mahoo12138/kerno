import type { ReactiveController, ReactiveControllerHost } from './element.js';
import { isServer } from './env.js';
import { enMessages, type KernoMessages } from './locales/en.js';

export type { KernoMessages };

/** Name of a message in `KernoMessages`. */
export type MessageKey = keyof KernoMessages;

/** Arguments a message takes: none for plain strings, the formatter's for functions. */
export type MessageArgs<K extends MessageKey> = KernoMessages[K] extends (
  ...args: infer A
) => string
  ? A
  : [];

export interface KernoLocale {
  /** BCP 47 language tag, e.g. `'en'` or `'zh-CN'`. Matched case-insensitively. */
  readonly code: string;
  /** Translations; keys left out fall back to a less specific locale, then to English. */
  readonly messages: Partial<KernoMessages>;
}

/** The built-in English locale (always available, used as the final fallback). */
export const en: KernoLocale = { code: 'en', messages: enMessages };

/** Language used when neither the element nor any ancestor declares one. */
const FALLBACK_LANG = 'en';

type MessageTable = Partial<Record<MessageKey, unknown>>;

interface Registry {
  /** Registered messages keyed by lowercase language tag. */
  readonly locales: Map<string, MessageTable>;
  /** Connected hosts, refreshed when locales or `lang` attributes change. */
  readonly controllers: Set<{ invalidate(): void }>;
  observer: MutationObserver | null;
  /** Bumped on every `registerLocale()` call so every copy's `chainCache` stays fresh. */
  version: number;
}

/**
 * Shared through `globalThis` (versioned by protocol), so a locale registered
 * once applies to every copy of `@kerno/core` on the page.
 */
const REGISTRY_KEY = Symbol.for('kerno.i18n.v1');

function registry(): Registry {
  const slot = globalThis as unknown as Record<symbol, Registry | undefined>;
  const existing = slot[REGISTRY_KEY];
  if (existing) {
    existing.version ??= 0;
    return existing;
  }
  const created: Registry = {
    locales: new Map(),
    controllers: new Set(),
    observer: null,
    version: 0,
  };
  slot[REGISTRY_KEY] = created;
  return created;
}

/** Lookup chains per language tag; cleared whenever `registry().version` changes. */
const chainCache = new Map<string, MessageTable[]>();
let cacheVersion = -1;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/_/g, '-');
}

/**
 * Registers locales, or adds to / overrides an already registered one, and
 * refreshes every connected Kerno element.
 *
 * @example
 * registerLocale(zhCN);
 * // Override single strings, including English ones:
 * registerLocale({ code: 'en', messages: { close: 'Dismiss' } });
 */
export function registerLocale(...locales: KernoLocale[]): void {
  const reg = registry();
  for (const locale of locales) {
    const code = normalizeTag(locale.code).toLowerCase();
    reg.locales.set(code, { ...reg.locales.get(code), ...locale.messages });
  }
  reg.version++;
  chainCache.clear();
  cacheVersion = reg.version;
  for (const controller of reg.controllers) controller.invalidate();
}

/**
 * Language of `el`: the nearest `lang` attribute on it or an ancestor
 * (crossing shadow roots), else `'en'`. Set `<html lang="…">` to localize a
 * whole page.
 */
export function resolveLang(el: Element): string {
  let current: Element | null = el;
  while (current) {
    const match: Element | null = current.closest('[lang]:not([lang=""])');
    if (match) {
      const value = match.getAttribute('lang')?.trim();
      if (value) return value;
      current = match.parentElement;
      continue;
    }
    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }
  return FALLBACK_LANG;
}

/** `zh-Hant-TW` → registered `zh-hant-tw`, `zh-hant`, `zh`; then any `zh-*`; then English. */
function chainFor(lang: string): MessageTable[] {
  const reg = registry();
  if (cacheVersion !== reg.version) {
    chainCache.clear();
    cacheVersion = reg.version;
  }
  const key = normalizeTag(lang).toLowerCase();
  let chain = chainCache.get(key);
  if (chain) return chain;
  chain = [];
  const { locales } = reg;
  const parts = key.split('-');
  for (let i = parts.length; i > 0; i--) {
    const table = locales.get(parts.slice(0, i).join('-'));
    if (table) chain.push(table);
  }
  if (parts[0] && parts[0] !== FALLBACK_LANG) {
    for (const [code, table] of locales) {
      if (code.split('-')[0] === parts[0] && !chain.includes(table)) {
        chain.push(table);
        break;
      }
    }
  }
  const english = locales.get(FALLBACK_LANG);
  if (english && !chain.includes(english)) chain.push(english);
  chain.push(enMessages);
  chainCache.set(key, chain);
  return chain;
}

/** Looks up and formats a message for a language tag. */
export function translate<K extends MessageKey>(
  lang: string,
  key: K,
  ...args: MessageArgs<K>
): string {
  for (const table of chainFor(lang)) {
    const value = table[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'function') return (value as (...a: unknown[]) => string)(...args);
  }
  return String(key);
}

const formatters = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function formatter<T extends Intl.DateTimeFormat | Intl.NumberFormat>(
  kind: 'date' | 'number',
  lang: string,
  options: object | undefined,
  create: (locale: string) => T,
): T {
  const tag = normalizeTag(lang) || FALLBACK_LANG;
  const key = `${kind}|${tag}|${options ? JSON.stringify(options) : ''}`;
  let cached = formatters.get(key) as T | undefined;
  if (!cached) {
    try {
      cached = create(tag);
    } catch {
      // Malformed `lang` value: format in English rather than throwing.
      cached = create(FALLBACK_LANG);
    }
    formatters.set(key, cached);
  }
  return cached;
}

/** `[selector, text, attribute]`: `attribute` defaults to `aria-label`; `'text'` sets text. */
export type LabelEntry = readonly [selector: string, text: string, attribute?: string];

/**
 * Applies localized labels to nodes inside a shadow root (missing nodes are
 * skipped, unchanged values are not rewritten). Call it from `update()` so the
 * labels follow language changes.
 *
 * @example
 * setLabels(this.renderRoot, [
 *   ['.close-btn', this.#localize.term('close')],
 *   ['.today-btn', this.#localize.term('today'), 'text'],
 * ]);
 */
export function setLabels(root: ParentNode, entries: readonly LabelEntry[]): void {
  for (const [selector, text, attribute = 'aria-label'] of entries) {
    const el = root.querySelector(selector);
    if (!el) continue;
    if (attribute === 'text') {
      if (el.textContent !== text) el.textContent = text;
    } else if (el.getAttribute(attribute) !== text) {
      el.setAttribute(attribute, text);
    }
  }
}

function observeLangAttributes(reg: Registry): void {
  if (reg.observer || isServer || typeof MutationObserver !== 'function') return;
  reg.observer = new MutationObserver(() => {
    for (const controller of reg.controllers) controller.invalidate();
  });
  // Cheap: only `lang` attribute changes are reported. Shadow trees are not observed;
  // their hosts re-resolve their language on every update.
  reg.observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
    subtree: true,
  });
}

/**
 * Gives a component localized messages and `Intl` formatting for its language.
 *
 * The host re-renders when a locale is registered or a `lang` attribute
 * changes, so put localized text in `update()` (not in the static template).
 *
 * @example
 * readonly #localize = new LocalizeController(this);
 * protected override update(): void {
 *   this.#closeBtn.ariaLabel = this.#localize.term('close');
 * }
 */
export class LocalizeController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  #lang: string | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.host = host;
    host.addController(this);
  }

  /** The host's resolved language tag. */
  get lang(): string {
    return (this.#lang ??= isServer ? FALLBACK_LANG : resolveLang(this.host));
  }

  hostConnected(): void {
    this.#lang = null;
    const reg = registry();
    reg.controllers.add(this);
    observeLangAttributes(reg);
  }

  hostDisconnected(): void {
    const reg = registry();
    reg.controllers.delete(this);
    if (reg.controllers.size === 0 && reg.observer) {
      reg.observer.disconnect();
      reg.observer = null;
    }
  }

  /** Re-resolve the language on every update, so nested `lang` changes are picked up. */
  hostUpdate(): void {
    this.#lang = null;
  }

  /** Drops the cached language and re-renders the host. */
  invalidate(): void {
    this.#lang = null;
    this.host.requestUpdate();
  }

  /** The message `key` in the host's language. */
  term<K extends MessageKey>(key: K, ...args: MessageArgs<K>): string {
    return translate(this.lang, key, ...args);
  }

  /** Formats a date with `Intl.DateTimeFormat` in the host's language. */
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this.#dateFormat(options).format(value);
  }

  /** Splits a formatted date into parts with `Intl.DateTimeFormat#formatToParts`. */
  dateParts(value: Date | number, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatPart[] {
    return this.#dateFormat(options).formatToParts(value);
  }

  /** Formats a number with `Intl.NumberFormat` in the host's language. */
  number(value: number, options?: Intl.NumberFormatOptions): string {
    const create = (locale: string): Intl.NumberFormat => new Intl.NumberFormat(locale, options);
    return formatter('number', this.lang, options, create).format(value);
  }

  #dateFormat(options: Intl.DateTimeFormatOptions | undefined): Intl.DateTimeFormat {
    const create = (locale: string): Intl.DateTimeFormat =>
      new Intl.DateTimeFormat(locale, options);
    return formatter('date', this.lang, options, create);
  }
}
