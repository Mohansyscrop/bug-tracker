'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useState, useEffect, useRef } from 'react';
import { bugsApi, commentsApi, attachmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MessageSquare,
  History,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Layers,
  RotateCcw,
  Tag,
  Send,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Code2,
  Trash2,
  Bold,
  Code,
  Quote,
  UserCheck,
  ImagePlus,
  UploadCloud,
  Maximize2,
  ExternalLink,
  Download,
  FileImage,
} from 'lucide-react';

const TRANSITIONS: Record<string, Record<string, string[]>> = {
  LEAD: { NEW: ['ASSIGNED','DEFERRED','CLOSED'], ASSIGNED: ['IN_PROGRESS','DEFERRED'], IN_PROGRESS: ['DEFERRED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], DEFERRED: ['ASSIGNED'], FIXED: ['RETEST','CLOSED','REOPENED'], RETEST: ['CLOSED','REOPENED'], REOPENED: ['IN_PROGRESS','DEFERRED'], CLOSED: ['REOPENED'] },
  DEV: { ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['FIXED','CANNOT_REPRODUCE','REJECTED'], REOPENED: ['IN_PROGRESS'] },
  QA: { NEW: ['CLOSED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], FIXED: ['RETEST','CLOSED','REOPENED'], RETEST: ['CLOSED','REOPENED'], CLOSED: ['REOPENED'] },
  ADMIN: { NEW: ['ASSIGNED','DEFERRED','CLOSED'], ASSIGNED: ['IN_PROGRESS','DEFERRED','CLOSED'], IN_PROGRESS: ['FIXED','CANNOT_REPRODUCE','REJECTED','DEFERRED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], DEFERRED: ['ASSIGNED','CLOSED'], FIXED: ['RETEST','CLOSED','REOPENED'], RETEST: ['CLOSED','REOPENED'], REOPENED: ['IN_PROGRESS','DEFERRED'], CLOSED: ['REOPENED'] },
};

const RESOLUTION_OPTIONS = ['FIXED_VERIFIED','WONT_FIX','BY_DESIGN','DUPLICATE','CANNOT_REPRODUCE_ABANDONED'];

export default function BugDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const bugId = (routeParams?.id as string) || '';
  const { user } = useAuth();
  const { toast } = useToast();
  const [bug, setBug] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionModal, setTransitionModal] = useState<{ status: string } | null>(null);
  const [resolution, setResolution] = useState('');
  const [transitionComment, setTransitionComment] = useState('');
  const [watching, setWatching] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity' | 'attachments'>('details');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBug, setDeletingBug] = useState(false);

  // Attachments & Lightbox state (for viewing QA screenshots)
  const [lightboxImg, setLightboxImg] = useState<{ url: string; filename: string; size?: number } | null>(null);
  const [attachmentDeleteId, setAttachmentDeleteId] = useState<string | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

  async function handleDeleteAttachment(attachmentId: string) {
    if (!bugId || !attachmentId) return;
    setDeletingAttachment(true);
    try {
      await attachmentsApi.delete(bugId, attachmentId);
      setBug((b: any) => ({
        ...b,
        attachments: (b.attachments || []).filter((a: any) => a.id !== attachmentId),
      }));
      setAttachmentDeleteId(null);
      toast.success('Attachment deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete attachment:', err);
      toast.error(err.message || 'Failed to delete attachment');
    } finally {
      setDeletingAttachment(false);
    }
  }

  useEffect(() => {
    if (!bugId) return;
    bugsApi.get(bugId)
      .then((res) => {
        setBug(res.data);
        setWatching(res.data.watchers?.some((w: any) => w.userId === user?.id) ?? false);
      })
      .finally(() => setLoading(false));
  }, [bugId, user?.id]);

  async function addComment() {
    if (!comment.trim() || !bugId) return;
    setCommenting(true);
    try {
      const res = await commentsApi.create(bugId, comment);
      const newComment = res?.data || res;
      setBug((b: any) => ({ ...b, comments: [...(b.comments ?? []), newComment] }));
      setComment('');
      toast.success('Comment posted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setCommenting(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!bugId || !commentId) return;
    setDeletingId(commentId);
    try {
      await commentsApi.delete(bugId, commentId);
      setBug((b: any) => ({
        ...b,
        comments: (b.comments ?? []).filter((c: any) => c.id !== commentId),
      }));
      setConfirmDeleteId(null);
      toast.success('Comment deleted successfully');
    } catch (err: any) {
      console.error('Delete comment error:', err);
      if (err?.status === 404) {
        setBug((b: any) => ({
          ...b,
          comments: (b.comments ?? []).filter((c: any) => c.id !== commentId),
        }));
        setConfirmDeleteId(null);
        toast.success('Comment deleted successfully');
      } else {
        toast.error(err?.message || 'Failed to delete comment');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteBug() {
    if (!bugId || !bug) return;
    if (!confirm(`Are you sure you want to permanently delete defect ${bug.issueKey}: "${bug.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingBug(true);
    try {
      await bugsApi.delete(bugId);
      toast.success(`Defect ${bug.issueKey} deleted successfully`);
      router.push('/bugs');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete defect');
      setDeletingBug(false);
    }
  }

  function insertMarkdown(prefix: string, suffix: string = '') {
    const textarea = document.getElementById('comment-input') as HTMLTextAreaElement | null;
    if (!textarea) {
      setComment((prev) => prev + prefix + suffix);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = comment;
    const selected = current.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;
    const nextValue = current.substring(0, start) + replacement + current.substring(end);
    setComment(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 0);
  }

  function getCommentAuthorInfo(c: any) {
    const commenterId = c.userId || c.user?.id;
    const isMe = Boolean(user?.id && (user.id === commenterId));
    const name = c.user?.name || (isMe ? user?.name : 'User');
    const email = c.user?.email || (isMe ? user?.email : '');
    
    // Check ticket context roles
    const isReporter = Boolean(bug?.reportedById && bug.reportedById === commenterId);
    const isAssignee = Boolean(bug?.assignedToId && bug.assignedToId === commenterId);
    const member = bug?.project?.members?.find((m: any) => m.userId === commenterId);
    const projectRole = member?.projectRole;
    
    let roleLabel = 'Team Member';
    let roleType: 'QA' | 'DEV' | 'LEAD' | 'ADMIN' | 'MEMBER' = 'MEMBER';

    if (projectRole === 'QA' || isReporter || name.toLowerCase().includes('qa')) {
      roleType = 'QA';
      roleLabel = isReporter ? 'QA Tester (Reporter)' : 'QA Tester';
    } else if (projectRole === 'DEV' || isAssignee || name.toLowerCase().includes('dev')) {
      roleType = 'DEV';
      roleLabel = isAssignee ? 'Developer (Assignee)' : 'Developer';
    } else if (projectRole === 'LEAD') {
      roleType = 'LEAD';
      roleLabel = 'Project Lead';
    } else if (c.user?.globalRole === 'ADMIN') {
      roleType = 'ADMIN';
      roleLabel = 'Admin';
    }

    const initials = name
      ? name.split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
      : 'U';

    return {
      commenterId,
      isMe,
      name,
      email,
      roleType,
      roleLabel,
      isReporter,
      isAssignee,
      initials,
      avatarUrl: c.user?.avatarUrl,
    };
  }

  async function doTransition() {
    if (!transitionModal || !bugId) return;
    setTransitioning(true);
    try {
      const res = await bugsApi.transition(bugId, {
        status: transitionModal.status,
        resolution: transitionModal.status === 'CLOSED' ? (resolution || 'FIXED_VERIFIED') : undefined,
        comment: transitionComment || undefined,
      });
      setBug((b: any) => ({ ...b, status: res.data.status, resolution: res.data.resolution }));
      // Refresh bug details to reflect new status, resolution, and activity log
      bugsApi.get(bugId).then((r) => setBug(r.data)).catch(() => {});
      setTransitionModal(null);
      setResolution('');
      setTransitionComment('');
    } catch (err: any) {
      alert(err?.message || 'Failed to transition status');
    } finally {
      setTransitioning(false);
    }
  }

  async function toggleWatch() {
    if (!bugId) return;
    const res = await bugsApi.toggleWatch(bugId);
    setWatching(res.data.watching);
  }

  const projectMember = bug?.project?.members?.find((m: any) => m.userId === user?.id);
  let rawRole = user?.globalRole === 'ADMIN'
    ? 'ADMIN'
    : (projectMember?.projectRole || (user?.id === bug?.reportedById ? 'QA' : (user?.id === bug?.assignedToId ? 'DEV' : 'QA')));
  if (rawRole && (rawRole.endsWith('_DEV') || rawRole === 'DEVELOPER')) rawRole = 'DEV';
  if (rawRole === 'PROJECT_LEAD') rawRole = 'LEAD';
  const effectiveRole = rawRole;
  const isQAOrLeadOrAdmin = ['QA', 'LEAD', 'ADMIN'].includes(effectiveRole);
  const availableTransitions = bug ? (TRANSITIONS[effectiveRole]?.[bug.status] ?? []) : [];

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1080px', margin: '0 auto' }}>
          <div className="skeleton" style={{ height: '40px', width: '200px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
            <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!bug) {
    return (
      <AppLayout>
        <div className="empty-state">
          <div className="empty-state-icon">
            <AlertCircle size={24} />
          </div>
          <p className="empty-state-title">Defect not found</p>
          <button className="btn btn-primary" onClick={() => router.push('/bugs')}>
            <ArrowLeft size={14} />
            <span>Back to Defects</span>
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Breadcrumb & Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <button
              onClick={() => router.push('/bugs')}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px', gap: '5px' }}
            >
              <ArrowLeft size={13} />
              <span>Defects</span>
            </button>
            <span style={{ color: 'var(--color-text-faint)' }}>/</span>
            <code style={{ fontSize: '12px', fontWeight: '600' }}>{bug.issueKey}</code>
            {bug.isRegression && (
              <span className="badge badge-critical" style={{ fontSize: '10px' }}>
                Regression Defect
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(user?.globalRole === 'ADMIN' || bug.reportedById === user?.id || user?.projectMembers?.some((m: any) => m.projectId === bug.projectId && m.projectRole === 'LEAD')) && (
              <button
                type="button"
                onClick={handleDeleteBug}
                disabled={deletingBug}
                className="btn btn-secondary btn-sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '12px', gap: '5px' }}
                title="Delete Defect"
              >
                <Trash2 size={13} />
                <span>{deletingBug ? 'Deleting...' : 'Delete Defect'}</span>
              </button>
            )}
            <button
              onClick={toggleWatch}
              className={`btn btn-sm ${watching ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', gap: '5px' }}
            >
              {watching ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{watching ? 'Watching' : 'Watch Ticket'}</span>
            </button>
          </div>
        </div>

        {/* Retest Workflow Callout Banner */}
        {bug.status === 'FIXED' && (
          <div style={{
            background: 'var(--color-success-dim)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
              <div>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {isQAOrLeadOrAdmin ? 'Ready for QA Verification & Retest' : 'Defect Fixed — Awaiting QA Verification'}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  {isQAOrLeadOrAdmin
                    ? 'Developer has addressed this defect. Execute verification tests in the current build to sign off or reopen.'
                    : 'Developer has addressed this defect. QA will execute verification tests in the current build to sign off or reopen.'}
                </p>
              </div>
            </div>
            {isQAOrLeadOrAdmin && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setTransitionModal({ status: 'RETEST' })}
                  className="btn btn-sm btn-success"
                >
                  Mark Retesting
                </button>
                <button
                  onClick={() => {
                    setResolution('FIXED_VERIFIED');
                    setTransitionModal({ status: 'CLOSED' });
                  }}
                  className="btn btn-sm btn-primary"
                >
                  Verify & Close Defect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Left Column (Ticket Details, Tabs, Investigation, Comments) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Title & Workflow Bar Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text)', lineHeight: '1.4', margin: 0 }}>
                  {bug.title}
                </h1>
                <span className={`badge badge-status-${bug.status.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                  {bug.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Status Transition Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Transition Status:
                </span>
                {availableTransitions.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>
                    No transitions available for current status and role.
                  </span>
                ) : (
                  availableTransitions.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => setTransitionModal({ status: nextStatus })}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '11.5px', padding: '4px 9px' }}
                    >
                      → {nextStatus.replace(/_/g, ' ')}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '2px',
            }}>
              {[
                { id: 'details', label: 'Defect Details', icon: Layers },
                { id: 'comments', label: `Discussion (${bug.comments?.length || 0})`, icon: MessageSquare },
                { id: 'activity', label: `Activity History (${bug.activityLogs?.length || 0})`, icon: History },
                { id: 'attachments', label: `Attachments (${bug.attachments?.length || 0})`, icon: Paperclip },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '12.5px',
                      padding: '8px 12px',
                      borderRadius: '6px 6px 0 0',
                      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: isActive ? '600' : '500',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab: Details */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Description */}
                <div className="card">
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Description
                  </h3>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                    {bug.description ? (
                      <ReactMarkdown>{bug.description}</ReactMarkdown>
                    ) : (
                      <span style={{ color: 'var(--color-text-faint)' }}>No detailed description provided.</span>
                    )}
                  </div>
                </div>

                {/* Steps to Reproduce */}
                {bug.stepsToReproduce && (
                  <div className="card">
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                      Steps to Reproduce
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text)', background: 'var(--color-surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                      {bug.stepsToReproduce}
                    </div>
                  </div>
                )}

                {/* Expected vs Actual Results */}
                {(bug.expectedResult || bug.actualResult) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-success)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Expected Behavior
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0 }}>
                        {bug.expectedResult || 'Not specified'}
                      </p>
                    </div>
                    <div className="card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Actual Behavior
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0 }}>
                        {bug.actualResult || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual Evidence / Screenshots in Details Tab */}
                {bug.attachments && bug.attachments.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{
                        fontSize: '12.5px',
                        fontWeight: '700',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <ImagePlus size={15} color="var(--color-primary)" />
                        <span>Visual Evidence & Screenshots ({bug.attachments.length})</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('attachments')}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11.5px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>View Gallery & Upload More</span>
                        <span>→</span>
                      </button>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '12px',
                    }}>
                      {bug.attachments.map((att: any) => {
                        const imgUrl = attachmentsApi.fileUrl(bug.id, att.id);
                        return (
                          <div
                            key={att.id}
                            onClick={() => setLightboxImg({
                              url: imgUrl,
                              filename: att.filename,
                              size: Number(att.fileSizeBytes || att.size || 0),
                            })}
                            style={{
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              background: 'var(--color-surface)',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <div style={{
                              height: '125px',
                              width: '100%',
                              background: '#0d1117',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={att.filename}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                right: '6px',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#ffffff',
                                fontSize: '10.5px',
                              }}>
                                <Maximize2 size={11} />
                                <span>Zoom</span>
                              </div>
                            </div>

                            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--color-border)' }}>
                              <div
                                title={att.filename}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: 'var(--color-text)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {att.filename}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                                {(att.fileSizeBytes || att.size)
                                  ? (Number(att.fileSizeBytes || att.size) > 1024 * 1024
                                      ? `${(Number(att.fileSizeBytes || att.size) / (1024 * 1024)).toFixed(1)} MB`
                                      : `${Math.round(Number(att.fileSizeBytes || att.size) / 1024)} KB`)
                                  : 'Image'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Comments (QA & Developer Discussion) */}
            {activeTab === 'comments' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '22px' }}>
                {/* Thread Stakeholders & Context Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #059669 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}>
                      <MessageSquare size={15} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-text)' }}>
                          QA Tester & Developer Discussion
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '1px 8px',
                          borderRadius: '12px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#4f46e5',
                        }}>
                          {bug.comments?.length || 0} messages
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        Collaborative thread for reproduction notes, code fixes, and QA verification
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {bug.reportedBy && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                      }}>
                        <ShieldCheck size={13} color="#059669" />
                        <span style={{ color: 'var(--color-text-muted)' }}>QA:</span>
                        <span style={{ fontWeight: '700', color: '#065f46' }}>{bug.reportedBy.name}</span>
                      </div>
                    )}
                    {bug.assignedTo ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                      }}>
                        <Code2 size={13} color="#4f46e5" />
                        <span style={{ color: 'var(--color-text-muted)' }}>Dev:</span>
                        <span style={{ fontWeight: '700', color: '#3730a3' }}>{bug.assignedTo.name}</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        color: 'var(--color-text-faint)',
                      }}>
                        <Code2 size={13} />
                        <span>Dev: Unassigned</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation Stream */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(!bug.comments || bug.comments.length === 0) ? (
                    <div style={{
                      padding: '44px 20px',
                      textAlign: 'center',
                      background: 'var(--color-surface-2)',
                      borderRadius: '12px',
                      border: '1px dashed var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4f46e5',
                      }}>
                        <MessageSquare size={20} />
                      </div>
                      <div style={{ maxWidth: '380px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>
                          No Discussion Yet
                        </h4>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>
                          Start the conversation below. Share reproduction notes, logs, code findings, or verification status.
                        </p>
                      </div>
                    </div>
                  ) : (
                    bug.comments.map((c: any) => {
                      const author = getCommentAuthorInfo(c);
                      const messageBody = c.bodyMarkdown || c.content || '';
                      
                      // Theme styles based on role and isMe
                      const isMe = author.isMe;
                      const isQA = author.roleType === 'QA';
                      const isDev = author.roleType === 'DEV';
                      const isLead = author.roleType === 'LEAD';

                      const roleBadgeBg = isQA
                        ? 'rgba(16, 185, 129, 0.12)'
                        : isDev
                        ? 'rgba(99, 102, 241, 0.12)'
                        : isLead
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(100, 116, 139, 0.12)';

                      const roleBadgeColor = isQA
                        ? '#059669'
                        : isDev
                        ? '#4f46e5'
                        : isLead
                        ? '#d97706'
                        : '#475569';

                      const roleBadgeBorder = isQA
                        ? 'rgba(16, 185, 129, 0.3)'
                        : isDev
                        ? 'rgba(99, 102, 241, 0.3)'
                        : isLead
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(100, 116, 139, 0.25)';

                      const avatarGradient = isQA
                        ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
                        : isDev
                        ? 'linear-gradient(135deg, #0284c7 0%, #0F3A56 100%)'
                        : isLead
                        ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';

                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: isMe
                              ? 'rgba(14, 165, 233, 0.10)'
                              : 'var(--color-surface)',
                            border: isMe
                              ? '1px solid rgba(56, 189, 248, 0.35)'
                              : '1px solid var(--color-border)',
                            boxShadow: isMe
                              ? '0 2px 8px rgba(14, 165, 233, 0.12)'
                              : '0 1px 4px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Author Avatar */}
                          <div style={{ flexShrink: 0 }}>
                            {author.avatarUrl ? (
                              <img
                                src={author.avatarUrl}
                                alt={author.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '10px',
                                  background: avatarGradient,
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                }}
                              >
                                {author.initials}
                              </div>
                            )}
                          </div>

                          {/* Message Body & Metadata */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Message Header */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '6px',
                              flexWrap: 'wrap',
                              gap: '6px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
                                  {author.name}
                                </span>

                                {/* Role Badge */}
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '1.5px 7px',
                                  borderRadius: '6px',
                                  background: roleBadgeBg,
                                  color: roleBadgeColor,
                                  border: `1px solid ${roleBadgeBorder}`,
                                }}>
                                  {isQA && <ShieldCheck size={11} />}
                                  {isDev && <Code2 size={11} />}
                                  {isLead && <UserCheck size={11} />}
                                  <span>{author.roleLabel}</span>
                                </span>

                                {/* "You" indicator */}
                                {isMe && (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #0D1117 0%, #0A1929 50%, #0F3A56 100%)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    letterSpacing: '0.4px',
                                    textTransform: 'uppercase',
                                  }}>
                                    You
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  title={new Date(c.createdAt).toLocaleString()}
                                  style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}
                                >
                                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                </span>

                                {isMe && (
                                  confirmDeleteId === c.id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <button
                                        type="button"
                                        disabled={deletingId === c.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteComment(c.id);
                                        }}
                                        className="btn btn-danger btn-sm"
                                        style={{
                                          padding: '2px 8px',
                                          height: '22px',
                                          fontSize: '10.5px',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          background: '#ef4444',
                                          color: '#ffffff',
                                          border: 'none',
                                        }}
                                      >
                                        <Trash2 size={10} />
                                        <span>{deletingId === c.id ? 'Deleting...' : 'Delete'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingId === c.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(null);
                                        }}
                                        className="btn btn-ghost btn-sm"
                                        style={{
                                          padding: '2px 6px',
                                          height: '22px',
                                          fontSize: '10.5px',
                                          borderRadius: '4px',
                                          color: 'var(--color-text-muted)',
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(c.id);
                                      }}
                                      title="Delete comment"
                                      className="btn btn-ghost btn-sm"
                                      style={{
                                        padding: '3px 6px',
                                        height: 'auto',
                                        color: 'var(--color-text-faint)',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Message Text rendered as Markdown */}
                            <div style={{
                              fontSize: '13px',
                              color: 'var(--color-text)',
                              lineHeight: 1.6,
                              marginTop: '2px',
                            }}>
                              {messageBody ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p style={{ margin: '0 0 6px 0', lineHeight: '1.55' }}>{children}</p>,
                                    pre: ({ children }) => (
                                      <pre style={{
                                        background: '#0f172a',
                                        color: '#f8fafc',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        overflowX: 'auto',
                                        margin: '8px 0',
                                        fontFamily: 'var(--font-mono, monospace)',
                                        border: '1px solid #1e293b',
                                      }}>
                                        {children}
                                      </pre>
                                    ),
                                    code: ({ inline, children }: any) => (
                                      inline ? (
                                        <code style={{
                                          background: 'rgba(99, 102, 241, 0.08)',
                                          color: '#4338ca',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          fontFamily: 'var(--font-mono, monospace)',
                                          fontWeight: '600',
                                        }}>
                                          {children}
                                        </code>
                                      ) : (
                                        <code>{children}</code>
                                      )
                                    ),
                                    ul: ({ children }) => <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>{children}</ul>,
                                    ol: ({ children }) => <ol style={{ margin: '4px 0 6px 18px', padding: 0 }}>{children}</ol>,
                                    li: ({ children }) => <li style={{ marginBottom: '3px' }}>{children}</li>,
                                    blockquote: ({ children }) => (
                                      <blockquote style={{
                                        borderLeft: '3px solid var(--color-primary)',
                                        margin: '6px 0',
                                        padding: '4px 12px',
                                        color: 'var(--color-text-secondary)',
                                        background: 'var(--color-surface-2)',
                                        borderRadius: '0 6px 6px 0',
                                        fontStyle: 'italic',
                                      }}>
                                        {children}
                                      </blockquote>
                                    ),
                                  }}
                                >
                                  {messageBody}
                                </ReactMarkdown>
                              ) : (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-text-faint)' }}>
                                  (Empty message)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment Input Composer */}
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  {/* Identity pill & quick insertion templates */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: user?.globalRole === 'ADMIN'
                          ? '#2563eb'
                          : (effectiveRole === 'DEV' ? '#6366f1' : '#059669'),
                        color: '#fff',
                        fontSize: '9.5px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Posting as:</span>
                      <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{user?.name || 'User'}</span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        background: effectiveRole === 'DEV' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: effectiveRole === 'DEV' ? '#4f46e5' : '#059669',
                      }}>
                        {effectiveRole === 'DEV' ? 'Developer' : (effectiveRole === 'QA' ? 'QA Tester' : effectiveRole)}
                      </span>
                    </div>

                    {/* Quick insert templates */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>Quick Template:</span>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**QA Retest Status:** Verified in Build [v1.0] — \n- Status: PASS / FAIL\n- Test Notes: ')}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', borderRadius: '6px' }}
                      >
                        + Retest Note
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**Reproduction Steps:**\n1. \n2. \n')}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', borderRadius: '6px' }}
                      >
                        + Repro Steps
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**Fix Implemented:** Addressed root cause. \n- Ready for QA verification in next build.')}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', borderRadius: '6px' }}
                      >
                        + Dev Fix
                      </button>
                    </div>
                  </div>

                  {/* Formatting Toolbar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--color-surface-2)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}>
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => insertMarkdown('**', '**')}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 7px', height: '26px' }}
                    >
                      <Bold size={12} />
                    </button>
                    <button
                      type="button"
                      title="Inline Code"
                      onClick={() => insertMarkdown('`', '`')}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 7px', height: '26px' }}
                    >
                      <Code size={12} />
                    </button>
                    <button
                      type="button"
                      title="Code Block"
                      onClick={() => insertMarkdown('```\n', '\n```')}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 7px', height: '26px' }}
                    >
                      <Code2 size={12} />
                    </button>
                    <button
                      type="button"
                      title="Quote"
                      onClick={() => insertMarkdown('> ')}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 7px', height: '26px' }}
                    >
                      <Quote size={12} />
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
                      Markdown & Code supported
                    </span>
                  </div>

                  <textarea
                    id="comment-input"
                    className="textarea"
                    rows={3}
                    placeholder="Write a message, share reproduction logs, technical findings, or verification feedback... (Ctrl+Enter to post)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                    style={{ minHeight: '85px', fontSize: '13px', lineHeight: '1.55' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-faint)' }}>
                      Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', fontSize: '10.5px' }}>Ctrl</kbd> + <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', fontSize: '10.5px' }}>Enter</kbd> to post
                    </span>
                    <button
                      onClick={addComment}
                      disabled={commenting || !comment.trim()}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 18px', gap: '6px' }}
                    >
                      <Send size={13} />
                      <span>{commenting ? 'Posting...' : 'Post Comment'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Activity */}
            {activeTab === 'activity' && (
              <div className="card" style={{ padding: '20px' }}>
                {(!bug.activityLogs || bug.activityLogs.length === 0) ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <History size={24} style={{ color: 'var(--color-text-faint)', margin: '0 auto 8px', display: 'block' }} />
                    No activity logs recorded yet for this defect.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bug.activityLogs.map((log: any) => {
                      const timestamp = log.changedAt || log.createdAt;
                      let formattedDate = 'Recently';
                      let fullDateTime = '';
                      if (timestamp) {
                        try {
                          const d = new Date(timestamp);
                          if (!isNaN(d.getTime())) {
                            formattedDate = formatDistanceToNow(d, { addSuffix: true });
                            fullDateTime = d.toLocaleString();
                          }
                        } catch {}
                      }

                      const userName = log.user?.name || 'System';
                      const field = log.fieldChanged;

                      return (
                        <div
                          key={log.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontSize: '12.5px',
                            padding: '10px 12px',
                            background: 'var(--color-surface-2)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#4f46e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '1px',
                            }}>
                              <History size={13} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {field === 'status' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{userName}</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>changed status from</span>
                                  {log.oldValue && (
                                    <span className={`badge badge-status-${log.oldValue.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                                      {log.oldValue.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  <span style={{ color: 'var(--color-text-faint)' }}>→</span>
                                  {log.newValue && (
                                    <span className={`badge badge-status-${log.newValue.toLowerCase().replace(/_/g, '-')}`} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                                      {log.newValue.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                              ) : (field === 'severity' || field === 'priority') ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{userName}</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>updated {field} from</span>
                                  <code style={{ fontSize: '11px', background: 'var(--color-surface)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                    {log.oldValue || 'None'}
                                  </code>
                                  <span style={{ color: 'var(--color-text-faint)' }}>→</span>
                                  <code style={{ fontSize: '11px', background: 'var(--color-surface)', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', border: '1px solid var(--color-border)' }}>
                                    {log.newValue || 'None'}
                                  </code>
                                </div>
                              ) : log.action ? (
                                <div>
                                  <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{userName}</span>{' '}
                                  <span style={{ color: 'var(--color-text-muted)' }}>{log.action}</span>
                                  {log.details && (
                                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--color-text-faint)' }}>
                                      {log.details}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{userName}</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>updated {field || 'defect'}</span>
                                  {log.newValue && (
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                      to &quot;{log.newValue.length > 60 ? log.newValue.slice(0, 60) + '...' : log.newValue}&quot;
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            title={fullDateTime}
                            style={{ fontSize: '11px', color: 'var(--color-text-faint)', whiteSpace: 'nowrap', marginTop: '2px' }}
                          >
                            {formattedDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Attachments (QA Screenshots Viewing Only) */}
            {activeTab === 'attachments' && (
              <div className="card">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <ImagePlus size={15} color="var(--color-primary)" />
                    <span>QA Defect Screenshots ({bug.attachments?.length || 0})</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Visual proof and screenshots attached by QA during defect reporting.
                  </p>
                </div>

                {(!bug.attachments || bug.attachments.length === 0) ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <Paperclip size={24} style={{ color: 'var(--color-text-faint)', margin: '0 auto 6px', display: 'block' }} />
                    No visual screenshots were attached by QA for this defect.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '16px',
                  }}>
                    {bug.attachments.map((att: any) => {
                      const imgUrl = attachmentsApi.fileUrl(bug.id, att.id);
                      const fileSizeNum = Number(att.fileSizeBytes || att.size || 0);
                      const isBeingDeleted = attachmentDeleteId === att.id;

                      return (
                        <div
                          key={att.id}
                          style={{
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}
                        >
                          {/* Thumbnail view */}
                          <div
                            onClick={() => setLightboxImg({
                              url: imgUrl,
                              filename: att.filename,
                              size: fileSizeNum,
                            })}
                            style={{
                              height: '160px',
                              width: '100%',
                              background: '#0d1117',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={att.filename}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.3)',
                              opacity: 0,
                              transition: 'opacity 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                            >
                              <Maximize2 size={16} />
                              <span>Click to Enlarge</span>
                            </div>
                          </div>

                          {/* Image Info & Actions */}
                          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)' }}>
                            <div
                              title={att.filename}
                              style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--color-text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {att.filename}
                            </div>

                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '4px',
                              fontSize: '11px',
                              color: 'var(--color-text-faint)',
                            }}>
                              <span>
                                {fileSizeNum > 1024 * 1024
                                  ? `${(fileSizeNum / (1024 * 1024)).toFixed(1)} MB`
                                  : `${Math.round(fileSizeNum / 1024)} KB`}
                              </span>
                              {att.uploadedBy?.name && (
                                <span>by {att.uploadedBy.name}</span>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '10px',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--color-border)',
                            }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <a
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  title="Open raw image in new tab"
                                >
                                  <ExternalLink size={12} />
                                  <span>Raw</span>
                                </a>

                                <a
                                  href={imgUrl}
                                  download={att.filename}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  title="Download image file"
                                >
                                  <Download size={12} />
                                  <span>Download</span>
                                </a>
                              </div>

                              {/* Delete button (restricted to QA reporter / admin only, dev cannot delete) */}
                              {(user?.globalRole === 'ADMIN' || (att.uploadedById ? att.uploadedById === user?.id : bug.reportedById === user?.id)) && (
                                isBeingDeleted ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      onClick={() => handleDeleteAttachment(att.id)}
                                      disabled={deletingAttachment}
                                      style={{
                                        background: 'var(--color-danger)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '10.5px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {deletingAttachment ? '...' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={() => setAttachmentDeleteId(null)}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        padding: '2px 5px',
                                        fontSize: '10.5px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAttachmentDeleteId(att.id)}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '3px 6px', color: 'var(--color-danger)' }}
                                    title="Delete attachment (Uploader / Admin only)"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Metadata Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                Defect Properties
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Severity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Severity</span>
                  <span className={`badge badge-${bug.severity.toLowerCase()}`}>{bug.severity}</span>
                </div>

                {/* Priority */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Priority</span>
                  <span className={`badge badge-${bug.priority.toLowerCase()}`}>{bug.priority}</span>
                </div>

                {/* Bug Area */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Technical Area</span>
                  <span className="area-pill">{bug.bugArea}</span>
                </div>

                {/* Environment */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Environment</span>
                  <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
                    {bug.environment || 'QA'}
                  </span>
                </div>

                {/* Testing Cycle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Testing Cycle</span>
                  {bug.testingCycle ? (
                    <Link
                      href={`/testing-cycles/${bug.testingCycle.id}`}
                      style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}
                    >
                      {bug.testingCycle.name.split('—')[0]}
                    </Link>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>None</span>
                  )}
                </div>

                {/* Requirement */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Requirement</span>
                  {bug.requirement ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-text)', fontWeight: '500' }}>
                      {bug.requirement.title}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>None</span>
                  )}
                </div>

                <div className="divider" style={{ margin: '8px 0' }} />

                {/* People: Assignee */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Assignee</span>
                  {bug.assignedTo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px' }}>
                        {bug.assignedTo.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text)', fontWeight: '500' }}>
                        {bug.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>Unassigned</span>
                  )}
                </div>

                {/* Reporter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Reported By</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text)', fontWeight: '500' }}>
                    {bug.reportedBy?.name || 'System'}
                  </span>
                </div>

                <div className="divider" style={{ margin: '8px 0' }} />

                {/* Dates */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Reported Date</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-faint)' }}>
                    {new Date(bug.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {bug.resolvedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Resolved Date</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-success)', fontWeight: '600' }}>
                      {new Date(bug.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transition Dialog Modal */}
        <Modal isOpen={!!transitionModal} onClose={() => setTransitionModal(null)} maxWidth="480px">
          {transitionModal && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                  Confirm Transition: {transitionModal.status.replace(/_/g, ' ')}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setTransitionModal(null)}>
                  <X size={15} />
                </button>
              </div>

              {transitionModal.status === 'CLOSED' && (
                <div style={{ marginBottom: '14px' }}>
                  <label className="label">Resolution *</label>
                  <select
                    className="select"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    required
                  >
                    <option value="">Select Resolution Reason</option>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label className="label">Transition Comment / QA Note</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Optional context about this status change..."
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTransitionModal(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={doTransition}
                  disabled={transitioning || (transitionModal.status === 'CLOSED' && !resolution)}
                >
                  {transitioning ? 'Updating...' : `Confirm → ${transitionModal.status}`}
                </button>
              </div>
            </>
          )}
        </Modal>

        {/* Lightbox Modal for High-Resolution Screenshot Inspection */}
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
            }}
          >
            {/* Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 16px',
                background: 'rgba(20, 24, 33, 0.95)',
                borderRadius: '8px',
                marginBottom: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileImage size={16} color="#60a5fa" />
                <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{lightboxImg.filename}</span>
                {lightboxImg.size && lightboxImg.size > 0 ? (
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    ({lightboxImg.size > 1024 * 1024
                      ? `${(lightboxImg.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(lightboxImg.size / 1024)} KB`})
                  </span>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={lightboxImg.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '12px' }}
                >
                  <ExternalLink size={13} />
                  <span>Open Full Size</span>
                </a>

                <a
                  href={lightboxImg.url}
                  download={lightboxImg.filename}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '12px' }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>

                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div
              onClick={() => setLightboxImg(null)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                cursor: 'zoom-out',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImg.url}
                alt={lightboxImg.filename}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '84vh',
                  objectFit: 'contain',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                  borderRadius: '6px',
                  cursor: 'default',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
