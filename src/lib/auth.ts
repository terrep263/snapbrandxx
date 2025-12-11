/**
 * Authentication utilities for admin access
 * Simple password-based authentication for internal tool
 */

// Get password from env or use hardcoded fallback
function getAdminPassword(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use env var or fallback
    return (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'snapbrandxx19083020').trim();
  }
  // Server-side: use env var or fallback
  return (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'snapbrandxx19083020').trim();
}

const AUTH_STORAGE_KEY = 'snapbrandxx-auth';

export interface AuthState {
  isAuthenticated: boolean;
  timestamp: number;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return false;
    
    const auth: AuthState = JSON.parse(stored);
    
    // Check if session is still valid (24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (now - auth.timestamp > maxAge) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    
    return auth.isAuthenticated === true;
  } catch {
    return false;
  }
}

/**
 * Authenticate with password
 */
export function authenticate(password: string): boolean {
  if (!password) return false;
  
  const trimmedPassword = password.trim();
  const adminPassword = getAdminPassword();
  
  // Simple, direct comparison
  if (trimmedPassword === adminPassword) {
    const auth: AuthState = {
      isAuthenticated: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    return true;
  }
  
  return false;
}

/**
 * Logout
 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

