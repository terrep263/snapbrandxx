'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrderPanel from '@/components/OrderPanel';
import UploadPanel from '@/components/UploadPanel';
import PreviewGrid from '@/components/PreviewGrid';
import ImageDetailEditor from '@/components/ImageDetailEditor';
import WatermarkSettingsPanel from '@/components/WatermarkSettingsPanel';
import LayerListPanel from '@/components/LayerListPanel';
import LayerEditorPanel from '@/components/LayerEditorPanel';
import DraggablePreviewCanvas from '@/components/DraggablePreviewCanvas';
import PresetsPanel from '@/components/PresetsPanel';
import { WatermarkLayer, ProcessedImage, Anchor, TileMode, applyWatermarkLayers } from '@/lib/watermarkEngine';
import { isAuthenticated, logout } from '@/lib/auth';
import JSZip from 'jszip';

export default function Home() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [clientName, setClientName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  
  // Global layers (default for all images)
  const [globalLayers, setGlobalLayers] = useState<WatermarkLayer[]>([]);
  
  // Per-image overrides: overrides[imageId] = WatermarkLayer[]
  const [overrides, setOverrides] = useState<Record<string, WatermarkLayer[]>>({});
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<ProcessedImage | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isAuthenticated()) {
        router.push('/login');
      } else {
        setIsAuthChecked(true);
      }
    }
  }, [router]);

  // Load logo image when file changes
  useEffect(() => {
    if (logoFile) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          logoImageRef.current = img;
          // Update all logo layers in global layers
          setGlobalLayers((prevLayers) =>
            prevLayers.map((layer) =>
              layer.type === 'logo' ? { ...layer, logoImage: img } : layer
            )
          );
          // Update logo layers in all overrides
          setOverrides((prevOverrides) => {
            const updated: Record<string, WatermarkLayer[]> = {};
            Object.entries(prevOverrides).forEach(([imageId, layers]) => {
              updated[imageId] = layers.map((layer) =>
                layer.type === 'logo' ? { ...layer, logoImage: img } : layer
              );
            });
            return updated;
          });
        };
      };
      reader.readAsDataURL(logoFile);
    } else {
      logoImageRef.current = null;
    }
  }, [logoFile]);

  // Set current time on client side only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleImagesUploaded = useCallback((newImages: ProcessedImage[]) => {
    setImages(newImages);
    // Auto-select first image for preview canvas
    if (newImages.length > 0 && !selectedPreviewImage) {
      setSelectedPreviewImage(newImages[0]);
    }
  }, [selectedPreviewImage]);

  const handleAddTextLayer = () => {
    const newLayer: WatermarkLayer = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      anchor: Anchor.BOTTOM_RIGHT,
      offsetX: -5,
      offsetY: -5,
      scale: 1.0,
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: '',
      text: 'Your Brand',
      fontFamily: 'Inter',
      fontSize: 24,
      color: '#ffffff',
    };
    setGlobalLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddLogoLayer = () => {
    if (!logoImageRef.current) {
      alert('Please upload a logo first');
      return;
    }
    const newLayer: WatermarkLayer = {
      id: `logo-${Date.now()}-${Math.random()}`,
      type: 'logo',
      anchor: Anchor.BOTTOM_RIGHT,
      offsetX: -5,
      offsetY: -5,
      scale: 1.0,
      rotation: 0,
      opacity: 0.7,
      tileMode: TileMode.NONE,
      effect: '',
      logoImage: logoImageRef.current,
    };
    setGlobalLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleGlobalLayerUpdate = (updatedLayer: WatermarkLayer) => {
    setGlobalLayers((prev) =>
      prev.map((layer) => (layer.id === updatedLayer.id ? updatedLayer : layer))
    );
  };

  const handleGlobalLayerDelete = (layerId: string) => {
    setGlobalLayers((prev) => prev.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  // Get layers for a specific image (overrides or global)
  const getLayersForImage = useCallback((imageId: string): WatermarkLayer[] => {
    return overrides[imageId] || globalLayers;
  }, [overrides, globalLayers]);

  // Handle image override update
  const handleImageLayersUpdate = (imageId: string, layers: WatermarkLayer[] | null) => {
    if (layers === null) {
      // Reset to global - remove override
      setOverrides((prev) => {
        const updated = { ...prev };
        delete updated[imageId];
        return updated;
      });
    } else {
      // Set override
      setOverrides((prev) => ({
        ...prev,
        [imageId]: layers,
      }));
    }
  };

  const handleGenerateWatermarked = async () => {
    if (images.length === 0) {
      alert('Please upload images first');
      return;
    }
    if (globalLayers.length === 0) {
      alert('Please add at least one watermark layer');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: images.length });

    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      try {
        // Use overrides if available, otherwise use global layers
        const layersToUse = getLayersForImage(updatedImages[i].id);
        
        if (layersToUse.length === 0) {
          // Skip if no layers
          continue;
        }

        const blob = await applyWatermarkLayers(
          updatedImages[i].originalDataUrl,
          layersToUse,
          false,
          1.0
        ) as Blob;

        updatedImages[i].processedBlob = blob;
        updatedImages[i].processedDataUrl = URL.createObjectURL(blob);
        setProcessingProgress({ current: i + 1, total: images.length });

        // Yield to event loop for responsiveness
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        updatedImages[i].error = `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    setImages(updatedImages);
    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    const processedImages = images.filter((img) => img.processedBlob);
    if (processedImages.length === 0) {
      alert('No processed images available. Please generate watermarked images first.');
      return;
    }

    const zip = new JSZip();

    for (const img of processedImages) {
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
      : `snapbrandxx-export-${Date.now()}.zip`;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image || !image.processedBlob) return;

    const url = URL.createObjectURL(image.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    const originalName = image.originalFile.name;
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    a.download = `${baseName}-snapbrandxx${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImageClick = (image: ProcessedImage) => {
    setEditingImageId(image.id);
  };

  const canExport = images.some((img) => img.processedBlob);
  const selectedLayer = globalLayers.find((l) => l.id === selectedLayerId) || null;
  const editingImage = editingImageId ? images.find((img) => img.id === editingImageId) : null;

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
    }
  };

  // Show loading or nothing while checking auth
  if (!isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-primary">SnapBrandXX Ops</h1>
          <p className="text-xs text-gray-400">Internal Bulk Watermark Tool</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Current Operator: <span className="text-gray-300">Placeholder Name</span>
            {currentTime && (
              <>
                {' • '}
                <span suppressHydrationWarning>{currentTime}</span>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Image Detail Editor Modal */}
      {editingImage && (
        <ImageDetailEditor
          image={editingImage}
          globalLayers={globalLayers}
          imageLayers={overrides[editingImage.id] || []}
          onLayersUpdate={handleImageLayersUpdate}
          onClose={() => setEditingImageId(null)}
          logoImage={logoImageRef.current}
          onLogoFileChange={setLogoFile}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Order & Upload */}
        <div className="w-1/4 flex flex-col border-r border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            <OrderPanel
              clientName={clientName}
              orderId={orderId}
              notes={notes}
              onClientNameChange={setClientName}
              onOrderIdChange={setOrderId}
              onNotesChange={setNotes}
            />
            <UploadPanel
              images={images}
              onImagesChange={handleImagesUploaded}
            />
          </div>
        </div>

        {/* Center Column - Preview Grid & Canvas */}
        <div className="w-[45%] flex flex-col border-r border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Draggable Preview Canvas */}
            <DraggablePreviewCanvas
              image={selectedPreviewImage}
              layers={selectedPreviewImage ? getLayersForImage(selectedPreviewImage.id) : globalLayers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onLayerUpdate={handleGlobalLayerUpdate}
            />
            
            {/* Preview Grid */}
            <PreviewGrid
              images={images}
              globalLayers={globalLayers}
              overrides={overrides}
              onDownloadSingle={handleDownloadSingle}
              onImageSelect={setSelectedPreviewImage}
              onImageClick={handleImageClick}
            />
          </div>
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex gap-3">
              <button
                onClick={handleGenerateWatermarked}
                disabled={isProcessing || images.length === 0 || globalLayers.length === 0}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
              >
                {isProcessing
                  ? `Processing ${processingProgress.current} of ${processingProgress.total}...`
                  : 'Generate Watermarked Images'}
              </button>
              <button
                onClick={handleDownloadZip}
                disabled={!canExport || isProcessing}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
              >
                Download All as ZIP
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Global Layers & Settings */}
        <div className="w-[30%] flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">Global Watermark Settings</h2>
              <p className="text-xs text-gray-500">
                These settings apply to all images unless overridden
              </p>
            </div>
            <LayerListPanel
              layers={globalLayers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onAddTextLayer={handleAddTextLayer}
              onAddLogoLayer={handleAddLogoLayer}
            />
            <LayerEditorPanel
              layer={selectedLayer}
              onLayerUpdate={handleGlobalLayerUpdate}
              onDeleteLayer={handleGlobalLayerDelete}
            />
            <WatermarkSettingsPanel
              layers={globalLayers}
              onLayersChange={setGlobalLayers}
              onLogoFileChange={setLogoFile}
              logoImage={logoImageRef.current}
            />
            <PresetsPanel
              currentLayers={globalLayers}
              onLayersLoad={setGlobalLayers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
