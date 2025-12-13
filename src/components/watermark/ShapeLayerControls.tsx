/**
 * Shape Layer Controls - UI for editing shape layer properties
 */

'use client';

import { WatermarkLayer, ShapeType } from '@/lib/watermark/types';

interface ShapeLayerControlsProps {
  layer: WatermarkLayer;
  onUpdate: (updates: Partial<WatermarkLayer>) => void;
}

export default function ShapeLayerControls({ layer, onUpdate }: ShapeLayerControlsProps) {
  if (layer.type !== 'shape') return null;

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase">Shape</h4>
      
      {/* Shape Type Selector */}
      <div>
        <label className="block text-xs text-gray-300 mb-2">Shape Type</label>
        <select
          value={layer.shapeType || ShapeType.RECTANGLE}
          onChange={(e) => onUpdate({ shapeType: e.target.value as ShapeType })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-red-500"
        >
          <option value={ShapeType.RECTANGLE}>Rectangle</option>
          <option value={ShapeType.ROUNDED_RECTANGLE}>Rounded Rectangle</option>
          <option value={ShapeType.CIRCLE}>Circle</option>
          <option value={ShapeType.LINE}>Line</option>
        </select>
      </div>
      
      {/* Fill Color */}
      <div>
        <label className="block text-xs text-gray-300 mb-2">Fill Color</label>
        <input
          type="color"
          value={layer.fillColor || '#000000'}
          onChange={(e) => onUpdate({ fillColor: e.target.value })}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>
      
      {/* Fill Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-300">Fill Opacity</label>
          <span className="text-xs text-gray-400 font-mono">
            {Math.round((layer.fillOpacity || 0.6) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={(layer.fillOpacity || 0.6) * 100}
          onChange={(e) => onUpdate({ fillOpacity: Number(e.target.value) / 100 })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </div>
      
      {/* Corner Radius (only for rounded rectangles) */}
      {layer.shapeType === ShapeType.ROUNDED_RECTANGLE && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-300">Corner Radius</label>
            <span className="text-xs text-gray-400 font-mono">
              {layer.cornerRadius || 8}px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={layer.cornerRadius || 8}
            onChange={(e) => onUpdate({ cornerRadius: Number(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>
      )}
      
      {/* Stroke/Border */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!layer.strokeWidth && layer.strokeWidth > 0}
            onChange={(e) => onUpdate({ strokeWidth: e.target.checked ? 2 : 0 })}
            className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500 focus:ring-2"
          />
          <span className="text-xs text-gray-300">Add Border</span>
        </label>
        
        {layer.strokeWidth && layer.strokeWidth > 0 && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Border Color</label>
              <input
                type="color"
                value={layer.strokeColor || '#000000'}
                onChange={(e) => onUpdate({ strokeColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-300">Border Width</label>
                <span className="text-xs text-gray-400 font-mono">
                  {layer.strokeWidth}px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={layer.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

