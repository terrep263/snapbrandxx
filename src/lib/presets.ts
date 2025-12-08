/**
 * Presets Management - localStorage-based preset storage
 * 
 * Handles saving and loading watermark presets for quick client-specific configurations
 */

import { WatermarkConfig } from './watermarkEngine';

export interface Preset {
  name: string;
  config: WatermarkConfig;
}

const PRESETS_STORAGE_KEY = 'snapbrandxx-ops-presets';

/**
 * Save a preset to localStorage
 */
export function savePreset(name: string, config: WatermarkConfig): void {
  const presets = loadAllPresets();
  const existingIndex = presets.findIndex((p) => p.name === name);
  
  const preset: Preset = { name, config };
  
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
export function loadPreset(name: string): WatermarkConfig | null {
  const presets = loadAllPresets();
  const preset = presets.find((p) => p.name === name);
  return preset ? preset.config : null;
}

/**
 * Delete a preset by name
 */
export function deletePreset(name: string): void {
  const presets = loadAllPresets();
  const filtered = presets.filter((p) => p.name !== name);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
}

