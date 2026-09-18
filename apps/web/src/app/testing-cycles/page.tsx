'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState } from 'react';
import { testingCyclesApi, projectsApi } from '@/lib/api';
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
} from 'lucide-react';

export default function TestingCyclesPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

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
      setProjects(projList);
      if (!selectedProjectId && projList.length > 0 && !form.projectId) {
        setForm((f) => ({ ...f, projectId: projList[0].id }));
      }

      setCycles(Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any).data ?? []);
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
      await loadData();
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create testing cycle');
    } finally {
      setCreating(false);
    }
  };

  const filteredCycles = cycles.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

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

        {/* Filter Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
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
                onClick={() => setStatusFilter(st)}
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

          {/* Project Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Project:</span>
            <select
              className="select"
              style={{ width: '220px', fontSize: '12.5px', padding: '6px 30px 6px 10px' }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cycles Grid */}
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
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
            {filteredCycles.map((c) => {
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '10px' }}>
                          {c.status.replace('_', ' ')}
                        </span>
                        <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                          {c.environment}
                        </span>
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
