/**
 * Presets Management - localStorage-based preset storage
 * 
 * Handles saving and loading watermark layer presets for quick client-specific configurations
 */

import { WatermarkLayer } from './watermarkEngine';

export interface Preset {
  name: string;
  layers: WatermarkLayer[];
}

const PRESETS_STORAGE_KEY = 'snapbrandxx-ops-presets';

/**
 * Save a preset to localStorage
 */
export function savePreset(name: string, layers: WatermarkLayer[]): void {
  const presets = loadAllPresets();
  const existingIndex = presets.findIndex((p) => p.name === name);
  
  // Serialize layers, but exclude HTMLImageElement (can't be serialized)
  const serializableLayers = layers.map((layer) => {
    const { logoImage, ...rest } = layer;
    return {
      ...rest,
      logoImageDataUrl: logoImage ? null : null, // Will need to be reloaded
    };
  });
  
  const preset: Preset = { name, layers: serializableLayers as WatermarkLayer[] };
  
  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }
  
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Load all presets from localStorage
 */
export function loadAllPresets(): Preset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Preset[];
  } catch {
    return [];
  }
}

/**
 * Load a specific preset by name
 */
export function loadPreset(name: string): WatermarkLayer[] | null {
  const presets = loadAllPresets();
  const preset = presets.find((p) => p.name === name);
  return preset ? preset.layers : null;
}

/**
 * Delete a preset by name
 */
export function deletePreset(name: string): void {
  const presets = loadAllPresets();
  const filtered = presets.filter((p) => p.name !== name);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
}
