/**
 * Semantic token contract.
 *
 * Every visual parameter a component consumes must come from here (or from a
 * component-level custom property that falls back to one of these). Themes are
 * complete `KernoTokens` objects; custom themes are produced by deep-merging
 * overrides onto a base theme with `createTheme()`.
 *
 * All leaf values are CSS strings.
 */

export interface StatusColor {
  /** Text / icon color on neutral backgrounds. */
  fg: string;
  /** Subtle tinted background. */
  bg: string;
  /** Solid fill (e.g. badges). */
  solid: string;
}

export interface ColorTokens {
  accent: {
    default: string;
    hover: string;
    active: string;
    /** Chromatic hover border matching the accent hue (Fluent 1 AccentButton). */
    borderHover: string;
    disabled: string;
    /** Foreground on top of an accent fill. */
    fg: string;
    fgDisabled: string;
    /** Accent-colored text on neutral backgrounds (links, selected labels). */
    text: string;
  };
  bg: {
    /** App background. */
    canvas: string;
    /** Raised layer (cards, panels). */
    layer: string;
    layerAlt: string;
  };
  fg: {
    default: string;
    secondary: string;
    tertiary: string;
    disabled: string;
  };
  /** Standard control fill (buttons, inputs). */
  control: {
    default: string;
    hover: string;
    active: string;
    disabled: string;
  };
  /** Transparent-at-rest fill (subtle buttons, list items). */
  subtle: {
    default: string;
    hover: string;
    active: string;
    disabled: string;
  };
  stroke: {
    default: string;
    subtle: string;
    strong: string;
    /** Control border (gives controls their crisp edge). */
    control: string;
    focusOuter: string;
    focusInner: string;
  };
  status: {
    danger: StatusColor;
    success: StatusColor;
    warning: StatusColor;
  };
}

export interface FontTokens {
  family: { sans: string; mono: string };
  size: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  weight: { regular: string; medium: string; semibold: string; bold: string };
  lineHeight: { tight: string; normal: string; relaxed: string };
}

export interface SpacingTokens {
  none: string;
  '2xs': string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

/** Elevation levels, expressed as box-shadow values. 0 = flat. */
export interface ElevationTokens {
  '0': string;
  '1': string;
  '2': string;
  '3': string;
  '4': string;
  '5': string;
}

export interface MotionTokens {
  duration: { instant: string; fast: string; normal: string; slow: string; slower: string };
  easing: { standard: string; decelerate: string; accelerate: string; emphasized: string };
}

/**
 * Material parameters consumed by the effects layer (Acrylic, Reveal).
 * Declared now so themes are complete; renderers arrive in phase 2.
 */
export interface SurfaceTokens {
  acrylic: {
    tint: string;
    tintOpacity: string;
    blur: string;
    saturation: string;
    brightness: string;
    noiseOpacity: string;
    /** Subtle specular edge highlight for frosted glass panels. */
    border: string;
    /** Solid color used when transparency is unavailable or reduced. */
    fallback: string;
  };
  reveal: {
    color: string;
    borderColor: string;
    pressColor: string;
    size: string;
  };
}

export interface ZIndexTokens {
  base: string;
  dropdown: string;
  sticky: string;
  overlay: string;
  modal: string;
  popover: string;
  toast: string;
  tooltip: string;
}

export interface ControlTokens {
  height: { sm: string; md: string; lg: string };
  paddingX: { sm: string; md: string; lg: string };
  borderWidth: string;
}

export interface FocusTokens {
  ringWidth: string;
  ringOffset: string;
}

export interface KernoTokens {
  color: ColorTokens;
  font: FontTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  surface: SurfaceTokens;
  zIndex: ZIndexTokens;
  control: ControlTokens;
  focus: FocusTokens;
}

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  /** Used as the `data-k-theme` attribute value. Must be a valid CSS identifier. */
  readonly name: string;
  readonly colorScheme: ColorScheme;
  readonly tokens: KernoTokens;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Dot-separated path to every leaf token, e.g. `"color.accent.default"`. */
export type TokenPath<T = KernoTokens> = {
  [K in keyof T & (string | number)]: T[K] extends string ? `${K}` : `${K}.${TokenPath<T[K]>}`;
}[keyof T & (string | number)];
