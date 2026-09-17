'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import Link from 'next/link';
import {
  FolderKanban,
  PlusCircle,
  Bug,
  Users,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.list()
      .then((res) => setProjects(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await projectsApi.create({ ...form, key: form.key.toUpperCase() });
      setProjects((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '' });
    } catch (err: any) {
      setError(err.message ?? 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  const roleBadgeStyle: Record<string, { bg: string; text: string; border: string }> = {
    LEAD: { bg: 'var(--color-primary-dim)', text: 'var(--color-primary)', border: 'var(--color-primary-border)' },
    QA: { bg: 'var(--color-success-dim)', text: 'var(--color-success)', border: 'var(--color-success-border)' },
    DEV: { bg: 'var(--color-info-dim)', text: 'var(--color-info)', border: 'var(--color-info-border)' },
    VIEWER: { bg: 'var(--color-surface-2)', text: 'var(--color-text-muted)', border: 'var(--color-border)' },
  };

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Projects Directory
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} under active QA management and defect triage
            </p>
          </div>
          <button id="create-project-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusCircle size={15} />
            <span>New Project</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card empty-state" style={{ padding: '80px 24px' }}>
            <div className="empty-state-icon">
              <FolderKanban size={24} />
            </div>
            <p className="empty-state-title">No projects yet</p>
            <p className="empty-state-desc">Create your first software product or repository to start managing testing cycles and logging defects.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setShowCreate(true)}>
              <PlusCircle size={14} />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {projects.map((proj) => {
              const rStyle = roleBadgeStyle[proj.myRole] || roleBadgeStyle.VIEWER;
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="card"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <code>{proj.key}</code>
                        <span
                          className="badge"
                          style={{
                            background: rStyle.bg,
                            color: rStyle.text,
                            borderColor: rStyle.border,
                            fontSize: '10.5px',
                          }}
                        >
                          {proj.myRole}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 6px' }}>
                        {proj.name}
                      </h3>

                      {proj.description && (
                        <p style={{
                          fontSize: '12.5px',
                          color: 'var(--color-text-muted)',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.45,
                        }}>
                          {proj.description}
                        </p>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border-subtle)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Bug size={13} style={{ color: 'var(--color-text-faint)' }} />
                          <strong>{proj._count?.bugs ?? 0}</strong> defects
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={13} style={{ color: 'var(--color-text-faint)' }} />
                          <strong>{proj._count?.members ?? 0}</strong> members
                        </span>
                      </div>

                      <span style={{ color: 'var(--color-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11.5px' }}>
                        Open Hub <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Modal: Create project */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                  Create New Project
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                  <X size={15} />
                </button>
              </div>

              {error && (
                <div style={{
                  background: 'var(--color-danger-dim)',
                  border: '1px solid var(--color-danger-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--color-danger)',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="label">Project Name *</label>
                  <input
                    id="project-name-input"
                    className="input"
                    placeholder="e.g. Mobile E-Commerce App"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="label">Project Key (Prefix) *</label>
                  <input
                    id="project-key-input"
                    className="input"
                    placeholder="e.g. MOB"
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                    required
                    minLength={2}
                    maxLength={10}
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                    Prefix for all issue and test case keys (e.g., MOB-101).
                  </p>
                </div>

                <div>
                  <label className="label">Project Description</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Brief summary of the application, architecture, and team scope..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !form.name.trim() || !form.key.trim()}>
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
