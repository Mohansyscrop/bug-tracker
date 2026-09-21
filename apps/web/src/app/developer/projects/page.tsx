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
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
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
  project?: { id: string; key: string; name: string };
}

export default function DeveloperProjectsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
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

      setProjects(Array.from(projectMap.values()));
      const rawCycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      const cycles = rawCycles.filter((c) => c.status !== 'PLANNED');
      setAllCycles(cycles);
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

  // Aggregated overview stats
  const stats = useMemo(() => {
    const totalProjects = developerProjects.length;
    const projectsWithCycles = developerProjects.filter((p) => p.assignedCyclesCount > 0).length;
    const totalAssignedBugs = assignedBugs.length;
    const totalCritical = assignedBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
    return { totalProjects, projectsWithCycles, totalAssignedBugs, totalCritical };
  }, [developerProjects, assignedBugs]);

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Page Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}>
                <FolderKanban size={20} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>My Assigned Projects</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#6366f1',
                    background: '#f5f3ff',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}>
                    {developerProjects.length} {developerProjects.length === 1 ? 'project' : 'projects'}
                  </span>
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  Select an assigned project to inspect its testing cycles, environments, and work on assigned defects.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '6px 12px',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  width: '180px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{
                fontSize: '12.5px',
                fontWeight: '600',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}>
          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assigned Projects
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text)', marginTop: '4px' }}>
              {stats.totalProjects}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Projects With Cycles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>
              {stats.projectsWithCycles}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Assigned Defects
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
              {stats.totalAssignedBugs}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Critical / Blockers
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: stats.totalCritical > 0 ? '#dc2626' : '#10b981', marginTop: '4px' }}>
              {stats.totalCritical}
            </div>
          </div>
        </div>

        {/* Projects Cards Grid */}
        {loading ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 14px' }} />
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
              Loading assigned projects...
            </p>
          </div>
        ) : developerProjects.length === 0 ? (
          <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <FolderKanban size={42} style={{ color: 'var(--color-text-faint)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Projects Assigned
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '6px', maxWidth: '500px', margin: '6px auto 0' }}>
              You have not been assigned to any projects yet. Please contact your project lead or administrator to assign you to a project workspace.
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <Search size={32} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
              No matching projects
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No projects match "{searchQuery}". Try a different keyword.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '22px',
          }}>
            {filteredProjects.map((project) => (
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
                  gap: '18px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  background: '#ffffff',
                }}
              >
                <div>
                  {/* Top Row: Key and Role */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3.5px 9px',
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

                  {project.description ? (
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                      lineHeight: '1.5',
                    }}>
                      {project.description}
                    </p>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--color-text-faint)', margin: 0, fontStyle: 'italic' }}>
                      No project description provided.
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

                {/* Action CTA Link to the Project's Testing Cycles */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href={`/developer/projects/${project.id}/cycles`}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
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

                  <Link
                    href={`/developer/bugs`}
                    className="btn btn-secondary"
                    title="View assigned bugs"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bug size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
