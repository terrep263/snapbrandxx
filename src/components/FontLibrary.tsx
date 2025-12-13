'use client';

import { useState, useEffect, useRef } from 'react';
import { FontRecord, getAllFonts, uploadFonts, deleteFont, getFontCount } from '@/lib/fontLibrary';

interface FontLibraryProps {
  onClose: () => void;
}

export default function FontLibrary({ onClose }: FontLibraryProps) {
  const [fonts, setFonts] = useState<FontRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [fontCount, setFontCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    try {
      setIsLoading(true);
      const [allFonts, count] = await Promise.all([
        getAllFonts(),
        getFontCount(),
      ]);
      setFonts(allFonts);
      setFontCount(count);
    } catch (error) {
      console.error('Error loading fonts:', error);
      alert('Failed to load fonts. Please check your Supabase configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress('Checking font count...');

      const result = await uploadFonts(files);
      
      if (result.errors.length > 0) {
        const errorMsg = result.errors.join('\n');
        alert(`Upload completed with errors:\n\n${errorMsg}`);
      } else {
        alert(`Successfully uploaded ${result.success} font(s)!`);
      }

      await loadFonts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (font: FontRecord) => {
    if (!confirm(`Delete font "${font.name}"?`)) return;

    try {
      await deleteFont(font.id, font.file_path);
      await loadFonts();
      alert('Font deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete font: ${message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-300">Font Library</h2>
            <p className="text-xs text-gray-500 mt-1">
              {fontCount} / 500 fonts ({fonts.length} loaded)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || fontCount >= 500}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Fonts'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              multiple
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

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <p className="text-xs text-gray-400">{uploadProgress}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading fonts...</div>
          ) : fonts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">No fonts in library</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fontCount >= 500}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 text-white rounded"
              >
                Upload Your First Font
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {fonts.map((font) => (
                <div
                  key={font.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-gray-300 truncate" title={font.name}>
                      {font.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{font.family_name}</p>
                  </div>
                  {font.tags && font.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {font.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(font)}
                    className="w-full mt-2 px-3 py-1.5 bg-accent hover:bg-accent/80 text-white text-xs rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



