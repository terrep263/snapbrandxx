/**
 * Watermark Groups/Templates System
 * Predefined and custom templates for watermark layouts
 */

import { WatermarkLayer, Anchor, TileMode } from './watermark/types';

export interface WatermarkGroup {
  id: string;
  name: string;
  description?: string;
  layers: WatermarkLayer[];
  isBuiltIn: boolean;
  createdAt?: number;
  updatedAt?: number;
}

const BUILT_IN_GROUPS: WatermarkGroup[] = [
  {
    id: 'logo-name-title',
    name: 'Logo + Name + Title',
    description: 'Logo at top, name and title below',
    isBuiltIn: true,
    layers: [
      {
        id: 'logo-1',
        type: 'logo',
        zIndex: 0,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.5, // Center horizontally
        yNorm: 0.6, // Slightly below center (offsetY: 10% = 0.6)
        offsetX: 0,
        offsetY: 10,
        scale: 1.0,
        rotation: 0,
        opacity: 0.8,
        tileMode: TileMode.NONE,
        effect: 'solid',
        logoId: 'placeholder', // Will be replaced when used
        naturalLogoWidth: 100,
        naturalLogoHeight: 100,
      },
      {
        id: 'text-name',
        type: 'text',
        zIndex: 1,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.5, // Center horizontally
        yNorm: 0.55, // Slightly below center (offsetY: 5% = 0.55)
        offsetX: 0,
        offsetY: 5,
        scale: 1.0,
        rotation: 0,
        opacity: 0.9,
        tileMode: TileMode.NONE,
        effect: 'solid',
        text: 'Your Name',
        fontFamily: 'Inter',
        fontSizeRelative: 4.0, // 4% of image height
        color: '#ffffff',
      },
      {
        id: 'text-title',
        type: 'text',
        zIndex: 2,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.5, // Center horizontally
        yNorm: 0.45, // Slightly above center (offsetY: -5% = 0.45)
        offsetX: 0,
        offsetY: -5,
        scale: 1.0,
        rotation: 0,
        opacity: 0.8,
        tileMode: TileMode.NONE,
        effect: 'solid',
        text: 'Your Title',
        fontFamily: 'Inter',
        fontSizeRelative: 3.0, // 3% of image height
        color: '#ffffff',
      },
    ],
  },
  {
    id: 'name-website',
    name: 'Name + Website',
    description: 'Name and website in bottom corner',
    isBuiltIn: true,
    layers: [
      {
        id: 'text-name',
        type: 'text',
        zIndex: 0,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.95, // Bottom-right area
        yNorm: 0.75, // Higher up (offsetY: -25% from bottom = 0.75)
        offsetX: -5,
        offsetY: -25,
        scale: 1.0,
        rotation: 0,
        opacity: 0.9,
        tileMode: TileMode.NONE,
        effect: 'solid',
        text: 'Your Name',
        fontFamily: 'Inter',
        fontSizeRelative: 3.5, // 3.5% of image height
        color: '#ffffff',
      },
      {
        id: 'text-website',
        type: 'text',
        zIndex: 1,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.95, // Bottom-right area
        yNorm: 0.95, // Bottom area (offsetY: -5% from bottom = 0.95)
        offsetX: -5,
        offsetY: -5,
        scale: 1.0,
        rotation: 0,
        opacity: 0.8,
        tileMode: TileMode.NONE,
        effect: 'solid',
        text: 'www.yoursite.com',
        fontFamily: 'Inter',
        fontSizeRelative: 2.5, // 2.5% of image height
        color: '#ffffff',
      },
    ],
  },
  {
    id: 'logo-bottom',
    name: 'Logo Bottom Right',
    description: 'Simple logo watermark in bottom right',
    isBuiltIn: true,
    layers: [
      {
        id: 'logo-1',
        type: 'logo',
        zIndex: 0,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.95, // Bottom-right area
        yNorm: 0.95, // Bottom area
        offsetX: -5,
        offsetY: -5,
        scale: 1.0,
        rotation: 0,
        opacity: 0.7,
        tileMode: TileMode.NONE,
        effect: 'solid',
        logoId: 'placeholder', // Will be replaced when used
        naturalLogoWidth: 100,
        naturalLogoHeight: 100,
      },
    ],
  },
  {
    id: 'text-bottom',
    name: 'Text Bottom Right',
    description: 'Simple text watermark in bottom right',
    isBuiltIn: true,
    layers: [
      {
        id: 'text-1',
        type: 'text',
        zIndex: 0,
        enabled: true,
        anchor: Anchor.CENTER,
        xNorm: 0.95, // Bottom-right area
        yNorm: 0.95, // Bottom area
        offsetX: -5,
        offsetY: -5,
        scale: 1.0,
        rotation: 0,
        opacity: 0.8,
        tileMode: TileMode.NONE,
        effect: 'solid',
        text: 'Your Brand',
        fontFamily: 'Inter',
        fontSizeRelative: 3.0, // 3% of image height
        color: '#ffffff',
      },
    ],
  },
];

const STORAGE_KEY = 'snapbrandxx-watermark-groups';

/**
 * Get all groups (built-in + custom)
 */
export function getAllGroups(): WatermarkGroup[] {
  const customGroups = getCustomGroups();
  return [...BUILT_IN_GROUPS, ...customGroups];
}

/**
 * Get custom groups from localStorage
 */
function getCustomGroups(): WatermarkGroup[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as WatermarkGroup[];
  } catch {
    return [];
  }
}

/**
 * Save a custom group
 */
export function saveCustomGroup(group: Omit<WatermarkGroup, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>): WatermarkGroup {
  const customGroups = getCustomGroups();
  const newGroup: WatermarkGroup = {
    ...group,
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  customGroups.push(newGroup);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customGroups));
  return newGroup;
}

/**
 * Delete a custom group
 */
export function deleteCustomGroup(id: string): void {
  const customGroups = getCustomGroups().filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customGroups));
}

/**
 * Clone layers from a group and replace placeholders
 */
export function cloneGroupLayers(
  group: WatermarkGroup,
  replacements: {
    name?: string;
    title?: string;
    website?: string;
    brand?: string;
    logoImage?: HTMLImageElement | null;
  }
): WatermarkLayer[] {
  return group.layers.map((layer, index) => {
    const cloned: WatermarkLayer = {
      ...layer,
      id: `${layer.id}-${Date.now()}-${index}`,
    };

    // Replace placeholder text
    if (cloned.type === 'text' && cloned.text) {
      if (cloned.text === 'Your Name' && replacements.name) {
        cloned.text = replacements.name;
      } else if (cloned.text === 'Your Title' && replacements.title) {
        cloned.text = replacements.title;
      } else if (cloned.text === 'www.yoursite.com' && replacements.website) {
        cloned.text = replacements.website;
      } else if (cloned.text === 'Your Brand' && replacements.brand) {
        cloned.text = replacements.brand;
      }
    }

    // Replace logo if provided (note: logoId should be passed instead of logoImage in future)
    if (cloned.type === 'logo' && replacements.logoImage) {
      // For now, we keep logoId as placeholder since we don't have logoId from HTMLImageElement
      // In the future, this should accept logoId directly
      cloned.naturalLogoWidth = replacements.logoImage.naturalWidth || 100;
      cloned.naturalLogoHeight = replacements.logoImage.naturalHeight || 100;
    }

    return cloned;
  });
}

