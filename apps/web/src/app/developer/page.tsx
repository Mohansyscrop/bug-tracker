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
      setProjects(projRes.data || []);
      const cycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      setAllCycles(cycles);
      setAssignedBugs(bugsRes.data || []);
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

  // Enrich projects with developer assignment counts
  const developerProjects = useMemo(() => {
    return projects.map((proj) => {
      const projBugs = assignedBugs.filter((b) => b.projectId === proj.id);
      const projCycles = allCycles.filter(
        (c) => c.projectId === proj.id && projBugs.some((b) => b.testingCycleId === c.id)
      );
      const criticalBugs = projBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
      const inProgressBugs = projBugs.filter((b) => b.status === 'IN_PROGRESS').length;

      return {
        ...proj,
        assignedCyclesCount: projCycles.length,
        assignedBugsCount: projBugs.length,
        criticalBugs,
        inProgressBugs,
      };
    });
  }, [projects, assignedBugs, allCycles]);

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Top Developer Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '18px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 12px 35px rgba(49, 46, 129, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '28px',
        }}>
          {/* Cyber Glow Accent */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  <Laptop size={13} />
                  Developer Console
                </span>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}>
                  Developer Session
                </span>
              </div>
              <h1 style={{
                fontSize: '26px',
                fontWeight: '800',
                letterSpacing: '-0.03em',
                margin: 0,
                color: '#ffffff',
              }}>
                Welcome, {user?.name || 'Developer'}
              </h1>
              <p style={{
                fontSize: '13.5px',
                color: 'rgba(255, 255, 255, 0.85)',
                margin: '6px 0 0',
                maxWidth: '650px',
              }}>
                Select your assigned project below to view its active testing cycles and work on your assigned defect queue.
              </p>
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '12.5px',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Records'}</span>
            </button>
          </div>

          {/* Metrics Ribbon */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
              backdropFilter: 'blur(6px)',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Assigned
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#ffffff' }}>
                {metrics.total}
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(167, 139, 250, 0.3)',
            }}>
              <div style={{ fontSize: '11px', color: '#e0e7ff', fontWeight: '600', textTransform: 'uppercase' }}>
                In Progress
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#ffffff' }}>
                {metrics.inProgress}
              </div>
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.22)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(147, 197, 253, 0.3)',
            }}>
              <div style={{ fontSize: '11px', color: '#dbeafe', fontWeight: '600', textTransform: 'uppercase' }}>
                Assigned (Pending)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#ffffff' }}>
                {metrics.assigned}
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.22)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(110, 231, 183, 0.3)',
            }}>
              <div style={{ fontSize: '11px', color: '#d1fae5', fontWeight: '600', textTransform: 'uppercase' }}>
                Resolved / Fixed
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#ffffff' }}>
                {metrics.fixed}
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.22)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(252, 165, 165, 0.3)',
            }}>
              <div style={{ fontSize: '11px', color: '#fee2e2', fontWeight: '600', textTransform: 'uppercase' }}>
                Critical / Blockers
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#fca5a5' }}>
                {metrics.critical}
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Projects Section */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={18} style={{ color: '#4f46e5' }} />
                <span>My Assigned Projects</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-dim)',
                  border: '1px solid var(--color-primary-border)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}>
                  {developerProjects.length} {developerProjects.length === 1 ? 'project' : 'projects'}
                </span>
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                Click a project card to open its assigned testing cycles and view bugs.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Loading assigned projects...
              </p>
            </div>
          ) : developerProjects.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
              <FolderKanban size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                No Projects Assigned
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                You have not been assigned to any projects yet. Please contact your project lead or administrator.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}>
              {developerProjects.map((project) => (
                <div
                  key={project.id}
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    {/* Top Row: Key and Role */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                        color: '#4f46e5',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        fontFamily: 'monospace',
                      }}>
                        {project.key}
                      </span>

                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2.5px 8px',
                        borderRadius: '12px',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        Role: {project.myRole || 'Developer'}
                      </span>
                    </div>

                    {/* Project Title */}
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 8px' }}>
                      {project.name}
                    </h3>

                    {project.description && (
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                        lineHeight: '1.5',
                      }}>
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Summary Counters */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                        Active Testing Cycles
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#4f46e5', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RotateCcw size={16} />
                        <span>{project.assignedCyclesCount}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                        Assigned Defects
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: project.criticalBugs > 0 ? '#dc2626' : 'var(--color-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bug size={16} />
                        <span>{project.assignedBugsCount}</span>
                        {project.criticalBugs > 0 && (
                          <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>
                            ({project.criticalBugs} crit)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prominent CTA Link to the Project's Testing Cycles */}
                  <Link
                    href={`/developer/projects/${project.id}/cycles`}
                    className="btn btn-primary"
                    style={{
                      justifyContent: 'center',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>Open Testing Cycles</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ))}
            </div>
          )}
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
                    <th style={{ padding: '12px 16px' }}>Key</th>
                    <th style={{ padding: '12px 16px' }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Testing Cycle</th>
                    <th style={{ padding: '12px 16px' }}>Priority</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedBugs.slice(0, 5).map((bug) => (
                    <tr key={bug.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
