'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { bugsApi, testingCyclesApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  Bug,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  XCircle,
  Search,
  MessageSquare,
  SlidersHorizontal,
  Info,
  Send,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
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
  const params = useParams();
  const cycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<TestingCycleDetail | null>(null);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Status transition state
  const [transitioningBugId, setTransitioningBugId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Status transition modal
  const [statusModalBug, setStatusModalBug] = useState<BugItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusComment, setStatusComment] = useState('');

  // Bug inspection detail drawer
  const [inspectBug, setInspectBug] = useState<BugItem | null>(null);
  const [bugComments, setBugComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

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

  // Filtered defects
  const displayedBugs = useMemo(() => {
    return assignedBugs.filter((bug) => {
      if (statusFilter !== 'ALL' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mArea) return false;
      }
      return true;
    });
  }, [assignedBugs, statusFilter, priorityFilter, searchQuery]);

  // Cycle stats
  const metrics = useMemo(() => {
    const total = assignedBugs.length;
    const inProgress = assignedBugs.filter((b) => b.status === 'IN_PROGRESS').length;
    const fixed = assignedBugs.filter((b) => b.status === 'FIXED' || b.status === 'CLOSED').length;
    const pending = assignedBugs.filter((b) => b.status === 'ASSIGNED' || b.status === 'NEW' || b.status === 'REOPENED').length;
    return { total, inProgress, fixed, pending };
  }, [assignedBugs]);

  // Handle direct status transition (Start Progress or Mark as Fixed)
  const handleDirectTransition = async (bug: BugItem, nextStatus: string) => {
    setTransitioningBugId(bug.id);
    try {
      await bugsApi.transition(bug.id, { status: nextStatus });
      setAssignedBugs((prev) =>
        prev.map((b) => (b.id === bug.id ? { ...b, status: nextStatus, updatedAt: new Date().toISOString() } : b))
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

  // Open modal with comment
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
      case 'CLOSED':
        return { bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)', text: '#475569', label: 'Closed' };
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

        {/* Cycle Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          borderRadius: '18px',
          padding: '26px 32px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(49, 46, 129, 0.2)',
          marginBottom: '26px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
            }}>
              Cycle {cycle?.cycleNumber || '01'}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              textTransform: 'uppercase',
            }}>
              {cycle?.type || 'FUNCTIONAL'}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#10b981',
              color: '#ffffff',
            }}>
              Env: {cycle?.environment || 'QA'}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              marginLeft: 'auto',
            }}>
              {cycle?.status?.replace('_', ' ') || 'IN PROGRESS'}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px', color: '#ffffff' }}>
            {cycle?.name}
          </h1>

          {cycle?.description && (
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 16px', maxWidth: '700px' }}>
              {cycle.description}
            </p>
          )}

          {/* Quick Metrics */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.12)', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
              Total Assigned: <strong>{metrics.total}</strong>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
              In Progress: <strong>{metrics.inProgress}</strong>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
              Pending: <strong>{metrics.pending}</strong>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
              Fixed: <strong>{metrics.fixed}</strong>
            </div>
          </div>
        </div>

        {/* Workbench Filter Bar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px 20px',
          marginBottom: '18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)' }}>
              Assigned Defects in this Cycle
            </span>
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'var(--color-primary-dim)',
              color: 'var(--color-primary)',
            }}>
              {displayedBugs.length} shown
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search key or title..."
                className="input"
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12px', borderRadius: '8px' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ height: '34px', fontSize: '12px', padding: '4px 8px', borderRadius: '8px', fontWeight: '600' }}
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
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input"
              style={{ height: '34px', fontSize: '12px', padding: '4px 8px', borderRadius: '8px', fontWeight: '600' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>
          </div>
        </div>

        {/* Defects Cards */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading assigned defects...</p>
          </div>
        ) : displayedBugs.length === 0 ? (
          <div className="card" style={{ padding: '44px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <CheckCircle size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
              No Defects Found in this Cycle
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              All assigned defects have been addressed or match no search criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {displayedBugs.map((bug) => {
              const statusStyle = getStatusBadge(bug.status);
              const isTransitioning = transitioningBugId === bug.id;

              return (
                <div
                  key={bug.id}
                  className="card"
                  style={{
                    padding: '22px 24px',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  {/* Top Line */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#4f46e5',
                      }}>
                        {bug.issueKey}
                      </span>
                      {bug.bugArea && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2.5px 7px',
                          borderRadius: '5px',
                          background: '#f1f5f9',
                          color: '#334155',
                          textTransform: 'uppercase',
                        }}>
                          {bug.bugArea}
                        </span>
                      )}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2.5px 7px',
                        borderRadius: '5px',
                        background: bug.priority === 'P1' ? '#fee2e2' : '#e0e7ff',
                        color: bug.priority === 'P1' ? '#b91c1c' : '#4338ca',
                      }}>
                        {bug.priority}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2.5px 7px',
                        borderRadius: '5px',
                        background: bug.severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
                        color: bug.severity === 'CRITICAL' ? '#991b1b' : '#92400e',
                      }}>
                        {bug.severity}
                      </span>
                      {bug.environment && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', background: '#f8fafc', padding: '2px 7px', borderRadius: '5px', border: '1px solid var(--color-border)' }}>
                          Env: {bug.environment}
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: statusStyle.bg,
                      border: `1px solid ${statusStyle.border}`,
                      color: statusStyle.text,
                      fontSize: '12px',
                      fontWeight: '700',
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusStyle.text }} />
                      <span>{statusStyle.label}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3
                      onClick={() => handleOpenInspect(bug)}
                      style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'var(--color-text)',
                        margin: '0 0 6px',
                        cursor: 'pointer',
                        display: 'inline-block',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#4f46e5')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                    >
                      {bug.title}
                    </h3>
                    {bug.description && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.5' }}>
                        {bug.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Action Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(bug)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: 0,
                      }}
                    >
                      <Info size={14} />
                      <span>View Repro Steps & Thread</span>
                    </button>

                    {/* Developer Status Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {(bug.status === 'ASSIGNED' || bug.status === 'NEW' || bug.status === 'REOPENED') && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleDirectTransition(bug, 'IN_PROGRESS')}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '12px', fontWeight: '700', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <PlayCircle size={14} />
                          <span>{isTransitioning ? 'Updating...' : 'Start Progress'}</span>
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
                              fontSize: '12px',
                              fontWeight: '700',
                              padding: '6px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{isTransitioning ? 'Updating...' : 'Mark as Fixed'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isTransitioning}
                            onClick={() => openTransitionModal(bug, 'CANNOT_REPRODUCE')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', padding: '5px 10px', color: '#d97706' }}
                          >
                            <HelpCircle size={13} />
                            <span>Cannot Reproduce</span>
                          </button>
                          <button
                            type="button"
                            disabled={isTransitioning}
                            onClick={() => openTransitionModal(bug, 'REJECTED')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', padding: '5px 10px', color: '#dc2626' }}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {(bug.status === 'FIXED' || bug.status === 'CLOSED') && (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} />
                          <span>Ready for QA Retest</span>
                        </span>
                      )}

                      <Link
                        href={`/bugs/${bug.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '5px 8px', color: 'var(--color-text-muted)' }}
                        title="Open Full Defect Record"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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

              {/* Steps to Reproduce */}
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

              {/* Expected vs Actual */}
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

              {/* Comment Thread */}
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
                    bugComments.map((c) => (
                      <div key={c.id} style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontWeight: '700', fontSize: '12px' }}>{c.user?.name || 'User'}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{c.bodyMarkdown}</div>
                      </div>
                    ))
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
