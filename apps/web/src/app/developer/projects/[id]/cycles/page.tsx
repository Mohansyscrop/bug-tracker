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
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Filter,
  X,
  ShieldCheck,
  User,
  Check,
  AlertCircle,
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
  completedAt?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  metrics?: {
    totalTests: number;
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
    passRate: number;
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
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  // Quick Tab Filter: 'ALL' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED'
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Search & View Mode
  const [searchQuery, setSearchQuery] = useState('');
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
      // Developer portal displays cycles once QA transitions them to IN_PROGRESS or beyond (excluding PLANNED)
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
      const highCount = cycleBugs.filter((b) => b.severity === 'HIGH' || b.priority === 'P2').length;
      const mediumLowCount = cycleBugs.length - criticalCount - highCount;

      const openCount = cycleBugs.filter((b) => ['OPEN', 'REOPENED', 'NEW', 'CONFIRMED'].includes(b.status?.toUpperCase())).length;
      const inProgressCount = cycleBugs.filter((b) => b.status === 'IN_PROGRESS').length;
      const fixedCount = cycleBugs.filter((b) => ['FIXED', 'RESOLVED', 'CLOSED'].includes(b.status?.toUpperCase())).length;

      const fixProgressPercent = cycleBugs.length > 0 ? Math.round((fixedCount / cycleBugs.length) * 100) : 100;
      const needsAttention = cycleBugs.length > 0 && (openCount + inProgressCount) > 0;

      return {
        ...cycle,
        devBugsCount: cycleBugs.length,
        criticalCount,
        highCount,
        mediumLowCount,
        openCount,
        inProgressCount,
        fixedCount,
        fixProgressPercent,
        needsAttention,
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

  // Tab counts
  const tabCounts = useMemo(() => {
    const actionRequired = enrichedCycles.filter((c) => c.needsAttention).length;
    const inProgress = enrichedCycles.filter((c) => c.status === 'IN_PROGRESS').length;
    const completed = enrichedCycles.filter((c) => c.status === 'COMPLETED' || c.status === 'CLOSED').length;
    return {
      all: enrichedCycles.length,
      actionRequired,
      inProgress,
      completed,
    };
  }, [enrichedCycles]);

  // Filtered & Sorted Cycles
  const processedCycles = useMemo(() => {
    return enrichedCycles
      .filter((cycle) => {
        // Tab Filter
        if (activeTab === 'ACTION_REQUIRED' && !cycle.needsAttention) return false;
        if (activeTab === 'IN_PROGRESS' && cycle.status !== 'IN_PROGRESS') return false;
        if (activeTab === 'COMPLETED' && cycle.status !== 'COMPLETED' && cycle.status !== 'CLOSED') return false;

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
      .sort((a, b) => {
        if (activeTab === 'ALL') {
          if (a.needsAttention && !b.needsAttention) return -1;
          if (!a.needsAttention && b.needsAttention) return 1;
        }
        return (b.cycleNumber || 0) - (a.cycleNumber || 0);
      });
  }, [enrichedCycles, activeTab, envFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, envFilter, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedCycles.length / pageSize));
  const paginatedCycles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCycles.slice(start, start + pageSize);
  }, [processedCycles, currentPage, pageSize]);

  // Counts for header metrics
  const myCyclesCount = useMemo(() => enrichedCycles.filter((c) => c.devBugsCount > 0).length, [enrichedCycles]);
  const actionRequiredDefects = useMemo(() => {
    return assignedBugs.filter((b) => ['OPEN', 'REOPENED', 'NEW', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status?.toUpperCase())).length;
  }, [assignedBugs]);
  const criticalDefectCount = useMemo(() => {
    return assignedBugs.filter((b) => (b.severity === 'CRITICAL' || b.priority === 'P1') && !['FIXED', 'CLOSED'].includes(b.status?.toUpperCase())).length;
  }, [assignedBugs]);
  const fixedDefectCount = useMemo(() => {
    return assignedBugs.filter((b) => ['FIXED', 'RESOLVED', 'CLOSED'].includes(b.status?.toUpperCase())).length;
  }, [assignedBugs]);

  const hasActiveFilters = searchQuery.trim() !== '' || envFilter !== 'ALL' || activeTab !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setEnvFilter('ALL');
    setActiveTab('ALL');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)' };
      case 'COMPLETED':
      case 'CLOSED':
        return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
      case 'CANCELLED':
        return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: '20px 28px 48px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Clean Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '16px',
        }}>
          <Link
            href="/developer/projects"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Projects</span>
          </Link>
          <ChevronRight size={13} style={{ color: 'var(--color-text-faint)' }} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
            {project?.name || 'Project'}
          </span>
          <ChevronRight size={13} style={{ color: 'var(--color-text-faint)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Testing Cycles</span>
        </nav>

        {/* Project Header Banner with Stats */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px 24px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(15, 58, 86, 0.08)',
                color: '#0F3A56',
                border: '1px solid rgba(15, 58, 86, 0.2)',
              }}>
                {project?.key || 'PROJ'}
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                {project?.name || 'Project Testing Cycles'}
              </h1>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 18px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Cycles
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', marginTop: '1px' }}>
                {allCycles.length}
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', background: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                My Cycles
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#4f46e5', marginTop: '1px' }}>
                {myCyclesCount}
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', background: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Action Needed
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '800',
                color: actionRequiredDefects > 0 ? (criticalDefectCount > 0 ? '#dc2626' : '#ea580c') : '#059669',
                marginTop: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>{actionRequiredDefects}</span>
                {criticalDefectCount > 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                  }}>
                    {criticalDefectCount} crit
                  </span>
                )}
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', background: 'var(--color-border)' }} />

            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Resolved
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669', marginTop: '1px' }}>
                {fixedDefectCount}
              </div>
            </div>
          </div>
        </div>

        {/* UNIFIED COMPACT TOOLBAR: Tabs & Filters Collapsed into 1 Sleek Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* Left: Compact Segmented Tab Pills */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '9px',
            gap: '3px',
            border: '1px solid var(--color-border)',
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                color: activeTab === 'ALL' ? '#1e293b' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'ALL' ? '700' : '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>All Cycles</span>
              <span style={{
                fontSize: '10.5px',
                padding: '0 5px',
                borderRadius: '8px',
                background: activeTab === 'ALL' ? '#e2e8f0' : 'rgba(0,0,0,0.05)',
                color: 'inherit',
                fontWeight: '700',
              }}>
                {tabCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'ACTION_REQUIRED' ? '#ffffff' : 'transparent',
                color: activeTab === 'ACTION_REQUIRED' ? '#c2410c' : (tabCounts.actionRequired > 0 ? '#ea580c' : 'var(--color-text-muted)'),
                fontWeight: activeTab === 'ACTION_REQUIRED' ? '700' : '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'ACTION_REQUIRED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <AlertCircle size={13} />
              <span>Needs Attention</span>
              <span style={{
                fontSize: '10.5px',
                padding: '0 5px',
                borderRadius: '8px',
                background: activeTab === 'ACTION_REQUIRED' ? '#ffedd5' : (tabCounts.actionRequired > 0 ? '#fee2e2' : 'rgba(0,0,0,0.05)'),
                color: activeTab === 'ACTION_REQUIRED' ? '#c2410c' : (tabCounts.actionRequired > 0 ? '#b91c1c' : 'inherit'),
                fontWeight: '700',
              }}>
                {tabCounts.actionRequired}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('IN_PROGRESS')}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'IN_PROGRESS' ? '#ffffff' : 'transparent',
                color: activeTab === 'IN_PROGRESS' ? '#2563eb' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'IN_PROGRESS' ? '700' : '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'IN_PROGRESS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Active Testing</span>
              <span style={{
                fontSize: '10.5px',
                padding: '0 5px',
                borderRadius: '8px',
                background: activeTab === 'IN_PROGRESS' ? '#dbeafe' : 'rgba(0,0,0,0.05)',
                color: 'inherit',
                fontWeight: '700',
              }}>
                {tabCounts.inProgress}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COMPLETED')}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'COMPLETED' ? '#ffffff' : 'transparent',
                color: activeTab === 'COMPLETED' ? '#047857' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'COMPLETED' ? '700' : '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'COMPLETED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Completed</span>
              <span style={{
                fontSize: '10.5px',
                padding: '0 5px',
                borderRadius: '8px',
                background: activeTab === 'COMPLETED' ? '#d1fae5' : 'rgba(0,0,0,0.05)',
                color: 'inherit',
                fontWeight: '700',
              }}>
                {tabCounts.completed}
              </span>
            </button>
          </div>

          {/* Right: Search, Environment & View Switches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '5px 10px',
              gap: '6px',
              width: '210px',
            }}>
              <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search cycles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
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
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Environment select (only if available) */}
            {availableEnvironments.length > 0 && (
              <select
                value={envFilter}
                onChange={(e) => setEnvFilter(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  outline: 'none',
                  height: '31px',
                }}
              >
                <option value="ALL">All Environments</option>
                {availableEnvironments.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            )}

            {/* View Mode Toggle */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '7px',
              gap: '2px',
              border: '1px solid var(--color-border)',
            }}>
              <button
                type="button"
                title="Card Grid View"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                title="Compact Table View"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <List size={14} />
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
              style={{ padding: '5px 8px', height: '31px' }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Active Filter Clear Tag */}
        {hasActiveFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
            fontSize: '11.5px',
          }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Filtered results:</span>
            {activeTab !== 'ALL' && (
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                {activeTab === 'ACTION_REQUIRED' ? 'Needs Attention' : activeTab.replace('_', ' ')}
              </span>
            )}
            {envFilter !== 'ALL' && (
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                {envFilter}
              </span>
            )}
            {searchQuery && (
              <span style={{ background: '#f1f5f9', color: '#334155', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                "{searchQuery}"
              </span>
            )}
            <button
              onClick={resetFilters}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Content Section: Loading, Empty, Table, or Grid */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              Loading testing cycles...
            </p>
          </div>
        ) : allCycles.length === 0 ? (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <RotateCcw size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Active Testing Cycles
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0' }}>
              No testing cycles are currently in progress for this project.
            </p>
          </div>
        ) : processedCycles.length === 0 ? (
          <div className="card" style={{ padding: '36px 24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <Filter size={32} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              {activeTab === 'ACTION_REQUIRED' ? 'All Clear! No Action Needed' : 'No Cycles Found'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {activeTab === 'ACTION_REQUIRED'
                ? 'You have zero open bugs in the current active cycles.'
                : 'No cycles match your filter criteria.'}
            </p>
            <button
              onClick={resetFilters}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* TABLE VIEW: Compact & Structured                                         */
          /* ========================================================================= */
          <div className="card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    <th style={{ padding: '10px 14px', width: '70px' }}>Cycle #</th>
                    <th style={{ padding: '10px 14px' }}>Cycle Title & Environment</th>
                    <th style={{ padding: '10px 14px', width: '130px' }}>QA Lead</th>
                    <th style={{ padding: '10px 14px', width: '110px' }}>Status</th>
                    <th style={{ padding: '10px 14px', width: '180px' }}>Bugs</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '110px' }}>Action</th>
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
                          background: cycle.needsAttention ? 'rgba(254, 242, 242, 0.3)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Cycle # */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            fontFamily: 'monospace',
                          }}>
                            #{String(cycle.cycleNumber || '01').padStart(2, '0')}
                          </span>
                        </td>

                        {/* Title & Env */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '13px' }}>
                              {cycle.name}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                            }}>
                              {cycle.environment || 'QA'}
                            </span>
                          </div>
                        </td>

                        {/* QA Lead */}
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {cycle.createdBy?.name || 'QA Lead'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            ...statusBadge,
                            textTransform: 'uppercase',
                          }}>
                            {cycle.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Bugs */}
                        <td style={{ padding: '12px 14px' }}>
                          {cycle.devBugsCount > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: cycle.needsAttention ? '#dc2626' : '#059669',
                              }}>
                                {cycle.devBugsCount} {cycle.devBugsCount === 1 ? 'Bug' : 'Bugs'}
                              </span>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: cycle.fixProgressPercent === 100 ? '#d1fae5' : '#fee2e2',
                                color: cycle.fixProgressPercent === 100 ? '#047857' : '#b91c1c',
                              }}>
                                {cycle.fixedCount}/{cycle.devBugsCount} Fixed
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={13} style={{ color: '#059669' }} />
                              <span>0 bugs</span>
                            </span>
                          )}
                        </td>

                        {/* Action CTA */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <Link
                            href={`/developer/cycles/${cycle.id}/bugs`}
                            className={cycle.needsAttention ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                            style={{
                              fontSize: '11.5px',
                              padding: '4px 10px',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Open</span>
                            <ArrowRight size={12} />
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
          /* GRID VIEW: Compact, High-Density Professional Developer Cards             */
          /* ========================================================================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            {paginatedCycles.map((cycle) => {
              const statusBadge = getStatusBadgeStyle(cycle.status);
              const startDateFormatted = formatDate(cycle.startDate);

              return (
                <div
                  key={cycle.id}
                  className="card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: cycle.criticalCount > 0
                      ? '#fca5a5'
                      : cycle.needsAttention
                        ? '#fdba74'
                        : 'var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                    background: '#ffffff',
                  }}
                >
                  {/* Top Row: Badges & Status */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          fontFamily: 'monospace',
                        }}>
                          #{String(cycle.cycleNumber || '01').padStart(2, '0')}
                        </span>

                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          textTransform: 'uppercase',
                        }}>
                          {cycle.environment || 'QA'}
                        </span>

                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#475569',
                          textTransform: 'uppercase',
                        }}>
                          {cycle.type || 'FUNCTIONAL'}
                        </span>
                      </div>

                      {/* Urgency Badge */}
                      <div>
                        {cycle.criticalCount > 0 ? (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#b91c1c' }} />
                            {cycle.criticalCount} Blocker
                          </span>
                        ) : cycle.needsAttention ? (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: '#ffedd5',
                            color: '#c2410c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <AlertCircle size={11} />
                            Action Needed
                          </span>
                        ) : cycle.devBugsCount > 0 ? (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}>
                            <Check size={11} />
                            All Fixed
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            ...statusBadge,
                            textTransform: 'uppercase',
                          }}>
                            {cycle.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cycle Title */}
                    <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 4px', lineHeight: '1.3' }}>
                      {cycle.name}
                    </h3>

                    {/* Metadata line */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: 'var(--color-text-muted)',
                      flexWrap: 'wrap',
                    }}>
                      <span>QA: {cycle.createdBy?.name || 'QA Lead'}</span>
                      <span>•</span>
                      <span>{cycle.metrics?.totalBugs ?? 1} Cycle Bug{(cycle.metrics?.totalBugs ?? 1) === 1 ? '' : 's'}</span>
                      {startDateFormatted && (
                        <>
                          <span>•</span>
                          <span>{startDateFormatted}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compact Bottom Row: Bug Summary & CTA */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9',
                    marginTop: '2px',
                    gap: '10px',
                  }}>
                    {/* Left: Bugs badge & mini status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto' }}>
                      {cycle.devBugsCount > 0 ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Bug size={14} style={{ color: cycle.needsAttention ? '#ea580c' : '#059669' }} />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text)' }}>
                              {cycle.devBugsCount} {cycle.devBugsCount === 1 ? 'Bug' : 'Bugs'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: cycle.fixProgressPercent === 100 ? '#d1fae5' : '#fee2e2',
                            color: cycle.fixProgressPercent === 100 ? '#047857' : '#b91c1c',
                          }}>
                            {cycle.fixedCount}/{cycle.devBugsCount} Fixed
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={13} style={{ color: '#059669' }} />
                          <span>0 bugs</span>
                        </span>
                      )}
                    </div>

                    {/* Right: CTA Button */}
                    <Link
                      href={`/developer/cycles/${cycle.id}/bugs`}
                      className={cycle.needsAttention ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span>{cycle.devBugsCount > 0 ? 'View Bugs' : 'Inspect'}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scalable Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '22px',
            paddingTop: '14px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
              Page {currentPage} of {totalPages}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
