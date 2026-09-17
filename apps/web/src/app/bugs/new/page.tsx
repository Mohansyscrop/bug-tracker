'use client';
import AppLayout from '@/components/AppLayout';
import { useState, useEffect } from 'react';
import { bugsApi, projectsApi, testingCyclesApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bug,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export default function NewBugPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    severity: 'MEDIUM',
    priority: 'P3',
    environment: 'QA',
    componentId: '',
    milestoneId: '',
    assignedTo: '',
    bugArea: 'FRONTEND',
    testingCycleId: '',
    requirementId: '',
  });

  useEffect(() => {
    projectsApi.list().then((res) => {
      const list = res.data ?? [];
      setProjects(list);
      if (list.length > 0) setForm((f) => ({ ...f, projectId: list[0].id }));
    });
  }, []);

  useEffect(() => {
    if (!form.projectId) return;
    Promise.all([
      projectsApi.components(form.projectId).catch(() => ({ data: [] })),
      projectsApi.milestones(form.projectId).catch(() => ({ data: [] })),
      projectsApi.members(form.projectId).catch(() => ({ data: [] })),
      testingCyclesApi.list(form.projectId).catch(() => []),
      testingCyclesApi.listRequirements(form.projectId).catch(() => []),
    ]).then(([c, m, mem, cyc, reqs]) => {
      setComponents((c as any).data ?? []);
      setMilestones((m as any).data ?? []);
      setMembers((mem as any).data ?? []);
      setCycles(Array.isArray(cyc) ? cyc : (cyc as any).data ?? []);
      setRequirements(Array.isArray(reqs) ? reqs : (reqs as any).data ?? []);
    });
  }, [form.projectId]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: any = { ...form };
      if (!payload.componentId) delete payload.componentId;
      if (!payload.milestoneId) delete payload.milestoneId;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (!payload.environment) delete payload.environment;
      if (!payload.testingCycleId) delete payload.testingCycleId;
      if (!payload.requirementId) delete payload.requirementId;

      const res = await bugsApi.create(payload);
      router.push(`/bugs/${res.data.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to log defect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/bugs"
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 8px', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <ArrowLeft size={13} />
            <span>Back to Defects</span>
          </Link>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Report New Defect
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
            File clear reproduction details, technical scope, and link to testing cycles or requirements.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--color-danger-dim)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--color-danger)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Context & Classification */}
          <div className="card">
            <h3 style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Layers size={14} />
              <span>Project & Defect Classification</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label className="label" htmlFor="bug-project">Project *</label>
                <select
                  id="bug-project"
                  className="select"
                  value={form.projectId}
                  onChange={(e) => update('projectId', e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-area">Technical Defect Area *</label>
                <select
                  id="bug-area"
                  className="select"
                  value={form.bugArea}
                  onChange={(e) => update('bugArea', e.target.value)}
                  required
                >
                  <option value="FRONTEND">FRONTEND (Client-side UI / JS / Flow)</option>
                  <option value="BACKEND">BACKEND (Server / Business Logic)</option>
                  <option value="API">API (REST Endpoints / Schema)</option>
                  <option value="DATABASE">DATABASE (SQL / Data / Integrity)</option>
                  <option value="INTEGRATION">INTEGRATION (Third-party Services)</option>
                  <option value="UI_UX">UI / UX (Styling / Responsiveness)</option>
                  <option value="PERFORMANCE">PERFORMANCE (Speed / Latency)</option>
                  <option value="SECURITY">SECURITY (Auth / Vulnerability)</option>
                  <option value="REGRESSION">REGRESSION (Broken Existing Feature)</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-cycle">Testing Cycle</label>
                <select
                  id="bug-cycle"
                  className="select"
                  value={form.testingCycleId}
                  onChange={(e) => update('testingCycleId', e.target.value)}
                >
                  <option value="">None / General Backlog</option>
                  {cycles.map((cyc) => (
                    <option key={cyc.id} value={cyc.id}>{cyc.name} ({cyc.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-requirement">Traceable Requirement</label>
                <select
                  id="bug-requirement"
                  className="select"
                  value={form.requirementId}
                  onChange={(e) => update('requirementId', e.target.value)}
                >
                  <option value="">None / Unlinked</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>{r.reqCode ? `[${r.reqCode}] ` : ''}{r.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Defect Details */}
          <div className="card">
            <h3 style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <FileText size={14} />
              <span>Defect Information</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label" htmlFor="bug-title">Defect Summary / Title *</label>
                <input
                  id="bug-title"
                  className="input"
                  placeholder="e.g., Contact form displays 500 error when phone number includes country prefix"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="bug-desc">Detailed Description (Markdown Supported)</label>
                <textarea
                  id="bug-desc"
                  className="textarea"
                  rows={4}
                  placeholder="Explain what happened, browser/device details, console errors, or relevant payload logs..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="bug-steps">Steps to Reproduce</label>
                <textarea
                  id="bug-steps"
                  className="textarea"
                  rows={3}
                  placeholder="1. Navigate to /contact-us&#10;2. Fill valid email and name&#10;3. Click Submit"
                  value={form.stepsToReproduce}
                  onChange={(e) => update('stepsToReproduce', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label" htmlFor="bug-expected">Expected Behavior</label>
                  <textarea
                    id="bug-expected"
                    className="textarea"
                    rows={2}
                    placeholder="Confirmation banner appears and message saves"
                    value={form.expectedResult}
                    onChange={(e) => update('expectedResult', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="bug-actual">Actual Behavior</label>
                  <textarea
                    id="bug-actual"
                    className="textarea"
                    rows={2}
                    placeholder="Page hangs with error modal and 500 status in console"
                    value={form.actualResult}
                    onChange={(e) => update('actualResult', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Priority, Severity & Assignment */}
          <div className="card">
            <h3 style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <ShieldAlert size={14} />
              <span>Severity & Assignment</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <label className="label" htmlFor="bug-severity">Severity *</label>
                <select
                  id="bug-severity"
                  className="select"
                  value={form.severity}
                  onChange={(e) => update('severity', e.target.value)}
                  required
                >
                  <option value="CRITICAL">CRITICAL (System Down / Blocker)</option>
                  <option value="HIGH">HIGH (Major Flow Broken)</option>
                  <option value="MEDIUM">MEDIUM (Functional Issue with Workaround)</option>
                  <option value="LOW">LOW (Minor / Cosmetic)</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-priority">Priority *</label>
                <select
                  id="bug-priority"
                  className="select"
                  value={form.priority}
                  onChange={(e) => update('priority', e.target.value)}
                  required
                >
                  <option value="P1">P1 — Immediate Fix</option>
                  <option value="P2">P2 — High Priority</option>
                  <option value="P3">P3 — Normal Priority</option>
                  <option value="P4">P4 — Low Priority</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-env">Environment</label>
                <select
                  id="bug-env"
                  className="select"
                  value={form.environment}
                  onChange={(e) => update('environment', e.target.value)}
                >
                  <option value="QA">QA Environment</option>
                  <option value="STAGING">Staging Environment</option>
                  <option value="DEV">Local / Dev</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="bug-assignee">Assignee</label>
                <select
                  id="bug-assignee"
                  className="select"
                  value={form.assignedTo}
                  onChange={(e) => update('assignedTo', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name || m.user?.email} ({m.projectRole})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Link href="/bugs" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.title.trim()}
            >
              <PlusCircle size={15} />
              <span>{loading ? 'Submitting Defect...' : 'Create Defect'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
