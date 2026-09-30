'use client';
import AppLayout from '@/components/AppLayout';
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
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  Check,
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

  // High-Volume / Developer View Controls
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'PENDING' | 'FIXED' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'key'>('priority');

  // Pagination for 50+ bugs
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Status transition state
  const [transitioningBugId, setTransitioningBugId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Status transition modal with comment
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
    } catch (err) {
      console.error('Failed to load cycle defects', err);
      showToast('Error loading defects for this cycle', 'error');
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
    const pending = assignedBugs.filter((b) => b.status === 'ASSIGNED' || b.status === 'NEW' || b.status === 'REOPENED').length;
    const critical = assignedBugs.filter((b) => b.priority === 'P1' || b.severity === 'CRITICAL').length;
    return { total, inProgress, fixed, pending, critical };
  }, [assignedBugs]);

  // Filtered & Sorted Defects
  const filteredBugs = useMemo(() => {
    let result = assignedBugs.filter((bug) => {
      // 1. Workflow tab filter
      if (activeTab === 'IN_PROGRESS' && bug.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'PENDING' && !['ASSIGNED', 'NEW', 'REOPENED'].includes(bug.status)) return false;
      if (activeTab === 'FIXED' && !['FIXED', 'CLOSED'].includes(bug.status)) return false;
      if (activeTab === 'CRITICAL' && bug.priority !== 'P1' && bug.severity !== 'CRITICAL') return false;

      // 2. Dropdown filters
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;
      if (areaFilter !== 'ALL' && bug.bugArea !== areaFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        const mDesc = bug.description?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mArea && !mDesc) return false;
      }
      return true;
    });

    // 4. Sorting
    const priorityWeights: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const wA = priorityWeights[a.priority] || 99;
        const wB = priorityWeights[b.priority] || 99;
        return wA - wB;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'key') {
        return a.issueKey.localeCompare(b.issueKey);
      }
      return 0;
    });

    return result;
  }, [assignedBugs, activeTab, priorityFilter, areaFilter, searchQuery, sortBy]);

  // Pagination calculation
  const totalItems = filteredBugs.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const paginatedBugs = useMemo(() => {
    if (pageSize === 0) return filteredBugs;
    const start = (currentPage - 1) * pageSize;
    return filteredBugs.slice(start, start + pageSize);
  }, [filteredBugs, currentPage, pageSize]);

  // Status transitions
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

  const openTransitionModal = (bug: BugItem, target: string) => {
    setStatusModalBug(bug);
    setTargetStatus(target);
    setStatusComment('');
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
        return { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', label: 'In Progress' };
      case 'ASSIGNED':
      case 'NEW':
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: status === 'NEW' ? 'New' : 'Assigned' };
      case 'FIXED':
        return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', label: 'Fixed' };
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
    setAreaFilter('ALL');
    setSearchQuery('');
    setSortBy('priority');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    activeTab !== 'ALL' || priorityFilter !== 'ALL' || areaFilter !== 'ALL' || !!searchQuery.trim();

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '13.5px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.25s ease-out',
          }}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '16px',
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
          <ChevronRight size={14} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
            {cycle?.name || 'Testing Cycle'}
          </span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--color-text-faint)' }}>Assigned Defects</span>
        </div>

        {/* Compact Cycle Header & Workflow Quick-Filter Tabs */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                }}>
                  Cycle #{cycle?.cycleNumber || '01'}
                </span>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '5px',
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
                  borderRadius: '5px',
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                }}>
                  Env: {cycle?.environment || 'Staging'}
                </span>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}>
                  {cycle?.status?.replace('_', ' ') || 'IN PROGRESS'}
                </span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                {cycle?.name || 'Cycle Defect Workbench'}
              </h1>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Sync Defects</span>
            </button>
          </div>

          {/* Interactive Workflow Tabs — Clickable Quick Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '14px',
            borderTop: '1px solid var(--color-border)',
          }}>
            {[
              { id: 'ALL', label: 'All Defects', count: metrics.total, color: 'var(--color-text)' },
              { id: 'IN_PROGRESS', label: 'In Progress', count: metrics.inProgress, color: '#7c3aed' },
              { id: 'PENDING', label: 'Needs Action', count: metrics.pending, color: '#2563eb' },
              { id: 'FIXED', label: 'Fixed / QA Retest', count: metrics.fixed, color: '#059669' },
              { id: 'CRITICAL', label: 'Critical / P1', count: metrics.critical, color: '#dc2626' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: isActive ? `1.5px solid ${tab.color}` : '1px solid var(--color-border)',
                    background: isActive ? '#ffffff' : '#f8fafc',
                    color: isActive ? tab.color : 'var(--color-text-secondary)',
                    fontWeight: isActive ? '800' : '600',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? tab.color : '#e2e8f0',
                    color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informational banner if cycle is still in PLANNED state */}
        {cycle?.status === 'PLANNED' && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400e',
            fontSize: '13px',
          }}>
            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: '700' }}>Cycle is currently in PLANNED state:</span> QA has not transitioned this testing cycle to IN PROGRESS yet.
            </div>
          </div>
        )}

        {/* Single-Row Compact Control & Filter Toolbar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '10px 16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {/* Left: Search & Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search key or title..."
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: searchQuery ? '26px' : '10px',
                  height: '32px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: '#f8fafc',
                  outline: 'none',
                  color: 'var(--color-text)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    fontSize: '11px',
                    padding: 0,
                  }}
                >
                  ✕
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
                height: '32px',
                fontSize: '12px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: '#f8fafc',
                fontWeight: '600',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: 'pointer',
                width: '125px',
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 Critical</option>
              <option value="P2">P2 High</option>
              <option value="P3">P3 Medium</option>
              <option value="P4">P4 Low</option>
            </select>

            {/* Bug Area Filter */}
            <select
              value={areaFilter}
              onChange={(e) => {
                setAreaFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: '#f8fafc',
                fontWeight: '600',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: 'pointer',
                width: '125px',
              }}
            >
              <option value="ALL">All Bug Areas</option>
              <option value="FRONTEND">FRONTEND</option>
              <option value="BACKEND">BACKEND</option>
            </select>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  height: '32px',
                  fontSize: '12px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: '#f8fafc',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '140px',
                }}
              >
                <option value="priority">Sort: Priority (P1)</option>
                <option value="newest">Sort: Newest</option>
                <option value="key">Sort: Key (A-Z)</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textDecoration: 'underline',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Right: View Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '7px',
            border: '1px solid var(--color-border)',
            gap: '2px',
          }}>
            <button
              type="button"
              title="Dense Table View"
              onClick={() => setViewMode('table')}
              style={{
                padding: '4px 9px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#1155d7' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: '700',
              }}
            >
              <LayoutList size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              title="Card Grid View"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '4px 9px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#1155d7' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: '700',
              }}
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Results Count & Proper Alignment Showing Row (Image 1 Model) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {filteredBugs.length === 0 ? '0' : (currentPage - 1) * effectivePageSize + 1}-
            {Math.min(currentPage * effectivePageSize, filteredBugs.length)} of {filteredBugs.length} {filteredBugs.length === 1 ? 'defect' : 'defects'}
            {hasActiveFilters && ` (filtered from ${assignedBugs.length} total)`}
          </div>

          {/* Right: Per-Page Picker & Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <span>Per page:</span>
              {[25, 50, 0].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: pageSize === size ? 'linear-gradient(135deg, #1d68f2 0%, #1155d7 100%)' : '#ffffff',
                    color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                    border: pageSize === size ? '1px solid #1155d7' : '1px solid var(--color-border)',
                    boxShadow: pageSize === size ? '0 2px 6px rgba(17, 85, 215, 0.35)' : 'none',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: '700',
                  }}
                >
                  {size === 0 ? 'All' : size}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '28px', padding: '0 8px', fontSize: '12px', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', padding: '0 4px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '28px', padding: '0 8px', fontSize: '12px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content: Loading, Empty, High-Density Table, or Card Grid */}
        {loading ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading assigned defects...</p>
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
              No Defects Match Filter
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '6px', maxWidth: '420px', margin: '6px auto 0' }}>
              {assignedBugs.length === 0
                ? 'No defects are assigned to you in this testing cycle.'
                : 'No defects match the selected filters or search query.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '14px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* HIGH-DENSITY DEVELOPER TABLE VIEW: Direct Navigation to Full View Page     */
          /* ========================================================================= */
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
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
                    <th style={{ padding: '10px 14px', width: '55px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '10px 14px', width: '90px' }}>Key</th>
                    <th style={{ padding: '10px 14px', width: '115px' }}>Priority</th>
                    <th style={{ padding: '10px 14px', width: '95px' }}>Area</th>
                    <th style={{ padding: '10px 14px' }}>Defect Title & Summary</th>
                    <th style={{ padding: '10px 14px', width: '135px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '170px' }}>Actions</th>
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

                        {/* Key - Direct Link to Full View Page */}
                        <td style={{ padding: '10px 14px' }}>
                          <Link
                            href={`/bugs/${bug.id}`}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              padding: '2.5px 7px',
                              borderRadius: '5px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-block',
                              textDecoration: 'none',
                            }}
                            title="Open full view defect page"
                          >
                            {bug.issueKey}
                          </Link>
                        </td>

                        {/* Priority / Severity */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
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
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            textTransform: 'uppercase',
                          }}>
                            {bug.bugArea || 'APP'}
                          </span>
                        </td>

                        {/* Title & Description preview - Direct Link to Full View Page */}
                        <td style={{ padding: '10px 14px' }}>
                          <Link
                            href={`/bugs/${bug.id}`}
                            style={{
                              fontWeight: '750',
                              color: 'var(--color-text)',
                              fontSize: '13.5px',
                              lineHeight: '1.3',
                              textDecoration: 'none',
                              display: 'block',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#1155d7')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                            title="Click to open full view page"
                          >
                            {bug.title}
                          </Link>
                          {bug.description && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                              maxWidth: '520px',
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
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: '750',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: statusBadge.bg,
                            color: statusBadge.text,
                            border: `1px solid ${statusBadge.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusBadge.text }} />
                            <span>{statusBadge.label}</span>
                          </span>
                        </td>

                        {/* Fast Actions & Full View Link */}
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Fast direct status action */}
                            {(bug.status === 'NEW' || bug.status === 'ASSIGNED') && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                                className="btn btn-primary btn-sm"
                                style={{
                                  fontSize: '11.5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <PlayCircle size={12} />
                                <span>Start</span>
                              </button>
                            )}

                            {bug.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'FIXED')}
                                style={{
                                  fontSize: '11.5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: '700',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={12} />
                                <span>Fixed</span>
                              </button>
                            )}

                            {/* Direct Full View Page Button */}
                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-secondary btn-sm"
                              title="Open Full Defect Record (Details, QA Discussion & Attachments)"
                              style={{
                                padding: '3px 9px',
                                fontSize: '11.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: 'none',
                              }}
                            >
                              <span>Open</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
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
          /* COMPACT CARD GRID VIEW: Direct Navigation to Full View Page               */
          /* ========================================================================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '14px',
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
                          padding: '2px 6px',
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
                            padding: '2px 5px',
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
                        fontSize: '11px',
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

                    {/* Title & Preview - Links directly to full view */}
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
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1155d7')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
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
                          Start Progress
                        </button>
                      )}

                      {bug.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleDirectTransition(bug, 'FIXED')}
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
                          Mark Fixed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Toolbar */}
        {pageSize > 0 && totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
            padding: '12px 18px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredBugs.length} total defects)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && p - arr[idx - 1] > 1 && (
                      <span style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: currentPage === p ? '#1155d7' : '#ffffff',
                        color: currentPage === p ? '#ffffff' : 'var(--color-text)',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  </span>
                ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
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
                  Transition Defect: {statusModalBug.issueKey}
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
                    placeholder="Provide details why this defect cannot be reproduced or is rejected..."
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
