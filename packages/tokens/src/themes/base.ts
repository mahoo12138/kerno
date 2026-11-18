import type { KernoTokens } from '../types.js';

/** Tokens that do not depend on the color scheme. */
export type SchemeIndependentTokens = Omit<KernoTokens, 'color' | 'elevation' | 'surface'>;

export const baseTokens: SchemeIndependentTokens = {
  font: {
    family: {
      sans: "system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      mono: "ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
    },
    size: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
  },
  spacing: {
    none: '0',
    '2xs': '2px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },
  radius: { none: '0', sm: '2px', md: '4px', lg: '8px', xl: '12px', full: '9999px' },
  motion: {
    duration: { instant: '0ms', fast: '83ms', normal: '167ms', slow: '250ms', slower: '333ms' },
    easing: {
      standard: 'cubic-bezier(0.33, 0, 0.67, 1)',
      decelerate: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
      accelerate: 'cubic-bezier(0.9, 0.1, 1, 0.2)',
      emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  },
  zIndex: {
    base: '0',
    dropdown: '1000',
    sticky: '1100',
    overlay: '1200',
    modal: '1300',
    popover: '1400',
    toast: '1500',
    tooltip: '1600',
  },
  control: {
    height: { sm: '24px', md: '32px', lg: '40px' },
    paddingX: { sm: '8px', md: '12px', lg: '16px' },
    borderWidth: '1px',
  },
  focus: { ringWidth: '2px', ringOffset: '2px' },
};
