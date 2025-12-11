'use client';

import { useState, useEffect } from 'react';
import OrderPanel from './OrderPanel';
import UploadPanel from './UploadPanel';
import { ProcessedImage } from '@/lib/watermarkEngine';

interface Step1OrderImagesProps {
  clientName: string;
  orderId: string;
  notes: string;
  images: ProcessedImage[];
  onClientNameChange: (value: string) => void;
  onOrderIdChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onImagesChange: (images: ProcessedImage[]) => void;
  onContinue: () => void;
}

export default function Step1OrderImages({
  clientName,
  orderId,
  notes,
  images,
  onClientNameChange,
  onOrderIdChange,
  onNotesChange,
  onImagesChange,
  onContinue,
}: Step1OrderImagesProps) {
  const [showAdvanceMessage, setShowAdvanceMessage] = useState(false);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-advance when images are added
    if (images.length > 0 && !showAdvanceMessage) {
      setShowAdvanceMessage(true);
      const timeout = setTimeout(() => {
        onContinue();
      }, 2000); // 2 second delay
      setAutoAdvanceTimeout(timeout);
    }

    return () => {
      if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
      }
    };
  }, [images.length, showAdvanceMessage, onContinue, autoAdvanceTimeout]);

  const handleManualContinue = () => {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
    }
    onContinue();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-200 mb-2">Order & Images</h1>
            <p className="text-sm text-gray-400">
              Enter order information and upload images to get started
            </p>
          </div>

          {showAdvanceMessage && (
            <div className="mb-6 p-4 bg-primary/20 border border-primary rounded-lg">
              <p className="text-primary text-sm font-medium">
                ✓ Images added! Opening editor...
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Order Info */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Order Information</h2>
                <OrderPanel
                  clientName={clientName}
                  orderId={orderId}
                  notes={notes}
                  onClientNameChange={onClientNameChange}
                  onOrderIdChange={onOrderIdChange}
                  onNotesChange={onNotesChange}
                />
              </div>
            </div>

            {/* Right: Image Upload */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Upload Images</h2>
                <UploadPanel
                  images={images}
                  onImagesChange={onImagesChange}
                />
              </div>
            </div>
          </div>

          {/* Continue Button */}
          {images.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleManualContinue}
                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Continue to Editor →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


