'use client';
import AppLayout from '@/components/AppLayout';
import { useState, useEffect, useRef } from 'react';
import { bugsApi, projectsApi, testingCyclesApi, attachmentsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/toast-context';
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
  ImagePlus,
  UploadCloud,
  X,
  FileImage,
} from 'lucide-react';

export default function NewBugPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  // Attachments / Screenshots state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ file: File; url: string; id: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  // Support clipboard paste (Ctrl+V) for screenshots directly onto the page
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const pastedFile = new File(
              [file],
              `screenshot-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`,
              { type: file.type }
            );
            files.push(pastedFile);
          }
        }
      }
      if (files.length > 0) {
        handleAddFiles(files);
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedFiles.length]);

  function handleAddFiles(newFiles: FileList | File[]) {
    const validImages = Array.from(newFiles).filter((file) =>
      file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
    );
    if (validImages.length === 0) return;

    const remainingSlots = 10 - selectedFiles.length;
    if (remainingSlots <= 0) return;
    const toAdd = validImages.slice(0, remainingSlots);

    const newPreviews = toAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    }));

    setSelectedFiles((prev) => [...prev, ...toAdd]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  }

  function handleRemoveFile(index: number) {
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index].url);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadStatus('');
    try {
      const payload: any = { ...form };
      if (!payload.componentId) delete payload.componentId;
      if (!payload.milestoneId) delete payload.milestoneId;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (!payload.environment) delete payload.environment;
      if (!payload.testingCycleId) delete payload.testingCycleId;
      if (!payload.requirementId) delete payload.requirementId;

      const res = await bugsApi.create(payload);
      const createdBugId = (res as any)?.data?.id || (res as any)?.id;

      // If user selected visual evidence images, upload them
      if (selectedFiles.length > 0 && createdBugId) {
        setUploadStatus(`Uploading ${selectedFiles.length} visual evidence screenshot${selectedFiles.length > 1 ? 's' : ''}...`);
        try {
          await attachmentsApi.upload(createdBugId, selectedFiles);
        } catch (uploadErr: any) {
          console.error('Failed to upload attachments:', uploadErr);
        }
      }

      toast.success(`Defect "${payload.title}" created successfully!`);
      router.push(`/bugs/${createdBugId}`);
    } catch (err: any) {
      const errMsg = err.message ?? 'Failed to log defect';
      setError(errMsg);
      toast.error(errMsg);
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
                  <option value="FRONTEND">FRONTEND</option>
                  <option value="BACKEND">BACKEND</option>
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

              {/* Defect Screenshots & Visual Proof (QA Upload) */}
              <div style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <ImagePlus size={15} color="var(--color-primary)" />
                    <span>Defect Screenshots & Visual Proof (QA Upload)</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {selectedFiles.length}/10 attached
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '10px' }}>
                  Upload visual evidence, error dialogs, or UI defects for developers to inspect.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleAddFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      handleAddFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--color-border)',
                    background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isDragging ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    color: isDragging ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <UploadCloud size={18} />
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '3px' }}>
                    Click to browse or drag and drop screenshots here
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    PNG, JPG, WEBP, GIF, SVG (up to 15MB each)
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    color: 'var(--color-primary)',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '12px',
                  }}>
                    <span>💡 Tip: You can also paste screenshots directly from your clipboard (Ctrl + V)</span>
                  </div>
                </div>

                {/* Previews Grid */}
                {filePreviews.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                      Ready to upload with defect ({filePreviews.length}):
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '10px',
                    }}>
                      {filePreviews.map((preview, index) => (
                        <div
                          key={preview.id}
                          style={{
                            position: 'relative',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{
                            height: '90px',
                            width: '100%',
                            position: 'relative',
                            background: '#0d1117',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preview.url}
                              alt={preview.file.name}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(index);
                              }}
                              title="Remove image"
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'rgba(0, 0, 0, 0.75)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={11} />
                            </button>
                          </div>

                          <div style={{ padding: '6px 8px', borderTop: '1px solid var(--color-border)' }}>
                            <div
                              title={preview.file.name}
                              style={{
                                fontSize: '10.5px',
                                fontWeight: '600',
                                color: 'var(--color-text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {preview.file.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                              {preview.file.size > 1024 * 1024
                                ? `${(preview.file.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(preview.file.size / 1024)} KB`}
                            </div>
                          </div>
                        </div>
                      ))}

                      {filePreviews.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            height: '122px',
                            border: '1px dashed var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <ImagePlus size={16} />
                          <span style={{ fontSize: '11px', fontWeight: '500' }}>+ Add More</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
              <span>{uploadStatus || (loading ? 'Submitting Defect...' : 'Create Defect')}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
