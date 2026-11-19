import { palette as p } from '../palette.js';
import type { Theme } from '../types.js';
import { baseTokens } from './base.js';

export const darkTheme: Theme = {
  name: 'dark',
  colorScheme: 'dark',
  tokens: {
    ...baseTokens,
    color: {
      accent: {
        default: p.azure['500'],
        hover: p.azure['400'],
        active: p.azure['600'],
        borderHover: p.azure['200'],
        disabled: 'rgba(61, 107, 245, 0.26)',
        fg: p.neutral['0'],
        fgDisabled: 'rgba(255, 255, 255, 0.45)',
        text: p.azure['300'],
      },
      bg: {
        canvas: p.neutral['900'],
        layer: p.neutral['850'],
        layerAlt: p.neutral['800'],
      },
      fg: {
        default: p.neutral['0'],
        secondary: 'rgba(255, 255, 255, 0.79)',
        tertiary: 'rgba(255, 255, 255, 0.54)',
        disabled: 'rgba(255, 255, 255, 0.45)',
      },
      control: {
        default: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.2)',
        active: 'rgba(255, 255, 255, 0.4)',
        disabled: 'rgba(255, 255, 255, 0.1)',
      },
      subtle: {
        default: 'transparent',
        hover: 'rgba(255, 255, 255, 0.06)',
        active: 'rgba(255, 255, 255, 0.04)',
        disabled: 'transparent',
      },
      stroke: {
        default: 'rgba(255, 255, 255, 0.08)',
        subtle: 'rgba(255, 255, 255, 0.05)',
        strong: 'rgba(255, 255, 255, 0.54)',
        control: 'rgba(255, 255, 255, 0.1)',
        focusOuter: p.neutral['0'],
        focusInner: 'rgba(0, 0, 0, 0.7)',
      },
      status: {
        danger: { fg: p.red['300'], bg: p.red['950'], solid: p.red['500'] },
        success: { fg: p.green['300'], bg: p.green['950'], solid: p.green['500'] },
        warning: { fg: p.amber['300'], bg: p.amber['950'], solid: p.amber['400'] },
      },
    },
    elevation: {
      '0': 'none',
      '1': '0 1px 2px rgba(0, 0, 0, 0.24), 0 0 1px rgba(0, 0, 0, 0.28)',
      '2': '0 2px 4px rgba(0, 0, 0, 0.28), 0 0 2px rgba(0, 0, 0, 0.28)',
      '3': '0 4px 8px rgba(0, 0, 0, 0.32), 0 0 2px rgba(0, 0, 0, 0.3)',
      '4': '0 8px 16px rgba(0, 0, 0, 0.36), 0 0 2px rgba(0, 0, 0, 0.3)',
      '5': '0 16px 32px rgba(0, 0, 0, 0.44), 0 0 8px rgba(0, 0, 0, 0.3)',
    },
    surface: {
      acrylic: {
        tint: '#141416',
        tintOpacity: '0.58',
        blur: '24px',
        saturation: '190%',
        brightness: '92%',
        noiseOpacity: '0.04',
        border: 'rgba(255, 255, 255, 0.16)',
        fallback: '#242428',
      },
      reveal: {
        color: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.45)',
        pressColor: 'rgba(255, 255, 255, 0.45)',
        size: 'auto',
      },
    },
  },
};
