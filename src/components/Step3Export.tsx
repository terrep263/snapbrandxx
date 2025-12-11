'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { ProcessedImage, WatermarkLayer } from '@/lib/watermark/types';
import { applyWatermarkLayers } from '@/lib/watermark/engine';
import { useWatermark } from '@/lib/watermark/context';

interface Step3ExportProps {
  images: ProcessedImage[];
  clientName: string;
  orderId: string;
  onBack: () => void;
  onImagesUpdate: (images: ProcessedImage[]) => void;
}

export default function Step3Export({
  images,
  clientName,
  orderId,
  onBack,
  onImagesUpdate,
}: Step3ExportProps) {
  const { job, logoLibrary, getLayersForImage } = useWatermark();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>(images);

  // Sync with parent images
  useEffect(() => {
    setProcessedImages(images);
  }, [images]);

  const handleGenerateWatermarked = async () => {
    if (images.length === 0) {
      alert('Please upload images first');
      return;
    }
    if (!job || job.globalLayers.length === 0) {
      alert('Please add at least one watermark layer');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: images.length });

    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      try {
        const layersToUse = getLayersForImage(updatedImages[i].id);

        if (layersToUse.length === 0) {
          continue;
        }

        const blob = await applyWatermarkLayers(
          updatedImages[i].originalDataUrl,
          layersToUse,
          logoLibrary,
          false,
          1.0
        ) as Blob;

        updatedImages[i].processedBlob = blob;
        updatedImages[i].processedDataUrl = URL.createObjectURL(blob);
        setProcessingProgress({ current: i + 1, total: images.length });

        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        updatedImages[i].error = `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    setProcessedImages(updatedImages);
    onImagesUpdate(updatedImages);
    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    const processed = processedImages.filter((img) => img.processedBlob);
    if (processed.length === 0) {
      alert('No processed images available. Please generate watermarked images first.');
      return;
    }

    const zip = new JSZip();

    for (const img of processed) {
      if (img.processedBlob) {
        const originalName = img.originalFile.name;
        const ext = originalName.substring(originalName.lastIndexOf('.'));
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        const newName = `${baseName}-snapbrandxx${ext}`;
        zip.file(newName, img.processedBlob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const zipName = clientName && orderId
      ? `${clientName}-${orderId}-snapbrandxx.zip`
      : `snapbrandxx-${Date.now()}.zip`;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (image: ProcessedImage) => {
    if (!image.processedBlob) return;

    const url = image.processedDataUrl || URL.createObjectURL(image.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    const originalName = image.originalFile.name;
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    a.download = `${baseName}-snapbrandxx${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!image.processedDataUrl) {
      URL.revokeObjectURL(url);
    }
  };

  const canExport = processedImages.some((img) => img.processedBlob);
  const processedCount = processedImages.filter((img) => img.processedBlob).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
        >
          ← Editor
        </button>
        <h2 className="text-sm font-semibold text-gray-300">Step 3 of 3: Export & Results</h2>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Export Settings */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Export Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Output Format</label>
                <select className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100">
                  <option>Original Format (JPG/PNG)</option>
                  <option>JPG Only</option>
                  <option>PNG Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quality</label>
                <input
                  type="range"
                  min="70"
                  max="100"
                  defaultValue="95"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>70%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <button
              onClick={handleGenerateWatermarked}
              disabled={isProcessing || images.length === 0 || globalLayers.length === 0}
              className="w-full px-6 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isProcessing
                ? `Processing ${processingProgress.current} of ${processingProgress.total}...`
                : 'Generate Watermarked Images'}
            </button>

            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {canExport && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">
                  Results ({processedCount} of {images.length} processed)
                </h2>
                <button
                  onClick={handleDownloadZip}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
                >
                  Download All as ZIP
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {processedImages.map((image) => (
                  <div
                    key={image.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {image.processedDataUrl && (
                        <img
                          src={image.processedDataUrl}
                          alt={image.originalFile.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{image.originalFile.name}</p>
                        {image.error ? (
                          <p className="text-xs text-red-400">{image.error}</p>
                        ) : (
                          <p className="text-xs text-gray-500">Processed successfully</p>
                        )}
                      </div>
                    </div>
                    {image.processedBlob && (
                      <button
                        onClick={() => handleDownloadSingle(image)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                      >
                        Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

