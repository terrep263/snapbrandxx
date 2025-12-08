'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrderPanel from '@/components/OrderPanel';
import UploadPanel from '@/components/UploadPanel';
import PreviewGrid from '@/components/PreviewGrid';
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
  const [layers, setLayers] = useState<WatermarkLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<ProcessedImage | null>(null);
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
          // Update all logo layers with the new image
          setLayers((prevLayers) =>
            prevLayers.map((layer) =>
              layer.type === 'logo' ? { ...layer, logoImage: img } : layer
            )
          );
        };
      };
      reader.readAsDataURL(logoFile);
    } else {
      logoImageRef.current = null;
      // Remove logo from all logo layers
      setLayers((prevLayers) =>
        prevLayers.map((layer) =>
          layer.type === 'logo' ? { ...layer, logoImage: null } : layer
        )
      );
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
      offsetX: -5, // 5% from right
      offsetY: -5, // 5% from bottom
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
    setLayers((prev) => [...prev, newLayer]);
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
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleLayerUpdate = (updatedLayer: WatermarkLayer) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === updatedLayer.id ? updatedLayer : layer))
    );
  };

  const handleLayerDelete = (layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleGenerateWatermarked = async () => {
    if (images.length === 0) {
      alert('Please upload images first');
      return;
    }
    if (layers.length === 0) {
      alert('Please add at least one watermark layer');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: images.length });

    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      try {
        const blob = await applyWatermarkLayers(
          updatedImages[i].originalDataUrl,
          layers,
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

  const canExport = images.some((img) => img.processedBlob);
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

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
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onLayerUpdate={handleLayerUpdate}
            />
            
            {/* Preview Grid */}
            <PreviewGrid
              images={images}
              layers={layers}
              onDownloadSingle={handleDownloadSingle}
              onImageSelect={setSelectedPreviewImage}
            />
          </div>
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex gap-3">
              <button
                onClick={handleGenerateWatermarked}
                disabled={isProcessing || images.length === 0 || layers.length === 0}
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

        {/* Right Column - Layers & Settings */}
        <div className="w-[30%] flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <LayerListPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onAddTextLayer={handleAddTextLayer}
              onAddLogoLayer={handleAddLogoLayer}
            />
            <LayerEditorPanel
              layer={selectedLayer}
              onLayerUpdate={handleLayerUpdate}
              onDeleteLayer={handleLayerDelete}
            />
            <WatermarkSettingsPanel
              layers={layers}
              onLayersChange={setLayers}
              onLogoFileChange={setLogoFile}
              logoImage={logoImageRef.current}
            />
            <PresetsPanel
              currentLayers={layers}
              onLayersLoad={setLayers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
