'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { ApiError } from '@/lib/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await login(email, password);
      setSuccess('Signed in successfully! Redirecting to workspace...');
      toast.success('Signed in successfully! Welcome back.');
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : 'Invalid email or password. Please verify your credentials and try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'stretch',
      background: '#f8fafc',
      fontFamily: 'inherit',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ─── LEFT: BRAND & ENTERPRISE SHOWCASE PANEL ─── */}
      <div
        className="login-showcase-panel"
        style={{
          flex: '1.15',
          background: 'linear-gradient(145deg, #071526 0%, #0A1E38 45%, #0F3A56 100%)',
          color: '#ffffff',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Ambient background glows */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          right: '20%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Top Header / Brand Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spidy-logo-light-text.png"
              alt="Syscorp Spidy Logo"
              style={{
                maxHeight: '34px',
                maxWidth: '180px',
                objectFit: 'contain',
                display: 'block',
              }}
            />

          </div>
        </div>

        {/* Central Showcase Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '460px', margin: 'auto 0' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            color: '#ffffff',
          }}>
            BugTracker
          </h2>

          <p style={{
            fontSize: '14.5px',
            lineHeight: 1.55,
            color: '#94a3b8',
            margin: '0 0 24px',
          }}>
            Streamlined defect lifecycles, test execution cycles, and collaborative triage for engineering teams.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.14)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={13} />
              </div>
              <span style={{ fontSize: '13.5px', color: '#e2e8f0', fontWeight: '500' }}>
                Real-time sprint and cycle routing
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.14)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={13} />
              </div>
              <span style={{ fontSize: '13.5px', color: '#e2e8f0', fontWeight: '500' }}>
                Auditable defect lifecycles & SLA guardrails
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(165, 180, 252, 0.14)',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={13} />
              </div>
              <span style={{ fontSize: '13.5px', color: '#e2e8f0', fontWeight: '500' }}>
                Dedicated developer and QA consoles
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Security / Trust Footer */}

      </div>

      {/* ─── RIGHT: AUTHENTICATION PANEL ─── */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        background: '#ffffff',
        position: 'relative',
        zIndex: 2,
        overflowY: 'auto',
      }}>
        {/* Top Header Mobile Brand (visible when screen stacks) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>

        </div>

        {/* Central Sign-In Card Container */}
        <div style={{
          maxWidth: '420px',
          width: '100%',
          margin: '32px auto',
        }}>
          {/* Header Title */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '800',
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}>
                BugTracker
              </span>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: 'var(--color-text)',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              Sign in to your account
            </h1>
            <p style={{
              fontSize: '13.5px',
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Enter your corporate email and password to access your workspaces.
            </p>
          </div>

          {/* Forgot Password Notice banner if clicked */}
          {showForgotNotice && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '12.5px',
              lineHeight: 1.45,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Password Reset</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px' }}>
                  Please contact your workspace administrator or IT department to request a password reset for your account.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Work Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: '42px',
                    paddingLeft: '38px',
                    paddingRight: '14px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1d68f2';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 104, 242, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1d68f2',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: '42px',
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1d68f2';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 104, 242, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  accentColor: '#1d68f2',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="remember-me"
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Keep me signed in on this device
              </label>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#b91c1c',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                height: '44px',
                borderRadius: '9px',
                border: 'none',
                background: 'linear-gradient(135deg, #1d68f2 0%, #1155d7 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(29, 104, 242, 0.4)',
                transition: 'all 0.15s ease',
                marginTop: '6px',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security reassurance banner */}

        </div>

        {/* Footer Legal & System Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <span>© {new Date().getFullYear()} Syscorp Technologies Inc.</span>

        </div>
      </div>
    </div>
  );
}
