/**
 * Brand Section
 * 
 * Brand profile management
 */

'use client';

import { BrandProfile } from '@/lib/watermark/types';
import { useWatermark } from '@/lib/watermark/context';

export default function BrandSection() {
  const { activeBrandProfile, setActiveBrandProfile } = useWatermark();

  // Placeholder - would integrate with brand profile management
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Brand Profile</h3>
      
      {activeBrandProfile ? (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-200">{activeBrandProfile.name}</h4>
          {activeBrandProfile.website && (
            <p className="text-xs text-gray-400 mt-1">{activeBrandProfile.website}</p>
          )}
          {activeBrandProfile.primaryColor && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Primary Color:</span>
              <div
                className="w-6 h-6 rounded border border-gray-600"
                style={{ backgroundColor: activeBrandProfile.primaryColor }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
          <p className="text-xs text-gray-400">No brand profile selected</p>
          <p className="text-xs text-gray-500 mt-1">Brand profiles coming soon</p>
        </div>
      )}
    </div>
  );
}



