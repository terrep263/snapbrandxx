'use client';

import { useState, useRef, useEffect } from 'react';
import { WatermarkLayer, ProcessedImage, Anchor, TileMode } from '@/lib/watermark/types';
import { applyWatermarkLayers } from '@/lib/watermark/engine';
import { FontRecord } from '@/lib/fontLibrary';
import LayerListPanel from './LayerListPanel';
import LayerEditorPanel from './LayerEditorPanel';
import DraggablePreviewCanvas from './DraggablePreviewCanvas';

interface ImageDetailEditorProps {
  image: ProcessedImage;
  globalLayers: WatermarkLayer[];
  imageLayers: WatermarkLayer[]; // Overrides for this image
  onLayersUpdate: (imageId: string, layers: WatermarkLayer[] | null) => void; // null = reset to global
  onClose: () => void;
  logoImage: HTMLImageElement | null;
  onLogoFileChange: (file: File | null) => void;
  brandFonts?: FontRecord[];
  onOpenFontLibrary?: () => void;
}

export default function ImageDetailEditor({
  image,
  globalLayers,
  imageLayers,
  onLayersUpdate,
  onClose,
  logoImage,
  onLogoFileChange,
  brandFonts = [],
  onOpenFontLibrary,
}: ImageDetailEditorProps) {
  const [layers, setLayers] = useState<WatermarkLayer[]>(
    imageLayers.length > 0 ? imageLayers : globalLayers
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  // Update layers when props change - use a ref to track if we're in the middle of editing
  const isEditingRef = useRef(false);
  
  useEffect(() => {
    // Only update from props if we're not actively editing
    if (!isEditingRef.current) {
      setLayers(imageLayers.length > 0 ? imageLayers : globalLayers);
    }
  }, [imageLayers, globalLayers]);

  // Update logo images in layers when logoImage prop changes
  useEffect(() => {
    if (logoImage) {
      setLayers((prevLayers) =>
        prevLayers.map((layer) =>
          layer.type === 'logo' && layer.logoId ? { ...layer } : layer
        )
      );
    }
  }, [logoImage]);

  const handleAddTextLayer = () => {
    const newLayer: WatermarkLayer = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      anchor: Anchor.BOTTOM_RIGHT,
      offsetX: -5,
      offsetY: -5,
      scale: 1.0,
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: 'solid',
      text: 'Your Brand',
      fontFamily: 'Inter',
      fontSizeRelative: 3.0,
      color: '#ffffff',
      zIndex: 0,
      enabled: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddLogoLayer = (logoImageParam?: HTMLImageElement) => {
    const logoToUse = logoImageParam || logoImage;
    if (!logoToUse) {
      alert('Please upload a logo first or select one from the library');
      return;
    }
    const newLayer: WatermarkLayer = {
      id: `logo-${Date.now()}-${Math.random()}`,
      type: 'logo',
      anchor: Anchor.BOTTOM_RIGHT,
      offsetX: -5,
      offsetY: -5,
      scale: 1.0,
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: 'solid',
      logoId: 'temp',
      naturalLogoWidth: logoToUse.width,
      naturalLogoHeight: logoToUse.height,
      zIndex: 0,
      enabled: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleLayerUpdate = (updatedLayer: WatermarkLayer) => {
    isEditingRef.current = true;
    setLayers((prev) =>
      prev.map((layer) => (layer.id === updatedLayer.id ? updatedLayer : layer))
    );
  };

  const handleLayerDelete = (layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleSave = () => {
    // Save as override if different from global, otherwise reset
    const isDifferent = JSON.stringify(layers) !== JSON.stringify(globalLayers);
    if (isDifferent) {
      onLayersUpdate(image.id, layers);
    } else {
      onLayersUpdate(image.id, null); // Reset to global
    }
    onClose();
  };

  const handleResetToGlobal = () => {
    if (confirm('Reset this image to use global watermark settings?')) {
      setLayers([...globalLayers]);
      onLayersUpdate(image.id, null);
    }
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;
  const hasOverrides = imageLayers.length > 0;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{image.originalFile.name}</h2>
          <p className="text-xs text-gray-400">
            {image.width} × {image.height} • {hasOverrides ? 'Custom settings' : 'Using global settings'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasOverrides && (
            <button
              onClick={handleResetToGlobal}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Reset to Global
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded transition-colors"
          >
            Save & Close
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Preview Canvas */}
        <div className="flex-1 flex flex-col p-4 overflow-auto">
          <DraggablePreviewCanvas
            image={image}
            layers={layers}
            selectedLayerId={selectedLayerId}
            onLayerSelect={setSelectedLayerId}
            onLayerUpdate={handleLayerUpdate}
          />
        </div>

        {/* Right: Layer Controls */}
        <div className="w-80 border-l border-gray-700 bg-gray-900 overflow-y-auto">
          <div className="p-4 space-y-4">
            <LayerListPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onAddTextLayer={handleAddTextLayer}
              onAddLogoLayer={handleAddLogoLayer}
            />
            <LayerEditorPanel
              layer={selectedLayer}
              onLayerUpdate={handleLayerUpdate}
              onDeleteLayer={handleLayerDelete}
              brandFonts={brandFonts}
              onOpenFontLibrary={onOpenFontLibrary}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
