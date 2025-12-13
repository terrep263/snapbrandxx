/**
 * Layer List Section - Redesigned for Intuitive Navigation
 * 
 * Clear, visual layer management with helpful guidance
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { WatermarkLayer } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';

interface LayerListSectionProps {
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onAddTextLayer: () => void;
  onAddLogoLayer: (logoId: string) => void;
  onAddShapeLayer?: (shapeType?: string) => void;
  onDeleteLayer: () => void;
}

export default function LayerListSection({
  layers,
  selectedLayerId,
  onLayerSelect,
  onAddTextLayer,
  onAddLogoLayer,
  onAddShapeLayer,
  onDeleteLayer,
}: LayerListSectionProps) {
  const { logoLibrary } = useWatermark();
  const [showLogoPicker, setShowLogoPicker] = useState(false);

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="space-y-4">
      {/* Header with clear instructions */}
      <div>
        <h3 className="text-base font-semibold text-gray-100 mb-1">Watermark Layers</h3>
        <p className="text-xs text-gray-400 mb-3">
          Add text or logos to your images. Click a layer to edit it.
        </p>
        
        {/* Prominent Add Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAddTextLayer}
            className="flex-1 min-w-[100px] px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add Text</span>
          </button>
          <button
            onClick={() => setShowLogoPicker(true)}
            className="flex-1 min-w-[100px] px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add Logo</span>
          </button>
          {onAddShapeLayer && (
            <button
              onClick={() => onAddShapeLayer('rectangle')}
              className="flex-1 min-w-[100px] px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              <span>Add Shape</span>
            </button>
          )}
        </div>
      </div>

      {showLogoPicker && (
        <LogoPickerModal
          onSelect={(logoId) => {
            onAddLogoLayer(logoId);
            setShowLogoPicker(false);
          }}
          onClose={() => setShowLogoPicker(false)}
        />
      )}

      {/* Layers List */}
      <div className="space-y-2">
        {sortedLayers.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-6 border-2 border-dashed border-gray-700 text-center">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm font-medium text-gray-300 mb-1">No watermarks yet</p>
            <p className="text-xs text-gray-500">
              Click &quot;Add Text&quot; or &quot;Add Logo&quot; above to get started
            </p>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 font-medium mb-2">
              {sortedLayers.length} layer{sortedLayers.length !== 1 ? 's' : ''} • Click to edit
            </div>
            {sortedLayers.map((layer, index) => {
              const isSelected = layer.id === selectedLayerId;
              const isEnabled = layer.enabled;

              return (
                <div
                  key={layer.id}
                  onClick={() => onLayerSelect(layer.id === selectedLayerId ? null : layer.id)}
                  className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                  } ${!isEnabled ? 'opacity-40' : ''}`}
                >
                  {/* Layer Number Badge */}
                  <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`text-2xl flex-shrink-0 ${
                        layer.type === 'text' ? 'text-blue-400' : layer.type === 'logo' ? 'text-purple-400' : 'text-green-400'
                      }`}>
                        {layer.type === 'text' ? '📝' : layer.type === 'logo' ? '🖼️' : '⬜'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-200">
                            {layer.type === 'text' ? 'Text Layer' : layer.type === 'logo' ? 'Logo Layer' : 'Shape Layer'}
                          </span>
                          {!isEnabled && (
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                        
                        {layer.type === 'text' && layer.text && (
                          <p className="text-sm text-gray-300 font-medium truncate">
                            &quot;{layer.text}&quot;
                          </p>
                        )}
                        {layer.type === 'logo' && layer.logoId && (
                          <p className="text-sm text-gray-300 truncate">
                            {logoLibrary.get(layer.logoId)?.name || 'Logo'}
                          </p>
                        )}
                        
                        {/* Quick Info */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Size: {Math.round(layer.scale * 100)}%</span>
                          <span>•</span>
                          <span>Opacity: {Math.round(layer.opacity * 100)}%</span>
                          {layer.rotation !== 0 && (
                            <>
                              <span>•</span>
                              <span>Rotated: {layer.rotation}°</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this layer?')) {
                            onDeleteLayer();
                          }
                        }}
                        className="flex-shrink-0 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function LogoPickerModal({ onSelect, onClose }: { onSelect: (logoId: string) => void; onClose: () => void }) {
  const { logoLibrary, addLogoToLibrary } = useWatermark();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logos = Array.from(logoLibrary.values());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const logo = await addLogoToLibrary(file.name, file);
      onSelect(logo.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">Select or Upload Logo</h3>
            <p className="text-sm text-gray-400 mt-1">Choose an existing logo or upload a new one</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-300 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-6 py-4 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <span className="text-xl">📤</span>
            <span>Upload New Logo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {logos.length > 0 ? (
          <>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Your Logos</h4>
            <div className="grid grid-cols-4 gap-4">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  onClick={() => onSelect(logo.id)}
                  className="cursor-pointer rounded-lg border-2 border-gray-700 hover:border-primary overflow-hidden bg-gray-900 transition-all hover:scale-105"
                >
                  <div className="relative w-full h-32">
                    <Image src={logo.imageData} alt={logo.name} fill className="object-contain p-2" unoptimized />
                  </div>
                  <p className="p-2 text-xs text-gray-300 truncate text-center border-t border-gray-700">{logo.name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No logos yet. Upload your first logo above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
