import type { KernoTokens, TokenPath } from './types.js';

/** Global prefix for every Kerno custom property and attribute. */
export const PREFIX = 'k';

/** Attribute used to scope a theme to a subtree. */
export const THEME_ATTRIBUTE = `data-${PREFIX}-theme`;

export type CSSVarName = `--${typeof PREFIX}-${string}`;

const kebab = (segment: string): string => segment.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * Custom property name for a token path.
 *
 * @example tokenName('color.accent.default') // '--k-color-accent-default'
 */
export function tokenName(path: TokenPath): CSSVarName {
  return `--${PREFIX}-${path.split('.').map(kebab).join('-')}`;
}

/**
 * Type-safe `var()` reference for a token path. Pure string transform — no token
 * values are pulled into the bundle.
 *
 * @example token('radius.md') // 'var(--k-radius-md)'
 */
export function token(path: TokenPath, fallback?: string): string {
  return fallback === undefined
    ? `var(${tokenName(path)})`
    : `var(${tokenName(path)}, ${fallback})`;
}

/** Flattens a nested token object into `{ '--k-…': value }` pairs. */
export function flattenTokens(
  tokens: object,
  prefix: string = `--${PREFIX}`,
): Record<CSSVarName, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const name = `${prefix}-${kebab(key)}`;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flattenTokens(value as object, name));
    } else {
      out[name] = String(value);
    }
  }
  return out as Record<CSSVarName, string>;
}

/** Returns the entries of `next` whose values differ from `base`. */
export function diffTokens(base: KernoTokens, next: KernoTokens): Record<CSSVarName, string> {
  const a = flattenTokens(base);
  const b = flattenTokens(next);
  const out: Record<CSSVarName, string> = {};
  for (const [key, value] of Object.entries(b) as [CSSVarName, string][]) {
    if (a[key] !== value) out[key] = value;
  }
  return out;
}

export function declarations(vars: Record<string, string>, indent = '  '): string {
  return Object.entries(vars)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join('\n');
}
