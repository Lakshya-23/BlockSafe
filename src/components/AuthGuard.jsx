'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/components/providers/Web3Provider';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const { account } = useWeb3();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      console.log('[AuthGuard] Starting auth check...');
      
      // Check if user has a valid token
      const token = localStorage.getItem('token');
      console.log('[AuthGuard] Token from localStorage:', token ? 'EXISTS' : 'NULL');
      
      if (!token) {
        console.log('[AuthGuard] No token found, redirecting to login...');
        setIsChecking(false);
        router.push('/');
        return;
      }

      // Verify token format and expiration
      try {
        const parts = token.split('.');
        console.log('[AuthGuard] Token parts count:', parts.length);
        
        if (parts.length !== 3) {
          console.log('[AuthGuard] Invalid token format - expected 3 parts, got', parts.length);
          localStorage.removeItem('token');
          setIsChecking(false);
          router.push('/');
          return;
        }
        
        const payload = JSON.parse(atob(parts[1]));
        console.log('[AuthGuard] Token payload:', payload);
        
        const now = Date.now();
        const expiration = payload.exp * 1000;
        const isExpired = expiration < now;
        
        console.log('[AuthGuard] Current time:', new Date(now));
        console.log('[AuthGuard] Token expires:', new Date(expiration));
        console.log('[AuthGuard] Is expired:', isExpired);
        
        if (isExpired) {
          console.log('[AuthGuard] Token expired, clearing and redirecting...');
          localStorage.removeItem('token');
          setIsChecking(false);
          router.push('/');
          return;
        }
        
        console.log('[AuthGuard] ✅ Token valid! Setting authorized to true');
        setIsAuthorized(true);
        setIsChecking(false);
      } catch (error) {
        console.error('[AuthGuard] ❌ Token validation error:', error);
        console.error('[AuthGuard] Error stack:', error.stack);
        localStorage.removeItem('token');
        setIsChecking(false);
        router.push('/');
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading state while checking auth
  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
