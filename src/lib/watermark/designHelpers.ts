/**
 * Design Save/Load Helpers
 * 
 * Ensures designs are saved with normalized coordinates
 * and loaded correctly for different image sizes
 */

import { WatermarkLayer } from './types';
import { toNormalized, toPixels, fontSizeToRelative, fontSizeToPixels } from './coordinates';
import { screenToNorm, normToScreen } from './utils';

/**
 * Normalize layers before saving to database
 * Converts any pixel-based coordinates to normalized (0-1)
 */
export function normalizeLayersForSave(
  layers: WatermarkLayer[],
  canvasWidth: number,
  canvasHeight: number
): WatermarkLayer[] {
  return layers.map(layer => {
    // If already normalized, ensure all normalized fields are present
    if (typeof layer.xNorm === 'number' && typeof layer.yNorm === 'number') {
      // Ensure fontSizeRelative is set
      const normalized = {
        ...layer,
        fontSizeRelative: layer.fontSizeRelative ?? (
          layer.fontSize 
            ? fontSizeToRelative(layer.fontSize, canvasHeight)
            : 0.05 // Default 5%
        ),
      };

      // For logo layers, ensure widthNorm is set if scaleLocked
      if (layer.type === 'logo' && layer.scaleLocked && !layer.widthNorm) {
        // Calculate widthNorm from natural dimensions and scale
        if (layer.naturalLogoWidth && canvasWidth > 0) {
          normalized.widthNorm = (layer.naturalLogoWidth * layer.scale) / canvasWidth;
        }
      }

      return normalized;
    }

    // Legacy: Convert from pixel/offset coordinates to normalized
    let xNorm: number;
    let yNorm: number;

    if (layer.offsetX !== undefined && layer.offsetY !== undefined) {
      // Convert from offsetX/offsetY (percentage from center) to normalized
      xNorm = clamp((layer.offsetX / 100) + 0.5, 0, 1);
      yNorm = clamp((layer.offsetY / 100) + 0.5, 0, 1);
    } else {
      // Default to center
      xNorm = 0.5;
      yNorm = 0.5;
    }

    // Calculate fontSizeRelative
    const fontSizeRelative = layer.fontSizeRelative ?? (
      layer.fontSize 
        ? fontSizeToRelative(layer.fontSize, canvasHeight)
        : 0.05 // Default 5%
    );

    const normalized: WatermarkLayer = {
      ...layer,
      xNorm,
      yNorm,
      fontSizeRelative,
      anchor: 'CENTER' as any, // Always use CENTER for normalized coords
    };

    // For logo layers, calculate widthNorm if scaleLocked
    if (layer.type === 'logo' && layer.scaleLocked && layer.naturalLogoWidth && canvasWidth > 0) {
      normalized.widthNorm = clamp((layer.naturalLogoWidth * layer.scale) / canvasWidth, 0, 1);
    }

    return normalized;
  });
}

/**
 * Convert normalized layers to pixel coordinates for a specific image
 * Use this when loading a design to apply to new images
 */
export function denormalizeLayersForImage(
  layers: WatermarkLayer[],
  targetImageWidth: number,
  targetImageHeight: number
): WatermarkLayer[] {
  return layers.map(layer => {
    // Ensure normalized coordinates exist
    const xNorm = layer.xNorm ?? 0.5;
    const yNorm = layer.yNorm ?? 0.5;

    // Convert normalized to pixels
    const { x, y } = normToScreen(xNorm, yNorm, targetImageWidth, targetImageHeight);

    // Convert fontSizeRelative to pixels
    const fontSizeRelative = layer.fontSizeRelative ?? 0.05;
    const fontSize = fontSizeToPixels(fontSizeRelative, targetImageHeight);

    const denormalized: WatermarkLayer = {
      ...layer,
      x,
      y,
      fontSize,
      // Keep normalized coords for future use
      xNorm,
      yNorm,
    };

    // For logo layers, convert widthNorm to pixels if present
    if (layer.type === 'logo' && layer.widthNorm !== undefined) {
      denormalized.width = layer.widthNorm * targetImageWidth;
      if (layer.naturalLogoWidth && layer.naturalLogoHeight) {
        const aspectRatio = layer.naturalLogoHeight / layer.naturalLogoWidth;
        denormalized.height = denormalized.width * aspectRatio;
      }
    }

    return denormalized;
  });
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

