'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticate, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Small delay to prevent brute force
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trimmedPassword = password.trim();
    if (authenticate(trimmedPassword)) {
      router.push('/');
      router.refresh();
    } else {
      setError('Invalid password. Access denied. Please check your password and try again.');
      setPassword('');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">SnapBrandXX Ops</h1>
          <p className="text-sm text-gray-400">Admin Access Required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-primary"
              placeholder="Enter admin password"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full px-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Access Tool'}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 text-center">
          Internal tool - Authorized personnel only
        </p>
      </div>
    </div>
  );
}

