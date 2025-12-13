/**
 * Watermark Layer Utilities
 * 
 * Conversion helpers for normalized (0-1) coordinates
 */

import { WatermarkLayer, Anchor } from './types';

/**
 * Convert screen coordinates to normalized (0-1) coordinates
 * Assumes center anchor (0.5, 0.5)
 */
export function screenToNorm(
  screenX: number,
  screenY: number,
  imageWidth: number,
  imageHeight: number
): { xNorm: number; yNorm: number } {
  return {
    xNorm: clamp(screenX / imageWidth, 0, 1),
    yNorm: clamp(screenY / imageHeight, 0, 1),
  };
}

/**
 * Convert normalized (0-1) coordinates to screen coordinates
 * Assumes center anchor (0.5, 0.5)
 */
export function normToScreen(
  xNorm: number,
  yNorm: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: xNorm * imageWidth,
    y: yNorm * imageHeight,
  };
}

/**
 * Convert legacy offsetX/offsetY (percentage from center) to normalized (0-1)
 */
export function legacyOffsetsToNorm(
  offsetX: number,
  offsetY: number
): { xNorm: number; yNorm: number } {
  // offsetX/offsetY are percentages from center (-50 to +50)
  // Convert to normalized: center = 0.5, so offsetX/100 + 0.5
  return {
    xNorm: clamp((offsetX / 100) + 0.5, 0, 1),
    yNorm: clamp((offsetY / 100) + 0.5, 0, 1),
  };
}

/**
 * Convert normalized (0-1) to legacy offsetX/offsetY (percentage from center)
 */
export function normToLegacyOffsets(
  xNorm: number,
  yNorm: number
): { offsetX: number; offsetY: number } {
  // Convert from normalized (0-1) to percentage from center (-50 to +50)
  return {
    offsetX: clamp((xNorm - 0.5) * 100, -50, 50),
    offsetY: clamp((yNorm - 0.5) * 100, -50, 50),
  };
}

/**
 * Migrate legacy layer to normalized format
 */
export function migrateLayerToNorm(layer: WatermarkLayer): WatermarkLayer {
  // If already migrated (has xNorm/yNorm), return as-is
  if ('xNorm' in layer && typeof (layer as any).xNorm === 'number') {
    return layer;
  }

  // Migrate from offsetX/offsetY to xNorm/yNorm
  const { xNorm, yNorm } = legacyOffsetsToNorm(layer.offsetX ?? 0, layer.offsetY ?? 0);
  
  const migrated = {
    ...layer,
    xNorm,
    yNorm,
    anchor: Anchor.CENTER, // Always use CENTER for normalized coordinates
  };

  // For logo layers, calculate widthNorm if we have natural dimensions
  if (layer.type === 'logo' && layer.naturalLogoWidth && layer.naturalLogoHeight) {
    // Estimate widthNorm based on scale and natural dimensions
    // This is approximate - will be refined when image is loaded
    const estimatedWidth = layer.naturalLogoWidth * layer.scale;
    migrated.widthNorm = estimatedWidth / 1000; // Rough estimate, will be corrected
  }

  return migrated;
}

/**
 * Calculate normalized width for a logo layer
 */
export function calculateLogoWidthNorm(
  naturalWidth: number,
  scale: number,
  imageWidth: number
): number {
  return clamp((naturalWidth * scale) / imageWidth, 0, 1);
}

/**
 * Calculate normalized height for a logo layer (maintains aspect ratio)
 */
export function calculateLogoHeightNorm(
  naturalWidth: number,
  naturalHeight: number,
  widthNorm: number,
  imageHeight: number
): number {
  const aspectRatio = naturalHeight / naturalWidth;
  const height = (widthNorm * imageHeight) * aspectRatio;
  return clamp(height / imageHeight, 0, 1);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

