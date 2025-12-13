/**
 * Preview Grid Panel
 * 
 * Shows all images with watermarks applied in a grid view
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ProcessedImage } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';
import { applyWatermarkLayers } from '@/lib/watermark/engine';

interface PreviewGridPanelProps {
  images: ProcessedImage[];
  selectedImageId: string | null;
  onImageSelect: (imageId: string) => void;
}

export default function PreviewGridPanel({
  images,
  selectedImageId,
  onImageSelect,
}: PreviewGridPanelProps) {
  const { job, logoLibrary, getLayersForImage } = useWatermark();
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});

  // Generate watermarked previews for all images
  useEffect(() => {
    if (!job || images.length === 0) {
      setPreviewUrls({});
      return;
    }

    // Cancel previous generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGenerating(true);

    const generatePreviews = async () => {
      const newPreviews: Record<string, string> = {};
      const batchSize = 3; // Process 3 images at a time for grid (larger previews)

      for (let i = 0; i < images.length; i += batchSize) {
        if (controller.signal.aborted) break;

        const batch = images.slice(i, i + batchSize);
        const batchPromises = batch.map(async (img) => {
          try {
            const layers = getLayersForImage(img.id);
            const enabledLayers = layers.filter(l => l.enabled);

            // Create cache key
            const cacheKey = `${img.id}-${JSON.stringify(enabledLayers.map(l => ({ id: l.id, offsetX: l.offsetX, offsetY: l.offsetY, scale: l.scale, rotation: l.rotation, opacity: l.opacity })))}`;

            // Check cache
            if (previewCacheRef.current[cacheKey]) {
              newPreviews[img.id] = previewCacheRef.current[cacheKey];
              return;
            }

            // If no layers, use original
            if (enabledLayers.length === 0) {
              newPreviews[img.id] = img.originalDataUrl;
              previewCacheRef.current[cacheKey] = img.originalDataUrl;
              return;
            }

            // Generate watermarked preview at 40% for grid view
            const previewScale = 0.4;
            const dataUrl = await applyWatermarkLayers(
              img.originalDataUrl,
              enabledLayers,
              logoLibrary,
              { scale: previewScale, returnDataUrl: true }
            ) as string;

            if (!controller.signal.aborted) {
              previewCacheRef.current[cacheKey] = dataUrl;
              newPreviews[img.id] = dataUrl;
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Error generating preview for', img.id, error);
              newPreviews[img.id] = img.originalDataUrl;
            }
          }
        });

        await Promise.all(batchPromises);

        // Update UI incrementally
        if (!controller.signal.aborted) {
          setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!controller.signal.aborted) {
        setGenerating(false);
      }
    };

    // Debounce: wait 500ms before starting
    const timeoutId = setTimeout(() => {
      generatePreviews();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      setGenerating(false);
    };
  }, [images, job, logoLibrary, getLayersForImage]);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-200">All Previews</h3>
        <p className="text-xs text-gray-400 mt-1">
          {generating ? 'Generating previews...' : `${images.length} image${images.length !== 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="grid grid-cols-2 gap-4">
          {images.map((image) => {
            const isSelected = image.id === selectedImageId;
            const previewUrl = previewUrls[image.id] || image.originalDataUrl;
            const isLoading = !previewUrls[image.id] && generating;

            return (
              <div
                key={image.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-red-500 shadow-lg'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => onImageSelect(image.id)}
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={previewUrl}
                    alt={image.originalFile.name}
                    fill
                    className="object-contain bg-gray-800"
                    unoptimized
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                  <p className="text-xs text-white truncate">{image.originalFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {image.width} × {image.height}px
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-red-500 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

