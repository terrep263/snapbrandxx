'use client';

import { useRef } from 'react';
import { WatermarkConfig } from '@/lib/watermarkEngine';

interface WatermarkSettingsPanelProps {
  config: WatermarkConfig;
  onConfigChange: (config: WatermarkConfig) => void;
  onLogoFileChange: (file: File | null) => void;
}

const FONT_OPTIONS = ['Inter', 'Roboto', 'Playfair Display', 'Arial', 'Helvetica', 'Times New Roman'];

export default function WatermarkSettingsPanel({
  config,
  onConfigChange,
  onLogoFileChange,
}: WatermarkSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (updates: Partial<WatermarkConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/png') {
        onLogoFileChange(file);
      } else {
        alert('Please select a PNG file for the logo');
      }
    }
  };

  const handleRemoveLogo = () => {
    onLogoFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const positions = [
    { value: 'top-left', label: 'Top Left', icon: '↖' },
    { value: 'top-right', label: 'Top Right', icon: '↗' },
    { value: 'bottom-left', label: 'Bottom Left', icon: '↙' },
    { value: 'bottom-right', label: 'Bottom Right', icon: '↘' },
    { value: 'center', label: 'Center', icon: '○' },
  ] as const;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Watermark Settings</h2>
      <div className="space-y-4">
        {/* Mode */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Mode</label>
          <div className="flex gap-2">
            {(['text', 'logo', 'text+logo'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateConfig({ mode })}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                  config.mode === mode
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {mode === 'text' ? 'Text Only' : mode === 'logo' ? 'Logo Only' : 'Text + Logo'}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Text */}
        {(config.mode === 'text' || config.mode === 'text+logo') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Brand Text</label>
            <input
              type="text"
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              placeholder="Your Brand"
            />
          </div>
        )}

        {/* Font Settings */}
        {(config.mode === 'text' || config.mode === 'text+logo') && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Font Family</label>
              <select
                value={config.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Font Size: {config.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={config.fontSize}
                onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>12px</span>
                <span>72px</span>
              </div>
            </div>
          </>
        )}

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Opacity: {Math.round(config.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={config.opacity}
            onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Position</label>
          <div className="grid grid-cols-3 gap-2">
            {positions.map((pos) => (
              <button
                key={pos.value}
                onClick={() => updateConfig({ position: pos.value })}
                className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                  config.position === pos.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                title={pos.label}
              >
                {pos.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Margins */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Margin X: {config.marginX}px</label>
            <input
              type="number"
              min="0"
              max="200"
              value={config.marginX}
              onChange={(e) => updateConfig({ marginX: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Margin Y: {config.marginY}px</label>
            <input
              type="number"
              min="0"
              max="200"
              value={config.marginY}
              onChange={(e) => updateConfig({ marginY: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Logo Upload */}
        {(config.mode === 'logo' || config.mode === 'text+logo') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Logo (PNG)</label>
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                {config.logoImage ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleLogoSelect}
                className="hidden"
              />
              {config.logoImage && (
                <button
                  onClick={handleRemoveLogo}
                  className="w-full px-3 py-2 bg-accent hover:bg-accent/80 text-white text-sm rounded transition-colors"
                >
                  Remove Logo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

