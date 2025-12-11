/**
 * Watermark Preview Canvas
 * 
 * High-quality preview with drag, resize, rotation, and zoom controls
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WatermarkLayer, ProcessedImage, Anchor } from '@/lib/watermark/types';
import { applyWatermarkLayers } from '@/lib/watermark/engine';
import { useWatermark } from '@/lib/watermark/context';

interface WatermarkPreviewCanvasProps {
  image: ProcessedImage;
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
}

type ZoomLevel = 'fit' | number; // 'fit' or percentage (100, 200, etc.)

export default function WatermarkPreviewCanvas({
  image,
  layers,
  selectedLayerId,
  onLayerSelect,
}: WatermarkPreviewCanvasProps) {
  const { logoLibrary, updateLayer, getLayersForImage } = useWatermark();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  
  const [zoom, setZoom] = useState<ZoomLevel>('fit');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 });

  const getAnchorPoint = (anchor: Anchor, width: number, height: number) => {
    switch (anchor) {
      case Anchor.TOP_LEFT: return { x: 0, y: 0 };
      case Anchor.TOP_RIGHT: return { x: width, y: 0 };
      case Anchor.BOTTOM_LEFT: return { x: 0, y: height };
      case Anchor.BOTTOM_RIGHT: return { x: width, y: height };
      case Anchor.CENTER: return { x: width / 2, y: height / 2 };
    }
  };

  // Draw selection box around layer
  const drawSelectionBox = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: WatermarkLayer,
    imageWidth: number,
    imageHeight: number,
    scale: number
  ) => {
    const anchorPoint = getAnchorPoint(layer.anchor, imageWidth, imageHeight);
    const offsetX = (layer.offsetX / 100) * imageWidth;
    const offsetY = (layer.offsetY / 100) * imageHeight;
    const baseX = anchorPoint.x + offsetX;
    const baseY = anchorPoint.y + offsetY;

    // Calculate layer bounds
    let layerWidth = 0;
    let layerHeight = 0;
    let contentOffsetX = 0;
    let contentOffsetY = 0;

    if (layer.type === 'text' && layer.text) {
      // Measure text (simplified - would need actual measurement)
      const fontSizeRelative = layer.fontSizeRelative || 5;
      const fontSize = (imageHeight * fontSizeRelative / 100) * layer.scale;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.font = `${fontSize}px ${layer.fontFamily || 'Inter'}`;
        const metrics = tempCtx.measureText(layer.text);
        layerWidth = metrics.width;
        layerHeight = fontSize * 1.2;
        contentOffsetX = 0;
        contentOffsetY = -fontSize * 0.2;
      }
    } else if (layer.type === 'logo') {
      // Logo dimensions (would need actual logo image)
      layerWidth = 100 * layer.scale; // Placeholder
      layerHeight = 100 * layer.scale; // Placeholder
      contentOffsetX = -layerWidth / 2;
      contentOffsetY = -layerHeight / 2;
    }

    if (layerWidth > 0 && layerHeight > 0) {
      const canvasX = (baseX + contentOffsetX) * scale;
      const canvasY = (baseY + contentOffsetY) * scale;
      const canvasWidth = layerWidth * scale;
      const canvasHeight = layerHeight * scale;

      // Draw white outline box
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([]);
      ctx.strokeRect(canvasX - 2, canvasY - 2, canvasWidth + 4, canvasHeight + 4);
    }
  }, []);

  // Draw canvas with zoom and pan
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !previewImageRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Calculate canvas size
    const previewWidth = previewImageRef.current.width;
    const previewHeight = previewImageRef.current.height;
    const aspectRatio = previewWidth / previewHeight;

    let displayWidth: number;
    let displayHeight: number;
    let scale: number;

    if (zoom === 'fit') {
      // Fit to container
      const maxWidth = containerRect.width - 40;
      const maxHeight = containerRect.height - 40;
      if (maxWidth / aspectRatio <= maxHeight) {
        displayWidth = maxWidth;
        displayHeight = maxWidth / aspectRatio;
      } else {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }
      scale = displayWidth / previewWidth;
    } else {
      // Fixed zoom percentage
      scale = zoom / 100;
      displayWidth = previewWidth * scale;
      displayHeight = previewHeight * scale;
    }

    // Set canvas size with device pixel ratio
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Apply pan
    ctx.save();
    ctx.translate(pan.x, pan.y);

    // Draw preview image
    ctx.drawImage(previewImageRef.current, 0, 0, displayWidth, displayHeight);

    // Draw selection box for selected layer
    if (selectedLayerId) {
      const layer = layers.find(l => l.id === selectedLayerId);
      if (layer) {
        drawSelectionBox(ctx, layer, image.width, image.height, scale);
      }
    }

    ctx.restore();
  }, [zoom, pan, selectedLayerId, layers, image, drawSelectionBox]);

  // Generate preview image
  const generatePreview = useCallback(async () => {
    if (!image) return;

    try {
      // First, show the original image immediately if we don't have a preview yet
      if (!previewImageRef.current) {
        const originalImg = new Image();
        originalImg.onload = () => {
          previewImageRef.current = originalImg;
          if (canvasRef.current) {
            drawCanvas();
          }
        };
        originalImg.onerror = () => {
          console.error('Failed to load original image');
        };
        originalImg.src = image.originalDataUrl;
      }

      let dataUrl: string;
      
      // If no layers, just use the original image
      if (layers.length === 0 || layers.every(l => !l.enabled)) {
        dataUrl = image.originalDataUrl;
      } else {
        // Apply watermarks
        dataUrl = await applyWatermarkLayers(
          image.originalDataUrl,
          layers.filter(l => l.enabled),
          logoLibrary,
          { scale: 0.5, returnDataUrl: true } // 50% scale for preview performance
        ) as string;
      }

      // Only update if we have layers or if the dataUrl is different
      if (layers.length > 0 && !layers.every(l => !l.enabled)) {
        const img = new Image();
        img.onload = () => {
          previewImageRef.current = img;
          if (canvasRef.current) {
            drawCanvas();
          }
        };
        img.onerror = (error) => {
          console.error('Error loading preview image:', error);
          // Keep the original image if watermarking fails
        };
        img.src = dataUrl;
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      // Fallback to original image on error
      if (!previewImageRef.current) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          previewImageRef.current = fallbackImg;
          if (canvasRef.current) {
            drawCanvas();
          }
        };
        fallbackImg.onerror = () => {
          console.error('Failed to load fallback image');
        };
        fallbackImg.src = image.originalDataUrl;
      }
    }
  }, [image, layers, logoLibrary, drawCanvas]);

  // Handle mouse events for dragging layers
  const handleMouseDown = (e: React.MouseEvent) => {
    // TODO: Implement layer hit testing and dragging
    // For now, just handle canvas panning when zoomed
    if (zoom !== 'fit') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom !== 'fit') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (zoom === 'fit') {
      setZoom(100);
    } else {
      setZoom(Math.min(zoom + 50, 400));
    }
    setPan({ x: 0, y: 0 });
  };

  const handleZoomOut = () => {
    if (zoom === 'fit') {
      return;
    } else if (zoom <= 100) {
      setZoom('fit');
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(Math.max(zoom - 50, 100));
    }
  };

  const handleZoomFit = () => {
    setZoom('fit');
    setPan({ x: 0, y: 0 });
  };

  // Generate preview when layers or image change
  useEffect(() => {
    if (image) {
      generatePreview();
    }
  }, [image, layers, generatePreview]);

  // Redraw when zoom/pan or selection changes
  useEffect(() => {
    if (previewImageRef.current && canvasRef.current) {
      drawCanvas();
    }
  }, [zoom, pan, selectedLayerId, drawCanvas]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">{image.originalFile.name}</h3>
          <p className="text-xs text-gray-500">
            {image.width} × {image.height}px
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            disabled={zoom === 'fit'}
          >
            −
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center">
            {zoom === 'fit' ? 'Fit' : `${zoom}%`}
          </span>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            +
          </button>
          <button
            onClick={handleZoomFit}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors ml-2"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-800 flex items-center justify-center p-4 relative min-h-0 custom-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {image && previewImageRef.current ? (
          <canvas
            ref={canvasRef}
            className="cursor-move"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : image ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Loading preview...</h3>
            <p className="text-sm text-gray-400">
              Generating image preview
            </p>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">No image selected</h3>
            <p className="text-sm text-gray-400">
              Select an image from the left panel to start editing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

