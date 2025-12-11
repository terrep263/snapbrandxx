/**
 * Watermark Control Panel
 * 
 * Right-side panel with layer management, editing, and template controls
 */

'use client';

import { useState } from 'react';
import { WatermarkLayer, ProcessedImage, Anchor, TextEffect, LogoEffect, TileMode, TextAlign } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';
import LayerListSection from './LayerListSection';
import LayerEditorSection from './LayerEditorSection';
import TemplateSection from './TemplateSection';
import BrandSection from './BrandSection';

interface WatermarkControlPanelProps {
  selectedImage: ProcessedImage | null;
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onBack?: () => void;
  onNext?: () => void;
}

export default function WatermarkControlPanel({
  selectedImage,
  layers,
  selectedLayerId,
  onBack,
  onNext,
}: WatermarkControlPanelProps) {
  const {
    job,
    selectedImageId,
    addLayer,
    updateLayer,
    deleteLayer,
    createDefaultTextLayer,
    createDefaultLogoLayer,
    selectLayer,
    resetImageOverride,
    getLayersForImage,
  } = useWatermark();

  const [activeTab, setActiveTab] = useState<'layers' | 'templates' | 'brand'>('layers');

  const selectedLayer = selectedLayerId
    ? layers.find(l => l.id === selectedLayerId) || null
    : null;

  // Determine if we're editing global layers or per-image override
  // If selectedImageId exists and the layer is in an override, it's not global
  const isGlobal = !selectedImageId || !job?.overrides[selectedImageId]?.some(l => l.id === selectedLayerId);

  const handleAddTextLayer = () => {
    const layer = createDefaultTextLayer();
    addLayer(layer, true, selectedImageId || undefined);
    selectLayer(layer.id);
  };

  const handleAddLogoLayer = (logoId: string) => {
    const layer = createDefaultLogoLayer(logoId);
    addLayer(layer, true, selectedImageId || undefined);
    selectLayer(layer.id);
  };

  const handleUpdateLayer = (updates: Partial<WatermarkLayer>) => {
    if (!selectedLayerId) return;
    updateLayer(selectedLayerId, updates, isGlobal, selectedImageId || undefined);
  };

  const handleDeleteLayer = () => {
    if (!selectedLayerId) return;
    deleteLayer(selectedLayerId, isGlobal, selectedImageId || undefined);
    selectLayer(null);
  };

  const handleResetOverride = () => {
    if (selectedImageId) {
      resetImageOverride(selectedImageId);
    }
  };

  const hasOverride = selectedImageId
    ? getLayersForImage(selectedImageId) !== layers
    : false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-100 mb-1">Watermark Editor</h2>
          <p className="text-xs text-gray-400">
            {selectedImageId && hasOverride 
              ? 'Editing custom layout for this image'
              : 'Editing global layout (applies to all images)'}
          </p>
        </div>

        {selectedImageId && hasOverride && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">ℹ️</span>
                <span className="text-xs text-blue-300">This image has custom settings</span>
              </div>
              <button
                onClick={handleResetOverride}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Reset to Global
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'layers'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Layers
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'templates'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'brand'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Brand
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'layers' && (
          <div className="p-4 space-y-4">
            <LayerListSection
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={selectLayer}
              onAddTextLayer={handleAddTextLayer}
              onAddLogoLayer={handleAddLogoLayer}
              onDeleteLayer={handleDeleteLayer}
            />

            {selectedLayer ? (
              <LayerEditorSection
                layer={selectedLayer}
                onUpdate={handleUpdateLayer}
              />
            ) : layers.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border-2 border-dashed border-gray-700 text-center">
                <p className="text-sm text-gray-400">
                  👆 Click a layer above to edit its properties
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateSection />
        )}

        {activeTab === 'brand' && (
          <BrandSection />
        )}
      </div>

      {/* Footer Actions */}
      {(onBack || onNext) && (
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Back
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

