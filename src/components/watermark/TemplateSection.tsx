/**
 * Template Section
 * 
 * Built-in and user-saved templates
 */

'use client';

import { Template } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';
import { useState } from 'react';

export default function TemplateSection() {
  const { templates, applyTemplate, saveAsTemplate, job } = useWatermark();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const builtInTemplates: Template[] = [
    {
      id: 'logo-bottom-right',
      name: 'Logo Bottom Right',
      description: 'Logo positioned at bottom-right corner',
      isBuiltIn: true,
      layers: [
        {
          id: 'logo-1',
          type: 'logo',
          zIndex: 1,
          enabled: true,
          anchor: 'CENTER' as any,
          xNorm: 0.95, // Bottom-right area
          yNorm: 0.95,
          offsetX: -5, // Legacy support
          offsetY: -5,
          scale: 0.15,
          rotation: 0,
          opacity: 0.8,
          tileMode: 'none' as any,
          effect: 'solid',
        },
      ],
    },
    {
      id: 'text-bottom-center',
      name: 'Text Bottom Center',
      description: 'Text watermark at bottom center',
      isBuiltIn: true,
      layers: [
        {
          id: 'text-1',
          type: 'text',
          zIndex: 1,
          enabled: true,
          anchor: 'CENTER' as any,
          xNorm: 0.5, // Center horizontally
          yNorm: 0.95, // Bottom area
          offsetX: 50, // Legacy support
          offsetY: -5,
          scale: 1.0,
          rotation: 0,
          opacity: 0.8,
          tileMode: 'none' as any,
          effect: 'solid',
          text: '{NAME}',
          fontFamily: 'Inter',
          fontSizeRelative: 5,
          color: '#ffffff',
        },
      ],
    },
  ];

  const allTemplates = [...builtInTemplates, ...templates];

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      saveAsTemplate(templateName.trim(), templateDescription.trim());
      setTemplateName('');
      setTemplateDescription('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Templates</h3>
        {job && job.globalLayers.length > 0 && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-dark text-white rounded transition-colors"
          >
            Save Current
          </button>
        )}
      </div>

      {showSaveDialog && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100"
              placeholder="Enter template name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100"
              placeholder="Enter description"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 text-xs bg-primary hover:bg-primary-dark text-white rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
              className="px-4 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {allTemplates.map((template) => (
          <div
            key={template.id}
            className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-200">{template.name}</h4>
                {template.description && (
                  <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {template.layers.length} layer{template.layers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => applyTemplate(template)}
                className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-dark text-white rounded transition-colors ml-3"
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



