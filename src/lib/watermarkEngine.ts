/**
 * Watermark Engine - Client-side watermark rendering utility
 * 
 * Layer-based watermark system with drag placement and advanced controls
 */

export enum Anchor {
  TOP_LEFT = 'TOP_LEFT',
  TOP_RIGHT = 'TOP_RIGHT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
  CENTER = 'CENTER',
}

export enum TileMode {
  NONE = 'none',
  // Placeholder for future tile modes
}

export interface WatermarkLayer {
  id: string;
  type: 'text' | 'logo';
  anchor: Anchor;
  offsetX: number; // Percentage of image width (-50 to 50)
  offsetY: number; // Percentage of image height (-50 to 50)
  scale: number; // Scale factor (0.1 to 5.0)
  rotation: number; // Rotation in degrees (0-360)
  opacity: number; // Opacity (0.0-1.0)
  tileMode: TileMode;
  effect: string; // Placeholder for future effects
  
  // Text layer properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  
  // Logo layer properties
  logoImage?: HTMLImageElement | null;
}

// Legacy support - keep for backward compatibility during migration
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
 * Render a single watermark layer onto canvas
 */
function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1.0
): void {
  // Get anchor point
  const anchorPoint = getAnchorPoint(layer.anchor, canvasWidth, canvasHeight);
  
  // Calculate position with offsets (as percentages)
  const offsetX = (layer.offsetX / 100) * canvasWidth;
  const offsetY = (layer.offsetY / 100) * canvasHeight;
  const baseX = anchorPoint.x + offsetX;
  const baseY = anchorPoint.y + offsetY;
  
  // Set opacity
  ctx.globalAlpha = layer.opacity;
  
  // Save context for transformations
  ctx.save();
  
  // Move to layer position
  ctx.translate(baseX, baseY);
  
  // Apply rotation
  const rotationRad = (layer.rotation * Math.PI) / 180;
  ctx.rotate(rotationRad);
  
  // Apply scale
  const finalScale = layer.scale * scale;
  ctx.scale(finalScale, finalScale);
  
  if (layer.type === 'text' && layer.text) {
    // Render text layer
    const fontSize = (layer.fontSize || 24) * scale;
    ctx.font = `${fontSize}px ${layer.fontFamily || 'Inter'}`;
    ctx.fillStyle = layer.color || '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, fontSize * 0.05);
    
    // Draw text with outline for visibility
    ctx.strokeText(layer.text, 0, fontSize);
    ctx.fillText(layer.text, 0, fontSize);
  } else if (layer.type === 'logo' && layer.logoImage) {
    // Render logo layer
    const logoWidth = layer.logoImage.width;
    const logoHeight = layer.logoImage.height;
    
    // Center the logo at origin (since we're already translated)
    ctx.drawImage(
      layer.logoImage,
      -logoWidth / 2,
      -logoHeight / 2,
      logoWidth,
      logoHeight
    );
  }
  
  // Restore context
  ctx.restore();
  ctx.globalAlpha = 1.0;
}

/**
 * Apply watermarks (layers) to an image
 * 
 * @param sourceImage - The source image (File, data URL, or HTMLImageElement)
 * @param layers - Array of WatermarkLayer objects
 * @param returnDataUrl - If true, returns data URL; otherwise returns Blob
 * @param scale - Optional scale factor for preview (1.0 = full resolution)
 * @returns Promise resolving to Blob (for export) or data URL (for preview)
 */
export async function applyWatermarkLayers(
  sourceImage: File | string | HTMLImageElement,
  layers: WatermarkLayer[],
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

  // Render each layer
  for (const layer of layers) {
    if (layer.tileMode === TileMode.NONE) {
      renderLayer(ctx, layer, width, height, scale);
    }
    // Future: handle other tile modes here
  }

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

/**
 * Legacy function for backward compatibility
 * Converts old WatermarkConfig to WatermarkLayer array
 */
export function configToLayers(config: WatermarkConfig): WatermarkLayer[] {
  const layers: WatermarkLayer[] = [];
  
  const anchorMap: Record<WatermarkPosition, Anchor> = {
    'top-left': Anchor.TOP_LEFT,
    'top-right': Anchor.TOP_RIGHT,
    'bottom-left': Anchor.BOTTOM_LEFT,
    'bottom-right': Anchor.BOTTOM_RIGHT,
    'center': Anchor.CENTER,
  };
  
  if (config.mode === 'text' || config.mode === 'text+logo') {
    layers.push({
      id: `text-${Date.now()}`,
      type: 'text',
      anchor: anchorMap[config.position],
      offsetX: (config.marginX / 100) * 10, // Rough conversion from pixels to percentage
      offsetY: (config.marginY / 100) * 10,
      scale: 1.0,
      rotation: 0,
      opacity: config.opacity,
      tileMode: TileMode.NONE,
      effect: '',
      text: config.text,
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      color: '#ffffff',
    });
  }
  
  if (config.mode === 'logo' || config.mode === 'text+logo') {
    if (config.logoImage) {
      layers.push({
        id: `logo-${Date.now()}`,
        type: 'logo',
        anchor: anchorMap[config.position],
        offsetX: (config.marginX / 100) * 10,
        offsetY: (config.marginY / 100) * 10,
        scale: 1.0,
        rotation: 0,
        opacity: config.opacity,
        tileMode: TileMode.NONE,
        effect: '',
        logoImage: config.logoImage,
      });
    }
  }
  
  return layers;
}

/**
 * Legacy applyWatermark function for backward compatibility
 */
export async function applyWatermark(
  sourceImage: File | string | HTMLImageElement,
  config: WatermarkConfig,
  returnDataUrl: boolean = false,
  scale: number = 1.0
): Promise<Blob | string> {
  const layers = configToLayers(config);
  return applyWatermarkLayers(sourceImage, layers, returnDataUrl, scale);
}
