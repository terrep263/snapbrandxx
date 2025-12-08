'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WatermarkLayer, Anchor, applyWatermarkLayers } from '@/lib/watermarkEngine';
import { ProcessedImage } from '@/lib/watermarkEngine';

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

    // Calculate canvas size to fit image
    const maxWidth = 800;
    const maxHeight = 600;
    const imageAspect = image.width / image.height;
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / imageAspect;

    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imageAspect;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw preview image
    ctx.drawImage(previewImageRef.current, 0, 0, canvasWidth, canvasHeight);

    // Draw layer position indicators
    const scaleX = canvasWidth / image.width;
    const scaleY = canvasHeight / image.height;

    layers.forEach((layer) => {
      const anchorPoint = getAnchorPoint(layer.anchor, image.width, image.height);
      const offsetX = (layer.offsetX / 100) * image.width;
      const offsetY = (layer.offsetY / 100) * image.height;
      const x = (anchorPoint.x + offsetX) * scaleX;
      const y = (anchorPoint.y + offsetY) * scaleY;

      // Draw selection indicator
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x - 20, y - 20, 40, 40);
        ctx.setLineDash([]);
      }

      // Draw anchor point
      ctx.fillStyle = layer.id === selectedLayerId ? '#10b981' : '#f97316';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [image, layers, selectedLayerId, getAnchorPoint]);

  // Load preview image when image or layers change
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const generatePreview = async () => {
      try {
        const dataUrl = await applyWatermarkLayers(
          image.originalDataUrl,
          layers,
          true,
          0.5 // 50% scale for preview performance
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
  }, [image, layers, drawCanvas]);

  useEffect(() => {
    if (previewImageRef.current) {
      drawCanvas();
    }
  }, [drawCanvas]);

  // Convert canvas coordinates to percentage offsets
  const canvasToPercentage = useCallback(
    (canvasX: number, canvasY: number, layer: WatermarkLayer) => {
      if (!image || !canvasRef.current) return { offsetX: 0, offsetY: 0 };

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = image.width / rect.width;
      const scaleY = image.height / rect.height;

      const actualX = canvasX * scaleX;
      const actualY = canvasY * scaleY;

      const anchorPoint = getAnchorPoint(layer.anchor, image.width, image.height);
      const offsetX = ((actualX - anchorPoint.x) / image.width) * 100;
      const offsetY = ((actualY - anchorPoint.y) / image.height) * 100;

      return { offsetX, offsetY };
    },
    [image, getAnchorPoint]
  );

  // Hit test to find which layer was clicked
  const hitTestLayer = useCallback(
    (canvasX: number, canvasY: number): WatermarkLayer | null => {
      if (!image || !canvasRef.current) return null;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = image.width / rect.width;
      const scaleY = image.height / rect.height;

      const actualX = canvasX * scaleX;
      const actualY = canvasY * scaleY;

      // Check layers in reverse order (topmost first)
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const anchorPoint = getAnchorPoint(layer.anchor, image.width, image.height);
        const offsetX = (layer.offsetX / 100) * image.width;
        const offsetY = (layer.offsetY / 100) * image.height;
        const layerX = anchorPoint.x + offsetX;
        const layerY = anchorPoint.y + offsetY;

        // Calculate layer bounds (approximate)
        let layerWidth = 0;
        let layerHeight = 0;

        if (layer.type === 'text' && layer.text) {
          // For text, estimate bounds based on font size
          const fontSize = (layer.fontSize || 24) * layer.scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.font = `${fontSize}px ${layer.fontFamily || 'Inter'}`;
            layerWidth = ctx.measureText(layer.text).width;
            layerHeight = fontSize;
          }
        } else if (layer.type === 'logo' && layer.logoImage) {
          // For logo, use actual image dimensions scaled
          layerWidth = layer.logoImage.width * layer.scale;
          layerHeight = layer.logoImage.height * layer.scale;
        }

        // Account for rotation - use a bounding box approach
        // For simplicity, use a generous hit area (2x the layer size)
        const hitRadius = Math.max(layerWidth, layerHeight) * 1.5;

        const dx = actualX - layerX;
        const dy = actualY - layerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= hitRadius) {
          return layer;
        }
      }

      return null;
    },
    [image, layers, getAnchorPoint]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Perform hit test to find clicked layer
    const clickedLayer = hitTestLayer(x, y);
    
    if (clickedLayer) {
      onLayerSelect(clickedLayer.id);
      setIsDragging(true);
      setDragStart({ x, y });
    } else {
      // Clicked on empty space - deselect
      onLayerSelect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !selectedLayerId || !image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (!selectedLayer) return;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    // Convert pixel delta to percentage
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const offsetXDelta = (deltaX * scaleX / image.width) * 100;
    const offsetYDelta = (deltaY * scaleY / image.height) * 100;

    onLayerUpdate({
      ...selectedLayer,
      offsetX: selectedLayer.offsetX + offsetXDelta,
      offsetY: selectedLayer.offsetY + offsetYDelta,
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
        Click and drag layers to reposition them
      </p>
      <div className="relative border border-gray-700 rounded overflow-hidden bg-gray-800">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[600px] cursor-move"
          style={{ imageRendering: 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        {selectedLayerId && (
          <div className="absolute top-2 left-2 bg-primary/80 text-white text-xs px-2 py-1 rounded">
            Dragging: {layers.find((l) => l.id === selectedLayerId)?.type || 'layer'}
          </div>
        )}
      </div>
    </div>
  );
}

