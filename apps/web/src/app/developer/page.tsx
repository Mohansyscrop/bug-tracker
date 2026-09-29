'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Laptop,
  FolderKanban,
  RotateCcw,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  RefreshCw,
  Layers,
  Sparkles,
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

export default function DeveloperDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [projRes, cyclesRes, bugsRes] = await Promise.all([
        projectsApi.list(),
        testingCyclesApi.list(),
        bugsApi.list({ assignedTo: user.id, limit: 100 }),
      ]);
      const rawProjects: ProjectItem[] = Array.isArray(projRes) ? projRes : (projRes as any)?.data || [];
      const projectMap = new Map<string, ProjectItem>();
      rawProjects.forEach((p) => projectMap.set(p.id, p));

      const bugs: BugItem[] = (bugsRes as any)?.data || (Array.isArray(bugsRes) ? bugsRes : []);
      bugs.forEach((b) => {
        if (b.projectId && !projectMap.has(b.projectId) && b.project) {
          projectMap.set(b.projectId, {
            id: b.projectId,
            name: b.project.name || 'Project',
            key: b.project.key || '',
            myRole: 'DEV',
          });
        }
      });

      setProjects(Array.from(projectMap.values()));
      const rawCycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      const cycles = rawCycles.filter((c) => c.status !== 'PLANNED');
      setAllCycles(cycles);
      setAssignedBugs(bugs);
    } catch (err) {
      console.error('Failed to load developer dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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



  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Top Developer Hero Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '26px 30px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '26px',
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

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
                <span style={{
                  background: '#d1fae5',
                  color: '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}>
                  Developer Session
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
                Monitor your assigned defect queue, track active testing cycles, and review key defect resolution metrics.
              </p>
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="btn btn-primary"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Records'}</span>
            </button>
          </div>

          {/* Metrics Ribbon — Bold Executive Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
            marginTop: '24px',
            paddingTop: '22px',
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
                Total Assigned
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
                Assigned (Pending)
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

        {/* Developer Quick Navigation Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px',
          marginBottom: '28px',
        }}>
          <Link
            href="/developer/projects"
            className="card"
            style={{
              padding: '22px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0A1929 0%, #0F3A56 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(10, 25, 41, 0.3)',
            }}>
              <FolderKanban size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Projects
              </div>
              <div style={{ fontSize: '18px', fontWeight: '850', color: 'var(--color-text)', marginTop: '2px' }}>
                {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
              </div>
              <div style={{ fontSize: '12px', color: '#1155d7', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Open project list</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </Link>

          <Link
            href="/developer/cycles"
            className="card"
            style={{
              padding: '22px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1155d7 0%, #06b6d4 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(17, 85, 215, 0.3)',
            }}>
              <RotateCcw size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Testing Cycles
              </div>
              <div style={{ fontSize: '18px', fontWeight: '850', color: 'var(--color-text)', marginTop: '2px' }}>
                {allCycles.length} {allCycles.length === 1 ? 'Cycle' : 'Cycles'}
              </div>
              <div style={{ fontSize: '12px', color: '#1155d7', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Browse cycles</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </Link>

          <Link
            href="/developer/bugs"
            className="card"
            style={{
              padding: '22px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
            }}>
              <Bug size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Defect Queue
              </div>
              <div style={{ fontSize: '18px', fontWeight: '850', color: 'var(--color-text)', marginTop: '2px' }}>
                {metrics.total} {metrics.total === 1 ? 'Defect' : 'Defects'}
              </div>
              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Manage queue</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Defect Queue Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bug size={17} style={{ color: '#ef4444' }} />
              <span>Assigned Defects Queue</span>
            </h2>
            <Link
              href="/developer/bugs"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', fontWeight: '600' }}
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
                    <th style={{ padding: '12px 16px' }}>Key</th>
                    <th style={{ padding: '12px 16px' }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Testing Cycle</th>
                    <th style={{ padding: '12px 16px' }}>Priority</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedBugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-text)' }}>No defects currently assigned</div>
                        <div style={{ fontSize: '12.5px', marginTop: '2px' }}>Your assigned defect queue is currently empty.</div>
                      </td>
                    </tr>
                  ) : (
                    assignedBugs.slice(0, 10).map((bug, index) => (
                      <tr key={bug.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '800', color: '#4f46e5' }}>
                          {bug.issueKey}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text)' }}>
                          {bug.title}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {bug.testingCycle ? bug.testingCycle.name : 'Unassigned Cycle'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: bug.priority === 'P1' ? '#fee2e2' : '#e0e7ff',
                            color: bug.priority === 'P1' ? '#b91c1c' : '#4338ca',
                          }}>
                            {bug.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: bug.status === 'IN_PROGRESS' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: bug.status === 'IN_PROGRESS' ? '#7c3aed' : '#2563eb',
                          }}>
                            {bug.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {bug.testingCycleId ? (
                            <Link
                              href={`/developer/cycles/${bug.testingCycleId}/bugs`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Open in Cycle</span>
                              <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '4px 10px' }}
                            >
                              Inspect
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
