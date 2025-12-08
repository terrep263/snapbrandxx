'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessedImage, WatermarkLayer, applyWatermarkLayers } from '@/lib/watermarkEngine';

interface PreviewGridProps {
  images: ProcessedImage[];
  globalLayers: WatermarkLayer[];
  overrides: Record<string, WatermarkLayer[]>;
  onDownloadSingle: (imageId: string) => void;
  onImageSelect: (image: ProcessedImage | null) => void;
  onImageClick: (image: ProcessedImage) => void;
}

export default function PreviewGrid({
  images,
  globalLayers,
  overrides,
  onDownloadSingle,
  onImageSelect,
  onImageClick,
}: PreviewGridProps) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});
  const generatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get layers for a specific image
  const getLayersForImage = useCallback(
    (imageId: string): WatermarkLayer[] => {
      return overrides[imageId] || globalLayers;
    },
    [overrides, globalLayers]
  );

  // Generate previews with debouncing and batching for performance
  useEffect(() => {
    if (generatingRef.current) {
      // Cancel previous generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    generatingRef.current = true;

    const generatePreviews = async () => {
      const newPreviews: Record<string, string> = {};
      const batchSize = 10; // Process 10 images at a time
      let processed = 0;

      for (let i = 0; i < images.length; i += batchSize) {
        if (controller.signal.aborted) break;

        const batch = images.slice(i, i + batchSize);
        const batchPromises = batch.map(async (img) => {
          if (!img.originalDataUrl || img.error) return;

          const layersToUse = getLayersForImage(img.id);
          if (layersToUse.length === 0) {
            newPreviews[img.id] = img.originalDataUrl;
            return;
          }

          const cacheKey = `${img.id}-${JSON.stringify(layersToUse)}`;

          // Check cache first
          if (previewCacheRef.current[cacheKey]) {
            newPreviews[img.id] = previewCacheRef.current[cacheKey];
            return;
          }

          try {
            // Generate preview at reduced resolution for performance
            const previewScale = 0.25; // 25% size for better performance with many images
            const dataUrl = await applyWatermarkLayers(
              img.originalDataUrl,
              layersToUse,
              true,
              previewScale
            ) as string;

            if (!controller.signal.aborted) {
              previewCacheRef.current[cacheKey] = dataUrl;
              newPreviews[img.id] = dataUrl;
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Error generating preview for', img.id, error);
            }
          }
        });

        await Promise.all(batchPromises);
        processed += batch.length;

        // Update UI incrementally for better perceived performance
        if (!controller.signal.aborted && processed > 0) {
          setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
        }

        // Yield to event loop between batches
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (!controller.signal.aborted) {
        setPreviewUrls(newPreviews);
        generatingRef.current = false;
      }
    };

    // Debounce: wait 300ms before starting generation
    const timeoutId = setTimeout(() => {
      generatePreviews();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      generatingRef.current = false;
    };
  }, [images, globalLayers, overrides, getLayersForImage]);

  const handleImageClick = async (image: ProcessedImage) => {
    if (!image.originalDataUrl || image.error) return;

    // Open detail editor instead of modal
    onImageClick(image);
  };

  const handleImageSelect = (image: ProcessedImage) => {
    setSelectedImage(image);
    onImageSelect(image);
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
          const previewUrl = previewUrls[img.id] || img.originalDataUrl;
          const hasError = !!img.error;
          const isProcessed = !!img.processedBlob;
          const hasOverride = !!overrides[img.id];

          return (
            <div
              key={img.id}
              className={`bg-gray-900 border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer ${
                selectedImage?.id === img.id ? 'border-primary' : 'border-gray-700'
              }`}
              onClick={() => {
                handleImageClick(img);
                handleImageSelect(img);
              }}
            >
              <div className="relative aspect-square bg-gray-800">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={img.originalFile.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
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
                {hasOverride && (
                  <div className="absolute top-2 left-2 bg-accent text-white text-xs px-2 py-1 rounded font-medium">
                    Custom
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
    </>
  );
}
