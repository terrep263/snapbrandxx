/**
 * Watermark Engine - Client-side watermark rendering utility
 * 
 * This module provides pure functions for applying watermarks to images
 * using HTML5 Canvas. Used for both previews and final export.
 */

export type WatermarkMode = 'text' | 'logo' | 'text+logo';

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkConfig {
  mode: WatermarkMode;
  text: string;
  fontFamily: string;
  fontSize: number;
  opacity: number;
  position: WatermarkPosition;
  marginX: number;
  marginY: number;
  logoImage?: HTMLImageElement | null;
}

export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalDataUrl: string;
  width: number;
  height: number;
  processedBlob?: Blob;
  processedDataUrl?: string;
  error?: string;
}

/**
 * Load an image from a File or data URL
 */
export async function loadImage(source: File | string): Promise<HTMLImageElement> {
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
 * Calculate watermark coordinates based on position and margins
 */
function calculateWatermarkPosition(
  position: WatermarkPosition,
  marginX: number,
  marginY: number,
  canvasWidth: number,
  canvasHeight: number,
  watermarkWidth: number,
  watermarkHeight: number
): { x: number; y: number } {
  let x = 0;
  let y = 0;

  switch (position) {
    case 'top-left':
      x = marginX;
      y = marginY;
      break;
    case 'top-right':
      x = canvasWidth - watermarkWidth - marginX;
      y = marginY;
      break;
    case 'bottom-left':
      x = marginX;
      y = canvasHeight - watermarkHeight - marginY;
      break;
    case 'bottom-right':
      x = canvasWidth - watermarkWidth - marginX;
      y = canvasHeight - watermarkHeight - marginY;
      break;
    case 'center':
      x = (canvasWidth - watermarkWidth) / 2;
      y = (canvasHeight - watermarkHeight) / 2;
      break;
  }

  return { x, y };
}

/**
 * Measure text dimensions
 */
function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  fontSize: number
): { width: number; height: number } {
  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: fontSize, // Approximate height
  };
}

/**
 * Apply watermark to an image
 * 
 * @param sourceImage - The source image (File, data URL, or HTMLImageElement)
 * @param config - Watermark configuration
 * @param scale - Optional scale factor for preview (1.0 = full resolution)
 * @returns Promise resolving to Blob (for export) or data URL (for preview)
 */
export async function applyWatermark(
  sourceImage: File | string | HTMLImageElement,
  config: WatermarkConfig,
  returnDataUrl: boolean = false,
  scale: number = 1.0
): Promise<Blob | string> {
  // Load the source image if needed
  let img: HTMLImageElement;
  if (sourceImage instanceof HTMLImageElement) {
    img = sourceImage;
  } else {
    img = await loadImage(sourceImage);
  }

  // Create canvas at full or scaled resolution
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const width = Math.floor(img.width * scale);
  const height = Math.floor(img.height * scale);
  canvas.width = width;
  canvas.height = height;

  // Draw the original image
  ctx.drawImage(img, 0, 0, width, height);

  // Calculate watermark dimensions and position
  let watermarkWidth = 0;
  let watermarkHeight = 0;
  const scaledFontSize = config.fontSize * scale;
  const scaledMarginX = config.marginX * scale;
  const scaledMarginY = config.marginY * scale;

  // Measure text if needed
  if (config.mode === 'text' || config.mode === 'text+logo') {
    ctx.font = `${scaledFontSize}px ${config.fontFamily}`;
    const textMetrics = measureText(ctx, config.text, config.fontFamily, scaledFontSize);
    watermarkWidth = textMetrics.width;
    watermarkHeight = textMetrics.height;
  }

  // Add logo dimensions if needed
  if (config.mode === 'logo' || config.mode === 'text+logo') {
    if (config.logoImage) {
      const logoScale = Math.min(
        (width * 0.2) / config.logoImage.width,
        (height * 0.2) / config.logoImage.height,
        1.0
      );
      const logoWidth = config.logoImage.width * logoScale;
      const logoHeight = config.logoImage.height * logoScale;

      if (config.mode === 'text+logo') {
        // Place text and logo side by side
        watermarkWidth += logoWidth + scaledFontSize * 0.5; // Add spacing
        watermarkHeight = Math.max(watermarkHeight, logoHeight);
      } else {
        watermarkWidth = logoWidth;
        watermarkHeight = logoHeight;
      }
    }
  }

  // Calculate position
  const { x, y } = calculateWatermarkPosition(
    config.position,
    scaledMarginX,
    scaledMarginY,
    width,
    height,
    watermarkWidth,
    watermarkHeight
  );

  // Set opacity
  ctx.globalAlpha = config.opacity;

  // Draw watermark based on mode
  if (config.mode === 'text' || config.mode === 'text+logo') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, scaledFontSize * 0.05);
    ctx.font = `${scaledFontSize}px ${config.fontFamily}`;
    
    // Draw text with outline for visibility
    ctx.strokeText(config.text, x, y + scaledFontSize);
    ctx.fillText(config.text, x, y + scaledFontSize);
  }

  if (config.mode === 'logo' || config.mode === 'text+logo') {
    if (config.logoImage) {
      const logoScale = Math.min(
        (width * 0.2) / config.logoImage.width,
        (height * 0.2) / config.logoImage.height,
        1.0
      );
      const logoWidth = config.logoImage.width * logoScale;
      const logoHeight = config.logoImage.height * logoScale;

      let logoX = x;
      let logoY = y;

      if (config.mode === 'text+logo') {
        // Place logo next to text
        ctx.font = `${scaledFontSize}px ${config.fontFamily}`;
        const textWidth = ctx.measureText(config.text).width;
        logoX = x + textWidth + scaledFontSize * 0.5;
        logoY = y + (watermarkHeight - logoHeight) / 2;
      }

      ctx.drawImage(config.logoImage, logoX, logoY, logoWidth, logoHeight);
    }
  }

  // Reset opacity
  ctx.globalAlpha = 1.0;

  // Return result
  if (returnDataUrl) {
    return canvas.toDataURL('image/jpeg', 0.92);
  } else {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            throw new Error('Failed to create blob');
          }
        },
        'image/jpeg',
        0.92
      );
    });
  }
}

