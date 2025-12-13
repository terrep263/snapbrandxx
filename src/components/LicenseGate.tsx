/**
 * License Gate Component
 * Blocks unlicensed users from accessing protected content
 * Must be used after AuthGate (user must be authenticated first)
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface LicenseGateProps {
  children: React.ReactNode;
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [licensed, setLicensed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkLicense() {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        // Get user's auth token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLicensed(false);
          setChecking(false);
          return;
        }

        // Call license check API
        const response = await fetch('/api/auth/check-license', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('License check failed');
        }

        const data = await response.json();
        setLicensed(data.licensed === true);
      } catch (error) {
        console.error('License check failed:', error);
        setLicensed(false);
      } finally {
        setChecking(false);
      }
    }

    checkLicense();
  }, [user]);

  // Show loading state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Not licensed - show purchase page
  if (!licensed) {
    const gumroadUrl = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || 'https://snapworxxbrand.gumroad.com/l/snapbrandxx';

    return (
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4 font-mono text-dark">
            Purchase Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to purchase SnapBrandXX to access the editor.
          </p>
          <a
            href={gumroadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-brand-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-red-dark transition-colors"
          >
            Buy on Gumroad
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Make sure to use the same email: <strong>{user?.email}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Licensed - render protected content
  return <>{children}</>;
}

