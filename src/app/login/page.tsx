'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/app/designs');
    }
  }, [user, router]);

  // Handle magic link callback
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/app/designs');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validate email format
    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/app/designs`,
        },
      });

      if (error) {
        setError(error.message || 'Failed to send magic link. Please try again.');
        setIsLoading(false);
      } else {
        setSuccess(true);
        setIsLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-off-white to-white">
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="SnapBrandXX Logo"
                width={64}
                height={64}
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
          <h1 className="text-2xl font-mono font-bold text-dark mb-2">SnapBrandXX</h1>
          <p className="text-sm text-gray-600">Log in to your workspace</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-brand-red-light border border-brand-red rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-red flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-brand-red-dark">Check your email</p>
                  <p className="text-sm text-gray-700 mt-1">
                    We've sent a magic link to <strong>{email}</strong>. Click the link in the email to log in.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                placeholder="you@example.com"
                autoFocus
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full px-4 py-3 bg-brand-red hover:bg-brand-red-dark disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          No password required. We'll send you a secure login link.
        </p>
      </div>
    </div>
  );
}
