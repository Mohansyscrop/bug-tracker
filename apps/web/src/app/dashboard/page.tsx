'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  PlusCircle,
  FolderKanban,
  Bug,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Check,
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
    case 'MEDIUM': return '#0284c7';
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
    case 'ASSIGNED': return '#0284c7';
    case 'CLOSED': return '#64748b';
    default: return '#64748b';
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [allBugs, setAllBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial project list
  useEffect(() => {
    projectsApi.list()
      .then((res) => {
        const list = res.data ?? [];
        setProjects(list);
      })
      .catch((err) => {
        console.warn('Failed to fetch projects:', err?.message || err);
      });
  }, []);

  // Fetch defects whenever project filter changes
  useEffect(() => {
    setLoading(true);
    const projId = selectedProject || undefined;

    bugsApi.list({ projectId: projId, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((res) => {
        setAllBugs(res.data ?? []);
      })
      .catch(() => {
        setAllBugs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedProject]);

  // Computed Defect Metrics
  const metrics = useMemo(() => {
    const total = allBugs.length;
    const inProgress = allBugs.filter((b) => b.status === 'IN_PROGRESS').length;
    const retest = allBugs.filter((b) => b.status === 'RETEST').length;
    const fixed = allBugs.filter((b) => b.status === 'FIXED').length;
    const closed = allBugs.filter((b) => b.status === 'CLOSED').length;
    const activeUnresolved = allBugs.filter((b) => b.status !== 'CLOSED' && b.status !== 'REJECTED').length;

    const critical = allBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
    const high = allBugs.filter((b) => b.severity === 'HIGH' && b.priority !== 'P1').length;
    const medium = allBugs.filter((b) => b.severity === 'MEDIUM').length;
    const low = allBugs.filter((b) => b.severity === 'LOW').length;

    const frontendCount = allBugs.filter((b) => b.bugArea === 'FRONTEND').length;
    const backendCount = allBugs.filter((b) => b.bugArea === 'BACKEND').length;

    const pendingVerification = retest + fixed;
    const resolvedOrClosed = fixed + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedOrClosed / total) * 100) : 100;

    return {
      total,
      inProgress,
      retest,
      fixed,
      closed,
      activeUnresolved,
      critical,
      high,
      medium,
      low,
      frontendCount,
      backendCount,
      pendingVerification,
      resolutionRate,
    };
  }, [allBugs]);

  // Retest queue (Fixed or Retest status awaiting verification)
  const retestQueue = useMemo(() => {
    return allBugs.filter((b) => b.status === 'RETEST' || b.status === 'FIXED').slice(0, 5);
  }, [allBugs]);

  // Recent defect activity stream
  const recentBugs = useMemo(() => {
    return allBugs.slice(0, 8);
  }, [allBugs]);

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1360px', margin: '0 auto', width: '100%' }}>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CLEAN, UNIFIED WORKSPACE HEADER                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '750',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: '#d1fae5',
                color: '#047857',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                OPERATIONAL WORKSPACE
              </span>
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Defect Operations & Quality Workspace
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '3px', fontWeight: '500' }}>
              Real-time defect tracking, resolution queue, and project health overview.
            </p>
          </div>

          {/* Action button — single primary action */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/bugs/new" className="btn btn-primary" id="create-bug-btn" style={{ fontSize: '13px', padding: '8px 16px' }}>
              <PlusCircle size={15} />
              <span>Report Defect</span>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PROJECT SCOPE SELECTOR BAR                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--color-surface)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
              Project Scope:
            </span>
            <select
              id="dashboard-project-select"
              className="select"
              style={{ minWidth: '240px', fontSize: '13px', padding: '7px 32px 7px 12px' }}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
            <span>{projects.length} Active Projects</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span>{metrics.total} Total Defects</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CORE OPERATIONAL KPI STRIP                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="stats-grid" style={{ marginBottom: '22px' }}>
          {/* Active Projects */}
          <div className="stat-card" style={{ '--stat-accent': '#1155d7' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ background: 'rgba(17, 85, 215, 0.08)', color: '#1155d7' }}>
                <FolderKanban size={20} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '750', color: '#1155d7', background: 'rgba(17, 85, 215, 0.08)', padding: '2px 8px', borderRadius: '999px' }}>
                Scope
              </span>
            </div>
            <div>
              <div className="stat-value">{projects.length}</div>
              <div className="stat-label">Active Projects</div>
            </div>
          </div>

          {/* Unresolved Defects */}
          <div className="stat-card" style={{ '--stat-accent': '#7c3aed' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}>
                <Bug size={20} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '750', color: '#7c3aed', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '999px' }}>
                Backlog
              </span>
            </div>
            <div>
              <div className="stat-value" style={{ color: '#7c3aed' }}>{metrics.activeUnresolved}</div>
              <div className="stat-label">Unresolved Defects</div>
            </div>
          </div>

          {/* Critical / Blockers */}
          <div className="stat-card" style={{ '--stat-accent': '#ef4444' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <ShieldAlert size={20} />
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '750',
                color: metrics.critical > 0 ? '#dc2626' : '#059669',
                background: metrics.critical > 0 ? '#fee2e2' : '#d1fae5',
                padding: '2px 8px',
                borderRadius: '999px',
              }}>
                {metrics.critical > 0 ? 'Urgent' : 'Zero Blockers'}
              </span>
            </div>
            <div>
              <div className="stat-value" style={{ color: metrics.critical > 0 ? '#dc2626' : '#059669' }}>
                {metrics.critical}
              </div>
              <div className="stat-label">Critical / Blockers</div>
            </div>
          </div>

          {/* Pending QA Retest */}
          <div className="stat-card" style={{ '--stat-accent': '#f59e0b' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <CheckCircle2 size={20} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '750', color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px' }}>
                Verification
              </span>
            </div>
            <div>
              <div className="stat-value" style={{ color: '#d97706' }}>{metrics.pendingVerification}</div>
              <div className="stat-label">Pending QA Retest</div>
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="stat-card" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                <TrendingUp size={20} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '750', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px' }}>
                Closed
              </span>
            </div>
            <div>
              <div className="stat-value" style={{ color: '#059669' }}>{metrics.resolutionRate}%</div>
              <div className="stat-label">Resolution Rate</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TWO-COLUMN OPERATIONAL WORKBENCH                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '22px' }}>

          {/* Left Column: Pending QA Retest Queue */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '750', margin: 0, color: 'var(--color-text)' }}>
                  Pending QA Retest Queue
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Defects resolved by developers awaiting verification & sign-off.
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
                {retestQueue.length} Ready
              </span>
            </div>

            {retestQueue.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <CheckCircle2 size={28} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                No defects currently waiting for QA retest.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {retestQueue.map((bug) => (
                  <div
                    key={bug.id}
                    style={{
                      background: 'var(--color-surface)',
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
                          {bug.bugArea || 'FRONTEND'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)', marginTop: '4px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                        fontWeight: '750',
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

          {/* Right Column: Severity Profile & Domain Distribution */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '750', margin: 0, color: 'var(--color-text)' }}>
                  Defect Severity & Domain Distribution
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                  Breakdown by impact level and technical area
                </p>
              </div>
              <Link href="/bugs" style={{ fontSize: '12.5px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '700' }}>
                View All →
              </Link>
            </div>

            {/* Technical Domain Split: Frontend vs Backend */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                background: '#eef2ff',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#4338ca', lineHeight: 1.1 }}>{metrics.frontendCount}</div>
                <div style={{ fontSize: '12px', color: '#4338ca', marginTop: '3px', fontWeight: '700' }}>
                  Frontend UI
                </div>
              </div>

              <div style={{
                background: '#eff6ff',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8', lineHeight: 1.1 }}>{metrics.backendCount}</div>
                <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '3px', fontWeight: '700' }}>
                  Backend Core
                </div>
              </div>
            </div>

            {/* Severity Breakdown Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Critical / P1', count: metrics.critical, color: '#ef4444', bg: '#fee2e2' },
                { label: 'High Severity', count: metrics.high, color: '#f97316', bg: '#ffedd5' },
                { label: 'Medium Severity', count: metrics.medium, color: '#0284c7', bg: '#e0f2fe' },
                { label: 'Low Severity', count: metrics.low, color: '#64748b', bg: '#f1f5f9' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '650', color: 'var(--color-text)', minWidth: '105px' }}>
                    {s.label}
                  </span>
                  <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${metrics.total ? (s.count / metrics.total) * 100 : 0}%`,
                      height: '100%',
                      background: s.color,
                      borderRadius: '999px',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '750',
                    color: s.color,
                    background: s.bg,
                    padding: '1px 8px',
                    borderRadius: '999px',
                    minWidth: '28px',
                    textAlign: 'center',
                  }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PROJECT DEFECT HEALTH MATRIX                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '750', margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={17} style={{ color: 'var(--color-primary)' }} />
                <span>Project Defect Health Matrix</span>
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Defect volume, critical blockers, and team distribution across active projects.
              </p>
            </div>
            <Link href="/projects" className="btn btn-secondary btn-sm" style={{ fontSize: '12px', fontWeight: '650' }}>
              Manage Projects
              <ArrowRight size={13} />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No active projects found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                    <th>Project Name</th>
                    <th style={{ width: '100px' }}>Key</th>
                    <th style={{ width: '130px' }}>Total Defects</th>
                    <th style={{ width: '130px' }}>Critical / P1</th>
                    <th style={{ width: '130px' }}>Team Members</th>
                    <th style={{ width: '140px' }}>Health Status</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj, index) => {
                    const projBugs = allBugs.filter((b) => b.projectId === proj.id);
                    const totalCount = proj._count?.bugs ?? projBugs.length;
                    const critCount = projBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
                    const membersCount = proj._count?.members ?? (proj.members?.length || 1);

                    let healthLabel = 'Healthy';
                    let healthBg = '#d1fae5';
                    let healthColor = '#047857';

                    if (critCount > 2) {
                      healthLabel = 'High Exposure';
                      healthBg = '#fee2e2';
                      healthColor = '#dc2626';
                    } else if (critCount > 0) {
                      healthLabel = 'Attention Needed';
                      healthBg = '#fef3c7';
                      healthColor = '#b45309';
                    }

                    return (
                      <tr key={proj.id}>
                        <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-text-faint)', fontSize: '12px' }}>
                          {index + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)' }}>
                            {proj.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {proj.description || 'No description provided'}
                          </div>
                        </td>
                        <td>
                          <span className="ticket-badge">
                            {proj.key}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '750', fontSize: '13px', color: 'var(--color-text)' }}>
                            {totalCount}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: '750',
                            fontSize: '11.5px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: critCount > 0 ? '#fee2e2' : '#f1f5f9',
                            color: critCount > 0 ? '#dc2626' : '#64748b',
                          }}>
                            {critCount} Critical
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                            {membersCount} Members
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '750',
                            background: healthBg,
                            color: healthColor,
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: healthColor }} />
                            {healthLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            href={`/projects/${proj.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '11.5px', padding: '4px 8px', color: 'var(--color-primary)' }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RECENT DEFECT STREAM TABLE                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="table-wrapper">
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
                  Recent Defect Stream
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '750',
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
              Explore All Defects
              <ArrowRight size={13} />
            </Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
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
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    No defect activity recorded yet.
                  </td>
                </tr>
              ) : (
                recentBugs.map((b, index) => {
                  const areaStyle = getAreaBadgeStyle(b.bugArea);
                  const sevDot = getSeverityDotColor(b.severity);
                  const statusDot = getStatusDotColor(b.status);

                  return (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-text-faint)', fontSize: '12px' }}>
                        {index + 1}
                      </td>
                      <td>
                        <Link href={`/bugs/${b.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                          #{b.issueKey}
                        </Link>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div>
                          <Link
                            href={`/bugs/${b.id}`}
                            style={{
                              color: 'var(--color-text)',
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
                      <td>
                        <span className={`badge badge-${(b.severity || 'LOW').toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sevDot }} />
                          {b.severity}
                        </span>
                      </td>
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
                      <td>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                          {b.reportedBy?.name ?? 'System'}
                        </div>
                      </td>
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
