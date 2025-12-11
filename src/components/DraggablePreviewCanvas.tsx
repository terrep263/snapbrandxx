'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WatermarkLayer, Anchor } from '@/lib/watermark/types';
import { ProcessedImage } from '@/lib/watermark/types';
import { applyWatermarkLayers } from '@/lib/watermark/engine';
import { useWatermark } from '@/lib/watermark/context';

interface DraggablePreviewCanvasProps {
  image: ProcessedImage | null;
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onLayerUpdate: (layer: WatermarkLayer) => void;
}

export default function DraggablePreviewCanvas({
  image,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
}: DraggablePreviewCanvasProps) {
  const { logoLibrary } = useWatermark();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Get anchor point coordinates
  const getAnchorPoint = useCallback((anchor: Anchor, width: number, height: number) => {
    switch (anchor) {
      case Anchor.TOP_LEFT:
        return { x: 0, y: 0 };
      case Anchor.TOP_RIGHT:
        return { x: width, y: 0 };
      case Anchor.BOTTOM_LEFT:
        return { x: 0, y: height };
      case Anchor.BOTTOM_RIGHT:
        return { x: width, y: height };
      case Anchor.CENTER:
        return { x: width / 2, y: height / 2 };
    }
  }, []);

  // Draw canvas with preview and layer indicators
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !previewImageRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container dimensions
    let maxWidth = 800;
    let maxHeight = 600;
    
    const container = canvas.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      maxWidth = Math.min(containerRect.width - 32, 1200);
      maxHeight = Math.min(window.innerHeight * 0.7, 800);
    }

    // Calculate canvas size to fit image
    const imageAspect = image.width / image.height;
    const containerAspect = maxWidth / maxHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (imageAspect > containerAspect) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imageAspect;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imageAspect;
    }

    if (canvasWidth < 200) {
      canvasWidth = 200;
      canvasHeight = 200 / imageAspect;
    }
    if (canvasHeight < 200) {
      canvasHeight = 200;
      canvasWidth = 200 * imageAspect;
    }

    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);

    // Draw preview image
    ctx.drawImage(previewImageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw selection indicator
    const previewScale = 0.3;
    const effectiveScaleX = canvasWidth / (image.width * previewScale);
    const effectiveScaleY = canvasHeight / (image.height * previewScale);

    layers.forEach((layer) => {
      if (layer.id === selectedLayerId) {
        const previewWidth = image.width * previewScale;
        const previewHeight = image.height * previewScale;
        const anchorPoint = getAnchorPoint(layer.anchor, previewWidth, previewHeight);
        const offsetX = (layer.offsetX / 100) * previewWidth;
        const offsetY = (layer.offsetY / 100) * previewHeight;
        const baseX = anchorPoint.x + offsetX;
        const baseY = anchorPoint.y + offsetY;
        
        let layerWidth = 0;
        let layerHeight = 0;
        
        if (layer.type === 'text' && layer.text) {
          const fontSizeRelative = layer.fontSizeRelative || 5;
          const fontSize = (previewHeight * fontSizeRelative / 100) * layer.scale;
          ctx.font = `${fontSize}px ${layer.fontFamily || 'Inter'}`;
          const metrics = ctx.measureText(layer.text);
          layerWidth = metrics.width;
          layerHeight = fontSize * 1.2;
        }
        
        if (layerWidth > 0 && layerHeight > 0) {
          const canvasBaseX = baseX * effectiveScaleX;
          const canvasBaseY = baseY * effectiveScaleY;
          const canvasContentWidth = layerWidth * effectiveScaleX;
          const canvasContentHeight = layerHeight * effectiveScaleY;
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            canvasBaseX - canvasContentWidth / 2,
            canvasBaseY - canvasContentHeight / 2,
            canvasContentWidth,
            canvasContentHeight
          );
        }
      }
    });
  }, [image, layers, selectedLayerId, getAnchorPoint]);

  // Load preview image
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const generatePreview = async () => {
      try {
        const dataUrl = await applyWatermarkLayers(
          image.originalDataUrl,
          layers,
          logoLibrary,
          {
            format: 'jpeg',
            quality: 0.85,
            scale: 0.3, // 30% scale for preview
            returnDataUrl: true
          }
        ) as string;
        
        const img = new Image();
        img.onload = () => {
          previewImageRef.current = img;
          drawCanvas();
        };
        img.src = dataUrl;
      } catch (error) {
        console.error('Error generating preview', error);
      }
    };

    generatePreview();
  }, [image, layers, logoLibrary, drawCanvas]);

  useEffect(() => {
    if (previewImageRef.current) {
      drawCanvas();
    }
  }, [drawCanvas]);

  // Handle resize
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const handleResize = () => {
      if (previewImageRef.current) {
        drawCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    
    const container = canvasRef.current.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [image, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Simple click handling - just select first layer for now
    if (layers.length > 0 && selectedLayerId !== layers[0].id) {
      onLayerSelect(layers[0].id);
    }
    
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !selectedLayerId || !image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (!selectedLayer) return;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const offsetXDelta = (deltaX * scaleX / image.width) * 100;
    const offsetYDelta = (deltaY * scaleY / image.height) * 100;

    let newOffsetX = selectedLayer.offsetX + offsetXDelta;
    let newOffsetY = selectedLayer.offsetY + offsetYDelta;

    newOffsetX = Math.max(-100, Math.min(100, newOffsetX));
    newOffsetY = Math.max(-100, Math.min(100, newOffsetY));

    onLayerUpdate({
      ...selectedLayer,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 border border-gray-700 rounded-lg">
        <p className="text-gray-500 text-sm">Upload an image to see preview</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Preview Canvas</h2>
      <p className="text-xs text-gray-400 mb-3">
        Click and drag to reposition watermark
      </p>
      <div className="relative border border-gray-700 rounded overflow-auto bg-gray-800 flex items-center justify-center min-h-[400px]">
        <canvas
          ref={canvasRef}
          className="cursor-move"
          style={{ 
            imageRendering: 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'block'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        {isDragging && selectedLayerId && (
          <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
            Dragging: {layers.find((l) => l.id === selectedLayerId)?.type || 'layer'}
          </div>
        )}
      </div>
    </div>
  );
}
