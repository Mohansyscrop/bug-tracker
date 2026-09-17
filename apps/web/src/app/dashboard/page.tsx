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
} from 'lucide-react';

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
    return myAssignedBugs.filter((b) => ['FRONTEND', 'UI_UX'].includes(b.bugArea));
  }, [myAssignedBugs]);

  const myBackendBugs = useMemo(() => {
    return myAssignedBugs.filter((b) => ['BACKEND', 'API', 'DATABASE', 'INTEGRATION'].includes(b.bugArea));
  }, [myAssignedBugs]);

  const qaStats = qaOverview?.testStats || { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, passRate: 0 };
  const bugsByArea = qaOverview?.bugsByArea || {};
  const activeCycle = qaOverview?.activeCycle;
  const qualityAlerts = qaOverview?.qualityAlerts || { pendingRetest: 0, reopened: 0, fixed: 0, regressionCount: 0 };

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Workspace Page Header */}
        <div className="page-header" style={{ marginBottom: '22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                QA & Engineering Hub
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                LIVE
              </span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Cycle-based test execution, scenario coverage, and unified defect triage across technical domains.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/testing-cycles" className="btn btn-secondary">
              <RotateCcw size={14} />
              <span>Testing Cycles</span>
            </Link>
            <Link href="/bugs/new" className="btn btn-primary" id="create-bug-btn">
              <PlusCircle size={15} />
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
          gap: '12px',
          background: 'var(--color-surface)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '20px',
        }}>
          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
              Project:
            </span>
            <select
              id="dashboard-project-select"
              className="select"
              style={{ minWidth: '220px', fontSize: '13px', padding: '6px 30px 6px 10px' }}
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
            background: 'var(--color-surface-2)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => setViewMode('QA')}
              className={`btn btn-sm ${viewMode === 'QA' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12px',
                border: viewMode === 'QA' ? 'none' : 'transparent',
                fontWeight: viewMode === 'QA' ? '600' : '500',
              }}
            >
              <Activity size={13} />
              <span>QA Testing Hub</span>
            </button>
            <button
              onClick={() => setViewMode('FRONTEND')}
              className={`btn btn-sm ${viewMode === 'FRONTEND' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12px',
                border: viewMode === 'FRONTEND' ? 'none' : 'transparent',
                fontWeight: viewMode === 'FRONTEND' ? '600' : '500',
              }}
            >
              <Laptop size={13} />
              <span>Frontend Dev</span>
              <span style={{
                background: viewMode === 'FRONTEND' ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-3)',
                padding: '0 5px',
                borderRadius: '999px',
                fontSize: '10.5px',
              }}>
                {myFrontendBugs.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode('BACKEND')}
              className={`btn btn-sm ${viewMode === 'BACKEND' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '12px',
                border: viewMode === 'BACKEND' ? 'none' : 'transparent',
                fontWeight: viewMode === 'BACKEND' ? '600' : '500',
              }}
            >
              <Server size={13} />
              <span>Backend & API</span>
              <span style={{
                background: viewMode === 'BACKEND' ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-3)',
                padding: '0 5px',
                borderRadius: '999px',
                fontSize: '10.5px',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>


            {/* QA Test Execution Breakdown Metrics Strip */}
            <div className="stats-grid">
              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-value">{qaStats.total}</div>
                  <Layers size={18} style={{ color: 'var(--color-text-faint)' }} />
                </div>
                <div className="stat-label">Total Test Scenarios</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--color-success)' }}>{qaStats.passed}</div>
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="stat-label">Passed ({qaStats.passRate}%)</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{qaStats.failed}</div>
                  <XCircle size={18} style={{ color: 'var(--color-danger)' }} />
                </div>
                <div className="stat-label">Failed Scenarios</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{qaStats.blocked}</div>
                  <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div className="stat-label">Blocked Scenarios</div>
              </div>
            </div>

            {/* Defects by Technical Area & Retest Queue */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Technical Bug Area Breakdown */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                    Defects by Technical Area
                  </h3>
                  <Link href="/bugs" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>
                    View All →
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { area: 'FRONTEND', label: 'Frontend UI', count: bugsByArea.FRONTEND || 0, color: 'var(--color-primary)' },
                    { area: 'BACKEND', label: 'Backend Logic', count: bugsByArea.BACKEND || 0, color: '#2563eb' },
                    { area: 'DATABASE', label: 'Database', count: bugsByArea.DATABASE || 0, color: '#7c3aed' },
                    { area: 'API', label: 'REST API', count: bugsByArea.API || 0, color: '#0d9488' },
                    { area: 'INTEGRATION', label: 'Integration', count: bugsByArea.INTEGRATION || 0, color: '#ea580c' },
                    { area: 'REGRESSION', label: 'Regression', count: bugsByArea.REGRESSION || 0, color: 'var(--color-danger)' },
                  ].map((item) => (
                    <div
                      key={item.area}
                      style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{item.count}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: '500' }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA Retest & Quality Queue */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                      Pending QA Retest Queue
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Bugs fixed by developers requiring verification.
                    </p>
                  </div>
                  <span className="badge" style={{ background: 'var(--color-warning-dim)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-border)', fontWeight: '700' }}>
                    {qualityAlerts.pendingRetest} Ready
                  </span>
                </div>

                {retestBugs.length === 0 ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <CheckCircle2 size={24} style={{ color: 'var(--color-success)', margin: '0 auto 6px', display: 'block' }} />
                    No defects currently waiting for QA retest.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {retestBugs.map((bug) => (
                      <div
                        key={bug.id}
                        style={{
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link href={`/bugs/${bug.id}`} style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '12px', textDecoration: 'none' }}>
                              {bug.issueKey}
                            </Link>
                            <span className="area-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>
                              {bug.bugArea}
                            </span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--color-text)', marginTop: '2px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bug.title}
                          </div>
                        </div>
                        <Link
                          href={`/bugs/${bug.id}`}
                          className="btn btn-sm"
                          style={{
                            background: 'var(--color-warning-dim)',
                            color: 'var(--color-warning)',
                            border: '1px solid var(--color-warning-border)',
                            fontSize: '11px',
                            padding: '4px 9px',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Laptop size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                  Frontend Developer Workbench
                </h2>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Assigned client-side defects, UI/UX issues, and component flow breakages.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{myFrontendBugs.length}</div>
                <div className="stat-label">Assigned Frontend Bugs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                  {myFrontendBugs.filter((b) => b.status === 'IN_PROGRESS').length}
                </div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                  {myFrontendBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length}
                </div>
                <div className="stat-label">Critical / P1</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                  {myFrontendBugs.filter((b) => b.status === 'FIXED').length}
                </div>
                <div className="stat-label">Awaiting QA Retest</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--color-text)' }}>
                My Assigned Frontend Tickets
              </h3>
              {myFrontendBugs.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myFrontendBugs.map((bug) => (
                        <tr key={bug.id}>
                          <td>
                            <Link href={`/bugs/${bug.id}`} style={{ fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
                              {bug.issueKey}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <Link href={`/bugs/${bug.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: '500' }}>
                              {bug.title}
                            </Link>
                          </td>
                          <td><span className={`badge badge-${bug.severity.toLowerCase()}`}>{bug.severity}</span></td>
                          <td><span className={`badge badge-${bug.priority.toLowerCase()}`}>{bug.priority}</span></td>
                          <td><span className={`badge badge-status-${bug.status.toLowerCase().replace(/_/g, '-')}`}>{bug.status.replace(/_/g, ' ')}</span></td>
                          <td style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                            {bug.testingCycle?.name || '—'}
                          </td>
                          <td>
                            <Link href={`/bugs/${bug.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} style={{ color: '#2563eb' }} />
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                  Backend & API Developer Workbench
                </h2>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Server-side exceptions, REST API response defects, database query issues, and service integrations.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{myBackendBugs.length}</div>
                <div className="stat-label">Assigned Backend Bugs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#2563eb' }}>
                  {myBackendBugs.filter((b) => b.status === 'IN_PROGRESS').length}
                </div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                  {myBackendBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length}
                </div>
                <div className="stat-label">Critical / 500 Errors</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                  {myBackendBugs.filter((b) => b.status === 'FIXED').length}
                </div>
                <div className="stat-label">Awaiting QA Retest</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--color-text)' }}>
                My Assigned Backend Tickets
              </h3>
              {myBackendBugs.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myBackendBugs.map((bug) => (
                        <tr key={bug.id}>
                          <td>
                            <Link href={`/bugs/${bug.id}`} style={{ fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
                              {bug.issueKey}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <Link href={`/bugs/${bug.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: '500' }}>
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
                          <td><span className={`badge badge-status-${bug.status.toLowerCase().replace(/_/g, '-')}`}>{bug.status.replace(/_/g, ' ')}</span></td>
                          <td>
                            <Link href={`/bugs/${bug.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
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

        {/* Recent Defect Activity across project */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
              Recent Defect Activity
            </h3>
            <Link href="/bugs" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>
              View All Defects →
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Title</th>
                  <th>Area</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Reported By</th>
                </tr>
              </thead>
              <tbody>
                {recentBugs.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/bugs/${b.id}`} style={{ fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
                        {b.issueKey}
                      </Link>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <Link href={`/bugs/${b.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: '500' }}>
                        {b.title}
                      </Link>
                    </td>
                    <td>
                      <span className="area-pill">
                        {b.bugArea || 'FRONTEND'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${b.severity.toLowerCase()}`}>{b.severity}</span></td>
                    <td><span className={`badge badge-status-${b.status.toLowerCase().replace(/_/g, '-')}`}>{b.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {b.assignedTo?.name ?? 'Unassigned'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>
                      {b.reportedBy?.name ?? 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
