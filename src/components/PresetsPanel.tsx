'use client';

import { useState, useEffect } from 'react';
import { WatermarkConfig } from '@/lib/watermarkEngine';
import { savePreset, loadAllPresets, loadPreset, deletePreset, Preset } from '@/lib/presets';

interface PresetsPanelProps {
  currentConfig: WatermarkConfig;
  onConfigLoad: (config: WatermarkConfig) => void;
}

export default function PresetsPanel({ currentConfig, onConfigLoad }: PresetsPanelProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    setPresets(loadAllPresets());
  }, []);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    savePreset(presetName.trim(), currentConfig);
    setPresets(loadAllPresets());
    setPresetName('');
    alert(`Preset "${presetName.trim()}" saved`);
  };

  const handleLoadPreset = () => {
    if (!selectedPreset) {
      alert('Please select a preset');
      return;
    }

    const config = loadPreset(selectedPreset);
    if (config) {
      onConfigLoad(config);
      alert(`Preset "${selectedPreset}" loaded`);
    } else {
      alert('Failed to load preset');
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) {
      alert('Please select a preset to delete');
      return;
    }

    if (confirm(`Delete preset "${selectedPreset}"?`)) {
      deletePreset(selectedPreset);
      setPresets(loadAllPresets());
      setSelectedPreset('');
      alert(`Preset "${selectedPreset}" deleted`);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Presets</h2>
      <div className="space-y-4">
        {/* Save Preset */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Save Current Settings</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePreset();
                }
              }}
              placeholder="Preset name"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSavePreset}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* Load Preset */}
        {presets.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Load Preset</label>
            <div className="space-y-2">
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              >
                <option value="">Select a preset...</option>
                {presets.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadPreset}
                  disabled={!selectedPreset}
                  className="flex-1 px-3 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={handleDeletePreset}
                  disabled={!selectedPreset}
                  className="px-3 py-2 bg-accent hover:bg-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {presets.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            No presets saved yet. Save your current settings to create one.
          </p>
        )}
      </div>
    </div>
  );
}

