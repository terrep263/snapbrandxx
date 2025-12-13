'use client';

import { useState } from 'react';
import { WatermarkLayer } from '@/lib/watermark/types';
import LogoGallery from './LogoGallery';
import { LogoItem, logoItemToImage } from '@/lib/logoLibrary';

interface LayerListPanelProps {
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onAddTextLayer: () => void;
  onAddLogoLayer: (logoImage?: HTMLImageElement) => void;
}

export default function LayerListPanel({
  layers,
  selectedLayerId,
  onLayerSelect,
  onAddTextLayer,
  onAddLogoLayer,
}: LayerListPanelProps) {
  const [showLogoGallery, setShowLogoGallery] = useState(false);

  const handleAddLogoFromGallery = async (logoItem: LogoItem) => {
    try {
      const img = await logoItemToImage(logoItem);
      onAddLogoLayer(img);
    } catch (error) {
      console.error('Error loading logo:', error);
      alert('Failed to load logo');
    }
  };

  const handleAddLogoClick = () => {
    setShowLogoGallery(true);
  };

  return (
    <>
      {showLogoGallery && (
        <LogoGallery
          onSelectLogo={handleAddLogoFromGallery}
          onClose={() => setShowLogoGallery(false)}
        />
      )}
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Layers</h2>
        <div className="flex gap-1">
          <button
            onClick={onAddTextLayer}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            title="Add Text Layer"
          >
            +T
          </button>
          <button
            onClick={handleAddLogoClick}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            title="Add Logo Layer from Library"
          >
            +L
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {layers.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            No layers. Add a text or logo layer to get started.
          </p>
        ) : (
          layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onLayerSelect(layer.id === selectedLayerId ? null : layer.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                layer.id === selectedLayerId
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {layer.type === 'text' ? '📝 Text' : '🖼️ Logo'}
                </span>
                {layer.type === 'text' && layer.text && (
                  <span className="text-xs opacity-75 truncate ml-2 max-w-[100px]">
                    {layer.text}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
    </>
  );
}

