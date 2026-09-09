import { SingleTileImageryProvider, Rectangle } from 'cesium';
import { getColormapColor } from './colormaps';
import type { SliceData, ColorbarConfig } from '../types/ocean';

export function createHeatmapImageryProvider(slice: SliceData, colorbar: ColorbarConfig) {
  const width = slice.shape[1];
  const height = slice.shape[0];
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  
  const { min, max, colormap, reversed, scale } = colorbar;
  
  for (let i = 0; i < slice.data.length; i++) {
    const val = slice.data[i];
    
    // Check for NaN or NoData
    if (val === null || isNaN(val) || val < -900 || val > 1e10) {
      data[i * 4] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 0; // Transparent
      continue;
    }
    
    let normalized = 0;
    if (scale === 'logarithmic' && min > 0) {
      normalized = (Math.log(val) - Math.log(min)) / (Math.log(max) - Math.log(min));
    } else {
      normalized = (val - min) / (max - min);
    }
    
    // Clamp
    normalized = Math.max(0, Math.min(1, normalized));
    
    const [r, g, b] = getColormapColor(normalized, colormap, reversed);
    
    // Cesium Images are typically rendered upside down if directly mapped from numpy arrays
    const row = Math.floor(i / width);
    const col = i % width;
    
    let targetRow = row;
    if (slice.lat_range && slice.lat_range[0] < slice.lat_range[1]) {
        targetRow = height - 1 - row; // Flip Y
    }
    
    const targetIdx = (targetRow * width + col) * 4;
    
    data[targetIdx] = r;
    data[targetIdx + 1] = g;
    data[targetIdx + 2] = b;
    data[targetIdx + 3] = 200; // 80% opacity
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  const west = (slice.lon_range[0] * Math.PI) / 180;
  const east = (slice.lon_range[1] * Math.PI) / 180;
  const south = (slice.lat_range[0] * Math.PI) / 180;
  const north = (slice.lat_range[1] * Math.PI) / 180;
  
  return new SingleTileImageryProvider({
    url: canvas.toDataURL(),
    rectangle: new Rectangle(
        Math.min(west, east),
        Math.min(south, north),
        Math.max(west, east),
        Math.max(south, north)
    )
  });
}
