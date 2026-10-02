'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { bugsApi, projectsApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import Link from 'next/link';
import {
  Bug,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  Search,
  PlayCircle,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  XCircle,
  Info,
  Send,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Flame,
  Clock,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RefreshCw,
  Check,
} from 'lucide-react';

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
  environment?: string;
  bugArea?: string;
  testingCycleId?: string;
  testingCycle?: { id: string; name: string; cycleNumber: number; status: string };
  project?: { id: string; key: string; name: string };
}

export default function DeveloperAllBugsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_ACTION' | 'IN_PROGRESS' | 'FIXED' | 'CRITICAL'>('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status transition state
  const [transitioningBugId, setTransitioningBugId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Status transition modal
  const [statusModalBug, setStatusModalBug] = useState<BugItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusComment, setStatusComment] = useState('');

  // Inspection modal
  const [inspectBug, setInspectBug] = useState<BugItem | null>(null);
  const [bugComments, setBugComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    toast[type](text);
    setTimeout(() => setToastMessage(null), 4000);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await bugsApi.list({ assignedTo: user.id, limit: 100 });
      setAssignedBugs(res.data || []);
    } catch (err) {
      console.error('Failed to load assigned bugs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const availableProjects = useMemo(() => {
    const map = new Map<string, { id: string; key: string; name: string }>();
    assignedBugs.forEach((b) => {
      if (b.project?.id) {
        map.set(b.project.id, b.project);
      }
    });
    return Array.from(map.values());
  }, [assignedBugs]);

  const availableCycles = useMemo(() => {
    const map = new Map<string, { id: string; name: string; cycleNumber?: number }>();
    assignedBugs.forEach((b) => {
      if (b.testingCycle?.id) {
        if (projectFilter === 'ALL' || b.projectId === projectFilter || b.project?.id === projectFilter) {
          map.set(b.testingCycle.id, {
            id: b.testingCycle.id,
            name: b.testingCycle.name,
            cycleNumber: b.testingCycle.cycleNumber,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [assignedBugs, projectFilter]);

  const handleProjectChange = (newProj: string) => {
    setProjectFilter(newProj);
    setCycleFilter('ALL');
    setCurrentPage(1);
  };

  const counts = useMemo(() => {
    return {
      all: assignedBugs.length,
      needsAction: assignedBugs.filter((b) => ['NEW', 'ASSIGNED', 'REOPENED'].includes(b.status)).length,
      inProgress: assignedBugs.filter((b) => b.status === 'IN_PROGRESS').length,
      fixed: assignedBugs.filter((b) => ['FIXED', 'RETEST', 'CLOSED'].includes(b.status)).length,
      critical: assignedBugs.filter((b) => b.priority === 'P1' || b.severity === 'CRITICAL').length,
    };
  }, [assignedBugs]);

  const displayedBugs = useMemo(() => {
    return assignedBugs.filter((bug) => {
      // Status Filter
      if (statusFilter === 'NEEDS_ACTION' && !['NEW', 'ASSIGNED', 'REOPENED'].includes(bug.status)) return false;
      if (statusFilter === 'IN_PROGRESS' && bug.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'FIXED' && !['FIXED', 'RETEST', 'CLOSED'].includes(bug.status)) return false;
      if (statusFilter === 'CRITICAL' && bug.priority !== 'P1' && bug.severity !== 'CRITICAL') return false;

      // Project Filter
      if (projectFilter !== 'ALL' && bug.projectId !== projectFilter && bug.project?.id !== projectFilter) return false;

      // Cycle Filter
      if (cycleFilter !== 'ALL' && bug.testingCycleId !== cycleFilter && bug.testingCycle?.id !== cycleFilter) return false;

      // Priority Filter
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        const mProj = bug.project?.name?.toLowerCase().includes(q) || bug.project?.key?.toLowerCase().includes(q);
        const mCycle = bug.testingCycle?.name?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mArea && !mProj && !mCycle) return false;
      }
      return true;
    });
  }, [assignedBugs, statusFilter, projectFilter, cycleFilter, priorityFilter, searchQuery]);

  const hasActiveFilters = statusFilter !== 'ALL' || projectFilter !== 'ALL' || cycleFilter !== 'ALL' || priorityFilter !== 'ALL' || !!searchQuery.trim();

  const resetFilters = () => {
    setStatusFilter('ALL');
    setProjectFilter('ALL');
    setCycleFilter('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(displayedBugs.length / pageSize));
  const paginatedBugs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedBugs.slice(start, start + pageSize);
  }, [displayedBugs, currentPage, pageSize]);

  const paginationRange = useMemo(() => {
    const delta = 2;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [currentPage, totalPages]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', label: 'P1 Critical' };
      case 'P2':
        return { bg: '#ffedd5', border: '#fdba74', text: '#c2410c', label: 'P2 High' };
      case 'P3':
        return { bg: '#fef3c7', border: '#fde047', text: '#b45309', label: 'P3 Medium' };
      case 'P4':
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: 'P4 Low' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: priority };
    }
  };

  const handleDirectTransition = async (bug: BugItem, nextStatus: string) => {
    setTransitioningBugId(bug.id);
    try {
      await bugsApi.transition(bug.id, { status: nextStatus });
      setAssignedBugs((prev) =>
        prev.map((b) => (b.id === bug.id ? { ...b, status: nextStatus } : b))
      );
      if (inspectBug?.id === bug.id) {
        setInspectBug((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
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
        prev.map((b) => (b.id === statusModalBug.id ? { ...b, status: targetStatus } : b))
      );
      if (inspectBug?.id === statusModalBug.id) {
        setInspectBug((prev) => (prev ? { ...prev, status: targetStatus } : null));
        loadBugComments(statusModalBug.id);
      }
      showToast(`Status updated to ${targetStatus.replace('_', ' ')} for ${statusModalBug.issueKey}`);
      setStatusModalBug(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to transition status', 'error');
    } finally {
      setTransitioningBugId(null);
    }
  };

  const loadBugComments = async (bugId: string) => {
    try {
      const res = await commentsApi.list(bugId);
      setBugComments(res.data || []);
    } catch {
      setBugComments([]);
    }
  };

  const handleOpenInspect = (bug: BugItem) => {
    setInspectBug(bug);
    loadBugComments(bug.id);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectBug || !newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      await commentsApi.create(inspectBug.id, newCommentText.trim());
      setNewCommentText('');
      await loadBugComments(inspectBug.id);
      showToast('Comment posted to defect thread');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)', text: '#7c3aed', label: 'In Progress' };
      case 'ASSIGNED':
      case 'NEW':
        return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#2563eb', label: status === 'NEW' ? 'New' : 'Assigned' };
      case 'FIXED':
        return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#059669', label: 'Fixed' };
      case 'CANNOT_REPRODUCE':
        return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#d97706', label: 'Cannot Reproduce' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#dc2626', label: 'Rejected' };
      case 'REOPENED':
        return { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', text: '#ea580c', label: 'Reopened' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: status };
    }
  };

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

        {/* Breadcrumb */}
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
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} />
            <span>Developer Console</span>
          </Link>
          <ChevronRight size={14} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>All Bugs</span>
        </div>

        {/* Header Banner - Clean, Compact & Developer Focused */}
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
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bug size={18} />
              </span>
              <span>All Bugs</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
              }}>
                {assignedBugs.length} Total
              </span>
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0 }}>
              All bugs across your assigned projects. Inspect issues, update progress, and mark resolved.
            </p>
          </div>
        </div>

        {/* STREAMLINED FILTERS TOOLBAR: Search, Project, Cycle, Status & Priority */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          {/* Left: Search input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '4px 10px',
            gap: '8px',
            flex: '1 1 200px',
            maxWidth: '300px',
          }}>
            <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search defects by key, title, cycle..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
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
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Right: Dropdowns & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => handleProjectChange(e.target.value)}
              style={{
                height: '32px',
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
              <option value="ALL">All Projects ({availableProjects.length})</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} — {p.name}
                </option>
              ))}
            </select>

            {/* Related Cycles Filter (Dynamically updates based on selected project) */}
            <select
              value={cycleFilter}
              onChange={(e) => {
                setCycleFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: '#ffffff',
                fontWeight: '600',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '220px',
              }}
            >
              <option value="ALL">All Cycles {projectFilter !== 'ALL' ? 'for Project' : ''}</option>
              {availableCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  Cycle #{String(c.cycleNumber || '01').padStart(2, '0')}: {c.name.split('—')[0]}
                </option>
              ))}
            </select>

            {/* Status / Workflow Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
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
              <option value="ALL">All Statuses ({counts.all})</option>
              <option value="NEEDS_ACTION">Needs Action ({counts.needsAction})</option>
              <option value="IN_PROGRESS">In Progress ({counts.inProgress})</option>
              <option value="FIXED">Fixed / Retest ({counts.fixed})</option>
              <option value="CRITICAL">Critical P1 ({counts.critical})</option>
            </select>

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

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh bugs"
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 9px', height: '32px' }}
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
            {statusFilter !== 'ALL' && (
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                Status: {statusFilter === 'NEEDS_ACTION' ? 'Needs Action' : statusFilter.replace('_', ' ')}
              </span>
            )}
            {projectFilter !== 'ALL' && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                Project: {availableProjects.find((p) => p.id === projectFilter)?.key || projectFilter}
              </span>
            )}
            {cycleFilter !== 'ALL' && (
              <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                Cycle: {availableCycles.find((c) => c.id === cycleFilter)?.name?.split('—')[0] || cycleFilter}
              </span>
            )}
            {priorityFilter !== 'ALL' && (
              <span style={{ background: '#fce7f3', color: '#be185d', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>
                Priority: {priorityFilter}
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
              Clear All
            </button>
          </div>
        )}

        {/* Results Summary Count & Per Page Size Selector (Previous format) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {displayedBugs.length === 0 ? '0' : (currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, displayedBugs.length)} of {displayedBugs.length} {displayedBugs.length === 1 ? 'bug' : 'bugs'}
            {hasActiveFilters && ` (filtered from ${assignedBugs.length} total)`}
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

        {/* Bugs List */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading bugs...</p>
          </div>
        ) : displayedBugs.length === 0 ? (
          <div className="card" style={{ padding: '44px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <CheckCircle size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
              No Bugs Found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No bugs match your current search and filter settings.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* TABLE VIEW: Developer-Friendly & High-Density                             */
          /* ========================================================================= */
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '50px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '90px' }}>Key</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '105px' }}>Priority</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Bug Title & Context</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '100px' }}>Severity</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', width: '125px' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', minWidth: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBugs.map((bug, index) => {
                    const statusStyle = getStatusBadge(bug.status);
                    const priorityStyle = getPriorityBadge(bug.priority);
                    const isTransitioning = transitioningBugId === bug.id;
                    const serialNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr
                        key={bug.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Serial Number */}
                        <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {serialNumber}
                        </td>

                        {/* Issue Key */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
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
                            #{bug.issueKey}
                          </Link>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: priorityStyle.bg,
                            color: priorityStyle.text,
                            border: `1px solid ${priorityStyle.border}`,
                          }}>
                            {priorityStyle.label}
                          </span>
                        </td>

                        {/* Defect Title & Technical Context */}
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <Link
                              href={`/bugs/${bug.id}`}
                              style={{
                                fontWeight: '650',
                                color: 'var(--color-text)',
                                textDecoration: 'none',
                                fontSize: '13px',
                                lineHeight: '1.3',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                            >
                              {bug.title}
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {bug.bugArea && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: '700',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: bug.bugArea === 'REGRESSION' ? '#fee2e2' : '#f1f5f9',
                                  color: bug.bugArea === 'REGRESSION' ? '#b91c1c' : '#475569',
                                  textTransform: 'uppercase',
                                }}>
                                  {bug.bugArea}
                                </span>
                              )}
                              {bug.testingCycle && (
                                <Link
                                  href={`/developer/cycles/${bug.testingCycle.id}/bugs`}
                                  style={{
                                    color: 'var(--color-primary)',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <RotateCcw size={10} />
                                  <span>{bug.testingCycle.name.split('—')[0]}</span>
                                </Link>
                              )}
                              {bug.project?.name && (
                                <span style={{ color: 'var(--color-text-faint)' }}>
                                  • {bug.project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Severity */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span className={`badge badge-${bug.severity.toLowerCase()}`} style={{ fontSize: '10px', padding: '1.5px 6px' }}>
                            {bug.severity}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border}`,
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.text }} />
                            <span>{statusStyle.label}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                            {(bug.status === 'ASSIGNED' || bug.status === 'NEW' || bug.status === 'REOPENED') && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <PlayCircle size={11} />
                                <span>{isTransitioning ? '...' : 'Start'}</span>
                              </button>
                            )}

                            {bug.status === 'IN_PROGRESS' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => handleDirectTransition(bug, 'FIXED')}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '3px 8px',
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Check size={11} />
                                  <span>{isTransitioning ? '...' : 'Fixed'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => openTransitionModal(bug, 'CANNOT_REPRODUCE')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '10.5px', padding: '3px 6px', color: '#d97706', borderRadius: '5px' }}
                                  title="Cannot Reproduce"
                                >
                                  <HelpCircle size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => openTransitionModal(bug, 'REJECTED')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '10.5px', padding: '3px 6px', color: '#dc2626', borderRadius: '5px' }}
                                  title="Reject"
                                >
                                  <XCircle size={11} />
                                </button>
                              </>
                            )}

                            {(bug.status === 'FIXED' || bug.status === 'CLOSED') && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle2 size={12} />
                                <span>Fixed</span>
                              </span>
                            )}

                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <span>Open</span>
                              <ChevronRight size={12} />
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
        )}

        {/* Scalable Full Pagination Footer (Previous format) */}
        {displayedBugs.length > 0 && (
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
              Page {currentPage} of {totalPages} ({displayedBugs.length} total defects)
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
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {paginationRange.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(page);
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isCurrent ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                        background: isCurrent ? '#4f46e5' : '#ffffff',
                        color: isCurrent ? '#ffffff' : 'var(--color-text)',
                        boxShadow: isCurrent ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
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
            <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '26px', borderRadius: '16px' }}>
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
                    Reason or Note (Optional)
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

        {/* Modal: Inspection & Comments */}
        {inspectBug && (
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
            <div className="card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: '#4f46e5' }}>
                    {inspectBug.issueKey}
                  </span>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '4px 0 0', color: 'var(--color-text)' }}>
                    {inspectBug.title}
                  </h3>
                </div>
                <button onClick={() => setInspectBug(null)} className="btn btn-ghost btn-sm">✕</button>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Steps to Reproduce
                </label>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}>
                  {inspectBug.stepsToReproduce || 'No steps provided.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#065f46', marginBottom: '4px' }}>EXPECTED RESULT</div>
                  <div style={{ fontSize: '12.5px', color: '#047857', lineHeight: '1.45' }}>{inspectBug.expectedResult || 'Not specified'}</div>
                </div>
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#991b1b', marginBottom: '4px' }}>ACTUAL RESULT</div>
                  <div style={{ fontSize: '12.5px', color: '#b91c1c', lineHeight: '1.45' }}>{inspectBug.actualResult || 'Not specified'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <MessageSquare size={13} />
                  Developer & QA Thread ({bugComments.length})
                </label>

                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {bugComments.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                      No comments yet. Write a note to QA below.
                    </div>
                  ) : (
                    bugComments.map((c) => {
                      const isQA = (c.user?.name || '').toLowerCase().includes('qa');
                      return (
                        <div key={c.id} style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--color-text)' }}>{c.user?.name || 'User'}</span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isQA ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                color: isQA ? '#059669' : '#4f46e5',
                              }}>
                                {isQA ? 'QA Tester' : 'Developer'}
                              </span>
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>{c.bodyMarkdown || c.content}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a developer comment..."
                    className="input"
                    style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                  />
                  <button type="submit" disabled={submittingComment || !newCommentText.trim()} className="btn btn-primary btn-sm">
                    <Send size={13} />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
