'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi } from '@/lib/api';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  FolderKanban,
  PlusCircle,
  Bug,
  Users,
  ArrowRight,
  X,
  Layers,
  Trash2,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

// Generative luxury gradient palettes for project avatars
const AVATAR_PALETTES = [
  { bg: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)', text: '#ffffff', border: 'rgba(29, 78, 216, 0.4)' },
  { bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', text: '#ffffff', border: 'rgba(5, 150, 105, 0.4)' },
  { bg: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', text: '#ffffff', border: 'rgba(124, 58, 237, 0.4)' },
  { bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', text: '#ffffff', border: 'rgba(217, 119, 6, 0.4)' },
  { bg: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', text: '#ffffff', border: 'rgba(2, 132, 199, 0.4)' },
  { bg: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', text: '#ffffff', border: 'rgba(225, 29, 72, 0.4)' },
  { bg: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', text: '#ffffff', border: 'rgba(67, 56, 202, 0.4)' },
];

function getProjectPalette(key: string, name: string) {
  const seed = (key + name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_PALETTES[seed % AVATAR_PALETTES.length];
}

const PROJECT_TEMPLATES = [
  { label: 'Web Application', prefix: 'WEB', desc: 'Modern full-stack web application with responsive UI and API integrations.' },
  { label: 'Mobile App', prefix: 'MOB', desc: 'Cross-platform mobile client for iOS and Android devices.' },
  { label: 'Backend API', prefix: 'API', desc: 'High-throughput microservices architecture and database persistence layer.' },
  { label: 'E-Commerce', prefix: 'ECOMM', desc: 'Digital storefront, checkout funnel, payment processing, and inventory hub.' },
  { label: 'Gaming Portal', prefix: 'GAME', desc: 'Interactive gaming hub with real-time multiplayer lobbies and physics engine.' },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', template: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Toolbar State: Search & View Mode (Cards / Table)
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.data ?? []);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  // Auto-generate key suggestion from project name
  const handleNameChange = (name: string) => {
    setForm((prev) => {
      let suggestedKey = prev.key;
      // Auto-suggest key only if key is empty or matches previous auto-generation
      if (!prev.key || prev.key === prev.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')) {
        const words = name.trim().split(/\s+/);
        if (words.length > 1) {
          suggestedKey = words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
        } else {
          suggestedKey = name.slice(0, 4).toUpperCase();
        }
        suggestedKey = suggestedKey.replace(/[^A-Z0-9]/g, '');
      }
      return { ...prev, name, key: suggestedKey };
    });
  };

  const handleApplyTemplate = (tmpl: typeof PROJECT_TEMPLATES[0]) => {
    setForm((prev) => ({
      ...prev,
      template: tmpl.label,
      key: prev.key || tmpl.prefix,
      description: prev.description ? prev.description : tmpl.desc,
    }));
  };

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        key: form.key.trim().toUpperCase(),
        description: form.description.trim(),
      };
      const res = await projectsApi.create(payload);
      setProjects((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '', template: '' });
      toast.success(`Project "${res.data.name}" created successfully!`);
    } catch (err: any) {
      const errorMsg = err.message ?? 'Failed to create project';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(e: React.MouseEvent, proj: any) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete project "${proj.name}" (${proj.key})? This will archive all associated defects and testing cycles.`)) {
      return;
    }

    setDeletingId(proj.id);
    try {
      await projectsApi.delete(proj.id);
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
      toast.success(`Project "${proj.name}" deleted successfully!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  }

  // Project Health helper
  const getProjectHealth = (defectCount: number) => {
    if (defectCount <= 1) {
      return {
        label: 'Stable',
        type: 'HEALTHY',
        color: 'var(--color-success)',
        bg: 'var(--color-success-dim)',
        border: 'var(--color-success-border)',
        dot: '#10b981',
      };
    }
    if (defectCount <= 4) {
      return {
        label: 'Active QA',
        type: 'MODERATE',
        color: 'var(--color-info)',
        bg: 'var(--color-info-dim)',
        border: 'var(--color-info-border)',
        dot: '#0284c7',
      };
    }
    return {
      label: 'High Triage',
      type: 'CRITICAL',
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-dim)',
      border: 'var(--color-danger-border)',
      dot: '#ef4444',
    };
  };

  // Filtered Projects (Search by Name, Key, or Description)
  const filteredProjects = useMemo(() => {
    return projects
      .filter((proj) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = proj.name?.toLowerCase().includes(q);
          const matchKey = proj.key?.toLowerCase().includes(q);
          const matchDesc = proj.description?.toLowerCase().includes(q);
          if (!matchName && !matchKey && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [projects, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
  };

  const roleBadgeStyle: Record<string, { bg: string; text: string; border: string }> = {
    LEAD: { bg: 'var(--color-primary-dim)', text: 'var(--color-primary)', border: 'var(--color-primary-border)' },
    QA: { bg: 'var(--color-success-dim)', text: 'var(--color-success)', border: 'var(--color-success-border)' },
    DEV: { bg: 'var(--color-info-dim)', text: 'var(--color-info)', border: 'var(--color-info-border)' },
    VIEWER: { bg: 'var(--color-surface-2)', text: 'var(--color-text-muted)', border: 'var(--color-border)' },
  };

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '48px' }}>

        {/* ==============================================================
            PAGE HEADER & HERO
            ============================================================== */}
        <div className="page-header" style={{ marginBottom: '22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Projects Directory
              </h1>

            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh project list"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              id="create-project-btn"
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
            >
              <PlusCircle size={16} />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* ==============================================================
            TOOLBAR: SEARCH & VIEW TOGGLE (GRID / TABLE)
            ============================================================== */}
        <div
          className="card"
          style={{
            padding: '12px 18px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '540px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-faint)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="search-projects-input"
              type="text"
              className="input"
              placeholder="Search projects by name, key (e.g. BP), or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', paddingRight: searchQuery ? '32px' : '14px', height: '40px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right: Showing count & View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> project{projects.length !== 1 ? 's' : ''}
            </span>

            {/* View Toggle: Grid vs Table */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '2px',
                borderRadius: '7px',
                gap: '2px',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
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
                onClick={() => setViewMode('table')}
                title="Compact Table View"
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

        {/* ==============================================================
            PROJECT LISTINGS: LOADING / EMPTY / GRID / TABLE
            ============================================================== */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: '240px',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Zero Projects in Workspace */
          <div className="card empty-state" style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ margin: '0 auto 16px' }}>
              <FolderKanban size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)', marginBottom: '8px' }}>
              No projects created yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              Create your first enterprise product or software module to begin organizing test cycles, reporting defects, and managing team permissions.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <PlusCircle size={15} />
              <span>Create First Project</span>
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Filtered to 0 results */
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--color-text-muted)',
              }}
            >
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '6px' }}>
              No projects found
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
              No projects matched {searchQuery ? `"${searchQuery}"` : 'your query'}. Try searching with a different project name, key, or description.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
              Clear Search
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ==============================================================
             GRID VIEW — ULTRA-PREMIUM ENTERPRISE CARDS
             ============================================================== */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredProjects.map((proj) => {
              const rStyle = roleBadgeStyle[proj.myRole] || roleBadgeStyle.VIEWER;
              const defectCount = proj._count?.bugs ?? 0;
              const cycleCount = proj._count?.testingCycles ?? 0;
              const memberCount = proj._count?.members ?? 0;
              const health = getProjectHealth(defectCount);
              const palette = getProjectPalette(proj.key, proj.name);

              return (
                <div
                  key={proj.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '22px',
                    position: 'relative',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                        gap: '12px',
                      }}
                    >
                      {/* Avatar monogram & Key */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-md)',
                            background: palette.bg,
                            color: palette.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '14px',
                            letterSpacing: '0.04em',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                            flexShrink: 0,
                          }}
                        >
                          {proj.key.slice(0, 3)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {proj.key}
                            </code>

                            <span
                              className="badge"
                              style={{
                                background: rStyle.bg,
                                color: rStyle.text,
                                borderColor: rStyle.border,
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '2px 8px',
                              }}
                            >
                              {proj.myRole}
                            </span>
                          </div>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: health.color,
                              fontWeight: '600',
                              marginTop: '4px',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: health.dot,
                                display: 'inline-block',
                              }}
                            />
                            {health.label}
                          </span>
                        </div>
                      </div>

                      {/* Top Right: Delete button for Lead/Admin */}
                      {(user?.globalRole === 'ADMIN' || proj.myRole === 'LEAD') && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(e, proj)}
                          disabled={deletingId === proj.id}
                          title="Archive or delete project"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-faint)',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.background = 'var(--color-danger-dim)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-faint)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Project Title */}
                    <Link
                      href={`/projects/${proj.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <h3
                        style={{
                          fontSize: '16.5px',
                          fontWeight: '800',
                          color: 'var(--color-text)',
                          margin: '0 0 8px',
                          lineHeight: 1.35,
                          letterSpacing: '-0.02em',
                          transition: 'color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-text)';
                        }}
                      >
                        {proj.name}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-muted)',
                        margin: '0 0 16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        minHeight: '37px',
                      }}
                    >
                      {proj.description || 'Enterprise project repository and QA test management environment.'}
                    </p>

                    {/* Health Defect Micro-Bar */}
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'var(--color-text-faint)',
                          marginBottom: '4px',
                          fontWeight: '600',
                        }}
                      >
                        <span>Defect Load</span>
                        <span>{defectCount} open issue{defectCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div
                        style={{
                          height: '5px',
                          borderRadius: '3px',
                          background: 'var(--color-surface-3)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(12, defectCount * 18))}%`,
                            background: defectCount > 4 ? 'var(--color-danger)' : defectCount > 1 ? 'var(--color-warning)' : 'var(--color-success)',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Metrics + Direct Action Shortcuts */}
                  <div>
                    {/* Metrics Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--color-border-subtle)',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '14px',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Defects Link */}
                        <Link
                          href={`/projects/${proj.id}?tab=defects`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            color: defectCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                            fontWeight: '600',
                          }}
                          title="View project defects"
                        >
                          <Bug size={13} style={{ color: defectCount > 0 ? 'var(--color-danger)' : 'var(--color-text-faint)' }} />
                          <span><strong>{defectCount}</strong> defect{defectCount !== 1 ? 's' : ''}</span>
                        </Link>

                        {/* Testing Cycles Link */}
                        <Link
                          href={`/projects/${proj.id}?tab=cycles`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            color: 'var(--color-text-secondary)',
                            fontWeight: '600',
                          }}
                          title="View testing cycles"
                        >
                          <Layers size={13} style={{ color: 'var(--color-text-faint)' }} />
                          <span><strong>{cycleCount}</strong> cycle{cycleCount !== 1 ? 's' : ''}</span>
                        </Link>
                      </div>

                      {/* Team Members */}
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--color-text-muted)',
                          fontSize: '12px',
                        }}
                      >
                        <Users size={13} style={{ color: 'var(--color-text-faint)' }} />
                        <span><strong>{memberCount}</strong> member{memberCount !== 1 ? 's' : ''}</span>
                      </span>
                    </div>

                    {/* Action Buttons Footer */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="btn btn-primary btn-sm"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          fontWeight: '700',
                          fontSize: '12px',
                        }}
                      >
                        <span>Open Hub</span>
                        <ArrowRight size={13} />
                      </Link>

                      <Link
                        href={`/projects/${proj.id}?tab=defects`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          padding: '0 12px',
                        }}
                        title="Quick access to defects"
                      >
                        <Bug size={13} />
                        <span>Triage</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ==============================================================
             ENTERPRISE TABLE / HIGH-DENSITY LIST VIEW
             ============================================================== */
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Project Repository</th>
                  <th>Key</th>
                  <th>My Role</th>
                  <th>Health Status</th>
                  <th>Defects</th>
                  <th>QA Cycles</th>
                  <th>Team Size</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((proj) => {
                  const rStyle = roleBadgeStyle[proj.myRole] || roleBadgeStyle.VIEWER;
                  const defectCount = proj._count?.bugs ?? 0;
                  const cycleCount = proj._count?.testingCycles ?? 0;
                  const memberCount = proj._count?.members ?? 0;
                  const health = getProjectHealth(defectCount);
                  const palette = getProjectPalette(proj.key, proj.name);

                  return (
                    <tr key={proj.id} style={{ transition: 'background var(--transition-fast)' }}>
                      {/* Project info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: 'var(--radius-sm)',
                              background: palette.bg,
                              color: palette.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {proj.key.slice(0, 3)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link
                              href={`/projects/${proj.id}`}
                              style={{
                                textDecoration: 'none',
                                fontWeight: '750',
                                color: 'var(--color-text)',
                                fontSize: '13.5px',
                                display: 'block',
                              }}
                            >
                              {proj.name}
                            </Link>
                            {proj.description && (
                              <p
                                style={{
                                  margin: '2px 0 0',
                                  fontSize: '11.5px',
                                  color: 'var(--color-text-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '380px',
                                }}
                              >
                                {proj.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Key */}
                      <td>
                        <code
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {proj.key}
                        </code>
                      </td>

                      {/* My Role */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: rStyle.bg,
                            color: rStyle.text,
                            borderColor: rStyle.border,
                            fontSize: '10.5px',
                            fontWeight: '700',
                          }}
                        >
                          {proj.myRole}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11.5px',
                            fontWeight: '650',
                            color: health.color,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: health.bg,
                            border: `1px solid ${health.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: health.dot,
                            }}
                          />
                          {health.label}
                        </span>
                      </td>

                      {/* Defects */}
                      <td>
                        <Link
                          href={`/projects/${proj.id}?tab=defects`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            color: defectCount > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                            fontWeight: '700',
                          }}
                        >
                          <Bug size={13} />
                          <span>{defectCount}</span>
                        </Link>
                      </td>

                      {/* QA Cycles */}
                      <td>
                        <Link
                          href={`/projects/${proj.id}?tab=cycles`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            color: 'var(--color-text-secondary)',
                            fontWeight: '600',
                          }}
                        >
                          <Layers size={13} style={{ color: 'var(--color-text-faint)' }} />
                          <span>{cycleCount}</span>
                        </Link>
                      </td>

                      {/* Team Size */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-muted)' }}>
                          <Users size={13} style={{ color: 'var(--color-text-faint)' }} />
                          <span>{memberCount}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <Link
                            href={`/projects/${proj.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Hub</span>
                            <ArrowRight size={11} />
                          </Link>

                          {(user?.globalRole === 'ADMIN' || proj.myRole === 'LEAD') && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProject(e, proj)}
                              disabled={deletingId === proj.id}
                              title="Delete project"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-faint)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: '4px',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text-faint)';
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ==============================================================
            MODAL: CREATE NEW PROJECT
            ============================================================== */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} maxWidth="560px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Create New Project
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Initialize a software repository workspace for defect management and test cycles.
              </p>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
              <X size={16} />
            </button>
          </div>

          {error && (
            <div
              style={{
                background: 'var(--color-danger-dim)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--color-danger)',
                fontSize: '12.5px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {/* Quick Domain Templates */}
          <div style={{ marginBottom: '18px' }}>
            <label className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Templates (Optional)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {PROJECT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)',
                    background: form.template === tmpl.label ? 'var(--color-primary-dim)' : 'var(--color-surface-2)',
                    color: form.template === tmpl.label ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    borderColor: form.template === tmpl.label ? 'var(--color-primary-border)' : 'var(--color-border)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label">Project Name *</label>
              <input
                id="project-name-input"
                className="input"
                placeholder="e.g. Syscorp Core Cloud Gateway"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label">Project Key (Prefix) *</label>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Format: 2-10 uppercase chars
                </span>
              </div>
              <input
                id="project-key-input"
                className="input"
                placeholder="e.g. SCCG"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                required
                minLength={2}
                maxLength={10}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontWeight: '700' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                Unique prefix used for all defect issue keys (e.g., {form.key || 'KEY'}-101) and test executions.
              </p>
            </div>

            <div>
              <label className="label">Project Description</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Brief summary of the architecture, engineering scope, and primary testing objectives..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={creating || !form.name.trim() || !form.key.trim()}
              >
                {creating ? 'Creating Project...' : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </AppLayout>
  );
}
