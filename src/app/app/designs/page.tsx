'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import LicenseGate from '@/components/LicenseGate';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface Design {
  id: string;
  name: string;
  layers: any;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ActiveSession {
  id: string;
  image_count: number;
  expires_at: string;
  images: string[];
}

export default function MyDesignsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    loadDesigns();
    checkActiveSession();
  }, []);

  async function loadDesigns() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/designs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load designs');
      }

      const data = await response.json();
      setDesigns(data.designs || []);
    } catch (error) {
      console.error('Error loading designs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkActiveSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSessionLoading(false);
        return;
      }

      const response = await fetch('/api/sessions/current', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
      } else if (response.status === 404) {
        // No active session - this is fine
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/designs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete design');
      }

      // Reload designs
      await loadDesigns();
    } catch (error) {
      console.error('Error deleting design:', error);
      alert('Failed to delete design. Please try again.');
    }
  }

  return (
    <AuthGate>
      <LicenseGate>
        <div className="min-h-screen bg-off-white">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold font-mono text-dark">My Designs</h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/app')}
                  className="bg-brand-red text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-red-dark transition-colors"
                >
                  Create New Design
                </button>
                <UserMenu />
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Active Session Banner */}
            {!sessionLoading && activeSession && (
              <div className="mb-6 p-4 bg-brand-red-light rounded-lg border border-brand-red/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark mb-1">
                      You have {activeSession.image_count} image{activeSession.image_count !== 1 ? 's' : ''} from your last session
                    </p>
                    <p className="text-xs text-gray-600">
                      Expires: {new Date(activeSession.expires_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/app?session=${activeSession.id}`)}
                    className="bg-brand-red text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-red-dark transition-colors whitespace-nowrap"
                  >
                    Resume Last Session
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your designs...</p>
              </div>
            ) : designs.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg
                    className="w-24 h-24 text-gray-300 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4 text-lg">No designs yet. Create your first one!</p>
                <button
                  onClick={() => router.push('/app')}
                  className="bg-brand-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-red-dark transition-colors"
                >
                  Create New Design
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designs.map((design) => (
                  <div
                    key={design.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {design.thumbnail_url ? (
                        <img
                          src={design.thumbnail_url}
                          alt={design.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 truncate text-dark">{design.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Updated {new Date(design.updated_at).toLocaleDateString()}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/app?design=${design.id}`)}
                          className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/app?apply=${design.id}`)}
                          className="flex-1 bg-brand-red text-white px-3 py-2 rounded text-sm font-medium hover:bg-brand-red-dark transition-colors"
                        >
                          Apply to Images
                        </button>
                        <button
                          onClick={() => handleDelete(design.id, design.name)}
                          className="px-3 py-2 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </LicenseGate>
    </AuthGate>
  );
}

