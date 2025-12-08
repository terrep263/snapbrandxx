'use client';

import { useRef } from 'react';
import { WatermarkLayer, Anchor } from '@/lib/watermarkEngine';

interface WatermarkSettingsPanelProps {
  layers: WatermarkLayer[];
  onLayersChange: (layers: WatermarkLayer[]) => void;
  onLogoFileChange: (file: File | null) => void;
  logoImage: HTMLImageElement | null;
}

'use client';

import { useRef } from 'react';
import { WatermarkLayer, Anchor, TileMode } from '@/lib/watermarkEngine';

interface WatermarkSettingsPanelProps {
  layers: WatermarkLayer[];
  onLayersChange: (layers: WatermarkLayer[]) => void;
  onLogoFileChange: (file: File | null) => void;
  logoImage: HTMLImageElement | null;
}

export default function WatermarkSettingsPanel({
  layers,
  onLayersChange,
  onLogoFileChange,
  logoImage,
}: WatermarkSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/png') {
        onLogoFileChange(file);
      } else {
        alert('Please select a PNG file for the logo');
      }
    }
  };

  const handleRemoveLogo = () => {
    onLogoFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update logo for all logo layers
  const updateLogoLayers = (newLogoImage: HTMLImageElement | null) => {
    const updatedLayers = layers.map((layer) => {
      if (layer.type === 'logo') {
        return { ...layer, logoImage: newLogoImage };
      }
      return layer;
    });
    onLayersChange(updatedLayers);
  };

  // This panel is now simplified - layer editing happens in LayerEditorPanel
  // This just handles logo upload for logo layers
  const hasLogoLayer = layers.some((l) => l.type === 'logo');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h2>
      <div className="space-y-4">
        {hasLogoLayer && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Logo (PNG)</label>
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                {logoImage ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleLogoSelect}
                className="hidden"
              />
              {logoImage && (
                <button
                  onClick={() => {
                    handleRemoveLogo();
                    updateLogoLayers(null);
                  }}
                  className="w-full px-3 py-2 bg-accent hover:bg-accent/80 text-white text-sm rounded transition-colors"
                >
                  Remove Logo
                </button>
              )}
            </div>
          </div>
        )}
        <div className="text-xs text-gray-500">
          <p>Use the Layers panel to add text or logo layers, then edit them in the Layer Editor.</p>
        </div>
      </div>
    </div>
  );
}

