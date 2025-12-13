/**
 * Position Presets - Quick placement positions for watermarks
 */

import { WatermarkLayer } from './types';

export type PositionPreset = 
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PresetPosition {
  xNorm: number;
  yNorm: number;
}

export const POSITION_PRESETS: Record<PositionPreset, PresetPosition> = {
  'top-left': { xNorm: 0.05, yNorm: 0.05 },
  'top-center': { xNorm: 0.5, yNorm: 0.05 },
  'top-right': { xNorm: 0.95, yNorm: 0.05 },
  'middle-left': { xNorm: 0.05, yNorm: 0.5 },
  'center': { xNorm: 0.5, yNorm: 0.5 },
  'middle-right': { xNorm: 0.95, yNorm: 0.5 },
  'bottom-left': { xNorm: 0.05, yNorm: 0.95 },
  'bottom-center': { xNorm: 0.5, yNorm: 0.95 },
  'bottom-right': { xNorm: 0.95, yNorm: 0.95 },
};

export function applyPositionPreset(
  layer: WatermarkLayer,
  preset: PositionPreset
): WatermarkLayer {
  const position = POSITION_PRESETS[preset];
  
  return {
    ...layer,
    xNorm: position.xNorm,
    yNorm: position.yNorm,
    anchor: 'CENTER' as any, // Ensure anchor is CENTER for normalized coordinates
  };
}

