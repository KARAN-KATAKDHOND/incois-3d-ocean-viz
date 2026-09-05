// === Scientific Colormap Utilities ===
// Professional color palettes for ocean data visualization.

import type { ColormapName, ScaleType } from '../types/ocean';

type RGB = [number, number, number];

// Colormap control points (position 0-1, RGB 0-255)
const COLORMAPS: Record<ColormapName, RGB[]> = {
  viridis: [
    [68, 1, 84], [72, 35, 116], [64, 67, 135], [52, 94, 141],
    [41, 120, 142], [32, 144, 140], [34, 167, 132], [68, 190, 112],
    [121, 209, 81], [189, 222, 38], [253, 231, 37],
  ],
  plasma: [
    [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150],
    [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40],
    [240, 249, 33],
  ],
  inferno: [
    [0, 0, 4], [22, 11, 57], [66, 10, 104], [106, 23, 110],
    [147, 38, 103], [188, 55, 84], [221, 81, 58], [243, 120, 25],
    [252, 165, 10], [246, 215, 70], [252, 255, 164],
  ],
  turbo: [
    [48, 18, 59], [86, 91, 214], [29, 144, 243], [18, 188, 194],
    [60, 220, 128], [131, 240, 66], [196, 240, 44], [241, 210, 47],
    [253, 163, 49], [239, 99, 28], [196, 37, 11], [122, 4, 3],
  ],
  coolwarm: [
    [59, 76, 192], [98, 130, 234], [141, 176, 254], [184, 208, 249],
    [221, 221, 221], [245, 196, 173], [244, 154, 123], [222, 96, 77],
    [180, 4, 38],
  ],
  ocean: [
    [0, 25, 50], [0, 50, 100], [0, 80, 130], [10, 120, 160],
    [30, 160, 180], [80, 200, 200], [140, 225, 210], [200, 240, 220],
    [240, 250, 240],
  ],
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

/** Get RGB color for a normalized value (0-1) from a colormap */
export function getColormapColor(
  value: number,
  colormap: ColormapName = 'turbo',
  reversed: boolean = false
): RGB {
  const colors = COLORMAPS[colormap] || COLORMAPS.turbo;
  let t = Math.max(0, Math.min(1, value));
  if (reversed) t = 1 - t;

  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const frac = idx - lo;

  return lerpColor(colors[lo], colors[hi], frac);
}

/** Map a data value to colormap using min/max/scale */
export function mapValueToColor(
  value: number,
  min: number,
  max: number,
  colormap: ColormapName = 'turbo',
  scale: ScaleType = 'linear',
  reversed: boolean = false
): RGB {
  let normalized: number;
  if (scale === 'logarithmic' && min > 0) {
    normalized = (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min));
  } else {
    normalized = (value - min) / (max - min);
  }
  return getColormapColor(normalized, colormap, reversed);
}

/** Get CSS color string */
export function getColormapCSS(
  value: number,
  colormap: ColormapName = 'turbo',
  reversed: boolean = false
): string {
  const [r, g, b] = getColormapColor(value, colormap, reversed);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Generate a gradient CSS string for the colorbar */
export function getColormapGradient(
  colormap: ColormapName = 'turbo',
  reversed: boolean = false,
  steps: number = 64
): string {
  const stops: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const color = getColormapCSS(t, colormap, reversed);
    stops.push(`${color} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** Generate a Three.js-compatible color array from data */
export function generateColorArray(
  data: number[],
  min: number,
  max: number,
  colormap: ColormapName = 'turbo',
  scale: ScaleType = 'linear',
  reversed: boolean = false
): Float32Array {
  const colors = new Float32Array(data.length * 3);
  for (let i = 0; i < data.length; i++) {
    const [r, g, b] = mapValueToColor(data[i], min, max, colormap, scale, reversed);
    colors[i * 3] = r / 255;
    colors[i * 3 + 1] = g / 255;
    colors[i * 3 + 2] = b / 255;
  }
  return colors;
}

/** Variable-specific default configurations */
export const VARIABLE_DEFAULTS: Record<string, {
  colormap: ColormapName;
  min: number;
  max: number;
  unit: string;
  label: string;
}> = {
  temperature: { colormap: 'turbo', min: 2, max: 32, unit: '°C', label: 'Temperature' },
  salinity: { colormap: 'turbo', min: 33.5, max: 35.5, unit: 'PSU', label: 'Salinity' },
  currents: { colormap: 'plasma', min: 0, max: 1.5, unit: 'm/s', label: 'Current Speed' }
};
