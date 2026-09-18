'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  FolderKanban,
  Bug,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ProjectDetail {
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
  description?: string;
  scope?: string;
  type: string;
  status: string;
  environment: string;
  startDate?: string;
  plannedEndDate?: string;
  metrics?: {
    totalTests: number;
    passed: number;
    failed: number;
    totalBugs: number;
    openBugs: number;
  };
}

interface BugItem {
  id: string;
  issueKey: string;
  projectId: string;
  title: string;
  severity: string;
  priority: string;
  status: string;
  testingCycleId?: string;
}

export default function ProjectTestingCyclesPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  const loadProjectData = async () => {
    if (!user || !projectId) return;
    try {
      const [projRes, cyclesRes, bugsRes] = await Promise.all([
        projectsApi.get(projectId),
        testingCyclesApi.list(projectId),
        bugsApi.list({ projectId, assignedTo: user.id, limit: 100 }),
      ]);
      setProject(projRes.data || null);
      const cycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      setAllCycles(cycles);
      setAssignedBugs(bugsRes.data || []);
    } catch (err) {
      console.error('Failed to load project testing cycles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId, user]);

  // Filter cycles that have bugs assigned to this developer
  const cyclesWithDevBugs = useMemo(() => {
    return allCycles.map((cycle) => {
      const cycleBugs = assignedBugs.filter((b) => b.testingCycleId === cycle.id);
      const criticalCount = cycleBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
      const inProgressCount = cycleBugs.filter((b) => b.status === 'IN_PROGRESS').length;
      const fixedCount = cycleBugs.filter((b) => b.status === 'FIXED' || b.status === 'CLOSED').length;

      return {
        ...cycle,
        devBugsCount: cycleBugs.length,
        criticalCount,
        inProgressCount,
        fixedCount,
      };
    }).filter((cycle) => cycle.devBugsCount > 0); // Show cycles that have bugs assigned to this developer
  }, [allCycles, assignedBugs]);

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Breadcrumb Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '20px',
        }}>
          <Link
            href="/developer"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Developer Console</span>
          </Link>
          <ChevronRight size={14} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
            {project?.name || 'Project'}
          </span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--color-text-faint)' }}>Testing Cycles</span>
        </div>

        {/* Project Header Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '26px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#4f46e5',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}>
                {project?.key || 'PROJ'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
              }}>
                Role: Developer
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
              {project?.name || 'Project Testing Cycles'}
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: '6px 0 0', maxWidth: '680px' }}>
              {project?.description || 'Select a testing cycle below to open and update its assigned defects.'}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Assigned Cycles
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>
                {cyclesWithDevBugs.length}
              </div>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'var(--color-border)' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Assigned Defects
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)', marginTop: '2px' }}>
                {assignedBugs.length}
              </div>
            </div>
          </div>
        </div>

        {/* Testing Cycles Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={18} style={{ color: '#4f46e5' }} />
              <span>Assigned Testing Cycles</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--color-primary-dim)',
                color: 'var(--color-primary)',
              }}>
                {cyclesWithDevBugs.length}
              </span>
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0 }}>
              Clicking a cycle opens its assigned defects page.
            </p>
          </div>

          {loading ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Loading testing cycles...
              </p>
            </div>
          ) : cyclesWithDevBugs.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
              <RotateCcw size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                No Testing Cycles with Assigned Bugs
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                There are currently no testing cycles in this project with defect tasks assigned to you.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}>
              {cyclesWithDevBugs.map((cycle) => (
                <div
                  key={cycle.id}
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
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    {/* Header Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2.5px 8px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                      }}>
                        Cycle {cycle.cycleNumber || '01'}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569',
                        textTransform: 'uppercase',
                      }}>
                        {cycle.type || 'FUNCTIONAL'}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: '#ecfdf5',
                        color: '#065f46',
                      }}>
                        {cycle.environment || 'QA'}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: cycle.status === 'IN_PROGRESS' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: cycle.status === 'IN_PROGRESS' ? '#7c3aed' : '#2563eb',
                        marginLeft: 'auto',
                      }}>
                        {cycle.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Cycle Title */}
                    <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 8px' }}>
                      {cycle.name}
                    </h3>

                    {cycle.description && (
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                        lineHeight: '1.45',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {cycle.description}
                      </p>
                    )}
                  </div>

                  {/* Defect Metrics Bar */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bug size={16} style={{ color: '#4f46e5' }} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
                        {cycle.devBugsCount} Assigned {cycle.devBugsCount === 1 ? 'Defect' : 'Defects'}
                      </span>
                    </div>

                    {cycle.criticalCount > 0 && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                      }}>
                        {cycle.criticalCount} Critical
                      </span>
                    )}
                  </div>

                  {/* Redirection Link to Cycle Bugs Page */}
                  <Link
                    href={`/developer/cycles/${cycle.id}/bugs`}
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
                    <span>View Assigned Defects</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
