'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Rect, Circle, Line as KonvaLine } from 'react-konva';
import Konva from 'konva';
import { WatermarkLayer, Anchor, ProcessedImage, TextAlign, ShapeType, TextVariableContext } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';
import { useElementSize } from '@/lib/hooks/useElementSize';
import { screenToNorm, normToScreen, legacyOffsetsToNorm, migrateLayerToNorm } from '@/lib/watermark/utils';
import { snapPosition, DEFAULT_HORIZONTAL_GUIDES, DEFAULT_VERTICAL_GUIDES, SnapPositionResult } from '@/lib/watermark/snapping';
import { replaceTextVariables } from '@/lib/watermark/variables';

interface DraggablePreviewCanvasProps {
  image: ProcessedImage | null;
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onLayerUpdate: (layer: WatermarkLayer) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onFitToView?: () => void;
}

// Helper: Get anchor point coordinates
function getAnchorPoint(anchor: Anchor, width: number, height: number): { x: number; y: number } {
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
}

// Helper: Clamp value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Helper: Convert absolute position to centered offsets (LEGACY - for migration)
function toCenteredOffsets(x: number, y: number, width: number, height: number): { offsetX: number; offsetY: number } {
  return {
    offsetX: ((x - width / 2) / width) * 100,
    offsetY: ((y - height / 2) / height) * 100,
  };
}

export default function DraggablePreviewCanvas({
  image,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  zoom: externalZoom,
  onZoomChange,
  onFitToView,
  snapToGuides: externalSnapToGuides,
  onSnapToGuidesChange,
}: DraggablePreviewCanvasProps) {
  const { logoLibrary } = useWatermark();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);
  const [internalZoom, setInternalZoom] = useState(1);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalSnapToGuides, setInternalSnapToGuides] = useState(true);
  const snapToGuides = externalSnapToGuides !== undefined ? externalSnapToGuides : internalSnapToGuides;
  
  const handleSnapToggle = useCallback((enabled: boolean) => {
    if (onSnapToGuidesChange) {
      onSnapToGuidesChange(enabled);
    } else {
      setInternalSnapToGuides(enabled);
    }
  }, [onSnapToGuidesChange]);
  const [activeGuides, setActiveGuides] = useState<{
    horizontal: number | null;
    vertical: number | null;
  }>({ horizontal: null, vertical: null });
  const containerSize = useElementSize(containerRef);
  
  // Store references to Konva nodes for linked layers (for real-time updates during drag)
  const layerNodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  
  // Create variable context for preview (show what variables will look like)
  const variableContext: TextVariableContext | undefined = image ? {
    filename: image.originalFile.name.replace(/\.[^.]+$/, ''), // Remove extension
    index: 1, // Default to 1 for single image preview
    date: new Date(),
  } : undefined;
  
  // Track initial transform values when transform starts
  const transformStartRef = useRef<{
    layerId: string;
    initialScale: number;
    initialRotation: number;
  } | null>(null);
  
  const DRAG_DEAD_ZONE = 5; // pixels
  
  // Use external zoom if provided, otherwise use internal
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = onZoomChange || setInternalZoom;

  // Load base image
  useEffect(() => {
    if (!image?.originalDataUrl) {
      setBaseImageLoaded(false);
      baseImageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageRef.current = img;
      setBaseImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load base image');
      setBaseImageLoaded(false);
    };
    img.src = image.originalDataUrl;
  }, [image?.originalDataUrl]);

  // Track loaded logo IDs to force re-render when logos load
  const [loadedLogoIds, setLoadedLogoIds] = useState<Set<string>>(new Set());
  const loadingLogosRef = useRef<Set<string>>(new Set());
  
  // Load logo images
  useEffect(() => {
    if (!logoLibrary) return;

    const logoLayers = layers.filter(l => l.type === 'logo' && l.logoId && l.enabled);

    logoLayers.forEach(layer => {
      if (!layer.logoId) return;
      const logo = logoLibrary.get(layer.logoId);
      
      // If logo is already loaded, skip
      if (logoImageRefs.current.has(layer.logoId)) {
        return;
      }
      
      // If logo is already loading, skip
      if (loadingLogosRef.current.has(layer.logoId)) {
        return;
      }
      
      // If logo not found in library, skip (might be loading)
      if (!logo) {
        return;
      }

      // Mark as loading
      loadingLogosRef.current.add(layer.logoId);

      // Start loading the logo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        logoImageRefs.current.set(layer.logoId!, img);
        loadingLogosRef.current.delete(layer.logoId!);
        // Update state to trigger re-render
        setLoadedLogoIds(prev => {
          const updated = new Set(prev);
          updated.add(layer.logoId!);
          return updated;
        });
        // Force immediate redraw
        requestAnimationFrame(() => {
          stageRef.current?.batchDraw();
        });
      };
      img.onerror = () => {
        console.error(`Failed to load logo: ${layer.logoId}`);
        loadingLogosRef.current.delete(layer.logoId!);
      };
      img.src = logo.imageData;
    });

    // Clean up unused logos
    const usedLogoIds = new Set(logoLayers.map(l => l.logoId).filter(Boolean) as string[]);
    for (const [logoId] of logoImageRefs.current) {
      if (!usedLogoIds.has(logoId)) {
        logoImageRefs.current.delete(logoId);
        setLoadedLogoIds(prev => {
          const updated = new Set(prev);
          updated.delete(logoId);
          return updated;
        });
      }
    }
  }, [layers, logoLibrary]);

  // Calculate stage scale to fit container - leave some padding
  const stageScale = useMemo(() => {
    if (!image) return 1;
    // Use container size if available, otherwise use a default
    const padding = 40; // Padding on all sides
    const containerW = containerSize.width > 0 ? Math.max(containerSize.width - padding, 200) : 800;
    const containerH = containerSize.height > 0 ? Math.max(containerSize.height - padding, 200) : 600;
    const scaleX = containerW / image.width;
    const scaleY = containerH / image.height;
    // Scale down to fit, but don't scale up beyond 1:1
    return Math.min(scaleX, scaleY, 1);
  }, [image, containerSize]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const selectedNode = stageRef.current.findOne(`[name="layer-${selectedLayerId}"]`);
    if (selectedNode) {
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [selectedLayerId]);

  // Migrate layers to normalized format on load
  const normalizedLayers = useMemo(() => {
    return layers.map(layer => migrateLayerToNorm(layer));
  }, [layers]);

  // Handle layer position calculation using normalized coordinates
  const getLayerPosition = useCallback((layer: WatermarkLayer): { x: number; y: number } => {
    if (!image) return { x: 0, y: 0 };

    // Support both new (xNorm/yNorm) and legacy (offsetX/offsetY) formats
    let xNorm: number;
    let yNorm: number;

    if (typeof layer.xNorm === 'number' && typeof layer.yNorm === 'number') {
      xNorm = layer.xNorm;
      yNorm = layer.yNorm;
    } else {
      // Legacy: convert offsetX/offsetY to normalized
      const legacy = legacyOffsetsToNorm(layer.offsetX ?? 0, layer.offsetY ?? 0);
      xNorm = legacy.xNorm;
      yNorm = legacy.yNorm;
    }

    const { x, y } = normToScreen(xNorm, yNorm, image.width, image.height);
    return { x, y };
  }, [image]);

  // Handle drag start - track initial position for dead-zone
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setDragStartPos({ x: node.x(), y: node.y() });
    setIsDragging(false);
  }, []);

  // Handle drag move - check dead-zone and update linked layers in real-time
  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!dragStartPos || !image) return;
    
    const node = e.target;
    const dx = Math.abs(node.x() - dragStartPos.x);
    const dy = Math.abs(node.y() - dragStartPos.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > DRAG_DEAD_ZONE && !isDragging) {
      setIsDragging(true);
    }

    // Find the layer being dragged by node name
    const nodeName = node.name();
    if (!nodeName || !nodeName.startsWith('layer-')) return;
    
    const draggedLayerId = nodeName.replace('layer-', '');
    const draggedLayer = normalizedLayers.find(l => l.id === draggedLayerId);
    
    if (!draggedLayer) return;

    // Get current position in normalized coordinates
    const currentXNorm = screenToNorm(node.x(), node.y(), image.width, image.height).xNorm;
    const currentYNorm = screenToNorm(node.x(), node.y(), image.width, image.height).yNorm;

    // Apply snapping
    const snapped = snapPosition(
      currentXNorm,
      currentYNorm,
      DEFAULT_HORIZONTAL_GUIDES,
      DEFAULT_VERTICAL_GUIDES,
      snapToGuides,
      0.03 // 3% threshold
    );

    // Convert snapped position back to screen coordinates
    const { x: snappedX, y: snappedY } = normToScreen(snapped.xNorm, snapped.yNorm, image.width, image.height);

    // Clamp to canvas bounds
    const newX = clamp(snappedX, 0, image.width);
    const newY = clamp(snappedY, 0, image.height);
    node.x(newX);
    node.y(newY);

    // Update active guides for visual feedback
    setActiveGuides(snapped.activeGuides);

    // Update linked layers in real-time (smooth movement)
    if (draggedLayer.groupId) {
      const linkedLayers = normalizedLayers.filter(
        l => l.groupId === draggedLayer.groupId && l.id !== draggedLayer.id
      );

      linkedLayers.forEach(linkedLayer => {
        const linkedNode = layerNodeRefs.current.get(linkedLayer.id);
        if (linkedNode) {
          // Calculate relative offset from original positions
          const draggedOriginalX = draggedLayer.xNorm * image.width;
          const draggedOriginalY = draggedLayer.yNorm * image.height;
          const linkedOriginalX = linkedLayer.xNorm * image.width;
          const linkedOriginalY = linkedLayer.yNorm * image.height;
          
          const offsetX = linkedOriginalX - draggedOriginalX;
          const offsetY = linkedOriginalY - draggedOriginalY;
          
          // Update position maintaining relative offset
          const linkedX = clamp(newX + offsetX, 0, image.width);
          const linkedY = clamp(newY + offsetY, 0, image.height);
          
          linkedNode.x(linkedX);
          linkedNode.y(linkedY);
        }
      });
    }
  }, [dragStartPos, isDragging, image, normalizedLayers, snapToGuides]);

  // Handle drag end - convert to normalized coordinates
  const handleDragEnd = useCallback((layer: WatermarkLayer, node: Konva.Node) => {
    if (!image) return;

    const x = clamp(node.x(), 0, image.width);
    const y = clamp(node.y(), 0, image.height);

    // Apply final snapping before saving
    const { xNorm: rawXNorm, yNorm: rawYNorm } = screenToNorm(x, y, image.width, image.height);
    const finalSnapped = snapPosition(
      rawXNorm,
      rawYNorm,
      DEFAULT_HORIZONTAL_GUIDES,
      DEFAULT_VERTICAL_GUIDES,
      snapToGuides,
      0.03
    );
    
    const { xNorm, yNorm } = { xNorm: finalSnapped.xNorm, yNorm: finalSnapped.yNorm };

    // Get all layers in the same group
    const groupId = layer.groupId;
    const updates: Partial<WatermarkLayer> = {
      xNorm,
      yNorm,
      anchor: Anchor.CENTER,
    };

    if (groupId) {
      // Update all layers in the group
      normalizedLayers
        .filter(l => l.groupId === groupId && l.id !== layer.id)
        .forEach(groupLayer => {
          const groupX = clamp(node.x() + (groupLayer.xNorm - layer.xNorm) * image.width, 0, image.width);
          const groupY = clamp(node.y() + (groupLayer.yNorm - layer.yNorm) * image.height, 0, image.height);
          const { xNorm: groupXNorm, yNorm: groupYNorm } = screenToNorm(groupX, groupY, image.width, image.height);
          onLayerUpdate({
            ...groupLayer,
            xNorm: groupXNorm,
            yNorm: groupYNorm,
            anchor: Anchor.CENTER,
          });
        });
    }

    onLayerUpdate({
      ...layer,
      ...updates,
    });

    setDragStartPos(null);
    setIsDragging(false);
    // Clear active guides when drag ends
    setActiveGuides({ horizontal: null, vertical: null });
  }, [image, onLayerUpdate, normalizedLayers]);

  // Handle transform start - track initial values for all layers in the group
  const handleTransformStart = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const nodeName = node.name();
    if (!nodeName || !nodeName.startsWith('layer-')) return;
    
    const layerId = nodeName.replace('layer-', '');
    const layer = normalizedLayers.find(l => l.id === layerId);
    
    // Store initial values for the dragged layer
    const initialData: { [key: string]: { scale: number; rotation: number } } = {};
    initialData[layerId] = {
      scale: node.scaleX(),
      rotation: node.rotation(),
    };
    
    // Store initial values for all linked layers
    if (layer?.groupId) {
      const linkedLayers = normalizedLayers.filter(
        l => l.groupId === layer.groupId
      );
      linkedLayers.forEach(linkedLayer => {
        const linkedNode = layerNodeRefs.current.get(linkedLayer.id);
        if (linkedNode) {
          initialData[linkedLayer.id] = {
            scale: linkedNode.scaleX(),
            rotation: linkedNode.rotation(),
          };
        }
      });
    }
    
    transformStartRef.current = {
      layerId,
      initialScale: node.scaleX(),
      initialRotation: node.rotation(),
      initialData,
    } as any;
  }, [normalizedLayers]);

  // Handle transform (real-time scaling/rotation) - update linked layers in real-time
  const handleTransform = useCallback((e: Konva.KonvaEventObject<Event>) => {
    if (!image || !transformStartRef.current) return;
    
    const node = e.target;
    const nodeName = node.name();
    if (!nodeName || !nodeName.startsWith('layer-')) return;
    
    const layerId = nodeName.replace('layer-', '');
    const layer = normalizedLayers.find(l => l.id === layerId);
    if (!layer || !layer.groupId) return;

    const currentScaleX = node.scaleX();
    const currentRotation = node.rotation();
    const { initialScale, initialRotation } = transformStartRef.current;

    // Calculate scale and rotation deltas
    const scaleDelta = currentScaleX / initialScale;
    const rotationDelta = currentRotation - initialRotation;

    // Update linked layers in real-time during transform
    const linkedLayers = normalizedLayers.filter(
      l => l.groupId === layer.groupId && l.id !== layer.id
    );

    linkedLayers.forEach(linkedLayer => {
      const linkedNode = layerNodeRefs.current.get(linkedLayer.id);
      if (linkedNode && transformStartRef.current?.initialData) {
        const initialData = (transformStartRef.current as any).initialData[linkedLayer.id];
        if (initialData) {
          // Apply same scale change proportionally from initial scale
          const newLinkedScale = clamp(initialData.scale * scaleDelta, 0.1, 10);
          linkedNode.scaleX(newLinkedScale);
          linkedNode.scaleY(newLinkedScale);
          
          // Apply same rotation change from initial rotation
          linkedNode.rotation(initialData.rotation + rotationDelta);
        }
      }
    });
  }, [image, normalizedLayers]);

  // Handle transform end - convert to normalized coordinates and update scale
  const handleTransformEnd = useCallback((layer: WatermarkLayer, node: Konva.Node) => {
    if (!image) return;

    const x = clamp(node.x(), 0, image.width);
    const y = clamp(node.y(), 0, image.height);
    const rotation = node.rotation();
    const scaleX = node.scaleX();

    // Calculate scale change from initial
    const scaleDelta = transformStartRef.current?.layerId === layer.id && transformStartRef.current?.initialScale
      ? scaleX / transformStartRef.current.initialScale
      : scaleX;

    // Update layer scale (uniform scaling)
    const newScale = clamp(layer.scale * scaleDelta, 0.1, 10);

    // Reset node scale to prevent compounding
    node.scaleX(1);
    node.scaleY(1);

    const { xNorm, yNorm } = screenToNorm(x, y, image.width, image.height);

    // Calculate widthNorm for logo layers if scaleLocked
    let widthNorm = layer.widthNorm;
    if (layer.type === 'logo' && layer.naturalLogoWidth && layer.scaleLocked) {
      widthNorm = (layer.naturalLogoWidth * newScale) / image.width;
    }

    // Calculate rotation change
    const rotationDelta = transformStartRef.current?.layerId === layer.id && transformStartRef.current?.initialRotation !== undefined
      ? rotation - transformStartRef.current.initialRotation
      : rotation - (layer.rotation || 0);

    const updates: Partial<WatermarkLayer> = {
      xNorm,
      yNorm,
      anchor: Anchor.CENTER,
      scale: newScale,
      rotation: (layer.rotation || 0) + rotationDelta,
    };

    if (widthNorm !== undefined) {
      updates.widthNorm = clamp(widthNorm, 0, 1);
    }

    // Update grouped layers
    const groupId = layer.groupId;
    if (groupId) {
      normalizedLayers
        .filter(l => l.groupId === groupId && l.id !== layer.id)
        .forEach(groupLayer => {
          // Get initial scale from transform start data
          const initialData = (transformStartRef.current as any)?.initialData?.[groupLayer.id];
          const groupInitialScale = initialData?.scale ?? (groupLayer.scale || 1);
          const groupInitialRotation = initialData?.rotation ?? (groupLayer.rotation || 0);
          
          const groupScale = clamp(groupInitialScale * scaleDelta, 0.1, 10);
          const groupRotation = (groupInitialRotation + rotationDelta) % 360;
          
          // Reset linked node scale to prevent compounding
          const linkedNode = layerNodeRefs.current.get(groupLayer.id);
          if (linkedNode) {
            linkedNode.scaleX(1);
            linkedNode.scaleY(1);
          }
          
          onLayerUpdate({
            ...groupLayer,
            scale: groupScale,
            rotation: groupRotation,
          });
        });
    }

    onLayerUpdate({
      ...layer,
      ...updates,
    });

    // Reset transform start reference
    transformStartRef.current = null;

    // Reset transform start reference
    transformStartRef.current = null;
  }, [image, onLayerUpdate, normalizedLayers]);

  // Handle click on stage (deselect)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onLayerSelect(null);
    }
  }, [onLayerSelect]);

  // Handle click on layer node (select)
  const handleLayerClick = useCallback((layerId: string) => {
    onLayerSelect(layerId);
  }, [onLayerSelect]);

  // Sort normalized layers by zIndex
  const sortedLayers = useMemo(() => {
    return [...normalizedLayers].sort((a, b) => a.zIndex - b.zIndex);
  }, [normalizedLayers]);

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 border border-gray-700 rounded-lg">
        <p className="text-gray-500 text-sm">Upload an image to see preview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div
        ref={containerRef}
        className="flex-1 relative rounded bg-gray-800 flex items-center justify-center overflow-auto"
        style={{ 
          minHeight: 0,
        }}
      >
        {!baseImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Loading image...</div>
        )}
        {baseImageLoaded && (
          <div className="flex items-center justify-center w-full h-full p-4">
            <Stage
              ref={stageRef}
              width={image.width}
              height={image.height}
              scaleX={stageScale}
              scaleY={stageScale}
              onClick={handleStageClick}
              onTap={handleStageClick}
              style={{ 
                cursor: 'default',
                boxSizing: 'border-box',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
            <Layer>
              {/* Base image */}
              {baseImageRef.current && (
                <KonvaImage
                  image={baseImageRef.current}
                  x={0}
                  y={0}
                  width={image.width}
                  height={image.height}
                />
              )}

              {/* Guidelines overlay - Only visible during drag */}
              {isDragging && snapToGuides && (
                <>
                  {/* Vertical guides */}
                  {DEFAULT_VERTICAL_GUIDES.map((guide) => {
                    const x = guide * image.width;
                    const isActive = activeGuides.vertical === guide;
                    return (
                      <KonvaLine
                        key={`v-${guide}`}
                        points={[x, 0, x, image.height]}
                        stroke={isActive ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.8)'}
                        strokeWidth={5}
                        listening={false}
                        perfectDrawEnabled={false}
                      />
                    );
                  })}
                  
                  {/* Horizontal guides */}
                  {DEFAULT_HORIZONTAL_GUIDES.map((guide) => {
                    const y = guide * image.height;
                    const isActive = activeGuides.horizontal === guide;
                    return (
                      <KonvaLine
                        key={`h-${guide}`}
                        points={[0, y, image.width, y]}
                        stroke={isActive ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.8)'}
                        strokeWidth={5}
                        listening={false}
                        perfectDrawEnabled={false}
                      />
                    );
                  })}
                </>
              )}

              {/* Render layers */}
              {sortedLayers.map((layer) => {
                if (!layer.enabled) return null;

                const position = getLayerPosition(layer);
                const isSelected = layer.id === selectedLayerId;

                if (layer.type === 'text' && layer.text) {
                  // Text layer
                  const fontSizePx = (image.height * (layer.fontSizeRelative ?? 5) / 100) * layer.scale;
                  
                  // Calculate text width for wrapping
                  const textWidth = layer.textWidthPercent 
                    ? (image.width * layer.textWidthPercent / 100) * layer.scale
                    : undefined; // Auto width if not specified
                  
                  // Convert TextAlign enum to Konva align string
                  const konvaAlign = layer.textAlign === TextAlign.LEFT 
                    ? 'left' 
                    : layer.textAlign === TextAlign.RIGHT 
                    ? 'right' 
                    : 'center'; // Default to center if not specified
                  
                  return (
                    <KonvaText
                      key={layer.id}
                      name={`layer-${layer.id}`}
                      x={position.x}
                      y={position.y}
                      text={variableContext && layer.text 
                        ? replaceTextVariables(layer.text, variableContext)
                        : (layer.text || '')}
                      fontSize={fontSizePx}
                      fontFamily={layer.fontFamily || 'Inter'}
                      fontStyle={layer.fontStyle || 'normal'}
                      fontWeight={layer.fontWeight || 'normal'}
                      fill={layer.color || '#ffffff'}
                      opacity={layer.opacity ?? 1}
                      rotation={layer.rotation ?? 0}
                      align={konvaAlign}
                      verticalAlign="middle"
                      width={textWidth}
                      wrap="word"
                      ellipsis={false}
                      draggable={!layer.locked}
                      onClick={() => handleLayerClick(layer.id)}
                      onTap={() => handleLayerClick(layer.id)}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={(e) => {
                        if (!layer.locked) {
                          const node = e.target;
                          handleDragEnd(layer, node);
                        }
                      }}
                      onTransformStart={handleTransformStart}
                      onTransform={handleTransform}
                      onTransformEnd={(e) => {
                        if (!layer.locked) {
                          const node = e.target;
                          handleTransformEnd(layer, node);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!layer.locked) {
                          const stage = e.target.getStage();
                          if (stage) {
                            stage.container().style.cursor = 'move';
                          }
                        } else {
                          const stage = e.target.getStage();
                          if (stage) {
                            stage.container().style.cursor = 'not-allowed';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage) {
                          stage.container().style.cursor = 'default';
                        }
                      }}
                      ref={(node) => {
                        // Store node reference for linked layer updates
                        if (node) {
                          layerNodeRefs.current.set(layer.id, node);
                          // Center text on its position by setting offset after measurement
                          const textNode = node as Konva.Text;
                          requestAnimationFrame(() => {
                            const width = textNode.width();
                            const height = textNode.height();
                            if (width > 0 && height > 0) {
                              textNode.offsetX(width / 2);
                              textNode.offsetY(height / 2);
                              textNode.getLayer()?.batchDraw();
                            }
                          });
                        } else {
                          layerNodeRefs.current.delete(layer.id);
                        }
                      }}
                    />
                  );
                } else if (layer.type === 'shape' && layer.shapeType) {
                  // Shape layer
                  const width = image.width * (layer.widthNorm || 0.3);
                  const height = image.height * (layer.heightNorm || 0.2);
                  
                  const shapeProps = {
                    key: layer.id,
                    name: `layer-${layer.id}`,
                    x: position.x - width / 2,
                    y: position.y - height / 2,
                    width,
                    height,
                    opacity: (layer.fillOpacity || 0.6) * (layer.opacity ?? 1),
                    rotation: layer.rotation ?? 0,
                    draggable: !layer.locked,
                    onClick: () => handleLayerClick(layer.id),
                    onTap: () => handleLayerClick(layer.id),
                    onDragStart: handleDragStart,
                    onDragMove: handleDragMove,
                    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                      if (!layer.locked) {
                        const node = e.target;
                        handleDragEnd(layer, node);
                      }
                    },
                    onTransformStart: handleTransformStart,
                    onTransform: handleTransform,
                    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                      if (!layer.locked) {
                        const node = e.target;
                        handleTransformEnd(layer, node);
                      }
                    },
                    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
                      if (!layer.locked) {
                        const stage = e.target.getStage();
                        if (stage) {
                          stage.container().style.cursor = 'move';
                        }
                      }
                    },
                    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
                      const stage = e.target.getStage();
                      if (stage) {
                        stage.container().style.cursor = 'default';
                      }
                    },
                    ref: (node: Konva.Node | null) => {
                      if (node) {
                        layerNodeRefs.current.set(layer.id, node);
                      }
                    },
                  };

                  switch (layer.shapeType) {
                    case ShapeType.RECTANGLE:
                      return (
                        <Rect
                          {...shapeProps}
                          fill={layer.fillColor || '#000000'}
                          stroke={layer.strokeColor}
                          strokeWidth={layer.strokeWidth || 0}
                        />
                      );
                    case ShapeType.ROUNDED_RECTANGLE:
                      return (
                        <Rect
                          {...shapeProps}
                          fill={layer.fillColor || '#000000'}
                          stroke={layer.strokeColor}
                          strokeWidth={layer.strokeWidth || 0}
                          cornerRadius={layer.cornerRadius || 8}
                        />
                      );
                    case ShapeType.CIRCLE:
                      const radius = Math.min(width, height) / 2;
                      return (
                        <Circle
                          {...shapeProps}
                          x={position.x}
                          y={position.y}
                          radius={radius}
                          fill={layer.fillColor || '#000000'}
                          stroke={layer.strokeColor}
                          strokeWidth={layer.strokeWidth || 0}
                        />
                      );
                    case ShapeType.LINE:
                      return (
                        <KonvaLine
                          {...shapeProps}
                          points={[position.x - width / 2, position.y - height / 2, position.x + width / 2, position.y + height / 2]}
                          stroke={layer.fillColor || '#000000'}
                          strokeWidth={(layer.strokeWidth || 2) * layer.scale}
                          lineCap="round"
                        />
                      );
                    default:
                      return null;
                  }
                } else if (layer.type === 'logo' && layer.logoId) {
                  // Logo layer
                  const logoImg = logoImageRefs.current.get(layer.logoId);
                  if (!logoImg) return null;

                  const naturalWidth = layer.naturalLogoWidth || logoImg.naturalWidth || logoImg.width;
                  const naturalHeight = layer.naturalLogoHeight || logoImg.naturalHeight || logoImg.height;
                  const logoWidth = naturalWidth * layer.scale;
                  const logoHeight = naturalHeight * layer.scale;

                  return (
                    <KonvaImage
                      key={layer.id}
                      name={`layer-${layer.id}`}
                      image={logoImg}
                      x={position.x}
                      y={position.y}
                      width={logoWidth}
                      height={logoHeight}
                      opacity={layer.opacity ?? 1}
                      rotation={layer.rotation ?? 0}
                      offsetX={logoWidth / 2}
                      offsetY={logoHeight / 2}
                      draggable={!layer.locked}
                      ref={(node) => {
                        if (node) {
                          layerNodeRefs.current.set(layer.id, node);
                        } else {
                          layerNodeRefs.current.delete(layer.id);
                        }
                      }}
                      onClick={() => handleLayerClick(layer.id)}
                      onTap={() => handleLayerClick(layer.id)}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={(e) => {
                        if (!layer.locked) {
                          const node = e.target;
                          handleDragEnd(layer, node);
                        }
                      }}
                      onTransformStart={handleTransformStart}
                      onTransform={handleTransform}
                      onTransformEnd={(e) => {
                        if (!layer.locked) {
                          const node = e.target;
                          handleTransformEnd(layer, node);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!layer.locked) {
                          const stage = e.target.getStage();
                          if (stage) {
                            stage.container().style.cursor = 'move';
                          }
                        } else {
                          const stage = e.target.getStage();
                          if (stage) {
                            stage.container().style.cursor = 'not-allowed';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage) {
                          stage.container().style.cursor = 'default';
                        }
                      }}
                    />
                  );
                }

                return null;
              })}

              {/* Transformer for selected layer */}
              {selectedLayerId && (() => {
                const selectedLayer = layers.find(l => l.id === selectedLayerId);
                const isLocked = selectedLayer?.locked === true;
                return (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Enforce uniform scaling (keep aspect ratio)
                      if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                        return oldBox;
                      }
                      // Calculate uniform scale based on the larger dimension change
                      const scaleX = newBox.width / oldBox.width;
                      const scaleY = newBox.height / oldBox.height;
                      const scale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
                      
                      return {
                        ...newBox,
                        width: oldBox.width * scale,
                        height: oldBox.height * scale,
                      };
                    }}
                    rotateEnabled={!isLocked}
                    enabledAnchors={isLocked ? [] : [
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right',
                    ]}
                    borderEnabled={true}
                    borderStroke={isLocked ? "#9ca3af" : "#dc2626"}
                    borderStrokeWidth={1.5}
                    anchorFill={isLocked ? "#9ca3af" : "#dc2626"}
                    anchorStroke="#ffffff"
                    anchorSize={6}
                    keepRatio={true}
                    padding={2}
                  />
                );
              })()}
            </Layer>
          </Stage>
          </div>
        )}
      </div>
    </div>
  );
}
