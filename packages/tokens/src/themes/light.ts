import { palette as p } from '../palette.js';
import type { Theme } from '../types.js';
import { baseTokens } from './base.js';

export const lightTheme: Theme = {
  name: 'light',
  colorScheme: 'light',
  tokens: {
    ...baseTokens,
    color: {
      accent: {
        default: p.azure['600'],
        hover: p.azure['500'],
        active: p.azure['700'],
        borderHover: p.azure['800'],
        disabled: 'rgba(42, 82, 217, 0.2)',
        fg: p.neutral['0'],
        fgDisabled: 'rgba(29, 54, 135, 0.56)',
        text: p.azure['700'],
      },
      bg: {
        canvas: p.neutral['100'],
        layer: p.neutral['0'],
        layerAlt: p.neutral['50'],
      },
      fg: {
        default: 'rgba(0, 0, 0, 0.89)',
        secondary: 'rgba(0, 0, 0, 0.62)',
        tertiary: 'rgba(0, 0, 0, 0.45)',
        disabled: 'rgba(0, 0, 0, 0.36)',
      },
      control: {
        default: 'rgba(0, 0, 0, 0.2)',
        hover: 'rgba(0, 0, 0, 0.2)',
        active: 'rgba(0, 0, 0, 0.4)',
        disabled: 'rgba(0, 0, 0, 0.1)',
      },
      subtle: {
        default: 'transparent',
        hover: 'rgba(0, 0, 0, 0.04)',
        active: 'rgba(0, 0, 0, 0.025)',
        disabled: 'transparent',
      },
      stroke: {
        default: 'rgba(0, 0, 0, 0.06)',
        subtle: 'rgba(0, 0, 0, 0.04)',
        strong: 'rgba(0, 0, 0, 0.45)',
        control: 'rgba(0, 0, 0, 0.14)',
        focusOuter: 'rgba(0, 0, 0, 0.89)',
        focusInner: p.neutral['0'],
      },
      status: {
        danger: { fg: p.red['600'], bg: p.red['50'], solid: p.red['600'] },
        success: { fg: p.green['600'], bg: p.green['50'], solid: p.green['600'] },
        warning: { fg: p.amber['700'], bg: p.amber['50'], solid: p.amber['500'] },
      },
    },
    elevation: {
      '0': 'none',
      '1': '0 1px 2px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08)',
      '2': '0 2px 4px rgba(0, 0, 0, 0.08), 0 0 2px rgba(0, 0, 0, 0.08)',
      '3': '0 4px 8px rgba(0, 0, 0, 0.1), 0 0 2px rgba(0, 0, 0, 0.1)',
      '4': '0 8px 16px rgba(0, 0, 0, 0.12), 0 0 2px rgba(0, 0, 0, 0.1)',
      '5': '0 16px 32px rgba(0, 0, 0, 0.16), 0 0 8px rgba(0, 0, 0, 0.1)',
    },
    surface: {
      acrylic: {
        tint: '#ffffff',
        tintOpacity: '0.55',
        blur: '24px',
        saturation: '190%',
        brightness: '104%',
        noiseOpacity: '0.035',
        border: 'rgba(255, 255, 255, 0.55)',
        fallback: '#f5f5f7',
      },
      reveal: {
        color: 'rgba(0, 0, 0, 0.13)',
        borderColor: 'rgba(0, 0, 0, 0.26)',
        pressColor: 'rgba(0, 0, 0, 0.4)',
        size: 'auto',
      },
    },
  },
};
