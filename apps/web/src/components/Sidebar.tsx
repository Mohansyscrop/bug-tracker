'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  RotateCcw,
  Bug,
  ShieldCheck,
  Bell,
  LogOut,
  ExternalLink,
  Laptop,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Workspace' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/testing-cycles', icon: RotateCcw, label: 'Testing Cycles' },
  { href: '/bugs', icon: Bug, label: 'Defects' },
];

const DEV_NAV = [
  { href: '/developer', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/developer/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/developer/cycles', icon: RotateCcw, label: 'Testing Cycles' },
  { href: '/developer/bugs', icon: Bug, label: 'Assigned Defects' },
];

const ADMIN_NAV = [
  { href: '/admin', icon: ShieldCheck, label: 'Administration' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  // Check if current user is a developer
  const isDeveloper =
    Boolean(user?.projectMembers?.some((m) => m.projectRole?.includes('DEV') || m.projectRole === 'DEVELOPER')) &&
    user?.globalRole !== 'ADMIN';

  function initials(name: string) {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '18px 16px 16px',
          borderBottom: '1px solid var(--sidebar-border)',
          background: 'rgba(10, 20, 35, 0.75)',
        }}>
          <Link
            href={isDeveloper ? '/developer' : '/dashboard'}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Spidy Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginBottom: '6px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/spidy-logo-light-text.png"
                alt="Spidy Syscorp Logo"
                style={{
                  maxHeight: '26px',
                  maxWidth: '155px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            {/* BugTracker Title Below */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontSize: '15px',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: '#f8fafc',
              }}>
                BugTracker
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav style={{
          flex: 1,
          padding: '18px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: '10.5px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            padding: '4px 10px 8px',
          }}>
            {isDeveloper ? 'Developer Navigation' : 'Platform'}
          </div>

          {/* If Developer: Render DEV_NAV. Otherwise standard QA nav */}
          {isDeveloper ? (
            DEV_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = (item as any).exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    fontWeight: isActive ? '700' : '600',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} />
                  <span>{item.label}</span>
                </Link>
              );
            })
          ) : (
            NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} />
                  <span>{item.label}</span>
                </Link>
              );
            })
          )}

          {user?.globalRole === 'ADMIN' && (
            <>
              <div className="divider" style={{ margin: '14px 8px 10px' }} />
              <div style={{
                fontSize: '10.5px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '4px 10px 8px',
              }}>
                Enterprise
              </div>
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer with Notification & User */}
        <div style={{
          padding: '14px 12px 20px',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(10, 20, 35, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: '9px',
        }}>
          {/* Notifications button */}
          <button
            id="notifications-btn"
            onClick={() => setNotifOpen((o) => !o)}
            className="sidebar-nav-item"
            style={{
              width: '100%',
              position: 'relative',
              background: notifOpen ? 'rgba(14, 165, 233, 0.18)' : 'rgba(13, 25, 43, 0.7)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-xs)',
              color: '#f8fafc',
            }}
          >
            <Bell size={17} strokeWidth={1.9} style={{ color: '#38bdf8' }} />
            <span style={{ fontWeight: '600', color: '#f8fafc' }}>Activity & Alerts</span>
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #0284c7, #0F3A56)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '10.5px',
                fontWeight: '700',
                boxShadow: '0 2px 6px rgba(14, 165, 233, 0.35)',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User profile card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'rgba(13, 25, 43, 0.7)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ position: 'relative' }}>
              <div className="avatar">{user ? initials(user.name) : '?'}</div>
              <span style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
                border: '1.5px solid #0D1117',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13.5px',
                fontWeight: '700',
                color: '#f8fafc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {user?.name}
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={() => logout()}
              className="btn btn-ghost btn-icon"
              title="Sign out"
              style={{ padding: '6px', color: '#94a3b8' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Notification Flyout Panel */}
      {notifOpen && (
        <>
          <div
            onClick={() => setNotifOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 190 }}
          />
          <div style={{
            position: 'fixed',
            left: '268px',
            bottom: '20px',
            width: '380px',
            maxHeight: '500px',
            background: 'linear-gradient(135deg, #0D1117 0%, #0A1929 70%, #0F3A56 100%)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(14, 165, 233, 0.15)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--color-border-divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(10, 25, 41, 0.85)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={17} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: '750', color: '#f8fafc' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11.5px', padding: '3px 8px' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No recent notifications
                </div>
              ) : (
                notifications.slice(0, 15).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markRead(notif.id);
                    }}
                    style={{
                      padding: '13px 16px',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      background: notif.isRead ? 'transparent' : 'rgba(14, 165, 233, 0.08)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: notif.isRead ? '550' : '700', color: '#f8fafc' }}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          flexShrink: 0,
                          marginTop: '5px',
                          boxShadow: '0 0 6px rgba(14, 165, 233, 0.8)',
                        }} />
                      )}
                    </div>
                    {notif.body && (
                      <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.45 }}>
                        {notif.body}
                      </p>
                    )}
                    {notif.bugId && (
                      <Link
                        href={`/bugs/${notif.bugId}`}
                        onClick={() => setNotifOpen(false)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11.5px',
                          color: 'var(--color-primary)',
                          marginTop: '8px',
                          textDecoration: 'none',
                          fontWeight: '700',
                        }}
                      >
                        View {notif.bugIssueKey || 'Defect'} <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
