/**
 * Professional Watermark Engine
 * 
 * Unified rendering system with effects, tile modes, and advanced features
 */

import {
  WatermarkLayer,
  Anchor,
  TileMode,
  TextEffect,
  LogoEffect,
  TextAlign,
} from './types';
import { LogoItem, logoItemToImage } from '../logoLibrary';

/**
 * Export options for watermarked images
 */
export interface ExportOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0.0 to 1.0
  scale?: number; // For preview vs full-res (0.1 to 1.0)
  returnDataUrl?: boolean;
}

/**
 * Load an image from a File or data URL
 */
export async function loadImage(source: File | string | HTMLImageElement): Promise<HTMLImageElement> {
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
 * Ensure font is loaded before rendering
 */
async function ensureFontLoaded(
  fontFamily: string,
  weight: string | number = 'normal',
  style: string = 'normal'
): Promise<boolean> {
  // Check if browser supports Font Loading API
  if (!document.fonts) {
    return true; // Assume loaded if API not available
  }

  const fontString = `${style} ${weight} 16px "${fontFamily}"`;
  
  try {
    await document.fonts.load(fontString);
    return document.fonts.check(fontString);
  } catch (error) {
    console.warn(`Failed to load font: ${fontFamily}`, error);
    return false;
  }
}

/**
 * Preload all fonts used in layers
 */
export async function preloadAllFonts(layers: WatermarkLayer[]): Promise<void> {
  const fonts = new Set<string>();
  
  layers.forEach(layer => {
    if (layer.type === 'text' && layer.fontFamily) {
      const fontString = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} 16px "${layer.fontFamily}"`;
      fonts.add(fontString);
    }
  });

  const loadPromises = Array.from(fonts).map(font => 
    document.fonts?.load(font).catch(err => {
      console.warn(`Failed to load font: ${font}`, err);
    })
  );

  await Promise.all(loadPromises);
  console.log('All fonts preloaded successfully');
}

/**
 * Calculate anchor point coordinates
 */
function getAnchorPoint(
  anchor: Anchor,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  switch (anchor) {
    case Anchor.TOP_LEFT:
      return { x: 0, y: 0 };
    case Anchor.TOP_RIGHT:
      return { x: canvasWidth, y: 0 };
    case Anchor.BOTTOM_LEFT:
      return { x: 0, y: canvasHeight };
    case Anchor.BOTTOM_RIGHT:
      return { x: canvasWidth, y: canvasHeight };
    case Anchor.CENTER:
      return { x: canvasWidth / 2, y: canvasHeight / 2 };
  }
}

/**
 * Measure text dimensions accurately
 */
function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight?: string | number,
  fontStyle?: string
): { width: number; height: number; ascent: number; descent: number } {
  const weight = fontWeight || 'normal';
  const style = fontStyle || 'normal';
  ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  return {
    width: metrics.width,
    height: fontSize * 1.2, // Approximate
    ascent: metrics.actualBoundingBoxAscent || fontSize * 0.8,
    descent: metrics.actualBoundingBoxDescent || fontSize * 0.2,
  };
}

/**
 * Render text with effects and high-quality rendering
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
  secondaryColor: string | undefined,
  effect: TextEffect,
  textAlign: TextAlign
): Promise<void> {
  // Ensure font is loaded
  let actualFontFamily = fontFamily;
  const fontLoaded = await ensureFontLoaded(fontFamily, fontWeight, fontStyle);
  
  if (!fontLoaded) {
    console.warn(`Font ${fontFamily} not loaded, using fallback`);
    actualFontFamily = 'Arial, sans-serif';
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Set font
  const weight = fontWeight || 'normal';
  const style = fontStyle || 'normal';
  ctx.font = `${style} ${weight} ${fontSize}px ${actualFontFamily}`;
  ctx.textAlign = textAlign as CanvasTextAlign;
  ctx.textBaseline = 'alphabetic';

  // Set text position based on alignment
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
      // Improved outline rendering with smoother edges
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = secondaryColor || '#000000';
      ctx.lineWidth = Math.max(2, fontSize * 0.1); // Increased from 0.08
      ctx.strokeText(text, textX, y);
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      break;

    case TextEffect.SHADOW:
      // Improved shadow with better visibility
      ctx.shadowColor = secondaryColor || 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = fontSize * 0.2; // Increased from 0.15
      ctx.shadowOffsetX = fontSize * 0.05; // Increased from 0.03
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      break;

    case TextEffect.GLOW:
      // Draw multiple glow layers, then text
      const glowColor = secondaryColor || color;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = fontSize * 0.3;
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y);
      ctx.shadowBlur = 0;
      break;

    case TextEffect.GRADIENT:
      // Create gradient
      const gradient = ctx.createLinearGradient(x, y - fontSize, x, y);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, secondaryColor || color);
      ctx.fillStyle = gradient;
      ctx.fillText(text, textX, y);
      break;
  }
}

/**
 * Render a single text layer
 */
async function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1.0
): Promise<void> {
  if (!layer.text) return;

  const anchorPoint = getAnchorPoint(layer.anchor, canvasWidth, canvasHeight);
  const offsetX = (layer.offsetX / 100) * canvasWidth;
  const offsetY = (layer.offsetY / 100) * canvasHeight;
  const baseX = anchorPoint.x + offsetX;
  const baseY = anchorPoint.y + offsetY;

  // Calculate font size (relative to image height)
  const fontSizeRelative = layer.fontSizeRelative || 5; // Default 5% of image height
  const fontSize = (canvasHeight * fontSizeRelative / 100) * layer.scale * scale;

  ctx.save();
  ctx.globalAlpha = layer.opacity;

  // Move to position
  ctx.translate(baseX, baseY);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  // Render text
  const fontFamily = layer.fontFamily || 'Inter';
  const fontWeight = layer.fontWeight || 'normal';
  const fontStyle = layer.fontStyle || 'normal';
  const color = layer.color || '#ffffff';
  const secondaryColor = layer.secondaryColor;
  const effect = (layer.effect as TextEffect) || TextEffect.SOLID;
  const textAlign = layer.textAlign || TextAlign.LEFT;

  await renderTextWithEffect(
    ctx,
    layer.text,
    0,
    fontSize, // Baseline position
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    color,
    secondaryColor,
    effect,
    textAlign
  );

  ctx.restore();
}

/**
 * Render a single logo layer
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

  const anchorPoint = getAnchorPoint(layer.anchor, canvasWidth, canvasHeight);
  const offsetX = (layer.offsetX / 100) * canvasWidth;
  const offsetY = (layer.offsetY / 100) * canvasHeight;
  const baseX = anchorPoint.x + offsetX;
  const baseY = anchorPoint.y + offsetY;

  // Calculate logo size
  const naturalWidth = layer.naturalLogoWidth || logoImage.width;
  const naturalHeight = layer.naturalLogoHeight || logoImage.height;
  const logoScale = layer.scale * scale;
  const logoWidth = naturalWidth * logoScale;
  const logoHeight = naturalHeight * logoScale;

  ctx.save();
  ctx.globalAlpha = layer.opacity;

  // Move to position
  ctx.translate(baseX, baseY);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  // Draw background box if enabled
  if (layer.backgroundBox) {
    const padding = (layer.boxPadding || 10) * logoScale;
    const borderRadius = (layer.boxBorderRadius || 5) * logoScale;
    const boxWidth = logoWidth + padding * 2;
    const boxHeight = logoHeight + padding * 2;
    const boxX = -boxWidth / 2;
    const boxY = -boxHeight / 2;

    ctx.globalAlpha = (layer.boxOpacity || 0.8) * layer.opacity;
    ctx.fillStyle = layer.boxColor || '#000000';
    
    if (borderRadius > 0) {
      // Draw rounded rectangle manually for compatibility
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
  ctx.globalAlpha = layer.opacity;
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
 * Render tiled text
 */
async function renderTiledText(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1.0
): Promise<void> {
  if (!layer.text || layer.tileMode === TileMode.NONE) {
    await renderTextLayer(ctx, layer, canvasWidth, canvasHeight, scale);
    return;
  }

  // Measure text dimensions
  const fontSizeRelative = layer.fontSizeRelative || 5;
  const fontSize = (canvasHeight * fontSizeRelative / 100) * layer.scale * scale;
  const fontFamily = layer.fontFamily || 'Inter';
  const fontWeight = layer.fontWeight || 'normal';
  const fontStyle = layer.fontStyle || 'normal';

  const tempCtx = document.createElement('canvas').getContext('2d');
  if (!tempCtx) return;
  const metrics = measureText(tempCtx, layer.text, fontFamily, fontSize, fontWeight, fontStyle);
  const textWidth = metrics.width;
  const textHeight = metrics.height;

  const spacing = layer.tileSpacing || 1.5;
  const spacingX = textWidth * spacing;
  const spacingY = textHeight * spacing;

  if (layer.tileMode === TileMode.STRAIGHT) {
    // Grid tiling
    for (let y = 0; y < canvasHeight + spacingY; y += spacingY) {
      for (let x = 0; x < canvasWidth + spacingX; x += spacingX) {
        const anchorPoint = getAnchorPoint(layer.anchor, 0, 0);
        const offsetX = (layer.offsetX / 100) * canvasWidth;
        const offsetY = (layer.offsetY / 100) * canvasHeight;
        const baseX = anchorPoint.x + offsetX + x;
        const baseY = anchorPoint.y + offsetY + y;

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(baseX, baseY);
        ctx.rotate((layer.rotation * Math.PI) / 180);

        const color = layer.color || '#ffffff';
        const secondaryColor = layer.secondaryColor;
        const effect = (layer.effect as TextEffect) || TextEffect.SOLID;
        const textAlign = layer.textAlign || TextAlign.LEFT;

        await renderTextWithEffect(
          ctx,
          layer.text,
          0,
          fontSize,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          color,
          secondaryColor,
          effect,
          textAlign
        );

        ctx.restore();
      }
    }
  } else if (layer.tileMode === TileMode.DIAGONAL) {
    // Diagonal tiling
    const diagonalSpacing = Math.sqrt(spacingX * spacingX + spacingY * spacingY);
    const angle = Math.atan2(canvasHeight, canvasWidth);
    
    for (let d = -canvasWidth - canvasHeight; d < canvasWidth + canvasHeight; d += diagonalSpacing) {
      const x = d * Math.cos(angle);
      const y = d * Math.sin(angle);

      const anchorPoint = getAnchorPoint(layer.anchor, 0, 0);
      const offsetX = (layer.offsetX / 100) * canvasWidth;
      const offsetY = (layer.offsetY / 100) * canvasHeight;
      const baseX = anchorPoint.x + offsetX + x;
      const baseY = anchorPoint.y + offsetY + y;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(baseX, baseY);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      const color = layer.color || '#ffffff';
      const secondaryColor = layer.secondaryColor;
      const effect = (layer.effect as TextEffect) || TextEffect.SOLID;
      const textAlign = layer.textAlign || TextAlign.LEFT;

      await renderTextWithEffect(
        ctx,
        layer.text,
        0,
        fontSize,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        color,
        secondaryColor,
        effect,
        textAlign
      );

      ctx.restore();
    }
  }
}

/**
 * Render a single layer
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

  if (layer.type === 'text') {
    if (layer.tileMode === TileMode.NONE) {
      await renderTextLayer(ctx, layer, canvasWidth, canvasHeight, scale);
    } else {
      await renderTiledText(ctx, layer, canvasWidth, canvasHeight, scale);
    }
  } else if (layer.type === 'logo') {
    await renderLogoLayer(ctx, layer, canvasWidth, canvasHeight, logoImage, scale);
  }
}

/**
 * Apply watermarks to an image with configurable export options
 * 
 * DEPRECATED: This function is kept for backward compatibility.
 * New code should use renderWatermarkedCanvas from render.ts
 * 
 * @param sourceImage - The source image (File, data URL, or HTMLImageElement)
 * @param layers - Array of WatermarkLayer objects (sorted by zIndex)
 * @param logoLibrary - Map of logoId to LogoItem for resolving logo images
 * @param options - Export options (format, quality, scale, returnDataUrl)
 * @returns Promise resolving to Blob (for export) or data URL (for preview)
 */
export async function applyWatermarkLayers(
  sourceImage: File | string | HTMLImageElement,
  layers: WatermarkLayer[],
  logoLibrary: Map<string, LogoItem> = new Map(),
  options: ExportOptions = {}
): Promise<Blob | string> {
  // Re-export from new render module for consistency
  const { renderWatermarkedCanvas } = await import('./render');
  return renderWatermarkedCanvas(
    sourceImage,
    layers,
    undefined, // Use image dimensions
    undefined,
    options,
    logoLibrary
  );
}
