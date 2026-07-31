'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';

const LOGIN_PATH = '/login';

function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (pathname === LOGIN_PATH) {
      if (user && isAdmin) router.replace('/');
      return;
    }
    if (!user || !isAdmin) {
      router.replace(LOGIN_PATH);
    }
  }, [user, isAdmin, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            로딩 중...
          </p>
        </div>
      </div>
    );
  }

  if (pathname !== LOGIN_PATH && (!user || !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuardInner>{children}</AuthGuardInner>
    </AuthProvider>
  );
}
