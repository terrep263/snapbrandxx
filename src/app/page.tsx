'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepHeader from '@/components/StepHeader';
import Step1OrderImages from '@/components/Step1OrderImages';
import Step2Editor from '@/components/Step2Editor';
import WatermarkEditor from '@/components/watermark/WatermarkEditor';
import Step3Export from '@/components/Step3Export';
import FontLibrary from '@/components/FontLibrary';
import { ProcessedImage } from '@/lib/watermark/types';
import { WatermarkProvider } from '@/lib/watermark';
import { isAuthenticated, logout } from '@/lib/auth';
import { getAllFonts, preloadFontsInUse, FontRecord } from '@/lib/fontLibrary';
import JSZip from 'jszip';

export default function Home() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [clientName, setClientName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  const [showFontLibrary, setShowFontLibrary] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isAuthenticated()) {
        setIsAuthChecked(true); // Set to true to allow redirect
        router.push('/login');
      } else {
        setIsAuthChecked(true);
      }
    }
  }, [router]);


  const handleImagesUploaded = useCallback((newImages: ProcessedImage[]) => {
    setImages(newImages);
  }, []);

  // Step navigation handlers
  const handleStep1Continue = () => {
    if (images.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep2Next = () => {
    // Allow proceeding even without layers for now
    setCurrentStep(3);
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };



  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
    }
  };

  // Show loading or nothing while checking auth
  if (!isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-primary">SnapBrandXX Ops</h1>
          <p className="text-xs text-gray-400">Internal Bulk Watermark Tool</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Step Header */}
      <StepHeader currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* Font Library Modal */}
      {showFontLibrary && (
        <FontLibrary
          onClose={() => {
            setShowFontLibrary(false);
            getAllFonts().then(setBrandFonts).catch(console.error);
          }}
        />
      )}

      {/* Step Content */}
      {currentStep === 1 && (
        <Step1OrderImages
          clientName={clientName}
          orderId={orderId}
          notes={notes}
          images={images}
          onClientNameChange={setClientName}
          onOrderIdChange={setOrderId}
          onNotesChange={setNotes}
          onImagesChange={handleImagesUploaded}
          onContinue={handleStep1Continue}
        />
      )}

      {currentStep === 2 && (
        <WatermarkProvider>
          <WatermarkEditor
            images={images}
            onBack={handleStep2Back}
            onNext={handleStep2Next}
          />
        </WatermarkProvider>
      )}

      {currentStep === 3 && (
        <WatermarkProvider>
          <Step3Export
            images={images}
            clientName={clientName}
            orderId={orderId}
            onBack={handleStep3Back}
            onImagesUpdate={setImages}
          />
        </WatermarkProvider>
      )}
    </div>
  );
}
