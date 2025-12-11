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
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [exportQuality, setExportQuality] = useState(95);

  useEffect(() => {
    setProcessedImages(images);
  }, [images]);

  const processBatch = async (imagesToProcess: ProcessedImage[], batchSize = 5) => {
    const results: ProcessedImage[] = [];
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (img) => {
          try {
            const layersToUse = getLayersForImage(img.id);
            if (layersToUse.length === 0) {
              return { ...img, error: 'No watermark layers applied' };
            }
            const blob = await applyWatermarkLayers(
              img.originalDataUrl,
              layersToUse,
              logoLibrary,
              { format: exportFormat, quality: exportQuality / 100, scale: 1.0, returnDataUrl: false }
            ) as Blob;
            return {
              ...img,
              processedBlob: blob,
              processedDataUrl: URL.createObjectURL(blob),
              error: undefined
            };
          } catch (error) {
            return { ...img, error: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
        })
      );
      results.push(...batchResults);
      setProcessingProgress({ current: results.length, total: imagesToProcess.length });
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
      await preloadAllFonts(job.globalLayers);
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
        let finalExt = ext;
        if (exportFormat === 'jpeg' && !['.jpg', '.jpeg'].includes(ext.toLowerCase())) finalExt = '.jpg';
        else if (exportFormat === 'png' && ext.toLowerCase() !== '.png') finalExt = '.png';
        else if (exportFormat === 'webp' && ext.toLowerCase() !== '.webp') finalExt = '.webp';
        zip.file(`${baseName}-watermarked${finalExt}`, img.processedBlob);
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = clientName && orderId
      ? `${clientName}-${orderId}-watermarked.zip`
      : `watermarked-${Date.now()}.zip`;
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
    let finalExt = ext;
    if (exportFormat === 'jpeg') finalExt = '.jpg';
    else if (exportFormat === 'png') finalExt = '.png';
    else if (exportFormat === 'webp') finalExt = '.webp';
    a.download = `${baseName}-watermarked${finalExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!image.processedDataUrl) URL.revokeObjectURL(url);
  };

  const canExport = processedImages.some((img) => img.processedBlob);
  const processedCount = processedImages.filter((img) => img.processedBlob).length;
  const hasLayers = job && job.globalLayers.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Navigation */}
      <div className="backdrop-blur-xl bg-dark-900/80 border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 px-4 py-2 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200 hover:shadow-lg"
        >
          <svg className="w-4 h-4 text-dark-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium text-dark-300 group-hover:text-white">Back to Editor</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/30 rounded-lg border border-white/5">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-sm text-dark-400">Step 3 of 3</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Export & Results</h2>
        </div>
        <div className="w-32" />
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
          {/* Export Settings Card */}
          <div className="backdrop-blur-xl bg-dark-800/40 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Export Settings</h3>
                <p className="text-sm text-dark-400">Configure your watermarked output</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-dark-300">Output Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'jpeg' | 'png' | 'webp')}
                  className="w-full px-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                >
                  <option value="jpeg">JPEG - Smaller files, best compatibility</option>
                  <option value="png">PNG - Lossless, preserves transparency</option>
                  <option value="webp">WebP - Best compression, modern browsers</option>
                </select>
                <p className="text-xs text-dark-500 flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {exportFormat === 'jpeg' && 'Best for photos with rich colors'}
                  {exportFormat === 'png' && 'Ideal for graphics with transparency'}
                  {exportFormat === 'webp' && 'Modern format with excellent compression'}
                </p>
              </div>

              {exportFormat !== 'png' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-dark-300">
                    Quality: <span className="text-primary-400 font-bold">{exportQuality}%</span>
                  </label>
                  <input
                    type="range"
                    min="70"
                    max="100"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-dark-900/50 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(exportQuality - 70) / 0.3}%, rgba(15, 23, 42, 0.5) ${(exportQuality - 70) / 0.3}%, rgba(15, 23, 42, 0.5) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-dark-500">
                    <span>Smaller (70%)</span>
                    <span>Best (100%)</span>
                  </div>
                  <p className="text-xs text-dark-500 flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    Recommended: 90-95% for web, 100% for print
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-dark-900/30 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-dark-300">Estimated Output</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-500">Per image:</span>
                <span className="text-sm font-bold text-primary-400">
                  {exportFormat === 'jpeg' ? (exportQuality >= 95 ? '300-500 KB' : exportQuality >= 85 ? '150-300 KB' : '100-150 KB') : exportFormat === 'png' ? '500 KB - 2 MB' : '100-300 KB'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-dark-500">Total ({images.length} images):</span>
                <span className="text-sm font-bold text-white">~{Math.round(images.length * (exportFormat === 'png' ? 1 : exportQuality >= 95 ? 0.4 : 0.15))} MB</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 border border-primary-500/20 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={handleGenerateWatermarked}
              disabled={isProcessing || images.length === 0 || !hasLayers}
              className="group relative w-full overflow-hidden rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 transition-transform group-hover:scale-105 group-disabled:grayscale" />
              <div className="relative flex items-center justify-center gap-3 px-8 py-4 text-white font-semibold">
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing {processingProgress.current} of {processingProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate Watermarked Images ({images.length})</span>
                  </>
                )}
              </div>
            </button>

            {!hasLayers && (
              <p className="mt-4 text-center text-sm text-accent flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Add at least one watermark layer in the editor first
              </p>
            )}

            {isProcessing && (
              <div className="mt-4 space-y-2 animate-fade-in">
                <div className="h-2 bg-dark-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300 rounded-full shadow-glow"
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-dark-400 text-center">Processing in batches of 5 for optimal performance...</p>
              </div>
            )}
          </div>

          {/* Results */}
          {canExport && (
            <div className="backdrop-blur-xl bg-dark-800/40 border border-white/10 rounded-2xl p-6 shadow-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-success to-success-dark rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Results</h3>
                    <p className="text-sm text-dark-400">{processedCount} of {images.length} processed successfully</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadZip}
                  className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-glow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All as ZIP
                </button>
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
                {processedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group flex items-center gap-4 p-4 bg-dark-900/30 hover:bg-dark-900/50 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200"
                  >
                    {image.processedDataUrl && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-dark-800">
                        <img
                          src={image.processedDataUrl}
                          alt={image.originalFile.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{image.originalFile.name}</p>
                      {image.error ? (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {image.error}
                        </p>
                      ) : (
                        <p className="text-xs text-dark-400 flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Processed
                          </span>
                          <span>•</span>
                          <span>{exportFormat.toUpperCase()}</span>
                          {exportFormat !== 'png' && (
                            <>
                              <span>•</span>
                              <span>{exportQuality}% quality</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    {image.processedBlob && (
                      <button
                        onClick={() => handleDownloadSingle(image)}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 hover:border-white/10 text-dark-300 hover:text-white text-sm font-medium rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
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

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
          border: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(14, 165, 233, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(14, 165, 233, 0.7);
        }
      `}</style>
    </div>
  );
}
