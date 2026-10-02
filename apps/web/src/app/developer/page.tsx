'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Laptop,
  Bug,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  FolderKanban,
  ShieldAlert,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description?: string;
  myRole?: string;
}

interface TestingCycleItem {
  id: string;
  projectId: string;
  name: string;
  cycleNumber: number;
  type: string;
  status: string;
  environment: string;
}

interface BugItem {
  id: string;
  issueKey: string;
  projectId: string;
  title: string;
  severity: string;
  priority: string;
  status: string;
  bugArea?: string;
  testingCycleId?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; key: string; name: string };
  testingCycle?: { id: string; name: string; cycleNumber: number; status: string };
}

function timeAgo(dateString?: string): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusDotColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'FIXED': return '#10b981';
    case 'IN_PROGRESS': return '#8b5cf6';
    case 'RETEST': return '#f97316';
    case 'REOPENED':
    case 'REJECTED': return '#ef4444';
    case 'ASSIGNED': return '#0284c7';
    case 'CLOSED': return '#64748b';
    default: return '#64748b';
  }
}

export default function DeveloperDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    bugsApi.list({ assignedTo: user.id, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((bugsRes) => {
        const bugs: BugItem[] = (bugsRes as any)?.data || (Array.isArray(bugsRes) ? bugsRes : []);
        setAssignedBugs(bugs);
      })
      .catch((err) => {
        console.error('Failed to load developer dashboard data', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  // Metrics
  const metrics = useMemo(() => {
    const total = assignedBugs.length;
    const inProgress = assignedBugs.filter((b) => b.status === 'IN_PROGRESS').length;
    const assigned = assignedBugs.filter((b) => b.status === 'ASSIGNED' || b.status === 'NEW' || b.status === 'REOPENED').length;
    const fixed = assignedBugs.filter((b) => b.status === 'FIXED' || b.status === 'CLOSED').length;
    const critical = assignedBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
    return { total, inProgress, assigned, fixed, critical };
  }, [assignedBugs]);

  // Show only top 5 recent bugs
  const recentAssignedBugs = useMemo(() => {
    return assignedBugs.slice(0, 5);
  }, [assignedBugs]);

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Top Developer Hero Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent gradient bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            background: 'linear-gradient(90deg, #1155d7 0%, #0284c7 50%, #38bdf8 100%)',
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(17, 85, 215, 0.08)',
                color: '#1155d7',
                border: '1px solid rgba(17, 85, 215, 0.25)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '750',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                <Laptop size={13} />
                Developer Console
              </span>
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              letterSpacing: '-0.025em',
              margin: 0,
              color: 'var(--color-text)',
            }}>
              Welcome, {user?.name || 'Developer'}
            </h1>
            <p style={{
              fontSize: '13.5px',
              color: 'var(--color-text-secondary)',
              margin: '6px 0 0',
              maxWidth: '650px',
            }}>
              Monitor your bug queue, track resolution progress, and manage fix workflows.
            </p>
          </div>

          {/* Metrics Ribbon — 5 Key KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
            marginTop: '22px',
            paddingTop: '20px',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #0f172a',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
            }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Bugs
              </div>
              <div style={{ fontSize: '26px', fontWeight: '850', marginTop: '4px', color: '#0f172a', lineHeight: 1.1 }}>
                {metrics.total}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid #d8b4fe',
              borderLeft: '4px solid #7c3aed',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.08)',
            }}>
              <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Progress
              </div>
              <div style={{ fontSize: '26px', fontWeight: '850', marginTop: '4px', color: '#6d28d9', lineHeight: 1.1 }}>
                {metrics.inProgress}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid #7dd3fc',
              borderLeft: '4px solid #0284c7',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
            }}>
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Action
              </div>
              <div style={{ fontSize: '26px', fontWeight: '850', marginTop: '4px', color: '#0284c7', lineHeight: 1.1 }}>
                {metrics.assigned}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid #86efac',
              borderLeft: '4px solid #10b981',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
            }}>
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Resolved / Fixed
              </div>
              <div style={{ fontSize: '26px', fontWeight: '850', marginTop: '4px', color: '#047857', lineHeight: 1.1 }}>
                {metrics.fixed}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid #fca5a5',
              borderLeft: '4px solid #ef4444',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
            }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Critical / Blockers
              </div>
              <div style={{ fontSize: '26px', fontWeight: '850', marginTop: '4px', color: '#dc2626', lineHeight: 1.1 }}>
                {metrics.critical}
              </div>
            </div>
          </div>
        </div>

        {/* Bugs Queue Section (Showing Top 5 Recent) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bug size={17} style={{ color: '#ef4444' }} />
              <span>Bugs Queue</span>
            </h2>
            <Link
              href="/developer/bugs"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', fontWeight: '650' }}
            >
              <span>View All ({assignedBugs.length})</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', width: '55px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '12px 16px' }}>Bug Key</th>
                    <th style={{ padding: '12px 16px' }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Testing Cycle</th>
                    <th style={{ padding: '12px 16px' }}>Priority</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssignedBugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-text)' }}>No bugs currently found</div>
                        <div style={{ fontSize: '12.5px', marginTop: '2px' }}>Your bug queue is currently empty.</div>
                      </td>
                    </tr>
                  ) : (
                    recentAssignedBugs.map((bug, index) => {
                      const statusDot = getStatusDotColor(bug.status);

                      return (
                        <tr key={bug.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Link href={`/bugs/${bug.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                              #{bug.issueKey}
                            </Link>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text)', maxWidth: '340px' }}>
                            <Link
                              href={`/bugs/${bug.id}`}
                              style={{
                                color: 'var(--color-text)',
                                textDecoration: 'none',
                                fontWeight: '600',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {bug.title}
                            </Link>
                            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} />
                              <span>Reported {timeAgo(bug.createdAt)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                            {bug.testingCycle ? bug.testingCycle.name : (bug.project?.name || 'Unassigned')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`badge badge-${(bug.priority || 'P3').toLowerCase()}`}>
                              {bug.priority}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className="status-pill"
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <span className="status-dot" style={{ background: statusDot }} />
                              {(bug.status || 'ASSIGNED').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 10px' }}
                            >
                              Work on Fix →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="table-footer" style={{ padding: '12px 16px', background: '#fafbfc', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing recent {recentAssignedBugs.length} of {assignedBugs.length} bugs
              </span>
              <Link href="/developer/bugs" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '650', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Explore All Bugs</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
