'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { WatermarkLayer, ProcessedImage, Anchor, TileMode } from '@/lib/watermark/types';
import { FontRecord } from '@/lib/fontLibrary';
import DraggablePreviewCanvas from './DraggablePreviewCanvas';
import LayerListPanel from './LayerListPanel';
import LayerEditorPanel from './LayerEditorPanel';
import WatermarkSettingsPanel from './WatermarkSettingsPanel';
import WatermarkGroupsPanel from './WatermarkGroupsPanel';
import ImageDetailEditor from './ImageDetailEditor';

interface Step2EditorProps {
  images: ProcessedImage[];
  globalLayers: WatermarkLayer[];
  overrides: Record<string, WatermarkLayer[]>;
  selectedImageId: string | null;
  onGlobalLayersChange: (layers: WatermarkLayer[]) => void;
  onOverridesChange: (overrides: Record<string, WatermarkLayer[]>) => void;
  onSelectedImageChange: (image: ProcessedImage | null) => void;
  logoImage: HTMLImageElement | null;
  onLogoFileChange: (file: File | null) => void;
  brandFonts: FontRecord[];
  onOpenFontLibrary: () => void;
  clientName: string;
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Editor({
  images,
  globalLayers,
  overrides,
  selectedImageId,
  onGlobalLayersChange,
  onOverridesChange,
  onSelectedImageChange,
  logoImage,
  onLogoFileChange,
  brandFonts,
  onOpenFontLibrary,
  clientName,
  onBack,
  onNext,
}: Step2EditorProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    logoImageRef.current = logoImage;
  }, [logoImage]);

  // Get layers for selected image
  const getLayersForImage = (imageId: string): WatermarkLayer[] => {
    return overrides[imageId] || globalLayers;
  };

  const selectedImage = selectedImageId
    ? images.find((img) => img.id === selectedImageId) || images[0] || null
    : images[0] || null;

  // Auto-select first image if none selected
  useEffect(() => {
    if (!selectedImageId && images.length > 0) {
      onSelectedImageChange(images[0]);
    }
  }, [images, selectedImageId, onSelectedImageChange]);

  const handleAddTextLayer = () => {
    const maxZIndex = globalLayers.length > 0
      ? Math.max(...globalLayers.map(l => l.zIndex))
      : 0;
    const newLayer: WatermarkLayer = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      zIndex: maxZIndex + 1,
      enabled: true,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: -5, // Legacy support
      offsetY: -5,
      scale: 1.25, // Default scale
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: 'solid',
      text: 'Your Brand',
      fontFamily: 'Inter',
      fontSizeRelative: 3.0, // 3% of image height
      color: '#ffffff',
    };
    onGlobalLayersChange([...globalLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddLogoLayer = (logoImageParam?: HTMLImageElement) => {
    // Note: For backward compatibility, this accepts HTMLImageElement
    // In the future, this should be updated to accept logoId from the logo library
    const logoToUse = logoImageParam || logoImage;
    if (!logoToUse) {
      alert('Please upload a logo first or select one from the library');
      return;
    }
    const maxZIndex = globalLayers.length > 0
      ? Math.max(...globalLayers.map(l => l.zIndex))
      : 0;
    const newLayer: WatermarkLayer = {
      id: `logo-${Date.now()}-${Math.random()}`,
      type: 'logo',
      zIndex: maxZIndex + 1,
      enabled: true,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: -5, // Legacy support
      offsetY: -5,
      scale: 1.25, // Default scale
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: 'solid',
      logoId: 'temp-logo-id', // TODO: Get actual logoId from logo library when logoImageParam is provided
      naturalLogoWidth: logoToUse.naturalWidth || 100,
      naturalLogoHeight: logoToUse.naturalHeight || 100,
    };
    onGlobalLayersChange([...globalLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleGlobalLayerUpdate = (updatedLayer: WatermarkLayer) => {
    onGlobalLayersChange(
      globalLayers.map((layer) => (layer.id === updatedLayer.id ? updatedLayer : layer))
    );
  };

  const handleGlobalLayerDelete = (layerId: string) => {
    onGlobalLayersChange(globalLayers.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleImageLayersUpdate = (imageId: string, layers: WatermarkLayer[] | null) => {
    if (layers === null) {
      const updated = { ...overrides };
      delete updated[imageId];
      onOverridesChange(updated);
    } else {
      onOverridesChange({
        ...overrides,
        [imageId]: layers,
      });
    }
  };


  const handleAddGroup = (layers: WatermarkLayer[]) => {
    onGlobalLayersChange([...globalLayers, ...layers]);
    if (layers.length > 0) {
      setSelectedLayerId(layers[0].id);
    }
  };

  const selectedLayer = globalLayers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
        >
          ← Order & Images
        </button>
        <h2 className="text-sm font-semibold text-gray-300">Step 2 of 3: Editor</h2>
        <button
          onClick={onNext}
          disabled={globalLayers.length === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          Next → Export
        </button>
      </div>

      {/* Image Detail Editor Modal */}
      {editingImageId && (
        <ImageDetailEditor
          image={images.find((img) => img.id === editingImageId)!}
          globalLayers={globalLayers}
          imageLayers={overrides[editingImageId] || []}
          onLayersUpdate={handleImageLayersUpdate}
          onClose={() => setEditingImageId(null)}
          logoImage={logoImageRef.current}
          onLogoFileChange={onLogoFileChange}
          brandFonts={brandFonts}
          onOpenFontLibrary={onOpenFontLibrary}
        />
      )}

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image Thumbnails */}
        <div className="w-64 border-r border-gray-700 bg-gray-900 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Images ({images.length})</h3>
            <div className="space-y-2">
              {images.map((image) => {
                const imageLayers = getLayersForImage(image.id);
                const hasOverrides = overrides[image.id] && overrides[image.id].length > 0;
                return (
                  <button
                    key={image.id}
                    onClick={() => onSelectedImageChange(image)}
                    onDoubleClick={() => setEditingImageId(image.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedImageId === image.id
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="aspect-video bg-gray-900 rounded mb-2 overflow-hidden relative">
                      {image.originalDataUrl && (
                        <Image
                          src={image.originalDataUrl}
                          alt={image.originalFile.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mb-1">{image.originalFile.name}</p>
                    {hasOverrides && (
                      <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Large Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          {selectedImage ? (
            <>
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300">{selectedImage.originalFile.name}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedImage.width} × {selectedImage.height}px
                  </p>
                </div>
                <button
                  onClick={() => setEditingImageId(selectedImage.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Edit Layers
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <DraggablePreviewCanvas
                  image={selectedImage}
                  layers={getLayersForImage(selectedImage.id)}
                  selectedLayerId={selectedLayerId}
                  onLayerSelect={setSelectedLayerId}
                  onLayerUpdate={handleGlobalLayerUpdate}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an image to preview
            </div>
          )}
        </div>

        {/* Right: Controls Panel */}
        <div className="w-80 border-l border-gray-700 bg-gray-900 overflow-y-auto">
          <div className="p-4 space-y-4">
            <WatermarkSettingsPanel
              layers={globalLayers}
              onLayersChange={onGlobalLayersChange}
              onLogoFileChange={onLogoFileChange}
              logoImage={logoImageRef.current}
            />
            <LayerListPanel
              layers={globalLayers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onAddTextLayer={handleAddTextLayer}
              onAddLogoLayer={handleAddLogoLayer}
            />
            <LayerEditorPanel
              layer={selectedLayer}
              onLayerUpdate={handleGlobalLayerUpdate}
              onDeleteLayer={handleGlobalLayerDelete}
              brandFonts={brandFonts}
              onOpenFontLibrary={onOpenFontLibrary}
            />
            <WatermarkGroupsPanel
              onAddGroup={handleAddGroup}
              currentLayers={globalLayers}
              logoImage={logoImageRef.current}
              brandText={{
                name: clientName,
                brand: clientName,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

