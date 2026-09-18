'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState } from 'react';
import { usersApi, projectsApi, bugsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ShieldCheck,
  Users,
  Settings,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Lock,
  Server,
  UserCheck,
  Shield,
  FolderKanban,
  Bug,
} from 'lucide-react';

interface ProjectAssignment {
  projectId: string;
  projectRole: string;
}

const DEFAULT_PERMISSIONS = [
  { id: 'view', cap: 'View Projects & Tickets', admin: true, lead: true, qa: true, dev: true, viewer: true },
  { id: 'create', cap: 'Report / Create New Bug', admin: true, lead: true, qa: true, dev: true, viewer: false },
  { id: 'assign', cap: 'Assign Bug & Set Priority (P1–P4)', admin: true, lead: true, qa: false, dev: false, viewer: false },
  { id: 'progress', cap: 'Mark In Progress & Fixed', admin: true, lead: true, qa: false, dev: true, viewer: false },
  { id: 'reproduce', cap: 'Mark Cannot Reproduce / Rejected', admin: true, lead: true, qa: false, dev: true, viewer: false },
  { id: 'verify', cap: 'Verify Fix / Retest Build', admin: true, lead: true, qa: true, dev: false, viewer: false },
  { id: 'close', cap: 'Close Bug (with Resolution)', admin: true, lead: true, qa: true, dev: false, viewer: false },
  { id: 'reopen', cap: 'Reopen Verified Defect', admin: true, lead: true, qa: true, dev: false, viewer: false },
  { id: 'members', cap: 'Manage Project Members & Roles', admin: true, lead: true, qa: false, dev: false, viewer: false },
  { id: 'milestones', cap: 'Manage Milestones & Components', admin: true, lead: true, qa: false, dev: false, viewer: false },
  { id: 'global', cap: 'Global User Provisioning & Roles', admin: true, lead: false, qa: false, dev: false, viewer: false },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'system'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Notifications
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Overview stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    projectCount: 0,
    bugCount: 0,
  });

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    assignedRole: 'DEV',
    selectedProjectId: '',
    assignToAllProjects: false,
  });

  // Edit User Roles & Permissions Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editGlobalRole, setEditGlobalRole] = useState<'STANDARD' | 'ADMIN'>('STANDARD');
  const [editProjectRoles, setEditProjectRoles] = useState<{ [projectId: string]: string }>({});
  const [savingRoles, setSavingRoles] = useState(false);
  const [editRolesError, setEditRolesError] = useState('');

  // Editable Matrix State
  const [permissionMatrix, setPermissionMatrix] = useState(DEFAULT_PERMISSIONS);
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'LEAD' | 'QA' | 'DEV' | 'VIEWER'>('ALL');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bugtracker_permission_matrix');
      if (saved) {
        setPermissionMatrix(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      const userList = Array.isArray(res) ? res : (res as any).data ?? [];
      setUsers(userList);

      const [projRes, bugsRes] = await Promise.all([
        projectsApi.list().catch(() => ({ data: [] })),
        bugsApi.list({ limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
      ]);

      const projList = (projRes as any).data ?? [];
      setProjects(projList);

      if (projList.length > 0 && !createForm.selectedProjectId) {
        setCreateForm((f) => ({ ...f, selectedProjectId: projList[0].id }));
      }

      setStats({
        totalUsers: userList.length,
        adminCount: userList.filter((u: any) => u.globalRole === 'ADMIN').length,
        projectCount: projList.length,
        bugCount: (bugsRes as any).meta?.total ?? 0,
      });
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && user.globalRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    if (!authLoading && user?.globalRole === 'ADMIN') {
      fetchUsers();
    }
  }, [user, authLoading, router]);

  const openEditRolesModal = (targetUser: any) => {
    setEditingUser(targetUser);
    setEditGlobalRole(targetUser.globalRole === 'ADMIN' ? 'ADMIN' : 'STANDARD');
    setEditRolesError('');

    const roleMap: { [projectId: string]: string } = {};
    projects.forEach((p) => {
      const member = targetUser.projectMembers?.find((pm: any) => pm.projectId === p.id);
      roleMap[p.id] = member ? member.projectRole : 'NONE';
    });
    setEditProjectRoles(roleMap);
  };

  const handleSaveRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingRoles(true);
    setEditRolesError('');

    try {
      if (editingUser.globalRole !== editGlobalRole) {
        await usersApi.updateRole(editingUser.id, editGlobalRole);
      }

      const projectMembers = Object.entries(editProjectRoles)
        .filter(([_, role]) => role && role !== 'NONE')
        .map(([projectId, projectRole]) => ({ projectId, projectRole }));

      await usersApi.updateProjects(editingUser.id, projectMembers);

      setActionSuccess(`Successfully updated roles & permissions for ${editingUser.name}`);
      setTimeout(() => setActionSuccess(''), 4000);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setEditRolesError(err.message ?? 'Failed to update user roles');
    } finally {
      setSavingRoles(false);
    }
  };

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      const isGlobalAdmin = createForm.assignedRole === 'ADMIN';
      const projectMembers: ProjectAssignment[] = [];

      if (!isGlobalAdmin && createForm.assignedRole !== 'STANDARD') {
        if (createForm.assignToAllProjects) {
          projects.forEach((p) => {
            projectMembers.push({ projectId: p.id, projectRole: createForm.assignedRole });
          });
        } else if (createForm.selectedProjectId) {
          projectMembers.push({ projectId: createForm.selectedProjectId, projectRole: createForm.assignedRole });
        }
      }

      await usersApi.create({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        globalRole: isGlobalAdmin ? 'ADMIN' : 'STANDARD',
        projectMembers: projectMembers.length > 0 ? projectMembers : undefined,
      });

      setActionSuccess('User successfully created with assigned role!');
      setTimeout(() => setActionSuccess(''), 4000);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        assignedRole: 'DEV',
        selectedProjectId: projects[0]?.id ?? '',
        assignToAllProjects: false,
      });
      await fetchUsers();
    } catch (err: any) {
      if (err.status === 401 || err.message?.includes('Unauthorized')) {
        setCreateError('Your session has expired. Please refresh the page or log in again.');
      } else if (err.status === 409 || err.message?.includes('already exists')) {
        setCreateError(`A user with email "${createForm.email}" already exists. Please use a unique email.`);
      } else {
        setCreateError(err.message ?? 'Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleQuickRole(targetUser: any) {
    const newRole = targetUser.globalRole === 'ADMIN' ? 'STANDARD' : 'ADMIN';
    if (targetUser.id === user?.id && newRole === 'STANDARD') {
      if (!confirm('Warning: You are demoting yourself from System Administrator. Continue?')) {
        return;
      }
    }
    try {
      await usersApi.updateRole(targetUser.id, newRole);
      setActionSuccess(`Updated ${targetUser.name}'s global role to ${newRole}`);
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to update role');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  async function handleDeleteUser(targetUser: any) {
    if (targetUser.id === user?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to deactivate user "${targetUser.name}"?`)) {
      return;
    }
    try {
      await usersApi.delete(targetUser.id);
      setActionSuccess(`Deactivated user ${targetUser.name}`);
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to deactivate user');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  const togglePermission = (index: number, role: 'lead' | 'qa' | 'dev' | 'viewer') => {
    if (!isEditingMatrix) return;
    setPermissionMatrix((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [role]: !next[index][role] };
      return next;
    });
  };

  const savePermissionMatrix = () => {
    localStorage.setItem('bugtracker_permission_matrix', JSON.stringify(permissionMatrix));
    setIsEditingMatrix(false);
    setActionSuccess('Custom permission policy matrix saved successfully!');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const resetPermissionMatrix = () => {
    if (!confirm('Reset permission policy matrix to system defaults?')) return;
    localStorage.removeItem('bugtracker_permission_matrix');
    setPermissionMatrix(DEFAULT_PERMISSIONS);
    setIsEditingMatrix(false);
    setActionSuccess('Permission matrix restored to default policies.');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleFilteredUsers = users.filter((u) => {
    if (selectedRoleFilter === 'ALL') return true;
    if (selectedRoleFilter === 'ADMIN') return u.globalRole === 'ADMIN';
    return u.projectMembers?.some((pm: any) => pm.projectRole === selectedRoleFilter);
  });

  if (authLoading || (user && user.globalRole !== 'ADMIN')) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              System Administration & Governance
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
              User provisioning, project access matrices, security policies, and enterprise role permissions.
            </p>
          </div>
          {activeTab === 'users' && (
            <button
              id="admin-add-user-btn"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <PlusCircle size={15} />
              <span>Create User</span>
            </button>
          )}
        </div>

        {/* Notifications / Alerts */}
        {actionSuccess && (
          <div style={{
            background: 'var(--color-success-dim)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div style={{
            background: 'var(--color-danger-dim)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value">{stats.totalUsers}</div>
              <Users size={18} style={{ color: 'var(--color-text-faint)' }} />
            </div>
            <div className="stat-label">Total Users</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.adminCount}</div>
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="stat-label">System Admins</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value">{stats.projectCount}</div>
              <FolderKanban size={18} style={{ color: 'var(--color-text-faint)' }} />
            </div>
            <div className="stat-label">Active Projects</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value">{stats.bugCount}</div>
              <Bug size={18} style={{ color: 'var(--color-text-faint)' }} />
            </div>
            <div className="stat-label">Total Defect Records</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          {[
            { id: 'users', label: 'User Directory & Access', icon: Users },
            { id: 'roles', label: 'Roles & Permission Matrix', icon: Shield },
            { id: 'system', label: 'Security & Integrations', icon: Settings },
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

        {/* Tab 1: User Management */}
        {activeTab === 'users' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
                <input
                  id="search-user-input"
                  className="input"
                  placeholder="Search users by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '30px' }}
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Showing {filteredUsers.length} of {users.length} registered users
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '44px', borderRadius: 'var(--radius-md)' }} />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 0' }}>
                <div className="empty-state-icon">
                  <Users size={24} />
                </div>
                <p className="empty-state-title">No users found</p>
                <p className="empty-state-desc">Try adjusting your search keywords.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email Address</th>
                      <th>System Role</th>
                      <th>Assigned Project Roles</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar">
                              {u.name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{u.name}</strong>
                              {u.id === user?.id && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--color-primary-dim)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-border)', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          {u.email}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: u.globalRole === 'ADMIN' ? 'var(--color-primary-dim)' : 'var(--color-surface-2)',
                              color: u.globalRole === 'ADMIN' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                              border: u.globalRole === 'ADMIN' ? '1px solid var(--color-primary-border)' : '1px solid var(--color-border)',
                              fontWeight: '700',
                            }}
                          >
                            {u.globalRole === 'ADMIN' ? 'ADMIN' : 'STANDARD'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {u.globalRole === 'ADMIN' ? (
                              <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '500' }}>
                                Full Access (All Projects)
                              </span>
                            ) : u.projectMembers && u.projectMembers.length > 0 ? (
                              u.projectMembers.map((pm: any) => (
                                <span
                                  key={pm.id}
                                  className="area-pill"
                                  style={{ fontSize: '10.5px' }}
                                >
                                  {pm.project?.key ?? 'Proj'}: {pm.projectRole}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--color-text-faint)' }}>
                                None assigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-faint)', fontSize: '11.5px' }}>
                          {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => openEditRolesModal(u)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', padding: '3px 8px' }}
                            >
                              <Pencil size={11} />
                              <span>Roles</span>
                            </button>
                            <button
                              onClick={() => toggleQuickRole(u)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11.5px', padding: '3px 8px' }}
                            >
                              {u.globalRole === 'ADMIN' ? 'Demote' : 'Make Admin'}
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '11.5px', color: 'var(--color-danger)', padding: '3px 6px' }}
                                title="Deactivate"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Roles & Permissions Matrix */}
        {activeTab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* System Hierarchy Cards */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                    Enterprise Role Hierarchy & Governance
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Global System Roles govern platform-wide access. Project Roles govern defect transitions, retest approval, and suite authoring.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isEditingMatrix ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsEditingMatrix(true)}
                    >
                      <Pencil size={13} />
                      <span>Customize Policies</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={resetPermissionMatrix}
                      >
                        <RotateCcw size={13} />
                        <span>Reset Defaults</span>
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={savePermissionMatrix}
                      >
                        <Save size={13} />
                        <span>Save Policies</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div className="card-subtle">
                  <div style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>System Admin</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Full platform governance, user provisioning, project setup, and state override.
                  </div>
                </div>
                <div className="card-subtle">
                  <div style={{ color: '#7c3aed', fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>Project Lead</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Manages project team, milestones, components, issue assignment, and closure approval.
                  </div>
                </div>
                <div className="card-subtle">
                  <div style={{ color: 'var(--color-success)', fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>QA Engineer</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Executes test scenarios, logs defects, verifies fixes, approves retest builds.
                  </div>
                </div>
                <div className="card-subtle">
                  <div style={{ color: 'var(--color-info)', fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>Developer</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Triages defects, moves tickets to In Progress, marks bugs as Fixed or Cannot Reproduce.
                  </div>
                </div>
              </div>

              {/* Feature Permission Matrix Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-text)' }}>
                  Policy Permission Matrix
                </h4>
                {isEditingMatrix && (
                  <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '600' }}>
                    Editing: Toggle capability checkboxes and click Save Policies
                  </span>
                )}
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Capability / Permission</th>
                      <th style={{ textAlign: 'center' }}>Admin</th>
                      <th style={{ textAlign: 'center' }}>Project Lead</th>
                      <th style={{ textAlign: 'center' }}>QA / Tester</th>
                      <th style={{ textAlign: 'center' }}>Developer</th>
                      <th style={{ textAlign: 'center' }}>Viewer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionMatrix.map((row, i) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: '500', color: 'var(--color-text)' }}>{row.cap}</td>
                        <td style={{ textAlign: 'center' }}>
                          <CheckCircle2 size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditingMatrix ? (
                            <input
                              type="checkbox"
                              checked={row.lead}
                              onChange={() => togglePermission(i, 'lead')}
                              style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            />
                          ) : (
                            row.lead ? <Check size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} /> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditingMatrix ? (
                            <input
                              type="checkbox"
                              checked={row.qa}
                              onChange={() => togglePermission(i, 'qa')}
                              style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            />
                          ) : (
                            row.qa ? <Check size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} /> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditingMatrix ? (
                            <input
                              type="checkbox"
                              checked={row.dev}
                              onChange={() => togglePermission(i, 'dev')}
                              style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            />
                          ) : (
                            row.dev ? <Check size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} /> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditingMatrix ? (
                            <input
                              type="checkbox"
                              checked={row.viewer}
                              onChange={() => togglePermission(i, 'viewer')}
                              style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            />
                          ) : (
                            row.viewer ? <Check size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} /> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: System Governance */}
        {activeTab === 'system' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <div className="card">
              <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Security & Policy Controls</span>
              </h3>
              <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
                <li>Authentication utilizes secure HTTP-only cookies with auto-refresh to prevent XSS.</li>
                <li>Role guard state machines strictly validate defect transitions at the backend controller.</li>
                <li>Comprehensive audit trail logs every issue modification, status change, and assignment.</li>
                <li>Soft-deletion preserves compliance records and historical test execution results.</li>
              </ul>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Service Health & Gateways</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: '500' }}>Relational Database</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>Connected (Prisma / SQL)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: '500' }}>Real-time Notifications</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>WebSocket Gateway Active</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: '500' }}>API Engine</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>NestJS REST v1</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal with Role Assignment */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="520px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
              Create New User & Assign Role
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Full Name *</label>
              <input
                id="new-user-name"
                className="input"
                placeholder="e.g. David Miller"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Email Address *</label>
              <input
                id="new-user-email"
                type="email"
                className="input"
                placeholder="david@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password *</label>
              <input
                id="new-user-password"
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label">Assigned Role *</label>
              <select
                id="new-user-role-select"
                className="select"
                value={createForm.assignedRole}
                onChange={(e) => setCreateForm((f) => ({ ...f, assignedRole: e.target.value }))}
              >
                <option value="DEV">Developer — Assigned defects, moves to in-progress & fixes</option>
                <option value="QA">QA / Tester — Reports bugs, verifies builds, closes defects</option>
                <option value="LEAD">Project Lead — Manages team, milestones & state triage</option>
                <option value="VIEWER">Viewer — Read-only project & ticket access</option>
                <option value="ADMIN">System Administrator — Global unrestricted governance</option>
              </select>
            </div>

            {createForm.assignedRole !== 'ADMIN' && projects.length > 0 && (
              <div className="card-subtle">
                <label className="label" style={{ marginBottom: '8px' }}>Project Assignment</label>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createForm.assignToAllProjects}
                      onChange={(e) => setCreateForm((f) => ({ ...f, assignToAllProjects: e.target.checked }))}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    Assign this role across all active projects ({projects.length})
                  </label>
                </div>

                {!createForm.assignToAllProjects && (
                  <select
                    className="select"
                    value={createForm.selectedProjectId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, selectedProjectId: e.target.value }))}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {createError && (
              <div style={{
                background: 'var(--color-danger-dim)',
                border: '1px solid var(--color-danger-border)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                fontSize: '12.5px',
              }}>
                {createError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button id="confirm-create-user-btn" type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit User Roles & Permissions Modal */}
        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} maxWidth="560px">
          {editingUser && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Edit Roles & Permissions</h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Access configuration for <strong>{editingUser.name}</strong> ({editingUser.email})
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => setEditingUser(null)}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveRoles} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="label">Global System Role</label>
                  <select
                    className="select"
                    value={editGlobalRole}
                    onChange={(e) => setEditGlobalRole(e.target.value as 'STANDARD' | 'ADMIN')}
                  >
                    <option value="STANDARD">Standard User (Project-governed permissions)</option>
                    <option value="ADMIN">System Administrator (Full global access & state overrides)</option>
                  </select>
                </div>

                {editGlobalRole === 'STANDARD' && (
                  <div>
                    <label className="label">Project Roles & Access</label>
                    {projects.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No projects available.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {projects.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '13px' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>Key: {p.key}</div>
                            </div>
                            <select
                              className="select"
                              style={{ maxWidth: '160px', fontSize: '12px', padding: '4px 24px 4px 8px' }}
                              value={editProjectRoles[p.id] ?? 'NONE'}
                              onChange={(e) =>
                                setEditProjectRoles((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                            >
                              <option value="NONE">No Access</option>
                              <option value="LEAD">Project Lead</option>
                              <option value="QA">QA / Tester</option>
                              <option value="DEV">Developer</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editRolesError && (
                  <div style={{
                    background: 'var(--color-danger-dim)',
                    border: '1px solid var(--color-danger-border)',
                    color: 'var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    fontSize: '12.5px',
                  }}>
                    {editRolesError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingRoles}>
                    {savingRoles ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
