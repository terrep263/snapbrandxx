/**
 * Color Picker with Eyedropper Tool
 * 
 * Enhanced color picker with native browser eyedropper support
 */

'use client';

import { useState, useRef, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isEyedropping, setIsEyedropping] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check if browser supports Eyedropper API
  const supportsEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  const handleEyedropperClick = useCallback(async () => {
    if (!supportsEyedropper) {
      alert('Eyedropper tool is not supported in your browser. Please use Chrome, Edge, or Safari 18+');
      return;
    }

    try {
      setIsEyedropping(true);
      
      // Use native EyeDropper API
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      
      if (result && result.sRGBHex) {
        onChange(result.sRGBHex);
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Eyedropper error:', error);
      }
    } finally {
      setIsEyedropping(false);
    }
  }, [onChange, supportsEyedropper]);

  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      onChange(color);
    }
  }, [onChange]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs text-gray-300 mb-2">{label}</label>
      )}
      <div className="flex gap-2">
        {/* Color Input */}
        <div className="relative">
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={handleColorInputChange}
            className="w-12 h-10 bg-gray-800 border border-gray-700 rounded cursor-pointer appearance-none"
            style={{ 
              cursor: 'pointer',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          />
          <div
            className="absolute inset-0 rounded pointer-events-none border border-gray-600"
            style={{ backgroundColor: value }}
          />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          onChange={handleTextInputChange}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-red-500 font-mono"
          placeholder="#ffffff"
          maxLength={7}
        />

        {/* Eyedropper Button */}
        {supportsEyedropper && (
          <button
            type="button"
            onClick={handleEyedropperClick}
            disabled={isEyedropping}
            className={`px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors flex items-center justify-center ${
              isEyedropping ? 'opacity-50 cursor-wait' : ''
            }`}
            title="Pick color from screen (Eyedropper)"
          >
            {isEyedropping ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-base">🎨</span>
            )}
          </button>
        )}
      </div>
      
      {!supportsEyedropper && (
        <p className="text-xs text-gray-500">
          Eyedropper requires Chrome, Edge, or Safari 18+
        </p>
      )}
    </div>
  );
}

