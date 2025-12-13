'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import StepHeader from '@/components/StepHeader';
import Step1OrderImages from '@/components/Step1OrderImages';
import FontLibrary from '@/components/FontLibrary';
import { ProcessedImage } from '@/lib/watermark/types';
import { WatermarkProvider } from '@/lib/watermark';
import { isAuthenticated, logout } from '@/lib/auth';

// Dynamically import components that use canvas/browser APIs to prevent SSR issues
const WatermarkEditor = dynamic(() => import('@/components/watermark/WatermarkEditor'), { ssr: false });
const Step3Export = dynamic(() => import('@/components/Step3Export'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [clientName, setClientName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showFontLibrary, setShowFontLibrary] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isAuthenticated()) {
        setIsAuthChecked(true);
        router.push('/login');
      } else {
        setIsAuthChecked(true);
      }
    }
  }, [router]);

  // Guardrail 3: Editor State Protection - beforeunload warning
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleImagesUploaded = useCallback((newImages: ProcessedImage[]) => {
    setImages(newImages);
  }, []);

  const handleStep1Continue = () => {
    if (images.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleStep2Back = () => setCurrentStep(1);
  const handleStep2Next = () => setCurrentStep(3);
  const handleStep3Back = () => setCurrentStep(2);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
    }
  };

  if (!isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-dark-400 font-medium">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 text-gray-100" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Animated background pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-radial from-primary-500/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Header with glassmorphism */}
      <header className="relative z-10 backdrop-blur-xl bg-dark-900/80 border-b border-white/5 shadow-2xl">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative w-12 h-12">
              <Image
                src="/logo.png"
                alt="SnapBrandXX Logo"
                width={48}
                height={48}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                SnapBrandXX
              </h1>
              <p className="text-sm text-dark-400 font-medium">Professional Watermarking Platform</p>
            </div>
          </div>
          
          {/* User actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800/50 border border-white/5">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-dark-300">Online</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-white bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200 hover:shadow-lg"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Step Progress */}
      <StepHeader currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* Font Library Modal */}
      {showFontLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <FontLibrary onClose={() => setShowFontLibrary(false)} />
        </div>
      )}

      {/* Main Content with fade transitions */}
      <div className="flex-1 relative overflow-hidden">
        {currentStep === 1 && (
          <div className="h-full animate-fade-in">
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
          </div>
        )}

        {currentStep === 2 && (
          <div className="h-full w-full animate-fade-in overflow-hidden">
            <WatermarkProvider>
              <WatermarkEditor
                images={images}
                onBack={handleStep2Back}
                onNext={handleStep2Next}
              />
            </WatermarkProvider>
          </div>
        )}

        {currentStep === 3 && (
          <div className="h-full animate-fade-in">
            <WatermarkProvider>
              <Step3Export
                images={images}
                clientName={clientName}
                orderId={orderId}
                onBack={handleStep3Back}
                onImagesUpdate={setImages}
              />
            </WatermarkProvider>
          </div>
        )}
      </div>
    </div>
  );
}
