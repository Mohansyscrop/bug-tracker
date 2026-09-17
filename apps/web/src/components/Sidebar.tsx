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
  CheckCircle2,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Workspace' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/testing-cycles', icon: RotateCcw, label: 'Testing Cycles' },
  { href: '/bugs', icon: Bug, label: 'Defects' },
];

const ADMIN_NAV = [
  { href: '/admin', icon: ShieldCheck, label: 'Administration' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

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
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 18px rgba(99, 102, 241, 0.50)',
            }}>
              <Bug size={19} strokeWidth={2.3} />
            </div>
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: '800',
                letterSpacing: '-0.03em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                BugTracker
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  color: '#67e8f9',
                  background: 'rgba(6, 182, 212, 0.16)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  letterSpacing: '0.06em',
                }}>
                  QA
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Test & Defect Platform
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav style={{
          flex: 1,
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: '10.5px',
            fontWeight: '600',
            color: 'var(--color-text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '4px 8px 6px',
          }}>
            Main Menu
          </div>

          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.globalRole === 'ADMIN' && (
            <>
              <div className="divider" style={{ margin: '12px 6px 8px' }} />
              <div style={{
                fontSize: '10.5px',
                fontWeight: '600',
                color: 'var(--color-text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 8px 6px',
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
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer with Notification & User */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(10, 15, 26, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {/* Notifications button */}
          <button
            id="notifications-btn"
            onClick={() => setNotifOpen((o) => !o)}
            className="sidebar-nav-item"
            style={{ width: '100%', position: 'relative' }}
          >
            <Bell size={17} strokeWidth={1.8} />
            <span>Activity & Alerts</span>
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '2px 7px',
                fontSize: '10.5px',
                fontWeight: '700',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
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
            padding: '9px 11px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.10)',
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
                border: '1.5px solid #1a1d2e',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#f8fafc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: '10.5px',
                color: '#a5b4fc',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {user?.globalRole}
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={() => logout()}
              className="btn btn-ghost btn-icon"
              title="Sign out"
              style={{ padding: '5px', color: 'var(--color-text-muted)' }}
            >
              <LogOut size={15} />
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
            left: '256px',
            bottom: '16px',
            width: '360px',
            maxHeight: '480px',
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 48px -8px rgba(99,102,241,0.20), 0 6px 16px rgba(0,0,0,0.08)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-border-divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8f9fe',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    padding: '1px 6px',
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
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      background: notif.isRead ? 'transparent' : 'var(--color-primary-dim)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: notif.isRead ? '500' : '600', color: 'var(--color-text)' }}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          flexShrink: 0,
                          marginTop: '5px',
                        }} />
                      )}
                    </div>
                    {notif.body && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '3px 0 0', lineHeight: 1.4 }}>
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
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--color-primary)',
                          marginTop: '6px',
                          textDecoration: 'none',
                          fontWeight: '600',
                        }}
                      >
                        View {notif.bugIssueKey || 'Defect'} <ExternalLink size={11} />
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
                        }}
                      >
  View { notif.bugIssueKey || 'Defect' } <ExternalLink size={11} />
                      </Link >
                    )}
                  </div >
                ))
              )}
            </div >
          </div >
        </>
      )}
    </>
  );
}
