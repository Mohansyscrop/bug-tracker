'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  PlusCircle,
  Activity,
  Laptop,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Layers,
  Bug,
  ShieldAlert,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  User as UserIcon,
  Search,
} from 'lucide-react';

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

function getAreaBadgeStyle(area?: string) {
  switch (area) {
    case 'FRONTEND':
      return { bg: '#eef2ff', text: '#4338ca', border: 'rgba(99, 102, 241, 0.25)' };
    case 'BACKEND':
      return { bg: '#eff6ff', text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' };
    default:
      return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  }
}

function getSeverityDotColor(sev?: string) {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#3b82f6';
    default: return '#94a3b8';
  }
}

function getStatusDotColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'FIXED': return '#10b981';
    case 'IN_PROGRESS': return '#8b5cf6';
    case 'RETEST': return '#f97316';
    case 'REOPENED':
    case 'REJECTED': return '#ef4444';
    case 'ASSIGNED': return '#3b82f6';
    default: return '#64748b';
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Role View Mode: 'QA' | 'FRONTEND' | 'BACKEND'
  const [viewMode, setViewMode] = useState<'QA' | 'FRONTEND' | 'BACKEND'>('QA');

  // QA Overview Stats
  const [qaOverview, setQaOverview] = useState<any>(null);

  // Bugs
  const [myAssignedBugs, setMyAssignedBugs] = useState<any[]>([]);
  const [recentBugs, setRecentBugs] = useState<any[]>([]);
  const [retestBugs, setRetestBugs] = useState<any[]>([]);

  // Auto-detect initial view mode based on user's role
  useEffect(() => {
    if (!user) return;
    const isQA = user.globalRole === 'ADMIN' || user.email?.includes('qa') || user.name?.toLowerCase().includes('qa');
    const isBackend = user.email?.includes('backend') || user.name?.toLowerCase().includes('backend');
    if (isBackend) {
      setViewMode('BACKEND');
    } else if (isQA) {
      setViewMode('QA');
    } else {
      setViewMode('FRONTEND');
    }
  }, [user]);

  useEffect(() => {
    projectsApi.list()
      .then((res) => {
        const list = res.data ?? [];
        setProjects(list);
        if (list.length > 0) setSelectedProject(list[0].id);
      })
      .catch((err) => {
        console.warn('Failed to fetch projects:', err?.message || err);
      });
  }, []);

  // Fetch data when project changes
  useEffect(() => {
    setLoading(true);
    const projId = selectedProject || undefined;

    Promise.all([
      testingCyclesApi.getOverview(projId).catch(() => null),
      bugsApi.list({ assignedTo: user?.id, limit: 15, sortBy: 'createdAt', sortOrder: 'desc' }).catch(() => ({ data: [] })),
      bugsApi.list({ projectId: projId, limit: 6, sortBy: 'createdAt', sortOrder: 'desc' }).catch(() => ({ data: [] })),
      bugsApi.list({ projectId: projId, status: 'RETEST', limit: 5 }).catch(() => ({ data: [] })),
    ]).then(([qaRes, myBugsRes, recBugsRes, retestRes]) => {
      setQaOverview((qaRes as any)?.data || qaRes);
      setMyAssignedBugs(myBugsRes.data ?? []);
      setRecentBugs(recBugsRes.data ?? []);
      setRetestBugs(retestRes.data ?? []);
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedProject, user?.id]);

  // Frontend vs Backend defect separation
  const myFrontendBugs = useMemo(() => {
    return myAssignedBugs.filter((b) => b.bugArea === 'FRONTEND');
  }, [myAssignedBugs]);

  const myBackendBugs = useMemo(() => {
    return myAssignedBugs.filter((b) => b.bugArea === 'BACKEND');
  }, [myAssignedBugs]);

  const qaStats = qaOverview?.testStats || { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, passRate: 0 };
  const bugsByArea = qaOverview?.bugsByArea || {};
  const activeCycle = qaOverview?.activeCycle;
  const qualityAlerts = qaOverview?.qualityAlerts || { pendingRetest: 0, reopened: 0, fixed: 0, regressionCount: 0 };

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Workspace Page Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                QA & Engineering Hub
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '750',
                background: '#d1fae5',
                color: '#047857',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                ACTIVE
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '3px', fontWeight: '500' }}>
              Real-time test execution metrics, scenario triage, and engineering defect workbench.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/testing-cycles" className="btn btn-secondary">
              <RotateCcw size={15} />
              <span>Testing Cycles</span>
            </Link>
            <Link href="/bugs/new" className="btn btn-primary" id="create-bug-btn">
              <PlusCircle size={16} />
              <span>Report Defect</span>
            </Link>
          </div>
        </div>

        {/* Project Context & Role View Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '24px',
        }}>
          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '650' }}>
              Project:
            </span>
            <select
              id="dashboard-project-select"
              className="select"
              style={{ minWidth: '240px', fontSize: '13px', padding: '7px 32px 7px 12px' }}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>

          {/* Role-tailored Workbench Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => setViewMode('QA')}
              className={`btn btn-sm ${viewMode === 'QA' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12.5px',
                fontWeight: viewMode === 'QA' ? '700' : '600',
                padding: '6px 14px',
              }}
            >
              <Activity size={14} />
              <span>QA Testing Hub</span>
            </button>
            <button
              onClick={() => setViewMode('FRONTEND')}
              className={`btn btn-sm ${viewMode === 'FRONTEND' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12.5px',
                fontWeight: viewMode === 'FRONTEND' ? '700' : '600',
                padding: '6px 14px',
              }}
            >
              <Laptop size={14} />
              <span>Frontend Dev</span>
              <span style={{
                background: viewMode === 'FRONTEND' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: viewMode === 'FRONTEND' ? '#ffffff' : '#475569',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: '750',
              }}>
                {myFrontendBugs.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode('BACKEND')}
              className={`btn btn-sm ${viewMode === 'BACKEND' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12.5px',
                fontWeight: viewMode === 'BACKEND' ? '700' : '600',
                padding: '6px 14px',
              }}
            >
              <Server size={14} />
              <span>Backend & API</span>
              <span style={{
                background: viewMode === 'BACKEND' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: viewMode === 'BACKEND' ? '#ffffff' : '#475569',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: '750',
              }}>
                {myBackendBugs.length}
              </span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VIEW 1: QA TESTING & QUALITY VIEW                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {viewMode === 'QA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* QA Test Execution Breakdown Metrics Strip */}
            <div className="stats-grid">
              <div className="stat-card" style={{ '--stat-accent': '#4f46e5' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                    <Layers size={20} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#4f46e5',
                    background: '#eef2ff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Scope
                  </span>
                </div>
                <div>
                  <div className="stat-value">{qaStats.total}</div>
                  <div className="stat-label">Total Test Scenarios</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '750',
                    color: '#059669',
                    background: '#d1fae5',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    {qaStats.passRate}% Rate
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#059669' }}>{qaStats.passed}</div>
                  <div className="stat-label">Passed Tests</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#ef4444' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <XCircle size={20} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#dc2626',
                    background: '#fee2e2',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Action Needed
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#dc2626' }}>{qaStats.failed}</div>
                  <div className="stat-label">Failed Scenarios</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#f59e0b' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#d97706',
                    background: '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Impediments
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#d97706' }}>{qaStats.blocked}</div>
                  <div className="stat-label">Blocked Scenarios</div>
                </div>
              </div>
            </div>

            {/* Defects by Technical Area & Retest Queue */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Technical Bug Area Breakdown */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '750', margin: 0, color: '#0f172a' }}>
                      Defects by Technical Domain
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Distribution of active issues across codebase</p>
                  </div>
                  <Link href="/bugs" style={{ fontSize: '12.5px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '700' }}>
                    View All →
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { area: 'FRONTEND', label: 'Frontend', count: bugsByArea.FRONTEND || 0, color: '#4f46e5', bg: '#eef2ff' },
                    { area: 'BACKEND', label: 'Backend', count: bugsByArea.BACKEND || 0, color: '#0284c7', bg: '#e0f2fe' },
                  ].map((item) => (
                    <div
                      key={item.area}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 12px',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-xs)',
                        transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                      }}
                    >
                      <div style={{ fontSize: '22px', fontWeight: '800', color: item.color, lineHeight: 1.1 }}>{item.count}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '650' }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA Retest & Quality Queue */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '750', margin: 0, color: '#0f172a' }}>
                      Pending QA Retest Queue
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Defects resolved by developers awaiting verification.
                    </p>
                  </div>
                  <span style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: '750',
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '999px',
                  }}>
                    {qualityAlerts.pendingRetest} Ready
                  </span>
                </div>

                {retestBugs.length === 0 ? (
                  <div style={{ padding: '42px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    <CheckCircle2 size={28} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                    No defects currently waiting for QA retest.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {retestBugs.map((bug) => (
                      <div
                        key={bug.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="ticket-badge">
                              #{bug.issueKey}
                            </span>
                            <span className="area-pill">
                              {bug.bugArea}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bug.title}
                          </div>
                        </div>
                        <Link
                          href={`/bugs/${bug.id}`}
                          className="btn btn-sm"
                          style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            padding: '5px 12px',
                            flexShrink: 0,
                          }}
                        >
                          Verify & Retest →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VIEW 2: FRONTEND DEVELOPER VIEW                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        {viewMode === 'FRONTEND' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Laptop size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                    Frontend Developer Workbench
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    Assigned client-side defects, UI/UX issues, and component flow breakages.
                  </p>
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card" style={{ '--stat-accent': '#4f46e5' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                    <Bug size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '999px' }}>
                    Active Queue
                  </span>
                </div>
                <div>
                  <div className="stat-value">{myFrontendBugs.length}</div>
                  <div className="stat-label">Assigned Frontend Bugs</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#0284c7' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <Activity size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '999px' }}>
                    In Flight
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#0284c7' }}>
                    {myFrontendBugs.filter((b) => b.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="stat-label">In Progress</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#ef4444' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <ShieldAlert size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px' }}>
                    Urgent
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#dc2626' }}>
                    {myFrontendBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length}
                  </div>
                  <div className="stat-label">Critical / P1</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px' }}>
                    Ready
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#059669' }}>
                    {myFrontendBugs.filter((b) => b.status === 'FIXED').length}
                  </div>
                  <div className="stat-label">Awaiting QA Retest</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '750', marginBottom: '14px', color: '#0f172a' }}>
                My Assigned Frontend Tickets
              </h3>
              {myFrontendBugs.length === 0 ? (
                <div style={{ padding: '42px 0', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                  No frontend bugs currently assigned to you!
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Defect Key</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Cycle</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myFrontendBugs.map((bug) => (
                        <tr key={bug.id}>
                          <td>
                            <Link href={`/bugs/${bug.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                              #{bug.issueKey}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '320px' }}>
                            <Link href={`/bugs/${bug.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: '600' }}>
                              {bug.title}
                            </Link>
                          </td>
                          <td><span className={`badge badge-${bug.severity.toLowerCase()}`}>{bug.severity}</span></td>
                          <td><span className={`badge badge-${bug.priority.toLowerCase()}`}>{bug.priority}</span></td>
                          <td>
                            <span className="status-pill" style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                            }}>
                              <span className="status-dot" style={{ background: getStatusDotColor(bug.status) }} />
                              {bug.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>
                            {bug.testingCycle?.name || '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/bugs/${bug.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                              Work on Fix →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VIEW 3: BACKEND DEVELOPER VIEW                          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {viewMode === 'BACKEND' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Server size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                    Backend & API Developer Workbench
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    Server-side exceptions, REST API response defects, database query issues, and service integrations.
                  </p>
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card" style={{ '--stat-accent': '#0284c7' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <Server size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '999px' }}>
                    Assigned
                  </span>
                </div>
                <div>
                  <div className="stat-value">{myBackendBugs.length}</div>
                  <div className="stat-label">Assigned Backend Bugs</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#4f46e5' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                    <Activity size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '999px' }}>
                    Active
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#4f46e5' }}>
                    {myBackendBugs.filter((b) => b.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="stat-label">In Progress</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#ef4444' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <ShieldAlert size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px' }}>
                    Server Error
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#dc2626' }}>
                    {myBackendBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length}
                  </div>
                  <div className="stat-label">Critical / 500 Errors</div>
                </div>
              </div>

              <div className="stat-card" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px' }}>
                    Ready
                  </span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: '#059669' }}>
                    {myBackendBugs.filter((b) => b.status === 'FIXED').length}
                  </div>
                  <div className="stat-label">Awaiting QA Retest</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '750', marginBottom: '14px', color: '#0f172a' }}>
                My Assigned Backend Tickets
              </h3>
              {myBackendBugs.length === 0 ? (
                <div style={{ padding: '42px 0', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                  No backend or API bugs currently assigned to you!
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Defect Key</th>
                        <th>Title</th>
                        <th>Area</th>
                        <th>Severity</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myBackendBugs.map((bug) => (
                        <tr key={bug.id}>
                          <td>
                            <Link href={`/bugs/${bug.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                              #{bug.issueKey}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '320px' }}>
                            <Link href={`/bugs/${bug.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: '600' }}>
                              {bug.title}
                            </Link>
                          </td>
                          <td>
                            <span className="area-pill">
                              {bug.bugArea}
                            </span>
                          </td>
                          <td><span className={`badge badge-${bug.severity.toLowerCase()}`}>{bug.severity}</span></td>
                          <td><span className={`badge badge-${bug.priority.toLowerCase()}`}>{bug.priority}</span></td>
                          <td>
                            <span className="status-pill" style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                            }}>
                              <span className="status-dot" style={{ background: getStatusDotColor(bug.status) }} />
                              {bug.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/bugs/${bug.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                              Investigate Fix →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ADVANCED RECENT DEFECT ACTIVITY TABLE                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="table-wrapper" style={{ marginTop: '24px' }}>
          {/* Table Header Toolbar */}
          <div className="table-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bug size={17} />
              </div>
              <div>
                <div className="table-toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Recent Defect Activity
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #e2e8f0',
                  }}>
                    {recentBugs.length} Issues
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Latest defects across projects with real-time status</div>
              </div>
            </div>
            <Link href="/bugs" className="btn btn-secondary btn-sm" style={{ fontSize: '12px', fontWeight: '650' }}>
              View All Defects
              <ArrowRight size={13} />
            </Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Defect ID</th>
                <th>Defect Summary</th>
                <th style={{ width: '120px' }}>Domain</th>
                <th style={{ width: '110px' }}>Severity</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '170px' }}>Assignee</th>
                <th style={{ width: '150px' }}>Reporter</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentBugs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    No defect activity recorded yet.
                  </td>
                </tr>
              ) : (
                recentBugs.map((b) => {
                  const areaStyle = getAreaBadgeStyle(b.bugArea);
                  const sevDot = getSeverityDotColor(b.severity);
                  const statusDot = getStatusDotColor(b.status);

                  return (
                    <tr key={b.id}>
                      {/* Defect Monospace Pill */}
                      <td>
                        <Link href={`/bugs/${b.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                          #{b.issueKey}
                        </Link>
                      </td>

                      {/* Title + Activity Timestamp */}
                      <td style={{ maxWidth: '320px' }}>
                        <div>
                          <Link
                            href={`/bugs/${b.id}`}
                            style={{
                              color: '#0f172a',
                              textDecoration: 'none',
                              fontWeight: '650',
                              fontSize: '13px',
                              lineHeight: '1.3',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {b.title}
                          </Link>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />
                            <span>Reported {timeAgo(b.createdAt)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Domain Area */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10.5px',
                            fontWeight: '750',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: areaStyle.bg,
                            color: areaStyle.text,
                            border: `1px solid ${areaStyle.border}`,
                          }}
                        >
                          {b.bugArea || 'FRONTEND'}
                        </span>
                      </td>

                      {/* Severity with Dot */}
                      <td>
                        <span className={`badge badge-${(b.severity || 'LOW').toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sevDot }} />
                          {b.severity}
                        </span>
                      </td>

                      {/* Status with Pill */}
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <span className="status-dot" style={{ background: statusDot }} />
                          {(b.status || 'NEW').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Assignee Avatar + Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#e0f2fe',
                              color: '#0284c7',
                              fontSize: '10px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: '1px solid #bae6fd',
                            }}
                          >
                            {b.assignedTo?.name ? b.assignedTo.name[0].toUpperCase() : '?'}
                          </div>
                          <span style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: '550', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.assignedTo?.name ?? 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Reporter */}
                      <td>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                          {b.reportedBy?.name ?? 'System'}
                        </div>
                      </td>

                      {/* Quick Action Button */}
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/bugs/${b.id}`}
                          className="btn btn-ghost btn-sm"
                          title="View Details"
                          style={{ padding: '4px 8px', color: '#4f46e5' }}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Table Footer */}
          <div className="table-footer">
            <span>Showing top {recentBugs.length} latest defects</span>
            <Link href="/bugs" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '650', fontSize: '12px' }}>
              Explore All Defects in Grid →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
