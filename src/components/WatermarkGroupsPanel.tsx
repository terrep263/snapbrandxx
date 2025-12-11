'use client';

import { useState, useEffect } from 'react';
import { WatermarkGroup, getAllGroups, saveCustomGroup, deleteCustomGroup, cloneGroupLayers } from '@/lib/watermarkGroups';
import { WatermarkLayer } from '@/lib/watermarkEngine';
import { LogoItem } from '@/lib/logoLibrary';

interface WatermarkGroupsPanelProps {
  onAddGroup: (layers: WatermarkLayer[]) => void;
  currentLayers: WatermarkLayer[];
  logoImage: HTMLImageElement | null;
  brandText?: {
    name?: string;
    title?: string;
    website?: string;
    brand?: string;
  };
}

export default function WatermarkGroupsPanel({
  onAddGroup,
  currentLayers,
  logoImage,
  brandText = {},
}: WatermarkGroupsPanelProps) {
  const [groups, setGroups] = useState<WatermarkGroup[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    setGroups(getAllGroups());
  };

  const handleSelectGroup = (group: WatermarkGroup) => {
    const clonedLayers = cloneGroupLayers(group, {
      name: brandText.name,
      title: brandText.title,
      website: brandText.website,
      brand: brandText.brand,
      logoImage: logoImage,
    });
    onAddGroup(clonedLayers);
  };

  const handleSaveCurrent = () => {
    if (!saveName.trim()) {
      alert('Please enter a name for this template');
      return;
    }

    if (currentLayers.length === 0) {
      alert('No layers to save. Add some layers first.');
      return;
    }

    saveCustomGroup({
      name: saveName.trim(),
      description: saveDescription.trim() || undefined,
      layers: currentLayers,
    });

    setSaveName('');
    setSaveDescription('');
    setShowSaveDialog(false);
    loadGroups();
    alert('Template saved successfully!');
  };

  const handleDeleteCustom = (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    deleteCustomGroup(id);
    loadGroups();
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300">Templates</h2>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-dark text-white rounded transition-colors"
        >
          Save Current
        </button>
      </div>

      {showSaveDialog && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <h3 className="text-xs font-semibold text-gray-300 mb-2">Save Current Layout as Template</h3>
          <div className="space-y-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-100"
              autoFocus
            />
            <input
              type="text"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-100"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveCurrent}
                className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                  setSaveDescription('');
                }}
                className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No templates available</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-gray-800 border border-gray-700 rounded p-3 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-gray-300">{group.name}</h3>
                    {group.isBuiltIn && (
                      <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">Built-in</span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {group.layers.length} layer{group.layers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {!group.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteCustom(group.id, group.name)}
                    className="ml-2 px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-white rounded"
                    title="Delete template"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={() => handleSelectGroup(group)}
                className="w-full px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded transition-colors"
              >
                Add to Canvas
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


