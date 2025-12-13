/**
 * Layers Panel - Left Sidebar
 * 
 * Manages layer stack: select, hide/show, lock/unlock, delete, reorder
 */

'use client';

import { useState, useRef } from 'react';
import { WatermarkLayer } from '@/lib/watermark/types';

interface LayersPanelProps {
  layers: WatermarkLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onLayerUpdate: (layerId: string, updates: Partial<WatermarkLayer>) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerReorder: (layerId: string, direction: 'up' | 'down') => void;
  onGroupLayers?: (layerIds: string[]) => void;
  onUngroupLayer?: (layerId: string) => void;
}

export default function LayersPanel({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerReorder,
  onGroupLayers,
  onUngroupLayer,
}: LayersPanelProps) {
  // Sort layers by zIndex descending (top layer first)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  
  // Track which layer is waiting to be linked (clicked "Link" button)
  const [linkingLayerId, setLinkingLayerId] = useState<string | null>(null);
  const dragOverLayerId = useRef<string | null>(null);

  const handleToggleVisibility = (layer: WatermarkLayer) => {
    onLayerUpdate(layer.id, { enabled: !layer.enabled });
  };

  const handleToggleLock = (layer: WatermarkLayer) => {
    onLayerUpdate(layer.id, { locked: !layer.locked });
  };

  const handleDelete = (layerId: string) => {
    if (confirm('Delete this layer?')) {
      onLayerDelete(layerId);
    }
  };

  const handleReorder = (layer: WatermarkLayer, direction: 'up' | 'down') => {
    onLayerReorder(layer.id, direction);
  };

  const handleGroup = (layerId: string) => {
    if (!onGroupLayers) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // If already in linking mode, link this layer with the waiting layer
    if (linkingLayerId && linkingLayerId !== layerId) {
      // Link the two layers together
      onGroupLayers([linkingLayerId, layerId]);
      setLinkingLayerId(null);
      return;
    }
    
    // If already linked, unlink it first
    if (layer.groupId) {
      if (onUngroupLayer) {
        onUngroupLayer(layerId);
      }
      setLinkingLayerId(null);
      return;
    }
    
    // Start linking mode - wait for another layer to be clicked
    setLinkingLayerId(layerId);
  };
  
  // Handle drag and drop to link layers
  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', layerId);
  };
  
  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    dragOverLayerId.current = layerId;
  };
  
  const handleDragLeave = () => {
    dragOverLayerId.current = null;
  };
  
  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    const draggedLayerId = e.dataTransfer.getData('text/plain');
    dragOverLayerId.current = null;
    
    if (draggedLayerId && draggedLayerId !== targetLayerId && onGroupLayers) {
      // Link the dragged layer with the target layer
      onGroupLayers([draggedLayerId, targetLayerId]);
    }
  };

  const handleUngroup = (layer: WatermarkLayer) => {
    if (!onUngroupLayer) return;
    onUngroupLayer(layer.id);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Layers</h3>
        <p className="text-xs text-gray-400 mt-1">
          {sortedLayers.length} layer{sortedLayers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Linking Mode Indicator */}
      {linkingLayerId && (
        <div className="px-4 py-2 bg-blue-600/20 border-b border-blue-500/30">
          <p className="text-xs text-blue-300">
            💡 Linking mode: Click another layer to link, or drag a layer onto another to link them
          </p>
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {sortedLayers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No layers yet
          </div>
        ) : (
          <div className="space-y-1">
            {sortedLayers.map((layer, index) => {
              const isSelected = layer.id === selectedLayerId;
              const canMoveUp = index > 0;
              const canMoveDown = index < sortedLayers.length - 1;

              return (
                <div
                  key={layer.id}
                  className={`group relative rounded-lg border transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  } ${!layer.enabled ? 'opacity-50' : ''} ${
                    dragOverLayerId.current === layer.id ? 'border-blue-500 bg-blue-500/20' : ''
                  } ${linkingLayerId === layer.id ? 'ring-2 ring-blue-500' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={(e) => handleDragOver(e, layer.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, layer.id)}
                >
                  {/* Layer Row */}
                  <div
                    onClick={() => {
                      // If in linking mode, link with this layer
                      if (linkingLayerId && linkingLayerId !== layer.id) {
                        handleGroup(layer.id);
                        onLayerSelect(layer.id); // Select the newly linked layer
                      } else {
                        onLayerSelect(layer.id);
                      }
                    }}
                    className={`p-3 cursor-pointer ${
                      linkingLayerId && linkingLayerId !== layer.id && !layer.groupId
                        ? 'hover:bg-blue-500/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Layer Type Icon */}
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold bg-gray-700 rounded">
                        {layer.type === 'text' ? 'T' : 'L'}
                      </div>

                      {/* Layer Label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className="text-sm text-gray-200 truncate">
                            {layer.type === 'text'
                              ? (layer.text ? layer.text.substring(0, 20) : 'Text Layer')
                              : 'Logo'}
                          </div>
                          {layer.groupId && (
                            <span className="text-xs text-blue-400" title="Linked with other layer(s)">
                              🔗
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(layer);
                        }}
                        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
                          layer.enabled
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-700'
                        }`}
                        title={layer.enabled ? 'Hide' : 'Show'}
                      >
                        {layer.enabled ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(layer);
                        }}
                        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
                          layer.locked
                            ? 'text-yellow-400 hover:bg-gray-700'
                            : 'text-gray-400 hover:bg-gray-700'
                        }`}
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 10h-1V7c0-3.31-2.69-6-6-6S5 3.69 5 7v3H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H6.9V7c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v3z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(layer.id);
                        }}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Group/Ungroup Controls */}
                  {isSelected && (
                    <div className="px-3 pb-2 flex gap-1 border-t border-gray-700 pt-2">
                      {layer.groupId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUngroup(layer);
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                          title="Unlink this layer"
                        >
                          🔗 Unlink
                        </button>
                      ) : (
                        onGroupLayers && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGroup(layer.id);
                              }}
                              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                linkingLayerId === layer.id
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={
                                linkingLayerId === layer.id
                                  ? 'Click another layer to link, or click again to cancel'
                                  : 'Click to link this layer with another layer (or drag onto another layer)'
                              }
                            >
                              {linkingLayerId === layer.id ? '⏳ Linking...' : '🔗 Link'}
                            </button>
                            {linkingLayerId === layer.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingLayerId(null);
                                }}
                                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                                title="Cancel linking"
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )
                      )}
                    </div>
                  )}

                  {/* Reorder Controls */}
                  {isSelected && (
                    <div className="px-3 pb-2 flex gap-1 border-t border-gray-700 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorder(layer, 'up');
                        }}
                        disabled={!canMoveUp}
                        className="flex-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                        title="Bring Forward"
                      >
                        ↑ Forward
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorder(layer, 'down');
                        }}
                        disabled={!canMoveDown}
                        className="flex-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                        title="Send Backward"
                      >
                        ↓ Back
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

