import { isServer } from './env.js';

const supportsAdoptedStyleSheets =
  !isServer &&
  'adoptedStyleSheets' in Document.prototype &&
  'replaceSync' in CSSStyleSheet.prototype;

/**
 * A parsed-once stylesheet. Shared by every instance of a component through
 * `adoptedStyleSheets`, so each style rule exists once per document.
 */
export class KernoCSS {
  readonly cssText: string;
  #sheet: CSSStyleSheet | undefined;

  constructor(cssText: string) {
    this.cssText = cssText;
  }

  /** Lazily constructed sheet; `undefined` where constructable sheets are unsupported. */
  get styleSheet(): CSSStyleSheet | undefined {
    if (!supportsAdoptedStyleSheets) return undefined;
    if (!this.#sheet) {
      this.#sheet = new CSSStyleSheet();
      this.#sheet.replaceSync(this.cssText);
    }
    return this.#sheet;
  }

  toString(): string {
    return this.cssText;
  }
}

/** Trusted, developer-authored values only (tokens, other `css` blocks, numbers). */
export type CSSValue = KernoCSS | string | number;

/**
 * Tagged template for component styles.
 *
 * Interpolations are inserted verbatim — use them for `token()` references and
 * composition, never for user input.
 */
export function css(strings: TemplateStringsArray, ...values: CSSValue[]): KernoCSS {
  let text = strings[0] ?? '';
  values.forEach((value, i) => {
    text += String(value) + (strings[i + 1] ?? '');
  });
  return new KernoCSS(text);
}

/** Wraps an arbitrary string as CSS. The caller is responsible for its safety. */
export const unsafeCSS = (cssText: string): KernoCSS => new KernoCSS(cssText);

export type CSSInput = KernoCSS | readonly CSSInput[];

export function flattenStyles(styles: CSSInput | undefined): KernoCSS[] {
  if (!styles) return [];
  return Array.isArray(styles)
    ? (styles as CSSInput[]).flatMap(flattenStyles)
    : [styles as KernoCSS];
}

/** Applies styles to a shadow root, falling back to `<style>` elements. */
export function adoptStyles(root: ShadowRoot, styles: CSSInput | undefined): void {
  const list = flattenStyles(styles);
  if (list.length === 0) return;
  if (supportsAdoptedStyleSheets) {
    root.adoptedStyleSheets = [
      ...root.adoptedStyleSheets,
      ...list.map((s) => s.styleSheet as CSSStyleSheet),
    ];
    return;
  }
  for (const s of list) {
    const style = document.createElement('style');
    style.textContent = s.cssText;
    root.append(style);
  }
}
