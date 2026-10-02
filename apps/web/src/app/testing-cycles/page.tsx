'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState, useMemo } from 'react';
import { testingCyclesApi, projectsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  Bug,
  ArrowRight,
  SlidersHorizontal,
  X,
  Target,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export default function TestingCyclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    projectId: '',
    name: '',
    type: 'FEATURE',
    environment: 'QA',
    scope: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    plannedEndDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, cyclesRes] = await Promise.all([
        projectsApi.list().catch(() => ({ data: [] })),
        testingCyclesApi.list(selectedProjectId || undefined).catch(() => []),
      ]);

      const projList = (projRes as any).data ?? [];
      const cyclesList = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any).data ?? [];

      // Combine projects from projectsApi and existing cycles to ensure all active projects appear in the dropdown
      const projMap = new Map<string, any>();
      projList.forEach((p: any) => projMap.set(p.id, p));
      cyclesList.forEach((c: any) => {
        if (c.project && !projMap.has(c.project.id)) {
          projMap.set(c.project.id, { id: c.project.id, name: c.project.name, key: c.project.key });
        }
      });
      const combinedProjects = Array.from(projMap.values());
      setProjects((prev) => {
        const map = new Map<string, any>();
        prev.forEach((p) => map.set(p.id, p));
        combinedProjects.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });

      if (!selectedProjectId && combinedProjects.length > 0 && !form.projectId) {
        setForm((f) => ({ ...f, projectId: combinedProjects[0].id }));
      }

      setCycles(cyclesList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      await testingCyclesApi.create({
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        plannedEndDate: form.plannedEndDate ? new Date(form.plannedEndDate).toISOString() : undefined,
      });

      const cycleName = form.name;
      setShowCreateModal(false);
      setForm({
        projectId: projects[0]?.id ?? '',
        name: '',
        type: 'FEATURE',
        environment: 'QA',
        scope: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        plannedEndDate: '',
      });
      toast.success(`Testing cycle "${cycleName}" created successfully!`);
      await loadData();
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to create testing cycle';
      setCreateError(errMsg);
      toast.error(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCycle = async (e: React.MouseEvent, cycle: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete testing cycle "${cycle.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(cycle.id);
    try {
      await testingCyclesApi.delete(cycle.id);
      toast.success(`Testing cycle "${cycle.name}" deleted successfully!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete testing cycle');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCycles = cycles.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (selectedProjectId && c.project?.id !== selectedProjectId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mName = c.name?.toLowerCase().includes(q);
      const mScope = c.scope?.toLowerCase().includes(q);
      const mProj = c.project?.name?.toLowerCase().includes(q) || c.project?.key?.toLowerCase().includes(q);
      if (!mName && !mScope && !mProj) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCycles.length / pageSize));
  const paginatedCycles = filteredCycles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const totalTests = cycles.reduce((acc, c) => acc + (c.metrics?.totalTests || 0), 0);
  const totalPassed = cycles.reduce((acc, c) => acc + (c.metrics?.passed || 0), 0);
  const overallPassRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const inProgressCount = cycles.filter((c) => c.status === 'IN_PROGRESS').length;
  const totalBugsFound = cycles.reduce((acc, c) => acc + (c.metrics?.totalBugs || 0), 0);

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              QA Testing Cycles
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Structure test executions, scenario verification, and defect triage by sprint or release iterations.
            </p>
          </div>
          <button
            id="create-cycle-btn"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusCircle size={15} />
            <span>New Testing Cycle</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value">{cycles.length}</div>
              <RotateCcw size={18} style={{ color: 'var(--color-text-faint)' }} />
            </div>
            <div className="stat-label">Total Test Cycles</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{inProgressCount}</div>
              <Target size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="stat-label">Cycles In Progress</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{overallPassRate}%</div>
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
            </div>
            <div className="stat-label">Overall Test Pass Rate</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{totalBugsFound}</div>
              <Bug size={18} style={{ color: 'var(--color-danger)' }} />
            </div>
            <div className="stat-label">Cycle Defects Logged</div>
          </div>
        </div>

        {/* Filter Toolbar & View Mode Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--color-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {['ALL', 'IN_PROGRESS', 'PLANNED', 'COMPLETED', 'BLOCKED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '12px',
                  fontWeight: statusFilter === st ? '600' : '500',
                  border: statusFilter === st ? 'none' : 'transparent',
                }}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search, Project Filter & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search cycles..."
                className="input"
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px', borderRadius: '8px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="select"
                style={{ width: '190px', fontSize: '12.5px', padding: '5px 28px 5px 10px', height: '34px' }}
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggle: Grid (Default) vs Table */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '7px',
              gap: '2px',
              border: '1px solid var(--color-border)',
            }}>
              <button
                type="button"
                title="Card Grid View"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                title="Compact Table View"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#4f46e5' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary Count & Per Page Size Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {filteredCycles.length === 0 ? '0' : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredCycles.length)} of {filteredCycles.length} {filteredCycles.length === 1 ? 'cycle' : 'cycles'}
            {(statusFilter !== 'ALL' || selectedProjectId || searchQuery.trim()) && ` (filtered from ${cycles.length} total)`}
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
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: pageSize === size ? '#4f46e5' : '#ffffff',
                  color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                  border: pageSize === size ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                  boxShadow: pageSize === size ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  transition: 'all 0.15s ease',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Cycles Presentation (Grid or Table View) */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="card empty-state" style={{ padding: '60px 0' }}>
            <div className="empty-state-icon">
              <RotateCcw size={24} />
            </div>
            <p className="empty-state-title">No testing cycles found</p>
            <p className="empty-state-desc">Create a testing cycle to plan scenarios, execute test runs, and track cycle bugs.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setShowCreateModal(true)}>
              <PlusCircle size={14} />
              <span>Create First Cycle</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID VIEW (FIRST PRIORITY / DEFAULT) ─── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
            {paginatedCycles.map((c) => {
              const m = c.metrics || { totalTests: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, totalBugs: 0, bugsByArea: {} };
              const passPct = m.totalTests > 0 ? Math.round((m.passed / m.totalTests) * 100) : 0;
              const failPct = m.totalTests > 0 ? Math.round((m.failed / m.totalTests) * 100) : 0;
              const blockPct = m.totalTests > 0 ? Math.round((m.blocked / m.totalTests) * 100) : 0;

              const statusBadgeClass =
                c.status === 'IN_PROGRESS' ? 'badge-status-in_progress' :
                  c.status === 'COMPLETED' ? 'badge-status-fixed' :
                    c.status === 'BLOCKED' ? 'badge-critical' : 'badge-status-new';

              return (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    position: 'relative',
                  }}
                >
                  {/* Top Meta */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        {c.project?.name} ({c.project?.key})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '10px' }}>
                          {c.status.replace('_', ' ')}
                        </span>
                        <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                          {c.environment}
                        </span>
                        {(user?.globalRole === 'ADMIN' || user?.projectMembers?.some((m: any) => m.projectId === c.projectId && (m.projectRole === 'LEAD' || m.projectRole === 'QA'))) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCycle(e, c)}
                            disabled={deletingId === c.id}
                            title="Delete testing cycle"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-muted)';
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/testing-cycles/${c.id}`}
                      style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', textDecoration: 'none', lineHeight: '1.35', display: 'block' }}
                    >
                      {c.name}
                    </Link>

                    {c.scope && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        marginTop: '6px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}>
                        {c.scope}
                      </p>
                    )}
                  </div>

                  {/* Progress & Metrics */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                      <span>Progress ({m.passed}/{m.totalTests} tests)</span>
                      <span style={{ fontWeight: '700', color: passPct > 0 ? 'var(--color-success)' : 'var(--color-text)' }}>
                        {passPct}%
                      </span>
                    </div>

                    <div className="progress-bar-container" style={{ height: '7px' }}>
                      <div className="progress-segment-pass" style={{ width: `${passPct}%` }} />
                      <div className="progress-segment-fail" style={{ width: `${failPct}%` }} />
                      <div className="progress-segment-blocked" style={{ width: `${blockPct}%` }} />
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--color-border-subtle)',
                      fontSize: '11.5px',
                    }}>
                      <div style={{ display: 'flex', gap: '10px', color: 'var(--color-text-muted)' }}>
                        <span>🐞 <strong>{m.totalBugs}</strong> defects</span>
                        <span>📋 <strong>{m.totalTests}</strong> cases</span>
                      </div>

                      <Link
                        href={`/testing-cycles/${c.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11.5px', color: 'var(--color-primary)', padding: '2px 6px', fontWeight: '600', gap: '4px' }}
                      >
                        <span>Console</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── TABLE VIEW ─── */
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>S.No</th>
                  <th style={{ width: '85px' }}>Cycle #</th>
                  <th>Cycle Name & Scope</th>
                  <th style={{ width: '160px' }}>Project</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '100px' }}>Environment</th>
                  <th style={{ width: '170px' }}>Test Progress</th>
                  <th style={{ width: '90px' }}>Defects</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCycles.map((c, index) => {
                  const m = c.metrics || { totalTests: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, totalBugs: 0 };
                  const passPct = m.totalTests > 0 ? Math.round((m.passed / m.totalTests) * 100) : 0;
                  const serialNumber = (currentPage - 1) * pageSize + index + 1;

                  const statusBadgeClass =
                    c.status === 'IN_PROGRESS' ? 'badge-status-in_progress' :
                      c.status === 'COMPLETED' ? 'badge-status-fixed' :
                        c.status === 'BLOCKED' ? 'badge-critical' : 'badge-status-new';

                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {serialNumber}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          display: 'inline-block',
                          fontFamily: 'monospace',
                        }}>
                          #{c.cycleNumber || '01'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <Link
                            href={`/testing-cycles/${c.id}`}
                            style={{ fontWeight: '650', color: 'var(--color-text)', textDecoration: 'none', fontSize: '13.5px' }}
                          >
                            {c.name}
                          </Link>
                          {c.scope && (
                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                              {c.scope}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text)' }}>
                          {c.project?.name}
                        </span>
                        {c.project?.key && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                            ({c.project.key})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                          {c.environment}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            <span>{m.passed}/{m.totalTests} Passed</span>
                            <span style={{ fontWeight: '700', color: passPct > 0 ? 'var(--color-success)' : 'inherit' }}>{passPct}%</span>
                          </div>
                          <div className="progress-bar-container" style={{ height: '5px' }}>
                            <div className="progress-segment-pass" style={{ width: `${passPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: m.totalBugs > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          🐞 {m.totalBugs}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {(user?.globalRole === 'ADMIN' || user?.projectMembers?.some((m: any) => m.projectId === c.projectId && (m.projectRole === 'LEAD' || m.projectRole === 'QA'))) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCycle(e, c)}
                              disabled={deletingId === c.id}
                              title="Delete testing cycle"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text-muted)';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <Link
                            href={`/testing-cycles/${c.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', padding: '4px 10px' }}
                          >
                            Console →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Scalable Full Pagination Footer */}
        {filteredCycles.length > 0 && (
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
              Page {currentPage} of {totalPages} ({filteredCycles.length} total {filteredCycles.length === 1 ? 'cycle' : 'cycles'})
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

        {/* Modal: Create Testing Cycle */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="540px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              Plan New Testing Cycle
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
              <X size={16} />
            </button>
          </div>

          {createError && (
            <div style={{
              background: 'var(--color-danger-dim)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--color-danger)',
              fontSize: '12.5px',
              marginBottom: '16px',
            }}>
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateCycle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label">Project *</label>
              <select
                className="select"
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Cycle Name *</label>
              <input
                className="input"
                placeholder="e.g., Sprint 24 — WhatsApp Integration & Smoke"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Cycle Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="FEATURE">Feature Testing</option>
                  <option value="REGRESSION">Regression Run</option>
                  <option value="SMOKE">Smoke Verification</option>
                  <option value="RELEASE">Release Candidate</option>
                </select>
              </div>
              <div>
                <label className="label">Target Environment</label>
                <select
                  className="select"
                  value={form.environment}
                  onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
                >
                  <option value="QA">QA Build</option>
                  <option value="STAGING">Staging</option>
                  <option value="UAT">UAT</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Scope Summary</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Brief description of requirements, components, and regressions in scope..."
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Planned End Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.plannedEndDate}
                  onChange={(e) => setForm((f) => ({ ...f, plannedEndDate: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !form.name.trim()}>
                {creating ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
