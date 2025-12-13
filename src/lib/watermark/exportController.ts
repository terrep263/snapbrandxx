/**
 * Export Controller - Concurrency-Limited Bulk Export
 * 
 * Handles bulk export with:
 * - Concurrency limits (default: 2)
 * - Progress tracking
 * - Cancel support
 * - Error handling (continues on failure)
 * - Retry support
 * 
 * NEWLY CREATED for Sprint 4
 */

import { ProcessedImage, TextVariableContext } from './types';
import { WatermarkLayer } from './types';
import { LogoItem } from '../logoLibrary';
import { renderWatermarkedCanvas, RenderOptions } from './render';
import { normalizeError } from './errorUtils';

export interface ExportResult {
  imageId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  blob?: Blob;
  dataUrl?: string;
  error?: string;
}

export interface ExportProgress {
  current: number;
  total: number;
  results: ExportResult[];
}

export interface ExportControllerOptions {
  concurrency?: number; // Default: 2
  onProgress?: (progress: ExportProgress) => void;
}

export class ExportController {
  private concurrency: number;
  private onProgress?: (progress: ExportProgress) => void;
  private abortController: AbortController | null = null;
  private isRunning = false;
  private currentResults: ExportResult[] = [];
  private imagesForContext: ProcessedImage[] = [];

  constructor(options: ExportControllerOptions = {}) {
    this.concurrency = options.concurrency ?? 2;
    this.onProgress = options.onProgress;
  }

  /**
   * Export all images with concurrency control
   */
  async exportAll(
    images: ProcessedImage[],
    getLayersForImage: (imageId: string) => WatermarkLayer[],
    logoLibrary: Map<string, LogoItem>,
    options: RenderOptions
  ): Promise<ExportResult[]> {
    // Store images array for variable context generation
    this.imagesForContext = images;
    if (this.isRunning) {
      throw new Error('Export is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentResults = images.map(img => ({
      imageId: img.id,
      status: 'pending' as const,
    }));

    this.updateProgress();

    // Create queue with indices
    const queue = images.map((img, index) => ({ image: img, index }));
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    // Process queue with concurrency limit
    while (queue.length > 0 || inProgress.size > 0) {
      if (this.abortController?.signal.aborted) {
        // Mark remaining as cancelled
        queue.forEach(({ image: img }) => {
          const result = this.currentResults.find(r => r.imageId === img.id);
          if (result && result.status === 'pending') {
            result.status = 'failed';
            result.error = 'Cancelled';
          }
        });
        this.isRunning = false;
        this.updateProgress();
        return this.currentResults;
      }

      // Start new jobs up to concurrency limit
      while (inProgress.size < this.concurrency && queue.length > 0) {
        const { image, index: imageIndex } = queue.shift()!;
        inProgress.add(image.id);

        // Update status to processing
        const result = this.currentResults.find(r => r.imageId === image.id);
        if (result) {
          result.status = 'processing';
          this.updateProgress();
        }

        // Process image (don't await - let it run concurrently)
        this.processImage(image, imageIndex, getLayersForImage, logoLibrary, options)
          .then((exportResult) => {
            inProgress.delete(image.id);
            completed.add(image.id);

            // Update result
            const result = this.currentResults.find(r => r.imageId === image.id);
            if (result) {
              result.status = exportResult.status;
              result.blob = exportResult.blob;
              result.dataUrl = exportResult.dataUrl;
              result.error = exportResult.error;
            }

            this.updateProgress();
          })
          .catch((error) => {
            inProgress.delete(image.id);
            completed.add(image.id);

            const result = this.currentResults.find(r => r.imageId === image.id);
            if (result) {
              result.status = 'failed';
              result.error = error instanceof Error ? error.message : 'Unknown error';
            }

            this.updateProgress();
          });
      }

      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isRunning = false;
    this.updateProgress();
    return this.currentResults;
  }

  /**
   * Process a single image
   */
  private async processImage(
    image: ProcessedImage,
    imageIndex: number,
    getLayersForImage: (imageId: string) => WatermarkLayer[],
    logoLibrary: Map<string, LogoItem>,
    options: RenderOptions
  ): Promise<ExportResult> {
    try {
      const layers = getLayersForImage(image.id);
      const enabledLayers = layers.filter(l => l.enabled);

      if (enabledLayers.length === 0) {
        return {
          imageId: image.id,
          status: 'failed',
          error: 'No watermark layers applied',
        };
      }

      // Create variable context for this image
      const filename = image.originalFile.name.replace(/\.[^.]+$/, ''); // Remove extension
      const variableContext: TextVariableContext = {
        filename,
        index: imageIndex + 1, // 1-based index
        date: new Date(),
      };

      // Add variable context to options
      const optionsWithContext: RenderOptions = {
        ...options,
        variableContext,
      };

      const blob = await renderWatermarkedCanvas(
        image.originalDataUrl,
        enabledLayers,
        undefined, // Use image dimensions
        undefined,
        optionsWithContext,
        logoLibrary
      ) as Blob;

      const dataUrl = URL.createObjectURL(blob);

      return {
        imageId: image.id,
        status: 'done',
        blob,
        dataUrl,
      };
    } catch (error) {
      const normalizedError = normalizeError(error, {
        imageName: image.originalFile.name,
        operation: 'export',
      });
      return {
        imageId: image.id,
        status: 'failed',
        error: normalizedError.message,
      };
    }
  }

  /**
   * Retry failed exports
   */
  async retryFailed(
    images: ProcessedImage[],
    getLayersForImage: (imageId: string) => WatermarkLayer[],
    logoLibrary: Map<string, LogoItem>,
    options: RenderOptions
  ): Promise<ExportResult[]> {
    if (this.isRunning) {
      throw new Error('Export is already running');
    }

    const failedResults = this.currentResults.filter(r => r.status === 'failed');
    const failedImageIds = new Set(failedResults.map(r => r.imageId));
    const failedImages = images.filter(img => failedImageIds.has(img.id));

    if (failedImages.length === 0) {
      return this.currentResults;
    }

    // Revoke old object URLs to prevent memory leaks
    failedResults.forEach(result => {
      if (result.dataUrl) {
        URL.revokeObjectURL(result.dataUrl);
      }
    });

    // Reset failed results to pending
    failedResults.forEach(result => {
      result.status = 'pending';
      result.error = undefined;
      result.blob = undefined;
      result.dataUrl = undefined;
    });

    this.updateProgress();

    // Process only failed images with same concurrency control
    this.isRunning = true;
    this.abortController = new AbortController();

    const queue = [...failedImages];
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    // Process queue with concurrency limit
    while (queue.length > 0 || inProgress.size > 0) {
      if (this.abortController?.signal.aborted) {
        queue.forEach(img => {
          const result = this.currentResults.find(r => r.imageId === img.id);
          if (result && result.status === 'pending') {
            result.status = 'failed';
            result.error = 'Cancelled';
          }
        });
        this.isRunning = false;
        this.updateProgress();
        return this.currentResults;
      }

      // Start new jobs up to concurrency limit
      while (inProgress.size < this.concurrency && queue.length > 0) {
        const image = queue.shift()!;
        inProgress.add(image.id);

        const result = this.currentResults.find(r => r.imageId === image.id);
        if (result) {
          result.status = 'processing';
          this.updateProgress();
        }

        const imageIndex = failedImages.indexOf(image);
        const originalIndex = this.imagesForContext.indexOf(image);
        this.processImage(image, originalIndex >= 0 ? originalIndex : imageIndex, getLayersForImage, logoLibrary, options)
          .then((exportResult) => {
            inProgress.delete(image.id);
            completed.add(image.id);

            const result = this.currentResults.find(r => r.imageId === image.id);
            if (result) {
              result.status = exportResult.status;
              result.blob = exportResult.blob;
              result.dataUrl = exportResult.dataUrl;
              result.error = exportResult.error;
            }

            this.updateProgress();
          })
          .catch((error) => {
            inProgress.delete(image.id);
            completed.add(image.id);

            const result = this.currentResults.find(r => r.imageId === image.id);
            if (result) {
              result.status = 'failed';
              result.error = error instanceof Error ? error.message : 'Unknown error';
            }

            this.updateProgress();
          });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isRunning = false;
    this.updateProgress();
    return this.currentResults;
  }

  /**
   * Cancel current export
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  /**
   * Check if export is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get current results
   */
  get results(): ExportResult[] {
    return [...this.currentResults];
  }

  /**
   * Update progress callback
   */
  private updateProgress(): void {
    if (this.onProgress) {
      const done = this.currentResults.filter(r => r.status === 'done').length;
      const failed = this.currentResults.filter(r => r.status === 'failed').length;
      const processing = this.currentResults.filter(r => r.status === 'processing').length;
      const total = this.currentResults.length;

      this.onProgress({
        current: done + failed,
        total,
        results: [...this.currentResults],
      });
    }
  }

  /**
   * Cleanup object URLs to prevent memory leaks
   */
  cleanup(): void {
    this.currentResults.forEach(result => {
      if (result.dataUrl) {
        URL.revokeObjectURL(result.dataUrl);
      }
    });
  }
}

