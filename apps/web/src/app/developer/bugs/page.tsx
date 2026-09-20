'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { bugsApi, projectsApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Bug,
  ChevronRight,
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');

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

  const displayedBugs = useMemo(() => {
    return assignedBugs.filter((bug) => {
      if (statusFilter !== 'ALL' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && bug.priority !== priorityFilter) return false;
      if (areaFilter !== 'ALL' && bug.bugArea !== areaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mKey = bug.issueKey?.toLowerCase().includes(q);
        const mTitle = bug.title?.toLowerCase().includes(q);
        const mArea = bug.bugArea?.toLowerCase().includes(q);
        if (!mKey && !mTitle && !mArea) return false;
      }
      return true;
    });
  }, [assignedBugs, statusFilter, priorityFilter, areaFilter, searchQuery]);

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

        {/* Header Banner */}
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
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bug size={22} style={{ color: '#ef4444' }} />
              <span>All Assigned Defects</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--color-primary-dim)',
                color: 'var(--color-primary)',
              }}>
                {displayedBugs.length}
              </span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              All defect tasks assigned to you. You can update progress and mark issues fixed directly from this workbench.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search key, title, area..."
                className="input"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '12px', borderRadius: '8px' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ height: '36px', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}
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
              style={{ height: '36px', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>

            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="input"
              style={{ height: '36px', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}
            >
              <option value="ALL">All Bug Areas</option>
              <option value="FRONTEND">FRONTEND</option>
              <option value="BACKEND">BACKEND</option>
            </select>
          </div>
        </div>

        {/* Defects List */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading assigned defects...</p>
          </div>
        ) : displayedBugs.length === 0 ? (
          <div className="card" style={{ padding: '44px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
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
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>S.No</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '90px' }}>Key</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Defect Title</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '150px' }}>Testing Cycle</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '100px' }}>Severity</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '80px' }}>Priority</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '130px' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', fontSize: '11.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right', minWidth: '170px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedBugs.map((bug, index) => {
                    const statusStyle = getStatusBadge(bug.status);
                    const isTransitioning = transitioningBugId === bug.id;

                    return (
                      <tr
                        key={bug.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Serial Number */}
                        <td style={{ padding: '14px', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-faint)', fontSize: '12px' }}>
                          {index + 1}
                        </td>

                        {/* Issue Key */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#4f46e5',
                          }}>
                            {bug.issueKey}
                          </span>
                        </td>

                        {/* Defect Title & Technical Area */}
                        <td style={{ padding: '14px' }}>
                          <Link
                            href={`/bugs/${bug.id}`}
                            style={{
                              fontWeight: '700',
                              color: 'var(--color-text)',
                              textDecoration: 'none',
                              fontSize: '13px',
                              display: 'block',
                              marginBottom: '3px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                          >
                            {bug.title}
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {bug.bugArea && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#475569',
                                textTransform: 'uppercase',
                              }}>
                                {bug.bugArea}
                              </span>
                            )}
                            {bug.project?.name && (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                                {bug.project.name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Testing Cycle */}
                        <td style={{ padding: '14px', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {bug.testingCycle ? (
                            <Link
                              href={`/developer/cycles/${bug.testingCycle.id}/bugs`}
                              style={{
                                color: 'var(--color-primary)',
                                textDecoration: 'none',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <RotateCcw size={11} />
                              <span>{bug.testingCycle.name.split('—')[0]}</span>
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                          )}
                        </td>

                        {/* Severity */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span className={`badge badge-${bug.severity.toLowerCase()}`} style={{ fontSize: '10.5px' }}>
                            {bug.severity}
                          </span>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span className={`badge badge-${bug.priority.toLowerCase()}`} style={{ fontSize: '10.5px' }}>
                            {bug.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
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

                            <button
                              type="button"
                              onClick={() => handleOpenInspect(bug)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px', padding: '4px 6px', color: 'var(--color-primary)' }}
                              title="Repro Steps & Comments"
                            >
                              <Info size={13} />
                            </button>

                            <Link
                              href={`/bugs/${bug.id}`}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px', padding: '4px 6px', color: 'var(--color-text-muted)' }}
                              title="Open Full Defect Record"
                            >
                              <ExternalLink size={13} />
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
