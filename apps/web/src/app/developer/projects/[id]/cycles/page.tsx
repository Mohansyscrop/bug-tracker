'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { projectsApi, bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  Bug,
  ChevronRight,
  ChevronLeft,
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
  Search,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Target,
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
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [envFilter, setEnvFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const loadProjectData = async () => {
    if (!user || !projectId) return;
    try {
      const [projRes, cyclesRes, bugsRes] = await Promise.all([
        projectsApi.get(projectId),
        testingCyclesApi.list(projectId),
        bugsApi.list({ projectId, assignedTo: user.id, limit: 100 }),
      ]);
      setProject(projRes.data || null);
      const rawCycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      // Developer portal only displays cycles once QA transitions them to IN_PROGRESS (excluding PLANNED)
      const cycles = rawCycles.filter((c) => c.status !== 'PLANNED');
      setAllCycles(cycles);
      setAssignedBugs(bugsRes.data || []);
    } catch (err) {
      console.error('Failed to load project testing cycles', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId, user]);

  // Enrich all cycles with developer assignment metrics
  const enrichedCycles = useMemo(() => {
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
    });
  }, [allCycles, assignedBugs]);

  // Available environments for filtering
  const availableEnvironments = useMemo(() => {
    const set = new Set<string>();
    enrichedCycles.forEach((c) => {
      if (c.environment) set.add(c.environment);
    });
    return Array.from(set);
  }, [enrichedCycles]);

  // Filtered & Sorted Cycles
  const processedCycles = useMemo(() => {
    return enrichedCycles
      .filter((cycle) => {
        // Status filter
        if (statusFilter !== 'ALL' && cycle.status !== statusFilter) return false;

        // Environment filter
        if (envFilter !== 'ALL' && cycle.environment !== envFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mName = cycle.name?.toLowerCase().includes(q);
          const mNum = `cycle ${cycle.cycleNumber}`.toLowerCase().includes(q) || String(cycle.cycleNumber).includes(q);
          const mDesc = cycle.description?.toLowerCase().includes(q);
          const mEnv = cycle.environment?.toLowerCase().includes(q);
          if (!mName && !mNum && !mDesc && !mEnv) return false;
        }

        return true;
      })
      .sort((a, b) => (b.cycleNumber || 0) - (a.cycleNumber || 0));
  }, [enrichedCycles, statusFilter, envFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, envFilter, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedCycles.length / pageSize));
  const paginatedCycles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCycles.slice(start, start + pageSize);
  }, [processedCycles, currentPage, pageSize]);

  // Counts for header metrics
  const myCyclesCount = useMemo(() => enrichedCycles.filter((c) => c.devBugsCount > 0).length, [enrichedCycles]);
  const criticalDefectCount = useMemo(() => assignedBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length, [assignedBugs]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || envFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setEnvFilter('ALL');
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)' };
      case 'COMPLETED':
      case 'CLOSED':
        return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
      case 'PLANNED':
        return { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
      case 'CANCELLED':
        return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

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
            href="/developer/projects"
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
            <span>Projects</span>
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
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}>
          <div style={{ flex: '1 1 500px' }}>
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
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                Role: {project?.myRole || 'Developer'}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {project?.name || 'Project Testing Cycles'}
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: '6px 0 0', maxWidth: '680px', lineHeight: '1.45' }}>
              {project?.description || 'Browse testing cycles, filter by environment and active status, and inspect your assigned defects.'}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            padding: '12px 22px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Cycles
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text)', marginTop: '2px' }}>
                {allCycles.length}
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                My Cycles
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>
                {myCyclesCount}
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Defects
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: criticalDefectCount > 0 ? '#dc2626' : 'var(--color-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{assignedBugs.length}</span>
                {criticalDefectCount > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '1px 6px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                    {criticalDefectCount} crit
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scalable Controls Toolbar */}
        <div className="card" style={{
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px',
          background: '#ffffff',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}>
            {/* Left: Search Bar & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '6px 12px',
                gap: '8px',
                width: '240px',
              }}>
                <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search cycles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12.5px',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    width: '100%',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: '#f8fafc',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Active Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Environment Filter */}
              {availableEnvironments.length > 0 && (
                <select
                  value={envFilter}
                  onChange={(e) => setEnvFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: '#f8fafc',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">All Environments</option>
                  {availableEnvironments.map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Right: View Mode Toggles & Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* View Toggle (Grid / Table) */}
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '2px',
                borderRadius: '8px',
                gap: '2px',
                border: '1px solid var(--color-border)',
              }}>
                <button
                  type="button"
                  title="Card Grid View"
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                    color: viewMode === 'grid' ? '#4f46e5' : 'var(--color-text-muted)',
                    boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  title="Compact Table / List View"
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#4f46e5' : 'var(--color-text-muted)',
                    boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <List size={15} />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  loadProjectData();
                }}
                disabled={refreshing}
                title="Refresh testing cycles"
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 10px', height: '33px' }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '12px',
            }}>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>Active Filters:</span>

              {statusFilter !== 'ALL' && (
                <span style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  Status: {statusFilter.replace('_', ' ')}
                  <button onClick={() => setStatusFilter('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>✕</button>
                </span>
              )}

              {envFilter !== 'ALL' && (
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  Environment: {envFilter}
                  <button onClick={() => setEnvFilter('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>✕</button>
                </span>
              )}

              {searchQuery && (
                <span style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>✕</button>
                </span>
              )}

              <button
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11.5px',
                  textDecoration: 'underline',
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Count & Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {processedCycles.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, processedCycles.length)}`} of {processedCycles.length} {processedCycles.length === 1 ? 'cycle' : 'cycles'}
            {hasActiveFilters && ` (filtered from ${allCycles.length} total)`}
          </div>

          {/* Page size picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>Per page:</span>
            {[12, 24, 48].map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  background: pageSize === size ? '#4f46e5' : '#ffffff',
                  color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: '700',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section: Loading, Empty, Table, or Grid */}
        {loading ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', margin: 0 }}>
              Loading testing cycles...
            </p>
          </div>
        ) : allCycles.length === 0 ? (
          <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <RotateCcw size={42} style={{ color: 'var(--color-text-faint)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Active Testing Cycles
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0' }}>
              No testing cycles are currently in progress for this project. Once QA transitions a planned cycle to In Progress, it will appear here.
            </p>
          </div>
        ) : processedCycles.length === 0 ? (
          <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <Filter size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Cycles Match the Current Filters
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              No testing cycles matched your search or filter criteria.
            </p>
            <button
              onClick={resetFilters}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '14px' }}
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* TABLE VIEW: Optimized for High Volume / Maximum Testing Cycles           */
          /* ========================================================================= */
          <div className="card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    <th style={{ padding: '12px 16px', width: '90px' }}>Cycle #</th>
                    <th style={{ padding: '12px 16px' }}>Cycle Title & Scope</th>
                    <th style={{ padding: '12px 16px', width: '110px' }}>Type</th>
                    <th style={{ padding: '12px 16px', width: '110px' }}>Environment</th>
                    <th style={{ padding: '12px 16px', width: '130px' }}>Status</th>
                    <th style={{ padding: '12px 16px', width: '160px' }}>My Assigned Defects</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', width: '140px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCycles.map((cycle) => {
                    const statusBadge = getStatusBadgeStyle(cycle.status);
                    return (
                      <tr
                        key={cycle.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Cycle # */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            display: 'inline-block',
                            fontFamily: 'monospace',
                          }}>
                            #{cycle.cycleNumber || '01'}
                          </span>
                        </td>

                        {/* Title & Description */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '13.5px' }}>
                            {cycle.name}
                          </div>
                          {cycle.description && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                              maxWidth: '480px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {cycle.description}
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 16px' }}>
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
                        </td>

                        {/* Environment */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                          }}>
                            {cycle.environment || 'QA'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            ...statusBadge,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}>
                            {cycle.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Assigned Defects */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '12.5px',
                              fontWeight: '700',
                              color: cycle.devBugsCount > 0 ? '#4f46e5' : 'var(--color-text-faint)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}>
                              <Bug size={14} style={{ color: cycle.devBugsCount > 0 ? '#4f46e5' : 'var(--color-text-faint)' }} />
                              <span>{cycle.devBugsCount} defects</span>
                            </span>

                            {cycle.criticalCount > 0 && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                              }}>
                                {cycle.criticalCount} crit
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action CTA */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Link
                            href={`/developer/cycles/${cycle.id}/bugs`}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '12px',
                              padding: '5px 12px',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Open</span>
                            <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID VIEW: Responsive and compact for comfortable visual scanning         */
          /* ========================================================================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '18px',
          }}>
            {paginatedCycles.map((cycle) => {
              const statusBadge = getStatusBadgeStyle(cycle.status);
              return (
                <div
                  key={cycle.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    background: '#ffffff',
                  }}
                >
                  <div>
                    {/* Header Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2.5px 8px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontFamily: 'monospace',
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
                        ...statusBadge,
                        marginLeft: 'auto',
                      }}>
                        {cycle.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Cycle Title */}
                    <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                      {cycle.name}
                    </h3>

                    {cycle.description ? (
                      <p style={{
                        fontSize: '12.5px',
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
                    ) : (
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-faint)', margin: 0, fontStyle: 'italic' }}>
                        No scope description provided.
                      </p>
                    )}
                  </div>

                  {/* Defect Metrics Bar */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Bug size={15} style={{ color: cycle.devBugsCount > 0 ? '#4f46e5' : 'var(--color-text-muted)' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)' }}>
                        {cycle.devBugsCount} Assigned {cycle.devBugsCount === 1 ? 'Defect' : 'Defects'}
                      </span>
                    </div>

                    {cycle.criticalCount > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                      }}>
                        {cycle.criticalCount} Critical
                      </span>
                    )}
                  </div>

                  {/* Redirection Link */}
                  <Link
                    href={`/developer/cycles/${cycle.id}/bugs`}
                    className="btn btn-primary"
                    style={{
                      justifyContent: 'center',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>View Assigned Defects</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Scalable Pagination Footer Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
              Page {currentPage} of {totalPages}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {/* Numbered page pills (window of up to 5 pages) */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {showEllipsisBefore && (
                        <span style={{ padding: '0 4px', color: 'var(--color-text-faint)' }}>...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: currentPage === p ? '#4f46e5' : '#ffffff',
                          color: currentPage === p ? '#ffffff' : 'var(--color-text)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
