'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/api';
import { Bug, ArrowRight, ShieldCheck, Laptop, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '25%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(15, 58, 86, 0.35) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '430px', position: 'relative', zIndex: 1 }}>
        {/* Brand Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 22px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55), 0 0 24px rgba(17, 85, 215, 0.35)',
            border: '1px solid rgba(17, 85, 215, 0.4)',
            marginBottom: '16px',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spidy-logo-original.png"
              alt="Spidy Syscorp Logo"
              style={{
                maxHeight: '48px',
                maxWidth: '220px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '800',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            BugTracker <span style={{ color: '#3b82f6', WebkitTextFillColor: '#3b82f6' }}>Pro</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', marginTop: '5px' }}>
            Enterprise QA Test Management & Defect Control
          </p>
        </div>

        {/* Card */}
        <div className="card" suppressHydrationWarning style={{ padding: '30px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(17, 85, 215, 0.2)' }}>
          {/* Mode toggle */}
          <div suppressHydrationWarning style={{
            display: 'flex',
            background: 'rgba(10, 25, 41, 0.75)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '22px',
            border: '1px solid var(--color-border)',
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  border: 'none',
                  background: mode === m ? 'linear-gradient(135deg, #1d68f2, #1155d7)' : 'transparent',
                  color: mode === m ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: mode === m ? '700' : '500',
                  boxShadow: mode === m ? '0 2px 10px rgba(17, 85, 215, 0.45)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input
                  id="register-name"
                  className="input"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            )}

            <div>
              <label className="label">Work Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--color-danger-dim)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                color: 'var(--color-danger)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                justifyContent: 'center',
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: '600',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '15px', height: '15px' }} />
                  <span>{mode === 'login' ? 'Signing in...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill Demo Accounts */}
          {mode === 'login' && (
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--color-text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}>
                Instant Demo Access
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  id="demo-dev"
                  onClick={() => fillDemo('mohan@gmail.com', 'Mohan@12')}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '11px',
                    justifyContent: 'flex-start',
                    padding: '6px 9px',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    background: 'rgba(99, 102, 241, 0.08)',
                    fontWeight: '700',
                    color: '#6366f1',
                  }}
                >
                  <Laptop size={13} style={{ color: '#6366f1' }} />
                  <span>Developer (Mohan)</span>
                </button>
                <button
                  type="button"
                  id="demo-admin"
                  onClick={() => fillDemo('admin@gmail.com', 'Admin@12')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '6px 9px' }}
                >
                  <ShieldCheck size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Admin (System)</span>
                </button>
                <button
                  type="button"
                  id="demo-qa"
                  onClick={() => fillDemo('bala@gmail.com', 'Mohan@12')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '6px 9px' }}
                >
                  <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                  <span>QA Engineer</span>
                </button>
                <button
                  type="button"
                  id="demo-lead"
                  onClick={() => fillDemo('pm@gmail.com', 'Mohan@12')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '6px 9px' }}
                >
                  <Bug size={13} style={{ color: 'var(--color-warning)' }} />
                  <span>Project Lead</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
