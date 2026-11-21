export type ColorFormat = 'hex' | 'hexa' | 'rgb' | 'rgba' | 'hsl' | 'hsla';

export interface Hsva {
  /** Hue `0..360` */
  h: number;
  /** Saturation `0..100` */
  s: number;
  /** Value / Brightness `0..100` */
  v: number;
  /** Alpha `0..1` */
  a: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r1: number;
  let g1: number;
  let b1: number;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a: clamp(Number(a.toFixed(2)), 0, 1),
  };
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return {
    h,
    s,
    v,
    a: clamp(Number(a.toFixed(2)), 0, 1),
  };
}

export function rgbaToHsla({ r, g, b, a }: Rgba): { h: number; s: number; l: number; a: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: clamp(Number(a.toFixed(2)), 0, 1),
  };
}

function hslaToRgba(h: number, s: number, l: number, a: number): Rgba {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;

  let r1: number;
  let g1: number;
  let b1: number;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a: clamp(a, 0, 1),
  };
}

const hex2 = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');

export function formatColor(hsva: Hsva, format: ColorFormat): string {
  const rgba = hsvaToRgba(hsva);
  switch (format) {
    case 'hex':
      return `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}`;
    case 'hexa':
      return `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}${hex2(rgba.a * 255)}`;
    case 'rgb':
      return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
    case 'rgba':
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    case 'hsl': {
      const hsla = rgbaToHsla(rgba);
      return `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`;
    }
    case 'hsla': {
      const hsla = rgbaToHsla(rgba);
      return `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a})`;
    }
  }
}

export function formatHasAlpha(format: ColorFormat): boolean {
  return format === 'hexa' || format === 'rgba' || format === 'hsla';
}

export function parseColor(input: string): Hsva | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(raw);
  if (hexMatch) {
    const h = hexMatch[1]!;
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0]! + h[0]!, 16);
      const g = parseInt(h[1]! + h[1]!, 16);
      const b = parseInt(h[2]! + h[2]!, 16);
      const a = h.length === 4 ? parseInt(h[3]! + h[3]!, 16) / 255 : 1;
      return rgbaToHsva({ r, g, b, a });
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return rgbaToHsva({ r, g, b, a });
  }

  const rgbMatch =
    /^rgba?\(\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/.exec(
      raw,
    );
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4]) {
      a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : Number(rgbMatch[4]);
    }
    if ([r, g, b, a].every(Number.isFinite)) {
      return rgbaToHsva({ r, g, b, a });
    }
  }

  const hslMatch =
    /^hsla?\(\s*([0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/.exec(
      raw,
    );
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]);
    const l = Number(hslMatch[3]);
    let a = 1;
    if (hslMatch[4]) {
      a = hslMatch[4].endsWith('%') ? parseFloat(hslMatch[4]) / 100 : Number(hslMatch[4]);
    }
    if ([h, s, l, a].every(Number.isFinite)) {
      return rgbaToHsva(hslaToRgba(h, s, l, a));
    }
  }

  return null;
}
