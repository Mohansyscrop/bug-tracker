'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useCallback } from 'react';
import { bugsApi, projectsApi, testingCyclesApi } from '@/lib/api';
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
} from 'lucide-react';

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'CANNOT_REPRODUCE', 'REJECTED', 'DEFERRED', 'FIXED', 'RETEST', 'REOPENED', 'CLOSED'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

const BUG_AREAS = [
  'FRONTEND', 'BACKEND', 'DATABASE', 'API', 'INTEGRATION', 'UI_UX', 'PERFORMANCE', 'SECURITY', 'REGRESSION'
];

export default function BugsPage() {
  const router = useRouter();
  const [bugs, setBugs] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (selected.size === bugs.length) setSelected(new Set());
    else setSelected(new Set(bugs.map((b) => b.id)));
  }

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function setPresetView(view: string) {
    if (view === 'FRONTEND') {
      setFilters((f) => ({ ...f, bugArea: 'FRONTEND', status: '', page: 1 }));
    } else if (view === 'BACKEND') {
      setFilters((f) => ({ ...f, bugArea: 'BACKEND', status: '', page: 1 }));
    } else if (view === 'DATABASE') {
      setFilters((f) => ({ ...f, bugArea: 'DATABASE', status: '', page: 1 }));
    } else if (view === 'RETEST') {
      setFilters((f) => ({ ...f, status: 'RETEST', bugArea: '', page: 1 }));
    } else if (view === 'REGRESSION') {
      setFilters((f) => ({ ...f, bugArea: 'REGRESSION', status: '', page: 1 }));
    } else {
      setFilters((f) => ({ ...f, bugArea: '', status: '', testingCycleId: '', page: 1 }));
    }
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.severity || filters.priority || filters.projectId || filters.bugArea || filters.testingCycleId
  );

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
            {selected.size > 0 && (
              <span style={{
                fontSize: '12px',
                color: 'var(--color-primary)',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontWeight: '700',
              }}>
                {selected.size} selected
              </span>
            )}
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
            { id: 'FRONTEND', label: 'Frontend UI' },
            { id: 'BACKEND', label: 'Backend & API' },
            { id: 'DATABASE', label: 'Database' },
            { id: 'RETEST', label: 'Pending Retest' },
            { id: 'REGRESSION', label: 'Regression Bugs' },
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
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.size === bugs.length && bugs.length > 0}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    />
                  </th>
                  <th>Key</th>
                  <th>Title</th>
                  <th>Area</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Testing Cycle</th>
                  <th>Project</th>
                  <th>Reported</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug.id} onClick={() => router.push(`/bugs/${bug.id}`)}>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(bug.id)}
                        onChange={() => toggleSelect(bug.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <code>{bug.issueKey}</code>
                        {bug.isRegression && (
                          <span title="Regression Bug" style={{ color: 'var(--color-danger)', fontSize: '11px' }}>
                            ↩
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <span style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--color-text)',
                      }}>
                        {bug.title}
                      </span>
                    </td>
                    <td>
                      <span className={bug.bugArea === 'REGRESSION' ? 'area-pill area-pill-regression' : 'area-pill'}>
                        {bug.bugArea || 'FRONTEND'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${bug.severity.toLowerCase()}`}>{bug.severity}</span></td>
                    <td><span className={`badge badge-${bug.priority.toLowerCase()}`}>{bug.priority}</span></td>
                    <td><span className={`badge badge-status-${bug.status.toLowerCase().replace(/_/g, '-')}`}>{bug.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {bug.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px' }}>
                            {bug.assignedTo.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{bug.assignedTo.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {bug.testingCycle ? bug.testingCycle.name.split('—')[0] || bug.testingCycle.name : '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {bug.project?.key}
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', padding: '0 8px' }}>
              Page {filters.page} of {meta.totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={filters.page >= meta.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
