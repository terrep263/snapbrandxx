/**
 * Tiling Controls - UI for configuring tiled/repeating watermarks
 */

'use client';

import { TilingConfig } from '@/lib/watermark/types';

interface TilingControlsProps {
  tiling: TilingConfig | undefined;
  onUpdate: (tiling: TilingConfig) => void;
}

export default function TilingControls({ tiling, onUpdate }: TilingControlsProps) {
  const enabled = tiling?.enabled || false;

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase">Tiling</h4>
      
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onUpdate({
              enabled: e.target.checked,
              spacing: tiling?.spacing || 0.1,
              opacity: tiling?.opacity || 0.3,
              rotation: tiling?.rotation || -45
            })}
            className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500 focus:ring-2"
          />
          <span className="text-xs text-gray-300">Tile Watermark Across Image</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Repeat watermark pattern across entire image (like Getty Images, Shutterstock)
        </p>
      </div>
      
      {enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-gray-700">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Spacing</label>
              <span className="text-xs text-gray-400 font-mono">
                {Math.round((tiling?.spacing || 0.1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={(tiling?.spacing || 0.1) * 100}
              onChange={(e) => onUpdate({
                ...tiling!,
                spacing: Number(e.target.value) / 100
              })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <p className="text-xs text-gray-500 mt-1">Space between tiles</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Tile Opacity</label>
              <span className="text-xs text-gray-400 font-mono">
                {Math.round((tiling?.opacity || 0.3) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={(tiling?.opacity || 0.3) * 100}
              onChange={(e) => onUpdate({
                ...tiling!,
                opacity: Number(e.target.value) / 100
              })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <p className="text-xs text-gray-500 mt-1">Transparency of tiled watermarks</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Rotation</label>
              <span className="text-xs text-gray-400 font-mono">
                {tiling?.rotation || -45}°
              </span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={tiling?.rotation || -45}
              onChange={(e) => onUpdate({
                ...tiling!,
                rotation: Number(e.target.value)
              })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <p className="text-xs text-gray-500 mt-1">Rotation angle for all tiles</p>
          </div>
        </div>
      )}
    </div>
  );
}

