'use client';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import { useEffect, useState, useCallback } from 'react';
import { testingCyclesApi, bugsApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  RotateCcw,
  ArrowLeft,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Layers,
  Bug,
  Calendar,
  Activity,
  FileText,
  X,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function TestingCycleDetailPage() {
  const routeParams = useParams();
  const cycleId = (routeParams?.id as string) || '';
  const [cycle, setCycle] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'bugs' | 'requirements'>('tests');
  const [loading, setLoading] = useState(true);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');

  // New Suite Modal
  const [showAddSuiteModal, setShowAddSuiteModal] = useState(false);
  const [suiteName, setSuiteName] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');

  // New Case Modal
  const [showAddCaseModal, setShowAddCaseModal] = useState(false);
  const [caseForm, setCaseForm] = useState({
    suiteId: '',
    title: '',
    preconditions: '',
    steps: '',
    expectedResult: '',
    type: 'FUNCTIONAL',
    priority: 'P2',
    requirementId: '',
  });

  // Log Defect Modal (Directly from Test Case Failure)
  const [showLogBugModal, setShowLogBugModal] = useState(false);
  const [bugForm, setBugForm] = useState({
    title: '',
    bugArea: 'FRONTEND',
    severity: 'HIGH',
    priority: 'P1',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    description: '',
    assignedTo: '',
    testCaseId: '',
    requirementId: '',
  });

  // New Requirement Modal
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'ACTIVE',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCycle = useCallback(async () => {
    if (!cycleId) return;
    try {
      const data = await testingCyclesApi.get(cycleId);
      setCycle(data);
      if (data.testSuites?.length > 0 && !caseForm.suiteId) {
        setCaseForm((f) => ({ ...f, suiteId: data.testSuites[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  // Status transition of cycle
  const handleStatusChange = async (newStatus: string) => {
    if (!cycleId) return;
    try {
      await testingCyclesApi.update(cycleId, { status: newStatus });
      setFeedback({ type: 'success', message: `Cycle status updated to ${newStatus}` });
      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to update status' });
    }
  };

  // Add Suite
  const handleAddSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId) return;
    try {
      await testingCyclesApi.createSuite({
        testingCycleId: cycleId,
        name: suiteName,
        description: suiteDesc,
      });
      setShowAddSuiteModal(false);
      setSuiteName('');
      setSuiteDesc('');
      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to add test suite' });
    }
  };

  // Add Case
  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await testingCyclesApi.createTestCase({
        ...caseForm,
        suiteId: caseForm.suiteId || cycle.testSuites[0]?.id,
        requirementId: caseForm.requirementId || undefined,
      });
      setShowAddCaseModal(false);
      setCaseForm({
        suiteId: cycle.testSuites[0]?.id || '',
        title: '',
        preconditions: '',
        steps: '',
        expectedResult: '',
        type: 'FUNCTIONAL',
        priority: 'P2',
        requirementId: '',
      });
      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to create test case' });
    }
  };

  // Record Execution
  const handleRecordExecution = async (testCaseId: string, status: string, testCaseObj?: any) => {
    if (!cycleId) return;
    try {
      await testingCyclesApi.recordExecution({
        testingCycleId: cycleId,
        testCaseId,
        status,
      });

      if (status === 'FAILED' && testCaseObj) {
        // Automatically pop up defect logging modal pre-filled with test details
        setBugForm({
          title: `[${cycle.name}] ${testCaseObj.title} - Failed verification`,
          bugArea: 'FRONTEND',
          severity: 'HIGH',
          priority: 'P1',
          stepsToReproduce: testCaseObj.steps || '',
          expectedResult: testCaseObj.expectedResult || '',
          actualResult: 'Scenario failed during execution run.',
          description: `Logged from failed Test Scenario ${testCaseObj.testCaseKey} in ${cycle.name}.`,
          assignedTo: '',
          testCaseId,
          requirementId: testCaseObj.requirementId || '',
        });
        setShowLogBugModal(true);
      }

      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to record execution' });
    }
  };

  // Log Defect
  const handleCreateBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId) return;
    try {
      await bugsApi.create({
        projectId: cycle.projectId,
        title: bugForm.title,
        bugArea: bugForm.bugArea,
        severity: bugForm.severity,
        priority: bugForm.priority,
        stepsToReproduce: bugForm.stepsToReproduce,
        expectedResult: bugForm.expectedResult,
        actualResult: bugForm.actualResult,
        description: bugForm.description,
        environment: cycle.environment,
        testingCycleId: cycleId,
        testCaseId: bugForm.testCaseId || undefined,
        requirementId: bugForm.requirementId || undefined,
        assignedTo: bugForm.assignedTo || undefined,
      });
      setShowLogBugModal(false);
      setFeedback({ type: 'success', message: 'Defect successfully logged and linked to this cycle!' });
      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to log defect' });
    }
  };

  // Add Requirement
  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await testingCyclesApi.createRequirement({
        ...reqForm,
        projectId: cycle.projectId,
      });
      setShowReqModal(false);
      setReqForm({ title: '', description: '', priority: 'MEDIUM', status: 'ACTIVE' });
      setFeedback({ type: 'success', message: 'Requirement added!' });
      await loadCycle();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message ?? 'Failed to create requirement' });
    }
  };

  if (loading || !cycle) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      </AppLayout>
    );
  }

  const m = cycle.metrics || { totalTests: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, passRate: 0, totalBugs: 0 };
  const filteredBugs = (cycle.bugs || []).filter((b: any) => {
    if (selectedAreaFilter === 'ALL') return true;
    return b.bugArea === selectedAreaFilter;
  });

  return (
    <AppLayout>
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          <Link href="/testing-cycles" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', gap: '5px' }}>
            <ArrowLeft size={13} />
            <span>Testing Cycles</span>
          </Link>
          <span style={{ color: 'var(--color-text-faint)' }}>/</span>
          <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{cycle.project?.name}</span>
          <span style={{ color: 'var(--color-text-faint)' }}>/</span>
          <span>Cycle #{cycle.cycleNumber}</span>
        </div>

        {/* Feedback alert */}
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{feedback.message}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setFeedback(null)} style={{ padding: '2px' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Cycle Header Card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge" style={{
                  background: 'var(--color-primary-dim)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary-border)',
                  fontWeight: '700',
                }}>
                  CYCLE #{cycle.cycleNumber}
                </span>
                <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {cycle.environment}
                </span>
                <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {cycle.type}
                </span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
                {cycle.name}
              </h1>
              {cycle.scope && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px', maxWidth: '720px' }}>
                  {cycle.scope}
                </p>
              )}
            </div>

            {/* Status Selector & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Cycle Status:</span>
                <select
                  className="select"
                  style={{ width: '150px', fontSize: '12.5px', padding: '6px 28px 6px 10px' }}
                  value={cycle.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} />
                <span>
                  {cycle.startDate ? format(new Date(cycle.startDate), 'MMM d, yyyy') : 'No start date'}
                  {cycle.plannedEndDate && ` → ${format(new Date(cycle.plannedEndDate), 'MMM d, yyyy')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Progress Bar */}
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600' }}>Execution Progress ({m.totalTests} Scenarios)</span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>✓ {m.passed} Passed ({m.passRate}%)</span>
                <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>✕ {m.failed} Failed</span>
                <span style={{ color: 'var(--color-warning)', fontWeight: '600' }}>⚠ {m.blocked} Blocked</span>
                <span style={{ color: 'var(--color-text-faint)' }}>○ {m.notRun} Not Run</span>
              </div>
            </div>
            <div className="progress-bar-container" style={{ height: '8px' }}>
              <div className="progress-segment-pass" style={{ width: `${(m.passed / (m.totalTests || 1)) * 100}%` }} />
              <div className="progress-segment-fail" style={{ width: `${(m.failed / (m.totalTests || 1)) * 100}%` }} />
              <div className="progress-segment-blocked" style={{ width: `${(m.blocked / (m.totalTests || 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Cycle Hub Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '18px',
        }}>
          {[
            { id: 'tests', label: `Test Scenarios & Runs (${m.totalTests})`, icon: Activity },
            { id: 'bugs', label: `Cycle Defects (${cycle.bugs?.length || 0})`, icon: Bug },
            { id: 'requirements', label: 'Traceability & Requirements', icon: FileText },
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
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Test Suites and Test Cases */}
        {activeTab === 'tests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Execute verification scenarios. Marking a scenario as <strong>Failed</strong> opens the defect reporting modal with steps pre-filled.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddSuiteModal(true)}>
                  <Plus size={13} />
                  <span>Add Test Suite</span>
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddCaseModal(true)}
                  disabled={!cycle.testSuites || cycle.testSuites.length === 0}
                >
                  <PlusCircle size={14} />
                  <span>Add Scenario</span>
                </button>
              </div>
            </div>

            {(!cycle.testSuites || cycle.testSuites.length === 0) ? (
              <div className="card empty-state" style={{ padding: '48px 0' }}>
                <div className="empty-state-icon">
                  <Activity size={24} />
                </div>
                <p className="empty-state-title">No test suites created for this cycle</p>
                <p className="empty-state-desc">Create a test suite (e.g. Contact Form Suite) to organize your test scenarios.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setShowAddSuiteModal(true)}>
                  <PlusCircle size={14} />
                  <span>Create First Test Suite</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cycle.testSuites.map((suite: any) => (
                  <div key={suite.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={16} style={{ color: 'var(--color-primary)' }} />
                          <span>{suite.name}</span>
                        </h3>
                        {suite.description && (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{suite.description}</p>
                        )}
                      </div>
                      <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                        {suite.testCases?.length || 0} Scenarios
                      </span>
                    </div>

                    {(!suite.testCases || suite.testCases.length === 0) ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: '12.5px' }}>
                        No test cases in this suite. Click "+ Add Scenario" above.
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead>
                            <tr>
                              <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                              <th>Key</th>
                              <th>Scenario Title</th>
                              <th>Requirement</th>
                              <th>Expected Result</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Run Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {suite.testCases.map((tc: any, index: number) => {
                              const exec = tc.executions && tc.executions.length > 0 ? tc.executions[0] : null;
                              const status = exec?.status || 'NOT_RUN';

                              const statusBadge =
                                status === 'PASSED' ? 'badge-status-fixed' :
                                status === 'FAILED' ? 'badge-critical' :
                                status === 'BLOCKED' ? 'badge-status-retest' : 'badge-status-new';

                              return (
                                <tr key={tc.id}>
                                  <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-text-faint)', fontSize: '12px' }}>
                                    {index + 1}
                                  </td>
                                  <td>
                                    <code>{tc.testCaseKey}</code>
                                  </td>
                                  <td>
                                    <div>
                                      <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{tc.title}</strong>
                                      {tc.steps && (
                                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-faint)', marginTop: '2px' }}>
                                          Steps: {tc.steps}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    {tc.requirement ? (
                                      <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: '600' }}>
                                        {tc.requirement.reqKey}: {tc.requirement.title}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '240px' }}>
                                    {tc.expectedResult}
                                  </td>
                                  <td>
                                    <span className={`badge ${statusBadge}`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                      <button
                                        onClick={() => handleRecordExecution(tc.id, 'PASSED')}
                                        className="btn btn-sm btn-success"
                                        style={{ fontSize: '11px', padding: '3px 7px' }}
                                        title="Mark Scenario Passed"
                                      >
                                        ✓ Pass
                                      </button>
                                      <button
                                        onClick={() => handleRecordExecution(tc.id, 'FAILED', tc)}
                                        className="btn btn-sm btn-danger"
                                        style={{ fontSize: '11px', padding: '3px 7px' }}
                                        title="Mark Failed and Log Defect"
                                      >
                                        ✕ Fail & Bug
                                      </button>
                                      <button
                                        onClick={() => handleRecordExecution(tc.id, 'BLOCKED')}
                                        className="btn btn-sm btn-secondary"
                                        style={{ fontSize: '11px', padding: '3px 7px' }}
                                        title="Mark Blocked"
                                      >
                                        ⚠ Block
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Cycle Defects Classified by Technical Area */}
        {activeTab === 'bugs' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                  Defects Discovered in {cycle.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Filter defects by technical area to assign to appropriate frontend, backend, or database engineers.
                </p>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setBugForm({
                    title: '',
                    bugArea: 'FRONTEND',
                    severity: 'HIGH',
                    priority: 'P1',
                    stepsToReproduce: '',
                    expectedResult: '',
                    actualResult: '',
                    description: '',
                    assignedTo: '',
                    testCaseId: '',
                    requirementId: '',
                  });
                  setShowLogBugModal(true);
                }}
              >
                <PlusCircle size={14} />
                <span>Log Defect</span>
              </button>
            </div>

            {/* Technical Area Filter Pills */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[
                'ALL', 'FRONTEND', 'BACKEND'
              ].map((area) => (
                <button
                  key={area}
                  onClick={() => setSelectedAreaFilter(area)}
                  className={`btn btn-sm ${selectedAreaFilter === area ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '3px 8px' }}
                >
                  {area.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filteredBugs.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No defects logged in this technical area for this cycle.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                      <th>Defect Key</th>
                      <th>Title</th>
                      <th>Area</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Traceable Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBugs.map((b: any, index: number) => (
                      <tr key={b.id}>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {index + 1}
                        </td>
                        <td>
                          <Link href={`/bugs/${b.id}`} style={{ textDecoration: 'none' }}>
                            <code>{b.issueKey}</code>
                          </Link>
                        </td>
                        <td>
                          <Link href={`/bugs/${b.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: '500' }}>
                            {b.title}
                          </Link>
                        </td>
                        <td>
                          <span className={b.bugArea === 'REGRESSION' ? 'area-pill area-pill-regression' : 'area-pill'}>
                            {b.bugArea}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${b.severity.toLowerCase()}`}>
                            {b.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-status-${b.status.toLowerCase().replace(/_/g, '-')}`}>
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                          {b.assignedTo?.name ?? 'Unassigned'}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                          {b.requirement?.reqKey ? `${b.requirement.reqKey} ` : ''}
                          {b.testCase?.testCaseKey ? `(${b.testCase.testCaseKey})` : 'Ad-hoc'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Requirements & Traceability */}
        {activeTab === 'requirements' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
                  Requirement Traceability Matrix
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Trace requirements to corresponding test scenarios, execution outcomes, and associated defects.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowReqModal(true)}>
                <PlusCircle size={14} />
                <span>New Requirement</span>
              </button>
            </div>

            {/* Traceability Table */}
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '55px', textAlign: 'center' }}>S.No</th>
                    <th>Key</th>
                    <th>Requirement Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Covering Test Scenarios</th>
                    <th>Associated Defects</th>
                  </tr>
                </thead>
                <tbody>
                  {cycle.project?.requirements?.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                        No requirements defined yet for this project.
                      </td>
                    </tr>
                  ) : (
                    (cycle.project?.requirements || []).map((req: any, index: number) => (
                      <tr key={req.id}>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {index + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>
                            {req.reqKey}
                          </span>
                        </td>
                        <td>
                          <strong>{req.title}</strong>
                          {req.description && (
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{req.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-low">
                            {req.priority}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-status-fixed">
                            {req.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <strong>{req.testCases?.length || 0}</strong> Scenarios
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <strong style={{ color: req.bugs?.length > 0 ? 'var(--color-danger)' : 'inherit' }}>
                            {req.bugs?.length || 0}
                          </strong> Defects
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Test Suite */}
        <Modal isOpen={showAddSuiteModal} onClose={() => setShowAddSuiteModal(false)} maxWidth="480px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Test Suite</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddSuiteModal(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddSuite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Suite Name *</label>
              <input
                className="input"
                placeholder="e.g. Contact Form Validation Suite"
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Optional scope details about this test suite..."
                value={suiteDesc}
                onChange={(e) => setSuiteDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddSuiteModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Create Suite
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Test Case */}
        <Modal isOpen={showAddCaseModal} onClose={() => setShowAddCaseModal(false)} maxWidth="540px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Test Scenario</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddCaseModal(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddCase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Test Suite *</label>
              <select
                className="select"
                value={caseForm.suiteId}
                onChange={(e) => setCaseForm((f) => ({ ...f, suiteId: e.target.value }))}
                required
              >
                {cycle.testSuites?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Scenario Title *</label>
              <input
                className="input"
                placeholder="e.g. Verify contact form submission with invalid email format"
                value={caseForm.title}
                onChange={(e) => setCaseForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Scenario Type</label>
                <select
                  className="select"
                  value={caseForm.type}
                  onChange={(e) => setCaseForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="FUNCTIONAL">Functional Scenario</option>
                  <option value="REGRESSION">Regression Test</option>
                  <option value="UI_UX">UI / UX Verification</option>
                  <option value="SECURITY">Security Validation</option>
                  <option value="PERFORMANCE">Performance Check</option>
                </select>
              </div>

              <div>
                <label className="label">Priority</label>
                <select
                  className="select"
                  value={caseForm.priority}
                  onChange={(e) => setCaseForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Normal</option>
                  <option value="P4">P4 — Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Test Steps *</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="1. Navigate to contact page&#10;2. Enter invalid email&#10;3. Click submit"
                value={caseForm.steps}
                onChange={(e) => setCaseForm((f) => ({ ...f, steps: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Expected Result *</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Validation error displayed: 'Please enter a valid email address'"
                value={caseForm.expectedResult}
                onChange={(e) => setCaseForm((f) => ({ ...f, expectedResult: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCaseModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Create Scenario
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Log Defect */}
        <Modal isOpen={showLogBugModal} onClose={() => setShowLogBugModal(false)} maxWidth="580px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
              Log Defect for {cycle.name}
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowLogBugModal(false)}>
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleCreateBug} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Bug Title *</label>
              <input
                className="input"
                value={bugForm.title}
                onChange={(e) => setBugForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Technical Bug Area *</label>
                <select
                  className="select"
                  value={bugForm.bugArea}
                  onChange={(e) => setBugForm((f) => ({ ...f, bugArea: e.target.value }))}
                >
                  <option value="FRONTEND">FRONTEND</option>
                  <option value="BACKEND">BACKEND</option>
                </select>
              </div>

              <div>
                <label className="label">Severity *</label>
                <select
                  className="select"
                  value={bugForm.severity}
                  onChange={(e) => setBugForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Steps to Reproduce *</label>
              <textarea
                className="textarea"
                rows={3}
                value={bugForm.stepsToReproduce}
                onChange={(e) => setBugForm((f) => ({ ...f, stepsToReproduce: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Expected Result *</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={bugForm.expectedResult}
                  onChange={(e) => setBugForm((f) => ({ ...f, expectedResult: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Actual Result *</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={bugForm.actualResult}
                  onChange={(e) => setBugForm((f) => ({ ...f, actualResult: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Assign to Developer</label>
              <select
                className="select"
                value={bugForm.assignedTo}
                onChange={(e) => setBugForm((f) => ({ ...f, assignedTo: e.target.value }))}
              >
                <option value="">— Unassigned (Project Lead Triage) —</option>
                {cycle.project?.members?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name} ({m.projectRole})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowLogBugModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Log Defect
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: New Requirement */}
        <Modal isOpen={showReqModal} onClose={() => setShowReqModal(false)} maxWidth="480px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>Add Project Requirement</h2>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowReqModal(false)}>
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleAddRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Requirement Title *</label>
              <input
                className="input"
                placeholder="e.g. Contact Form Submission"
                value={reqForm.title}
                onChange={(e) => setReqForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Description / User Story</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="As a customer, I want to submit inquiries..."
                value={reqForm.description}
                onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowReqModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Create Requirement
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
