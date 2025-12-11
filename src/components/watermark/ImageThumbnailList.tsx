/**
 * Image Thumbnail List
 * 
 * Scrollable list of image thumbnails with selection and override indicators
 */

'use client';

import { ProcessedImage } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';

interface ImageThumbnailListProps {
  images: ProcessedImage[];
  selectedImageId: string | null;
  onImageSelect: (imageId: string) => void;
}

export default function ImageThumbnailList({
  images,
  selectedImageId,
  onImageSelect,
}: ImageThumbnailListProps) {
  const { job, resetImageOverride } = useWatermark();

  const hasOverride = (imageId: string): boolean => {
    return job?.overrides[imageId] !== undefined;
  };

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Images ({images.length})</h2>
      <div className="space-y-2">
        {images.map((image) => {
          const isSelected = image.id === selectedImageId;
          const isOverridden = hasOverride(image.id);

          return (
            <div
              key={image.id}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-primary shadow-lg'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onImageSelect(image.id)}
            >
              <img
                src={image.originalDataUrl}
                alt={image.originalFile.name}
                className="w-full h-32 object-cover"
              />
              {isOverridden && (
                <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                  Custom
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                <p className="text-xs text-white truncate">{image.originalFile.name}</p>
                <p className="text-xs text-gray-400">
                  {image.width} × {image.height}px
                </p>
              </div>
              {isSelected && (
                <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


