'use client';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu, X, Bug } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        backgroundImage: 'radial-gradient(at 30% 40%, rgba(99,102,241,0.08) 0px, transparent 55%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', fontWeight: '600', letterSpacing: '0.01em' }}>
            Loading QA Mission Control...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', position: 'relative', overflowX: 'hidden' }}>
      {/* Soft ambient light gradients for white theme depth */}
      <div style={{
        position: 'fixed',
        top: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-150px',
        left: '300px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Mobile Top Header (only shows on smaller screens) */}
      <div
        className="mobile-header"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '58px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-divider)',
          boxShadow: '0 1px 8px rgba(99,102,241,0.08)',
          zIndex: 40,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          }}>
            <Bug size={15} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            BugTracker QA
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-ghost btn-icon"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30, 32, 71, 0.30)',
            zIndex: 45,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar with mobile toggle props */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Page Content */}
      <main className="main-content" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>

      <style jsx global>{`
        @media (max-width: 860px) {
          .mobile-header {
            display: flex !important;
          }
          .main-content {
            margin-top: 58px;
          }
        }
      `}</style>
    </div>
  );
}
