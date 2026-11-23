import { afterEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  createTheme,
  darkTheme,
  diffTokens,
  flattenTokens,
  generateTokensCss,
  lightTheme,
  themeToCss,
  token,
  tokenName,
} from './index.js';

describe('token references', () => {
  it('maps paths to kebab-cased custom properties', () => {
    expect(tokenName('color.accent.default')).toBe('--k-color-accent-default');
    expect(tokenName('color.accent.borderHover')).toBe('--k-color-accent-border-hover');
    expect(tokenName('color.status.info.solid')).toBe('--k-color-status-info-solid');
    expect(tokenName('font.lineHeight.normal')).toBe('--k-font-line-height-normal');
    expect(tokenName('elevation.2')).toBe('--k-elevation-2');
    expect(token('radius.md')).toBe('var(--k-radius-md)');
    expect(token('radius.md', '4px')).toBe('var(--k-radius-md, 4px)');
  });

  it('flattens every leaf token', () => {
    const vars = flattenTokens(lightTheme.tokens);
    expect(vars['--k-color-accent-default']).toBe(lightTheme.tokens.color.accent.default);
    expect(vars['--k-font-size-2xl']).toBe('1.5rem');
    expect(Object.values(vars).every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
  });

  it('light and dark only differ in scheme-dependent groups', () => {
    const groups = new Set(
      Object.keys(diffTokens(lightTheme.tokens, darkTheme.tokens)).map((k) => k.split('-')[3]),
    );
    expect([...groups].sort()).toEqual(['color', 'elevation', 'surface']);
  });
});

describe('createTheme', () => {
  it('deep-merges overrides without mutating the base', () => {
    const ocean = createTheme({
      name: 'ocean',
      base: darkTheme,
      tokens: { color: { accent: { default: '#00a3a3' } }, radius: { md: '8px' } },
    });
    expect(ocean.colorScheme).toBe('dark');
    expect(ocean.tokens.color.accent.default).toBe('#00a3a3');
    expect(ocean.tokens.color.accent.hover).toBe(darkTheme.tokens.color.accent.hover);
    expect(ocean.tokens.radius.md).toBe('8px');
    expect(darkTheme.tokens.radius.md).toBe('4px');
  });

  it('rejects names that are not CSS-safe', () => {
    expect(() => createTheme({ name: 'bad name"' })).toThrow(/Invalid theme name/);
  });

  it('serializes to a scoped rule', () => {
    const css = themeToCss(createTheme({ name: 'brand' }));
    expect(css).toMatch(/^\[data-k-theme="brand"\] \{/);
    expect(css).toContain('color-scheme: light;');
  });
});

describe('applyTheme', () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  const accentOf = (el: Element): string =>
    getComputedStyle(el).getPropertyValue('--k-color-accent-default').trim();

  it('scopes a custom theme to a subtree and supports nesting', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.append(inner);
    document.body.append(outer);

    cleanups.push(
      applyTheme(
        createTheme({ name: 'outer', tokens: { color: { accent: { default: '#111111' } } } }),
        outer,
      ),
    );
    cleanups.push(
      applyTheme(
        createTheme({ name: 'inner', tokens: { color: { accent: { default: '#222222' } } } }),
        inner,
      ),
    );

    expect(outer.getAttribute('data-k-theme')).toBe('outer');
    expect(accentOf(outer)).toBe('#111111');
    expect(accentOf(inner)).toBe('#222222');
  });

  it('works inside shadow roots', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    root.append(target);
    document.body.append(host);

    applyTheme(
      createTheme({ name: 'shadowy', tokens: { color: { accent: { default: '#333333' } } } }),
      target,
    );
    expect(accentOf(target)).toBe('#333333');
  });

  it('restores the previous value on dispose', () => {
    const el = document.createElement('div');
    el.setAttribute('data-k-theme', 'dark');
    const dispose = applyTheme('light', el);
    expect(el.getAttribute('data-k-theme')).toBe('light');
    dispose();
    expect(el.getAttribute('data-k-theme')).toBe('dark');
  });
});

describe('tokens.css', () => {
  it('switches built-in themes through data-k-theme', () => {
    const style = document.createElement('style');
    style.textContent = generateTokensCss();
    document.head.append(style);

    const dark = document.createElement('div');
    dark.setAttribute('data-k-theme', 'dark');
    const light = document.createElement('div');
    light.setAttribute('data-k-theme', 'light');
    dark.append(light);
    document.body.append(dark);

    const accent = (el: Element) =>
      getComputedStyle(el).getPropertyValue('--k-color-accent-default').trim();
    expect(accent(dark)).toBe(darkTheme.tokens.color.accent.default);
    expect(accent(light)).toBe(lightTheme.tokens.color.accent.default);
    expect(getComputedStyle(dark).colorScheme).toBe('dark');

    // Ensure dark media query only targets un-themed :root, never custom themes like data-k-theme="ocean"
    expect(style.textContent).toContain(':root:not([data-k-theme])');
    expect(style.textContent).not.toContain(':root:not([data-k-theme="light"])');

    style.remove();
  });
});

/** WCAG 2.x contrast ratio of `fg` (alpha-composited onto `bg`) against `bg`. */
function contrast(fg: string, bg: string): number {
  const parse = (c: string): number[] => {
    if (c.startsWith('#')) {
      const h = c.slice(1);
      return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).concat(1);
    }
    const parts = c
      .slice(c.indexOf('(') + 1, -1)
      .split(',')
      .map(Number);
    return parts.length === 3 ? parts.concat(1) : parts;
  };
  const [fr, fgG, fb, fa] = parse(fg) as [number, number, number, number];
  const [br, bgG, bb] = parse(bg) as [number, number, number, number];
  const mix = [fr * fa + br * (1 - fa), fgG * fa + bgG * (1 - fa), fb * fa + bb * (1 - fa)];
  const lum = (rgb: number[]): number => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(mix), lum([br, bgG, bb])].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrast', () => {
  for (const theme of [lightTheme, darkTheme]) {
    const { color } = theme.tokens;
    const layers = [color.bg.canvas, color.bg.layer, color.bg.layerAlt];

    it(`keeps ${theme.name} text at WCAG AA (4.5:1) on every layer`, () => {
      const text = {
        'fg.default': color.fg.default,
        'fg.secondary': color.fg.secondary,
        'fg.tertiary': color.fg.tertiary,
        'accent.text': color.accent.text,
        ...Object.fromEntries(
          Object.entries(color.status).map(([name, s]) => [`status.${name}.fg`, s.fg]),
        ),
      };
      for (const [name, value] of Object.entries(text)) {
        for (const bg of layers) {
          expect(contrast(value, bg), `${name} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`keeps ${theme.name} status pairs at WCAG AA`, () => {
      for (const [name, s] of Object.entries(color.status)) {
        expect(contrast(s.fg, s.bg), `${name}.fg on ${name}.bg`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(s.onSolid, s.solid), `${name}.onSolid`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(color.accent.fg, color.accent.default)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('shape and motion tokens', () => {
  it('emits shape tokens and reduced-motion loop overrides', () => {
    const css = generateTokensCss();
    expect(css).toContain('--k-shape-radius-control: 0px;');
    expect(css).toContain('--k-shape-radius-parametric: 6px;');
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('--k-motion-duration-fast: 0ms !important;');
    expect(reduced).toContain('--k-motion-loop-pulse: 0ms !important;');
    expect(reduced).toContain('--k-motion-loop-spin: 2200ms !important;');
    expect(reduced).not.toContain('--k-motion-loop-indeterminate');
  });
});
