/**
 * Primitive layer — raw palette values.
 *
 * Primitives are context-free building blocks. Components must never consume
 * them directly; they only flow into the semantic layer (see `types.ts`), which
 * is what themes swap.
 */
export const palette = {
  neutral: {
    '0': '#ffffff',
    '50': '#fafafa',
    '100': '#f4f4f5',
    '150': '#ececee',
    '200': '#e2e2e5',
    '300': '#c9c9ce',
    '400': '#a1a1a8',
    '500': '#7c7c84',
    '600': '#5d5d64',
    '700': '#404046',
    '800': '#2c2c31',
    '850': '#232327',
    '900': '#1c1c1f',
    '950': '#131315',
    '1000': '#000000',
  },
  azure: {
    '50': '#eef4ff',
    '100': '#dbe7ff',
    '200': '#b8cfff',
    '300': '#8db1ff',
    '400': '#5f8cff',
    '500': '#3d6bf5',
    '600': '#2a52d9',
    '700': '#2141ad',
    '800': '#1d3687',
    '900': '#1b2f6b',
    '950': '#121d40',
  },
  red: {
    '50': '#fff1f1',
    '300': '#ff9b9b',
    '400': '#ff6b6b',
    '500': '#e5484d',
    '600': '#c9353b',
    '700': '#a2282d',
    '950': '#3b1214',
  },
  green: {
    '50': '#edfbf3',
    '300': '#7ee2a8',
    '400': '#4cc38a',
    '500': '#2ba16b',
    '600': '#1f8457',
    '700': '#186645',
    '950': '#0c2a1d',
  },
  amber: {
    '50': '#fff8e6',
    '300': '#ffd166',
    '400': '#ffbe3d',
    '500': '#f0a000',
    '600': '#c78100',
    '700': '#9a6300',
    '950': '#332100',
  },
} as const;

export type Palette = typeof palette;
