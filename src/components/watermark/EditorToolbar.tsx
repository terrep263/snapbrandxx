/**
 * Editor Toolbar - Top Action Bar
 * 
 * Add Text and Add Logo buttons
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useWatermark } from '@/lib/watermark/context';
import { LogoItem } from '@/lib/logoLibrary';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddLogo: (logoId: string, logo?: LogoItem) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onFitToView?: () => void;
}

export default function EditorToolbar({ 
  onAddText, 
  onAddLogo, 
  zoom = 1, 
  onZoomChange, 
  onFitToView 
}: EditorToolbarProps) {
  const { logoLibrary, addLogoToLibrary } = useWatermark();
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logos = Array.from(logoLibrary.values());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const logo = await addLogoToLibrary(file.name, file);
        // Use the returned logo directly instead of looking it up by ID
        // This avoids the "logo not found" error due to async state updates
        onAddLogo(logo.id, logo);
        setShowLogoPicker(false);
      } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Failed to upload logo');
      }
    }
  };

  const handleAddLogoClick = () => {
    if (logos.length === 0) {
      // If no logos, directly trigger file upload
      fileInputRef.current?.click();
    } else {
      // Show picker modal
      setShowLogoPicker(true);
    }
  };

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onAddText}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Text</span>
          </button>
          <button
            onClick={handleAddLogoClick}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Logo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Zoom Controls */}
        {onZoomChange && onFitToView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs text-gray-400 font-mono min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onZoomChange(Math.min(2.0, zoom + 0.1))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={onFitToView}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
              title="Fit to View"
            >
              Fit
            </button>
          </div>
        )}
      </div>

      {/* Logo Picker Modal */}
      {showLogoPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowLogoPicker(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-100">Select or Upload Logo</h3>
                <p className="text-sm text-gray-400 mt-1">Choose an existing logo or upload a new one</p>
              </div>
              <button 
                onClick={() => setShowLogoPicker(false)} 
                className="text-gray-400 hover:text-gray-300 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span className="text-xl">📤</span>
                <span>Upload New Logo</span>
              </button>
            </div>

            {logos.length > 0 ? (
              <>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Your Logos</h4>
                <div className="grid grid-cols-4 gap-4">
                  {logos.map((logo) => (
                    <div
                      key={logo.id}
                      onClick={() => {
                        onAddLogo(logo.id);
                        setShowLogoPicker(false);
                      }}
                      className="cursor-pointer rounded-lg border-2 border-gray-700 hover:border-red-500 overflow-hidden bg-gray-900 transition-all hover:scale-105"
                    >
                      <div className="relative w-full h-32">
                        <Image src={logo.imageData} alt={logo.name} fill className="object-contain p-2" unoptimized />
                      </div>
                      <p className="p-2 text-xs text-gray-300 truncate text-center border-t border-gray-700">{logo.name}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No logos yet. Upload your first logo above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

