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

    // Get container dimensions - use a reasonable default if container not available
    let maxWidth = 800;
    let maxHeight = 600;
    
    const container = canvas.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      maxWidth = Math.min(containerRect.width - 32, 1200); // Account for padding
      maxHeight = Math.min(window.innerHeight * 0.7, 800);
    }

    // Calculate canvas size to fit image while maintaining aspect ratio
    const imageAspect = image.width / image.height;
    const containerAspect = maxWidth / maxHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imageAspect;
    } else {
      // Image is taller - fit to height
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imageAspect;
    }

    // Ensure minimum size
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

    // Draw layer position indicators
    // Note: preview image is generated at 0.5 scale, so effective scale is 2x
    const previewScale = 0.5;
    const effectiveScaleX = canvasWidth / (image.width * previewScale);
    const effectiveScaleY = canvasHeight / (image.height * previewScale);

    layers.forEach((layer) => {
      // Only draw selection indicator for selected layer
      if (layer.id === selectedLayerId) {
        // Calculate anchor point and offsets in preview space (0.5 scale)
        // This matches how renderLayer calculates positions in the watermark engine
        const previewWidth = image.width * previewScale;
        const previewHeight = image.height * previewScale;
        const anchorPoint = getAnchorPoint(layer.anchor, previewWidth, previewHeight);
        const offsetX = (layer.offsetX / 100) * previewWidth;
        const offsetY = (layer.offsetY / 100) * previewHeight;
        const baseX = anchorPoint.x + offsetX;
        const baseY = anchorPoint.y + offsetY;
        
        // Calculate layer content bounds (matching the actual rendered size in preview)
        let layerWidth = 0;
        let layerHeight = 0;
        let contentOffsetX = 0;
        let contentOffsetY = 0;
        
        if (layer.type === 'text' && layer.text) {
          // Measure text dimensions - use the same scale as preview generation
          const fontSize = (layer.fontSize || 24) * layer.scale * previewScale;
          ctx.font = `${fontSize}px ${layer.fontFamily || 'Inter'}`;
          const metrics = ctx.measureText(layer.text);
          layerWidth = metrics.width;
          
          // Get more accurate text height using font metrics
          // Text is drawn at (0, fontSize) in transformed space, meaning baseline is at fontSize
          // Most text is above the baseline (ascent), some below (descent)
          const actualBoundingBoxAscent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
          const actualBoundingBoxDescent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
          layerHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
          
          // Text is drawn at fillText(text, 0, fontSize) in transformed coordinate space
          // After translate(baseX, baseY), the text baseline is at (baseX, baseY + fontSize)
          // The text extends from y=baseY to y=baseY+fontSize+descent (mostly above baseline)
          // So the box top should be at baseY - (fontSize - actualBoundingBoxAscent)
          // Actually, since fillText draws at (0, fontSize), the text top is at y=fontSize - ascent
          // In original coordinates: baseY + (fontSize - ascent) to baseY + (fontSize + descent)
          // So contentOffsetY should position the box top correctly
          contentOffsetX = 0; // Text starts at anchor X (x=0 in transformed space)
          contentOffsetY = fontSize - actualBoundingBoxAscent; // Position box top relative to anchor
        } else if (layer.type === 'logo' && layer.logoImage) {
          // Use logo dimensions with preview scale
          layerWidth = layer.logoImage.width * layer.scale * previewScale;
          layerHeight = layer.logoImage.height * layer.scale * previewScale;
          
          // Logo is centered at anchor point
          contentOffsetX = -layerWidth / 2;
          contentOffsetY = -layerHeight / 2;
        }
        
        if (layerWidth > 0 && layerHeight > 0) {
          // Convert preview coordinates to canvas coordinates
          // baseX and baseY are already in preview space, so scale directly to canvas
          const canvasBaseX = baseX * effectiveScaleX;
          const canvasBaseY = baseY * effectiveScaleY;
          const canvasContentWidth = layerWidth * effectiveScaleX;
          const canvasContentHeight = layerHeight * effectiveScaleY;
          const canvasOffsetX = contentOffsetX * effectiveScaleX;
          const canvasOffsetY = contentOffsetY * effectiveScaleY;
          
          // Calculate box position
          const boxX = canvasBaseX + canvasOffsetX;
          const boxY = canvasBaseY + canvasOffsetY;
          
          // Draw white outline box around layer content with small padding
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.strokeRect(boxX - 2, boxY - 2, canvasContentWidth + 4, canvasContentHeight + 4);
        }
      }
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

  // Handle window/container resize
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
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (!selectedLayer) return;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    // Convert pixel delta to percentage
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const offsetXDelta = (deltaX * scaleX / image.width) * 100;
    const offsetYDelta = (deltaY * scaleY / image.height) * 100;

    // Calculate new offsets
    let newOffsetX = selectedLayer.offsetX + offsetXDelta;
    let newOffsetY = selectedLayer.offsetY + offsetYDelta;

    // Constrain offsets to keep layer within reasonable bounds (-100% to +100% from anchor)
    // This prevents layers from going completely off-screen
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
        Click and drag layers to reposition them
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
        {selectedLayerId && (
          <div className="absolute top-2 left-2 bg-primary/80 text-white text-xs px-2 py-1 rounded">
            Dragging: {layers.find((l) => l.id === selectedLayerId)?.type || 'layer'}
          </div>
        )}
      </div>
    </div>
  );
}

