'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { LogoItem, saveLogo, getAllLogos, deleteLogo, updateLogoName, logoItemToImage } from '@/lib/logoLibrary';

interface LogoGalleryProps {
  onSelectLogo: (logoItem: LogoItem) => void;
  onClose: () => void;
}

export default function LogoGallery({ onSelectLogo, onClose }: LogoGalleryProps) {
  const [logos, setLogos] = useState<LogoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    try {
      setIsLoading(true);
      const allLogos = await getAllLogos();
      setLogos(allLogos);
    } catch (error) {
      console.error('Error loading logos:', error);
      alert('Failed to load logo library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      alert('Please select a PNG or JPEG image');
      return;
    }

    try {
      setUploading(true);
      const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const logoItem = await saveLogo(name, file);
      await loadLogos();
      alert('Logo saved to library!');
    } catch (error) {
      console.error('Error saving logo:', error);
      alert('Failed to save logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from logo library?`)) return;

    try {
      await deleteLogo(id);
      await loadLogos();
    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('Failed to delete logo');
    }
  };

  const handleStartEdit = (logo: LogoItem) => {
    setEditingId(logo.id);
    setEditName(logo.name);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      alert('Logo name cannot be empty');
      return;
    }

    try {
      await updateLogoName(id, editName.trim());
      setEditingId(null);
      setEditName('');
      await loadLogos();
    } catch (error) {
      console.error('Error updating logo name:', error);
      alert('Failed to update logo name');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSelect = async (logo: LogoItem) => {
    try {
      const img = await logoItemToImage(logo);
      onSelectLogo(logo);
      onClose();
    } catch (error) {
      console.error('Error loading logo image:', error);
      alert('Failed to load logo image');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-300">Logo Library</h2>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading logos...</div>
          ) : logos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">No logos in library</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded"
              >
                Upload Your First Logo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleSelect(logo)}
                >
                  <div className="aspect-square bg-gray-900 rounded mb-2 overflow-hidden flex items-center justify-center relative">
                    <Image
                      src={logo.imageData}
                      alt={logo.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  {editingId === logo.id ? (
                    <div className="space-y-1">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(logo.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-100"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(logo.id);
                          }}
                          className="flex-1 px-2 py-1 bg-primary text-white text-xs rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="flex-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-300 truncate" title={logo.name}>
                        {logo.name}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(logo);
                          }}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                        >
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(logo.id, logo.name);
                          }}
                          className="flex-1 px-2 py-1 bg-accent hover:bg-accent/80 text-white text-xs rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


