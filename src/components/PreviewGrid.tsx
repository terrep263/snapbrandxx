'use client';

import { useState, useEffect, useRef } from 'react';
import { ProcessedImage, WatermarkConfig, applyWatermark } from '@/lib/watermarkEngine';

interface PreviewGridProps {
  images: ProcessedImage[];
  watermarkConfig: WatermarkConfig;
  onDownloadSingle: (imageId: string) => void;
}

export default function PreviewGrid({ images, watermarkConfig, onDownloadSingle }: PreviewGridProps) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});

  // Generate previews when config or images change
  useEffect(() => {
    const generatePreviews = async () => {
      const newPreviews: Record<string, string> = {};

      for (const img of images) {
        if (!img.originalDataUrl || img.error) continue;

        const cacheKey = `${img.id}-${JSON.stringify(watermarkConfig)}`;
        
        // Check cache first
        if (previewCacheRef.current[cacheKey]) {
          newPreviews[img.id] = previewCacheRef.current[cacheKey];
          continue;
        }

        try {
          // Generate preview at reduced resolution for performance
          const previewScale = 0.3; // 30% size for preview
          const dataUrl = await applyWatermark(
            img.originalDataUrl,
            watermarkConfig,
            true,
            previewScale
          ) as string;

          previewCacheRef.current[cacheKey] = dataUrl;
          newPreviews[img.id] = dataUrl;
        } catch (error) {
          console.error('Error generating preview for', img.id, error);
        }

        // Yield to event loop periodically
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      setPreviewUrls(newPreviews);
    };

    generatePreviews();
  }, [images, watermarkConfig]);

  const handleImageClick = async (image: ProcessedImage) => {
    if (!image.originalDataUrl || image.error) return;

    try {
      // Generate full-resolution preview for modal
      const fullPreview = await applyWatermark(
        image.originalDataUrl,
        watermarkConfig,
        true,
        1.0
      ) as string;
      setSelectedPreviewUrl(fullPreview);
      setSelectedImage(image);
    } catch (error) {
      console.error('Error generating full preview', error);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Upload images to see previews</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {images.map((img) => {
          const previewUrl = previewUrls[img.id];
          const hasError = !!img.error;
          const isProcessed = !!img.processedBlob;

          return (
            <div
              key={img.id}
              className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer"
              onClick={() => handleImageClick(img)}
            >
              <div className="relative aspect-square bg-gray-800">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={img.originalFile.name}
                    className="w-full h-full object-contain"
                  />
                ) : hasError ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-accent">Error loading</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-gray-500">Generating preview...</p>
                  </div>
                )}
                {isProcessed && (
                  <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                    Ready
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-300 truncate">{img.originalFile.name}</p>
                {hasError ? (
                  <p className="text-xs text-accent mt-1">{img.error}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    {img.width} × {img.height}
                  </p>
                )}
                {isProcessed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSingle(img.id);
                    }}
                    className="mt-2 w-full px-2 py-1 bg-primary hover:bg-primary-dark text-white text-xs rounded transition-colors"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for full-size preview */}
      {selectedImage && selectedPreviewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedImage(null);
            setSelectedPreviewUrl(null);
          }}
        >
          <div
            className="bg-gray-900 rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">
                {selectedImage.originalFile.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedPreviewUrl(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedPreviewUrl}
                alt={selectedImage.originalFile.name}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

