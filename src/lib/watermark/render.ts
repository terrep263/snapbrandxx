/**
 * SINGLE SOURCE OF TRUTH FOR EXPORT RENDERING
 * 
 * This module provides the canonical renderer for watermarked images.
 * - Uses Canvas 2D (NOT Konva - Konva is editor-only)
 * - Uses normalized coordinates (0-1) for all layer positioning
 * - Ensures preview === export
 * 
 * REUSED FROM: src/lib/watermark/engine.ts (refactored to use normalized coords)
 */

import { WatermarkLayer, Anchor, TileMode, TextEffect, LogoEffect, TextAlign } from './types';
import { LogoItem, logoItemToImage } from '../logoLibrary';
import { normToScreen, legacyOffsetsToNorm, migrateLayerToNorm } from './utils';

/**
 * Export options
 */
export interface RenderOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0.0 to 1.0
  scale?: number; // For preview vs full-res (0.1 to 1.0), default 1.0
  returnDataUrl?: boolean;
}

/**
 * Load an image from a File or data URL
 */
async function loadImage(source: File | string | HTMLImageElement): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement) {
    return source;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Get anchor point coordinates (for legacy support)
 */
function getAnchorPoint(anchor: Anchor, width: number, height: number): { x: number; y: number } {
  switch (anchor) {
    case Anchor.TOP_LEFT:
      return { x: 0, y: 0 };
    case Anchor.TOP_RIGHT:
      return { x: width, y: 0 };
    case Anchor.BOTTOM_LEFT:
      return { x: 0, y: height };
    case Anchor.BOTTOM_RIGHT:
      return { x: width, y: height };
    case Anchor.CENTER:
      return { x: width / 2, y: height / 2 };
  }
}

/**
 * Render text with effect
 */
async function renderTextWithEffect(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
  fontStyle: string,
  color: string,
  secondaryColor?: string,
  effect: TextEffect = TextEffect.SOLID,
  textAlign: TextAlign = TextAlign.LEFT
): Promise<void> {
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.textAlign = textAlign === TextAlign.LEFT ? 'left' : textAlign === TextAlign.CENTER ? 'center' : 'right';
  ctx.textBaseline = 'alphabetic';

  let textX = x;
  if (textAlign === TextAlign.CENTER) {
    textX = x;
  } else if (textAlign === TextAlign.RIGHT) {
    textX = x;
  }

  switch (effect) {
    case TextEffect.SOLID:
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      break;

    case TextEffect.OUTLINE:
      ctx.strokeStyle = secondaryColor || '#000000';
      ctx.lineWidth = Math.max(2, fontSize * 0.1);
      ctx.strokeText(text, textX, y);
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      break;

    case TextEffect.SHADOW:
      ctx.shadowColor = secondaryColor || 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = fontSize * 0.2;
      ctx.shadowOffsetX = fontSize * 0.05;
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      break;

    case TextEffect.GLOW:
      ctx.shadowColor = secondaryColor || color;
      ctx.shadowBlur = fontSize * 0.3;
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      ctx.shadowBlur = 0;
      break;

    case TextEffect.GRADIENT:
      const gradient = ctx.createLinearGradient(x, y - fontSize, x, y);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, secondaryColor || color);
      ctx.fillStyle = gradient;
      ctx.fillText(text, textX, y);
      break;
  }
}

/**
 * Render a text layer using normalized coordinates
 */
async function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1.0
): Promise<void> {
  if (!layer.text) return;

  // Get normalized position (support both new and legacy)
  let xNorm: number;
  let yNorm: number;

  if (typeof layer.xNorm === 'number' && typeof layer.yNorm === 'number') {
    xNorm = layer.xNorm;
    yNorm = layer.yNorm;
  } else {
    // Legacy: convert offsetX/offsetY to normalized
    const legacy = legacyOffsetsToNorm(layer.offsetX ?? 0, layer.offsetY ?? 0);
    xNorm = legacy.xNorm;
    yNorm = legacy.yNorm;
  }

  // Convert normalized to screen coordinates
  const { x, y } = normToScreen(xNorm, yNorm, canvasWidth, canvasHeight);

  // Calculate font size (relative to image height)
  const fontSizeRelative = layer.fontSizeRelative || 8; // Default 8% of image height
  const fontSize = (canvasHeight * fontSizeRelative / 100) * layer.scale * scale;

  // Get text width for wrapping
  const textWidth = layer.textWidthPercent
    ? (canvasWidth * layer.textWidthPercent / 100) * scale
    : undefined;

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;

  // Move to position
  ctx.translate(x, y);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  // Render text
  const fontFamily = layer.fontFamily || 'Inter';
  const fontWeight = layer.fontWeight || 'normal';
  const fontStyle = layer.fontStyle || 'normal';
  const color = layer.color || '#ffffff';
  const secondaryColor = layer.secondaryColor;
  const effect = (layer.effect as TextEffect) || TextEffect.SOLID;
  const textAlign = layer.textAlign || TextAlign.CENTER;

  // If text width is specified, we need to measure and wrap
  if (textWidth && textWidth > 0) {
    // Measure text to determine if wrapping is needed
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
    const metrics = ctx.measureText(layer.text);
    
    if (metrics.width > textWidth) {
      // Simple word wrapping
      const words = layer.text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testMetrics = ctx.measureText(testLine);
        
        if (testMetrics.width > textWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      // Draw each line (centered vertically)
      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = -totalHeight / 2 + lineHeight / 2; // Center first line
      
      for (let i = 0; i < lines.length; i++) {
        await renderTextWithEffect(
          ctx,
          lines[i],
          0,
          startY + i * lineHeight,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          color,
          secondaryColor,
          effect,
          textAlign
        );
      }
    } else {
      // No wrapping needed - render single line
      await renderTextWithEffect(
        ctx,
        layer.text,
        0,
        0, // Center vertically (baseline at 0)
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        color,
        secondaryColor,
        effect,
        textAlign
      );
    }
  } else {
    // No width constraint - render single line
    await renderTextWithEffect(
      ctx,
      layer.text,
      0,
      0, // Center vertically (baseline at 0)
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      color,
      secondaryColor,
      effect,
      textAlign
    );
  }

  ctx.restore();
}

/**
 * Render a logo layer using normalized coordinates
 */
async function renderLogoLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  logoImage: HTMLImageElement | null,
  scale: number = 1.0
): Promise<void> {
  if (!logoImage) return;

  // Get normalized position (support both new and legacy)
  let xNorm: number;
  let yNorm: number;

  if (typeof layer.xNorm === 'number' && typeof layer.yNorm === 'number') {
    xNorm = layer.xNorm;
    yNorm = layer.yNorm;
  } else {
    // Legacy: convert offsetX/offsetY to normalized
    const legacy = legacyOffsetsToNorm(layer.offsetX ?? 0, layer.offsetY ?? 0);
    xNorm = legacy.xNorm;
    yNorm = legacy.yNorm;
  }

  // Convert normalized to screen coordinates
  const { x, y } = normToScreen(xNorm, yNorm, canvasWidth, canvasHeight);

  // Calculate logo size
  const naturalWidth = layer.naturalLogoWidth || logoImage.width;
  const naturalHeight = layer.naturalLogoHeight || logoImage.height;
  
  // Use widthNorm if available (scaleLocked), otherwise use scale
  let logoWidth: number;
  let logoHeight: number;
  
  if (layer.scaleLocked && layer.widthNorm !== undefined) {
    // Use normalized width for scale-locked logos
    logoWidth = canvasWidth * layer.widthNorm * scale;
    const aspectRatio = naturalHeight / naturalWidth;
    logoHeight = logoWidth * aspectRatio;
  } else {
    // Use scale multiplier
    const logoScale = layer.scale * scale;
    logoWidth = naturalWidth * logoScale;
    logoHeight = naturalHeight * logoScale;
  }

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;

  // Move to position
  ctx.translate(x, y);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  // Draw background box if enabled
  if (layer.backgroundBox) {
    const padding = (layer.boxPadding || 10) * scale;
    const borderRadius = (layer.boxBorderRadius || 5) * scale;
    const boxWidth = logoWidth + padding * 2;
    const boxHeight = logoHeight + padding * 2;
    const boxX = -boxWidth / 2;
    const boxY = -boxHeight / 2;

    ctx.globalAlpha = (layer.boxOpacity || 0.8) * (layer.opacity ?? 1);
    ctx.fillStyle = layer.boxColor || '#000000';
    
    if (borderRadius > 0) {
      ctx.beginPath();
      ctx.moveTo(boxX + borderRadius, boxY);
      ctx.lineTo(boxX + boxWidth - borderRadius, boxY);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + borderRadius);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - borderRadius);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - borderRadius, boxY + boxHeight);
      ctx.lineTo(boxX + borderRadius, boxY + boxHeight);
      ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - borderRadius);
      ctx.lineTo(boxX, boxY + borderRadius);
      ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
  }

  // Enable high-quality logo rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw logo
  ctx.globalAlpha = layer.opacity ?? 1;
  const effect = (layer.effect as LogoEffect) || LogoEffect.SOLID;

  if (effect === LogoEffect.SHADOW) {
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = logoWidth * 0.05;
    ctx.shadowOffsetX = logoWidth * 0.02;
    ctx.shadowOffsetY = logoWidth * 0.02;
  }

  ctx.drawImage(
    logoImage,
    -logoWidth / 2,
    -logoHeight / 2,
    logoWidth,
    logoHeight
  );

  if (effect === LogoEffect.SHADOW) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.restore();
}

/**
 * Render a single layer (dispatcher)
 */
async function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  logoImage: HTMLImageElement | null,
  scale: number = 1.0
): Promise<void> {
  if (!layer.enabled) return;

  // Migrate layer to normalized format if needed
  const normalizedLayer = migrateLayerToNorm(layer);

  if (normalizedLayer.type === 'text') {
    if (normalizedLayer.tileMode === TileMode.NONE) {
      await renderTextLayer(ctx, normalizedLayer, canvasWidth, canvasHeight, scale);
    }
    // TODO: Support tiling in future sprint
  } else if (normalizedLayer.type === 'logo') {
    await renderLogoLayer(ctx, normalizedLayer, canvasWidth, canvasHeight, logoImage, scale);
  }
}

/**
 * Render watermarked image to canvas
 * 
 * This is the SINGLE SOURCE OF TRUTH for export rendering.
 * Preview uses this same function with scale < 1.0.
 * 
 * @param baseImage - Source image (File, data URL, or HTMLImageElement)
 * @param layers - Array of WatermarkLayer objects (will be sorted by zIndex)
 * @param outWidth - Output canvas width (defaults to image width)
 * @param outHeight - Output canvas height (defaults to image height)
 * @param options - Render options (format, quality, scale, returnDataUrl)
 * @param logoLibrary - Map of logoId to LogoItem for resolving logo images
 * @returns Promise resolving to Blob (for export) or data URL (for preview)
 */
export async function renderWatermarkedCanvas(
  baseImage: File | string | HTMLImageElement,
  layers: WatermarkLayer[],
  outWidth?: number,
  outHeight?: number,
  options: RenderOptions = {},
  logoLibrary: Map<string, LogoItem> = new Map()
): Promise<Blob | string> {
  const {
    format = 'jpeg',
    quality = 0.95,
    scale = 1.0,
    returnDataUrl = false
  } = options;

  // Load source image
  const img = await loadImage(baseImage);

  // Determine output dimensions
  const width = outWidth ?? Math.floor(img.width * scale);
  const height = outHeight ?? Math.floor(img.height * scale);

  // Ensure we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('renderWatermarkedCanvas can only be called in the browser');
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Enable high-quality canvas rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw base image (scaled to output size)
  ctx.drawImage(img, 0, 0, width, height);

  // Sort layers by zIndex (lower = behind)
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  // Render each enabled layer
  for (const layer of sortedLayers) {
    let logoImage: HTMLImageElement | null = null;
    
    if (layer.type === 'logo' && layer.logoId) {
      const logoItem = logoLibrary.get(layer.logoId);
      if (logoItem) {
        logoImage = await logoItemToImage(logoItem);
      }
    }

    await renderLayer(ctx, layer, width, height, logoImage, 1.0); // Always use 1.0 scale for export
  }

  // Determine MIME type
  const mimeType = format === 'jpeg' ? 'image/jpeg'
                 : format === 'png' ? 'image/png'
                 : 'image/webp';

  // Return result
  if (returnDataUrl) {
    return canvas.toDataURL(mimeType, quality);
  } else {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }
}

/**
 * Convert canvas to blob
 */
export function renderToBlob(
  canvas: HTMLCanvasElement,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  quality: number = 0.95
): Promise<Blob> {
  const mimeType = format === 'jpeg' ? 'image/jpeg'
                 : format === 'png' ? 'image/png'
                 : 'image/webp';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

