'use client';
import AppLayout from '@/components/AppLayout';
import TablePagination from '@/components/TablePagination';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { bugsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import Link from 'next/link';
import {
  RotateCcw,
  Bug,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  CheckCircle,
  Search,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  LayoutGrid,
  List,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

interface TestingCycleDetail {
  id: string;
  projectId: string;
  name: string;
  cycleNumber: number;
  description?: string;
  scope?: string;
  type: string;
  status: string;
  environment: string;
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
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  severity: string;
  priority: string;
  status: string;
  resolution?: string;
  environment?: string;
  bugArea?: string;
  testingCycleId?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; key: string; name: string };
  assignedTo?: { id: string; name: string; email: string };
  reportedBy?: { id: string; name: string; email: string };
}

export default function CycleAssignedBugsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const cycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<TestingCycleDetail | null>(null);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  // View Controls
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'FIXED' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Status transition state
  const [transitioningBugId, setTransitioningBugId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Status transition modal
  const [statusModalBug, setStatusModalBug] = useState<BugItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusComment, setStatusComment] = useState('');

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    toast[type](text);
    setTimeout(() => setToastMessage(null), 4000);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user || !cycleId) return;
    try {
      const [cycleRes, bugsRes] = await Promise.all([
        testingCyclesApi.get(cycleId),
        bugsApi.list({ testingCycleId: cycleId, assignedTo: user.id, limit: 100 }),
      ]);
      const rawCycle = (cycleRes as any)?.data || cycleRes;
      setCycle(rawCycle);
      setAssignedBugs(bugsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load cycle bugs', err);
      showToast(err?.message || 'Error loading bugs for this cycle', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, cycleId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall Cycle Stats
  const metrics = useMemo(() => {
    const total = assignedBugs.length;
    const inProgress = assignedBugs.filter((b) => b.status === 'IN_PROGRESS').length;
    const fixed = assignedBugs.filter((b) => b.status === 'FIXED' || b.status === 'CLOSED').length;
    const pending = assignedBugs.filter((b) => ['NEW', 'ASSIGNED', 'REOPENED', 'CONFIRMED'].includes(b.status?.toUpperCase())).length;
    const critical = assignedBugs.filter((b) => b.priority === 'P1' || b.severity === 'CRITICAL').length;
    return { total, inProgress, fixed, pending, critical };
  }, [assignedBugs]);

  // Filtered & Sorted Bugs
  const filteredBugs = useMemo(() => {
    let result = assignedBugs.filter((bug) => {
      // 1. Workflow tab filter
      if (activeTab === 'IN_PROGRESS' && bug.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'PENDING' && !['NEW', 'ASSIGNED', 'REOPENED', 'CONFIRMED'].includes(bug.status?.toUpperCase())) return false;
      if (activeTab === 'FIXED' && !['FIXED', 'CLOSED'].includes(bug.status?.toUpperCase())) return false;
      if (activeTab === 'CRITICAL' && bug.priority !== 'P1' && bug.severity !== 'CRITICAL') return false;

      // 2. Priority Filter
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mDesc = bug.description?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mDesc && !mArea) return false;
      }
      return true;
    });

    // Default Sort: Priority (P1 first), then newest
    const priorityWeights: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    result.sort((a, b) => {
      const wA = priorityWeights[a.priority] || 99;
      const wB = priorityWeights[b.priority] || 99;
      if (wA !== wB) return wA - wB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [assignedBugs, activeTab, priorityFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredBugs.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const paginatedBugs = useMemo(() => {
    if (pageSize === 0) return filteredBugs;
    const start = (currentPage - 1) * pageSize;
    return filteredBugs.slice(start, start + pageSize);
  }, [filteredBugs, currentPage, pageSize]);

  // Direct status transition
  const handleDirectTransition = async (bug: BugItem, nextStatus: string) => {
    setTransitioningBugId(bug.id);
    try {
      await bugsApi.transition(bug.id, { status: nextStatus });
      setAssignedBugs((prev) =>
        prev.map((b) => (b.id === bug.id ? { ...b, status: nextStatus, updatedAt: new Date().toISOString() } : b))
      );
      showToast(`Status updated to ${nextStatus.replace('_', ' ')} for ${bug.issueKey}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setTransitioningBugId(null);
    }
  };

  const handleModalTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalBug || !targetStatus) return;

    setTransitioningBugId(statusModalBug.id);
    try {
      await bugsApi.transition(statusModalBug.id, {
        status: targetStatus,
        comment: statusComment.trim() ? statusComment.trim() : undefined,
      });
      setAssignedBugs((prev) =>
        prev.map((b) =>
          b.id === statusModalBug.id
            ? { ...b, status: targetStatus, updatedAt: new Date().toISOString() }
            : b
        )
      );
      showToast(`Status updated to ${targetStatus.replace('_', ' ')} for ${statusModalBug.issueKey}`);
      setStatusModalBug(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to transition status', 'error');
    } finally {
      setTransitioningBugId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', text: '#4f46e5', label: 'In Progress' };
      case 'ASSIGNED':
      case 'NEW':
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: status === 'NEW' ? 'New' : 'Assigned' };
      case 'FIXED':
        return { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Fixed' };
      case 'CANNOT_REPRODUCE':
        return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: 'Cannot Reproduce' };
      case 'REJECTED':
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Rejected' };
      case 'REOPENED':
        return { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', label: 'Reopened' };
      case 'CLOSED':
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: 'Closed' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: status };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'P1 Critical' };
      case 'P2':
        return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'P2 High' };
      case 'P3':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'P3 Medium' };
      case 'P4':
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: 'P4 Low' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: priority };
    }
  };

  const resetAllFilters = () => {
    setActiveTab('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = activeTab !== 'ALL' || priorityFilter !== 'ALL' || !!searchQuery.trim();

  return (
    <AppLayout>
      <div style={{ padding: '20px 28px 48px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

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
          {cycle?.projectId ? (
            <Link
              href={`/developer/projects/${cycle.projectId}/cycles`}
              style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}
            >
              {cycle.project?.name || 'Project'} Cycles
            </Link>
          ) : (
            <span>Cycles</span>
          )}
          <ChevronRight size={13} style={{ color: 'var(--color-text-faint)' }} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
            {cycle?.name || 'Cycle'}
          </span>
          <ChevronRight size={13} style={{ color: 'var(--color-text-faint)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Bugs</span>
        </nav>

        {/* Cycle Header Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 22px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: '5px',
                background: '#e0e7ff',
                color: '#4338ca',
              }}>
                CYCLE #{String(cycle?.cycleNumber || '01').padStart(2, '0')}
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
                {cycle?.environment || 'STAGING'}
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
                {cycle?.type || 'FUNCTIONAL'}
              </span>

              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#4f46e5',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                textTransform: 'uppercase',
              }}>
                {cycle?.status?.replace('_', ' ') || 'IN PROGRESS'}
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {cycle?.name || 'Cycle Bugs'}
            </h1>
          </div>

          {cycle?.description && (
            <p style={{
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
              margin: 0,
              maxWidth: '480px',
              lineHeight: '1.4',
            }}>
              {cycle.description}
            </p>
          )}
        </div>

        {/* UNIFIED COMPACT TOOLBAR: Segmented Tabs & Controls in 1 Single Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* Left: Segmented Tabs */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '9px',
            gap: '3px',
            border: '1px solid var(--color-border)',
          }}>
            {[
              { id: 'ALL', label: 'All Bugs', count: metrics.total },
              { id: 'PENDING', label: 'Needs Action', count: metrics.pending },
              { id: 'IN_PROGRESS', label: 'In Progress', count: metrics.inProgress },
              { id: 'FIXED', label: 'Fixed', count: metrics.fixed },
              ...(metrics.critical > 0 ? [{ id: 'CRITICAL', label: 'Critical', count: metrics.critical }] : []),
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#1e293b' : 'var(--color-text-muted)',
                    fontWeight: isActive ? '700' : '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '0 5px',
                    borderRadius: '8px',
                    background: isActive ? (tab.id === 'CRITICAL' ? '#fee2e2' : '#e2e8f0') : 'rgba(0,0,0,0.05)',
                    color: isActive ? (tab.id === 'CRITICAL' ? '#b91c1c' : 'inherit') : 'inherit',
                    fontWeight: '700',
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Search, Priority & Consistent View Toggle */}
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
                placeholder="Search key or title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '31px',
                fontSize: '12px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: '#ffffff',
                fontWeight: '600',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 Critical</option>
              <option value="P2">P2 High</option>
              <option value="P3">P3 Medium</option>
              <option value="P4">P4 Low</option>
            </select>

            {/* EXACT UNIFORM VIEW TOGGLE: Same as Projects/Cycles pages */}
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
                setLoading(true);
                loadData();
              }}
              disabled={loading}
              title="Refresh bugs"
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px', height: '31px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
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
                {activeTab.replace('_', ' ')}
              </span>
            )}
            {priorityFilter !== 'ALL' && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                {priorityFilter}
              </span>
            )}
            {searchQuery && (
              <span style={{ background: '#f1f5f9', color: '#334155', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                "{searchQuery}"
              </span>
            )}
            <button
              onClick={resetAllFilters}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Content: Loading, Empty, Table, or Grid */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              Loading cycle bugs...
            </p>
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <CheckCircle size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Bugs Found
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
              {assignedBugs.length === 0
                ? 'No bugs are found in this testing cycle.'
                : 'No bugs match the selected filters or search query.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* TABLE VIEW: Developer-Friendly & High-Density                             */
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
                    <th style={{ padding: '10px 14px', width: '90px' }}>Key</th>
                    <th style={{ padding: '10px 14px', width: '110px' }}>Priority</th>
                    <th style={{ padding: '10px 14px', width: '90px' }}>Area</th>
                    <th style={{ padding: '10px 14px' }}>Bug Title & Summary</th>
                    <th style={{ padding: '10px 14px', width: '130px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBugs.map((bug, index) => {
                    const statusBadge = getStatusBadge(bug.status);
                    const priorityBadge = getPriorityBadge(bug.priority);
                    const isTransitioning = transitioningBugId === bug.id;
                    const serialNumber = (currentPage - 1) * effectivePageSize + index + 1;

                    return (
                      <tr
                        key={bug.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* S.No */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {serialNumber}
                        </td>

                        {/* Issue Key */}
                        <td style={{ padding: '10px 14px' }}>
                          <Link
                            href={`/bugs/${bug.id}`}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-block',
                              textDecoration: 'none',
                            }}
                          >
                            {bug.issueKey}
                          </Link>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: priorityBadge.bg,
                            color: priorityBadge.text,
                            border: `1px solid ${priorityBadge.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {priorityBadge.label}
                          </span>
                        </td>

                        {/* Area */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1.5px 5px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            textTransform: 'uppercase',
                          }}>
                            {bug.bugArea || 'APP'}
                          </span>
                        </td>

                        {/* Title & Preview */}
                        <td style={{ padding: '10px 14px' }}>
                          <Link
                            href={`/bugs/${bug.id}`}
                            style={{
                              fontWeight: '700',
                              color: 'var(--color-text)',
                              fontSize: '13px',
                              textDecoration: 'none',
                              display: 'block',
                            }}
                          >
                            {bug.title}
                          </Link>
                          {bug.description && (
                            <div style={{
                              fontSize: '11.5px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                              maxWidth: '480px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {bug.description}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: statusBadge.bg,
                            color: statusBadge.text,
                            border: `1px solid ${statusBadge.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusBadge.text }} />
                            <span>{statusBadge.label}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {(bug.status === 'NEW' || bug.status === 'ASSIGNED') && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                                className="btn btn-primary btn-sm"
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 7px',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <PlayCircle size={11} />
                                <span>Start</span>
                              </button>
                            )}

                            {bug.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'FIXED')}
                                className="btn btn-sm"
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 7px',
                                  borderRadius: '5px',
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: '700',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Check size={11} />
                                <span>Fixed</span>
                              </button>
                            )}

                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: '11.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              itemLabel="bugs"
            />
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID VIEW: Compact, High-Density Developer Cards                          */
          /* ========================================================================= */
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}>
            {paginatedBugs.map((bug) => {
              const statusBadge = getStatusBadge(bug.status);
              const priorityBadge = getPriorityBadge(bug.priority);
              const isTransitioning = transitioningBugId === bug.id;

              return (
                <div
                  key={bug.id}
                  className="card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: '#ffffff',
                  }}
                >
                  <div>
                    {/* Top Row: Key, Priority, Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Link
                          href={`/bugs/${bug.id}`}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            textDecoration: 'none',
                          }}
                        >
                          {bug.issueKey}
                        </Link>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: priorityBadge.bg,
                          color: priorityBadge.text,
                        }}>
                          {bug.priority}
                        </span>
                        {bug.bugArea && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1.5px 5px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'uppercase',
                          }}>
                            {bug.bugArea}
                          </span>
                        )}
                      </div>

                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: statusBadge.bg,
                        color: statusBadge.text,
                        border: `1px solid ${statusBadge.border}`,
                      }}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Title & Preview */}
                    <Link
                      href={`/bugs/${bug.id}`}
                      style={{
                        fontSize: '14.5px',
                        fontWeight: '800',
                        color: 'var(--color-text)',
                        margin: '0 0 4px',
                        lineHeight: '1.3',
                        textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      {bug.title}
                    </Link>
                    {bug.description && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {bug.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    <Link
                      href={`/bugs/${bug.id}`}
                      style={{
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Full View Page</span>
                      <ArrowRight size={13} />
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(bug.status === 'NEW' || bug.status === 'ASSIGNED') && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          Start
                        </button>
                      )}

                      {bug.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleDirectTransition(bug, 'FIXED')}
                          className="btn btn-sm"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '700',
                          }}
                        >
                          Fixed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              itemLabel="bugs"
            />
          </div>
        </>
      )}

        {/* Modal: Status Transition with Comment */}
        {statusModalBug && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                  Transition Bug: {statusModalBug.issueKey}
                </h3>
                <button onClick={() => setStatusModalBug(null)} className="btn btn-ghost btn-sm">✕</button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
                Changing status to <strong style={{ color: '#4f46e5' }}>{targetStatus.replace('_', ' ')}</strong>.
              </p>

              <form onSubmit={handleModalTransitionSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Reason or Resolution Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Provide details why this bug cannot be reproduced or is rejected..."
                    className="input"
                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setStatusModalBug(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={transitioningBugId === statusModalBug.id} className="btn btn-primary btn-sm">
                    {transitioningBugId === statusModalBug.id ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
