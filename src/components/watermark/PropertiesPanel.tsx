/**
 * Properties Panel - Right Sidebar
 * 
 * Interactive controls with sliders and dials for layer properties
 */

'use client';

import { WatermarkLayer, ProcessedImage, Anchor } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';
import RotationDial from './RotationDial';
import ColorPicker from './ColorPicker';

interface PropertiesPanelProps {
  selectedLayer: WatermarkLayer | null;
  image: ProcessedImage | null;
  onLayerUpdate: (layerId: string, updates: Partial<WatermarkLayer>) => void;
}

export default function PropertiesPanel({
  selectedLayer,
  image,
  onLayerUpdate,
}: PropertiesPanelProps) {
  const { logoLibrary } = useWatermark();

  if (!selectedLayer) {
    return (
      <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">Select a layer to edit</p>
            <p className="text-xs text-gray-600">Click a layer in the canvas or layers panel</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert normalized (0-1) to 0-100% UI values for display
  // Support both new (xNorm/yNorm) and legacy (offsetX/offsetY) formats
  const xNorm = selectedLayer.xNorm ?? ((selectedLayer.offsetX ?? 0) / 100 + 0.5);
  const yNorm = selectedLayer.yNorm ?? ((selectedLayer.offsetY ?? 0) / 100 + 0.5);
  const xFromLeftPct = xNorm * 100;
  const yFromTopPct = yNorm * 100;

  const handleXChange = (value: number) => {
    const xNorm = clamp(value, 0, 100) / 100;
    onLayerUpdate(selectedLayer.id, { xNorm, anchor: Anchor.CENTER });
  };

  const handleYChange = (value: number) => {
    const yNorm = clamp(value, 0, 100) / 100;
    onLayerUpdate(selectedLayer.id, { yNorm, anchor: Anchor.CENTER });
  };

  const handleScaleChange = (value: number) => {
    onLayerUpdate(selectedLayer.id, { scale: clamp(value, 0.1, 10) });
  };

  const handleRotationChange = (value: number) => {
    // Normalize to 0-360
    let rotation = value % 360;
    if (rotation < 0) rotation += 360;
    onLayerUpdate(selectedLayer.id, { rotation });
  };

  const handleOpacityChange = (value: number) => {
    onLayerUpdate(selectedLayer.id, { opacity: clamp(value, 0, 1) });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Properties</h3>
        <p className="text-xs text-gray-400 mt-1">
          {selectedLayer.type === 'text' ? 'Text Layer' : 'Logo Layer'}
        </p>
      </div>

      {/* Properties Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Text-specific Properties - Show first for text layers */}
        {selectedLayer.type === 'text' && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">Text</h4>
            
            <div>
              <label className="block text-xs text-gray-300 mb-2">Content</label>
              <textarea
                value={selectedLayer.text || ''}
                onChange={(e) => onLayerUpdate(selectedLayer.id, { text: e.target.value })}
                rows={4}
                placeholder="Enter text here..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-red-500 resize-y min-h-[80px]"
              />
            </div>
            
            {/* Text Width Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-300">Text Width (% of image)</label>
                <span className="text-xs text-gray-400 font-mono">
                  {selectedLayer.textWidthPercent ? selectedLayer.textWidthPercent.toFixed(1) : 'Auto'}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={selectedLayer.textWidthPercent ?? 50}
                onChange={(e) => onLayerUpdate(selectedLayer.id, { textWidthPercent: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${((selectedLayer.textWidthPercent ?? 50) / 100) * 100}%, #374151 ${((selectedLayer.textWidthPercent ?? 50) / 100) * 100}%, #374151 100%)`
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedLayer.textWidthPercent ? 'Text will wrap at this width' : 'Auto: Text wraps to fit content'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-300">Font Size</label>
                <span className="text-xs text-gray-400 font-mono">{selectedLayer.fontSizeRelative?.toFixed(1) || 5}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.1"
                value={selectedLayer.fontSizeRelative || 5}
                onChange={(e) => onLayerUpdate(selectedLayer.id, { fontSizeRelative: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${((selectedLayer.fontSizeRelative || 5) / 50) * 100}%, #374151 ${((selectedLayer.fontSizeRelative || 5) / 50) * 100}%, #374151 100%)`
                }}
              />
            </div>

            <ColorPicker
              value={selectedLayer.color || '#ffffff'}
              onChange={(color) => onLayerUpdate(selectedLayer.id, { color })}
              label="Color"
            />

            <div>
              <label className="block text-xs text-gray-300 mb-2">Font Family</label>
              <select
                value={selectedLayer.fontFamily || 'Inter'}
                onChange={(e) => onLayerUpdate(selectedLayer.id, { fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-red-500"
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
          </div>
        )}

        {/* Logo-specific Properties */}
        {selectedLayer.type === 'logo' && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">Logo</h4>
            
            <div>
              <label className="block text-xs text-gray-300 mb-2">Logo</label>
              {selectedLayer.logoId && logoLibrary.has(selectedLayer.logoId) ? (
                <div className="p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300">
                  {logoLibrary.get(selectedLayer.logoId)?.name || 'Logo'}
                </div>
              ) : (
                <div className="p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-500">
                  No logo selected
                </div>
              )}
            </div>
          </div>
        )}

        {/* Position Controls */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase">Position</h4>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">X Position</label>
              <span className="text-xs text-gray-400 font-mono">{xFromLeftPct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={xFromLeftPct}
              onChange={(e) => handleXChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${xFromLeftPct}%, #374151 ${xFromLeftPct}%, #374151 100%)`
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Y Position</label>
              <span className="text-xs text-gray-400 font-mono">{yFromTopPct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={yFromTopPct}
              onChange={(e) => handleYChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${yFromTopPct}%, #374151 ${yFromTopPct}%, #374151 100%)`
              }}
            />
          </div>
        </div>

        {/* Transform Controls */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase">Transform</h4>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Scale</label>
              <span className="text-xs text-gray-400 font-mono">{selectedLayer.scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.01"
              value={selectedLayer.scale}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${((selectedLayer.scale - 0.1) / 9.9) * 100}%, #374151 ${((selectedLayer.scale - 0.1) / 9.9) * 100}%, #374151 100%)`
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-300">Rotation</label>
              <span className="text-xs text-gray-400 font-mono">{Math.round(selectedLayer.rotation)}°</span>
            </div>
            <div className="flex justify-center">
              <RotationDial
                value={selectedLayer.rotation}
                onChange={handleRotationChange}
                size={100}
              />
            </div>
          </div>

          {/* Scale Lock Checkbox */}
          <div className="flex items-center justify-between pt-2">
            <label className="text-xs text-gray-300">Lock size relative to image</label>
            <input
              type="checkbox"
              checked={selectedLayer.scaleLocked ?? false}
              onChange={(e) => onLayerUpdate(selectedLayer.id, { scaleLocked: e.target.checked })}
              className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500 focus:ring-2"
            />
          </div>
          {selectedLayer.scaleLocked && (
            <p className="text-xs text-gray-500 italic -mt-2">
              Keeps this watermark visually consistent across different image sizes
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-300">Opacity</label>
              <span className="text-xs text-gray-400 font-mono">{Math.round(selectedLayer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedLayer.opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${selectedLayer.opacity * 100}%, #374151 ${selectedLayer.opacity * 100}%, #374151 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
