'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { bugsApi, projectsApi, testingCyclesApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bug,
  PlusCircle,
  Search,
  RotateCcw,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Trash2,
} from 'lucide-react';

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'CANNOT_REPRODUCE', 'REJECTED', 'DEFERRED', 'FIXED', 'RETEST', 'REOPENED', 'CLOSED'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

const BUG_AREAS = [
  'FRONTEND', 'BACKEND'
];

export default function BugsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bugs, setBugs] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    projectId: '', status: '', severity: '', priority: '', bugArea: '', testingCycleId: '',
    search: '', page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' as 'asc' | 'desc',
  });

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
      );
      const res = await bugsApi.list(params);
      setBugs(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchBugs(); }, [fetchBugs]);
  useEffect(() => {
    projectsApi.list().then((r) => setProjects(r.data ?? []));
    testingCyclesApi.list().then((c: any) => setCycles(Array.isArray(c) ? c : (c as any).data ?? []));
  }, []);

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function setPresetView(view: string) {
    if (view === 'FRONTEND') {
      setFilters((f) => ({ ...f, bugArea: 'FRONTEND', status: '', page: 1 }));
    } else if (view === 'BACKEND') {
      setFilters((f) => ({ ...f, bugArea: 'BACKEND', status: '', page: 1 }));
    } else if (view === 'RETEST') {
      setFilters((f) => ({ ...f, status: 'RETEST', bugArea: '', page: 1 }));
    } else {
      setFilters((f) => ({ ...f, bugArea: '', status: '', testingCycleId: '', page: 1 }));
    }
  }

  async function handleDeleteBug(e: React.MouseEvent, bugItem: any) {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete defect #${bugItem.issueKey}: "${bugItem.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(bugItem.id);
    try {
      await bugsApi.delete(bugItem.id);
      toast.success(`Defect #${bugItem.issueKey} deleted successfully`);
      fetchBugs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete defect');
    } finally {
      setDeletingId(null);
    }
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.severity || filters.priority || filters.projectId || filters.bugArea || filters.testingCycleId
  );

  const totalPages = Math.max(1, meta?.totalPages || 1);
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= (filters.page || 1) - delta && i <= (filters.page || 1) + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [filters.page, totalPages]);

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '18px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Defect Repository
            </h1>
            {meta && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
                {meta.total} defect{meta.total !== 1 ? 's' : ''} tracked across active cycles, test runs, and technical domains
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/bugs/new" className="btn btn-primary" id="report-bug-btn">
              <PlusCircle size={15} />
              <span>Report Defect</span>
            </Link>
          </div>
        </div>

        {/* Saved Views / Fast Filter Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { id: 'ALL', label: 'All Defects' },
            { id: 'FRONTEND', label: 'Frontend' },
            { id: 'BACKEND', label: 'Backend' },
            { id: 'RETEST', label: 'Pending Retest' },
          ].map((preset) => {
            const isActive =
              (preset.id === 'ALL' && !filters.bugArea && !filters.status) ||
              (preset.id === filters.bugArea) ||
              (preset.id === 'RETEST' && filters.status === 'RETEST');
            return (
              <button
                key={preset.id}
                onClick={() => setPresetView(preset.id)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '500',
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 14px',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Multi-parameter Filter Toolbar */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
            <input
              id="bug-search"
              className="input"
              placeholder="Search defects by title..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '13px' }}
            />
          </div>

          <select
            id="filter-project"
            className="select"
            style={{ maxWidth: '160px', fontSize: '12.5px' }}
            value={filters.projectId}
            onChange={(e) => updateFilter('projectId', e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            id="filter-cycle"
            className="select"
            style={{ maxWidth: '170px', fontSize: '12.5px' }}
            value={filters.testingCycleId}
            onChange={(e) => updateFilter('testingCycleId', e.target.value)}
          >
            <option value="">All Testing Cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            id="filter-area"
            className="select"
            style={{ maxWidth: '150px', fontSize: '12.5px' }}
            value={filters.bugArea}
            onChange={(e) => updateFilter('bugArea', e.target.value)}
          >
            <option value="">All Bug Areas</option>
            {BUG_AREAS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>

          <select
            id="filter-status"
            className="select"
            style={{ maxWidth: '140px', fontSize: '12.5px' }}
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>

          <select
            id="filter-severity"
            className="select"
            style={{ maxWidth: '130px', fontSize: '12.5px' }}
            value={filters.severity}
            onChange={(e) => updateFilter('severity', e.target.value)}
          >
            <option value="">All Severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            id="filter-priority"
            className="select"
            style={{ maxWidth: '120px', fontSize: '12.5px' }}
            value={filters.priority}
            onChange={(e) => updateFilter('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters((f) => ({ ...f, search: '', status: '', severity: '', priority: '', projectId: '', bugArea: '', testingCycleId: '', page: 1 }))}
              style={{ color: 'var(--color-danger)', gap: '4px' }}
            >
              <X size={13} />
              <span>Clear</span>
            </button>
          )}
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
            Showing {meta?.total === 0 ? 0 : ((filters.page || 1) - 1) * (filters.limit || 20) + 1}–
            {Math.min((filters.page || 1) * (filters.limit || 20), meta?.total ?? bugs.length)} of {meta?.total ?? bugs.length} {meta?.total === 1 ? 'defect' : 'defects'}
            {hasActiveFilters && ` (filtered)`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>Per page:</span>
            {[10, 20, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, limit: size, page: 1 }))}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: (filters.limit || 20) === size ? '#4f46e5' : '#ffffff',
                  color: (filters.limit || 20) === size ? '#ffffff' : 'var(--color-text)',
                  border: (filters.limit || 20) === size ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                  boxShadow: (filters.limit || 20) === size ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
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

        {/* Data Table */}
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '24px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '40px', marginBottom: '8px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : bugs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Bug size={24} />
              </div>
              <p className="empty-state-title">No defects found</p>
              <p className="empty-state-desc">
                {hasActiveFilters
                  ? 'No issues match the active filter criteria. Try resetting your search filters.'
                  : 'Great news! No defects logged in this repository yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => setFilters((f) => ({ ...f, search: '', status: '', severity: '', priority: '', projectId: '', bugArea: '', testingCycleId: '', page: 1 }))}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                  <th style={{ width: '100px' }}>Key</th>
                  <th>Defect Title</th>
                  <th style={{ width: '110px' }}>Severity</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '150px' }}>Assignee</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug, index) => (
                  <tr
                    key={bug.id}
                    onClick={() => router.push(`/bugs/${bug.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {((filters.page || 1) - 1) * (filters.limit || 20) + index + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="ticket-badge" style={{ whiteSpace: 'nowrap' }}>#{bug.issueKey}</span>
                        {bug.isRegression && (
                          <span title="Regression Defect" style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: '800' }}>
                            ↩
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          fontSize: '13.5px',
                          fontWeight: '600',
                          color: 'var(--color-text)',
                          lineHeight: '1.3',
                        }}>
                          {bug.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                          <span className={bug.bugArea === 'REGRESSION' ? 'area-pill area-pill-regression' : 'area-pill'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {bug.bugArea || 'FRONTEND'}
                          </span>
                          {bug.testingCycle && (
                            <span style={{ color: 'var(--color-text-faint)' }}>
                              • Cycle: {bug.testingCycle.name.split('—')[0] || bug.testingCycle.name}
                            </span>
                          )}
                          <span style={{ color: 'var(--color-text-faint)' }}>
                            • {new Date(bug.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${bug.severity.toLowerCase()}`}>
                        {bug.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status-${bug.status.toLowerCase().replace(/_/g, '-')}`}>
                        {bug.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {bug.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px', fontWeight: '700' }}>
                            {bug.assignedTo.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>
                            {bug.assignedTo.name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {(user?.globalRole === 'ADMIN' || bug.reportedById === user?.id || user?.projectMembers?.some((m: any) => m.projectId === bug.projectId && m.projectRole === 'LEAD')) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBug(e, bug)}
                            disabled={deletingId === bug.id}
                            title="Delete defect"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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
                          href={`/bugs/${bug.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11.5px', padding: '4px 10px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Scalable Full Pagination Footer */}
        {bugs.length > 0 && (
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
              Page {filters.page || 1} of {totalPages} ({meta?.total ?? bugs.length} total defects)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
                disabled={(filters.page || 1) <= 1}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: (filters.page || 1) <= 1 ? 0.4 : 1,
                  cursor: (filters.page || 1) <= 1 ? 'not-allowed' : 'pointer',
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
                  const isCurrent = pageNum === (filters.page || 1);
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, page: pageNum }))}
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
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))}
                disabled={(filters.page || 1) >= totalPages}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: (filters.page || 1) >= totalPages ? 0.4 : 1,
                  cursor: (filters.page || 1) >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
