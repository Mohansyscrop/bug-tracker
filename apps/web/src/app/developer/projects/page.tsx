'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  FolderKanban,
  RotateCcw,
  Bug,
  ArrowRight,
  RefreshCw,
  Search,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Flame,
  Code2,
  Terminal,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description?: string;
  myRole?: string;
  _count?: {
    bugs?: number;
    members?: number;
    testingCycles?: number;
  };
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
  project?: { id: string; key: string; name: string };
  createdAt?: string;
}

// Developer theme palettes for repositories
const REPO_PALETTES = [
  { border: '#3b82f6', badge: 'rgba(59, 130, 246, 0.12)', text: '#1d4ed8', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)' },
  { border: '#10b981', badge: 'rgba(16, 185, 129, 0.12)', text: '#047857', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { border: '#8b5cf6', badge: 'rgba(139, 92, 246, 0.12)', text: '#6d28d9', gradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' },
  { border: '#f59e0b', badge: 'rgba(245, 158, 11, 0.12)', text: '#b45309', gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { border: '#06b6d4', badge: 'rgba(6, 182, 212, 0.12)', text: '#0e7490', gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)' },
];

function getRepoPalette(key: string) {
  const seed = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return REPO_PALETTES[seed % REPO_PALETTES.length];
}

export default function DeveloperProjectsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

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

      const list = Array.from(projectMap.values());
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }

      const rawCycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      setAllCycles(rawCycles);
      setAssignedBugs(bugs);
    } catch (err) {
      console.error('Failed to load developer projects data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Enrich projects with developer task metrics
  const developerProjects = useMemo(() => {
    return projects.map((proj) => {
      const myBugs = assignedBugs.filter((b) => b.projectId === proj.id);
      const cycles = allCycles.filter((c) => c.projectId === proj.id);
      const criticalBugs = myBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1');
      const inProgressBugs = myBugs.filter((b) => b.status === 'IN_PROGRESS');
      const totalProjectBugs = proj._count?.bugs ?? myBugs.length;
      const totalProjectCycles = proj._count?.testingCycles ?? cycles.length;

      // Large enterprise repository criteria
      const isLargeProject = totalProjectBugs >= 4 || totalProjectCycles >= 2 || myBugs.length >= 3;

      return {
        ...proj,
        myBugs,
        cycles,
        criticalBugs,
        inProgressBugs,
        totalProjectBugs,
        totalProjectCycles,
        isLargeProject,
      };
    });
  }, [projects, assignedBugs, allCycles]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return developerProjects;
    const q = searchQuery.toLowerCase();
    return developerProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [developerProjects, searchQuery]);

  // Active selected project for the Workbench
  const selectedProject = useMemo(() => {
    return developerProjects.find((p) => p.id === selectedProjectId) || developerProjects[0] || null;
  }, [developerProjects, selectedProjectId]);

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ padding: '22px 30px', maxWidth: '1480px', margin: '0 auto', width: '100%', paddingBottom: '48px' }}>

        {/* ==============================================================
            PAGE HEADER: ENGINEERING WORKSPACE & REFRESH BUTTON
            ============================================================== */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#0f172a',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.25)',
              }}>
                <Code2 size={20} />
              </div>

              <div>
                <h1 style={{
                  fontSize: '22px',
                  fontWeight: '850',
                  letterSpacing: '-0.03em',
                  color: 'var(--color-text)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  Project Directory
                </h1>

              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ==============================================================
            QUICK SEARCH BAR
            ============================================================== */}
        <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '420px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
          <input
            type="text"
            className="input"
            placeholder="Filter codebase or key (e.g. AV, BP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
          />
        </div>

        {/* ==============================================================
            WORKBENCH VIEW
            ============================================================== */}
        {loading ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>Syncing engineering workspaces...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Terminal size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>No Repositories Found</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No repositories match your filter keyword "{searchQuery}".
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 360px) 1fr',
            gap: '20px',
            alignItems: 'start',
          }}>
            {/* Left Column: Repository Selector Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', paddingLeft: '4px', marginBottom: '2px' }}>
                Projects ({filteredProjects.length})
              </div>

              {filteredProjects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                const palette = getRepoPalette(proj.key);

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? '#ffffff' : 'var(--color-surface)',
                      border: isSelected ? `2px solid ${palette.border}` : '1px solid var(--color-border)',
                      boxShadow: isSelected ? '0 4px 16px rgba(15, 23, 42, 0.08)' : 'var(--shadow-xs)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >


                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: palette.gradient,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '850',
                          fontSize: '12px',
                          flexShrink: 0,
                          fontFamily: 'monospace',
                        }}
                      >
                        {proj.key.slice(0, 3)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontWeight: '800',
                          fontSize: '13.5px',
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingRight: proj.isLargeProject ? '70px' : '0',
                        }}>
                          {proj.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                          repo://{proj.key.toLowerCase()}
                        </div>
                      </div>
                    </div>

                    {/* Quick Badge Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: proj.myBugs.length > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: '700' }}>
                        <Bug size={12} />
                        <span>{proj.myBugs.length} bugs</span>
                      </span>

                      {proj.criticalBugs.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-danger)', fontWeight: '750' }}>
                          <Flame size={12} />
                          <span>{proj.criticalBugs.length} crit</span>
                        </span>
                      )}

                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-text-faint)' }}>
                        <RotateCcw size={11} />
                        <span>{proj.cycles.length} cycles</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Active Project Workbench Detail */}
            {selectedProject && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* 1. Repository Header Terminal Banner (No QA Hub button) */}
                <div
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative',
                    background: '#0d1527',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    color: '#ffffff',
                    boxShadow: '0 8px 30px rgba(13, 21, 39, 0.35)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <code style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '800' }}>
                          {selectedProject.key}
                        </code>


                      </div>

                      <h2 style={{ fontSize: '20px', fontWeight: '850', margin: '0 0 6px', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                        {selectedProject.name}
                      </h2>

                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                        {selectedProject.description || 'Enterprise code repository and QA sprint test environment.'}
                      </p>
                    </div>

                    {/* Developer Testing Cycles CTA (No QA Hub button) */}
                    <div>
                      <Link
                        href={`/developer/projects/${selectedProject.id}/cycles`}
                        className="btn btn-primary"
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
                        }}
                      >
                        <RotateCcw size={15} />
                        <span>Testing Cycles ({selectedProject.totalProjectCycles})</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Terminal Stats Strip */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Balance QA Cycles
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '850', color: '#38bdf8', marginTop: '2px' }}>
                        {selectedProject.cycles.length} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>active</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Bugs Queue
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '850', color: selectedProject.myBugs.length > 0 ? '#38bdf8' : '#ffffff', marginTop: '2px' }}>
                        {selectedProject.myBugs.length} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>issues</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Critical Blockers
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '850', color: selectedProject.criticalBugs.length > 0 ? '#f87171' : '#4ade80', marginTop: '2px' }}>
                        {selectedProject.criticalBugs.length} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>blockers</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Total Project Bugs
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '850', color: '#f8fafc', marginTop: '2px' }}>
                        {selectedProject.totalProjectBugs} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>total</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Active QA Testing Cycles & Environments in this Repo */}
                <div className="card" style={{ padding: '22px', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCcw size={18} style={{ color: '#0284c7' }} />
                      <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
                        Active QA Testing Pipelines ({selectedProject.cycles.length})
                      </h3>
                    </div>

                    <Link
                      href={`/developer/projects/${selectedProject.id}/cycles`}
                      style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View All Testing Cycles</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {selectedProject.cycles.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                      <CheckCircle2 size={32} style={{ color: 'var(--color-success)', margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: '700', color: 'var(--color-text)', margin: 0, fontSize: '14px' }}>No Active QA Cycles</p>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        All testing cycles for this repository have been completed or none are currently running.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {selectedProject.cycles.map((cycle) => (
                        <div
                          key={cycle.id}
                          style={{
                            padding: '16px 18px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-surface-2)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', fontFamily: 'monospace' }}>
                                CYCLE #{cycle.cycleNumber}
                              </span>

                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: cycle.environment === 'Production' ? '#fee2e2' : '#e0f2fe',
                                color: cycle.environment === 'Production' ? '#dc2626' : '#0369a1',
                              }}>
                                {cycle.environment || 'QA'}
                              </span>
                            </div>

                            <div style={{ fontSize: '13.5px', fontWeight: '750', color: 'var(--color-text)', lineHeight: 1.35 }}>
                              {cycle.name}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            <span>Type: <strong>{cycle.type || 'FUNCTIONAL'}</strong></span>
                            <Link
                              href={`/developer/projects/${selectedProject.id}/cycles`}
                              style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <span>Inspect Run</span>
                              <ArrowRight size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
