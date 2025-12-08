'use client';

import { WatermarkLayer, Anchor } from '@/lib/watermarkEngine';

interface LayerEditorPanelProps {
  layer: WatermarkLayer | null;
  onLayerUpdate: (layer: WatermarkLayer) => void;
  onDeleteLayer: (layerId: string) => void;
}

const FONT_OPTIONS = ['Inter', 'Roboto', 'Playfair Display', 'Arial', 'Helvetica', 'Times New Roman'];

export default function LayerEditorPanel({
  layer,
  onLayerUpdate,
  onDeleteLayer,
}: LayerEditorPanelProps) {
  if (!layer) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Layer Editor</h2>
        <p className="text-xs text-gray-500">Select a layer to edit</p>
      </div>
    );
  }

  const updateLayer = (updates: Partial<WatermarkLayer>) => {
    onLayerUpdate({ ...layer, ...updates });
  };

  const anchors = [
    { value: Anchor.TOP_LEFT, label: 'Top Left', icon: '↖' },
    { value: Anchor.TOP_RIGHT, label: 'Top Right', icon: '↗' },
    { value: Anchor.BOTTOM_LEFT, label: 'Bottom Left', icon: '↙' },
    { value: Anchor.BOTTOM_RIGHT, label: 'Bottom Right', icon: '↘' },
    { value: Anchor.CENTER, label: 'Center', icon: '○' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300">Layer Editor</h2>
        <button
          onClick={() => onDeleteLayer(layer.id)}
          className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-white rounded transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="space-y-4">
        {/* Layer Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <div className="px-3 py-2 bg-gray-800 rounded text-sm text-gray-300">
            {layer.type === 'text' ? 'Text' : 'Logo'}
          </div>
        </div>

        {/* Anchor */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Anchor Point</label>
          <div className="grid grid-cols-3 gap-2">
            {anchors.map((anchor) => (
              <button
                key={anchor.value}
                onClick={() => updateLayer({ anchor: anchor.value })}
                className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                  layer.anchor === anchor.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                title={anchor.label}
              >
                {anchor.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Scale (Size) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Size: {Math.round(layer.scale * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={layer.scale}
            onChange={(e) => updateLayer({ scale: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>500%</span>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Rotation: {Math.round(layer.rotation)}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={layer.rotation}
            onChange={(e) => updateLayer({ rotation: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0°</span>
            <span>360°</span>
          </div>
        </div>

        {/* Opacity (Transparency) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Transparency: {Math.round((1 - layer.opacity) * 100)}%
          </label>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={layer.opacity}
            onChange={(e) => updateLayer({ opacity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Opaque</span>
            <span>Transparent</span>
          </div>
        </div>

        {/* Text-specific controls */}
        {layer.type === 'text' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Text</label>
              <input
                type="text"
                value={layer.text || ''}
                onChange={(e) => updateLayer({ text: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
                placeholder="Enter text"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Font Family</label>
              <select
                value={layer.fontFamily || 'Inter'}
                onChange={(e) => updateLayer({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Font Size: {layer.fontSize || 24}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={layer.fontSize || 24}
                onChange={(e) => updateLayer({ fontSize: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>12px</span>
                <span>72px</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={layer.color || '#ffffff'}
                onChange={(e) => updateLayer({ color: e.target.value })}
                className="w-full h-10 bg-gray-800 border border-gray-600 rounded cursor-pointer"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

