/**
 * Core Data Models for Professional Watermarking System
 * 
 * Unified layer-based architecture for text and logo watermarks
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
  STRAIGHT = 'straight',
  DIAGONAL = 'diagonal',
}

export enum TextEffect {
  SOLID = 'solid',
  OUTLINE = 'outline',
  SHADOW = 'shadow',
  GLOW = 'glow',
  GRADIENT = 'gradient',
}

export enum LogoEffect {
  SOLID = 'solid',
  SHADOW = 'shadow',
  BOX = 'box',
}

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

/**
 * Unified WatermarkLayer model for both text and logo layers
 */
export interface WatermarkLayer {
  // Core properties
  id: string;
  type: 'text' | 'logo';
  zIndex: number; // Stacking order (lower = behind)
  enabled: boolean; // Can be toggled on/off
  
  // Positioning
  anchor: Anchor;
  offsetX: number; // Percentage of image width (-100 to 100)
  offsetY: number; // Percentage of image height (-100 to 100)
  
  // Transform
  scale: number; // Relative multiplier (0.2 to 3.0)
  rotation: number; // Rotation in degrees (0-360)
  opacity: number; // Opacity (0.0-1.0)
  
  // Tiling (text only in MVP)
  tileMode: TileMode;
  tileSpacing?: number; // Spacing factor for tiling (0.5 to 3.0)
  
  // Effects
  effect: string; // TextEffect or LogoEffect enum value
  
  // Text layer properties
  text?: string;
  fontFamily?: string;
  fontWeight?: string | number; // 'normal', 'bold', 100-900
  fontStyle?: string; // 'normal', 'italic'
  fontSizeRelative?: number; // Percentage of image height (e.g., 5 = 5% of image height)
  textAlign?: TextAlign;
  color?: string; // Primary color (hex)
  secondaryColor?: string; // For gradient effect (hex)
  
  // Logo layer properties
  logoId?: string; // Reference to logo library
  naturalLogoWidth?: number; // Original logo width for scaling
  naturalLogoHeight?: number; // Original logo height for scaling
  backgroundBox?: boolean; // Draw box behind logo
  boxOpacity?: number; // Box opacity (0.0-1.0)
  boxColor?: string; // Box fill color (hex)
  boxPadding?: number; // Padding around logo in pixels
  boxBorderRadius?: number; // Border radius in pixels
}

/**
 * Brand Profile - Reusable brand information
 */
export interface BrandProfile {
  id: string;
  name: string;
  primaryColor: string; // Hex color
  secondaryColor?: string; // Hex color
  website?: string;
  handle?: string; // Social handle
  defaultFonts?: string[]; // Array of font family names
  defaultLogoId?: string; // Reference to logo library
  metadata?: Record<string, any>; // Additional metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Template (Group) - Reusable watermark layouts
 */
export interface Template {
  id: string;
  name: string;
  description?: string;
  brandProfileId?: string; // Optional association with brand
  layers: WatermarkLayer[]; // Array of layer configs
  isBuiltIn: boolean; // Built-in vs user-created
  createdAt?: number;
  updatedAt?: number;
  // Text layers can include placeholders: {NAME}, {TITLE}, {WEBSITE}, {HANDLE}
}

/**
 * Logo Library Item (compatible with existing logoLibrary.ts)
 */
export interface LogoItem {
  id: string;
  name: string;
  imageData: string; // Data URL (compatible with existing)
  storageLocation?: string; // URL or data URL (for future use)
  metadata?: {
    dominantBackground?: 'light' | 'dark'; // For contrast detection
    width?: number;
    height?: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Job State - Current watermarking job
 */
export interface Job {
  id: string;
  images: ProcessedImage[];
  globalLayers: WatermarkLayer[]; // Default layers for all images
  overrides: Record<string, WatermarkLayer[]>; // Per-image overrides: imageId -> layers
  brandProfileId?: string; // Associated brand profile
  templateId?: string; // Applied template
  createdAt: number;
  updatedAt: number;
}

/**
 * Processed Image
 */
export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalDataUrl: string;
  width: number;
  height: number;
  orientation?: number; // EXIF orientation
  processedBlob?: Blob;
  processedDataUrl?: string;
  error?: string;
}

/**
 * Text Preset - Quick appearance presets
 */
export interface TextPreset {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  effect: TextEffect;
  description?: string;
}

/**
 * Default text presets
 */
export const DEFAULT_TEXT_PRESETS: TextPreset[] = [
  {
    id: 'white-shadow',
    name: 'White with Dark Shadow',
    color: '#ffffff',
    effect: TextEffect.SHADOW,
    description: 'White text with dark shadow for visibility',
  },
  {
    id: 'black-glow',
    name: 'Black with Light Glow',
    color: '#000000',
    effect: TextEffect.GLOW,
    description: 'Black text with light glow',
  },
  {
    id: 'white-outline',
    name: 'White with Outline',
    color: '#ffffff',
    effect: TextEffect.OUTLINE,
    description: 'White text with dark outline',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    color: '#ffffff',
    secondaryColor: '#000000',
    effect: TextEffect.GRADIENT,
    description: 'Gradient from primary to secondary color',
  },
];

