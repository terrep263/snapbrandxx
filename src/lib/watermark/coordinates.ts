/**
 * Coordinate Conversion Utilities
 * 
 * Convert between normalized (0.0-1.0) and pixel coordinates
 * for cross-aspect-ratio watermark positioning
 */

export interface NormalizedCoords {
  xNorm: number;
  yNorm: number;
  widthNorm?: number;
  heightNorm?: number;
}

export interface PixelCoords {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Convert pixel coordinates to normalized (0-1) based on canvas dimensions
 */
export function toNormalized(
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number,
  pixelWidth?: number,
  pixelHeight?: number
): NormalizedCoords {
  return {
    xNorm: clamp(pixelX / canvasWidth, 0, 1),
    yNorm: clamp(pixelY / canvasHeight, 0, 1),
    widthNorm: pixelWidth ? clamp(pixelWidth / canvasWidth, 0, 1) : undefined,
    heightNorm: pixelHeight ? clamp(pixelHeight / canvasHeight, 0, 1) : undefined,
  };
}

/**
 * Convert normalized coords to pixels for a specific image
 */
export function toPixels(
  normalized: NormalizedCoords,
  targetWidth: number,
  targetHeight: number
): PixelCoords {
  return {
    x: normalized.xNorm * targetWidth,
    y: normalized.yNorm * targetHeight,
    width: normalized.widthNorm ? normalized.widthNorm * targetWidth : undefined,
    height: normalized.heightNorm ? normalized.heightNorm * targetHeight : undefined,
  };
}

/**
 * Convert font size from percentage of image height to pixels
 */
export function fontSizeToPixels(
  fontSizeRelative: number, // e.g., 0.05 = 5% of image height
  imageHeight: number
): number {
  return fontSizeRelative * imageHeight;
}

/**
 * Convert pixel font size to percentage of image height
 */
export function fontSizeToRelative(
  fontSizePixels: number,
  imageHeight: number
): number {
  if (imageHeight === 0) return 0.05; // Default 5% if height is 0
  return fontSizePixels / imageHeight;
}

/**
 * Scale logo dimensions while preserving aspect ratio
 */
export function scaleLogoProportionally(
  naturalWidth: number,
  naturalHeight: number,
  targetWidthNorm: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const aspectRatio = naturalWidth / naturalHeight;
  const targetWidthPixels = targetWidthNorm * imageWidth;
  const targetHeightPixels = targetWidthPixels / aspectRatio;
  
  return {
    width: targetWidthPixels,
    height: targetHeightPixels,
  };
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

