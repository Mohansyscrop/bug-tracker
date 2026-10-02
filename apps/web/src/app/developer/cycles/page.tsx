'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { testingCyclesApi, bugsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  Bug,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

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
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  metrics?: {
    totalBugs?: number;
    openBugs?: number;
  };
  project?: {
    id: string;
    key: string;
    name: string;
  };
}

interface BugItem {
  id: string;
  issueKey: string;
  projectId: string;
  testingCycleId?: string;
  severity: string;
  priority: string;
  status: string;
}

export default function DeveloperAllCyclesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  // Workflow Tabs & Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const loadData = async () => {
    if (!user) return;
    try {
      const [cyclesRes, bugsRes] = await Promise.all([
        testingCyclesApi.list(),
        bugsApi.list({ assignedTo: user.id, limit: 100 }),
      ]);
      const rawCycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
      setAllCycles(rawCycles);
      setAssignedBugs(bugsRes.data || []);
    } catch (err) {
      console.error('Failed to load cycles', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Enrich cycles with developer assignment metrics
  const enrichedCycles = useMemo(() => {
    return allCycles
      .filter((cycle) => cycle.status !== 'PLANNED')
      .map((cycle) => {
        const cycleBugs = assignedBugs.filter((b) => b.testingCycleId === cycle.id);
        const criticalCount = cycleBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
        const openCount = cycleBugs.filter((b) => ['OPEN', 'REOPENED', 'NEW', 'CONFIRMED', 'ASSIGNED'].includes(b.status?.toUpperCase())).length;
        const inProgressCount = cycleBugs.filter((b) => b.status === 'IN_PROGRESS').length;
        const fixedCount = cycleBugs.filter((b) => ['FIXED', 'RESOLVED', 'CLOSED'].includes(b.status?.toUpperCase())).length;

        const fixProgressPercent = cycleBugs.length > 0 ? Math.round((fixedCount / cycleBugs.length) * 100) : 100;
        const needsAttention = cycleBugs.length > 0 && (openCount + inProgressCount) > 0;

        return {
          ...cycle,
          devBugsCount: cycleBugs.length,
          criticalCount,
          openCount,
          inProgressCount,
          fixedCount,
          fixProgressPercent,
          needsAttention,
        };
      })
      .filter((cycle) => cycle.devBugsCount > 0); // Cycles with developer defects
  }, [allCycles, assignedBugs]);

  // Available projects for filtering
  const availableProjects = useMemo(() => {
    const map = new Map<string, { id: string; key: string; name: string }>();
    enrichedCycles.forEach((c) => {
      if (c.project) {
        map.set(c.project.id, c.project);
      }
    });
    return Array.from(map.values());
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
        // Tab filter
        if (activeTab === 'ACTION_REQUIRED' && !cycle.needsAttention) return false;
        if (activeTab === 'IN_PROGRESS' && cycle.status !== 'IN_PROGRESS') return false;
        if (activeTab === 'COMPLETED' && cycle.status !== 'COMPLETED' && cycle.status !== 'CLOSED') return false;

        // Project filter
        if (projectFilter !== 'ALL' && cycle.project?.id !== projectFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mName = cycle.name?.toLowerCase().includes(q);
          const mProj = cycle.project?.name?.toLowerCase().includes(q) || cycle.project?.key?.toLowerCase().includes(q);
          const mNum = `cycle ${cycle.cycleNumber}`.toLowerCase().includes(q) || String(cycle.cycleNumber).includes(q);
          const mEnv = cycle.environment?.toLowerCase().includes(q);
          if (!mName && !mProj && !mNum && !mEnv) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        return (b.cycleNumber || 0) - (a.cycleNumber || 0);
      });
  }, [enrichedCycles, activeTab, projectFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, projectFilter, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedCycles.length / pageSize));
  const paginatedCycles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCycles.slice(start, start + pageSize);
  }, [processedCycles, currentPage, pageSize]);

  const hasActiveFilters = searchQuery.trim() !== '' || projectFilter !== 'ALL' || activeTab !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setProjectFilter('ALL');
    setActiveTab('ALL');
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

        {/* Clean, Uniform Breadcrumb Navigation */}
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
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>All Testing Cycles</span>
        </nav>

        {/* Header Banner */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <RotateCcw size={20} style={{ color: '#0F3A56' }} />
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                All Testing Cycles
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(15, 58, 86, 0.08)',
                color: '#0F3A56',
                border: '1px solid rgba(15, 58, 86, 0.2)',
              }}>
                {enrichedCycles.length}
              </span>
            </div>
          </div>
        </div>

        {/* UNIFIED SINGLE-ROW TOOLBAR: Tabs & Controls in 1 Clean Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '16px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}>
          {/* Left: Segmented Tabs */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '2.5px',
            borderRadius: '8px',
            gap: '2px',
            border: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                color: activeTab === 'ALL' ? '#1e293b' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'ALL' ? '700' : '600',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: activeTab === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>All Cycles</span>
              <span style={{
                fontSize: '10px',
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
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'ACTION_REQUIRED' ? '#ffffff' : 'transparent',
                color: activeTab === 'ACTION_REQUIRED' ? '#c2410c' : (tabCounts.actionRequired > 0 ? '#ea580c' : 'var(--color-text-muted)'),
                fontWeight: activeTab === 'ACTION_REQUIRED' ? '700' : '600',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: activeTab === 'ACTION_REQUIRED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <AlertCircle size={12} />
              <span>Needs Attention</span>
              <span style={{
                fontSize: '10px',
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
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'IN_PROGRESS' ? '#ffffff' : 'transparent',
                color: activeTab === 'IN_PROGRESS' ? '#2563eb' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'IN_PROGRESS' ? '700' : '600',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: activeTab === 'IN_PROGRESS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Active Testing</span>
              <span style={{
                fontSize: '10px',
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
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'COMPLETED' ? '#ffffff' : 'transparent',
                color: activeTab === 'COMPLETED' ? '#047857' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'COMPLETED' ? '700' : '600',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: activeTab === 'COMPLETED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Completed</span>
              <span style={{
                fontSize: '10px',
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

          {/* Right: Search, Project Filter & UNIFIED VIEW TOGGLE in Same Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '4px 9px',
              gap: '6px',
              width: '180px',
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

            {/* Project Filter */}
            {availableProjects.length > 1 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{
                  height: '29px',
                  fontSize: '11.5px',
                  padding: '0 8px',
                  borderRadius: '7px',
                  border: '1px solid var(--color-border)',
                  background: '#ffffff',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '130px',
                }}
              >
                <option value="ALL">All Projects</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key}
                  </option>
                ))}
              </select>
            )}

            {/* UNIFIED VIEW TOGGLE */}
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
                loadData();
              }}
              disabled={refreshing}
              title="Refresh testing cycles"
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', height: '29px' }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>


        {/* Filter Clear Pill */}
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
            {projectFilter !== 'ALL' && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                Project: {availableProjects.find((p) => p.id === projectFilter)?.key || projectFilter}
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

        {/* Results Summary Count & Per Page Size Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {processedCycles.length === 0 ? '0' : (currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, processedCycles.length)} of {processedCycles.length} {processedCycles.length === 1 ? 'cycle' : 'cycles'}
            {hasActiveFilters && ` (filtered from ${enrichedCycles.length} total)`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>Per page:</span>
            {[10, 20, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: pageSize === size ? '#4f46e5' : '#ffffff',
                  color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                  border: pageSize === size ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                  boxShadow: pageSize === size ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
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

        {/* Content: Loading, Empty, Table, or Grid */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              Loading testing cycles...
            </p>
          </div>
        ) : enrichedCycles.length === 0 ? (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <RotateCcw size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Testing Cycles Found
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0' }}>
              You do not have any testing cycles with bugs right now.
            </p>
          </div>
        ) : processedCycles.length === 0 ? (
          <div className="card" style={{ padding: '36px 24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              {activeTab === 'ACTION_REQUIRED' ? 'All Clear! No Action Needed' : 'No Cycles Match Filters'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No cycles match your active filters or search query.
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
          /* COMPACT DEVELOPER TABLE VIEW                                              */
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
                    <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '10px 14px', width: '80px' }}>Project</th>
                    <th style={{ padding: '10px 14px', width: '70px' }}>Cycle #</th>
                    <th style={{ padding: '10px 14px' }}>Cycle Title & Environment</th>
                    <th style={{ padding: '10px 14px', width: '110px' }}>Status</th>
                    <th style={{ padding: '10px 14px', width: '180px' }}>Bugs</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCycles.map((cycle, index) => {
                    const statusBadge = getStatusBadgeStyle(cycle.status);
                    const serialNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr
                        key={cycle.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: cycle.needsAttention ? 'rgba(254, 242, 242, 0.3)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* S.No */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {serialNumber}
                        </td>

                        {/* Project Key */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}>
                            {cycle.project?.key || 'PROJ'}
                          </span>
                        </td>

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
          /* COMPACT DEVELOPER CARDS (EXACT SAME AS PROJECT CYCLES PAGE)               */
          /* ========================================================================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            {paginatedCycles.map((cycle) => {
              const statusBadge = getStatusBadgeStyle(cycle.status);

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
                  {/* Top Row: Project Key, Badges & Status */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        {cycle.project && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}>
                            {cycle.project.key}
                          </span>
                        )}

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
                      <span>Project: {cycle.project?.name || 'Assigned'}</span>
                      {cycle.description && (
                        <>
                          <span>•</span>
                          <span style={{
                            maxWidth: '220px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {cycle.description}
                          </span>
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
                      <span>View Bugs</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scalable Full Pagination Footer for Large Volume Cycles */}
        {processedCycles.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
              Page {currentPage} of {totalPages} ({processedCycles.length} total cycles)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <ChevronLeft size={13} />
                <span>Previous</span>
              </button>

              {/* Numbered Page Buttons */}
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
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          border: currentPage === p ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                          background: currentPage === p ? '#4f46e5' : '#ffffff',
                          color: currentPage === p ? '#ffffff' : 'var(--color-text)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: currentPage === p ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
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
                disabled={currentPage >= totalPages}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
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
