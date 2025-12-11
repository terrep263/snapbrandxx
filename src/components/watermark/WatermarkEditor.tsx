/**
 * Professional Watermark Editor
 * 
 * Three-pane layout: thumbnails | preview | controls
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWatermark } from '@/lib/watermark/context';
import { ProcessedImage } from '@/lib/watermark/types';
import ImageThumbnailList from './ImageThumbnailList';
import WatermarkPreviewCanvas from './WatermarkPreviewCanvas';
import WatermarkControlPanel from './WatermarkControlPanel';

interface WatermarkEditorProps {
  images: ProcessedImage[];
  onBack?: () => void;
  onNext?: () => void;
}

export default function WatermarkEditor({ images, onBack, onNext }: WatermarkEditorProps) {
  const {
    job,
    selectedImageId,
    selectedLayerId,
    createJob,
    selectImage,
    selectLayer,
    getLayersForImage,
  } = useWatermark();

  // Initialize job when images change
  useEffect(() => {
    if (images.length > 0 && (!job || job.images.length !== images.length)) {
      createJob(images);
    }
  }, [images, job, createJob]);

  // Auto-select first image
  useEffect(() => {
    if (images.length > 0 && !selectedImageId) {
      selectImage(images[0].id);
    }
  }, [images, selectedImageId, selectImage]);

  const selectedImage = selectedImageId
    ? images.find(img => img.id === selectedImageId) || images[0] || null
    : images[0] || null;

  const currentLayers = selectedImageId ? getLayersForImage(selectedImageId) : [];

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-800">
      {/* Left: Image Thumbnails */}
      <div className="w-64 border-r border-gray-700 bg-gray-900 overflow-y-auto flex-shrink-0 custom-scrollbar">
        <ImageThumbnailList
          images={images}
          selectedImageId={selectedImageId}
          onImageSelect={selectImage}
        />
      </div>

      {/* Center: Preview Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-900 min-w-0 min-h-0">
        {selectedImage ? (
          <WatermarkPreviewCanvas
            image={selectedImage}
            layers={currentLayers}
            selectedLayerId={selectedLayerId}
            onLayerSelect={selectLayer}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select an image to preview
          </div>
        )}
      </div>

      {/* Right: Control Panel */}
      <div className="w-96 border-l border-gray-700 bg-gray-900 overflow-hidden flex-shrink-0 flex flex-col min-h-0">
        <WatermarkControlPanel
          selectedImage={selectedImage}
          layers={currentLayers}
          selectedLayerId={selectedLayerId}
          onBack={onBack}
          onNext={onNext}
        />
      </div>
    </div>
  );
}


