'use client';
import AppLayout from '@/components/AppLayout';
import { useState, useEffect } from 'react';
import { bugsApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
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
} from 'lucide-react';

const TRANSITIONS: Record<string, Record<string, string[]>> = {
  LEAD: { NEW: ['ASSIGNED','DEFERRED','CLOSED'], ASSIGNED: ['IN_PROGRESS','DEFERRED'], IN_PROGRESS: ['DEFERRED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], DEFERRED: ['ASSIGNED'], FIXED: ['RETEST'], RETEST: ['CLOSED','REOPENED'], REOPENED: ['IN_PROGRESS','DEFERRED'], CLOSED: ['REOPENED'] },
  DEV: { ASSIGNED: ['IN_PROGRESS'], IN_PROGRESS: ['FIXED','CANNOT_REPRODUCE','REJECTED'], REOPENED: ['IN_PROGRESS'] },
  QA: { NEW: ['CLOSED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], FIXED: ['RETEST'], RETEST: ['CLOSED','REOPENED'], CLOSED: ['REOPENED'] },
  ADMIN: { NEW: ['ASSIGNED','DEFERRED','CLOSED'], ASSIGNED: ['IN_PROGRESS','DEFERRED','CLOSED'], IN_PROGRESS: ['FIXED','CANNOT_REPRODUCE','REJECTED','DEFERRED'], CANNOT_REPRODUCE: ['IN_PROGRESS','CLOSED'], REJECTED: ['IN_PROGRESS','CLOSED'], DEFERRED: ['ASSIGNED','CLOSED'], FIXED: ['RETEST','CLOSED'], RETEST: ['CLOSED','REOPENED'], REOPENED: ['IN_PROGRESS','DEFERRED'], CLOSED: ['REOPENED'] },
};

const RESOLUTION_OPTIONS = ['FIXED_VERIFIED','WONT_FIX','BY_DESIGN','DUPLICATE','CANNOT_REPRODUCE_ABANDONED'];

export default function BugDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const bugId = (routeParams?.id as string) || '';
  const { user } = useAuth();
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
      setBug((b: any) => ({ ...b, comments: [...(b.comments ?? []), res.data] }));
      setComment('');
    } finally {
      setCommenting(false);
    }
  }

  async function doTransition() {
    if (!transitionModal || !bugId) return;
    setTransitioning(true);
    try {
      const res = await bugsApi.transition(bugId, {
        status: transitionModal.status,
        resolution: transitionModal.status === 'CLOSED' ? resolution : undefined,
        comment: transitionComment || undefined,
      });
      setBug((b: any) => ({ ...b, status: res.data.status, resolution: res.data.resolution }));
      setTransitionModal(null);
      setResolution('');
      setTransitionComment('');
    } finally {
      setTransitioning(false);
    }
  }

  async function toggleWatch() {
    if (!bugId) return;
    const res = await bugsApi.toggleWatch(bugId);
    setWatching(res.data.watching);
  }

  const effectiveRole = user?.globalRole === 'ADMIN' ? 'ADMIN' : (bug?.projectId ? 'DEV' : 'QA');
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

          <button
            onClick={toggleWatch}
            className={`btn btn-sm ${watching ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', gap: '5px' }}
          >
            {watching ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{watching ? 'Watching' : 'Watch Ticket'}</span>
          </button>
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
                  Ready for QA Verification & Retest
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  Developer has addressed this defect. Execute verification tests in the current build to sign off or reopen.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTransitionModal({ status: 'RETEST' })}
                className="btn btn-sm btn-success"
              >
                Mark Retesting
              </button>
              <button
                onClick={() => setTransitionModal({ status: 'CLOSED' })}
                className="btn btn-sm btn-primary"
              >
                Verify & Close Defect
              </button>
            </div>
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
              </div>
            )}

            {/* Tab: Comments */}
            {activeTab === 'comments' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(!bug.comments || bug.comments.length === 0) ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      No comments yet. Start the triage discussion below.
                    </div>
                  ) : (
                    bug.comments.map((c: any) => (
                      <div
                        key={c.id}
                        style={{
                          background: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>
                              {c.author?.name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text)' }}>
                              {c.author?.name || 'User'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {c.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Form */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Add technical findings, logs, reproduction notes, or reproduction steps..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={addComment}
                      disabled={commenting || !comment.trim()}
                      className="btn btn-primary btn-sm"
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
              <div className="card">
                {(!bug.activityLogs || bug.activityLogs.length === 0) ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No activity logs recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {bug.activityLogs.map((log: any) => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '5px' }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{log.user?.name || 'System'}</span>{' '}
                          <span style={{ color: 'var(--color-text-muted)' }}>{log.action}</span>
                          {log.details && (
                            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--color-text-faint)' }}>
                              {log.details}
                            </p>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Attachments */}
            {activeTab === 'attachments' && (
              <div className="card">
                {(!bug.attachments || bug.attachments.length === 0) ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <Paperclip size={24} style={{ color: 'var(--color-text-faint)', margin: '0 auto 6px', display: 'block' }} />
                    No files or screenshots attached to this defect.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {bug.attachments.map((att: any) => (
                      <div key={att.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text)' }}>{att.filename}</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                          {Math.round(att.size / 1024)} KB
                        </div>
                      </div>
                    ))}
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
        {transitionModal && (
          <div className="modal-overlay" onClick={() => setTransitionModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: 'var(--color-text)' }}>
                Confirm Transition: {transitionModal.status.replace(/_/g, ' ')}
              </h2>

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
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
