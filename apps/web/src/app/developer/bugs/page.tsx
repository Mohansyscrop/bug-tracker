'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { bugsApi, projectsApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Bug,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
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

  const [loading, setLoading] = useState(true);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowTab, setWorkflowTab] = useState<'ALL' | 'NEEDS_ACTION' | 'IN_PROGRESS' | 'FIXED' | 'CRITICAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
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
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await bugsApi.list({ assignedTo: user.id, limit: 100 });
      setAssignedBugs(res.data || []);
    } catch (err) {
      console.error('Failed to load assigned bugs', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      // Workflow Tab
      if (workflowTab === 'NEEDS_ACTION' && !['NEW', 'ASSIGNED', 'REOPENED'].includes(bug.status)) return false;
      if (workflowTab === 'IN_PROGRESS' && bug.status !== 'IN_PROGRESS') return false;
      if (workflowTab === 'FIXED' && !['FIXED', 'RETEST', 'CLOSED'].includes(bug.status)) return false;
      if (workflowTab === 'CRITICAL' && bug.priority !== 'P1' && bug.severity !== 'CRITICAL') return false;

      // Dropdown Filters
      if (statusFilter !== 'ALL' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;
      if (areaFilter !== 'ALL' && bug.bugArea !== areaFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        const mProj = bug.project?.name?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mArea && !mProj) return false;
      }
      return true;
    });
  }, [assignedBugs, workflowTab, statusFilter, priorityFilter, areaFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedBugs.length / pageSize));
  const paginatedBugs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedBugs.slice(start, start + pageSize);
  }, [displayedBugs, currentPage, pageSize]);

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
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Assigned Defects</span>
        </div>

        {/* Header Banner & Executive KPI Metrics */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bug size={19} />
              </span>
              <span>All Assigned Defects</span>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '2px 9px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
              }}>
                {assignedBugs.length} Total
              </span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              All defect tasks assigned to you. Update progress and mark issues fixed directly from this workbench.
            </p>
          </div>

          {/* Quick KPI Stat Chips */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Needs Action</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)' }}>{counts.needsAction}</div>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>In Progress</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#7c3aed' }}>{counts.inProgress}</div>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Fixed / Retest</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>{counts.fixed}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Quick Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[
            { id: 'ALL', label: 'All Assigned', count: counts.all },
            { id: 'NEEDS_ACTION', label: 'Needs Action', count: counts.needsAction },
            { id: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
            { id: 'FIXED', label: 'Fixed / Retest', count: counts.fixed },
            { id: 'CRITICAL', label: 'Critical P1', count: counts.critical },
          ].map((tab) => {
            const isActive = workflowTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setWorkflowTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '600',
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10.5px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-2)',
                  color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unified Filter Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '12px',
          padding: '12px 16px',
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search key, title, area..."
              className="input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px', borderRadius: '8px', width: '100%' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select"
            style={{ width: '150px', height: '34px', fontSize: '12.5px', padding: '4px 26px 4px 10px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FIXED">Fixed</option>
            <option value="CANNOT_REPRODUCE">Cannot Reproduce</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select"
            style={{ width: '140px', height: '34px', fontSize: '12.5px', padding: '4px 26px 4px 10px' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>

          <select
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select"
            style={{ width: '140px', height: '34px', fontSize: '12.5px', padding: '4px 26px 4px 10px' }}
          >
            <option value="ALL">All Bug Areas</option>
            <option value="FRONTEND">Frontend</option>
            <option value="BACKEND">Backend</option>
          </select>

          {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || areaFilter !== 'ALL' || workflowTab !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setAreaFilter('ALL');
                setWorkflowTab('ALL');
                setCurrentPage(1);
              }}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)', gap: '4px', height: '34px', fontSize: '12px' }}
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Table Top Controls: Shown Entries & Show Entries Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '12px',
          padding: '10px 16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Shown Entries Counter */}
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>
              Showing{' '}
              <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>
                {displayedBugs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>
              {' '}to{' '}
              <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>
                {Math.min(currentPage * pageSize, displayedBugs.length)}
              </strong>
              {' '}of{' '}
              <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>
                {displayedBugs.length}
              </strong>
              {' '}entries
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Show Entries Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
              <span>Show entries:</span>
              <select
                className="select"
                style={{ padding: '4px 28px 4px 10px', fontSize: '12.5px', height: '32px', width: 'auto' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', height: '32px' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', padding: '0 6px', fontWeight: '500' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 10px', height: '32px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Defects List */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading assigned defects...</p>
          </div>
        ) : displayedBugs.length === 0 ? (
          <div className="card" style={{ padding: '44px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
            <CheckCircle size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
              No Defects Found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No defects match your current search and filter settings.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '100px' }}>Key</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Defect Title</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '110px' }}>Severity</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '130px' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right', minWidth: '160px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBugs.map((bug, index) => {
                    const statusStyle = getStatusBadge(bug.status);
                    const isTransitioning = transitioningBugId === bug.id;
                    const serialNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr
                        key={bug.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Serial Number */}
                        <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {serialNumber}
                        </td>

                        {/* Issue Key */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <Link href={`/bugs/${bug.id}`} className="ticket-badge" style={{ textDecoration: 'none' }}>
                            #{bug.issueKey}
                          </Link>
                        </td>

                        {/* Defect Title & Technical Area */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <Link
                              href={`/bugs/${bug.id}`}
                              style={{
                                fontWeight: '650',
                                color: 'var(--color-text)',
                                textDecoration: 'none',
                                fontSize: '13.5px',
                                lineHeight: '1.3',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                            >
                              {bug.title}
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                              {bug.bugArea && (
                                <span className={bug.bugArea === 'REGRESSION' ? 'area-pill area-pill-regression' : 'area-pill'} style={{ fontSize: '10px', padding: '1px 6px' }}>
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
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span className={`badge badge-${bug.severity.toLowerCase()}`}>
                            {bug.severity}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '20px',
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
                        <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {(bug.status === 'ASSIGNED' || bug.status === 'NEW' || bug.status === 'REOPENED') && (
                              <button
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '11px', fontWeight: '700', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <PlayCircle size={12} />
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
                                    padding: '4px 9px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                  <span>{isTransitioning ? '...' : 'Fixed'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => openTransitionModal(bug, 'CANNOT_REPRODUCE')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '10.5px', padding: '4px 7px', color: '#d97706' }}
                                  title="Cannot Reproduce"
                                >
                                  <HelpCircle size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => openTransitionModal(bug, 'REJECTED')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '10.5px', padding: '4px 7px', color: '#dc2626' }}
                                  title="Reject"
                                >
                                  <XCircle size={12} />
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
                              style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Open</span>
                              <ChevronRight size={13} />
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
