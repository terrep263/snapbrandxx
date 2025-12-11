/**
 * Layer Editor Section - Redesigned for Intuitive Use
 * 
 * Well-organized, clearly labeled controls grouped by function
 */

'use client';

import { WatermarkLayer, Anchor, TextEffect, LogoEffect, TileMode, TextAlign, DEFAULT_TEXT_PRESETS } from '@/lib/watermark/types';
import { FontRecord, getAllFonts } from '@/lib/fontLibrary';
import { useState, useEffect } from 'react';

interface LayerEditorSectionProps {
  layer: WatermarkLayer;
  onUpdate: (updates: Partial<WatermarkLayer>) => void;
}

const BUILT_IN_FONTS = ['Inter', 'Roboto', 'Playfair Display', 'Arial', 'Helvetica', 'Times New Roman'];

export default function LayerEditorSection({ layer, onUpdate }: LayerEditorSectionProps) {
  const [brandFonts, setBrandFonts] = useState<FontRecord[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['content', 'position']));

  useEffect(() => {
    getAllFonts().then(setBrandFonts).catch(console.error);
  }, []);

  const allFonts = [...BUILT_IN_FONTS, ...brandFonts.map(f => f.family_name)];

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const anchors = [
    { value: Anchor.TOP_LEFT, label: 'Top Left', icon: '↖' },
    { value: Anchor.TOP_RIGHT, label: 'Top Right', icon: '↗' },
    { value: Anchor.BOTTOM_LEFT, label: 'Bottom Left', icon: '↙' },
    { value: Anchor.BOTTOM_RIGHT, label: 'Bottom Right', icon: '↘' },
    { value: Anchor.CENTER, label: 'Center', icon: '○' },
  ];

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-gray-200">{title}</span>
      </div>
      <span className="text-gray-400">
        {expandedSections.has(id) ? '▼' : '▶'}
      </span>
    </button>
  );

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-100">
              Edit {layer.type === 'text' ? 'Text' : 'Logo'} Layer
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Adjust settings below to customize your watermark
            </p>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !layer.enabled })}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              layer.enabled
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {layer.enabled ? 'Visible' : 'Hidden'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Content Section */}
        {layer.type === 'text' && (
          <>
            <SectionHeader id="content" title="Text Content" icon="✏️" />
            {expandedSections.has('content') && (
              <div className="space-y-4 pl-2 border-l-2 border-gray-700 ml-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={layer.text || ''}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary"
                    placeholder="Enter your watermark text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Font Family
                    </label>
                    <select
                      value={layer.fontFamily || 'Inter'}
                      onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-primary"
                    >
                      {allFonts.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Font Size: {layer.fontSizeRelative || 5}% of image height
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={layer.fontSizeRelative || 5}
                      onChange={(e) => onUpdate({ fontSizeRelative: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Text Style
                  </label>
                  <select
                    value={layer.effect || TextEffect.SOLID}
                    onChange={(e) => onUpdate({ effect: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-primary"
                  >
                    <option value={TextEffect.SOLID}>Solid Fill</option>
                    <option value={TextEffect.OUTLINE}>Outline</option>
                    <option value={TextEffect.SHADOW}>Shadow</option>
                    <option value={TextEffect.GLOW}>Glow</option>
                    <option value={TextEffect.GRADIENT}>Gradient</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={layer.color || '#ffffff'}
                        onChange={(e) => onUpdate({ color: e.target.value })}
                        className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={layer.color || '#ffffff'}
                        onChange={(e) => onUpdate({ color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  {(layer.effect === TextEffect.OUTLINE || layer.effect === TextEffect.SHADOW || layer.effect === TextEffect.GLOW || layer.effect === TextEffect.GRADIENT) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={layer.secondaryColor || '#000000'}
                          onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                          className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={layer.secondaryColor || '#000000'}
                          onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onUpdate({
                            color: preset.color,
                            secondaryColor: preset.secondaryColor,
                            effect: preset.effect,
                          });
                        }}
                        className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-left"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Position Section */}
        <SectionHeader id="position" title="Position & Size" icon="📍" />
        {expandedSections.has('position') && (
          <div className="space-y-4 pl-2 border-l-2 border-gray-700 ml-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Anchor Point
              </label>
              <p className="text-xs text-gray-400 mb-2">Where the watermark is anchored on the image</p>
              <div className="grid grid-cols-3 gap-2">
                {anchors.map((anchor) => (
                  <button
                    key={anchor.value}
                    onClick={() => onUpdate({ anchor: anchor.value })}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      layer.anchor === anchor.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={anchor.label}
                  >
                    <div className="text-lg mb-1">{anchor.icon}</div>
                    <div className="text-xs">{anchor.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Horizontal Offset: {layer.offsetX.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="0.5"
                  value={layer.offsetX}
                  onChange={(e) => onUpdate({ offsetX: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vertical Offset: {layer.offsetY.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="0.5"
                  value={layer.offsetY}
                  onChange={(e) => onUpdate({ offsetY: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Size: {Math.round(layer.scale * 100)}%
              </label>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={layer.scale}
                onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>20%</span>
                <span>300%</span>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Section */}
        <SectionHeader id="appearance" title="Appearance" icon="🎨" />
        {expandedSections.has('appearance') && (
          <div className="space-y-4 pl-2 border-l-2 border-gray-700 ml-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Opacity: {Math.round(layer.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={layer.opacity * 100}
                onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Transparent</span>
                <span>Opaque</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rotation: {layer.rotation}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={layer.rotation}
                onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0°</span>
                <span>360°</span>
              </div>
            </div>

            {layer.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tile Mode
                </label>
                <select
                  value={layer.tileMode || TileMode.NONE}
                  onChange={(e) => onUpdate({ tileMode: e.target.value as TileMode })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-primary"
                >
                  <option value={TileMode.NONE}>None (Single watermark)</option>
                  <option value={TileMode.STRAIGHT}>Straight (Grid pattern)</option>
                  <option value={TileMode.DIAGONAL}>Diagonal (Diagonal pattern)</option>
                </select>
                {layer.tileMode !== TileMode.NONE && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tile Spacing: {layer.tileSpacing || 1.5}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={layer.tileSpacing || 1.5}
                      onChange={(e) => onUpdate({ tileSpacing: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {layer.type === 'logo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Effect
                  </label>
                  <select
                    value={layer.effect || LogoEffect.SOLID}
                    onChange={(e) => onUpdate({ effect: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-primary"
                  >
                    <option value={LogoEffect.SOLID}>Normal</option>
                    <option value={LogoEffect.SHADOW}>With Shadow</option>
                    <option value={LogoEffect.BOX}>With Background Box</option>
                  </select>
                </div>

                {layer.effect === LogoEffect.BOX && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-600">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Box Opacity: {Math.round((layer.boxOpacity || 0.8) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={(layer.boxOpacity || 0.8) * 100}
                        onChange={(e) => onUpdate({ boxOpacity: parseInt(e.target.value) / 100 })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Box Color
                      </label>
                      <input
                        type="color"
                        value={layer.boxColor || '#000000'}
                        onChange={(e) => onUpdate({ boxColor: e.target.value })}
                        className="w-full h-12 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
