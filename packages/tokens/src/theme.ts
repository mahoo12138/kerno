import { THEME_ATTRIBUTE, declarations, flattenTokens } from './css-vars.js';
import { lightTheme } from './themes/light.js';
import type { ColorScheme, DeepPartial, KernoTokens, Theme } from './types.js';

const THEME_NAME = /^[a-zA-Z][\w-]*$/;

export interface CreateThemeOptions {
  /** Theme name, used as the `data-k-theme` value. */
  name: string;
  /** Theme to inherit from. Defaults to `lightTheme`. */
  base?: Theme;
  /** Defaults to the base theme's scheme. */
  colorScheme?: ColorScheme;
  /** Token overrides, deep-merged onto the base theme. */
  tokens?: DeepPartial<KernoTokens>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

function deepMerge<T extends object>(base: T, overrides: DeepPartial<T> | undefined): T {
  if (!overrides) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out as T;
}

/**
 * Derives a custom theme from a base theme.
 *
 * @example
 * const ocean = createTheme({
 *   name: 'ocean',
 *   base: darkTheme,
 *   tokens: { color: { accent: { default: '#00a3a3' } }, radius: { md: '8px' } },
 * });
 */
export function createTheme({
  name,
  base = lightTheme,
  colorScheme,
  tokens,
}: CreateThemeOptions): Theme {
  if (!THEME_NAME.test(name)) {
    throw new Error(`[kerno] Invalid theme name "${name}". Use letters, digits, "-" or "_".`);
  }
  return {
    name,
    colorScheme: colorScheme ?? base.colorScheme,
    tokens: deepMerge(base.tokens, tokens),
  };
}

/** Selector a theme is scoped to. */
export const themeSelector = (name: string): string => `[${THEME_ATTRIBUTE}="${name}"]`;

/**
 * Serializes a theme to a self-contained CSS rule. Works on the server, so it can
 * be inlined during SSR.
 */
export function themeToCss(theme: Theme, selector: string = themeSelector(theme.name)): string {
  return `${selector} {\n  color-scheme: ${theme.colorScheme};\n${declarations(flattenTokens(theme.tokens))}\n}\n`;
}

/** Built-in theme names handled by the static `tokens.css` stylesheet. */
export type BuiltInThemeName = 'light' | 'dark' | 'auto';

type StyleRoot = Document | ShadowRoot;

const injected = new WeakMap<StyleRoot, Map<string, CSSStyleSheet>>();

function styleRootOf(el: Element): StyleRoot {
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : el.ownerDocument;
}

/**
 * Applies a theme to `target` (defaults to `<html>`) by setting `data-k-theme`.
 *
 * - A built-in name (`'light' | 'dark' | 'auto'`) only sets the attribute and
 *   relies on `@kerno/tokens/tokens.css` being loaded.
 * - A `Theme` object is also serialized into a constructable stylesheet adopted
 *   by the target's document or shadow root (once per theme name per root).
 *
 * Themes nest: any descendant may apply a different theme.
 *
 * @returns A function restoring the previous `data-k-theme` value.
 */
export function applyTheme(theme: Theme | BuiltInThemeName, target?: Element): () => void {
  if (typeof document === 'undefined') return () => {};
  const el = target ?? document.documentElement;
  const previous = el.getAttribute(THEME_ATTRIBUTE);

  if (typeof theme !== 'string') {
    const root = styleRootOf(el);
    let sheets = injected.get(root);
    if (!sheets) injected.set(root, (sheets = new Map()));
    let sheet = sheets.get(theme.name);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheets.set(theme.name, sheet);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
    sheet.replaceSync(themeToCss(theme));
  }

  el.setAttribute(THEME_ATTRIBUTE, typeof theme === 'string' ? theme : theme.name);

  return () => {
    if (previous === null) el.removeAttribute(THEME_ATTRIBUTE);
    else el.setAttribute(THEME_ATTRIBUTE, previous);
  };
}
