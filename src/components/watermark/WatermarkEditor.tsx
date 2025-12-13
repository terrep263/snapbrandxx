/**
 * Professional Watermark Editor - Sprint 2
 * 
 * Layout: Layers Panel | Canvas + Toolbar | Properties Panel
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWatermark } from '@/lib/watermark/context';
import { ProcessedImage, WatermarkLayer, Anchor } from '@/lib/watermark/types';
import { LogoItem } from '@/lib/logoLibrary';
import { supabase } from '@/lib/supabase/client';
import { debounce } from '@/lib/utils/debounce';
import ImageThumbnailList from './ImageThumbnailList';
import LayersPanel from './LayersPanel';
import EditorToolbar from './EditorToolbar';
import DraggablePreviewCanvas from '../DraggablePreviewCanvas';
import PropertiesPanel from './PropertiesPanel';
import PreviewGridPanel from './PreviewGridPanel';
import SaveStatusIndicator, { SaveStatus } from './SaveStatusIndicator';

interface WatermarkEditorProps {
  images: ProcessedImage[];
  onBack?: () => void;
  onNext?: () => void;
}

export default function WatermarkEditor({ images, onBack, onNext }: WatermarkEditorProps) {
  const {
    job,
    selectedImageId,
    selectedLayerId,
    createJob,
    selectImage,
    selectLayer,
    getLayersForImage,
    updateLayer,
    addLayer,
    deleteLayer,
    logoLibrary,
    createDefaultTextLayer,
    createDefaultLogoLayer,
  } = useWatermark();

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [zoom, setZoom] = useState(1);
  const [snapToGuides, setSnapToGuides] = useState(true);
  
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const autoSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Initialize job when images change
  useEffect(() => {
    if (images.length > 0 && (!job || job.images.length !== images.length)) {
      createJob(images);
    }
  }, [images, job, createJob]);

  // Auto-select first image
  useEffect(() => {
    if (images.length > 0 && !selectedImageId) {
      selectImage(images[0].id);
    }
  }, [images, selectedImageId, selectImage]);

  const selectedImage = selectedImageId
    ? images.find(img => img.id === selectedImageId) || images[0] || null
    : images[0] || null;

  const currentLayers = selectedImageId ? getLayersForImage(selectedImageId) : [];
  const selectedLayer = selectedLayerId
    ? currentLayers.find(l => l.id === selectedLayerId) || null
    : null;

  // Determine if layer is global or per-image
  const isLayerGlobal = useCallback((layerId: string) => {
    if (!selectedImageId || !job) return true;
    return !job.overrides[selectedImageId]?.some(ov => ov.id === layerId);
  }, [selectedImageId, job]);

  // Normalize zIndexes to be contiguous 0..n-1
  const normalizeZIndexes = useCallback((layers: WatermarkLayer[]): WatermarkLayer[] => {
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    return sorted.map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
  }, []);

  // Handle layer reorder
  const handleLayerReorder = useCallback((layerId: string, direction: 'up' | 'down') => {
    if (!selectedImageId || !job) return;

    const isGlobal = isLayerGlobal(layerId);
    const layers = isGlobal ? job.globalLayers : (job.overrides[selectedImageId] || []);
    const layerIndex = layers.findIndex(l => l.id === layerId);
    
    if (layerIndex === -1) return;

    const newLayers = [...layers];
    if (direction === 'up' && layerIndex > 0) {
      // Swap with previous
      [newLayers[layerIndex - 1], newLayers[layerIndex]] = [newLayers[layerIndex], newLayers[layerIndex - 1]];
    } else if (direction === 'down' && layerIndex < newLayers.length - 1) {
      // Swap with next
      [newLayers[layerIndex], newLayers[layerIndex + 1]] = [newLayers[layerIndex + 1], newLayers[layerIndex]];
    }

    // Normalize zIndexes
    const normalized = normalizeZIndexes(newLayers);

    if (isGlobal) {
      // Update global layers
      normalized.forEach(layer => {
        updateLayer(layer.id, { zIndex: layer.zIndex }, true);
      });
    } else {
      // Update per-image override
      normalized.forEach(layer => {
        updateLayer(layer.id, { zIndex: layer.zIndex }, false, selectedImageId);
      });
    }
  }, [selectedImageId, job, isLayerGlobal, normalizeZIndexes, updateLayer]);

  // Handle add text layer
  const handleAddText = useCallback(() => {
    if (!selectedImageId || !job) return;

    const maxZIndex = currentLayers.length > 0
      ? Math.max(...currentLayers.map(l => l.zIndex))
      : -1;

    const newLayer: WatermarkLayer = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      zIndex: maxZIndex + 1,
      enabled: true,
      locked: false,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: 0, // Legacy support
      offsetY: 0,
      scale: 1.25,
      rotation: 0,
      opacity: 0.8,
      tileMode: 'none' as any,
      effect: 'solid',
      text: 'Your Text',
      fontSizeRelative: 8, // Increased from 5 to 8% for better visibility
      textWidthPercent: 50, // Default text width for wrapping
      color: '#ffffff',
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left' as any,
    };

    const isGlobal = !job.overrides[selectedImageId];
    addLayer(newLayer, isGlobal, selectedImageId);
    selectLayer(newLayer.id);
  }, [selectedImageId, job, currentLayers, addLayer, selectLayer]);

  // Handle add logo layer
  const handleAddLogo = useCallback(async (logoId: string, logoItem?: LogoItem) => {
    if (!selectedImageId || !job) return;

    // Use provided logoItem if available (from upload), otherwise look it up
    const logo = logoItem || logoLibrary.get(logoId);
    if (!logo) {
      alert('Logo not found');
      return;
    }

    // Extract image dimensions from the logo's imageData
    let naturalWidth = 100;
    let naturalHeight = 100;
    
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          naturalWidth = img.naturalWidth || img.width || 100;
          naturalHeight = img.naturalHeight || img.height || 100;
          resolve();
        };
        img.onerror = () => {
          console.warn('Failed to load logo image for dimension extraction, using defaults');
          resolve(); // Continue with defaults
        };
        img.src = logo.imageData;
      });
    } catch (error) {
      console.warn('Error extracting logo dimensions:', error);
      // Continue with defaults
    }

    const maxZIndex = currentLayers.length > 0
      ? Math.max(...currentLayers.map(l => l.zIndex))
      : -1;

    const newLayer: WatermarkLayer = {
      id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'logo',
      zIndex: maxZIndex + 1,
      enabled: true,
      locked: false,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: 0, // Legacy support
      offsetY: 0,
      scale: 1.25, // Default scale for new logo layers
      rotation: 0,
      opacity: 0.9,
      tileMode: 'none' as any,
      effect: 'solid',
      logoId: logo.id,
      naturalLogoWidth: naturalWidth,
      naturalLogoHeight: naturalHeight,
    };

    const isGlobal = !job.overrides[selectedImageId];
    addLayer(newLayer, isGlobal, selectedImageId);
    selectLayer(newLayer.id);
  }, [selectedImageId, job, currentLayers, logoLibrary, addLayer, selectLayer]);

  // Handle layer update
  const handleLayerUpdate = useCallback((layerId: string, updates: Partial<WatermarkLayer>, isGlobalOverride?: boolean) => {
    const isGlobal = isGlobalOverride !== undefined ? isGlobalOverride : isLayerGlobal(layerId);
    updateLayer(layerId, updates, isGlobal, selectedImageId || undefined);
  }, [selectedImageId, isLayerGlobal, updateLayer]);

  // Handle layer delete
  const handleLayerDelete = useCallback((layerId: string) => {
    const isGlobal = isLayerGlobal(layerId);
    deleteLayer(layerId, isGlobal, selectedImageId || undefined);
    if (selectedLayerId === layerId) {
      selectLayer(null);
    }
  }, [selectedLayerId, isLayerGlobal, deleteLayer, selectLayer]);

  // Handle layer grouping - link multiple layers together
  const handleGroupLayers = useCallback((layerIds: string[]) => {
    if (layerIds.length < 2) {
      console.warn('Need at least 2 layers to link');
      return;
    }
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    layerIds.forEach(layerId => {
      const isGlobal = isLayerGlobal(layerId);
      handleLayerUpdate(layerId, { groupId }, isGlobal);
    });
  }, [isLayerGlobal, handleLayerUpdate]);

  // Handle layer ungrouping
  const handleUngroupLayer = useCallback((layerId: string) => {
    const isGlobal = isLayerGlobal(layerId);
    handleLayerUpdate(layerId, { groupId: null }, isGlobal);
  }, [isLayerGlobal, handleLayerUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!selectedImage || !selectedLayer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      const nudgeAmount = e.shiftKey ? 10 : 1; // 10px with Shift, 1px without

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (selectedImage && selectedLayer) {
            const dxNorm = nudgeAmount / selectedImage.width;
            const currentXNorm = selectedLayer.xNorm ?? 0.5;
            handleLayerUpdate(selectedLayer.id, { xNorm: Math.max(0, currentXNorm - dxNorm), anchor: Anchor.CENTER });
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (selectedImage && selectedLayer) {
            const dxNorm = nudgeAmount / selectedImage.width;
            const currentXNorm = selectedLayer.xNorm ?? 0.5;
            handleLayerUpdate(selectedLayer.id, { xNorm: Math.min(1, currentXNorm + dxNorm), anchor: Anchor.CENTER });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (selectedImage && selectedLayer) {
            const dyNorm = nudgeAmount / selectedImage.height;
            const currentYNorm = selectedLayer.yNorm ?? 0.5;
            handleLayerUpdate(selectedLayer.id, { yNorm: Math.max(0, currentYNorm - dyNorm), anchor: Anchor.CENTER });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (selectedImage && selectedLayer) {
            const dyNorm = nudgeAmount / selectedImage.height;
            const currentYNorm = selectedLayer.yNorm ?? 0.5;
            handleLayerUpdate(selectedLayer.id, { yNorm: Math.min(1, currentYNorm + dyNorm), anchor: Anchor.CENTER });
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedLayer) {
            handleLayerDelete(selectedLayer.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          selectLayer(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, selectedLayer, handleLayerUpdate, handleLayerDelete, selectLayer]);

  // Create auto-save function (debounced)
  const performSave = useCallback(async (layers: WatermarkLayer[], name: string, currentDesignId: string | null) => {
    setSaveStatus('saving');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSaveStatus('error');
        return;
      }
      
      // Prepare layers for saving (only global layers, as overrides are per-image)
      const layersToSave = layers || [];
      
      if (layersToSave.length === 0 && !currentDesignId) {
        // Don't save empty designs
        setSaveStatus('saved');
        return;
      }
      
      // Check if design exists (has ID)
      if (currentDesignId) {
        // Update existing design
        const response = await fetch(`/api/designs/${currentDesignId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            name,
            layers: layersToSave,
            thumbnail_url: null // Optional: generate thumbnail
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Save failed');
        }
      } else {
        // Create new design
        const response = await fetch('/api/designs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            name,
            layers: layersToSave,
            thumbnail_url: null
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Save failed');
        }
        
        const data = await response.json();
        setDesignId(data.design.id); // Store design ID for future saves
      }
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');
    }
  }, []);

  // Create debounced auto-save
  const autoSave = useMemo(() => {
    return debounce((layers: WatermarkLayer[], name: string) => {
      performSave(layers, name, designId);
    }, 1000); // 1 second debounce
  }, [performSave, designId]);

  // Store auto-save function in ref for cleanup
  useEffect(() => {
    autoSaveRef.current = autoSave;
    return () => {
      if (autoSaveRef.current) {
        autoSaveRef.current.cancel();
      }
    };
  }, [autoSave]);

  // Trigger auto-save whenever job changes
  useEffect(() => {
    if (job && job.globalLayers.length > 0) {
      setSaveStatus('unsaved');
      autoSave(job.globalLayers, designName);
    }
  }, [job?.globalLayers, job?.updatedAt, designName, autoSave]);

  // Handle manual retry
  const handleRetry = useCallback(() => {
    if (saveStatus === 'error' && job) {
      autoSave.cancel(); // Cancel any pending saves
      performSave(job.globalLayers, designName, designId); // Save immediately
    }
  }, [saveStatus, job, designName, designId, performSave, autoSave]);

  // Warn user if they try to leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveStatus]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden bg-gray-800">
      {/* Left: Image Thumbnails (always visible) */}
      <div className="w-56 border-r border-gray-700 bg-gray-900 overflow-y-auto flex-shrink-0 custom-scrollbar" style={{ minWidth: '200px', maxWidth: '300px' }}>
        <div className="p-2 border-b border-gray-700">
          <button
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className="w-full px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            {viewMode === 'editor' ? '📋 Show All Previews' : '✏️ Back to Editor'}
          </button>
        </div>
        <ImageThumbnailList
          images={images}
          selectedImageId={selectedImageId}
          onImageSelect={selectImage}
        />
      </div>

      {viewMode === 'editor' ? (
        <>
          {/* Center: Canvas with Toolbar */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900 min-w-0 min-h-0">
            <div className="px-4 py-2 border-b border-gray-700 bg-gray-900 flex items-center justify-between gap-4">
              <div className="flex-1">
                <EditorToolbar onAddText={handleAddText} onAddLogo={handleAddLogo} />
              </div>
              
              {/* Save Status Indicator */}
              <SaveStatusIndicator 
                status={saveStatus} 
                lastSaved={lastSaved}
                onRetry={handleRetry}
              />
              
              {onNext && (
                <button
                  onClick={onNext}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <span>Next → Export</span>
                </button>
              )}
            </div>
            {selectedImage ? (
              <DraggablePreviewCanvas
                image={selectedImage}
                layers={currentLayers}
                selectedLayerId={selectedLayerId}
                onLayerSelect={selectLayer}
                onLayerUpdate={(layer: WatermarkLayer) => {
                  // Ensure anchor is CENTER for movable layers
                  const updates: Partial<WatermarkLayer> = {
                    ...layer,
                    anchor: Anchor.CENTER, // Always use CENTER for absolute positioning
                  };
                  handleLayerUpdate(layer.id, updates);
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select an image to preview
              </div>
            )}
          </div>

          {/* Right: Layers + Properties */}
          <div className="flex border-l border-gray-700 flex-shrink-0">
            {/* Layers Panel */}
            <div className="w-64 border-r border-gray-700">
              <LayersPanel
                layers={currentLayers}
                selectedLayerId={selectedLayerId}
                onLayerSelect={selectLayer}
                onLayerUpdate={handleLayerUpdate}
                onLayerDelete={handleLayerDelete}
                onLayerReorder={handleLayerReorder}
                onGroupLayers={handleGroupLayers}
                onUngroupLayer={handleUngroupLayer}
              />
            </div>

            {/* Properties Panel */}
            <div className="w-80">
              <PropertiesPanel
                selectedLayer={selectedLayer}
                image={selectedImage}
                onLayerUpdate={handleLayerUpdate}
                snapToGuides={snapToGuides}
                onSnapToGuidesChange={setSnapToGuides}
              />
            </div>
          </div>
        </>
      ) : (
        /* Preview Grid View */
        <div className="flex-1 flex overflow-hidden">
          <PreviewGridPanel
            images={images}
            selectedImageId={selectedImageId}
            onImageSelect={selectImage}
          />
        </div>
      )}
    </div>
  );
}
