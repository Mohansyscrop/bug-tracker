'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState, useCallback } from 'react';
import { projectsApi, bugsApi, usersApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  PlusCircle,
  Users,
  RotateCcw,
  FileText,
  Flag,
  Bug,
  Calendar,
  CheckCircle2,
  Trash2,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const projectId = (routeParams?.id as string) || '';
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [bugs, setBugs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'cycles' | 'requirements'>('overview');
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('DEV');
  const [addingMember, setAddingMember] = useState(false);

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', versionCode: '', releaseDate: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);

  // QA Cycle Modal
  const [showAddCycle, setShowAddCycle] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', cycleCode: '', environment: 'Staging', targetBuild: '', requirementId: '' });
  const [addingCycle, setAddingCycle] = useState(false);

  // Requirement Modal
  const [showAddReq, setShowAddReq] = useState(false);
  const [reqForm, setReqForm] = useState({ reqCode: '', title: '', description: '', priority: 'HIGH' });
  const [addingReq, setAddingReq] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [p, b, s, cRes, rRes] = await Promise.all([
        projectsApi.get(projectId),
        bugsApi.list({ projectId, limit: 50 }),
        projectsApi.stats(projectId),
        testingCyclesApi.list(projectId).catch(() => []),
        testingCyclesApi.listRequirements(projectId).catch(() => []),
      ]);
      setProject(p.data);
      setBugs(b.data);
      setStats(s.data);
      setCycles(Array.isArray(cRes) ? cRes : (cRes as any).data ?? []);
      setRequirements(Array.isArray(rRes) ? rRes : (rRes as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load all users when opening member modal
  const handleOpenAddMember = async () => {
    setShowAddMember(true);
    try {
      const res = await usersApi.list();
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setAllUsers(list);
      const memberIds = new Set(project?.members?.map((m: any) => m.userId) ?? []);
      const available = list.filter((u: any) => !memberIds.has(u.id));
      if (available.length > 0) {
        setAddMemberUserId(available[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberUserId) return;
    setAddingMember(true);
    setFeedback(null);
    try {
      await projectsApi.addMember(projectId, {
        userId: addMemberUserId,
        projectRole: addMemberRole,
      });
      setFeedback({ type: 'success', message: 'Project member successfully added!' });
      setShowAddMember(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to add member' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setFeedback(null);
    try {
      await projectsApi.updateMemberRole(projectId, userId, newRole);
      setFeedback({ type: 'success', message: `Updated member role to ${newRole}` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to update member role' });
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this project?`)) return;
    setFeedback(null);
    try {
      await projectsApi.removeMember(projectId, userId);
      setFeedback({ type: 'success', message: `Removed ${name} from project` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to remove member' });
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMilestone(true);
    setFeedback(null);
    try {
      await projectsApi.createMilestone(projectId, milestoneForm);
      setFeedback({ type: 'success', message: 'Milestone created!' });
      setShowAddMilestone(false);
      setMilestoneForm({ name: '', versionCode: '', releaseDate: '' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to create milestone' });
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleAddCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCycle(true);
    setFeedback(null);
    try {
      await testingCyclesApi.create({
        projectId,
        name: cycleForm.name,
        environment: cycleForm.environment,
        scope: cycleForm.cycleCode ? `Code: ${cycleForm.cycleCode}` : undefined,
      });
      setFeedback({ type: 'success', message: 'Testing cycle created successfully!' });
      setShowAddCycle(false);
      setCycleForm({ name: '', cycleCode: '', environment: 'Staging', targetBuild: '', requirementId: '' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to create testing cycle' });
    } finally {
      setAddingCycle(false);
    }
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingReq(true);
    setFeedback(null);
    try {
      await testingCyclesApi.createRequirement({
        projectId,
        reqCode: reqForm.reqCode,
        title: reqForm.title,
        description: reqForm.description || undefined,
        priority: reqForm.priority,
      });
      setFeedback({ type: 'success', message: 'Requirement created successfully!' });
      setShowAddReq(false);
      setReqForm({ reqCode: '', title: '', description: '', priority: 'HIGH' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to create requirement' });
    } finally {
      setAddingReq(false);
    }
  };

  // Determine current user's role on this project
  const currentMember = project?.members?.find((m: any) => m.userId === user?.id);
  const myRole = user?.globalRole === 'ADMIN' ? 'ADMIN' : (currentMember?.projectRole ?? 'VIEWER');
  const canManage = myRole === 'ADMIN' || myRole === 'LEAD';

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1240px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    </AppLayout>
  );

  const existingMemberIds = new Set(project?.members?.map((m: any) => m.userId) ?? []);
  const availableUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          <Link href="/projects" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', gap: '5px' }}>
            <ArrowLeft size={13} />
            <span>Projects Directory</span>
          </Link>
          <span style={{ color: 'var(--color-text-faint)' }}>/</span>
          <code>{project?.key}</code>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div style={{
            background: feedback.type === 'success' ? 'var(--color-success-dim)' : 'var(--color-danger-dim)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{feedback.message}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setFeedback(null)} style={{ padding: '2px' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <code>{project?.key}</code>
                <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  Your Access: <strong style={{ color: 'var(--color-primary)' }}>{myRole}</strong>
                </span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
                {project?.name}
              </h1>
              {project?.description && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', maxWidth: '720px' }}>
                  {project.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCycle(true)}>
                <RotateCcw size={13} />
                <span>+ New Cycle</span>
              </button>
              <Link href={`/bugs/new?projectId=${projectId}`} className="btn btn-primary btn-sm" id="project-new-bug-btn">
                <PlusCircle size={14} />
                <span>Report Defect</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '20px',
        }}>
          {[
            { id: 'overview', label: 'Overview & Team', icon: Users },
            { id: 'cycles', label: `Testing Cycles (${cycles.length})`, icon: RotateCcw },
            { id: 'requirements', label: `Requirements (${requirements.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="btn btn-ghost"
                style={{
                  padding: '9px 14px',
                  borderRadius: '6px 6px 0 0',
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '13px',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & TEAM */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Project Defect Stats */}
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stat-value">{stats.totalBugs}</div>
                    <Bug size={18} style={{ color: 'var(--color-text-faint)' }} />
                  </div>
                  <div className="stat-label">Total Defects Logged</div>
                </div>

                {Object.entries(stats.byStatus ?? {}).slice(0, 3).map(([k, v]) => (
                  <div key={k} className="stat-card">
                    <div className="stat-value">{v as number}</div>
                    <div className="stat-label">{k.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Members Matrix Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                    Project Members & Access Matrix
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Manage test engineers, developers, and QA leads assigned to this project.
                  </p>
                </div>

                {canManage && (
                  <button className="btn btn-primary btn-sm" onClick={handleOpenAddMember}>
                    <PlusCircle size={14} />
                    <span>Add Team Member</span>
                  </button>
                )}
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th>Email Address</th>
                      <th>Project Role</th>
                      {canManage && <th style={{ textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(project?.members || []).map((m: any) => (
                      <tr key={m.userId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                              {m.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '13px' }}>
                              {m.user?.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                          {m.user?.email}
                        </td>
                        <td>
                          {canManage && m.userId !== user?.id ? (
                            <select
                              className="select"
                              style={{ width: '130px', fontSize: '12px', padding: '4px 24px 4px 8px' }}
                              value={m.projectRole}
                              onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                            >
                              <option value="LEAD">LEAD (QA / Tech Lead)</option>
                              <option value="QA">QA (Test Engineer)</option>
                              <option value="DEV">DEV (Developer)</option>
                              <option value="VIEWER">VIEWER (Read Only)</option>
                            </select>
                          ) : (
                            <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                              {m.projectRole}
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td style={{ textAlign: 'right' }}>
                            {m.userId !== user?.id && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveMember(m.userId, m.user?.name)}
                                style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                                title="Remove from project"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Milestones Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                    Release Milestones
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Track planned release target builds and QA sign-off milestones.
                  </p>
                </div>

                {canManage && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMilestone(true)}>
                    <PlusCircle size={14} />
                    <span>Add Milestone</span>
                  </button>
                )}
              </div>

              {(!project?.milestones || project.milestones.length === 0) ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No milestones configured. Click "+ Add Milestone" above to schedule a release.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {project.milestones.map((m: any) => (
                    <div key={m.id} className="card-subtle">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)' }}>{m.name}</span>
                        {m.versionCode && (
                          <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
                            v{m.versionCode}
                          </span>
                        )}
                      </div>
                      {m.releaseDate && (
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                          <Calendar size={12} />
                          <span>Release: {new Date(m.releaseDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TESTING CYCLES */}
        {activeTab === 'cycles' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                  Active & Planned Testing Cycles
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Cycles scoped to {project?.name} for test execution and bug regression.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCycle(true)}>
                <PlusCircle size={14} />
                <span>+ Plan Cycle</span>
              </button>
            </div>

            {cycles.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No testing cycles created for this project yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {cycles.map((c) => (
                  <div key={c.id} className="card-subtle" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="badge badge-status-in_progress" style={{ fontSize: '10px' }}>
                          {c.status}
                        </span>
                        <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                          {c.environment}
                        </span>
                      </div>
                      <Link
                        href={`/testing-cycles/${c.id}`}
                        style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', textDecoration: 'none' }}
                      >
                        {c.name}
                      </Link>
                      {c.scope && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                          {c.scope}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                      <Link href={`/testing-cycles/${c.id}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: '600', gap: '4px' }}>
                        <span>Open Console</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REQUIREMENTS */}
        {activeTab === 'requirements' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                  Project Requirements & User Stories
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Traceable features and technical criteria verified by test scenarios.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAddReq(true)}>
                <PlusCircle size={14} />
                <span>+ Add Requirement</span>
              </button>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Req Key</th>
                    <th>Title & Description</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Linked Defects</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                        No requirements defined yet.
                      </td>
                    </tr>
                  ) : (
                    requirements.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>
                            {r.reqKey || '—'}
                          </span>
                        </td>
                        <td>
                          <strong>{r.title}</strong>
                          {r.description && (
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{r.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-low">
                            {r.priority}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-status-fixed">
                            {r.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <strong>{r.bugs?.length || 0}</strong> defects
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Member */}
        <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} maxWidth="460px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Team Member</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddMember(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Select User *</label>
              {availableUsers.length === 0 ? (
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>All available registered users are already in this project.</p>
              ) : (
                <select
                  className="select"
                  value={addMemberUserId}
                  onChange={(e) => setAddMemberUserId(e.target.value)}
                  required
                >
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label">Assigned Role *</label>
              <select
                className="select"
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value)}
                required
              >
                <option value="DEV">DEV — Developer</option>
                <option value="QA">QA — Test Engineer</option>
                <option value="LEAD">LEAD — QA / Tech Lead</option>
                <option value="VIEWER">VIEWER — Read Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingMember || availableUsers.length === 0}>
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Milestone */}
        <Modal isOpen={showAddMilestone} onClose={() => setShowAddMilestone(false)} maxWidth="460px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Release Milestone</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddMilestone(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Milestone Name *</label>
              <input
                className="input"
                placeholder="e.g. v2.0 Production Release"
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Version Code</label>
              <input
                className="input"
                placeholder="e.g. 2.0.0"
                value={milestoneForm.versionCode}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, versionCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Target Release Date</label>
              <input
                type="date"
                className="input"
                value={milestoneForm.releaseDate}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, releaseDate: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddMilestone(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingMilestone || !milestoneForm.name.trim()}>
                {addingMilestone ? 'Saving...' : 'Create Milestone'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Cycle */}
        <Modal isOpen={showAddCycle} onClose={() => setShowAddCycle(false)} maxWidth="480px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Plan New Testing Cycle</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddCycle(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddCycle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Cycle Name *</label>
              <input
                className="input"
                placeholder="e.g. Sprint 24 — Regression & Payment Gateways"
                value={cycleForm.name}
                onChange={(e) => setCycleForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Environment</label>
              <select
                className="select"
                value={cycleForm.environment}
                onChange={(e) => setCycleForm((f) => ({ ...f, environment: e.target.value }))}
              >
                <option value="QA">QA Build</option>
                <option value="Staging">Staging</option>
                <option value="UAT">UAT</option>
                <option value="Production">Production</option>
              </select>
            </div>
            <div>
              <label className="label">Cycle Code / Ref</label>
              <input
                className="input"
                placeholder="e.g. TC-02"
                value={cycleForm.cycleCode}
                onChange={(e) => setCycleForm((f) => ({ ...f, cycleCode: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCycle(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingCycle || !cycleForm.name.trim()}>
                {addingCycle ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Requirement */}
        <Modal isOpen={showAddReq} onClose={() => setShowAddReq(false)} maxWidth="480px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Requirement</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddReq(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Requirement Code</label>
              <input
                className="input"
                placeholder="e.g. REQ-101"
                value={reqForm.reqCode}
                onChange={(e) => setReqForm((f) => ({ ...f, reqCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Requirement Title *</label>
              <input
                className="input"
                placeholder="e.g. User Authentication & 2FA"
                value={reqForm.title}
                onChange={(e) => setReqForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="select"
                value={reqForm.priority}
                onChange={(e) => setReqForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="label">Description / User Story</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Describe requirement criteria..."
                value={reqForm.description}
                onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddReq(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingReq || !reqForm.title.trim()}>
                {addingReq ? 'Saving...' : 'Create Requirement'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
