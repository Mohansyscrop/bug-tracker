'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import TablePagination from '@/components/TablePagination';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { projectsApi, bugsApi, usersApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
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
  Pencil,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Server,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const projectId = (routeParams?.id as string) || '';
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [bugs, setBugs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'defects' | 'cycles' | 'requirements'>('overview');
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('DEV');
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<{ originalUserId: string; selectedUserId: string; role: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

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

  // Defects Filtering & Pagination
  const [defectSearch, setDefectSearch] = useState('');
  const [defectStatusFilter, setDefectStatusFilter] = useState('ALL');
  const [defectSeverityFilter, setDefectSeverityFilter] = useState('ALL');
  const [defectPage, setDefectPage] = useState(1);
  const [defectPageSize, setDefectPageSize] = useState(10);

  // Testing Cycles Filtering & Pagination
  const [cycleSearch, setCycleSearch] = useState('');
  const [cycleStatusFilter, setCycleStatusFilter] = useState('ALL');
  const [cycleEnvFilter, setCycleEnvFilter] = useState('ALL');
  const [cyclePage, setCyclePage] = useState(1);
  const [cyclePageSize, setCyclePageSize] = useState(6);

  // Requirements Filtering & Pagination
  const [reqSearch, setReqSearch] = useState('');
  const [reqPriorityFilter, setReqPriorityFilter] = useState('ALL');
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [p, b, s, cRes, rRes, mRes, uRes] = await Promise.all([
        projectsApi.get(projectId),
        bugsApi.list({ projectId, limit: 100 }),
        projectsApi.stats(projectId),
        testingCyclesApi.list(projectId).catch(() => []),
        testingCyclesApi.listRequirements(projectId).catch(() => []),
        projectsApi.members(projectId).catch(() => ({ data: [] })),
        usersApi.list().catch(() => ({ data: [] })),
      ]);
      const userList = Array.isArray(uRes) ? uRes : (uRes as any)?.data ?? [];
      setAllUsers(userList);
      const projectData = p?.data ? { ...p.data } : null;
      if (projectData) {
        const fetchedMembers = Array.isArray(mRes) ? mRes : (mRes as any)?.data;
        if (Array.isArray(fetchedMembers) && fetchedMembers.length > 0) {
          projectData.members = fetchedMembers;
        } else if (!projectData.members) {
          projectData.members = [];
        }
      }
      setProject(projectData);
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
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam && ['overview', 'defects', 'cycles', 'requirements'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [loadData]);

  // Filtered defects
  const filteredBugs = useMemo(() => {
    return bugs.filter((b: any) => {
      if (defectStatusFilter !== 'ALL' && b.status !== defectStatusFilter) return false;
      if (defectSeverityFilter !== 'ALL' && b.severity !== defectSeverityFilter) return false;
      if (defectSearch.trim()) {
        const q = defectSearch.toLowerCase();
        const keyMatch = b.issueKey?.toLowerCase().includes(q);
        const titleMatch = b.title?.toLowerCase().includes(q);
        const descMatch = b.description?.toLowerCase().includes(q);
        const assigneeMatch = b.assignedTo?.name?.toLowerCase().includes(q);
        if (!keyMatch && !titleMatch && !descMatch && !assigneeMatch) return false;
      }
      return true;
    });
  }, [bugs, defectStatusFilter, defectSeverityFilter, defectSearch]);

  const defectTotalPages = Math.max(1, Math.ceil(filteredBugs.length / defectPageSize));
  const paginatedBugs = useMemo(() => {
    const start = (defectPage - 1) * defectPageSize;
    return filteredBugs.slice(start, start + defectPageSize);
  }, [filteredBugs, defectPage, defectPageSize]);

  // Filtered cycles
  const filteredCycles = useMemo(() => {
    return cycles.filter((c: any) => {
      if (cycleStatusFilter !== 'ALL' && c.status !== cycleStatusFilter) return false;
      if (cycleEnvFilter !== 'ALL' && c.environment?.toLowerCase() !== cycleEnvFilter.toLowerCase()) return false;
      if (cycleSearch.trim()) {
        const q = cycleSearch.toLowerCase();
        const nameMatch = c.name?.toLowerCase().includes(q);
        const scopeMatch = c.scope?.toLowerCase().includes(q);
        const envMatch = c.environment?.toLowerCase().includes(q);
        if (!nameMatch && !scopeMatch && !envMatch) return false;
      }
      return true;
    });
  }, [cycles, cycleStatusFilter, cycleEnvFilter, cycleSearch]);

  const cycleTotalPages = Math.max(1, Math.ceil(filteredCycles.length / cyclePageSize));
  const paginatedCycles = useMemo(() => {
    const start = (cyclePage - 1) * cyclePageSize;
    return filteredCycles.slice(start, start + cyclePageSize);
  }, [filteredCycles, cyclePage, cyclePageSize]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r: any) => {
      if (reqPriorityFilter !== 'ALL' && r.priority !== reqPriorityFilter) return false;
      if (reqSearch.trim()) {
        const q = reqSearch.toLowerCase();
        const keyMatch = r.reqCode?.toLowerCase().includes(q) || r.reqKey?.toLowerCase().includes(q);
        const titleMatch = r.title?.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        if (!keyMatch && !titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [requirements, reqPriorityFilter, reqSearch]);

  const reqTotalPages = Math.max(1, Math.ceil(filteredRequirements.length / reqPageSize));
  const paginatedRequirements = useMemo(() => {
    const start = (reqPage - 1) * reqPageSize;
    return filteredRequirements.slice(start, start + reqPageSize);
  }, [filteredRequirements, reqPage, reqPageSize]);

  const getSeverityBadgeStyle = (severity: string) => {
    const s = (severity || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.28)' };
      case 'HIGH':
        return { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', border: 'rgba(249, 115, 22, 0.28)' };
      case 'MEDIUM':
        return { bg: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: 'rgba(2, 132, 199, 0.28)' };
      case 'LOW':
      default:
        return { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: 'rgba(100, 116, 139, 0.28)' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'CLOSED':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.28)' };
      case 'RESOLVED':
      case 'VERIFIED':
        return { bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.28)' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.28)' };
      case 'NEW':
        return { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.28)' };
      case 'REOPENED':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.28)' };
      case 'CONFIRMED':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.28)' };
      default:
        return { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: 'var(--color-border)' };
    }
  };

  const getCycleStatusBadgeStyle = (status: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.28)' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(17, 85, 215, 0.12)', color: '#1155d7', border: 'rgba(17, 85, 215, 0.28)' };
      case 'PLANNED':
        return { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.28)' };
      case 'ABORTED':
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.28)' };
      default:
        return { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: 'var(--color-border)' };
    }
  };

  const getUserDefaultRole = (userId: string): string => {
    // 1. Check if user already has a role in this project
    const projectMem = project?.members?.find((m: any) => m.userId === userId);
    if (projectMem?.projectRole) return projectMem.projectRole;

    // 2. Check user's projectMembers from allUsers
    const u = allUsers.find((user: any) => user.id === userId);
    if (u) {
      if (u.projectMembers && u.projectMembers.length > 0) {
        const pmRole = u.projectMembers.find((pm: any) => pm.projectId === projectId)?.projectRole
          || u.projectMembers[0]?.projectRole;
        if (pmRole) return pmRole;
      }
      // 3. Infer from name, email or globalRole
      const lower = `${u.name} ${u.email}`.toLowerCase();
      if (lower.includes('lead') || lower.includes('pm') || u.globalRole === 'ADMIN') return 'LEAD';
      if (lower.includes('qa') || lower.includes('test')) return 'QA';
      if (lower.includes('dev')) return 'DEV';
    }

    return 'DEV';
  };

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
        const defaultId = available[0].id;
        setAddMemberUserId(defaultId);
        setAddMemberRole(getUserDefaultRole(defaultId));
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
      const msg = 'Project member successfully added!';
      setFeedback({ type: 'success', message: msg });
      toast.success(msg);
      setShowAddMember(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to add member';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setAddingMember(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'LEAD':
        return { label: 'LEAD', desc: 'Tech / QA Lead', bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.28)' };
      case 'QA':
        return { label: 'QA', desc: 'Test Engineer', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.28)' };
      case 'DEV':
        return { label: 'DEV', desc: 'Developer', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.28)' };
      case 'VIEWER':
      default:
        return { label: 'VIEWER', desc: 'Read Only', bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: 'var(--color-border)' };
    }
  };

  const handleOpenEditMember = (m: any) => {
    setEditingMember({
      originalUserId: m.userId,
      selectedUserId: m.userId,
      role: m.projectRole,
    });
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setUpdatingRole(true);
    setFeedback(null);
    try {
      if (editingMember.originalUserId === editingMember.selectedUserId) {
        // Just update role
        await projectsApi.updateMemberRole(projectId, editingMember.selectedUserId, editingMember.role);
        const selUser = allUsers.find((u) => u.id === editingMember.selectedUserId);
        const msg = `Updated ${selUser?.name || 'member'}'s role to ${editingMember.role}`;
        setFeedback({ type: 'success', message: msg });
        toast.success(msg);
      } else {
        // Member changed: check if selected user is already in project
        const alreadyMember = project?.members?.some((m: any) => m.userId === editingMember.selectedUserId);
        if (alreadyMember) {
          await projectsApi.updateMemberRole(projectId, editingMember.selectedUserId, editingMember.role);
        } else {
          await projectsApi.addMember(projectId, {
            userId: editingMember.selectedUserId,
            projectRole: editingMember.role,
          });
        }
        await projectsApi.removeMember(projectId, editingMember.originalUserId);
        const selUser = allUsers.find((u) => u.id === editingMember.selectedUserId);
        const msg = `Updated team member to ${selUser?.name || 'user'} (${editingMember.role})`;
        setFeedback({ type: 'success', message: msg });
        toast.success(msg);
      }
      setEditingMember(null);
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to update member';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this project?`)) return;
    setFeedback(null);
    try {
      await projectsApi.removeMember(projectId, userId);
      const msg = `Removed ${name} from project`;
      setFeedback({ type: 'success', message: msg });
      toast.success(msg);
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to remove member';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMilestone(true);
    setFeedback(null);
    try {
      await projectsApi.createMilestone(projectId, milestoneForm);
      const msg = `Milestone "${milestoneForm.name}" created successfully!`;
      setFeedback({ type: 'success', message: msg });
      toast.success(msg);
      setShowAddMilestone(false);
      setMilestoneForm({ name: '', versionCode: '', releaseDate: '' });
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to create milestone';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
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
      const msg = `Testing cycle "${cycleForm.name}" created successfully!`;
      setFeedback({ type: 'success', message: msg });
      toast.success(msg);
      setShowAddCycle(false);
      setCycleForm({ name: '', cycleCode: '', environment: 'Staging', targetBuild: '', requirementId: '' });
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to create testing cycle';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
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
      const msg = `Requirement "${reqForm.title}" created successfully!`;
      setFeedback({ type: 'success', message: msg });
      toast.success(msg);
      setShowAddReq(false);
      setReqForm({ reqCode: '', title: '', description: '', priority: 'HIGH' });
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to create requirement';
      setFeedback({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setAddingReq(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to permanently delete project "${project?.name}" (${project?.key})? This action cannot be undone.`)) {
      return;
    }
    try {
      await projectsApi.delete(projectId);
      toast.success(`Project "${project?.name}" deleted successfully`);
      router.push('/projects');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete project');
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
              {canManage && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDeleteProject}
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  title="Delete this project"
                >
                  <Trash2 size={13} />
                  <span>Delete Project</span>
                </button>
              )}
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
            { id: 'defects', label: `Defects (${bugs.length})`, icon: Bug },
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
                      <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                      <th>Team Member</th>
                      <th>Email Address</th>
                      <th>Project Role</th>
                      {canManage && <th style={{ textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(!project?.members || project.members.length === 0) ? (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          No team members assigned to this project yet.{' '}
                          {canManage && 'Click "+ Add Team Member" to assign people.'}
                        </td>
                      </tr>
                    ) : (
                      project.members.map((m: any, index: number) => {
                        const badge = getRoleBadge(m.projectRole);
                        return (
                          <tr key={m.userId || m.id}>
                            <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                              {index + 1}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                                  {m.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '13px' }}>
                                  {m.user?.name || 'Unnamed User'}
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                              {m.user?.email || '—'}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  fontWeight: '600',
                                  fontSize: '11.5px',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {badge.label}
                                <span style={{ fontSize: '10px', opacity: 0.75, fontWeight: '400' }}>
                                  ({badge.desc})
                                </span>
                              </span>
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'right' }}>
                                {m.userId !== user?.id && (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() => handleOpenEditMember(m)}
                                      style={{ color: 'var(--color-text-muted)', padding: '4px 8px' }}
                                      title="Edit member & role"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() => handleRemoveMember(m.userId, m.user?.name)}
                                      style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                                      title="Remove from project"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
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

        {/* TAB 2: DEFECTS */}
        {activeTab === 'defects' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Project Defects</span>
                  <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontWeight: '700', fontSize: '11.5px' }}>
                    {bugs.length}
                  </span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  All reported defects for {project?.name} with assignee, severity, and status visibility.
                </p>
              </div>

              <Link href={`/bugs/new?projectId=${projectId}`} className="btn btn-primary btn-sm">
                <PlusCircle size={14} />
                <span>Report Defect</span>
              </Link>
            </div>

            {bugs.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                <Bug size={32} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px auto', display: 'block' }} />
                <p style={{ fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>No defects logged yet</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto 14px auto' }}>
                  Keep track of bugs, regressions, and tasks by reporting defects for this project.
                </p>
                <Link href={`/bugs/new?projectId=${projectId}`} className="btn btn-primary btn-sm">
                  <PlusCircle size={14} />
                  <span>Report Defect</span>
                </Link>
              </div>
            ) : (
              <>
                {filteredBugs.length === 0 ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <p style={{ fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>No defects matched your filter</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                      Try adjusting your keyword or filters to find what you&apos;re looking for.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setDefectSearch('');
                        setDefectStatusFilter('ALL');
                        setDefectSeverityFilter('ALL');
                        setDefectPage(1);
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '55px', textAlign: 'center' }}>S.NO</th>
                          <th style={{ width: '95px' }}>KEY</th>
                          <th>DEFECT TITLE</th>
                          <th style={{ width: '110px' }}>SEVERITY</th>
                          <th style={{ width: '130px' }}>STATUS</th>
                          <th>ASSIGNEE & PROJECT ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBugs.map((b: any, index: number) => {
                          const assigneeMember = project?.members?.find((m: any) => m.userId === b.assignedToId);
                          const assigneeRole = assigneeMember ? getRoleBadge(assigneeMember.projectRole) : null;
                          const sevStyle = getSeverityBadgeStyle(b.severity);
                          const stStyle = getStatusBadgeStyle(b.status);
                          const sNo = (defectPage - 1) * defectPageSize + index + 1;
                          return (
                            <tr key={b.id} style={{ transition: 'background-color 0.15s ease' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                {sNo}
                              </td>
                              <td>
                                <Link href={`/bugs/${b.id}`} style={{ fontWeight: '700', textDecoration: 'none' }}>
                                  <code style={{ fontSize: '12px', padding: '2px 7px', background: 'var(--color-primary-dim)', borderRadius: '4px', border: '1px solid var(--color-primary-border)', color: 'var(--color-primary)', fontWeight: '700' }}>
                                    {b.issueKey}
                                  </code>
                                </Link>
                              </td>
                              <td>
                                <Link
                                  href={`/bugs/${b.id}`}
                                  style={{ color: 'var(--color-text)', fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}
                                  className="hover:underline"
                                >
                                  {b.title}
                                </Link>
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: sevStyle.bg,
                                    color: sevStyle.color,
                                    border: `1px solid ${sevStyle.border}`,
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {b.severity}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: stStyle.bg,
                                    color: stStyle.color,
                                    border: `1px solid ${stStyle.border}`,
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td>
                                {b.assignedTo ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="avatar" style={{ width: '22px', height: '22px', fontSize: '10px' }}>
                                      {b.assignedTo.name?.slice(0, 2).toUpperCase() || 'U'}
                                    </div>
                                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text)' }}>{b.assignedTo.name}</span>
                                    {assigneeRole && (
                                      <span
                                        className="badge"
                                        style={{
                                          background: assigneeRole.bg,
                                          color: assigneeRole.color,
                                          border: `1px solid ${assigneeRole.border}`,
                                          fontSize: '10.5px',
                                          padding: '1px 6px',
                                          fontWeight: '600',
                                        }}
                                      >
                                        {assigneeRole.label}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>Unassigned</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <TablePagination
                      currentPage={defectPage}
                      totalPages={defectTotalPages}
                      pageSize={defectPageSize}
                      totalItems={filteredBugs.length}
                      onPageChange={setDefectPage}
                      onPageSizeChange={setDefectPageSize}
                      pageSizeOptions={[10, 20, 50, 100]}
                      itemLabel="defects"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: TESTING CYCLES */}
        {activeTab === 'cycles' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Active & Planned Testing Cycles</span>
                  <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontWeight: '700', fontSize: '11.5px' }}>
                    {cycles.length}
                  </span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Cycles scoped to {project?.name} for test execution, regression runs, and QA validation.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCycle(true)}>
                <PlusCircle size={14} />
                <span>+ Plan Cycle</span>
              </button>
            </div>

            {cycles.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                <RotateCcw size={32} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px auto', display: 'block' }} />
                <p style={{ fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>No testing cycles created yet</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto 14px auto' }}>
                  Create test cycles to scope executions, link test cases, and verify requirements.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddCycle(true)}>
                  <PlusCircle size={14} />
                  <span>+ Plan Cycle</span>
                </button>
              </div>
            ) : (
              <>
                {/* Search & Filter Toolbar */}


                {filteredCycles.length === 0 ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    <p style={{ fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>No testing cycles matched your filter</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                      Try adjusting your keyword or environment filter to find testing cycles.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setCycleSearch('');
                        setCycleStatusFilter('ALL');
                        setCycleEnvFilter('ALL');
                        setCyclePage(1);
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                      {paginatedCycles.map((c) => {
                        const statusBadge = getCycleStatusBadgeStyle(c.status);
                        return (
                          <div
                            key={c.id}
                            className="card-subtle"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '16px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: statusBadge.bg,
                                    color: statusBadge.color,
                                    border: `1px solid ${statusBadge.border}`,
                                    fontWeight: '700',
                                    fontSize: '10.5px',
                                    padding: '2px 7px',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {c.status}
                                </span>
                                <span
                                  className="badge"
                                  style={{
                                    background: 'var(--color-surface-2)',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '10.5px',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Server size={10} style={{ color: 'var(--color-primary)' }} />
                                  {c.environment || 'Staging'}
                                </span>
                              </div>
                              <Link
                                href={`/testing-cycles/${c.id}`}
                                style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', textDecoration: 'none', display: 'block', lineHeight: 1.35 }}
                                className="hover:underline"
                              >
                                {c.name}
                              </Link>
                              {c.scope && (
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '5px', lineHeight: 1.4 }}>
                                  {c.scope}
                                </p>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Active Cycle'}
                              </span>
                              <Link
                                href={`/testing-cycles/${c.id}`}
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', gap: '4px', padding: '3px 8px' }}
                              >
                                <span>Open Console</span>
                                <ArrowRight size={12} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <TablePagination
                        currentPage={cyclePage}
                        totalPages={cycleTotalPages}
                        pageSize={cyclePageSize}
                        totalItems={filteredCycles.length}
                        onPageChange={setCyclePage}
                        onPageSizeChange={setCyclePageSize}
                        pageSizeOptions={[6, 12, 24]}
                        itemLabel="cycles"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 4: REQUIREMENTS */}
        {activeTab === 'requirements' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Project Requirements & User Stories</span>
                  <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontWeight: '700', fontSize: '11.5px' }}>
                    {requirements.length}
                  </span>
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

            {requirements.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                <FileText size={32} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px auto', display: 'block' }} />
                <p style={{ fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>No requirements defined yet</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto 14px auto' }}>
                  Define user stories and specs to link test cases and track requirements coverage.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddReq(true)}>
                  <PlusCircle size={14} />
                  <span>+ Add Requirement</span>
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  background: 'var(--color-surface-2)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Search requirements by key, title, desc..."
                        value={reqSearch}
                        onChange={(e) => { setReqSearch(e.target.value); setReqPage(1); }}
                        className="input input-sm"
                        style={{ paddingLeft: '32px', paddingRight: reqSearch ? '28px' : '10px', width: '100%', height: '34px', fontSize: '12.5px', background: 'var(--color-surface)' }}
                      />
                      {reqSearch && (
                        <button
                          onClick={() => { setReqSearch(''); setReqPage(1); }}
                          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
                          title="Clear search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <select
                      className="select select-sm"
                      value={reqPriorityFilter}
                      onChange={(e) => { setReqPriorityFilter(e.target.value); setReqPage(1); }}
                      style={{ height: '34px', fontSize: '12.5px', minWidth: '130px', background: 'var(--color-surface)' }}
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>

                    {(reqSearch || reqPriorityFilter !== 'ALL') && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setReqSearch('');
                          setReqPriorityFilter('ALL');
                          setReqPage(1);
                        }}
                        style={{ fontSize: '12px', height: '34px', color: 'var(--color-primary)', fontWeight: '600' }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-wrapper" style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '55px', textAlign: 'center' }}>S.NO</th>
                        <th style={{ width: '100px' }}>REQ KEY</th>
                        <th>TITLE & DESCRIPTION</th>
                        <th style={{ width: '110px' }}>PRIORITY</th>
                        <th style={{ width: '120px' }}>STATUS</th>
                        <th style={{ width: '130px' }}>LINKED DEFECTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequirements.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                            No requirements match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedRequirements.map((r, index) => {
                          const sNo = (reqPage - 1) * reqPageSize + index + 1;
                          return (
                            <tr key={r.id}>
                              <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                {sNo}
                              </td>
                              <td>
                                <span style={{ fontWeight: '700', color: 'var(--color-accent)', fontFamily: 'monospace', fontSize: '12px' }}>
                                  {r.reqCode || r.reqKey || '—'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--color-text)', fontSize: '13px' }}>{r.title}</strong>
                                {r.description && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{r.description}</div>
                                )}
                              </td>
                              <td>
                                <span className="badge badge-low" style={{ fontSize: '10.5px' }}>
                                  {r.priority}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-status-fixed" style={{ fontSize: '10.5px' }}>
                                  {r.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '12px' }}>
                                <strong>{r.bugs?.length || 0}</strong> defects
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <TablePagination
                    currentPage={reqPage}
                    totalPages={reqTotalPages}
                    pageSize={reqPageSize}
                    totalItems={filteredRequirements.length}
                    onPageChange={setReqPage}
                    onPageSizeChange={setReqPageSize}
                    pageSizeOptions={[10, 20, 50, 100]}
                    itemLabel="requirements"
                  />
                </div>
              </>
            )}
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
              <label className="label">Select Team Member *</label>
              {availableUsers.length === 0 ? (
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>All available registered users are already in this project.</p>
              ) : (
                <select
                  className="select"
                  value={addMemberUserId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setAddMemberUserId(newId);
                    setAddMemberRole(getUserDefaultRole(newId));
                  }}
                  required
                >
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                value={allUsers.find((u) => u.id === addMemberUserId)?.email || ''}
                readOnly
                disabled
                style={{ background: 'var(--color-surface-2)', cursor: 'not-allowed', color: 'var(--color-text)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '3px', display: 'block' }}>
                Email address automatically updates when the team member is selected.
              </span>
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
              <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '3px', display: 'block' }}>
                Role is automatically fetched from the member profile.
              </span>
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

        {/* Modal: Edit Member & Role */}
        <Modal isOpen={!!editingMember} onClose={() => setEditingMember(null)} maxWidth="460px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
              Edit Project Member & Role
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setEditingMember(null)}>
              <X size={15} />
            </button>
          </div>
          {editingMember && (
            <form onSubmit={handleSaveMemberEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Team Member *</label>
                <select
                  className="select"
                  value={editingMember.selectedUserId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const autoRole = getUserDefaultRole(newId);
                    setEditingMember({
                      ...editingMember,
                      selectedUserId: newId,
                      role: autoRole,
                    });
                  }}
                  required
                >
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === editingMember.originalUserId ? '(Current Member)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  value={allUsers.find((u) => u.id === editingMember.selectedUserId)?.email || ''}
                  readOnly
                  disabled
                  style={{ background: 'var(--color-surface-2)', cursor: 'not-allowed', color: 'var(--color-text)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '3px', display: 'block' }}>
                  Email address automatically updates when the team member is selected.
                </span>
              </div>

              <div>
                <label className="label">Project Role *</label>
                <select
                  className="select"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  required
                >
                  <option value="DEV">DEV — Developer</option>
                  <option value="QA">QA — Test Engineer</option>
                  <option value="LEAD">LEAD — QA / Tech Lead</option>
                  <option value="VIEWER">VIEWER — Read Only</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '3px', display: 'block' }}>
                  Role is automatically fetched from the member profile.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingMember(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={updatingRole}>
                  {updatingRole ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
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
