'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isDeveloper =
    Boolean(user?.projectMembers?.some((m) => m.projectRole?.includes('DEV') || m.projectRole === 'DEVELOPER')) &&
    user?.globalRole !== 'ADMIN';

  useEffect(() => {
    if (!loading && user && !isDeveloper) {
      router.replace('/dashboard');
    }
  }, [user, loading, isDeveloper, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  if (!isDeveloper) {
    return null;
  }

  return <>{children}</>;
}
