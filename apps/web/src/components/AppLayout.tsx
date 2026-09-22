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
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
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
      {/* Soft ambient light gradients for clean white theme depth */}
      <div style={{
        position: 'fixed',
        top: '-180px',
        right: '-180px',
        width: '650px',
        height: '650px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-160px',
        left: '260px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(15, 58, 86, 0.035) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Mobile Top Header */}
      <div
        className="mobile-header"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '58px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border-divider)',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 40,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/spidy-icon.png"
            alt="Spidy Logo"
            style={{ width: '28px', height: 'auto', display: 'block' }}
          />
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
            background: 'rgba(10, 25, 41, 0.5)',
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
