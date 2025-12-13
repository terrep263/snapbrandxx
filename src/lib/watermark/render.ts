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

import { WatermarkLayer, Anchor, TileMode, TextEffect, LogoEffect, TextAlign, ShapeType, TilingConfig, TextVariableContext } from './types';
import { LogoItem, logoItemToImage } from '../logoLibrary';
import { normToScreen, legacyOffsetsToNorm, migrateLayerToNorm } from './utils';
import { replaceTextVariables } from './variables';

/**
 * Export options
 */
export interface RenderOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0.0 to 1.0
  scale?: number; // For preview vs full-res (0.1 to 1.0), default 1.0
  returnDataUrl?: boolean;
  tiling?: TilingConfig;
  variableContext?: TextVariableContext;
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
  
  // CRITICAL: Set text alignment before drawing
  ctx.textAlign = textAlign === TextAlign.LEFT ? 'left' : textAlign === TextAlign.CENTER ? 'center' : 'right';
  ctx.textBaseline = 'top'; // Use 'top' for consistent vertical alignment

  // x position is already correct - canvas textAlign handles horizontal alignment
  const textX = x;

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
  const textAlign = layer.textAlign || TextAlign.LEFT;

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

      for (const word of layer.text.split(' ')) {
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
      // Adjust startY to account for textBaseline='top'
      const startY = -totalHeight / 2; // Start from top of text block
      
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
      // Adjust y position to center text vertically (accounting for textBaseline='top')
      await renderTextWithEffect(
        ctx,
        layer.text,
        0,
        -fontSize / 2, // Center vertically (textBaseline='top', so offset by half font size)
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
    // Adjust y position to center text vertically (accounting for textBaseline='top')
    await renderTextWithEffect(
      ctx,
      layer.text,
      0,
      -fontSize / 2, // Center vertically (textBaseline='top', so offset by half font size)
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
 * Render a shape layer using normalized coordinates
 */
async function renderShapeLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1.0
): Promise<void> {
  if (!layer.shapeType || !layer.widthNorm || !layer.heightNorm) return;

  // Get normalized position
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

  // Convert normalized coordinates to pixels
  const { x, y } = normToScreen(xNorm, yNorm, canvasWidth, canvasHeight);
  const width = canvasWidth * layer.widthNorm * scale;
  const height = canvasHeight * layer.heightNorm * scale;

  ctx.save();
  ctx.globalAlpha = (layer.fillOpacity ?? 0.6) * (layer.opacity ?? 1);

  // Move to position (center of shape)
  ctx.translate(x, y);
  ctx.rotate((layer.rotation ?? 0) * Math.PI / 180);

  // Draw shape based on type
  switch (layer.shapeType) {
    case ShapeType.RECTANGLE:
      ctx.fillStyle = layer.fillColor || '#000000';
      ctx.fillRect(-width / 2, -height / 2, width, height);
      break;

    case ShapeType.ROUNDED_RECTANGLE:
      ctx.fillStyle = layer.fillColor || '#000000';
      ctx.beginPath();
      const radius = (layer.cornerRadius || 8) * scale;
      // Use roundRect if available (modern browsers)
      if (ctx.roundRect) {
        ctx.roundRect(-width / 2, -height / 2, width, height, radius);
      } else {
        // Fallback for older browsers
        const x = -width / 2;
        const y = -height / 2;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      }
      ctx.fill();
      break;

    case ShapeType.CIRCLE:
      ctx.fillStyle = layer.fillColor || '#000000';
      ctx.beginPath();
      const circleRadius = Math.min(width, height) / 2;
      ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case ShapeType.LINE:
      ctx.strokeStyle = layer.fillColor || '#000000';
      ctx.lineWidth = (layer.strokeWidth || 2) * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-width / 2, -height / 2);
      ctx.lineTo(width / 2, height / 2);
      ctx.stroke();
      break;
  }

  // Draw optional border/stroke (for non-line shapes)
  if (layer.strokeWidth && layer.strokeColor && layer.shapeType !== ShapeType.LINE) {
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Re-draw shape outline for stroke
    switch (layer.shapeType) {
      case ShapeType.RECTANGLE:
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        break;
      case ShapeType.ROUNDED_RECTANGLE:
        const radius = (layer.cornerRadius || 8) * scale;
        const x = -width / 2;
        const y = -height / 2;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, radius);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.stroke();
        }
        break;
      case ShapeType.CIRCLE:
        ctx.beginPath();
        const circleRadius = Math.min(width, height) / 2;
        ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
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
    // canvasWidth is already scaled, so widthNorm gives us the correct size
    logoWidth = canvasWidth * layer.widthNorm;
    const aspectRatio = naturalHeight / naturalWidth;
    logoHeight = logoWidth * aspectRatio;
  } else {
    // For non-scale-locked logos, calculate size based on natural dimensions
    // but scale it relative to canvas size to maintain proportions
    // Use a base size of 10% of canvas width, then apply layer.scale
    const baseSize = Math.min(canvasWidth, canvasHeight) * 0.1; // 10% of smaller dimension
    const logoScale = layer.scale;
    // Calculate target width based on natural aspect ratio
    const targetWidth = baseSize * logoScale;
    const aspectRatio = naturalHeight / naturalWidth;
    logoWidth = targetWidth;
    logoHeight = targetWidth * aspectRatio;
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
  scale: number = 1.0,
  variableContext?: TextVariableContext
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
  } else if (normalizedLayer.type === 'shape') {
    await renderShapeLayer(ctx, normalizedLayer, canvasWidth, canvasHeight, scale);
  }
}

/**
 * Apply tiled watermark pattern across entire image
 */
async function applyTiledWatermark(
  ctx: CanvasRenderingContext2D,
  layers: WatermarkLayer[],
  imageWidth: number,
  imageHeight: number,
  tiling: TilingConfig,
  scale: number,
  logoLibrary: Map<string, LogoItem> = new Map(),
  variableContext?: TextVariableContext
): Promise<void> {
  // Calculate tile dimensions (25% of image size)
  const tileWidth = imageWidth * 0.25;
  const tileHeight = imageHeight * 0.25;
  const spacing = Math.max(tileWidth, tileHeight) * tiling.spacing;
  
  // Calculate number of tiles needed
  const cols = Math.ceil(imageWidth / (tileWidth + spacing)) + 1;
  const rows = Math.ceil(imageHeight / (tileHeight + spacing)) + 1;
  
  // Save context
  ctx.save();
  ctx.globalAlpha = tiling.opacity;
  
  // Draw tiles in grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = col * (tileWidth + spacing) - spacing;
      const offsetY = row * (tileHeight + spacing) - spacing;
      
      ctx.save();
      
      // Apply rotation to each tile
      if (tiling.rotation) {
        const centerX = offsetX + tileWidth / 2;
        const centerY = offsetY + tileHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((tiling.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Render each layer within this tile (scaled to tile size)
      for (const layer of layers) {
        if (!layer.enabled) continue;
        
        // Create a temporary canvas context for this tile
        // Scale layer coordinates to fit within tile
        const tileScale = Math.min(tileWidth / imageWidth, tileHeight / imageHeight);
        
        // Render layer at tile position with scaled coordinates
        const normalizedLayer = migrateLayerToNorm(layer);
        
        if (normalizedLayer.type === 'text') {
          await renderTextLayer(ctx, normalizedLayer, tileWidth, tileHeight, tileScale * scale);
        } else if (normalizedLayer.type === 'logo') {
          const logoId = normalizedLayer.logoId;
          const logoItem = logoId ? logoLibrary.get(logoId) : null;
          const logoImage = logoItem ? await logoItemToImage(logoItem) : null;
          await renderLogoLayer(ctx, normalizedLayer, tileWidth, tileHeight, logoImage, tileScale * scale);
        } else if (normalizedLayer.type === 'shape') {
          await renderShapeLayer(ctx, normalizedLayer, tileWidth, tileHeight, tileScale * scale);
        }
      }
      
      ctx.restore();
    }
  }
  
  ctx.restore();
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
 * @param options - Render options (format, quality, scale, returnDataUrl, tiling, variableContext)
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

  // Process text variables if context provided
  const processedLayers = options.variableContext
    ? layers.map(layer => {
        if (layer.type === 'text' && layer.text) {
          return {
            ...layer,
            text: replaceTextVariables(layer.text, options.variableContext!)
          };
        }
        return layer;
      })
    : layers;

  // Sort layers by zIndex (lower = behind)
  const sortedLayers = [...processedLayers].sort((a, b) => a.zIndex - b.zIndex);

  // Apply tiling if enabled
  if (options.tiling?.enabled) {
    await applyTiledWatermark(ctx, sortedLayers, width, height, options.tiling, 1.0, logoLibrary, options.variableContext);
  } else {
    // Render each enabled layer normally
    // Note: width and height are already scaled, so we pass scale: 1.0 to renderLayer
    // The normalized coordinates ensure correct positioning regardless of canvas size
    for (const layer of sortedLayers) {
      let logoImage: HTMLImageElement | null = null;
      
      if (layer.type === 'logo' && layer.logoId) {
        const logoItem = logoLibrary.get(layer.logoId);
        if (logoItem) {
          logoImage = await logoItemToImage(logoItem);
        }
      }

      // Pass scale: 1.0 because canvas dimensions are already scaled
      // Normalized coordinates (xNorm, yNorm) work correctly at any canvas size
      await renderLayer(ctx, layer, width, height, logoImage, 1.0, options.variableContext);
    }
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

