'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { ProcessedImage } from '@/lib/watermark/types';
import { applyWatermarkLayers, preloadAllFonts } from '@/lib/watermark/engine';
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
  
  // Export settings
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [exportQuality, setExportQuality] = useState(95);

  // Sync with parent images
  useEffect(() => {
    setProcessedImages(images);
  }, [images]);

  /**
   * Process images in batches for better performance
   */
  const processBatch = async (imagesToProcess: ProcessedImage[], batchSize = 5) => {
    const results: ProcessedImage[] = [];

    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (img) => {
          try {
            const layersToUse = getLayersForImage(img.id);

            if (layersToUse.length === 0) {
              return {
                ...img,
                error: 'No watermark layers applied'
              };
            }

            const blob = await applyWatermarkLayers(
              img.originalDataUrl,
              layersToUse,
              logoLibrary,
              {
                format: exportFormat,
                quality: exportQuality / 100,
                scale: 1.0,
                returnDataUrl: false
              }
            ) as Blob;

            return {
              ...img,
              processedBlob: blob,
              processedDataUrl: URL.createObjectURL(blob),
              error: undefined
            };
          } catch (error) {
            return {
              ...img,
              error: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        })
      );

      results.push(...batchResults);

      // Update progress
      setProcessingProgress({ current: results.length, total: imagesToProcess.length });

      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return results;
  };

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

    try {
      // Preload all fonts before processing
      await preloadAllFonts(job.globalLayers);

      // Process images in batches
      const processedBatch = await processBatch(images, 5);

      setProcessedImages(processedBatch);
      onImagesUpdate(processedBatch);
    } catch (error) {
      console.error('Batch processing error:', error);
      alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
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
        
        // Use export format extension if different from original
        let finalExt = ext;
        if (exportFormat === 'jpeg' && !['.jpg', '.jpeg'].includes(ext.toLowerCase())) {
          finalExt = '.jpg';
        } else if (exportFormat === 'png' && ext.toLowerCase() !== '.png') {
          finalExt = '.png';
        } else if (exportFormat === 'webp' && ext.toLowerCase() !== '.webp') {
          finalExt = '.webp';
        }
        
        const newName = `${baseName}-watermarked${finalExt}`;
        zip.file(newName, img.processedBlob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const zipName = clientName && orderId
      ? `${clientName}-${orderId}-watermarked.zip`
      : `watermarked-${Date.now()}.zip`;
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
    
    // Use export format extension
    let finalExt = ext;
    if (exportFormat === 'jpeg') {
      finalExt = '.jpg';
    } else if (exportFormat === 'png') {
      finalExt = '.png';
    } else if (exportFormat === 'webp') {
      finalExt = '.webp';
    }
    
    a.download = `${baseName}-watermarked${finalExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!image.processedDataUrl) {
      URL.revokeObjectURL(url);
    }
  };

  const canExport = processedImages.some((img) => img.processedBlob);
  const processedCount = processedImages.filter((img) => img.processedBlob).length;
  const hasLayers = job && job.globalLayers.length > 0;

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
              {/* Format Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Output Format</label>
                <select
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'jpeg' | 'png' | 'webp')}
                >
                  <option value="jpeg">JPEG (Smaller files, no transparency)</option>
                  <option value="png">PNG (Larger files, preserves transparency)</option>
                  <option value="webp">WebP (Best compression, modern browsers)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {exportFormat === 'jpeg' && 'Recommended for photos. Best compatibility.'}
                  {exportFormat === 'png' && 'Recommended for graphics with transparency.'}
                  {exportFormat === 'webp' && 'Best file size, but limited older browser support.'}
                </p>
              </div>

              {/* Quality Slider (hidden for PNG) */}
              {exportFormat !== 'png' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Quality: {exportQuality}%
                  </label>
                  <input
                    type="range"
                    min="70"
                    max="100"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Smaller files (70%)</span>
                    <span>Best quality (100%)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Recommended: 90-95% for web, 100% for print
                  </p>
                </div>
              )}

              {/* File Size Estimate */}
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">
                  <strong className="text-gray-300">Estimated file sizes:</strong>
                </p>
                <ul className="text-xs text-gray-500 mt-1 space-y-1">
                  <li>
                    • {exportFormat === 'jpeg' ? (exportQuality >= 95 ? '300-500 KB' : exportQuality >= 85 ? '150-300 KB' : '100-150 KB') : exportFormat === 'png' ? '500 KB - 2 MB' : '100-300 KB'} per image
                  </li>
                  <li>• Total for {images.length} images: ~{Math.round(images.length * (exportFormat === 'png' ? 1 : exportQuality >= 95 ? 0.4 : 0.15))} MB</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <button
              onClick={handleGenerateWatermarked}
              disabled={isProcessing || images.length === 0 || !hasLayers}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isProcessing
                ? `Processing ${processingProgress.current} of ${processingProgress.total}...`
                : `Generate Watermarked Images (${images.length})`}
            </button>

            {!hasLayers && (
              <p className="text-sm text-yellow-500 mt-2 text-center">
                ⚠️ Add at least one watermark layer in the editor first
              </p>
            )}

            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Processing in batches of 5 for optimal performance...
                </p>
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  📦 Download All as ZIP
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
                          <p className="text-xs text-gray-500">
                            ✓ Processed • {exportFormat.toUpperCase()} • {exportQuality}% quality
                          </p>
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
