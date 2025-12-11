'use client';

import { useState, useCallback, useRef } from 'react';
import NextImage from 'next/image';
import { ProcessedImage } from '@/lib/watermarkEngine';

interface UploadPanelProps {
  images: ProcessedImage[];
  onImagesChange: (images: ProcessedImage[]) => void;
}

export default function UploadPanel({ images, onImagesChange }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(
      (file) => file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png'
    );

    if (imageFiles.length === 0) {
      alert('Please select JPG or PNG images only');
      return;
    }

    if (imageFiles.length !== fileArray.length) {
      alert(`Skipped ${fileArray.length - imageFiles.length} non-image file(s)`);
    }

    if (images.length + imageFiles.length > 500) {
      const proceed = confirm(
        `You're about to load ${images.length + imageFiles.length} images. Processing may be slow. Consider splitting into smaller batches. Continue?`
      );
      if (!proceed) return;
    }

    const newImages: ProcessedImage[] = [];

    for (const file of imageFiles) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = dataUrl;
        });

        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          originalFile: file,
          originalDataUrl: dataUrl,
          width: img.width,
          height: img.height,
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          originalFile: file,
          originalDataUrl: '',
          width: 0,
          height: 0,
          error: `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    onImagesChange([...images, ...newImages]);
  }, [images, onImagesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const handleClearAll = useCallback(() => {
    if (images.length === 0) return;
    if (confirm(`Clear all ${images.length} images?`)) {
      onImagesChange([]);
    }
  }, [images.length, onImagesChange]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Image Upload</h2>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
          }`}
        >
          <p className="text-sm text-gray-400 mb-2">Drag and drop images here</p>
          <p className="text-xs text-gray-500 mb-3">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded transition-colors"
          >
            Select images
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">JPG and PNG only</p>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {images.length} image{images.length !== 1 ? 's' : ''} loaded
            </p>
            <button
              onClick={handleClearAll}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-300 mb-2">Loaded Images</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {images.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750"
              >
                {img.originalDataUrl ? (
                  <div className="relative w-12 h-12 rounded overflow-hidden">
                    <NextImage
                      src={img.originalDataUrl}
                      alt={img.originalFile.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">Error</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{img.originalFile.name}</p>
                  {img.error ? (
                    <p className="text-xs text-accent">{img.error}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {img.width} × {img.height}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="text-xs text-gray-500 hover:text-accent transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

