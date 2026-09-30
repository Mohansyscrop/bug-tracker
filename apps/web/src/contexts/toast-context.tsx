'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = React.useMemo(() => ({
    success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
    error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
    info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
    warning: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
  }), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      {/* Toast Container */}
      <aside
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100% - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => removeToast(t.id)} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const config = {
    success: {
      bg: '#ffffff',
      border: '#10b981',
      iconColor: '#059669',
      textColor: '#0f172a',
      accentBg: 'rgba(16, 185, 129, 0.1)',
      icon: CheckCircle2,
      shadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25), 0 8px 10px -6px rgba(16, 185, 129, 0.1)',
      label: 'Success',
    },
    error: {
      bg: '#ffffff',
      border: '#ef4444',
      iconColor: '#dc2626',
      textColor: '#0f172a',
      accentBg: 'rgba(239, 68, 68, 0.1)',
      icon: AlertCircle,
      shadow: '0 10px 25px -5px rgba(239, 68, 68, 0.25), 0 8px 10px -6px rgba(239, 68, 68, 0.1)',
      label: 'Error',
    },
    warning: {
      bg: '#ffffff',
      border: '#f59e0b',
      iconColor: '#d97706',
      textColor: '#0f172a',
      accentBg: 'rgba(245, 158, 11, 0.1)',
      icon: AlertTriangle,
      shadow: '0 10px 25px -5px rgba(245, 158, 11, 0.25), 0 8px 10px -6px rgba(245, 158, 11, 0.1)',
      label: 'Warning',
    },
    info: {
      bg: '#ffffff',
      border: '#3b82f6',
      iconColor: '#2563eb',
      textColor: '#0f172a',
      accentBg: 'rgba(59, 130, 246, 0.1)',
      icon: Info,
      shadow: '0 10px 25px -5px rgba(59, 130, 246, 0.25), 0 8px 10px -6px rgba(59, 130, 246, 0.1)',
      label: 'Information',
    },
  }[item.type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      style={{
        pointerEvents: 'auto',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderLeft: `4px solid ${config.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: config.shadow,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        color: config.textColor,
        fontSize: '13.5px',
        lineHeight: 1.45,
        fontWeight: '500',
        transform: isEntering ? 'translateX(100%)' : 'translateX(0)',
        opacity: isEntering ? 0 : 1,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: config.accentBg,
          color: config.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        <Icon size={16} />
      </div>

      <div style={{ flex: 1, wordBreak: 'break-word', paddingTop: '1px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: config.iconColor, marginBottom: '2px' }}>
          {config.label}
        </div>
        <div>{item.message}</div>
      </div>

      <button
        onClick={onClose}
        title="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s ease',
          marginLeft: '4px',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#334155';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94a3b8';
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
